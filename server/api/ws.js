/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * WebSocket hub.
 *
 * Every open dashboard — this computer, a phone, a moderator's — gets the
 * same stream. Clients are pure subscribers:
 * they never own state, so opening or closing one changes nothing about how
 * the stack behaves.
 */

import { WebSocketServer, WebSocket } from 'ws';
import { isSameMachine } from '../core/net.js';
import { bus, EVENTS } from '../core/bus.js';
import { createLogger } from '../core/logger.js';
import { refusal } from '../core/refusal.js';
import * as auth from './auth.js';
import * as modActivity from '../engine/mod-activity.js';
import { C2S, S2C } from '../../shared/protocol.js';
import { VERSION } from '../../shared/version.js';
import * as engine from '../engine/index.js';
import * as discordRoles from '../engine/discord-roles.js';
import { previewCard } from '../engine/welcome-card.js';
import { testGreeting, previewFacts } from '../engine/welcome.js';
import * as announcer from '../engine/announce.js';
import * as discordPages from '../engine/discord-pages.js';
import * as viewerHistory from '../engine/viewer-history.js';
import * as points from '../engine/points.js';
import * as profileCard from '../engine/profile-card.js';
import * as slashCommands from '../engine/slash-commands.js';
import { setBotFace } from '../engine/bot-face.js';
import * as liveDms from '../engine/live-dms.js';
import * as updater from '../engine/updater.js';
import * as discordQuestions from '../engine/discord-questions.js';
import * as gameRequests from '../engine/game-requests.js';
import * as moderation from '../engine/moderation.js';
import * as streamSessions from '../engine/stream-sessions.js';
import * as twitch from '../platforms/twitch.js';
import * as youtube from '../platforms/youtube.js';
import * as watch from '../engine/watch.js';
import * as discord from '../platforms/discord.js';
import * as discordVoice from '../platforms/discord-voice.js';
import * as leveling from '../leveling/index.js';

const log = createLogger('ws');

const clients = new Set();
const isOpen = (ws) => ws && ws.readyState === WebSocket.OPEN;
/** How long XP gathers before the leaderboard goes out again. */
export const LEADERBOARD_EVERY_MS = 5_000;
let wss = null;

// Last connections payload actually sent, so a status event that changed
// nothing about them does not rebroadcast the whole thing. See wireBusToClients.
let lastConnectionsJson = '';

