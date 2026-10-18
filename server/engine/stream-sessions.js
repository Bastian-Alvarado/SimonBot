/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Every stream, kept: when it started and ended, what it was called and
 * played, how fast chat went minute by minute on each platform, who took
 * part, its highlights and the VOD it became. What highlights, attendance,
 * loyalty roles and "answered at 1:23:45" links are made from.
 *
 * A stream is the Twitch channel live (core/twitch-live.js): one that drops
 * and is back within a few minutes is the same stream. The one on now is kept in
 * memory and saved once a minute (and on shutdown), not on every message;
 * a finished one is written once, to the list of streams.
 *
 * Small on purpose: counts per minute rather than messages, and per person
 * a count rather than what they said. A four-hour stream with fifty people
 * talking is a few kilobytes.
 */

import { collection } from '../core/store.js';
import { bus, EVENTS } from '../core/bus.js';
import { createLogger } from '../core/logger.js';
import * as leveling from '../leveling/index.js';
import * as twitch from '../platforms/twitch.js';
import { onTwitchLive, twitchLive } from '../core/twitch-live.js';

const log = createLogger('streams');

/** A stream back within this long is the same stream. */
export const SAME_STREAM_MS = 5 * 60_000;
const SAVE_EVERY_MS = 60_000;
/** How often a stream on is checked against Twitch, for an end that was missed. */
const CHECK_EVERY_MS = 3 * 60_000;
/** With Twitch not answering, a stream nothing has happened in for this long is taken as over. */
export const QUIET_OVER_MS = 6 * 60 * 60_000;
/** The platforms a minute is counted on, in the order the counts are kept: [all, …these]. */
export const MINUTE_PLATFORMS = ['twitch', 'youtube', 'tiktok', 'discord'];
const STREAM_CHATS = new Set(MINUTE_PLATFORMS);

let live = null;
let past = null;
let saveTimer = null;
let endTimer = null;
let checkTimer = null;
let checking = false;
/** When Twitch first said the stream on now was offline (two checks in a row end it), or 0. */
let offlineSince = 0;

const session = () => live?.get().session || null;
export const isRunning = (s = session()) => Boolean(s?.startedAt && !s.endedAt);

/** The stream on now, or null. */
export const current = () => (isRunning() ? session() : null);

/** The stream on now as the dashboard shows it: since when, called what, playing what. */
export const streamNow = () => {
  const s = current();
  return s ? { n: s.n, startedAt: s.startedAt, title: s.title || '', game: s.game || '' } : null;
};
/** Tell every page the stream started, ended or was renamed. */
const tellStreamNow = () => bus.emit(EVENTS.CONFIG, { key: 'streamNow', value: streamNow() });
/** Every finished stream, oldest first. */
export const finished = () => past?.get().list || [];
/** The number the next stream will have, or the one on now has. */
const nextNumber = () => (finished().at(-1)?.n || 0) + 1;

const fresh = (startedAt, n) => ({
  id: `s${startedAt}`,
  n,
  startedAt,
  endedAt: 0,
  title: '',
  game: '',
  channel: [],
  minutes: [],
  attendees: {},
  moments: [],
});

function changed(fn) {
  live.updateQuietly((v) => ({ ...v, session: fn(v.session) }));
}

// ------------------------------------------------------------ starting and ending

function start(now) {
  clearTimeout(endTimer);
  endTimer = null;
  const s = session();
  // Already on (told twice): the same stream, not a new one over it.
  if (isRunning(s)) return;
  // Back within a few minutes: the same stream, carrying on.
  if (s?.startedAt && s.endedAt && now - s.endedAt < SAME_STREAM_MS) {
    live.set({ session: { ...s, endedAt: 0 } });
    log.info(`stream ${s.n} carries on`);
    bus.emit('stream:on', session());
    tellStreamNow();
    return;
  }
  if (s?.startedAt && s.endedAt) finish(s);
  const next = fresh(now, nextNumber());
  live.set({ session: next });
  log.info(`stream ${next.n} started`);
  bus.emit('stream:started', next);
  bus.emit('stream:on', next);
  tellStreamNow();
  // What it is called and played, once Twitch says (EVENTS.CHANNEL may not come before).
  twitch.getLiveInfo?.().then((info) => {
    if (!info || !isRunning() || session().id !== next.id) return;
    changed((v) => ({ ...v, title: v.title || info.title || '', game: v.game || info.game || '' }));
    tellStreamNow();
  }).catch(() => {});
}

