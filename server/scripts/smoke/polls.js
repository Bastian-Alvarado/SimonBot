/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Smoke tests: around the poll. The next poll set up without touching the
 * result; what the bot says as one opens and closes; a result that clears
 * itself; past results; and "!encuesta" for mods.
 *
 * The basics — votes from every chat, the clock — are in poll-votes.js.
 * Runs in order with the other feature files, on the one engine the harness
 * boots — through scripts/smoke.js, never on its own.
 */

import { SCRIPT_URL, assert, chat, engine, fs, said, settle, test } from './harness.js';
import { EXCLUDED, MANIFEST } from './backup.js';

const read = (path) => fs.readFileSync(new URL(path, SCRIPT_URL), 'utf8');
const polls = await import('../../engine/polls.js');
const { DEFAULT_POLL_SETTINGS, MAX_POLL_HISTORY } = await import('../../../shared/polls.js');
const mod = { user: 'Modzilla', isMod: true };
const poll = (op, value) => engine.store.poll(op, value);
const now = () => engine.snapshot().poll;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

poll('reset');
poll('history_clear');
poll('settings', DEFAULT_POLL_SETTINGS);

// ------------------------------------------------------------ the next poll, apart from the one on screen

poll('open', { question: '¿Quién es el impostor?', options: ['Rojo', 'Azul', 'Lima'], durationMs: 0 });
chat('2', { user: 'Ana', userId: 'a1' });
chat('2', { user: 'Bo', userId: 'b1' });
chat('rojo', { user: 'Cy', userId: 'c1' });
await wait(300);
poll('close');
const closedResult = now();
poll('setDraft', { question: '¿Qué jugamos?', options: ['Celeste', 'Hades'] });
const whileClosed = now();

test('setting up the next poll leaves the result on screen as it was', () => {
  assert.equal(whileClosed.mode, 'closed');
  assert.equal(whileClosed.question, '¿Quién es el impostor?', 'the result on stream took the next poll\'s question');
  assert.deepEqual(whileClosed.options, ['Rojo', 'Azul', 'Lima'], 'the result on stream took the next poll\'s answers');
  assert.deepEqual(whileClosed.counts, closedResult.counts);
  assert.deepEqual(whileClosed.draft, { question: '¿Qué jugamos?', options: ['Celeste', 'Hades'] });
});

poll('open');
const openedFromDraft = now();
poll('setDraft', { options: ['Uno', 'Dos'] });
const whileOpen = now();
poll('close');

test('opening runs the draft, and editing it mid-poll leaves the running poll alone', () => {
  assert.equal(openedFromDraft.question, '¿Qué jugamos?');
  assert.deepEqual(openedFromDraft.options, ['Celeste', 'Hades']);
  assert.deepEqual(whileOpen.options, ['Celeste', 'Hades'], 'the answers being voted on changed mid-poll');
  assert.deepEqual(whileOpen.draft.options, ['Uno', 'Dos']);
});

// ------------------------------------------------------------ what the bot says

said.length = 0;
poll('settings', { announceOpen: true, announceClose: true });
poll('open', { question: '¿Quién es el impostor?', options: ['Krifox', 'Samu'], durationMs: 60000 });
chat('samu', { user: 'Ana', userId: 'a1' });
chat('2', { user: 'Bo', userId: 'b1' });
chat('1', { user: 'Cy', userId: 'c1' });
await wait(300);
poll('close');
await settle();
const saidAroundPoll = [...said];
said.length = 0;
poll('settings', { announceOpen: false, announceClose: false });
poll('open', { question: 'Callado', options: ['A', 'B'], durationMs: 0 });
poll('close');
await settle();
const saidWhileOff = [...said];
poll('settings', { announceOpen: true, announceClose: true });

