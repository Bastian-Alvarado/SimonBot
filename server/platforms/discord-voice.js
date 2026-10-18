/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Discord voice: who is in the call, and who is talking right now.
 *
 * Kept as groundwork for the bot's own voice features: the Voice call screen
 * picks the call, and the bot can join it. Two layers:
 *
 *   Who is in the call  from the gateway's voice states, which the bot hears
 *                       anyway. Names, avatars, muted, deafened, live.
 *   Who is talking      only while the bot has joined the call. Discord sends
 *                       each voice a stream of packets while it talks and
 *                       stops when it goes quiet, and every packet's header
 *                       says whose it is. Watching which headers arrive is
 *                       the whole of it: the audio inside is never decrypted,
 *                       decoded or kept. The bot joins muted.
 *
 * The joining is Discord's own voice library, which also carries Discord's
 * end-to-end voice encryption (DAVE) that a bot must support to join a call
 * at all. It speaks to our gateway through an adapter: it hands us the voice
 * state it wants sent, and we hand it the two replies Discord sends back.
 *
 * Which call: a chosen channel, or wherever one person is — follow yourself,
 * and the bot goes where you go. The bot only sits in a call with
 * somebody in it: it joins when somebody is there, and leaves once everybody
 * has been gone for two minutes, long enough that a dropped connection or a
 * quick trip to another channel is not taken for the call ending.
 */

import { joinVoiceChannel, entersState, VoiceConnectionStatus } from '@discordjs/voice';
import { collection } from '../core/store.js';
import { bus, EVENTS } from '../core/bus.js';
import { createLogger } from '../core/logger.js';
import * as discord from './discord.js';

const log = createLogger('discord-voice');

let settings = null;
/** userId → where they are and how, for everyone in a voice channel of the guild. */
const present = new Map();
/** userId → { name, avatar }, from whatever last told us. */
const people = new Map();
/** Who is talking right now. */
const speaking = new Set();

let connection = null;
let adapter = null;
/** The channel the bot has joined, or is joining. */
let joinedChannel = '';
/** off | waiting | joining | listening | error. Waiting: listening is on, but nobody is in the call. */
let status = 'off';
let lastError = '';
/** What the screen looks up to say the status in its own language (see web/words.ts). */
let errorCode = '';
let publishTimer = null;
let retryTimer = null;
let emptyTimer = null;
let staleTimer = null;

/** How long a call stays empty before the bot takes it as over and leaves. */
export const EMPTY_GRACE_MS = 2 * 60 * 1000;
/** How long the gateway may be gone before who was in the call is forgotten. */
const STALE_MS = 60 * 1000;

const DEFAULT_SETTINGS = { channelId: '', listen: false, pinned: [], follow: null };

const guildId = () => discord.getSettings().guildId || '';

/**
 * A Discord avatar: the one set for this server if there is one, the
 * account's otherwise, and Discord's own default for an account without.
 */
function avatarOf(userId, user, member, guild) {
  if (member?.avatar && guild) return `https://cdn.discordapp.com/guilds/${guild}/users/${userId}/avatars/${member.avatar}.png?size=128`;
  if (user?.avatar) return `https://cdn.discordapp.com/avatars/${userId}/${user.avatar}.png?size=128`;
  let index = 0;
  try { index = Number((BigInt(userId) >> 22n) % 6n); } catch { /* not a snowflake */ }
  return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
}

function remember(userId, member, guild) {
  const user = member?.user;
  if (!user) return;
  people.set(userId, {
    // On stream if nothing else names them, so in the stream's language.
    name: member.nick || user.global_name || user.username || 'Alguien',
    avatar: avatarOf(userId, user, member, guild),
    bot: Boolean(user.bot),
  });
}

/*
  Everybody in the server, not only whoever is in a call: so somebody can be
  followed or pinned before they ever join one. Bots left out, by name, each with the name and picture
  they have here. Kept a minute, so opening the list again does not ask
  Discord again.
*/
const SERVER_MEMBERS_TTL_MS = 60 * 1000;
let serverMembersCache = null;

