/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Smoke tests: every stream kept (server/engine/stream-sessions.js) and what
 * each person has done across them (server/engine/viewer-history.js) — how
 * fast Discord went by minute, who took part, the channel's changes, a stream
 * that drops and comes back being one stream, VOD links; messages, attendance
 * and streaks, giveaway wins; and forgetting people who have been away, only
 * when chosen and only those with nothing to keep them.
 *
 * A stream is the streamer's own channels on the watch list being live; here
 * that word is given straight to the stream sessions (onLive), as the watch
 * list gives it.
 *
 * Runs in order with the other feature files, on the one engine the harness
 * boots — through scripts/smoke.js, never on its own.
 */

import path from 'node:path';
import { assert, bus, collection, EVENTS, fs, normaliseChat, normaliseEvent, test } from './harness.js';

const sessions = await import('../../engine/stream-sessions.js');
const history = await import('../../engine/viewer-history.js');
const leveling = await import('../../leveling/index.js');
const { config } = await import('../../config.js');
// The streamer live or not, as the watch list says it.
const live = (on) => sessions._test.onLive({ known: true, live: on });
live(false);
sessions.initStreamSessions();
history.initViewerHistory();

const historyFile = path.join(config.dataDir, 'viewer_history.json');
const say = (over) => bus.emit(EVENTS.CHAT, normaliseChat({ platform: 'discord', msg: 'hola', raw: { channelId: 'c-stream' }, ...over }));
const event = (type, over = {}) => bus.emit(EVENTS.EVENT, normaliseEvent({ type, ...over }));
const uidOf = (key) => leveling.getAccounts()[key];

// ---------------------------------------------------------------- stream 1

live(true);
say({ user: 'AnaH', userId: 'h-ana' });
say({ user: 'AnaH', userId: 'h-ana' });
say({ user: 'BetoH', userId: 'h-beto' });
say({ user: 'Elbot', userId: 'h-bot', isBot: true });
// Twitch chat is not read any more: nothing from it counts.
say({ platform: 'twitch', user: 'Tw', userId: 'h-tw' });
bus.emit(EVENTS.CHANNEL, { title: 'Jugando cosas', categoryName: 'Among Us' });
event('giveaway_winner', { platform: 'discord', user: 'AnaH', data: { userId: 'h-ana', prize: 'x' } });
// Talking elsewhere in the Discord server is being seen, not taking part.
bus.emit('discord:message_elsewhere', normaliseChat({ platform: 'discord', user: 'AnaD', userId: '990000000000000001', msg: 'hola', raw: { channelId: 'c9' } }));
const onNow = sessions.current();
const savedBeforeFlush = fs.existsSync(historyFile);
live(false);
await sessions._test.finish();

// ---------------------------------------------------------------- stream 2, which drops and comes back

live(true);
say({ user: 'AnaH', userId: 'h-ana' });
live(false);
live(true);
const afterDrop = sessions.current();
say({ user: 'Caro', userId: 'h-caro' });
live(false);
await sessions._test.finish();
const streams = sessions.finished();
const first = streams.at(-2);
const second = streams.at(-1);

const ana = history.historyOf(uidOf('discord:h-ana'));
const beto = history.historyOf(uidOf('discord:h-beto'));
const discordOnly = history.historyOf(uidOf('discord:990000000000000001'));
history._test.flush();
const savedAfterFlush = fs.existsSync(historyFile);

test('a stream is kept: how fast Discord went by minute, who took part, the channel', () => {
  assert.equal(onNow.n, first.n);
  assert.ok(first.startedAt && first.endedAt);
  // [all, discord]: the bot and Twitch chat are not counted.
  assert.deepEqual(first.minutes[0], [3, 3]);
  const people = Object.values(first.attendees);
  assert.equal(people.length, 2, JSON.stringify(first.attendees));
  assert.deepEqual(first.attendees[uidOf('discord:h-ana')], { m: 2, p: ['discord'] });
  assert.equal(uidOf('twitch:h-tw'), undefined, 'somebody in Twitch chat was kept');
  assert.equal(first.game, 'Among Us');
  assert.equal(first.channel[0].title, 'Jugando cosas');
});