test('the bot says the question and how to vote as a poll opens, and who won as it closes', () => {
  assert.deepEqual(saidAroundPoll, [
    '📊 ¿Quién es el impostor? — 1) Krifox · 2) Samu — Vota con el número o la respuesta, tienes 1 min.',
    '📊 ¿Quién es el impostor? — Ganó Samu con 2 de 3 votos (67%).',
  ]);
  assert.deepEqual(saidWhileOff, [], 'it spoke with both switched off');
});

test('the words fit the poll: a tie, no votes, the rules, and a list too long for one message', () => {
  const base = { question: '¿Quién?', options: ['Samu', 'Krifox', 'Zorito'] };
  assert.equal(polls.closeLine({ ...base, counts: [2, 2, 2], total: 6, leaders: [0, 1, 2] }), '📊 ¿Quién? — Empate entre Samu, Krifox y Zorito, con 2 votos cada una.');
  assert.equal(polls.closeLine({ ...base, counts: [0, 0, 0], total: 0, leaders: [] }), '📊 «¿Quién?» cerró sin votos.');
  assert.equal(polls.closeLine({ ...base, counts: [1, 0, 0], total: 1, leaders: [0] }), '📊 ¿Quién? — Ganó Samu con 1 de 1 voto (100%).');
  assert.ok(polls.openLine({ ...base, rules: { numbers: true, words: false }, durationMs: 90000 }).endsWith('— Vota con el número, tienes 1 min 30 s.'));
  assert.ok(polls.openLine({ ...base, rules: { numbers: false, words: false }, durationMs: 0 }).endsWith('— Vota con !voto y el número.'));
  const long = polls.openLine({ question: 'Q'.repeat(120), options: Array.from({ length: 15 }, (_, i) => `Respuesta larga número ${i + 1} ${'x'.repeat(30)}`), durationMs: 0 });
  assert.ok(long.length <= 500, `${long.length} characters is more than one chat message`);
  assert.ok(long.includes(' …') && long.endsWith('— Vota con el número o la respuesta.'), 'a list too long was cut without saying so');
});

// ------------------------------------------------------------ a result that clears itself

poll('settings', { resultSeconds: 0 });
poll('open', { question: 'Se va sola', options: ['A', 'B'], durationMs: 0 });
chat('a', { user: 'Ana', userId: 'a1' });
poll('close');
const upBefore = now().mode;
// Set after it closed: applies to the result already up.
poll('settings', { resultSeconds: 1 });
await wait(1200);
const afterClear = now();
poll('settings', { resultSeconds: 0 });

test('a result can clear itself', () => {
  assert.equal(upBefore, 'closed');
  assert.equal(afterClear.mode, 'idle', 'the result stayed up past its time');
  assert.ok(read('../../web/components/views/PollsView.tsx').includes("setSettings({ resultSeconds: Number(e.target.value) })"));
});

// ------------------------------------------------------------ past polls

const history = engine.snapshot().pollHistory;
const past = history.find((h) => h.question === '¿Quién es el impostor?' && h.total === 3);
poll('history_use', past?.id);
const draftFromPast = now().draft;
for (let i = 0; i < MAX_POLL_HISTORY + 3; i += 1) { poll('open', { question: `Relleno ${i}`, options: ['A', 'B'], durationMs: 0 }); poll('close'); }
const fullHistory = engine.snapshot().pollHistory;
poll('history_delete', fullHistory[0].id);
const afterDelete = engine.snapshot().pollHistory;
poll('history_clear');
const afterForget = engine.snapshot().pollHistory;

