/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Points: a score viewers earn, apart from XP. XP is what a level is made
 * of; points are earned the same way — and for coming to streams, for
 * streaks, for following, subscribing and giving — and a moderator can give
 * or take them ("!darpuntos @name 100").
 *
 * One balance per person, whichever platforms they are on (a person is every
 * account linked together), asked for from any chat with "!puntos".
 *
 * Earned in memory and saved once a minute, as viewer history is; a change
 * by hand is saved at once.
 */

import { collection } from '../core/store.js';
import { bus, EVENTS } from '../core/bus.js';
import { createLogger } from '../core/logger.js';
import { refusal } from '../core/refusal.js';
import * as leveling from '../leveling/index.js';
import * as discord from '../platforms/discord.js';
import * as twitch from '../platforms/twitch.js';
import * as youtube from '../platforms/youtube.js';
import * as sessions from './stream-sessions.js';
import * as history from './viewer-history.js';
import { readMoney } from '../../shared/viewer-events.js';

const log = createLogger('points');

export const DEFAULT_POINTS = {
  enabled: true,
  /** What they are called, in the stream's language, and their emoji. */
  name: 'puntos',
  emoji: '🪙',
  earn: {
    /** For talking, at most once every `messageEverySec`. */
    message: 5,
    messageEverySec: 60,
    /** For the first word in a stream, and a little more for each stream in a row after the first. */
    stream: 50,
    streakStep: 10,
    streakMax: 100,
    follow: 50,
    sub: 300,
    /** A YouTube membership. */
    member: 300,
    perHundredBits: 50,
    /** TikTok gifts, by the diamonds they are worth. */
    perDiamond: 1,
    superChat: 200,
  },
  /** The words chat uses, and whether YouTube is answered (each answer spends YouTube's daily allowance). */
  words: { balance: '!puntos', give: '!darpuntos' },
  youtube: true,
};

const LOG_LIMIT = 300;
const SAVE_EVERY_MS = 60_000;
const ANSWER_EVERY_MS = 2_000;
const PERSON_EVERY_MS = 10_000;

let store = null;
let saveTimer = null;
/** person → when they last earned for talking; person → the stream they last earned for coming to. */
const lastTalk = new Map();
/** Answers a chat was given, so a flood of "!puntos" is not a flood back. */
const answered = new Map();
const asked = new Map();

const num = (v, min, max, fallback) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};
const word = (v, fallback) => {
  const w = String(v ?? '').trim().split(/\s+/)[0] || '';
  return /^[!?.]?[\p{L}\p{N}_-]{1,24}$/u.test(w) ? w : fallback;
};

/** The settings as kept: numbers in range, words that are words. */
export function cleanPoints(incoming, before = DEFAULT_POINTS) {
  const c = { ...before, ...(incoming && typeof incoming === 'object' ? incoming : {}) };
  const e = { ...DEFAULT_POINTS.earn, ...before.earn, ...(c.earn || {}) };
  const w = { ...DEFAULT_POINTS.words, ...before.words, ...(c.words || {}) };
  return {
    enabled: c.enabled !== false,
    name: String(c.name ?? '').trim().slice(0, 24) || DEFAULT_POINTS.name,
    emoji: String(c.emoji ?? '').trim().slice(0, 80),
    earn: {
      message: num(e.message, 0, 10_000, DEFAULT_POINTS.earn.message),
      messageEverySec: num(e.messageEverySec, 5, 3600, DEFAULT_POINTS.earn.messageEverySec),
      stream: num(e.stream, 0, 100_000, DEFAULT_POINTS.earn.stream),
      streakStep: num(e.streakStep, 0, 10_000, DEFAULT_POINTS.earn.streakStep),
      streakMax: num(e.streakMax, 0, 100_000, DEFAULT_POINTS.earn.streakMax),
      follow: num(e.follow, 0, 100_000, DEFAULT_POINTS.earn.follow),
      sub: num(e.sub, 0, 1_000_000, DEFAULT_POINTS.earn.sub),
      member: num(e.member, 0, 1_000_000, DEFAULT_POINTS.earn.member),
      perHundredBits: num(e.perHundredBits, 0, 100_000, DEFAULT_POINTS.earn.perHundredBits),
      perDiamond: num(e.perDiamond, 0, 10_000, DEFAULT_POINTS.earn.perDiamond),
      superChat: num(e.superChat, 0, 1_000_000, DEFAULT_POINTS.earn.superChat),
    },
    words: {
      balance: word(w.balance, DEFAULT_POINTS.words.balance),
      give: word(w.give, DEFAULT_POINTS.words.give),
    },
    youtube: c.youtube !== false,
  };
}

