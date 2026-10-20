/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The watch list: the Twitch and YouTube channels the bot keeps an eye on,
 * each with its own going-live post (engine/announce.js). Some are marked
 * "mine" — the streamer's own channels — and while any of those is live, the
 * stream is on (engine/stream-sessions.js): live DMs, points for coming, the
 * stream's pages and questions all follow that.
 *
 * Nobody signs in. Twitch is asked every minute with the app's keys, a
 * hundred channels at a time (platforms/twitch.js). YouTube every two and a
 * half minutes: each channel's public feed, then one call for whether its
 * newest videos are live (platforms/youtube.js).
 *
 * A channel goes live the first time it is seen live, and is over only after
 * two offline answers in a row, so one slow answer does not end a stream.
 * A check nobody could answer changes nothing.
 *
 * Every channel's post is set up apart; "copy setup" fills one from another,
 * or all of them from one, and a channel added starts from the setup last
 * edited.
 */

import { collection } from '../core/store.js';
import { bus, EVENTS } from '../core/bus.js';
import { createLogger } from '../core/logger.js';
import { refusal } from '../core/refusal.js';
import * as twitch from '../platforms/twitch.js';
import * as youtube from '../platforms/youtube.js';

const log = createLogger('watch');

export const WATCH_PLATFORMS = ['twitch', 'youtube'];
export const MAX_CHANNELS = 50;
export const TWITCH_EVERY_MS = 60_000;
export const YOUTUBE_EVERY_MS = 150_000;
/** Offline answers in a row that end a stream. */
export const OFFLINE_ANSWERS = 2;
/** A "mine" channel not heard about in this long is not known to be live or not. */
const KNOWN_FOR_MS = 10 * 60_000;

const COLOURS = { twitch: '#9146ff', youtube: '#ff0000' };

/** One channel's going-live post. */
export const DEFAULT_ALERT = {
  enabled: true,
  channelId: '',
  roleId: '',
  message: '{role} {streamer} is live! {title}',
  card: true,
  cardColor: COLOURS.twitch,
  delaySeconds: 45,
  /** edit | delete | keep — what becomes of the post when the stream stops. */
  whenOver: 'edit',
  overMessage: 'The stream is over — thanks for watching!',
};

const snowflake = (v) => (/^\d{5,25}$/.test(String(v ?? '')) ? String(v) : '');

export function cleanAlert(incoming, before = DEFAULT_ALERT) {
  const c = { ...before, ...(incoming && typeof incoming === 'object' ? incoming : {}) };
  return {
    enabled: c.enabled !== false,
    channelId: snowflake(c.channelId),
    roleId: c.roleId === 'everyone' ? 'everyone' : snowflake(c.roleId),
    message: String(c.message ?? '').slice(0, 1500),
    card: c.card !== false,
    cardColor: /^#[0-9a-fA-F]{6}$/.test(c.cardColor || '') ? c.cardColor : DEFAULT_ALERT.cardColor,
    delaySeconds: Math.min(600, Math.max(0, Math.round(Number(c.delaySeconds) || 0))),
    whenOver: ['edit', 'delete', 'keep'].includes(c.whenOver) ? c.whenOver : 'edit',
    // Room for a few alternatives, one per line.
    overMessage: String(c.overMessage ?? '').slice(0, 1500),
  };
}

let store = null;
let twitchTimer = null;
let youtubeTimer = null;
/** When each platform last answered, for whether "mine" is known. */
const answeredAt = { twitch: 0, youtube: 0 };
const mineListeners = new Set();
let mineWas = { known: false, live: false, since: 0 };

const channels = () => store?.get().channels || [];
export const list = () => channels();
export const get = (id) => channels().find((c) => c.id === id) || null;

/** Where to watch a channel: the live video while there is one. */
export function urlOf(entry) {
  if (entry.platform === 'twitch') return `https://twitch.tv/${entry.handle}`;
  return entry.live?.url || `https://www.youtube.com/channel/${entry.handle}/live`;
}

export const snapshot = () => ({ watch: { channels: channels(), lastEdited: store?.get().lastEdited || '' } });
const publish = () => bus.emit(EVENTS.CONFIG, { key: 'watch', value: snapshot().watch });

