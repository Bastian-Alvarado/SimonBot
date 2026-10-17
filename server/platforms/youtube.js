/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * YouTube, for going-live alerts only: whether a channel is live right now,
 * and what the stream is called. Nobody signs in. The bot uses an API key
 * from Google Cloud, which can read any channel's public videos.
 *
 * Cheap on purpose. A channel's public feed (no key, no allowance) lists its
 * newest videos; one videos.list call then says which of them are live, for
 * up to fifty videos at a time, at one unit out of the 10,000 a day YouTube
 * gives a project. Counted here, so the Connections screen can show what is
 * left, and when the allowance runs out the bot waits for it to come back
 * instead of knocking.
 */

import { collection } from '../core/store.js';
import { bus, EVENTS } from '../core/bus.js';
import { createLogger } from '../core/logger.js';
import { refusal } from '../core/refusal.js';
import { config } from '../config.js';

const log = createLogger('youtube');

const API = 'https://www.googleapis.com/youtube/v3';
const FEED = 'https://www.youtube.com/feeds/videos.xml';
/** videos.list answers about this many videos in one call. */
export const BATCH = 50;
export const YOUTUBE_DAILY_UNITS = 10_000;

let settings = null;
let usage = null;
let status = { status: 'disconnected', error: null };
/** Out of allowance until then (ms), or 0. */
let outUntil = 0;
let fetcher = (...args) => fetch(...args);

/** For tests: a stand-in for YouTube. */
export const _setFetch = (fn) => { fetcher = fn || ((...args) => fetch(...args)); outUntil = 0; };

const apiKey = () => settings?.get().apiKey || config.youtube.apiKey;
export const hasKey = () => Boolean(apiKey());

function setStatus(next, error = null) {
  if (status.status === next && status.error === error) return;
  status = { status: next, error };
  if (error) log.warn(error);
  bus.emit(EVENTS.STATUS, { platform: 'youtube', status: next, detail: status });
}
export const getStatus = () => status;

// ------------------------------------------------------------------- the allowance

/** The day YouTube is counting, as YYYY-MM-DD in California. */
export function youtubeDay(now = Date.now()) {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  } catch {
    return new Date(now - 8 * 3_600_000).toISOString().slice(0, 10);
  }
}

/**
 * When the allowance comes back: midnight in California, where YouTube
 * counts its days, and a minute after, so the first knock lands on the new day.
 */
export function nextQuotaReset(now = Date.now()) {
  try {
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
    }).formatToParts(now).map((p) => [p.type, Number(p.value)]));
    // How far California is from UTC right now, daylight saving included.
    const there = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
    const offset = there - Math.floor(now / 1000) * 1000;
    return Date.UTC(parts.year, parts.month - 1, parts.day + 1) - offset + 60_000;
  } catch {
    const day = 86_400_000;
    return Math.floor((now - 8 * 3_600_000) / day) * day + day + 8 * 3_600_000 + 60_000;
  }
}

function spend(units) {
  if (!usage) return;
  const day = youtubeDay();
  const now = usage.get();
  usage.set({ day, units: (now.day === day ? now.units : 0) + units });
}

/** What has been spent today, what is left, and when it starts over. */
export function usageToday() {
  const now = usage?.get() || {};
  const used = now.day === youtubeDay() ? now.units || 0 : 0;
  return { used, left: Math.max(0, YOUTUBE_DAILY_UNITS - used), limit: YOUTUBE_DAILY_UNITS, resetsAt: nextQuotaReset(), outUntil };
}

// ------------------------------------------------------------------- the key

export const getCredentials = () => ({ hasApiKey: hasKey(), health: usageToday() });

/** The API key, from the Connections screen. A new key is tried at once. */
export function setCredentials(patch = {}) {
  if (typeof patch.apiKey !== 'string') return;
  settings.set({ ...settings.get(), apiKey: patch.apiKey.trim() });
  outUntil = 0;
  checkKey().catch(() => {});
}

