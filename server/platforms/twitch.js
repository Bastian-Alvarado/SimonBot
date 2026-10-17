/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Twitch, for going-live alerts only: who is live right now, and what they
 * are streaming. Nobody signs in. The bot uses the Twitch app's Client ID and
 * Client Secret to get an app token (the client-credentials grant), which is
 * enough to read any channel's public live status.
 *
 * The token is kept in memory until it expires, and asked for again when
 * Twitch turns it down. Channels are asked about a hundred at a time.
 */

import { collection } from '../core/store.js';
import { bus, EVENTS } from '../core/bus.js';
import { createLogger } from '../core/logger.js';
import { refusal } from '../core/refusal.js';
import { config } from '../config.js';

const log = createLogger('twitch');

const HELIX = 'https://api.twitch.tv/helix';
const TOKEN_URL = 'https://id.twitch.tv/oauth2/token';
/** Helix answers about this many channels in one request. */
export const BATCH = 100;

let creds = null;
let token = null;      // { value, expiresAt }
let status = { status: 'disconnected', error: null };
let fetcher = (...args) => fetch(...args);

/** For tests: a stand-in for Twitch. */
export const _setFetch = (fn) => { fetcher = fn || ((...args) => fetch(...args)); token = null; };

/** A value typed on the Connections screen wins over the environment's. */
const clientId = () => creds?.get().clientId || config.twitch.clientId;
const clientSecret = () => creds?.get().clientSecret || config.twitch.clientSecret;
export const hasKeys = () => Boolean(clientId() && clientSecret());

function setStatus(next, error = null) {
  if (status.status === next && status.error === error) return;
  status = { status: next, error };
  if (error) log.warn(error);
  bus.emit(EVENTS.STATUS, { platform: 'twitch', status: next, detail: status });
}

export const getStatus = () => status;

/** What the screens see: the Client ID, and only whether there is a secret. */
export const getCredentials = () => ({
  clientId: clientId(),
  hasClientSecret: Boolean(clientSecret()),
});

/** The Client ID and secret, from the Connections screen. New keys are tried at once. */
export function setCredentials(patch = {}) {
  const next = { ...creds.get() };
  if (typeof patch.clientId === 'string') next.clientId = patch.clientId.trim();
  if (typeof patch.clientSecret === 'string') next.clientSecret = patch.clientSecret.trim();
  creds.set(next);
  token = null;
  checkKeys().catch(() => {});
}

// ------------------------------------------------------------------- the token

async function appToken() {
  if (token && token.expiresAt > Date.now() + 60_000) return token.value;
  if (!hasKeys()) throw refusal('twitch_no_keys', 'Twitch: add the Client ID and Client Secret on the Connections screen');
  const body = new URLSearchParams({ client_id: clientId(), client_secret: clientSecret(), grant_type: 'client_credentials' });
  const res = await fetcher(TOKEN_URL, { method: 'POST', body });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.access_token) {
    const err = refusal('twitch_keys_bad', `Twitch turned the keys down (${res.status}): ${json?.message || 'check the Client ID and secret'}`);
    err.status = res.status;
    throw err;
  }
  token = { value: json.access_token, expiresAt: Date.now() + (Number(json.expires_in) || 3600) * 1000 };
  return token.value;
}

/** Whether the keys work: an app token says so. */
export async function checkKeys() {
  if (!hasKeys()) { setStatus('disconnected'); return false; }
  try {
    await appToken();
    setStatus('connected');
    return true;
  } catch (err) {
    setStatus('error', err.message);
    return false;
  }
}

// ------------------------------------------------------------------- Helix

async function helix(endpoint, query = {}, retried = false) {
  const url = new URL(`${HELIX}${endpoint}`);
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null) continue;
    // Repeated keys (?user_login=a&user_login=b) are how Helix takes a batch.
    if (Array.isArray(v)) v.forEach((item) => url.searchParams.append(k, item));
    else url.searchParams.set(k, v);
  }
  const res = await fetcher(url, { headers: { Authorization: `Bearer ${await appToken()}`, 'Client-Id': clientId() } });
  // The token ran out or was taken back: one more go with a new one.
  if (res.status === 401 && !retried) {
    token = null;
    return helix(endpoint, query, true);
  }
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const err = new Error(`Twitch Helix ${res.status}: ${json?.message || text}`);
    err.status = res.status;
    throw err;
  }
  setStatus('connected');
  return json;
}

/** A Twitch login from what somebody typed: "name", "@name" or a twitch.tv link. */
export function loginFrom(input) {
  const s = String(input ?? '').trim();
  const fromUrl = /twitch\.tv\/([A-Za-z0-9_]{2,25})/i.exec(s);
  const login = (fromUrl ? fromUrl[1] : s.replace(/^@/, '')).toLowerCase();
  return /^[a-z0-9_]{2,25}$/.test(login) ? login : '';
}

const chunks = (list, size) => Array.from({ length: Math.ceil(list.length / size) }, (_, i) => list.slice(i * size, (i + 1) * size));

/** Channels by login: { login → { id, login, name, avatar } }. */
export async function getUsers(logins) {
  const out = {};
  for (const batch of chunks([...new Set(logins.filter(Boolean))], BATCH)) {
    const data = await helix('/users', { login: batch });
    for (const u of data?.data ?? []) out[u.login] = { id: u.id, login: u.login, name: u.display_name || u.login, avatar: u.profile_image_url || '' };
  }
  return out;
}

export async function getUser(login) {
  return (await getUsers([login]))[login] || null;
}

/** The thumbnail Twitch shows for a live channel, sized, and new each time so Discord does not show a stale one. */
const thumbnail = (url) => (url ? `${String(url).replace('{width}', '1280').replace('{height}', '720')}?t=${Date.now()}` : '');

/**
 * Which of these channels are live: { login → { title, game, thumbnail,
 * startedAt, viewers } }. A channel missing from the answer is offline.
 */
export async function liveStreams(logins) {
  const out = {};
  for (const batch of chunks([...new Set(logins.filter(Boolean))], BATCH)) {
    const data = await helix('/streams', { user_login: batch, first: BATCH });
    for (const s of data?.data ?? []) {
      out[String(s.user_login).toLowerCase()] = {
        title: s.title || '',
        game: s.game_name || '',
        thumbnail: thumbnail(s.thumbnail_url),
        startedAt: s.started_at ? Date.parse(s.started_at) : Date.now(),
        viewers: Number(s.viewer_count) || 0,
      };
    }
  }
  return out;
}

/** A channel's latest past broadcast — tonight's, just after it ends — if Twitch keeps them. */
export async function latestVod(userId) {
  if (!userId || !hasKeys()) return null;
  const v = (await helix('/videos', { user_id: userId, type: 'archive', first: 1 }))?.data?.[0];
  return v ? { url: v.url, title: v.title || '', createdAt: v.created_at } : null;
}

/** The channel signed in before 0.1.0, if there was one: it becomes the first on the watch list (engine/watch.js). */
let legacy = '';
export const legacyLogin = () => legacy;

export function initTwitch() {
  creds = collection('twitch_credentials', { clientId: '', clientSecret: '' });
  // What an earlier version kept — sign-in tokens, the bot account — is not needed any more.
  const c = creds.get();
  legacy = c.login || c.channel || '';
  if (Object.keys(c).some((k) => !['clientId', 'clientSecret'].includes(k))) {
    creds.set({ clientId: c.clientId || '', clientSecret: c.clientSecret || '' });
    log.info('Twitch sign-in is no longer used: kept the Client ID only');
  }
  if (config.autoStart) checkKeys().catch(() => {});
}
