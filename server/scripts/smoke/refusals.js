/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Smoke tests: the server's refusals, in the screen's language.
 *
 * The server says no in English, once, with a code; each screen turns the
 * code into its own words (web/words.ts). These make sure every code the
 * server can send has words in both languages, that the words carry the
 * number or name that goes in them, and that the screens look the words up
 * instead of showing the English as it came.
 *
 * Runs in order with the other feature files, on the one engine the harness
 * boots — through scripts/smoke.js, never on its own.
 */

import { SCRIPT_URL, assert, fs, test } from './harness.js';

const read = (path) => fs.readFileSync(new URL(path, SCRIPT_URL), 'utf8');
const constants = read('../../web/constants.ts');
const bothLanguages = (key) => constants.split(`    ${key}: '`).length - 1 === 2;

const { refusalKey, refusalWords } = await import('../../../web/words.ts');
const questions = await import('../../engine/questions.js');

// ------------------------------------------------------------ every code has words

test('every refusal the server can send has words in both languages', () => {
  const sources = ['engine', 'platforms', 'api', 'leveling']
    .flatMap((dir) => fs.readdirSync(new URL(`../${dir}/`, SCRIPT_URL)).filter((f) => f.endsWith('.js')).map((f) => read(`../${dir}/${f}`)))
    .join('\n');
  const codes = new Set([
    ...[...sources.matchAll(/refusal\('([a-z_]+)'/g)].map((m) => m[1]),
    ...[...sources.matchAll(/code: '([a-z_]+)'/g)].map((m) => m[1]),
  ]);
  assert.ok(codes.size >= 25, `only ${codes.size} codes found — has the way they are written changed?`);
  for (const code of codes) assert.ok(bothLanguages(refusalKey(code)), `"${code}" (${refusalKey(code)}) is not in both languages`);
  // Nothing left in the queue that says no without a code.
  assert.ok(!read('../engine/questions.js').includes('throw new Error('), 'questions.js still refuses without a code');
});

// ------------------------------------------------------------ the words themselves

// The Spanish strings, as a screen in Spanish has them: the second of each pair.
const spanish = {};
{
  const seen = new Set();
  for (const [, k, v] of constants.matchAll(/    ([A-Za-z]+): '([^'\n]*)',/g)) {
    if (seen.has(k)) spanish[k] = v; else seen.add(k);
  }
}

let duplicateQuestion = null;
questions.clear();
questions.addQuestion({ user: 'Ana', text: 'una' });
try { questions.control({ op: 'add', user: 'Ana', text: 'una' }); } catch (err) { duplicateQuestion = err; }
questions.clear();

test('what the server refuses comes with its code, and the screen says it in Spanish', () => {
  assert.equal(duplicateQuestion?.code, 'question_duplicate');
  assert.equal(refusalWords(spanish, duplicateQuestion), 'Esa pregunta ya está en la cola.');
});

test('a number or a name goes into the sentence, and anything without words shows as it came', () => {
  assert.equal(refusalWords(spanish, { code: 'page_too_many_pages', message: 'there can be 10 pages', vars: { max: 10 } }), 'Puede haber 10 páginas.');
  assert.equal(refusalWords(spanish, { code: 'something_new', message: 'something new went wrong' }), 'something new went wrong');
  assert.equal(refusalWords(spanish, { message: 'Twitch Helix 500' }), 'Twitch Helix 500');
});

test('the socket carries the code and what fills it, and the app keeps both', () => {
  assert.ok(read('../api/ws.js').includes('...(err.vars ? { vars: err.vars } : {})'));
  assert.ok(read('../../web/hooks/useBackend.ts').includes('if (msg.payload?.vars) err.vars = msg.payload.vars;'));
});

test('the screens that show a refusal look its words up, and keep the raw text only for errors with no code', () => {
  const files = ['views/QuestionsView.tsx', 'views/GoLiveView.tsx', 'views/DiscordButtonsView.tsx', 'views/RoleManagementView.tsx', 'views/SettingsView.tsx', 'views/LevelsView.tsx', 'WelcomeCardEditor.tsx', 'WelcomeCardLayers.tsx'];
  for (const f of files) {
    const src = read(`../../web/components/${f}`);
    assert.ok(/import \{[^}]*\brefusalWords\b[^}]*\} from '\.\.\/(\.\.\/)?words';/.test(src), `${f} does not import refusalWords`);
    // Every place that shows an error's message asks for its words first.
    const raw = [...src.matchAll(/[^\n]*err\?\.message[^\n]*/g)].map((m) => m[0]).filter((line) => !line.includes('refusalWords(t, err)'));
    assert.deepEqual(raw, [], `${f} still shows a raw message`);
  }
});