export const getPoints = () => cleanPoints(store?.get().settings || {}, DEFAULT_POINTS);
const balances = () => store.get().balances;
export const balanceOf = (uid) => balances()[uid] || 0;

function publish() {
  bus.emit(EVENTS.CONFIG, { key: 'pointsSettings', value: getPoints() });
}

/** The richest, for the Points screen. The channel's own accounts are not among them. */
export function richest(limit = 50) {
  const users = leveling.getUsers();
  return Object.entries(balances())
    .filter(([uid, n]) => n > 0 && users[uid] && !users[uid].own)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([uid, points]) => ({ uid, points, name: users[uid]?.username || uid, avatar: users[uid]?.avatar || '' }));
}

/** Add (or, below zero, take) points; never below nothing. Kept in memory unless `now` says to save at once. */
export function add(uid, delta, why, { now = false, name = '' } = {}) {
  if (!uid || !Number.isFinite(delta) || !delta) return balanceOf(uid);
  const write = now ? 'update' : 'updateQuietly';
  let after = 0;
  store[write]((v) => {
    after = Math.max(0, (v.balances[uid] || 0) + Math.round(delta));
    v.balances[uid] = after;
    if (now || Math.abs(delta) >= 50) {
      v.log = [{ at: Date.now(), uid, name: name || leveling.getUsers()[uid]?.username || '', delta: Math.round(delta), why: String(why || '').slice(0, 60), after }, ...(v.log || [])].slice(0, LOG_LIMIT);
    }
    return v;
  });
  return after;
}

// ------------------------------------------------------------ earning

const STREAM_CHATS = new Set(['twitch', 'youtube', 'tiktok', 'kick', 'discord']);

function onChat(chat, { stream = true } = {}, now = Date.now()) {
  const cfg = getPoints();
  if (!cfg.enabled || !chat?.userId || chat.isBot || !chat.platform) return;
  const uid = leveling.personFor(chat.platform, chat.userId, chat.user, chat.avatar);
  if (leveling.getUsers()[uid]?.own || chat.isBroadcaster) return;
  if (cfg.earn.message && now - (lastTalk.get(uid) || 0) >= cfg.earn.messageEverySec * 1000) {
    lastTalk.set(uid, now);
    add(uid, cfg.earn.message, 'chat');
  }
  // The first word in a stream: points for coming, and more for coming back stream after stream.
  const live = stream && STREAM_CHATS.has(chat.platform) ? sessions.current() : null;
  if (live) {
    const came = store.get().came || {};
    if (came[uid] !== live.id) {
      store.updateQuietly((v) => ({ ...v, came: { ...(v.came || {}), [uid]: live.id } }));
      const streak = history.historyOf(uid)?.streak || 1;
      const bonus = Math.min(cfg.earn.streakMax, cfg.earn.streakStep * Math.max(0, streak - 1));
      if (cfg.earn.stream + bonus) add(uid, cfg.earn.stream + bonus, streak > 1 ? `stream (${streak} in a row)` : 'stream', { name: chat.user });
    }
  }
  answerChat(chat, uid);
}

/** What a viewer did on stream, in points. */
export function pointsFor(e, cfg = getPoints()) {
  const d = e?.data || {};
  const n = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
  switch (e?.type) {
    case 'twitch_follow': case 'tiktok_follow': return cfg.earn.follow;
    case 'twitch_sub': return d.giftedBy ? 0 : cfg.earn.sub;
    case 'tiktok_sub': return cfg.earn.sub;
    case 'twitch_sub_gift_bulk': case 'youtube_sub_gift_bulk': return cfg.earn.sub * (n(d.count) || 1);
    case 'youtube_sub': return cfg.earn.member;
    case 'twitch_cheer': return Math.floor(n(d.bits ?? d.amount) / 100 * cfg.earn.perHundredBits);
    case 'tiktok_gift': return Math.floor((n(d.diamonds) || n(d.amount)) * (n(d.count) || 1) * cfg.earn.perDiamond);
    case 'youtube_cheer': return readMoney(d.amount) ? cfg.earn.superChat : 0;
    default: return 0;
  }
}

function onEvent(e) {
  const cfg = getPoints();
  if (!cfg.enabled || !e?.data?.userId || e.data.fromBulk) return;
  const pts = pointsFor(e, cfg);
  if (!pts) return;
  const uid = leveling.personFor(e.platform, e.data.userId, e.user, e.avatar);
  add(uid, pts, e.type, { name: e.user });
}

// ------------------------------------------------------------ chat

const say = {
  twitch: (text) => twitch.say(text, { useBot: true }),
  youtube: (text) => youtube.say(text, { cut: true }),
  discord: (text, chat) => discord.sendMessage(chat.raw?.channelId, text, null, null, null, {
    allowed_mentions: { parse: [] },
    ...(chat.raw?.messageId ? { message_reference: { message_id: chat.raw.messageId, fail_if_not_exists: false } } : {}),
  }),
};
const fmt = (n) => Number(n || 0).toLocaleString('es-MX');
const nameFor = (platform, name) => (platform === 'discord' ? discord.sanitise(name) : String(name ?? ''));