test('a stream that drops and is back within minutes is the same stream; the next one is numbered after it', () => {
  assert.equal(second.n, first.n + 1);
  assert.equal(afterDrop.id, second.id, 'a drop started a new stream');
  assert.equal(Object.keys(second.attendees).length, 2);
  const s = { ...first, vod: { url: 'https://www.twitch.tv/videos/1', createdAt: new Date(first.startedAt).toISOString() } };
  assert.equal(sessions.vodLink(s, first.startedAt + 3_723_000), 'https://www.twitch.tv/videos/1?t=1h02m03s');
  assert.equal(sessions.vodLink(first, first.startedAt), '', 'a link was made without a VOD');
});

test('each person has a history: messages, streams and streaks, giveaway wins', () => {
  assert.equal(ana.msgs.discord, 3);
  assert.equal(ana.streams, 2);
  assert.equal(ana.streak, 2);
  assert.equal(ana.bestStreak, 2);
  assert.equal(ana.wins, 1);
  assert.equal(ana.support, undefined, 'support from Twitch or YouTube is still kept');
  assert.equal(beto.streams, 1);
  assert.equal(beto.streak, 0, 'a streak carried past a stream they missed');
  assert.equal(discordOnly.msgs.discord, 1);
  assert.equal(discordOnly.streams, 0, 'talking elsewhere in Discord counted as taking part in the stream');
  assert.equal(savedBeforeFlush, false, 'history was written with every message');
  assert.equal(savedAfterFlush, true);
});

// ---------------------------------------------------------------- forgetting, only when chosen

const users = collection('users', {});
const old = Date.now() - 400 * 24 * 3_600_000;
const oldOne = leveling.personFor('discord', 'h-old', 'Viejo');
const oldKept = leveling.personFor('discord', 'h-old-points', 'Puntos');
users.update((prev) => {
  for (const uid of [oldOne, oldKept]) prev[uid] = { ...prev[uid], createdAt: old, lastXpTime: old };
  return prev;
});
const neverForgets = history.prune();
history.keepWhen((uid) => uid === oldKept);
let badMonths = null;
try { history.setHistorySettings({ forgetAfterMonths: 5 }); } catch (err) { badMonths = err.code; }
history.setHistorySettings({ forgetAfterMonths: 6 });
const stats = history.historyStats();
const pruned = history.prune();
history.setHistorySettings({ forgetAfterMonths: 0 });

test('people away too long are forgotten only when chosen, and only those with nothing to keep them', () => {
  assert.deepEqual(neverForgets, { people: 0, accounts: 0 }, 'somebody was forgotten while the setting was "never"');
  assert.equal(badMonths, 'history_bad_months');
  assert.ok(stats.wouldForget[6] >= 1);
  assert.ok(pruned.people >= 1);
  assert.equal(uidOf('discord:h-old'), undefined, 'the one away a year was kept');
  assert.ok(uidOf('discord:h-old-points'), 'somebody with points to spend was forgotten');
  assert.ok(uidOf('discord:h-ana'), 'somebody here lately was forgotten');
  assert.equal(history.getHistorySettings().forgetAfterMonths, 0);
});

// ---------------------------------------------------------------- a stream whose end was missed

const HOUR = 3_600_000;
const asks = (info) => ({ mine: async () => info });
const endOf = async () => { const s = sessions.latest(); await sessions._test.finish(); return s; };
const offline = { live: false };
const goesLive = (since) => sessions._test.onLive({ known: true, live: true, ...(since ? { since } : {}) });

// Offline twice in a row ends it, from the first time.
goesLive();
await sessions._test.checkStillLive(Date.now(), asks({ live: true }));
const firstOffline = Date.now() + 3 * 60_000;
await sessions._test.checkStillLive(firstOffline, asks(offline));
const afterOneOffline = sessions.isRunning();
await sessions._test.checkStillLive(firstOffline + 3 * 60_000, asks(offline));
const offlineOver = await endOf();

