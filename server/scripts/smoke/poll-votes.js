/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Smoke tests: the poll itself — what a vote is, votes from every chat, the
 * result, and its clock. What is around it is in polls.js.
 *
 * Runs in order with the other feature files, on the one engine the harness
 * boots — through scripts/smoke.js, never on its own.
 */

import { EVENTS, SCRIPT_URL, assert, bus, chat, engine, fs, settle, test } from './harness.js';
import { EXCLUDED } from './backup.js';

const mod = { user: 'Modzilla', isMod: true };

// ------------------------------------------- polls

const pollsShared = await import('../../../shared/polls.js');

test('a vote is a number, an answer or !vote — and chatter is not a vote', () => {
  const { readVote, DEFAULT_RULES } = pollsShared;
  const opts = ['Rojo', 'Azul', 'Nadie, skip'];
  assert.equal(readVote('2', opts), 1);
  assert.equal(readVote(' #3 ', opts), 2);
  assert.equal(readVote('¡ROJO!', opts), 0, 'an answer typed loudly is still that answer');
  assert.equal(readVote('!vote 1', opts), 0);
  assert.equal(readVote('!voto azul', opts), 1);
  assert.equal(readVote('4', opts), -1, 'a number past the last answer counted');
  assert.equal(readVote('0', opts), -1);
  assert.equal(readVote('rojo es el impostor', opts), -1, 'a sentence that mentions an answer counted');
  assert.equal(readVote('!join red', opts), -1, 'another command counted as a vote');
  // Bare votes switched off: only the command counts.
  const strict = { ...DEFAULT_RULES, numbers: false, words: false };
  assert.equal(readVote('2', opts, strict), -1);
  assert.equal(readVote('rojo', opts, strict), -1);
  assert.equal(readVote('!vote 2', opts, strict), 1);
});

test('a poll is cleaned: a line each, none twice, no more than fifteen', () => {
  const { cleanOptions, parsePollLine, MAX_OPTIONS } = pollsShared;
  assert.equal(MAX_OPTIONS, 15);
  assert.deepEqual(cleanOptions(['  Red ', 'red', '', 'Blue']), ['Red', 'Blue']);
  assert.equal(cleanOptions(Array.from({ length: 20 }, (_, i) => `O${i}`)).length, 15);
  assert.deepEqual(parsePollLine('Who? | Red | Blue |'), { question: 'Who?', options: ['Red', 'Blue'] });
});

// A poll run the way a stream runs one: set up on the screen, voted on from every chat.
const pollEvents = [];
const stopPollEvents = bus.on(EVENTS.EVENT, (e) => { if (e.type === 'poll_closed') pollEvents.push(e); });
const pollAnnounced = [];
const stopPollConfig = bus.on(EVENTS.CONFIG, ({ key, value }) => { if (key === 'poll') pollAnnounced.push(value); });

engine.store.poll('reset');
engine.store.poll('setDraft', { question: 'Who is the impostor?', options: ['Red', 'Blue', 'Lime'], durationMs: 0 });
chat('1', { user: 'Early' });
const beforeOpen = engine.snapshot().poll.total;
engine.store.poll('open');
chat('1', { platform: 'twitch', user: 'Ana', userId: 't1' });
chat('blue', { platform: 'youtube', user: 'Ana', userId: 'y1' });
chat('!vote 3', { platform: 'tiktok', user: 'Kiko', userId: 'k1' });
chat('lime', { platform: 'discord', user: 'Dee', userId: 'd1' });
chat('2', { platform: 'twitch', user: 'Ana', userId: 't1' });
chat('rojo no creo', { platform: 'twitch', user: 'Bo', userId: 't2' });
const midPoll = engine.snapshot().poll;
engine.store.poll('setDraft', { options: ['Changed', 'Mid', 'Poll'] });
const optionsAfterMidEdit = engine.snapshot().poll.options;
engine.store.poll('setDraft', { rules: { change: false } });
chat('1', { platform: 'discord', user: 'Dee', userId: 'd1' });
const noChange = engine.snapshot().poll.counts;
await new Promise((r) => setTimeout(r, 320));
engine.store.poll('close');
chat('1', { platform: 'twitch', user: 'Late', userId: 't9' });
const closedPoll = engine.snapshot().poll;
await settle();

// On its own clock, and from chat.
chat('!encuesta ¿Quién gana? | Uno | Dos', mod);
await settle();
const fromChat = engine.snapshot().poll;
engine.store.poll('reset');
const afterReset = engine.snapshot().poll;
engine.store.poll('open', { question: 'Quick', options: ['A', 'B'], durationMs: 120 });
chat('b', { platform: 'youtube', user: 'Zed', userId: 'y2' });
await new Promise((r) => setTimeout(r, 260));
const timedOut = engine.snapshot().poll;
engine.store.poll('reset');
engine.store.poll('setDraft', { durationMs: 60000, rules: { change: true } });
stopPollEvents();
stopPollConfig();

test('chat votes from every platform, one vote each per platform, changed by voting again', () => {
  assert.equal(beforeOpen, 0, 'a vote counted before the poll opened');
  // Ana on Twitch changed 1 → 2; Ana on YouTube is a different viewer. Bo's sentence is not a vote.
  assert.deepEqual(midPoll.counts, [0, 2, 2]);
  assert.equal(midPoll.total, 4);
  assert.deepEqual(midPoll.byPlatform, { twitch: 1, youtube: 1, tiktok: 1, discord: 1 });
  assert.deepEqual(midPoll.leaders, [1, 2], 'a tie does not name both answers');
  assert.ok(!('voters' in midPoll), 'who voted for what was sent to the screens');
});

test('what is being voted on cannot change mid-poll, but the rules can', () => {
  assert.deepEqual(optionsAfterMidEdit, ['Red', 'Blue', 'Lime']);
  assert.deepEqual(noChange, [0, 2, 2], 'a changed vote counted with changing switched off');
});

test('a closed poll keeps its result, takes no more votes, and says who won', () => {
  assert.equal(closedPoll.mode, 'closed');
  assert.equal(closedPoll.total, 4, 'a vote after closing counted');
  assert.equal(pollEvents[0]?.data?.winner, 'Blue / Lime');
  assert.equal(pollEvents[0]?.data?.tie, true);
  // Votes are told to the screens a few times a second, not once a message. The
  // rest are real changes — opening, closing, the draft edited mid-poll — and
  // telling the votes one a message would add seven more.
  assert.ok(pollAnnounced.length < 13, `the poll was announced ${pollAnnounced.length} times`);
});

test('a mod opens a poll from chat, and it runs out on its own clock', () => {
  assert.equal(fromChat.mode, 'open');
  assert.equal(fromChat.question, '¿Quién gana?');
  assert.deepEqual(fromChat.options, ['Uno', 'Dos']);
  assert.equal(afterReset.mode, 'idle');
  assert.equal(afterReset.question, '¿Quién gana?', 'clearing the screen threw the poll away');
  assert.equal(timedOut.mode, 'closed', 'the poll did not close when its time ran out');
  assert.deepEqual(timedOut.counts, [0, 1]);
  assert.equal(pollEvents.length, 2);
});

test('a poll is not backed up, and the Polls screen is in both languages', () => {
  assert.ok(EXCLUDED.includes('poll'), 'who voted for what would travel in a backup');
  const strings = fs.readFileSync(new URL('../../web/constants.ts', SCRIPT_URL), 'utf8');
  for (const key of ['pollsNav', 'pollVotes', 'pollClosedLabel', 'pollRuleWords']) {
    assert.equal(strings.split(key + ':').length - 1, 2, key);
  }
});
