/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * `useStreamSystem` — the dashboard's copy of the server's state, and the way
 * to ask the server for things.
 *
 * Everything the bot does runs on the server, whether or not a dashboard is
 * open. What lives here:
 *   - display preferences (theme, language) — per device
 *   - OAuth redirects — inherently a browser flow; the token is handed to the
 *     server immediately and never used from here
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  ThemeId, Language, RelayConfig, ReactionRoleMessage, DiscordButtonMessage,
} from '../types';
import { ASSET_KINDS, assetKindOf } from '../../shared/asset-kinds.js';
import { safeJSONParse, youtubeRedirectUri } from '../utils';
import { useBackend, apiFetch, C2S } from './useBackend';
import { rememberDiscordNames, rememberDiscordLists } from '../discordEmoji';

export const useStreamSystem = () => {
  const backend = useBackend();
  const { snapshot, send, request } = backend;

  // ------------------------------------------------------- device settings
  // Which UI theme and language you like are properties of where you are
  // sitting, not of the bot.

  const [activeThemeId, setActiveThemeId] = useState<ThemeId>(
    () => (localStorage.getItem('app_theme') as ThemeId) || 'simon-default');
  const [language, setLanguage] = useState<Language>(
    () => (localStorage.getItem('app_lang') as Language) || 'en');
  useEffect(() => { localStorage.setItem('app_theme', activeThemeId); }, [activeThemeId]);
  useEffect(() => { localStorage.setItem('app_lang', language); }, [language]);

  // Client-side view of things the server owns but the UI edits optimistically.
  const [discordRoles, setDiscordRoles] = useState<any[]>(() => safeJSONParse('discord_roles', []));
  const [discordEmojis, setDiscordEmojis] = useState<any[]>(() => safeJSONParse('discord_emojis', []));
  const [discordChannels, setDiscordChannels] = useState<any[]>([]);
  const [discordGuilds, setDiscordGuilds] = useState<any[]>(() => safeJSONParse('discord_guilds', []));
  const [discordUser, setDiscordUser] = useState<any>(() => safeJSONParse('discord_user', null));
  const [discordBotMember, setDiscordBotMember] = useState<any>(() => safeJSONParse('discord_bot_member', null));
  const [discordSearchResults, setDiscordSearchResults] = useState<any[]>([]);
  const [syncingMessageId, setSyncingMessageId] = useState<string | null>(null);
  // Which menu last failed to publish, and why. Without this a failed sync was
  // indistinguishable from a successful one: the spinner simply stopped.
  const [reactionSyncError, setReactionSyncError] = useState<{ id: string; message: string } | null>(null);

  // Secrets the UI is typing. The server never sends them back, so the boxes
  // are blank on load; held locally only for the life of the keystroke.
  const [discordBotTokenDraft, setDiscordBotTokenDraft] = useState('');
  const [discordClientSecretDraft, setDiscordClientSecretDraft] = useState('');
  const [tiktokSignKeyDraft, setTiktokSignKeyDraft] = useState('');
  const [twitchClientId, setTwitchClientIdState] = useState(() => localStorage.getItem('twitch_client_id') || '');

  // Adopt the server's Twitch Client ID into this origin's storage. Opening the
  // UI on a different port (Vite's :5173 vs the server's :8081) starts with an
  // empty localStorage, and without this the id stayed server-only on that
  // origin. Tracked in a ref so the OAuth callback (a mount-time effect) can
  // compare the returning account against the one already connected.
  const mainLoginRef = useRef<string>('');
  useEffect(() => {
    mainLoginRef.current = (snapshot.connections as any)?.twitch?.login || '';
  }, [snapshot.connections]);

  const serverTwitchClientId = (snapshot.connections as any)?.twitch?.clientId;
  useEffect(() => {
    if (!serverTwitchClientId) return;
    setTwitchClientIdState((prev) => {
      if (prev === serverTwitchClientId) return prev;
      localStorage.setItem('twitch_client_id', serverTwitchClientId);
      return serverTwitchClientId;
    });
  }, [serverTwitchClientId]);

  // ------------------------------------------------------- sign-in

  // The streamer's sign-in settings (server/api/auth.js): whether it is on, and the owner key. Asked for by the streamer only.
  const [authState, setAuthState] = useState<{ enabled: boolean; ownerKey: string } | null>(null);
  const isOwner = backend.me?.role === 'owner';
  useEffect(() => {
    if (!backend.connected || !isOwner) { setAuthState(null); return; }
    request(C2S.AUTH, { op: 'get' }).then(setAuthState).catch(() => setAuthState(null));
  }, [backend.connected, isOwner, request]);
  // A sign-in in use is renewed on the server; asking who this is renews the browser's cookie with it, once a page load.
  const renewed = useRef(false);
  useEffect(() => {
    if (renewed.current || backend.me?.via !== 'session') return;
    renewed.current = true;
    apiFetch('/auth/me').catch(() => {});
  }, [backend.me?.via]);
  const isMod = backend.me?.role === 'mod';

  // ------------------------------------------------------- OAuth callbacks

  useEffect(() => {
    // Twitch implicit flow returns the token in the URL fragment. Hand it to
    // the server and scrub it from the address bar immediately.
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const token = hash.get('access_token');
    if (!token) return;
    // A token for signing in to the dashboard is the sign-in page's (web/components/SignInPage.tsx), not a connection.
    if ((hash.get('state') || '').startsWith('signin')) return;

    (async () => {
      try {
        const isBot = localStorage.getItem('twitch_pending_role') === 'bot';

        // Validate first: this is what tells us the login and user id that
        // the token actually belongs to, rather than trusting anything typed.
        const res = await fetch('https://id.twitch.tv/oauth2/validate', {
          headers: { Authorization: `OAuth ${token}` },
        });
        if (!res.ok) {
          throw new Error(`Twitch rejected the token (HTTP ${res.status}). `
            + 'This usually means the login was cancelled or the token expired.');
        }
        const validated = await res.json();

        // Twitch authorises whichever account the browser is signed into. If
        // that turns out to be the account already connected as main, the user
        // almost certainly meant to switch accounts and did not notice.
        if (isBot && mainLoginRef.current
          && String(validated.login).toLowerCase() === mainLoginRef.current.toLowerCase()) {
          const proceed = window.confirm(
            `You just authorised "${validated.login}", which is already connected as your main account.\n\n`
            + 'To use a different account for the bot, sign out of Twitch first, or open this page in a '
            + 'private/incognito window and connect the bot from there.\n\n'
            + 'Connect it as the bot anyway?',
          );
          if (!proceed) {
            localStorage.removeItem('twitch_pending_role');
            window.history.replaceState({}, '', window.location.pathname + window.location.search);
            return;
          }
        }

        send(C2S.SET_CREDENTIALS, isBot
          ? { platform: 'twitch', botToken: token, botLogin: validated.login }
          : {
            platform: 'twitch',
            accessToken: token,
            login: validated.login,
            userId: validated.user_id,
            channel: validated.login,
            clientId: validated.client_id,
          });

        localStorage.removeItem('twitch_pending_role');
        // Connect immediately so the user does not have to click again.
        send(C2S.PLATFORM_CONNECT, { platform: 'twitch' });

        // Only scrub the token from the address bar once it has actually been
        // handed over: clearing it unconditionally destroyed the credential
        // whenever the handoff failed.
        window.history.replaceState({}, '', window.location.pathname + window.location.search);
        console.info(`Twitch: connected as ${validated.login}`);
      } catch (err: any) {
        console.error('Twitch token handoff failed:', err);
        alert(`Could not finish Twitch login.\n\n${err.message}\n\n`
          + 'The token is still in the address bar — reload the page to retry, '
          + 'or check the server terminal for details.');
      }
    })();
  }, [send]);

  // Discord and YouTube return an authorisation code on the query string
  // (Twitch uses the hash). The exchange needs a live socket to carry the
  // reply, so this waits for the connection rather than firing on mount.
  const codeHandled = useRef(false);
  useEffect(() => {
    if (!backend.connected || codeHandled.current) return;

    const search = new URLSearchParams(window.location.search);
    const code = search.get('code');
    const provider = search.get('state');
    if (!code || !provider) return;

    codeHandled.current = true;
    const redirectUri = window.location.origin + window.location.pathname;

    const scrub = () => {
      search.delete('code');
      search.delete('state');
      const qs = search.toString();
      window.history.replaceState({}, '', window.location.pathname + (qs ? `?${qs}` : ''));
    };

    (async () => {
      try {
        if (provider === 'discord') {
          const result: any = await request(C2S.DISCORD, { op: 'exchange_code', code, redirectUri });

          if (result?.user) {
            setDiscordUser(result.user);
            localStorage.setItem('discord_user', JSON.stringify(result.user));
          }
          if (result?.guilds) {
            setDiscordGuilds(result.guilds);
            localStorage.setItem('discord_guilds', JSON.stringify(result.guilds));
          }

          console.info(`Discord: signed in as ${result?.user?.username ?? 'unknown'}`);
          scrub();
        } else if (provider === 'youtube') {
          await request(C2S.YOUTUBE_EXCHANGE_CODE, { code, redirectUri });
          console.info('YouTube: authorised');
          scrub();
        }
      } catch (err: any) {
        console.error(`${provider} code exchange failed:`, err);
        alert(`Could not finish the ${provider} login.\n\n${err.message}\n\n`
          + 'Check that the redirect URL is registered on the developer portal, '
          + 'and that the client secret is set in .env on the server.');
      }
    })();
  }, [backend.connected, request]);

  // --------------------------------------------------------------- actions

  const req = useCallback(
    (type: string, payload?: any) => request(type, payload).catch((err) => {
      console.error(`${type} failed:`, err.message);
      return null;
    }),
    [request],
  );

  const actions = useMemo(() => ({
    // -- config
    // Everything the server holds, for moving this install to another machine.
    // Secrets are left out by the server, which reports what it dropped.
    exportConfig: () => request(C2S.CONFIG_EXPORT, {}),
    importConfig: (bundle: any) => request(C2S.CONFIG_IMPORT, { bundle }),
    setQuestionStatus: (id: string, status: string) => send(C2S.QUESTION_SET_STATUS, { id, status }),
    /** Set up, open, close or clear the poll. The server counts the votes. */
    poll: (op: string, value?: any) => send(C2S.POLL, { op, value }),
    // Answers, so the Giveaways screen can say why not (no prize, nobody to draw).
    giveaway: (op: string, value?: any) => request(C2S.GIVEAWAY, { op, value }),
    /** The Discord pages screen: save, remove, post, test, unpost, import, delete_source (server/engine/discord-pages.js). */
    discordPages: (op: string, payload: Record<string, any> = {}) => request(C2S.DISCORD_PAGES, { ...payload, op }),
    /** Viewer history: 'stats', 'settings' ({ settings: { forgetAfterMonths } }) or 'prune' (server/engine/viewer-history.js). */
    history: (op: string, payload: Record<string, any> = {}) => request(C2S.HISTORY, { ...payload, op }),
    /** The Points screen: 'settings', 'give' ({ uid, amount }), 'board' (server/engine/points.js). */
    points: (op: string, payload: Record<string, any> = {}) => request(C2S.POINTS, { ...payload, op }),
    /** The profile card: 'settings' or 'preview' (server/engine/profile-card.js). */
    profileCard: (op: string, payload: Record<string, any> = {}) => request(C2S.PROFILE_CARD, { ...payload, op }),
    /** Highlights: 'settings' or 'test' (server/engine/highlights.js). */
    highlights: (op: string, payload: Record<string, any> = {}) => request(C2S.HIGHLIGHTS, { ...payload, op }),
    /** Private go-live messages: 'settings', 'post' or 'test' (server/engine/live-dms.js). */
    liveDms: (op: string, payload: Record<string, any> = {}) => request(C2S.LIVE_DMS, { ...payload, op }),
    // Updates from GitHub (server/engine/updater.js): 'check', or 'apply' to get the newest ready and restart into it.
    updates: (op: 'check' | 'apply') => request(C2S.UPDATES, { op }),
    /** Which Discord channels feed the Questions screen (server/engine/discord-questions.js). */
    setDiscordQuestions: (settings: Record<string, any>) => request(C2S.DISCORD_QUESTIONS, { settings }),
    /** The game requests board (server/engine/game-requests.js). */
    gameRequests: (op: string, payload: Record<string, any> = {}) => request(C2S.GAME_REQUESTS, { ...payload, op }),
    /** Moderation: 'settings', 'act' ({ uid, platform, action }) or 'log' (server/engine/moderation.js). */
    moderation: (op: string, payload: Record<string, any> = {}) => request(C2S.MODERATION, { ...payload, op }),
    /** Which Discord call the bot follows, and whether it joins it. */
    setVoice: (patch: { channelId?: string; listen?: boolean; pinned?: { id: string; name: string }[]; follow?: { id: string; name: string } | null }) => send(C2S.SET_VOICE, patch),
    clearQuestions: (which?: string) => send(C2S.QUESTIONS_CLEAR, { which }),
    /** Add one by hand, edit one, "Next question", the settings. Awaited, so the screen can say why not. */
    questions: (payload: Record<string, any>) => request(C2S.QUESTIONS, payload),
    /** The Twitch schedule, asked for again (server/engine/twitch-schedule.js). */
    refreshSchedule: () => request(C2S.TWITCH_SCHEDULE, {}),
    // Assets go over HTTP rather than the socket: the body is the file, and
    // pushing binary through the JSON protocol would mean base64.
    listAssets: () => apiFetch(`/api/assets`).then((r) => r.json()),
    uploadAsset: async (file: File) => {
      // Said at once rather than after sending a file the server would only turn away.
      const kind = assetKindOf(file.name);
      if (kind && file.size > ASSET_KINDS[kind as keyof typeof ASSET_KINDS].max) {
        const mb = ASSET_KINDS[kind as keyof typeof ASSET_KINDS].max / 1024 / 1024;
        const err: any = new Error(`File is larger than ${mb}MB`);
        err.code = 'upload_too_big';
        err.vars = { mb };
        throw err;
      }
      const res = await apiFetch(`/api/assets/${encodeURIComponent(file.name)}`, {
        method: 'POST',
        body: file,
      });
      const body = await res.json();
      if (!res.ok) {
        // With the code and what fills it, so the screen can say why in its own language.
        const err: any = new Error(body?.error || `upload failed (${res.status})`);
        if (body?.code) err.code = body.code;
        if (body?.vars) err.vars = body.vars;
        throw err;
      }
      return body;
    },

    // -- twitch
    handleTwitchLogin: (role: 'main' | 'bot' = 'main') => {
      // The server value first: localStorage is per-origin, so a Client ID
      // saved while viewing :8081 is invisible on :5173.
      const clientId = (snapshot.connections as any)?.twitch?.clientId
        || twitchClientId
        || localStorage.getItem('twitch_client_id')
        || '';

      if (!clientId) {
        alert('Set your Twitch Client ID in Connections first.');
        return;
      }
      localStorage.setItem('twitch_pending_role', role);
      const scopes = [
        // Reading chat, and answering in it ("!puntos", "!rango").
        'chat:read', 'chat:edit',
        // Follows, subscriptions and bits, for points and the roles that follow them.
        'moderator:read:followers', 'channel:read:subscriptions', 'bits:read',
        // Banning and timing out, from the mod log and Role Management.
        'moderator:manage:banned_users',
      ].join(' ');

      const redirectUri = window.location.origin + window.location.pathname;
      // Twitch requires this to match a registered URL character for character,
      // and it differs between the dev port and the server port.
      console.info(`Twitch login: redirect_uri=${redirectUri} (must be registered on your Twitch app)`);

      const url = new URL('https://id.twitch.tv/oauth2/authorize');
      url.searchParams.set('client_id', clientId);
      url.searchParams.set('redirect_uri', redirectUri);
      url.searchParams.set('response_type', 'token');
      url.searchParams.set('scope', scopes);
      // Without this Twitch silently reuses whichever account the browser is
      // already signed into, which made attaching a separate bot account
      // impossible: force_verify always shows the consent screen.
      url.searchParams.set('force_verify', 'true');

      window.location.href = url.toString();
    },
    handleTwitchConnect: () => send(C2S.PLATFORM_CONNECT, { platform: 'twitch' }),
    handleTwitchLogout: () => {
      send(C2S.SET_CREDENTIALS, { platform: 'twitch', accessToken: '', login: '', userId: '' });
      send(C2S.PLATFORM_DISCONNECT, { platform: 'twitch' });
    },
    handleTwitchBotConnect: () => send(C2S.PLATFORM_CONNECT, { platform: 'twitch' }),
    handleTwitchBotLogout: () => send(C2S.SET_CREDENTIALS, { platform: 'twitch', botToken: '', botLogin: '' }),
    getTwitchUser: (login: string) => req(C2S.TWITCH_GET_USER, { login }),
    setTwitchClientId: (v: string) => {
      setTwitchClientIdState(v);
      localStorage.setItem('twitch_client_id', v);
      // The server needs this too — Helix and EventSub both send it as a header.
      send(C2S.SET_CREDENTIALS, { platform: 'twitch', clientId: v });
    },

    // -- tiktok
    setTiktokUrl: (v: string) => send(C2S.SET_CREDENTIALS, { platform: 'tiktok', username: v }),
    /** Optional Euler Stream key; without one TikTok uses the shared quota. */
    setTiktokSignKey: (v: string) => {
      setTiktokSignKeyDraft(v);
      send(C2S.SET_CREDENTIALS, { platform: 'tiktok', signApiKey: v });
    },
    // A toggle: the view turns the button red once the connection is live (or
    // waiting) and expects a second press to stop it.
    handleTikTokConnect: () => {
      const s = (snapshot.status as any)?.tiktok?.status;
      const live = s === 'connected' || s === 'connecting' || s === 'polling' || s === 'waiting' || s === 'searching';
      send(live ? C2S.PLATFORM_DISCONNECT : C2S.PLATFORM_CONNECT, { platform: 'tiktok' });
    },

    // -- discord
    setDiscordToken: (v: string) => {
      localStorage.setItem('discord_client_id', v ?? '');
      send(C2S.SET_CREDENTIALS, { platform: 'discord', clientId: v ?? '' });
    },
    setDiscordChannelId: (v: string) => send(C2S.SET_CREDENTIALS, { platform: 'discord', channelId: v }),
    /** The bot token, and the secret its OAuth exchange needs. The server reconnects the gateway as soon as a token lands. */
    setDiscordBotToken: (v: string) => {
      setDiscordBotTokenDraft(v);
      send(C2S.SET_CREDENTIALS, { platform: 'discord', botToken: v });
    },
    setDiscordClientSecret: (v: string) => {
      setDiscordClientSecretDraft(v);
      send(C2S.SET_CREDENTIALS, { platform: 'discord', clientSecret: v });
    },
    setDiscordGuildId: (v: string) => send(C2S.SET_CREDENTIALS, { platform: 'discord', guildId: v }),
    /**
     * Start the Discord OAuth flow. This authorises *you* — it is what
     * populates your account and server list. The bot gateway is a separate
     * concern, driven by the bot token.
     */
    connectDiscord: (clientIdArg?: string) => {
      const id = clientIdArg
        || (snapshot.connections as any)?.discord?.clientId
        || localStorage.getItem('discord_client_id')
        || '';

      if (!id) {
        alert('Set your Discord Client ID in Connections first.');
        return;
      }

      localStorage.setItem('discord_client_id', id);
      send(C2S.SET_CREDENTIALS, { platform: 'discord', clientId: id });

      const redirectUri = window.location.origin + window.location.pathname;
      console.info(`Discord login: redirect_uri=${redirectUri} (must be registered under OAuth2 -> Redirects)`);

      const url = new URL('https://discord.com/oauth2/authorize');
      url.searchParams.set('client_id', id);
      url.searchParams.set('redirect_uri', redirectUri);
      url.searchParams.set('response_type', 'code');
      url.searchParams.set('scope', 'identify guilds');
      // Distinguishes this callback from YouTube's, which also returns ?code=.
      url.searchParams.set('state', 'discord');
      window.location.href = url.toString();
    },
    disconnectDiscord: () => send(C2S.PLATFORM_DISCONNECT, { platform: 'discord' }),
    connectDiscordChannel: (channelId: string) => send(C2S.SET_CREDENTIALS, { platform: 'discord', channelId }),
    setDiscordCommandsEverywhere: (on: boolean) => send(C2S.SET_CREDENTIALS, { platform: 'discord', commandsEverywhere: on }),

    fetchDiscordRoles: async (guildId: string) => {
      const roles = await req(C2S.DISCORD, { op: 'get_roles', guildId });
      if (roles) {
        setDiscordRoles(roles);
        localStorage.setItem('discord_roles', JSON.stringify(roles));
      }
      return roles;
    },
    fetchDiscordChannels: async (guildId: string) => {
      const channels = await req(C2S.DISCORD, { op: 'get_channels', guildId });
      if (channels) setDiscordChannels(channels);
      return channels;
    },
    fetchDiscordEmojis: async (guildId: string) => {
      const emojis = await req(C2S.DISCORD, { op: 'get_emojis', guildId });
      if (emojis) {
        setDiscordEmojis(emojis);
        localStorage.setItem('discord_emojis', JSON.stringify(emojis));
      }
      return emojis;
    },
    fetchBotMember: async (guildId: string) => {
      const member = await req(C2S.DISCORD, { op: 'get_member_me', guildId });
      if (member) setDiscordBotMember(member);
      return member;
    },
    // Everybody in the server the voice call is in, people only, by name: to follow or pin somebody before they join.
    listServerMembers: async (): Promise<{ id: string; name: string; username: string; avatar: string }[]> =>
      (await req(C2S.DISCORD, { op: 'server_members' })) || [],
    // SimonBot: put Pixel Simon on the bot account, and register the slash commands again.
    setBotFace: (face: 'mint' | 'clear' = 'mint') => req(C2S.DISCORD, { op: 'set_bot_face', face }),
    syncSlashCommands: () => req(C2S.DISCORD, { op: 'sync_slash_commands' }),
    searchDiscordMember: async (guildId: string, query: string) => {
      const results = await req(C2S.DISCORD, { op: 'search_members', guildId, query });
      setDiscordSearchResults(results || []);
      return results;
    },

    // -- reaction roles / buttons / welcome
    // Accept either a value or an updater, so a view using the React idiom
    // cannot silently send an unserialisable function.
    setRoleMappings: (v: any) => send(C2S.SET_ROLE_MAPPINGS,
      typeof v === 'function' ? v((snapshot as any).roleMappings ?? {}) : v),
    setWelcomeGoodbyeConfig: (v: any) => send(C2S.SET_WELCOME_GOODBYE,
      typeof v === 'function' ? v((snapshot as any).welcomeGoodbyeConfig ?? {}) : v),

    createReactionRole: (config: ReactionRoleMessage) =>
      send(C2S.SET_REACTION_ROLES, [...(snapshot as any).reactionRoleConfigs ?? [], config]),
    updateReactionRole: (config: ReactionRoleMessage) =>
      send(C2S.SET_REACTION_ROLES, ((snapshot as any).reactionRoleConfigs ?? []).map((c: any) => (c.id === config.id ? config : c))),
    deleteReactionRole: (id: string) =>
      send(C2S.SET_REACTION_ROLES, ((snapshot as any).reactionRoleConfigs ?? []).filter((c: any) => c.id !== id)),
    /**
     * Put the menu on Discord and make sure it carries its reactions. An
     * existing message is edited in place, which is what matters for a menu
     * people have already reacted to: republishing would orphan every role
     * anyone holds. Reactions already present are left alone, so syncing twice
     * is harmless.
     */
    handleSyncReactionRole: async (config: ReactionRoleMessage) => {
      setSyncingMessageId(config.messageId || config.id);
      setReactionSyncError(null);
      try {
        let messageId = config.messageId;

        if (messageId) {
          await request(C2S.DISCORD, {
            op: 'edit_message',
            channelId: config.channelId,
            messageId,
            content: config.content,
            embed: config.embed,
          });
        } else {
          const posted: any = await request(C2S.DISCORD, {
            op: 'send_message',
            channelId: config.channelId,
            content: config.content,
            embed: config.embed,
          });
          messageId = posted?.id;
          // Record it immediately: without the id nothing can match an incoming
          // reaction to this menu, and a second sync would post another copy.
          if (messageId) {
            send(C2S.SET_REACTION_ROLES, ((snapshot as any).reactionRoleConfigs ?? [])
              .map((c: any) => (c.id === config.id ? { ...c, messageId } : c)));
          }
        }

        if (!messageId) throw new Error('Discord did not return a message id');

        // Only add what is missing. Re-adding an existing reaction is a no-op
        // for Discord but still costs a rate-limited request each time.
        const current: any = await request(C2S.DISCORD, {
          op: 'get_message', channelId: config.channelId, messageId,
        }).catch(() => null);

        const already = new Set(
          (current?.reactions ?? [])
            .filter((r: any) => r.me)
            .map((r: any) => (r.emoji?.id ? `id:${r.emoji.id}` : String(r.emoji?.name ?? '').trim())),
        );
        const keyOf = (e: string) => {
          const markup = /^<(a?):([^:]+):(\d+)>$/.exec(String(e).trim());
          return markup ? `id:${markup[3]}` : String(e).trim();
        };

        for (const mapping of config.mappings ?? []) {
          if (!mapping.emoji || already.has(keyOf(mapping.emoji))) continue;
          await request(C2S.DISCORD, {
            op: 'add_reaction', channelId: config.channelId, messageId, emoji: mapping.emoji,
          });
        }
      } catch (err: any) {
        console.error('reaction role sync failed:', err);
        setReactionSyncError({ id: config.id, message: err?.message || String(err) });
      } finally {
        setSyncingMessageId(null);
      }
    },

    createButtonMenu: (config: DiscordButtonMessage) =>
      send(C2S.SET_BUTTON_MENUS, [...((snapshot as any).discordButtonConfigs ?? []), config]),
    updateButtonMenu: (config: DiscordButtonMessage) =>
      send(C2S.SET_BUTTON_MENUS, ((snapshot as any).discordButtonConfigs ?? []).map((c: any) => (c.id === config.id ? config : c))),
    /** Going live in Discord: change a setting, or post a test now. */
    setAnnounce: (settings: any) => send(C2S.ANNOUNCE, { settings }),
    testAnnounce: () => request(C2S.ANNOUNCE, { op: 'test' }),
    /** The Twitch schedule as Discord events: its settings, and following it now. */
    setScheduleEvents: (settings: any) => send(C2S.SCHEDULE_EVENTS, { settings }),
    syncScheduleEvents: () => request(C2S.SCHEDULE_EVENTS, { op: 'sync' }),
    /** The welcome card, drawn by the server exactly as it will be posted. */
    previewWelcomeCard: (card: any, sample: any) => request(C2S.WELCOME_CARD_PREVIEW, { card, sample }),
    // Posts it in the server for real, with the settings on screen; refusals carry a code.
    testWelcome: (kind: string, config: any, testChannelId?: string) => request(C2S.WELCOME_TEST, { kind, config, testChannelId }),
    /** Post a saved button menu to Discord, or update the one already there. */
    publishButtonMenu: (id: string) => request(C2S.DISCORD, { op: 'publish_button_menu', id }),
    // Deleting a menu here takes its message out of Discord too.
    deleteButtonMenu: async (id: string) => {
      await request(C2S.DISCORD, { op: 'unpublish_button_menu', id }).catch(() => {});
      send(C2S.SET_BUTTON_MENUS, ((snapshot as any).discordButtonConfigs ?? []).filter((c: any) => c.id !== id));
    },

    /*
      Discord roles that follow stream status (server/engine/role-sync.js).
      The server links, syncs and keeps the log; this screen only asks.
    */
    linkDiscord: (link: { platform: 'twitch' | 'tiktok' | 'youtube'; platformId: string; platformName?: string; discordId: string; discordName?: string; discordAvatar?: string }) =>
      request(C2S.ROLE_SYNC, { op: 'link', ...link }),
    unlinkDiscord: (key: string) => send(C2S.ROLE_SYNC, { op: 'unlink', key }),
    /** Roles for showing up (role-sync loyalty): [{ kind, atLeast, roleId }]. */
    setLoyaltyRoles: (rules: any[]) => request(C2S.ROLE_SYNC, { op: 'loyalty', rules }),
    /** Another account for somebody already linked, named by any account they have; one that was somebody else's brings them along. */
    addAccount: (account: { to: string; platform: 'discord' | 'twitch' | 'tiktok' | 'youtube'; platformId: string; platformName?: string; avatar?: string }) =>
      request(C2S.ROLE_SYNC, { op: 'add_account', ...account }),
    forceSyncUser: (key: string) => request(C2S.ROLE_SYNC, { op: 'sync', key }),
    clearSyncLog: () => send(C2S.ROLE_SYNC, { op: 'clear_log' }),
    /** Somebody on YouTube to link: seen in its chat by name, or a channel by @handle / id. */
    findYoutube: (query: string) => request(C2S.ROLE_SYNC, { op: 'find_youtube', query }),
    /** Everybody following on Twitch, newest first, with how many there are and whether all were listed. */
    listTwitchFollowers: (): Promise<{ followers: { id: string; login: string; name: string; followedAt: number; avatar: string }[]; total: number; complete: boolean }> =>
      request(C2S.ROLE_SYNC, { op: 'twitch_followers' }),

    // -- leveling
    updateXpConfig: (config: any) => send(C2S.UPDATE_XP_CONFIG, config),
    resetXp: () => send(C2S.RESET_XP, {}),
    linkIdentity: (primary: any, secondary: any) => send(C2S.LINK_IDENTITIES, { primary, secondary }),
    unlinkUser: (key: string) => send(C2S.UNLINK_USER, { key }),
    manualLinkUser: (twitchUser: string, discordId: string) => send(C2S.LINK_IDENTITIES, {
      primary: { platform: 'twitch', id: twitchUser, username: twitchUser },
      secondary: { platform: 'discord', id: discordId },
    }),
  }), [send, req, request, snapshot, twitchClientId]);

  // ---------------------------------------------------------------- status

  /** A platform's status, whether it arrived as a word or wrapped in an object. */
  const settled = (v: any) => (typeof v === 'string' ? v : v?.status) ?? 'disconnected';

  const status = useMemo(() => {
    const s: any = snapshot.status || {};
    return {
      twitch: s.twitch?.main ?? 'disconnected',
      twitchBot: s.twitch?.bot ?? 'disconnected',
      // Either shape: a snapshot carries the word itself — "connected" — while
      // a live status event carries an object with it inside.
      tiktok: settled(s.tiktok),
      youtube: settled(s.youtube),
      discord: settled(s.discord),
      tiktokError: s.tiktok?.error ?? null,
      tiktokWatch: s.tiktok?.watch ?? null,
    };
  }, [snapshot.status]);

  const connections = useMemo(() => {
    const c: any = snapshot.connections || {};
    return {
      // The full Helix user record the server resolved, for the avatar and display name.
      twitchUser: c.twitch?.user ?? null,
      twitchBotUser: c.twitch?.botUser ?? null,
      twitchChannel: c.twitch?.channel ?? '',
      tiktokUrl: c.tiktok?.username ?? '',
      discordToken: c.discord?.clientId || localStorage.getItem('discord_client_id') || '',
      discordChannelId: c.discord?.channelId ?? '',
      // Commands in every channel of the server, not only the one the app reads.
      discordCommandsEverywhere: c.discord?.commandsEverywhere !== false,
      discordGuildId: c.discord?.guildId ?? '',
      // Server-cached metadata wins, so any device — a phone, another machine —
      // sees the guild and channel names without running the Discord login itself.
      discordUser: c.discord?.user ?? discordUser,
      discordGuilds: c.discord?.guilds?.length ? c.discord.guilds : discordGuilds,
      discordChannels: c.discord?.channels?.length ? c.discord.channels : discordChannels,
      discordEmojis: c.discord?.emojis?.length ? c.discord.emojis : discordEmojis,
      botMember: c.discord?.botMember ?? discordBotMember,
      /* The secret never comes back; the server only says whether it has one. */
      youtubeClientId: c.youtube?.clientId || '',
      youtubeHasSecret: Boolean(c.youtube?.hasSecret),
      youtubeAuthorised: Boolean(c.youtube?.authorised),
      youtubeCanEdit: Boolean(c.youtube?.canEdit),
      youtubeHealth: c.youtube?.health || null,
      // A live chat to post in, right now.
      youtubeLive: Boolean(c.youtube?.live),
      youtubeChannel: c.youtube?.channel || null,
      discordBotToken: discordBotTokenDraft,
      discordClientSecret: discordClientSecretDraft,
      discordHasBotToken: Boolean(c.discord?.hasBotToken),
      discordHasClientSecret: Boolean(c.discord?.hasClientSecret),
      tiktokSignKey: tiktokSignKeyDraft,
      tiktokHasSignKey: Boolean(c.tiktok?.hasSignKey),
      twitchClientId: c.twitch?.clientId || twitchClientId,
    };
  }, [snapshot, discordUser, discordGuilds, discordChannels, discordEmojis, discordBotMember,
    twitchClientId, discordBotTokenDraft, discordClientSecretDraft, tiktokSignKeyDraft]);

  /*
    The names Discord's codes stand for, learned for every screen that shows
    Discord's words (discordEmoji.ts): the server's channels and roles, and
    the people mentioned in requests and questions.
  */
  // Learned while drawing, before the screens below draw with them: an effect would come a draw too late.
  useMemo(() => {
    const s: any = snapshot;
    rememberDiscordLists({
      channels: s.connections?.discord?.channels?.length ? s.connections.discord.channels : discordChannels,
      roles: s.connections?.discord?.roles?.length ? s.connections.discord.roles : discordRoles,
    });
    for (const r of s.gameRequests?.requests || []) rememberDiscordNames(r.names);
    for (const q of s.questions?.items || []) rememberDiscordNames(q.names);
  }, [snapshot, discordChannels, discordRoles]);

  const s: any = snapshot;
  return {
    data: {
      // The server's version (shared/version.js), beside this page's own.
      serverVersion: s.serverVersion || '',
      questions: s.questions,
      questionSettings: s.questionSettings,
      poll: s.poll,
      pollSettings: s.pollSettings,
      pollHistory: s.pollHistory || [],
      // The giveaway (server/engine/giveaway.js) and how it is told and posted.
      giveaway: s.giveaway,
      giveawaySettings: s.giveawaySettings,
      // A channel's standing posts, built from blocks (server/engine/discord-pages.js).
      discordPages: s.discordPages,
      // How long people are kept (server/engine/viewer-history.js).
      historySettings: s.historySettings,
      // Points: what they are called and how they are earned (server/engine/points.js).
      pointsSettings: s.pointsSettings,
      // "!perfil" (server/engine/profile-card.js).
      profileCard: s.profileCard,
      // The moments chat goes wild (server/engine/highlights.js).
      highlights: s.highlights,
      // Going live, told privately (server/engine/live-dms.js).
      liveDms: s.liveDms,
      // Whether a newer version is out, and how an update is going (server/engine/updater.js); null on a copy updated by hand.
      updates: s.updates || null,
      discordQuestions: s.discordQuestions,
      gameRequests: s.gameRequests,
      moderation: s.moderation,
      moderationLog: s.moderationLog ?? [],
      voice: s.voice,
      announce: s.announce,
      // The Twitch schedule as Discord events: the settings, how many there are, when last checked.
      scheduleEvents: s.scheduleEvents,
      twitchSchedule: s.twitchSchedule ?? null,
      roleSyncSubsCheck: s.roleSyncSubsCheck ?? null,
      // The stream on now (server/engine/stream-sessions.js streamNow): null while offline.
      streamNow: (s.streamNow ?? null) as { n: number; startedAt: number; title: string; game: string } | null,
      linkedUsers: s.linkedUsers ?? {},
      // The same links as people: everybody with more than one account, each account listed (server/engine/role-sync.js).
      linkedPeople: s.linkedPeople ?? [],
      loyaltyRoles: s.loyaltyRoles ?? [],
      pendingLinks: s.pendingLinks ?? {},
      // Roles gate the Reaction Roles and Role Management screens, so they
      // must come from the server for a device that never fetched them.
      discordRoles: s.connections?.discord?.roles?.length ? s.connections.discord.roles : discordRoles,
      roleMappings: s.roleMappings ?? {},
      reactionRoleConfigs: s.reactionRoleConfigs ?? [],
      roleActivityLog: s.roleActivityLog ?? [],
      syncingMessageId,
      reactionSyncError,
      discordButtonConfigs: s.discordButtonConfigs ?? [],
      syncLog: s.roleSyncLog ?? [],
      welcomeGoodbyeConfig: s.welcomeGoodbyeConfig ?? {},
      discordSearchResults,
      xpData: s.xpData ?? {},
      leaderboard: s.leaderboard,
      subscribers: s.subscribers,
      xpConfig: s.xpConfig,
    },
    settings: {
      activeThemeId, setActiveThemeId,
      language, setLanguage,
      relayConfig: s.relayConfig as RelayConfig,
      setRelayConfig: (v: any) => send(C2S.SET_RELAY_CONFIG,
        typeof v === 'function' ? v(s.relayConfig ?? {}) : v),
    },
    status,
    connections,
    actions,
    /*
      YouTube: the id and secret are kept on the server so any device inherits
      them, and the login is a redirect that comes back to exactly the URL the
      screen shows.
    */
    youtube: {
      setSettings: (patch: { clientId?: string; clientSecret?: string }) => send(C2S.YOUTUBE_SET_SETTINGS, patch),
      logout: () => send(C2S.YOUTUBE_LOGOUT, {}),
      login: () => {
        const clientId = s.connections?.youtube?.clientId;
        if (!clientId) {
          alert('Set your YouTube Client ID in Connections first.');
          return;
        }
        const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
        url.searchParams.set('client_id', clientId);
        url.searchParams.set('response_type', 'code');
        url.searchParams.set('redirect_uri', youtubeRedirectUri());
        // Reading chat and posting in it.
        url.searchParams.set('scope', 'https://www.googleapis.com/auth/youtube.force-ssl');
        /*
          Google hands back a refresh token only for offline access, and only
          the first time somebody consents — so consent is asked for every
          time. Without it a second login would authorise for an hour and
          then quietly stop working.
        */
        url.searchParams.set('access_type', 'offline');
        url.searchParams.set('prompt', 'consent');
        // Tells the shared callback handler which provider is returning.
        url.searchParams.set('state', 'youtube');
        window.location.href = url.toString();
      },
    },
    /** Not part of the views' contract; handy for a connection indicator. */
    _backendConnected: backend.connected,
    /** Who this page is signed in as, whether the server wants a sign-in first, and connecting again once there is one. */
    auth: {
      me: backend.me,
      /** A moderator: the streamer's own things are hidden. */
      isMod,
      signIn: backend.signIn,
      reconnect: backend.reconnect,
      /** The Moderators screen: { op: 'list' | 'block' | 'unblock' | 'signout' | 'activity', userId? } (server/api/ws.js). */
      moderators: (payload: any) => request(C2S.MODERATORS, payload),
      /** The streamer's sign-in settings, once asked for: { enabled, ownerKey }. */
      state: authState,
      /** Change them: { op: 'enable', on } | { op: 'new-key', which: 'ownerKey' } | { op: 'signout' } (server/api/auth.js). Answers the settings as they are now. */
      control: async (payload: any) => {
        const out: any = await request(C2S.AUTH, payload);
        if (out && typeof out.enabled === 'boolean') setAuthState(out);
        return out;
      },
    },
  };
};