// Found offline hours after anything was known of the stream: it ended then, not now.
const lateStart = Date.now() - 4 * HOUR;
goesLive(lateStart);
sessions._test.onChat(normaliseChat({ platform: 'discord', user: 'AnaH', userId: 'h-ana', msg: 'hola' }), lateStart + 30_000);
const lastKnown = sessions.lastSign(sessions.current());
const lateCheck = Date.now();
await sessions._test.checkStillLive(lateCheck, asks(offline));
await sessions._test.checkStillLive(lateCheck + 3 * 60_000, asks(offline));
const lateOver = sessions.latest();
await new Promise((r) => setTimeout(r, 30));
const lateKeptAlone = sessions.finished().some((x) => x.id === lateOver.id);

// Quiet for hours, but said to be live a check ago: one check nobody can answer does not end it.
goesLive();
const quietButOn = Date.now() + 7 * HOUR;
await sessions._test.checkStillLive(quietButOn, asks({ live: true }));
await sessions._test.checkStillLive(quietButOn + 3 * 60_000, asks(null));
const confirmedQuietStillOn = sessions.isRunning();
// Told it went live again while on: the same stream, not a new one over it.
const onBefore = sessions.current().id;
goesLive();
const sameAfterTwice = sessions.current()?.id === onBefore;
await sessions._test.checkStillLive(quietButOn + 6 * 60_000, asks(offline));
await sessions._test.checkStillLive(quietButOn + 9 * 60_000, asks(offline));
await endOf();

// Nobody can say: hours of nothing end it, from its last sign of life.
goesLive();
say({ user: 'Caro', userId: 'h-caro' });
const quietFrom = sessions.lastSign(sessions.current());
await sessions._test.checkStillLive(Date.now() + 5 * HOUR, asks(null));
const fiveHoursQuiet = sessions.isRunning();
await sessions._test.checkStillLive(Date.now() + 7 * HOUR, asks(null));
const quietOver = await endOf();

// The watch list's word: live starts a stream, offline ends it, not known says neither.
let ons = 0;
let offs = 0;
bus.on('stream:on', () => { ons += 1; });
bus.on('stream:off', () => { offs += 1; });
const noneBefore = sessions.isRunning();
live(true);
const startedLive = sessions.current();
sessions._test.onLive({ known: false, live: false });
const stillOnWhileUnknown = sessions.isRunning();
live(false);
const endedOffline = !sessions.isRunning();
await sessions._test.finish();

test('a stream whose end was missed is ended: by offline twice, or by hours of nothing', () => {
  assert.equal(afterOneOffline, true, 'one offline answer ended the stream');
  assert.equal(offlineOver.endedAt, firstOffline, 'the stream did not end from the first offline answer');
  assert.equal(lateOver.endedAt, lastKnown, 'a stream found over hours later was kept as ending when it was found');
  assert.ok(lateKeptAlone, 'a stream found over long after was not kept straight away');
  assert.equal(confirmedQuietStillOn, true, 'a quiet stream just said to be live was ended by one unanswered check');
  assert.equal(sameAfterTwice, true, 'a second "live" replaced the stream on');
  assert.equal(fiveHoursQuiet, true, 'a stream was ended after five quiet hours');
  assert.equal(quietOver.endedAt, quietFrom, 'a quiet stream did not end at its last sign of life');
  assert.ok(sessions.finished().some((s) => s.id === quietOver.id), 'a stream ended late was not kept');
  assert.equal(sessions.isRunning(), false);
});

test('going live starts a stream and going offline ends it, each said once; not known says neither', () => {
  assert.equal(noneBefore, false);
  assert.ok(startedLive?.startedAt, 'going live did not start a stream');
  assert.equal(stillOnWhileUnknown, true, 'not knowing ended the stream');
  assert.equal(endedOffline, true, 'going offline did not end the stream');
  assert.equal(ons, 1, 'the stream going on was not said once');
  assert.equal(offs, 1, 'the stream going off was not said once');
  assert.equal(sessions.streamNow(), null);
});