test('past results are kept, newest first, to look back at and run again', () => {
  assert.ok(past, 'a closed poll was not kept');
  assert.deepEqual([past.options, past.counts, past.leaders], [['Krifox', 'Samu'], [1, 2], [1]]);
  assert.equal(history[0].question, 'Se va sola', 'the newest is not first');
  assert.deepEqual(draftFromPast, { question: '¿Quién es el impostor?', options: ['Krifox', 'Samu'] }, 'Use again did not bring it back');
  assert.equal(fullHistory.length, MAX_POLL_HISTORY);
  assert.equal(fullHistory[0].question, `Relleno ${MAX_POLL_HISTORY + 2}`);
  assert.equal(afterDelete.length, MAX_POLL_HISTORY - 1);
  assert.equal(afterDelete[0].question, `Relleno ${MAX_POLL_HISTORY + 1}`);
  assert.deepEqual(afterForget, []);
  assert.ok(!('voters' in (past || {})), 'who voted for what was kept');
});

// ------------------------------------------------------------ "!encuesta"

poll('reset');
said.length = 0;
chat('!encuesta ¿Qué jugamos? | Celeste | Hades', { user: 'Random', userId: 'r1' });
await settle();
const fromViewer = now().mode;
chat('!encuesta ¿Qué jugamos? | Celeste | Hades', mod);
await settle();
const fromMod = now();
chat('!encuesta cerrar', mod);
await settle();
const afterCerrar = now().mode;
chat('!encuesta cerrar', mod);
chat('!encuesta ¿Solo pregunta?', mod);
await settle();
const saidToMods = said.slice(-2);
poll('reset');
poll('settings', { command: { enabled: false } });
chat('!encuesta Otra | A | B', mod);
await settle();
const whileOff = now().mode;
poll('settings', { command: { enabled: true, trigger: 'poll' } });
chat('!poll Otra | A | B', mod);
await settle();
const onNewWord = now();
poll('reset');
poll('settings', DEFAULT_POLL_SETTINGS);

test('mods open and close a poll from chat with "!encuesta", and hear why when it is written wrong', () => {
  assert.equal(fromViewer, 'idle', 'a viewer opened a poll');
  assert.equal(fromMod.mode, 'open');
  assert.deepEqual([fromMod.question, fromMod.options], ['¿Qué jugamos?', ['Celeste', 'Hades']]);
  assert.equal(afterCerrar, 'closed');
  assert.deepEqual(saidToMods, ['No hay ninguna encuesta abierta.', 'Escríbela así: !encuesta Pregunta | respuesta | respuesta']);
  assert.equal(whileOff, 'idle', 'it opened a poll while turned off');
  // Typed without the "!", the word gets one.
  assert.deepEqual([onNewWord.mode, onNewWord.question], ['open', 'Otra']);
});

// ------------------------------------------------------------ the screen

test('the Polls screen: the draft, platforms by name, the next answer focused, settings and past polls, in both languages', () => {
  const view = read('../../web/components/views/PollsView.tsx');
  const constants = read('../../web/constants.ts');
  assert.ok(view.includes('const draft = poll?.draft ||'), 'the screen still edits the poll on screen');
  assert.ok(view.includes('(PLATFORMS as any)[platform]'), 'platforms are shown by their ids');
  assert.ok(view.includes('setFocusAnswer(options.length)') && view.includes('answerRefs.current[focusAnswer]?.focus()'), 'Enter leaves the cursor behind');
  for (const op of ["control('history_use', h.id)", "control('history_delete', h.id)", "control('history_clear')"]) assert.ok(view.includes(op), op);
  const keys = new Set();
  for (const m of read('../../web/components/views/PollsView.tsx').matchAll(/\bt\??\.(poll[A-Za-z]+)/g)) keys.add(m[1]);
  assert.ok(keys.size >= 25, `only ${keys.size} strings found`);
  for (const key of keys) assert.equal(constants.split(`    ${key}: '`).length - 1, 2, `${key} is not in both languages`);
});

test('how polls behave travels in a backup; the votes and past results do not', () => {
  assert.ok(MANIFEST.some((m) => m.name === 'poll_settings'));
  assert.ok(EXCLUDED.includes('poll') && EXCLUDED.includes('poll_history'));
  assert.equal(engine.snapshot().pollSettings.command.trigger, '!encuesta');
});