function reply(chat, text) {
  const cfg = getPoints();
  const send = say[chat.platform];
  if (!send || (chat.platform === 'youtube' && !cfg.youtube)) return;
  const now = Date.now();
  if (now - (answered.get(chat.platform) || 0) < ANSWER_EVERY_MS) return;
  answered.set(chat.platform, now);
  Promise.resolve(send(text, chat)).catch((err) => log.debug(`could not answer on ${chat.platform}: ${err.message}`));
}

/** "!puntos", and a moderator's "!darpuntos @name 100". */
function answerChat(chat, uid) {
  const cfg = getPoints();
  const said = String(chat.msg ?? '').trim();
  const [first, ...rest] = said.split(/\s+/);
  const w = (first || '').toLowerCase();
  const which = Object.entries(cfg.words).find(([, x]) => x.toLowerCase() === w)?.[0];
  if (!which) return;
  const now = Date.now();
  const key = `${uid}:${which}`;
  if (now - (asked.get(key) || 0) < PERSON_EVERY_MS) return;
  asked.set(key, now);
  if (asked.size > 1000) asked.clear();
  const me = nameFor(chat.platform, chat.user);
  const unit = `${cfg.emoji ? `${cfg.emoji} ` : ''}${cfg.name}`;

  if (which === 'balance') {
    const named = rest.join(' ');
    const other = named ? leveling.findByName(named) : null;
    if (named && !other) return reply(chat, `${nameFor(chat.platform, named.replace(/^@/, ''))} todavía no tiene ${cfg.name}.`);
    const who = other ? nameFor(chat.platform, other.username) : me;
    return reply(chat, `${who}: ${fmt(balanceOf(other?.id || uid))} ${unit}`);
  }
  // Give: a moderator's, to somebody by name.
  if (!chat.isMod && !chat.isBroadcaster) return undefined;
  const amount = Number(rest.at(-1));
  const target = leveling.findByName(rest.slice(0, -1).join(' '));
  if (!target || !Number.isInteger(amount) || !amount) return reply(chat, `${cfg.words.give} @nombre 100 (o -100 para quitar)`);
  const after = add(target.id, amount, `${amount > 0 ? '+' : ''}${amount} by ${chat.user}`, { now: true, name: target.username });
  return reply(chat, `${nameFor(chat.platform, target.username)}: ${fmt(after)} ${unit}`);
}

// ------------------------------------------------------------ the screen

export function setPoints(patch) {
  const next = cleanPoints({ ...getPoints(), ...(patch || {}) }, getPoints());
  store.update((v) => ({ ...v, settings: next }));
  publish();
  return next;
}

/** From the Points screen: { op, … }. */
export async function control(payload = {}) {
  switch (payload.op) {
    case 'settings': return setPoints(payload.settings);
    case 'give': {
      const uid = String(payload.uid || '');
      if (!leveling.getUsers()[uid]) throw refusal('points_nobody', 'that person is not known');
      return { balance: add(uid, Number(payload.amount) || 0, `${Number(payload.amount) > 0 ? '+' : ''}${Number(payload.amount)} by hand`, { now: true }) };
    }
    case 'board': return { richest: richest(Number(payload.limit) || 50), log: (store.get().log || []).slice(0, 100) };
    default: throw new Error(`unknown points operation "${payload.op}"`);
  }
}

export const snapshot = () => ({ pointsSettings: getPoints() });

export function initPoints() {
  store = collection('points', { settings: {}, balances: {}, log: [], came: {} });
  bus.on(EVENTS.CHAT, (c) => onChat(c));
  bus.on('discord:message_elsewhere', (c) => onChat(c, { stream: false }));
  bus.on(EVENTS.EVENT, onEvent);
  bus.on('people:merged', ({ into, from }) => {
    const moved = balances()[from] || 0;
    store.update((v) => {
      v.balances[into] = (v.balances[into] || 0) + moved;
      delete v.balances[from];
      return v;
    });
  });
  bus.on('people:forgotten', ({ uids }) => store.updateQuietly((v) => { for (const uid of uids || []) delete v.balances[uid]; return v; }));
  // Somebody with points is never forgotten.
  history.keepWhen((uid) => balanceOf(uid) > 0);
  clearInterval(saveTimer);
  saveTimer = setInterval(() => store.flush(), SAVE_EVERY_MS);
  saveTimer.unref?.();
}

export const _test = { onChat, onEvent, flush: () => store.flush() };