export function initWebSocket(httpServer) {
  wss = new WebSocketServer({ server: httpServer });

  // `ws` forwards the HTTP server's 'error' events onto this emitter. Without
  // a listener here, EventEmitter throws on the re-emit — which happens
  // *before* the http server's own error handler runs, turning a clean
  // "port in use" message into an uncaught exception. Log and let the
  // http server's handler decide whether the error is fatal.
  wss.on('error', (err) => log.error('websocket server error:', err.message));

  wss.on('connection', (ws, req) => {
    // Who it is (api/auth.js), before anything is said: another website's page cannot borrow a sign-in, and nobody is let in unknown.
    let who = null;
    try {
      if (!auth.originAllowed(req)) { ws.close(4403, 'not from this address'); return; }
      who = auth.identify(req);
    } catch (err) {
      // Never left open and unknown: a connection the server could not place is closed.
      log.warn('could not tell who a connection was:', err.message);
      ws.close(1011, 'try again');
      return;
    }
    if (!who) { ws.close(4401, 'sign in first'); return; }
    ws.who = who;
    // A moderator back after a while is asked about again first; until that is answered, what they send waits.
    ws.ready = who.role === 'mod' ? auth.recheckMod(who) : Promise.resolve(true);

    const addr = req.socket.remoteAddress || '';
    // Loopback *or* this machine's own LAN address: the dashboard may be opened at either.
    ws.isLocal = isSameMachine(addr);
    ws.connectedAt = Date.now();
    ws.remoteLabel = addr;

    ws.isAlive = true;

    // Told the stream only once it is known who it is.
    ws.ready.then((ok) => {
      if (!ok) { ws.close(4401, 'sign in again'); return; }
      if (ws.readyState !== WebSocket.OPEN) return;
      clients.add(ws);
      log.info(`client connected (${clients.size} total) from ${addr}${who.via === 'open' ? '' : ` as ${who.login || who.role}`}`);
      send(ws, S2C.ME, meOf(ws));
      send(ws, S2C.SNAPSHOT, buildSnapshot());
    });

    ws.on('pong', () => { ws.isAlive = true; });
    // Nothing more from a connection whose sign-in ended, in the moment before it is gone (ws.revoked, below).
    ws.on('message', (raw) => { ws.ready.then((ok) => ok && !ws.revoked && ws.readyState === WebSocket.OPEN && handleMessage(ws, raw)); });
    ws.on('close', () => {
      clients.delete(ws);
      log.info(`client disconnected (${clients.size} remaining)`);
    });
    ws.on('error', (err) => log.warn('client socket error:', err.message));
  });

  // Drop half-open connections so `clients` reflects reality.
  const heartbeat = setInterval(() => {
    for (const ws of clients) {
      if (!ws.isAlive) { ws.terminate(); clients.delete(ws); continue; }
      ws.isAlive = false;
      try { ws.ping(); } catch { /* terminated below on next sweep */ }
      // A moderator connected for hours is asked about again too, when theirs is due (auth.recheckMod says when).
      if (ws.who?.role === 'mod') auth.recheckMod(ws.who).then((ok) => { if (!ok) letGo(ws, 'sign in again'); }).catch(() => {});
    }
  }, 30_000);
  wss.on('close', () => clearInterval(heartbeat));

  // A sign-in ended — signed out, a moderator let go, the owner key changed, sign-in switched on: its connections go now.
  auth.onSessionsEnded((ids) => {
    for (const c of clients) if (c.who?.sessionId && ids.includes(c.who.sessionId)) letGo(c);
  });

  wireBusToClients();
  log.info('hub ready');
}

// ------------------------------------------------------------- broadcasting

function send(ws, type, payload, meta = {}) {
  if (ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify({ type, payload, ...meta }));
}

/**
 * The Moderators screen's list: everybody who has signed in as a moderator,
 * whether they are here now (an open connection), and who is turned away.
 */
function moderatorsNow() {
  const { signedIn, blocked } = auth.moderators();
  const online = new Map();
  for (const c of clients) if (c.who?.role === 'mod' && c.who.userId) online.set(c.who.userId, (online.get(c.who.userId) || 0) + 1);
  return {
    enabled: auth.isEnabled(),
    moderators: signedIn.map((m) => ({ ...m, online: online.get(m.userId) || 0 })),
    blocked,
  };
}

/** A connection whose sign-in has ended: refused from now on (the message handler checks), and closed. */
function letGo(c, reason = 'signed out') {
  c.revoked = true;
  try { c.close(4401, reason); } catch { /* already closing */ }
}

export function broadcast(type, payload) {
  const frame = JSON.stringify({ type, payload });
  for (const ws of clients) if (isOpen(ws)) ws.send(frame);
}

/**
 * Every page let go, for a shutdown: an open socket keeps the HTTP server
 * from closing, so without this every stop waited out its timer. The pages
 * reconnect by themselves to whatever starts next.
 */
export function closeWebSocket() {
  for (const ws of clients) { try { ws.terminate(); } catch { /* already gone */ } }
  clients.clear();
  try { wss?.close(); } catch { /* never opened */ }
}