function stop(now) {
  const s = session();
  if (!isRunning(s)) return;
  offlineSince = 0;
  live.set({ session: { ...s, endedAt: now } });
  live.flush();
  bus.emit('stream:off', session());
  tellStreamNow();
  clearTimeout(endTimer);
  // Finished for good only once it is clear it is not coming back (an end found late may be clear already).
  endTimer = setTimeout(() => finish(session()), Math.max(0, SAME_STREAM_MS - (Date.now() - now)));
  endTimer.unref?.();
}

// ------------------------------------------------------------ an end that was missed

/** The last sign of life in a stream: the end of its last minute with chat, its last moment, or its start. */
export function lastSign(s) {
  let at = s.startedAt;
  const minutes = s.minutes || [];
  for (let i = minutes.length - 1; i >= 0; i -= 1) {
    if (minutes[i]?.[0]) { at = s.startedAt + (i + 1) * 60_000; break; }
  }
  for (const x of s.moments || []) if (x.at > at) at = x.at;
  return at;
}

/** When a check last found the stream on now still on: { id, at }. */
let confirmed = { id: '', at: 0 };

/**
 * When a stream found over really ended: then, if it was known to be on a
 * check or two before; otherwise (Twitch was away a long while, or the app
 * was off) the last time it was known to be on, so it is not kept as days long.
 */
function endedBy(s, then) {
  const known = Math.max(lastSign(s), confirmed.id === s.id ? confirmed.at : 0);
  return then - known > 2 * CHECK_EVERY_MS ? known : then;
}

const realAskers = {
  twitch: () => twitch.getLiveInfo(),
};
let askers = realAskers;

/**
 * A stream ends when Twitch says the channel went offline, but Twitch's
 * connection can drop or the app restart mid-stream, and then the end never
 * comes and the stream stays "live" for days. So a stream on is checked
 * every few minutes: two offline answers in a row end it from the first;
 * when Twitch cannot say, hours with nothing happening end it from its last
 * sign of life.
 */
async function checkStillLive(now = Date.now(), ask = askers) {
  const s = session();
  if (!isRunning(s) || checking) return;
  checking = true;
  try {
    const still = () => isRunning() && session().id === s.id;
    const info = await ask.twitch().catch(() => null);
    if (!still()) return;
    if (info?.live) {
      offlineSince = 0;
      confirmed = { id: s.id, at: now };
      return;
    }
    if (info?.live === false) {
      if (!offlineSince) { offlineSince = now; return; }
      log.info(`stream ${s.n} is over: Twitch says the channel is offline`);
      stop(endedBy(s, offlineSince));
      return;
    }
    // Quiet, but Twitch said it was on a check ago: not over for one check nobody could answer.
    const last = Math.max(lastSign(s), confirmed.id === s.id ? confirmed.at : 0);
    if (now - last >= QUIET_OVER_MS) {
      log.info(`stream ${s.n} is over: nothing has happened in it for ${Math.round((now - last) / 3_600_000)} h`);
      stop(last);
    }
  } finally {
    checking = false;
  }
}

/**
 * Twitch's word on the channel (core/twitch-live.js): live starts the stream,
 * or carries one that dropped for a moment on; offline ends it. Twitch not
 * connected says neither, so a stream on is left to the check above.
 */
function onLive(state, now = Date.now()) {
  if (state?.live) start(state.since || now);
  else if (state?.known) stop(now);
}

/** A stream over for good: its VOD added, written to the list, and said. */
async function finish(s) {
  if (!s?.startedAt || !s.endedAt) return;
  clearTimeout(endTimer);
  endTimer = null;
  if (finished().some((x) => x.id === s.id)) return;
  const record = { ...s };
  try {
    const vod = await twitch.latestVod?.();
    // Only the VOD of this stream: made after it started.
    if (vod?.createdAt && Date.parse(vod.createdAt) >= s.startedAt - 10 * 60_000) record.vod = vod;
  } catch (err) {
    log.debug(`no VOD for stream ${s.n}: ${err.message}`);
  }
  past.update((v) => ({ list: [...(v.list || []), record] }));
  if (session()?.id === s.id) live.set({ session: null });
  log.info(`stream ${s.n} kept: ${Math.round((s.endedAt - s.startedAt) / 60_000)} min, ${Object.keys(s.attendees).length} people`);
  bus.emit('stream:ended', record);
}

// ------------------------------------------------------------ while it runs

/** Which minute of the stream a moment falls in. */
export const minuteOf = (s, at) => Math.max(0, Math.floor((at - s.startedAt) / 60_000));

