/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Twitch channel's stream schedule: what the go-live posts and the
 * Discord pages say comes next ({next…}), and what Discord's own events
 * follow (schedule-events.js reads twitchSchedule as it is published).
 *
 * Asked for again whenever Twitch connects, and every quarter of an hour.
 */

import { bus, EVENTS } from '../core/bus.js';
import * as twitch from '../platforms/twitch.js';

const SCHEDULE_EVERY_MS = 15 * 60 * 1000;
/** A stream starting within this long is the one you are going live for, not the next. */
const NEXT_AFTER_MS = 30 * 60 * 1000;

let api = twitch;
export function useTwitchForTests(fake) {
  api = fake || twitch;
}

let schedule = { segments: [], fetchedAt: null, error: null };
let scheduleTimer = null;

/** The next stream on the schedule — not one about to start, which is the one you are going live for. */
export function nextStream(now = Date.now(), segments = schedule.segments) {
  return (segments || []).find((s) => Date.parse(s.start) > now + NEXT_AFTER_MS) || null;
}

function publishSchedule() {
  bus.emit(EVENTS.CONFIG, { key: 'twitchSchedule', value: { ...schedule, next: nextStream() } });
}

/** Ask Twitch again for the schedule. */
export async function refreshSchedule() {
  try {
    schedule = { segments: await api.fetchSchedule(), fetchedAt: Date.now(), error: null };
  } catch (err) {
    schedule = { ...schedule, error: /not authenticated|no client id/i.test(err.message) ? 'Twitch is not connected' : err.message };
  }
  publishSchedule();
  return { ...schedule, next: nextStream() };
}

export const snapshot = () => ({ twitchSchedule: { ...schedule, next: nextStream() } });

export function initTwitchSchedule() {
  bus.on(EVENTS.STATUS, (s) => { if (s?.platform === 'twitch' && s.status === 'connected') refreshSchedule(); });
  clearInterval(scheduleTimer);
  scheduleTimer = setInterval(() => refreshSchedule(), SCHEDULE_EVERY_MS);
  scheduleTimer.unref?.();
  setTimeout(() => refreshSchedule(), 5000).unref?.();
}

/** Tests only: forget the schedule. */
export function resetForTests() {
  schedule = { segments: [], fetchedAt: null, error: null };
}