async function api(endpoint, query = {}) {
  if (!hasKey()) throw refusal('youtube_no_key', 'YouTube: add an API key on the Connections screen');
  if (outUntil > Date.now()) throw refusal('youtube_quota', 'YouTube: today\'s allowance is spent');
  const url = new URL(`${API}${endpoint}`);
  for (const [k, v] of Object.entries({ ...query, key: apiKey() })) url.searchParams.set(k, v);
  const res = await fetcher(url);
  spend(1);
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const reason = json?.error?.errors?.[0]?.reason || '';
    if (/quota/i.test(reason)) {
      outUntil = nextQuotaReset();
      setStatus('quota', 'today\'s allowance is spent; it comes back at midnight in California');
      throw refusal('youtube_quota', 'YouTube: today\'s allowance is spent');
    }
    const message = json?.error?.message || `HTTP ${res.status}`;
    if (res.status === 400 || res.status === 403) setStatus('error', message);
    const err = new Error(`YouTube ${res.status}: ${message}`);
    err.status = res.status;
    throw err;
  }
  setStatus('connected');
  return json;
}

/** Whether the key works: one cheap call says so. */
export async function checkKey() {
  if (!hasKey()) { setStatus('disconnected'); return false; }
  try {
    await api('/videos', { part: 'id', id: 'jNQXAC9IVRw' });
    return true;
  } catch (err) {
    if (err.code !== 'youtube_quota') setStatus('error', err.message);
    return false;
  }
}

// ------------------------------------------------------------------- channels and videos

const unescape = (s) => String(s).replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");

/** A channel from what somebody typed: its id, a /channel/ link, or an @handle (one unit to look up). */
export async function channelFrom(input) {
  const s = String(input ?? '').trim();
  const id = /(UC[A-Za-z0-9_-]{22})/.exec(s)?.[1];
  const handle = /(?:youtube\.com\/)?@([A-Za-z0-9._-]{3,30})/.exec(s)?.[1];
  if (!id && !handle) return null;
  const data = await api('/channels', { part: 'snippet', ...(id ? { id } : { forHandle: `@${handle}` }) });
  const c = data?.items?.[0];
  return c ? { id: c.id, name: c.snippet?.title || '', avatar: c.snippet?.thumbnails?.default?.url || '', handle: c.snippet?.customUrl || '' } : null;
}

/** A channel's newest videos, from its public feed: no key, no allowance. */
export async function feed(channelId, max = 5) {
  const res = await fetcher(`${FEED}?channel_id=${encodeURIComponent(channelId)}`);
  if (!res.ok) throw new Error(`YouTube feed ${res.status}`);
  const xml = await res.text();
  const ids = [...xml.matchAll(/<yt:videoId>([^<]+)<\/yt:videoId>/g)].map((m) => m[1]).slice(0, max);
  const name = unescape(/<author>\s*<name>([^<]*)<\/name>/.exec(xml)?.[1] || '');
  return { ids, name };
}

/**
 * Which of these videos are live: { videoId → { channelId, channel, title,
 * live, startedAt, thumbnail, url } }, fifty videos to a unit.
 */
export async function videos(ids) {
  const out = {};
  const all = [...new Set(ids.filter(Boolean))];
  for (let i = 0; i < all.length; i += BATCH) {
    const data = await api('/videos', { part: 'snippet,liveStreamingDetails', id: all.slice(i, i + BATCH).join(',') });
    for (const v of data?.items ?? []) {
      const sn = v.snippet || {};
      const ld = v.liveStreamingDetails || {};
      out[v.id] = {
        channelId: sn.channelId || '',
        channel: sn.channelTitle || '',
        title: sn.title || '',
        // Live: begun and not over. A scheduled premiere or stream that has not started is not.
        live: sn.liveBroadcastContent === 'live' && Boolean(ld.actualStartTime) && !ld.actualEndTime,
        startedAt: ld.actualStartTime ? Date.parse(ld.actualStartTime) : 0,
        thumbnail: sn.thumbnails?.maxres?.url || sn.thumbnails?.high?.url || sn.thumbnails?.medium?.url || '',
        url: `https://www.youtube.com/watch?v=${v.id}`,
      };
    }
  }
  return out;
}

export function initYouTube() {
  settings = collection('youtube_api', { apiKey: '' });
  usage = collection('youtube_usage', { day: '', units: 0 });
  if (config.autoStart && hasKey()) checkKey().catch(() => {});
}

export const _test = { reset: () => { outUntil = 0; status = { status: 'disconnected', error: null }; } };