function onChat(chat, now = Date.now()) {
  const s = session();
  if (!isRunning(s) || !STREAM_CHATS.has(chat?.platform) || chat.isBot) return;
  const m = minuteOf(s, now);
  const at = MINUTE_PLATFORMS.indexOf(chat.platform) + 1;
  changed((v) => {
    const minutes = v.minutes.slice();
    const row = (minutes[m] || new Array(MINUTE_PLATFORMS.length + 1).fill(0)).slice();
    row[0] += 1;
    row[at] += 1;
    minutes[m] = row;
    if (chat.isBroadcaster || !chat.userId) return { ...v, minutes };
    const uid = leveling.personFor(chat.platform, chat.userId, chat.user, chat.avatar);
    const was = v.attendees[uid] || { m: 0, p: [] };
    const p = was.p.includes(chat.platform) ? was.p : [...was.p, chat.platform];
    return { ...v, minutes, attendees: { ...v.attendees, [uid]: { m: was.m + 1, p } } };
  });
}

function onChannel(c, now = Date.now()) {
  if (!isRunning() || !c || c.initial) return;
  changed((v) => ({
    ...v,
    title: c.title || v.title,
    game: c.categoryName || v.game,
    channel: [...v.channel, { at: now, title: c.title || '', game: c.categoryName || '' }].slice(-100),
  }));
  tellStreamNow();
}

/** A highlight, at this moment of the stream. */
function onMoment(m, now = Date.now()) {
  if (!isRunning() || !m?.kind) return;
  changed((v) => ({ ...v, moments: [...v.moments, { at: m.at || now, kind: m.kind, ...(m.url ? { url: m.url } : {}), ...(m.text ? { text: String(m.text).slice(0, 140) } : {}) }].slice(-200) }));
}

/** People merged into one: their part in the stream on now goes with them. */
function onMerged({ into, from }) {
  const s = session();
  if (!s?.attendees?.[from]) return;
  changed((v) => {
    const a = v.attendees[into] || { m: 0, p: [] };
    const b = v.attendees[from];
    const attendees = { ...v.attendees, [into]: { m: a.m + b.m, p: [...new Set([...a.p, ...b.p])] } };
    delete attendees[from];
    return { ...v, attendees };
  });
}

// ------------------------------------------------------------ reading them

/** Where a moment is in the VOD: "1h02m03s", for a link's ?t=. */
export function vodTime(s, at) {
  const vodStart = s?.vod?.createdAt ? Date.parse(s.vod.createdAt) : s?.startedAt;
  const total = Math.max(0, Math.round((at - vodStart) / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = total % 60;
  return `${h}h${String(m).padStart(2, '0')}m${String(sec).padStart(2, '0')}s`;
}

/** A link to a moment of a stream in its VOD, or '' while there is no VOD. */
export function vodLink(s, at) {
  if (!s?.vod?.url) return '';
  return `${s.vod.url}${s.vod.url.includes('?') ? '&' : '?'}t=${vodTime(s, at)}`;
}

/** How many messages a minute, all platforms together, as a plain list (a minute nobody talked is 0). */
export const perMinute = (s) => Array.from({ length: (s?.minutes || []).length }, (_, i) => s.minutes[i]?.[0] || 0);

/** The stream on now or just over (still in its few minutes of grace), or else the last one kept. */
export const latest = () => session() || finished().at(-1) || null;

export function initStreamSessions() {
  live = collection('stream_live', { session: null });
  past = collection('stream_sessions', { list: [] });
  bus.on(EVENTS.CHAT, onChat);
  bus.on(EVENTS.CHANNEL, onChannel);
  bus.on('stream:moment', onMoment);
  bus.on('people:merged', onMerged);
  clearInterval(saveTimer);
  saveTimer = setInterval(() => live.flush(), SAVE_EVERY_MS);
  saveTimer.unref?.();
  onTwitchLive((state) => onLive(state));
  clearInterval(checkTimer);
  checkTimer = setInterval(() => { checkStillLive().catch((err) => log.debug(`stream check: ${err.message}`)); }, CHECK_EVERY_MS);
  checkTimer.unref?.();
  // Twitch already live when the server starts: the stream is on (or carries on).
  if (twitchLive().live) onLive(twitchLive());
  // A stream that ended while the server was down: finished now, or once its few minutes are up.
  const s = session();
  if (s?.startedAt && s.endedAt) {
    const left = SAME_STREAM_MS - (Date.now() - s.endedAt);
    if (left <= 0) finish(s).catch((err) => log.warn(`could not keep stream ${s.n}: ${err.message}`));
    else { endTimer = setTimeout(() => finish(session()), left); endTimer.unref?.(); }
  }
}

/** For tests: what a moment in time does, now. */
export const _test = { onChat, onChannel, onMoment, finish: () => finish(session()), checkStillLive, onLive, useAskers: (a) => { askers = a || realAskers; } };