function save(fn, { quietly = false } = {}) {
  const apply = (v) => ({ ...v, channels: fn(v.channels || []) });
  if (quietly) store.updateQuietly(apply);
  else store.update(apply);
  publish();
}
const patchEntry = (id, patch, opts) => save((all) => all.map((c) => (c.id === id ? { ...c, ...(typeof patch === 'function' ? patch(c) : patch) } : c)), opts);

// ------------------------------------------------------------------- the list

/** Add a channel by what somebody typed: a Twitch login or link, a YouTube @handle, link or channel id. */
export async function add({ platform, input, mine = false } = {}) {
  if (!WATCH_PLATFORMS.includes(platform)) throw refusal('watch_platform', 'Twitch or YouTube');
  if (channels().length >= MAX_CHANNELS) throw refusal('watch_full', `at most ${MAX_CHANNELS} channels`, { max: MAX_CHANNELS });
  let found = null;
  if (platform === 'twitch') {
    const login = twitch.loginFrom(input);
    if (!login) throw refusal('watch_not_found', 'that is not a Twitch channel');
    const user = await twitch.getUser(login);
    if (!user) throw refusal('watch_not_found', 'Twitch has no channel by that name');
    found = { handle: user.login, userId: user.id, name: user.name, avatar: user.avatar };
  } else {
    const ch = await youtube.channelFrom(input);
    if (!ch) throw refusal('watch_not_found', 'YouTube has no channel by that name');
    found = { handle: ch.id, userId: ch.id, name: ch.name, avatar: ch.avatar };
  }
  if (channels().some((c) => c.platform === platform && c.handle === found.handle)) throw refusal('watch_already', 'that channel is on the list already');
  // A new channel starts from the setup last edited, or else in its own platform's colour.
  const from = get(store.get().lastEdited)?.alert;
  const alert = cleanAlert(from || { cardColor: COLOURS[platform] });
  const entry = { id: `${platform}:${found.handle}`, platform, ...found, mine: mine === true, alert, live: null, last: null, lastVideo: null };
  save((all) => [...all, entry]);
  log.info(`watching ${platform} ${found.name}`);
  // Asked about at once rather than at the next round.
  await (platform === 'twitch' ? pollTwitch() : pollYouTube()).catch(() => {});
  return get(entry.id) || entry;
}

export function remove(id) {
  if (!get(id)) throw refusal('watch_not_found', 'not on the list');
  save((all) => all.filter((c) => c.id !== id));
  store.update((v) => ({ ...v, lastEdited: v.lastEdited === id ? '' : v.lastEdited }));
  tellMine();
  return { removed: id };
}

/** "Mine" on or off, and the post's setup. */
export function update(id, { mine, alert } = {}) {
  const entry = get(id);
  if (!entry) throw refusal('watch_not_found', 'not on the list');
  patchEntry(id, (c) => ({
    ...(typeof mine === 'boolean' ? { mine } : {}),
    ...(alert ? { alert: cleanAlert(alert, c.alert) } : {}),
  }));
  if (alert) store.update((v) => ({ ...v, lastEdited: id }));
  if (typeof mine === 'boolean') tellMine();
  return get(id);
}

/** Copy one channel's post setup to others, or to every other channel ('all'). */
export function copy(from, to) {
  const source = get(from);
  if (!source) throw refusal('watch_not_found', 'not on the list');
  const targets = to === 'all' ? channels().filter((c) => c.id !== from).map((c) => c.id) : (Array.isArray(to) ? to : [to]).filter((id) => id !== from && get(id));
  save((all) => all.map((c) => (targets.includes(c.id) ? { ...c, alert: cleanAlert(source.alert) } : c)));
  return { copied: targets.length };
}

/** The post that is up for a channel now, so it can be marked over or taken down. */
export function setLast(id, last) {
  patchEntry(id, { last: last || null });
}

/** From the Go live screen. 'test' is the announcer's (api/ws.js). */
export async function control(payload = {}) {
  switch (payload.op) {
    case 'add': return add(payload);
    case 'remove': return remove(payload.id);
    case 'update': return update(payload.id, payload);
    case 'copy': return copy(payload.from, payload.to);
    case 'check': await Promise.all([pollTwitch(), pollYouTube()]); return snapshot().watch;
    default: throw refusal('watch_op', `unknown: ${payload.op}`);
  }
}

// ------------------------------------------------------------------- live or not