function wireBusToClients() {
  bus.on(EVENTS.STATUS, (s) => {
    broadcast(S2C.STATUS, s);

    // Connection metadata travels alongside status: logging in resolves an
    // avatar and display name, and the Connections screen renders those.
    // Without this the UI showed a bare "Connected" until the next reload.
    //
    // But only when it has actually changed: this payload embeds Discord's
    // entire metadata cache (measured at 129.5KB against real data), and a
    // status that changed nothing about it is no reason to send it again.
    //
    // New clients do not depend on this: they receive connections in the
    // snapshot they get on HELLO.
    broadcastConnections();
  });
  bus.on(EVENTS.LEVELUP, (l) => broadcast(S2C.XP_LEVELUP, l));
  /*
    The board, as XP comes in: gathered for a few seconds, so a busy chat
    sends it a few times a minute rather than with every message. The board
    alone — the whole user list goes only to the Levels screen when asked.
  */
  let boardTimer = null;
  bus.on('xp:changed', () => {
    if (boardTimer) return;
    boardTimer = setTimeout(() => {
      boardTimer = null;
      broadcast(S2C.XP_DATA, { leaderboard: leveling.leaderboard() });
    }, LEADERBOARD_EVERY_MS);
    boardTimer.unref?.();
  });

  // Config the clients hold a copy of, changed server-side. EVENTS.CONFIG was
  // declared on the bus from the start but never connected to anything, so
  // anything emitting one reached nobody.
  bus.on(EVENTS.CONFIG, ({ key, value }) => broadcast(S2C.CONFIG_PATCH, { [key]: value }));

}

/**
 * Broadcast the connections blob, but only when it actually differs from what
 * clients were last sent. Every path that publishes connections goes through
 * here so the cache cannot drift: a direct `broadcast` elsewhere would leave
 * `lastConnectionsJson` stale and cost one redundant resend on the next
 * status event.
 */
function broadcastConnections() {
  const next = buildConnections();
  const json = JSON.stringify(next);
  if (json === lastConnectionsJson) return;
  lastConnectionsJson = json;
  broadcast(S2C.CONFIG_PATCH, { connections: next });
}

function buildConnections() {
  return {
    twitch: twitch.getCredentials(),
    youtube: youtube.getCredentials(),
    discord: discord.getSettings(),
  };
}

function buildSnapshot() {
  return {
    ...engine.snapshot(),
    // The stream on now, for the home screen: since when, called what.
    streamNow: streamSessions.streamNow(),
    ...discordRoles.snapshot(),
    // The channels watched for going live, each with its post (server/engine/watch.js).
    ...watch.snapshot(),
    ...discordPages.snapshot(),
    ...viewerHistory.snapshot(),
    ...points.snapshot(),
    ...profileCard.snapshot(),
    ...liveDms.snapshot(),
    ...updater.snapshot(),
    ...discordQuestions.snapshot(),
    ...gameRequests.snapshot(),
    ...moderation.snapshot(),
    xpConfig: leveling.getConfig(),
    leaderboard: leveling.leaderboard(),
    status: {
      twitch: twitch.getStatus(),
      youtube: youtube.getStatus(),
      discord: discord.getStatus(),
    },
    connections: buildConnections(),
    voice: discordVoice.getState(),
    // The server's version, so a page loaded before an update can tell it is older.
    serverVersion: VERSION,
  };
}

// ------------------------------------------------------------------ inbound

/** Who this connection is, for its own page: the role it has and whether sign-in is on at all. */
const meOf = (ws) => ({ role: ws.who?.role || 'owner', login: ws.who?.login || '', name: ws.who?.name || '', via: ws.who?.via || 'open', signIn: auth.isEnabled() });

/*
  What each sign-in may send. A moderator may do nearly everything; these
  stay the streamer's: their connections and accounts, the sign-in itself,
  the moderators, backups and updates.
*/
const OWNER_ONLY = new Set([
  C2S.SET_CREDENTIALS, C2S.PLATFORM_CONNECT, C2S.PLATFORM_DISCONNECT,
  C2S.CONFIG_EXPORT, C2S.CONFIG_IMPORT, C2S.UPDATES, C2S.MODERATORS,
]);
/** And the ops a moderator may not send in one that is otherwise theirs: signing the app in to Discord is the streamer's, like the other accounts. */
const MOD_NOT_OPS = {
  [C2S.DISCORD]: ['exchange_code'],
};
export function mayAsk(who, type, payload) {
  if (!who) return false;
  if (who.role === 'owner') return true;
  if (who.role === 'mod') {
    if (MOD_NOT_OPS[type]?.includes(payload?.op)) return false;
    return type === C2S.AUTH || !OWNER_ONLY.has(type);
  }
  return false;
}

