/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Smoke tests: points (server/engine/points.js) — a score apart from XP,
 * earned for talking, coming to streams and giving; a moderator giving
 * points from chat, and two people's points adding up when they are linked.
 *
 * Runs in order with the other feature files, on the one engine the harness
 * boots — through scripts/smoke.js, never on its own. After history-and-streams.js.
 */

import { assert, bus, EVENTS, normaliseChat, normaliseEvent, test } from './harness.js';

const points = await import('../../engine/points.js');
const sessions = await import('../../engine/stream-sessions.js');
const leveling = await import('../../leveling/index.js');
points.initPoints();

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const chat = (over) => bus.emit(EVENTS.CHAT, normaliseChat({ platform: 'twitch', user: 'AnaP', userId: 'p-ana', msg: 'hola', ...over }));
const uidOf = (key) => leveling.getAccounts()[key];

// ---------------------------------------------------------------- earning

bus.emit(EVENTS.STAT, { key: 'twitchLive', value: true });
chat({});
chat({ msg: 'otra vez' });
const afterTalking = points.balanceOf(uidOf('twitch:p-ana'));
bus.emit(EVENTS.EVENT, normaliseEvent({ type: 'twitch_cheer', platform: 'twitch', user: 'AnaP', data: { bits: 250, userId: 'p-ana' } }));
const afterBits = points.balanceOf(uidOf('twitch:p-ana'));
const gifted = points.pointsFor({ type: 'twitch_sub', data: { giftedBy: 'x' } });
const bulk = points.pointsFor({ type: 'twitch_sub_gift_bulk', data: { count: 3 } });
const diamonds = points.pointsFor({ type: 'tiktok_gift', data: { diamonds: 10, count: 2 } });

test('points are earned apart from XP: talking (not every message), coming to the stream, and giving', () => {
  assert.equal(afterTalking, 55, 'talking twice in a minute paid twice, or coming to the stream paid nothing');
  assert.equal(afterBits, 180);
  assert.equal(gifted, 0, 'the one given a sub earned for it');
  assert.equal(bulk, 900);
  assert.equal(diamonds, 20);
});

// ---------------------------------------------------------------- asking and giving in chat

// A moderator gives; somebody else cannot.
chat({ user: 'Modi', userId: 'p-mod', isMod: true, msg: '!darpuntos AnaP 500' });
chat({ user: 'Nadie', userId: 'p-nobody', msg: '!darpuntos AnaP 500' });
await wait(20);
const afterGift = points.balanceOf(uidOf('twitch:p-ana'));

test('a moderator gives points from chat, and nobody else can', () => {
  assert.equal(afterGift, 680, 'a moderator could not give, or somebody else could');
});

// ---------------------------------------------------------------- linked people

chat({ platform: 'youtube', user: 'AnaYT', userId: 'UCp-ana', msg: 'hola' });
const youtubeAlone = points.balanceOf(uidOf('youtube:UCp-ana'));
leveling.link({ platform: 'twitch', id: 'p-ana', username: 'AnaP' }, { platform: 'youtube', id: 'UCp-ana' });
const together = points.balanceOf(uidOf('twitch:p-ana'));
bus.emit(EVENTS.STAT, { key: 'twitchLive', value: false });
await sessions._test.finish();
const board = await points.control({ op: 'board', limit: 5 });

test('linking two people adds their points, and the board ranks them together', () => {
  assert.ok(youtubeAlone > 0);
  assert.equal(together, 680 + youtubeAlone);
  assert.equal(board.richest[0]?.uid, uidOf('twitch:p-ana'), JSON.stringify(board.richest[0]));
});