/** Discord's member records as the Voice call screen lists them: people only, by name. */
export function serverMemberList(members, guild) {
  return (Array.isArray(members) ? members : [])
    .filter((m) => m?.user?.id && !m.user.bot)
    .map((m) => ({
      id: m.user.id,
      name: m.nick || m.user.global_name || m.user.username || m.user.id,
      username: m.user.username || '',
      avatar: avatarOf(m.user.id, m.user, m, guild),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
}

export async function serverMembers() {
  const guild = guildId();
  if (!guild) throw new Error('No Discord server is chosen yet');
  if (serverMembersCache?.guild === guild && Date.now() - serverMembersCache.at < SERVER_MEMBERS_TTL_MS) return serverMembersCache.list;
  const raw = await discord.listMembers(guild);
  // What names a voice state later, while we have it.
  for (const m of raw) if (m?.user?.id) remember(m.user.id, m, guild);
  const list = serverMemberList(raw, guild);
  serverMembersCache = { guild, at: Date.now(), list };
  return list;
}

/** Somebody in a voice state we have no name for yet: ask once. */
const asked = new Set();
function lookUp(userId) {
  const guild = guildId();
  if (people.has(userId) || asked.has(userId) || !guild) return;
  asked.add(userId);
  discord.request('GET', `/guilds/${guild}/members/${userId}`)
    .then((member) => { remember(userId, member, guild); publish(); })
    .catch((err) => log.debug(`could not look up ${userId}: ${err.message}`));
}

/*
  People who always come first — co-hosts, the regulars — in the order they
  are listed, ahead of everybody else, who follow in the order they joined.
  Kept with a name so the list reads while they are not in the call.
*/
const MAX_PINNED = 25;

export function cleanPinned(incoming) {
  const seen = new Set();
  const out = [];
  for (const raw of Array.isArray(incoming) ? incoming : []) {
    const id = String(raw?.id ?? '');
    if (!/^\d{5,25}$/.test(id) || seen.has(id)) continue;
    seen.add(id);
    out.push({ id, name: String(raw?.name ?? '').trim().slice(0, 40) });
    if (out.length >= MAX_PINNED) break;
  }
  return out;
}

/** The one person whose call is followed, instead of a fixed channel. */
export function cleanFollow(incoming) {
  const id = String(incoming?.id ?? '');
  return /^\d{5,25}$/.test(id) ? { id, name: String(incoming?.name ?? '').trim().slice(0, 40) } : null;
}

const botIdNow = () => discord.getStatus().botUserId;
const isHuman = (v) => v.userId !== botIdNow() && !people.get(v.userId)?.bot;

/** The call being shown: wherever the followed person is, or the chosen channel. */
function channelNow() {
  const s = settings?.get() ?? DEFAULT_SETTINGS;
  if (s.follow?.id) return present.get(s.follow.id)?.channelId || '';
  return s.channelId || '';
}

const humansIn = (channelId) => [...present.values()].filter((v) => v.channelId === channelId && isHuman(v)).length;

/**
 * The call as the Voice call screen sees it: which channel, and who is in it.
 */
export function getState() {
  const s = settings?.get() ?? DEFAULT_SETTINGS;
  const pinned = s.pinned || [];
  const channelId = channelNow();
  const pinRank = new Map(pinned.map((p, i) => [p.id, i]));
  const rank = (id) => (pinRank.has(id) ? pinRank.get(id) : Infinity);
  const everyone = [...present.values()]
    .filter((v) => channelId && v.channelId === channelId && isHuman(v))
    // Pinned first, in their order; then everybody else by when they joined.
    .sort((a, b) => (rank(a.userId) - rank(b.userId)) || (a.since - b.since))
    .map((v) => {
      const who = people.get(v.userId) || {};
      return {
        id: v.userId,
        name: who.name || 'Alguien',
        avatar: who.avatar || avatarOf(v.userId),
        speaking: speaking.has(v.userId),
        muted: Boolean(v.selfMute || v.mute),
        deafened: Boolean(v.selfDeaf || v.deaf),
        streaming: Boolean(v.streaming),
        video: Boolean(v.video),
        ...(pinRank.has(v.userId) ? { pinned: true } : {}),
      };
    });
  // Who is in any call on the server, to choose somebody to follow.
  const inVoice = [...present.values()].filter(isHuman).map((v) => ({
    id: v.userId, name: people.get(v.userId)?.name || v.userId, channelId: v.channelId,
  }));
  return {
    channelId,
    chosenChannelId: s.channelId || '',
    follow: s.follow || null,
    listen: s.listen,
    status,
    error: lastError,
    errorCode,
    members: everyone,
    pinned,
    inVoice,
  };
}

/*
  Talking starts and stops many times a second in a lively call, so changes
  are told at most every 60ms, far fewer frames than one per packet. The
  first change after a quiet spell goes at once, though: holding it back
  would put the whole 60ms between the first word and the ring lighting,
  which is exactly the moment the delay shows.
*/
const PUBLISH_GAP_MS = 60;
let lastPublished = 0;
function publish() {
  if (publishTimer) return;
  const send = () => {
    publishTimer = null;
    lastPublished = Date.now();
    bus.emit(EVENTS.CONFIG, { key: 'voice', value: getState() });
  };
  const wait = lastPublished + PUBLISH_GAP_MS - Date.now();
  if (wait <= 0) send();
  else publishTimer = setTimeout(send, wait);
}

function setStatus(next, error = '', code = '') {
  status = next;
  lastError = error;
  errorCode = code;
  publish();
}

// ----------------------------------------------------------- who is in a call

// ----------------------------------------------------------- who is in a call

function applyVoiceState(d) {
  if (!d?.user_id || (d.guild_id && d.guild_id !== guildId())) return;
  if (d.member) remember(d.user_id, d.member, d.guild_id);
  if (!d.channel_id) {
    present.delete(d.user_id);
    speaking.delete(d.user_id);
  } else {
    const before = present.get(d.user_id);
    present.set(d.user_id, {
      userId: d.user_id,
      channelId: d.channel_id,
      mute: d.mute, deaf: d.deaf, selfMute: d.self_mute, selfDeaf: d.self_deaf,
      streaming: d.self_stream, video: d.self_video,
      // Moving channel counts as arriving, so the order is who came in first.
      since: before && before.channelId === d.channel_id ? before.since : Date.now(),
    });
    if (!people.has(d.user_id)) lookUp(d.user_id);
  }
  publish();
  checkCall();
}

function onGuildCreate(d) {
  if (d?.id !== guildId()) return;
  for (const m of d.members || []) if (m.user) remember(m.user.id, m, d.id);
  present.clear();
  for (const v of d.voice_states || []) applyVoiceState({ ...v, guild_id: d.id });
  log.info(`${present.size} in voice on the server`);
  checkCall();
}

function onVoiceState(d) {
  applyVoiceState(d);
  // The bot's own voice state is also the library's reply to joining.
  if (d?.user_id === discord.getStatus().botUserId && d.guild_id === guildId()) adapter?.onVoiceStateUpdate(d);
}

function onVoiceServer(d) {
  if (d?.guild_id === guildId()) adapter?.onVoiceServerUpdate(d);
}

// ----------------------------------------------------------- who is talking

/** Out of the call, without saying anything about why. */
function hangUp() {
  if (connection) {
    try { connection.destroy(); } catch { /* already gone */ }
    connection = null;
  }
  joinedChannel = '';
  speaking.clear();
}

function stopEmptyClock() {
  clearTimeout(emptyTimer);
  emptyTimer = null;
}

function leave() {
  clearTimeout(retryTimer);
  retryTimer = null;
  stopEmptyClock();
  hangUp();
  setStatus('off');
}

/** Listening is on, but there is nobody to listen to: out of the call until somebody comes. */
function wait() {
  stopEmptyClock();
  hangUp();
  const following = Boolean(settings.get().follow?.id);
  setStatus('waiting', following ? 'the person being followed is not in a call' : 'nobody is in the call', following ? 'voice_waiting_follow' : 'voice_waiting_empty');
}

/**
 * The call went quiet — everybody left, or the person being followed did.
 * Two minutes, in case it was a dropped connection or a quick trip to another
 * channel, then out.
 */
function startEmptyClock() {
  if (emptyTimer) return;
  emptyTimer = setTimeout(() => {
    emptyTimer = null;
    const want = channelNow();
    if (!want || humansIn(want) === 0) {
      log.info('everybody has left the call — leaving it too');
      wait();
    }
  }, EMPTY_GRACE_MS);
}

/**
 * Whether the bot should be in a call, and which, after anything changed:
 * somebody joining or leaving, the followed person moving, a setting.
 */
function checkCall() {
  if (!settings) return;
  const s = settings.get();
  if (!s.listen) {
    if (connection || status !== 'off') leave();
    return;
  }
  const want = channelNow();
  if (!want) {
    // Nobody to follow into a call, or no channel. A call the bot is in gets its two minutes.
    if (connection) startEmptyClock();
    else if (status !== 'waiting') wait();
    return;
  }
  const here = humansIn(want);
  if (want !== joinedChannel) {
    // A join that failed tries again on its own clock, not on every change in the call.
    if (retryTimer) return;
    if (here > 0) {
      stopEmptyClock();
      join(want);
    } else if (status !== 'waiting' || connection) {
      wait();
    }
    return;
  }
  if (here > 0) stopEmptyClock();
  else startEmptyClock();
}

/**
 * Join a channel to hear who is talking. Muted, and never deaf: a deafened
 * account is sent no voice at all, so it could not tell.
 */
async function join(channelId) {
  const guild = guildId();
  if (!channelId || !guild) return;
  if (discord.getStatus().status !== 'connected') {
    hangUp();
    setStatus('joining', 'waiting for the Discord bot to connect', 'voice_waiting_bot');
    return;
  }

  hangUp();
  joinedChannel = channelId;
  setStatus('joining');

  const conn = joinVoiceChannel({
    channelId,
    guildId: guild,
    selfMute: true,
    selfDeaf: false,
    adapterCreator: (methods) => {
      adapter = methods;
      return {
        sendPayload: (payload) => discord.gatewaySend(payload.op, payload.d),
        destroy: () => { if (adapter === methods) adapter = null; },
      };
    },
  });
  connection = conn;

  conn.receiver.speaking.on('start', (userId) => {
    speaking.add(userId);
    publish();
  });
  conn.receiver.speaking.on('end', (userId) => { speaking.delete(userId); publish(); });

  conn.on('stateChange', (before, after) => {
    if (conn !== connection) return;
    log.debug(`voice ${before.status} → ${after.status}`);
    if (after.status === VoiceConnectionStatus.Ready) {
      setStatus('listening');
      log.info('listening for who is talking');
    }
    if (after.status === VoiceConnectionStatus.Disconnected) {
      /*
        Moved to another channel or a network blip: the library reconnects on
        its own if it can. If it has not within a few seconds, start again.
      */
      Promise.race([
        entersState(conn, VoiceConnectionStatus.Signalling, 5000),
        entersState(conn, VoiceConnectionStatus.Connecting, 5000),
      ]).catch(() => {
        if (conn !== connection) return;
        log.warn('lost the voice call — joining again');
        retrySoon('lost the call', 'voice_lost');
      });
    }
  });
  conn.on('error', (err) => {
    if (conn !== connection) return;
    log.warn(`voice error: ${err.message}`);
    setStatus('error', err.message, 'voice_error');
  });

  try {
    await entersState(conn, VoiceConnectionStatus.Ready, 20000);
  } catch (err) {
    if (conn !== connection) return;
    log.warn(`could not join the voice channel: ${err.message}`);
    retrySoon('could not join the channel — check the bot may see and connect to it', 'voice_cannot_join');
  }
}

function retrySoon(why, code) {
  hangUp();
  setStatus('error', why, code);
  clearTimeout(retryTimer);
  retryTimer = setTimeout(() => { retryTimer = null; checkCall(); }, 15000);
}

// ----------------------------------------------------------------- settings

export function setVoice(patch) {
  const before = { ...DEFAULT_SETTINGS, ...settings.get() };
  const next = {
    channelId: typeof patch?.channelId === 'string' ? patch.channelId.slice(0, 32) : before.channelId,
    listen: typeof patch?.listen === 'boolean' ? patch.listen : before.listen,
    pinned: patch?.pinned !== undefined ? cleanPinned(patch.pinned) : cleanPinned(before.pinned),
    follow: patch?.follow !== undefined ? cleanFollow(patch.follow) : cleanFollow(before.follow),
  };
  settings.set(next);
  // Somebody changing a setting is not waiting on a retry.
  clearTimeout(retryTimer);
  retryTimer = null;
  checkCall();
  publish();
  return getState();
}

export function initDiscordVoice() {
  settings = collection('discord_voice', DEFAULT_SETTINGS);
  bus.on('discord:guild_create', onGuildCreate);
  bus.on('discord:voice_state', onVoiceState);
  bus.on('discord:voice_server', onVoiceServer);
  // A fresh gateway session drops the old call with it: join again once it is up.
  bus.on('discord:ready', () => {
    clearTimeout(staleTimer);
    hangUp();
    setTimeout(checkCall, 1000);
  });
  bus.on('discord:resumed', () => clearTimeout(staleTimer));
  /*
    The gateway dropped. Nobody can be known to be talking, so nobody stays
    lit. Who is in the call is kept, since a resumed session only replays what
    changed; if the bot is still gone after a minute, it is forgotten rather
    than kept as a picture of how things were.
  */
  bus.on('discord:closed', () => {
    speaking.clear();
    publish();
    clearTimeout(staleTimer);
    staleTimer = setTimeout(() => { present.clear(); publish(); }, STALE_MS);
  });
}

export function stopDiscordVoice() {
  clearTimeout(publishTimer);
  clearTimeout(emptyTimer);
  clearTimeout(staleTimer);
  clearTimeout(retryTimer);
  if (connection) {
    try { connection.destroy(); } catch { /* already gone */ }
    connection = null;
  }
}