async function handleMessage(ws, raw) {
  let msg;
  try {
    msg = JSON.parse(raw.toString());
  } catch (err) {
    log.warn('client sent unparseable frame:', err.message);
    return;
  }

  const { type, payload = {}, id } = msg;
  const reply = (result) => {
    // Carried out: on the record, if it was a moderator's and it changed something (engine/mod-activity.js).
    if (ws.who?.role === 'mod') {
      try {
        modActivity.record(ws.who, type, payload);
      } catch (err) { log.warn('could not keep what a moderator did:', err.message); }
    }
    if (id) send(ws, S2C.REPLY, result, { id });
  };
  const fail = (err) => {
    log.warn(`"${type}" failed: ${err.message}`);
    // A code, where there is one, lets the screen say it in its own language.
    if (id) send(ws, S2C.ERROR, { message: err.message, ...(err.code ? { code: err.code } : {}), ...(err.vars ? { vars: err.vars } : {}) }, { id });
  };

  try {
    if (!mayAsk(ws.who, type, payload)) throw refusal('signin_not_allowed', `"${type}" is not for this sign-in`);
    switch (type) {
      // -------- sign-in (api/auth.js), the streamer's own
      case C2S.AUTH: {
        const op = payload?.op;
        if (op === 'get') {
          // The owner key only to a sign-in of the owner's own (authState): never to somebody who is the owner only because sign-in is off.
          if (ws.who?.role !== 'owner') throw refusal('signin_owner_only', 'only the streamer can change sign-in');
          return reply(auth.authState(ws.who));
        }
        if (op === 'enable') {
          const state = auth.setEnabled(payload.on === true, ws.who);
          reply(state);
          // Everybody asked again who they are: with it on, somebody not signed in is let go; with it off, everyone is the owner again.
          setTimeout(() => { for (const c of clients) if (c !== ws) c.close(4001, 'sign-in changed'); }, 200);
          return;
        }
        // Who may sign in as what: the moderator role, and the owner's Discord account.
        if (op === 'roles') return reply(auth.setRoles(payload, ws.who));
        if (op === 'new-key') {
          const state = auth.newSecret(payload.which, ws.who);
          reply(state);
          return;
        }
        if (op === 'signout') {
          reply({ ok: true });
          // Its connections are let go by the sign-in itself ending (onSessionsEnded, below).
          if (ws.who?.sessionId) auth.signOut(ws.who.sessionId);
          return;
        }
        throw refusal('unknown_request', `no sign-in op "${op}"`);
      }

      // -------- the Moderators screen, the streamer's own
      case C2S.MODERATORS: {
        const op = payload?.op;
        const userId = String(payload?.userId || '');
        if (op === 'block' || op === 'unblock') auth.setBlocked(userId, op === 'block', ws.who, payload?.login);
        else if (op === 'signout') auth.signOutUser(userId, ws.who);
        else if (op === 'activity') return reply({ entries: modActivity.list({ userId, limit: Number(payload?.limit) || 200 }) });
        else if (op !== 'list') throw refusal('unknown_request', `no moderators op "${op}"`);
        return reply(moderatorsNow());
      }

      // -------- sync
      case C2S.HELLO:
      case C2S.GET_SNAPSHOT:
        reply(buildSnapshot());
        return;

      // A channel's standing posts, built on the Discord pages screen.
      case C2S.DISCORD_PAGES:
        return reply(await discordPages.control(payload));

      // Points: the settings, giving by hand, the richest.
      case C2S.POINTS:
        return reply(await points.control(payload));

      // The profile card's settings, and a preview of it.
      case C2S.PROFILE_CARD:
        return reply(await profileCard.control(payload));

      // Going live, told privately: the settings, the sign-up post, a test.
      case C2S.LIVE_DMS:
        return reply(await liveDms.control(payload));

      // Updates: check for a newer version, or get it ready and restart into it.
      case C2S.UPDATES:
        return reply(await updater.control(payload));

      // Which Discord channels feed the Questions screen, and whether answers go back there.
      case C2S.DISCORD_QUESTIONS:
        return reply(discordQuestions.setDiscordQuestions(payload?.settings));

      // The game requests board.
      case C2S.GAME_REQUESTS:
        return reply(await gameRequests.control(payload));

      // The mod log's settings, and banning or timing out from the screen.
      case C2S.MODERATION:
        return reply(await moderation.control(payload));

      // How long people are kept, and how many that would let go.
      case C2S.HISTORY: {
        if (payload?.op === 'settings') return reply(viewerHistory.setHistorySettings(payload.settings));
        if (payload?.op === 'prune') return reply(viewerHistory.prune());
        return reply(viewerHistory.historyStats());
      }

      // The watch list: add, remove, update, copy a setup, check now; or post a channel's test announcement.
      case C2S.WATCH:
        if (payload?.op === 'test') return reply(await announcer.announce(payload.id, { test: true }));
        return reply(await watch.control(payload));

      case C2S.WELCOME_CARD_PREVIEW:
        // With the server's real name and icon, for a card that shows them.
        return reply(await previewCard(payload?.card, { ...(payload?.sample || {}), ...(await previewFacts()) }));

      // A greeting posted now, as a real one would go, to see it in the server.
      case C2S.WELCOME_TEST:
        return reply(await testGreeting(String(payload?.kind || ''), payload?.config, payload?.testChannelId));

      case C2S.SET_VOICE:
        return reply(discordVoice.setVoice(payload));

      case C2S.GIVEAWAY:
        return reply(await engine.store.giveaway(payload?.op, payload?.value));

      /*
        Moderating one question at a time, never the whole queue.

        Questions arrive while you are reading them, so a whole-list save would
        drop whatever landed between the read and the write.
      */
      // Each reaches every surface on its own, as a question arriving from chat does.
      case C2S.QUESTION_SET_STATUS:
        engine.store.setQuestionStatus(payload?.id, payload?.status);
        break;

      case C2S.QUESTIONS_CLEAR:
        engine.store.clearQuestions(payload?.which);
        break;

      // Add one by hand, edit one, "Next question", the settings. Answered, so the screen can say why not.
      case C2S.QUESTIONS:
        return reply(engine.store.questions(payload));

      // -------- discord membership automation
      case C2S.SET_WELCOME_GOODBYE:
        broadcast(S2C.CONFIG_PATCH, { welcomeGoodbyeConfig: discordRoles.store.setWelcomeGoodbye(payload) });
        return reply({ ok: true });

      case C2S.SET_REACTION_ROLES:
        broadcast(S2C.CONFIG_PATCH, { reactionRoleConfigs: discordRoles.store.setReactionRoles(payload) });
        return reply({ ok: true });

      case C2S.SET_BUTTON_MENUS:
        broadcast(S2C.CONFIG_PATCH, { discordButtonConfigs: discordRoles.store.setButtonMenus(payload) });
        return reply({ ok: true });

      case C2S.CLEAR_ROLE_LOG:
        broadcast(S2C.CONFIG_PATCH, { roleActivityLog: discordRoles.store.clearActivityLog() });
        return reply({ ok: true });

      // -------- credentials & lifecycle
      case C2S.SET_CREDENTIALS: {
        const { platform, ...rest } = payload;

        // Tokens and secrets are set from the machine running the server, not
        // from anything that can reach it: a phone on the network opening the
        // dashboard is one thing, that phone writing a bot token another.
        const SECRET_FIELDS = ['botToken', 'clientSecret', 'apiKey'];
        if (!ws.isLocal && SECRET_FIELDS.some((f) => rest[f])) {
          throw refusal('secrets_local_only', 'secrets can only be set from the machine running the server');
        }
        if (platform === 'twitch') twitch.setCredentials(rest);
        else if (platform === 'youtube') youtube.setCredentials(rest);
        else if (platform === 'discord') discord.setSettings(rest);
        else throw new Error(`unknown platform "${platform}"`);
        broadcastConnections();
        return reply({ ok: true });
      }

      // -------- configuration backup

      case C2S.CONFIG_EXPORT:
        return reply(engine.exportConfig());

      case C2S.CONFIG_IMPORT: {
        // Replacing the whole configuration is not something a device on the
        // network gets to do: it stays on the machine running the server.
        if (!ws.isLocal) throw refusal('import_local_only', 'configuration can only be imported from this machine');
        const summary = engine.importConfig(payload?.bundle ?? payload);
        // Every surface is a replica, so they all need the new truth at once.
        broadcast(S2C.SNAPSHOT, buildSnapshot());
        broadcastConnections();
        return reply(summary);
      }

      case C2S.PLATFORM_CONNECT:
        await platformOf(payload.platform).connect();
        return reply({ ok: true });

      case C2S.PLATFORM_DISCONNECT:
        await platformOf(payload.platform).disconnect();
        return reply({ ok: true });

      // -------- leveling
      case C2S.GET_XP_DATA:
        return reply({ users: leveling.getUsers(), config: leveling.getConfig(), leaderboard: leveling.leaderboard() });

      case C2S.UPDATE_XP_CONFIG: {
        const next = leveling.setConfig(payload);
        broadcast(S2C.XP_DATA, { users: leveling.getUsers(), config: next, leaderboard: leveling.leaderboard() });
        return reply({ ok: true });
      }

      case C2S.RESET_XP:
        leveling.reset();
        broadcast(S2C.XP_DATA, { users: {}, config: leveling.getConfig(), leaderboard: [] });
        return reply({ ok: true });

      // -------- discord passthrough
      case C2S.DISCORD:
        return reply(await discordPassthrough(payload));

      default:
        throw new Error(`unknown message type "${type}"`);
    }
  } catch (err) {
    fail(err);
  }
}

