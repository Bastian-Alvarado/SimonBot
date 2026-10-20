/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Smoke tests: points (server/engine/points.js) — a score apart from XP,
 * earned for talking in Discord and coming to streams; a moderator giving
 * points from Discord, and the board.
 *
 * Runs in order with the other feature files, on the one engine the harness
 * boots — through scripts/smoke.js, never on its own. After history-and-streams.js.
 */

import { assert, bus, EVENTS, normaliseChat, test } from './harness.js';

const points = await import('../../engine/points.js');
const sessions = await import('../../engine/stream-sessions.js');
const leveling = await import('../../leveling/index.js');
points.initPoints();

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const chat = (over) => bus.emit(EVENTS.CHAT, normaliseChat({ platform: 'discord', user: 'AnaP', userId: 'p-ana', msg: 'hola', raw: { channelId: 'c-stream' }, ...over }));
const uidOf = (key) => leveling.getAccounts()[key];

// ---------------------------------------------------------------- earning

sessions._test.onLive({ known: true, live: true });
chat({});
chat({ msg: 'otra vez' });
const afterTalking = points.balanceOf(uidOf('discord:p-ana'));
// Twitch chat is not read: it earns nothing.
chat({ platform: 'twitch', user: 'Tw', userId: 'p-tw' });
const fromTwitch = uidOf('twitch:p-tw');
const earnRules = Object.keys(points.getPoints().earn).sort();

test('points are earned apart from XP: talking in Discord (not every message) and coming to the stream', () => {
  assert.equal(afterTalking, 55, 'talking twice in a minute paid twice, or coming to the stream paid nothing');
  assert.equal(fromTwitch, undefined, 'somebody in Twitch chat earned points');
  assert.deepEqual(earnRules, ['message', 'messageEverySec', 'streakMax', 'streakStep', 'stream']);
});

// ---------------------------------------------------------------- giving in Discord

// A moderator gives; somebody else cannot.
chat({ user: 'Modi', userId: 'p-mod', isMod: true, msg: '!darpuntos AnaP 500' });
chat({ user: 'Nadie', userId: 'p-nobody', msg: '!darpuntos AnaP 500' });
await wait(20);
const afterGift = points.balanceOf(uidOf('discord:p-ana'));
sessions._test.onLive({ known: true, live: false });
await sessions._test.finish();
const board = await points.control({ op: 'board', limit: 5 });

test('a moderator gives points from Discord, nobody else can, and the board ranks them', () => {
  assert.equal(afterGift, 555, 'a moderator could not give, or somebody else could');
  assert.equal(board.richest[0]?.uid, uidOf('discord:p-ana'), JSON.stringify(board.richest[0]));
});
