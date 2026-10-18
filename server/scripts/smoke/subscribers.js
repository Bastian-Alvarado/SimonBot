/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Smoke tests: the subscriber ledger.
 *
 * Runs in order with the other feature files, on the one engine the harness
 * boots — through scripts/smoke.js, never on its own.
 */

import { EVENTS, assert, bus, normaliseChat, settle, test } from './harness.js';

// ------------------------------------------------- the subscriber ledger
//
// Twitch answers "who is subscribed" and "for how long" from different places,
// and never both at once: Get Broadcaster Subscriptions is authoritative about
// membership but carries no tenure, while the exact month count only ever rides
// past on a chat message's badge-info tag. So the ledger accumulates.

const subs = await import('../../engine/subscribers.js');
subs.initSubscribers();

/** A chat message the way tmi.js delivers one, badge-info included. */
const subChat = (user, months) => bus.emit(EVENTS.CHAT, normaliseChat({
  platform: 'twitch', user, msg: 'hi', isSub: true,
  raw: { 'badge-info': { subscriber: String(months) } },
}));

bus.emit(EVENTS.SUBSCRIBER_LIST, [
  { user_name: 'Ana', tier: '1000' },
  { user_name: 'Beto', tier: '3000' },
  { user_name: 'Caro', tier: '1000' },
  { user_name: 'Silent', tier: '1000' },
]);
await settle();

test('a subscriber who has never spoken is not ranked', () => {
  const top = subs.topSubscribers();
  assert.deepEqual(top, [], 'ranked someone whose tenure is unknown');
});

subChat('Ana', 12);
subChat('Beto', 40);
subChat('Caro', 3);
await settle();

test('months are learned from the chat badge, longest first', () => {
  assert.deepEqual(subs.topSubscribers().map((s) => s.name + ':' + s.months),
    ['Beto:40', 'Ana:12', 'Caro:3']);
});

test('the silent subscriber is still absent, not listed at zero', () => {
  assert.ok(!subs.topSubscribers().some((s) => s.name === 'Silent'));
});

test('the count limits how many come back', () => {
  assert.equal(subs.topSubscribers(2).length, 2);
  assert.equal(subs.topSubscribers(2)[0].name, 'Beto');
});

// A late or replayed message must not walk a tenure backwards.
subChat('Beto', 2);
await settle();
test('months never decrease', () => {
  assert.equal(subs.topSubscribers().find((s) => s.name === 'Beto').months, 40);
});

// Someone dropping off the authoritative list has lapsed.
bus.emit(EVENTS.SUBSCRIBER_LIST, [
  { user_name: 'Ana', tier: '1000' },
  { user_name: 'Caro', tier: '1000' },
]);
await settle();

test('a lapsed subscriber drops out of the ranking', () => {
  assert.deepEqual(subs.topSubscribers().map((s) => s.name), ['Ana', 'Caro']);
});

// Coming back: the ledger kept the months while they were away.
subChat('Beto', 41);
await settle();
test('resubscribing restores them at their real tenure, not at one', () => {
  const beto = subs.topSubscribers().find((s) => s.name === 'Beto');
  assert.ok(beto, 'did not come back');
  assert.equal(beto.months, 41);
});

test('a non-subscriber chatting is ignored', () => {
  bus.emit(EVENTS.CHAT, normaliseChat({ platform: 'twitch', user: 'Rando', msg: 'hi', isSub: false, raw: { 'badge-info': { subscriber: '99' } } }));
  assert.ok(!subs.topSubscribers().some((s) => s.name === 'Rando'));
});