function platformOf(name) {
  const map = { discord };
  const p = map[name];
  if (!p) throw new Error(`unknown platform "${name}"`);
  return p;
}

async function discordPassthrough({ op, ...args }) {
  switch (op) {
    case 'get_roles': return discord.getRoles(args.guildId);
    case 'get_channels': return discord.getChannels(args.guildId);
    case 'get_emojis': return discord.getEmojis(args.guildId);
    case 'search_members': return discord.searchMembers(args.guildId, args.query);
    // Everybody in the voice call's server, to set somebody up before they join a call.
    case 'server_members': return discordVoice.serverMembers();
    case 'get_member_me': return discord.getBotMember(args.guildId);
    case 'get_guilds': return discord.getGuilds();
    case 'send_message': return discord.sendMessage(args.channelId, args.content, args.embed);
    case 'edit_message': return discord.editMessage(args.channelId, args.messageId, args.content, args.embed);
    case 'get_message': return discord.getMessage(args.channelId, args.messageId);
    case 'publish_button_menu': return discordRoles.publishButtonMenu(args.id);
    case 'unpublish_button_menu': return discordRoles.unpublishButtonMenu(args.id);
    case 'add_reaction': return discord.addReaction(args.channelId, args.messageId, args.emoji);
    case 'add_role': return discord.addRole(args.guildId, args.userId, args.roleId);
    case 'remove_role': return discord.removeRole(args.guildId, args.userId, args.roleId);
    case 'exchange_code': return discord.exchangeCode(args.code, args.redirectUri);
    // SimonBot: the bot's face, and its slash commands registered again.
    case 'set_bot_face': return setBotFace(args.face);
    case 'sync_slash_commands': return slashCommands.register().then((list) => ({ ok: true, count: list?.length || 0 }));
    default: throw new Error(`unknown discord op "${op}"`);
  }
}