/** What a channel's post is filled in with: the stream, or the channel when it is not live. */
export function infoFor(entry) {
  return {
    platform: entry.platform,
    name: entry.name,
    title: entry.live?.title || '',
    game: entry.live?.game || '',
    thumbnail: entry.live?.thumbnail || '',
    url: urlOf(entry),
    live: Boolean(entry.live?.on),
    startedAt: entry.live?.since || 0,
  };
}

/**
 * One answer about a channel: `info` live, `null` offline. Going live, a
 * title or game changing on a "mine" channel, and ending (after two offline
 * answers in a row) are told on the bus.
 */
export function heard(id, info, now = Date.now()) {
  const entry = get(id);
  if (!entry) return;
  if (info) {
    const wasOn = Boolean(entry.live?.on);
    const live = { on: true, since: wasOn ? entry.live.since : (info.startedAt || now), title: info.title || '', game: info.game || '', thumbnail: info.thumbnail || '', url: info.url || '', offline: 0 };
    patchEntry(id, { live }, { quietly: wasOn });
    const after = get(id);
    if (!wasOn) {
      log.info(`${entry.platform} ${entry.name} is live`);
      bus.emit('watch:live', { entry: after, info: infoFor(after) });
    } else if (entry.mine && (entry.live.title !== live.title || entry.live.game !== live.game)) {
      bus.emit(EVENTS.CHANNEL, { title: live.title, categoryName: live.game });
    }
    return;
  }
  if (!entry.live?.on) return;
  const offline = (entry.live.offline || 0) + 1;
  if (offline < OFFLINE_ANSWERS) {
    patchEntry(id, { live: { ...entry.live, offline } }, { quietly: true });
    return;
  }
  const lastVideo = { url: urlOf(entry), title: entry.live.title, createdAt: new Date(entry.live.since).toISOString() };
  patchEntry(id, { live: null, lastVideo });
  log.info(`${entry.platform} ${entry.name} is offline`);
  bus.emit('watch:ended', { entry: get(id) });
}

let pollingTwitch = false;
export async function pollTwitch(now = Date.now()) {
  const watched = channels().filter((c) => c.platform === 'twitch');
  if (!watched.length || !twitch.hasKeys() || pollingTwitch) return;
  pollingTwitch = true;
  try {
    // A channel brought over from before 0.1.0 has only its login: its id, name and picture, once.
    const bare = watched.filter((c) => !c.userId);
    if (bare.length) {
      const users = await twitch.getUsers(bare.map((c) => c.handle)).catch(() => ({}));
      for (const c of bare) if (users[c.handle]) patchEntry(c.id, { userId: users[c.handle].id, name: users[c.handle].name, avatar: users[c.handle].avatar });
    }
    const live = await twitch.liveStreams(watched.map((c) => c.handle));
    answeredAt.twitch = now;
    for (const c of watched) heard(c.id, live[c.handle] ? { ...live[c.handle], url: `https://twitch.tv/${c.handle}` } : null, now);
  } catch (err) {
    log.debug(`Twitch could not say: ${err.message}`);
  } finally {
    pollingTwitch = false;
    tellMine();
  }
}

let pollingYouTube = false;
export async function pollYouTube(now = Date.now()) {
  const watched = channels().filter((c) => c.platform === 'youtube');
  if (!watched.length || !youtube.hasKey() || pollingYouTube) return;
  pollingYouTube = true;
  try {
    // The newest videos of each channel, and the one live now, which a newer upload could push off the feed.
    const ids = new Map();
    for (const c of watched) {
      try {
        const { ids: newest } = await youtube.feed(c.handle);
        const own = [...newest];
        const liveId = /[?&]v=([^&]+)/.exec(c.live?.url || '')?.[1];
        if (liveId && !own.includes(liveId)) own.push(liveId);
        ids.set(c.id, own);
      } catch (err) {
        log.debug(`no feed for ${c.name}: ${err.message}`);
      }
    }
    if (!ids.size) return;
    const found = await youtube.videos([...ids.values()].flat());
    answeredAt.youtube = now;
    for (const c of watched) {
      if (!ids.has(c.id)) continue;
      const on = ids.get(c.id).map((v) => found[v]).find((v) => v?.live && v.channelId === c.handle);
      heard(c.id, on ? { title: on.title, game: '', thumbnail: on.thumbnail, startedAt: on.startedAt, url: on.url } : null, now);
    }
  } catch (err) {
    log.debug(`YouTube could not say: ${err.message}`);
  } finally {
    pollingYouTube = false;
    tellMine();
  }
}

// ------------------------------------------------------------------- "mine"

const mine = () => channels().filter((c) => c.mine);

/** Whether the streamer is live: { known, live, since }. Not known while no "mine" channel has been heard about lately. */
export function mineState(now = Date.now()) {
  const own = mine();
  const live = own.filter((c) => c.live?.on);
  if (live.length) return { known: true, live: true, since: Math.min(...live.map((c) => c.live.since)) };
  const known = own.length > 0 && own.every((c) => now - (answeredAt[c.platform] || 0) < KNOWN_FOR_MS);
  return { known, live: false, since: 0 };
}

/** Told when the streamer goes live or stops. Returns how to stop being told. */
export function onMine(fn) {
  mineListeners.add(fn);
  return () => mineListeners.delete(fn);
}

function tellMine() {
  const now = mineState();
  if (now.known === mineWas.known && now.live === mineWas.live) return;
  mineWas = now;
  for (const fn of mineListeners) {
    try { fn(now); } catch { /* one listener's trouble is not the others' */ }
  }
}

/** The streamer's live stream: Twitch's first, where there is one. */
export function mineInfo() {
  const live = mine().filter((c) => c.live?.on).sort((a, b) => (a.platform === 'twitch' ? -1 : 0) - (b.platform === 'twitch' ? -1 : 0));
  return live[0] ? infoFor(live[0]) : null;
}

/** Where the streamer can be watched, a link per platform: for live DMs and pages. */
export function mineLinks() {
  const out = {};
  for (const c of mine()) if (!out[c.platform]) out[c.platform] = { name: c.name, url: urlOf(c) };
  return out;
}

/** The VOD of the stream that started at `startedAt`: Twitch's past broadcast, or the YouTube live video itself. */
export async function latestVod(startedAt = 0) {
  for (const c of mine().filter((x) => x.platform === 'twitch')) {
    const vod = await twitch.latestVod(c.userId).catch(() => null);
    if (vod?.createdAt && Date.parse(vod.createdAt) >= startedAt - 10 * 60_000) return vod;
  }
  for (const c of mine().filter((x) => x.platform === 'youtube')) {
    const v = c.live?.on ? { url: c.live.url, title: c.live.title, createdAt: new Date(c.live.since).toISOString() } : c.lastVideo;
    if (v?.createdAt && Date.parse(v.createdAt) >= startedAt - 10 * 60_000) return v;
  }
  return null;
}

// ------------------------------------------------------------------- start and stop

/**
 * Before 0.1.0 there was one go-live post, for the Twitch account signed in.
 * That channel becomes the first on the list, "mine", with that post's setup.
 */
function migrate() {
  if (store.get().migrated) return;
  const login = twitch.legacyLogin();
  const old = collection('discord_announce', {}).get();
  if (login && !channels().length) {
    const alert = cleanAlert({ ...old, enabled: old.enabled === true });
    save(() => [{ id: `twitch:${login}`, platform: 'twitch', handle: login, userId: '', name: login, avatar: '', mine: true, alert, live: null, last: null, lastVideo: null }]);
    log.info(`the go-live post for ${login} is now on the watch list`);
  }
  store.update((v) => ({ ...v, migrated: true }));
}

export function initWatch() {
  store = collection('watch_list', { channels: [], lastEdited: '', migrated: false });
  migrate();
  clearInterval(twitchTimer);
  clearInterval(youtubeTimer);
  twitchTimer = setInterval(() => { pollTwitch().catch(() => {}); }, TWITCH_EVERY_MS);
  youtubeTimer = setInterval(() => { pollYouTube().catch(() => {}); }, YOUTUBE_EVERY_MS);
  twitchTimer.unref?.();
  youtubeTimer.unref?.();
  // A first look soon after starting, once the keys have been tried.
  setTimeout(() => { pollTwitch().catch(() => {}); pollYouTube().catch(() => {}); }, 5_000).unref?.();
}

export function stopWatch() {
  clearInterval(twitchTimer);
  clearInterval(youtubeTimer);
}

export const _test = {
  reset: () => { answeredAt.twitch = 0; answeredAt.youtube = 0; mineWas = { known: false, live: false, since: 0 }; },
  answered: (platform, at = Date.now()) => { answeredAt[platform] = at; tellMine(); },
};
