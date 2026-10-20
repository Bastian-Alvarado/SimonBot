/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Smoke tests: the question queue and the Questions screen. The built-in
 * "!pregunta", the same question twice, editing, adding by hand, "Next
 * question", a deleted message or a timeout taking a waiting question with
 * it, the end of a stream; both languages, and "Clear all" asking first.
 *
 * Runs in order with the other feature files, on the one engine the harness
 * boots — through scripts/smoke.js, never on its own.
 */

import { SCRIPT_URL, assert, bus, chat, discordSent, doubles, engine, EVENTS, fs, normaliseChat, settle, test } from './harness.js';

// What the bot said back in Discord.
const said = { get length() { return discordSent.length; }, slice: (from) => discordSent.slice(from).map((args) => args[1]) };

const questions = await import('../../engine/questions.js');

const read = (path) => fs.readFileSync(new URL(path, SCRIPT_URL), 'utf8');

test('the Questions screen speaks both languages', () => {
  const view = read('../../web/components/views/QuestionsView.tsx');
  const constants = read('../../web/constants.ts');
  const keys = [...new Set([...view.matchAll(/\bt\.(questions[A-Za-z]+)/g)].map((m) => m[1]))];
  assert.ok(keys.length >= 13, `only ${keys.length} strings found`);
  for (const key of keys) assert.equal(constants.split(`    ${key}: '`).length - 1, 2, `${key} is not in both languages`);
  // Nothing points at the commands and steps that are gone.
  assert.ok(!constants.includes('“Questions: add to queue” step') && !constants.includes('«Preguntas: agregar a la cola»'));
});

test('clearing every question asks first', () => {
  const view = read('../../web/components/views/QuestionsView.tsx');
  assert.ok(view.includes("if (window.confirm(t.questionsClearAllConfirm"), 'one slip throws the whole queue away');
});

// ------------------------------------------------------------ the queue itself

const items = () => questions.getQuestions().items;
const byText = (text) => items().find((q) => q.text === text);

questions.clear();
questions.addQuestion({ user: 'Ana', platform: 'discord', text: '¿Cuál es tu juego favorito?' });
const twice = questions.addQuestion({ user: 'ana', platform: 'discord', text: '  ¿cuál es tu   juego favorito? ' });
const otherPerson = questions.addQuestion({ user: 'Luis', platform: 'discord', text: '¿Cuál es tu juego favorito?' });

test('the same person asking the same thing again is the one question', () => {
  assert.equal(twice.added, false, 'a repeat — spacing and capitals aside — went in twice');
  assert.equal(otherPerson.added, true, 'somebody else asking the same thing was refused');
  assert.equal(items().length, 2);
});

test('once it is turned down, asking again is a new question', () => {
  questions.setStatus(items()[0].id, 'rejected');
  assert.equal(questions.addQuestion({ user: 'Ana', text: '¿Cuál es tu juego favorito?' }).added, true);
});

test('a question can be tidied before it goes up, and not after it is answered', () => {
  questions.clear();
  questions.addQuestion({ user: 'Ana', text: 'wat is ur fav game' });
  const q = items()[0];
  questions.edit(q.id, '  ¿Cuál es tu juego favorito?  ');
  assert.equal(items()[0].text, '¿Cuál es tu juego favorito?');
  questions.edit(q.id, '   ');
  assert.equal(items()[0].text, '¿Cuál es tu juego favorito?', 'an empty edit wiped the question');
  questions.setStatus(q.id, 'done');
  questions.edit(q.id, 'rewritten after the fact');
  assert.equal(items()[0].text, '¿Cuál es tu juego favorito?', 'an answered question was rewritten');
});

test('"Next question" answers the one up and puts up the oldest approved', () => {
  questions.clear();
  for (const text of ['primera', 'segunda', 'tercera']) questions.addQuestion({ user: 'Ana', text });
  assert.throws(() => questions.next(), /no approved question/, 'it put up a question nobody approved');
  questions.setStatus(byText('segunda').id, 'approved');
  questions.setStatus(byText('primera').id, 'approved');
  questions.next();
  // Oldest asked first, not first approved.
  assert.equal(questions.getQuestions().showingId, byText('primera').id);
  questions.next();
  assert.equal(byText('primera').status, 'done', 'the one it took down was not marked answered');
  assert.equal(questions.getQuestions().showingId, byText('segunda').id);
  questions.next();
  assert.equal(questions.getQuestions().showingId, '', 'with nothing left it should take the last one down');
  assert.equal(byText('tercera').status, 'pending', 'a question nobody approved was touched');
});

test('adding one by hand puts it in Waiting, credited as typed, and says why when it cannot', () => {
  questions.clear();
  assert.deepEqual(questions.control({ op: 'add', text: '¿Qué opinas del speedrun?', user: 'Discord' }), { ok: true });
  const q = items()[0];
  assert.equal(q.user, 'Discord');
  assert.equal(q.platform, '');
  assert.equal(q.status, 'pending');
  assert.throws(() => questions.control({ op: 'add', text: '¿Qué opinas del speedrun?', user: 'Discord' }), /already in the queue/);
  assert.throws(() => questions.control({ op: 'add', text: '   ' }), /nothing to add/);
  assert.throws(() => questions.control({ op: 'launch' }), /unknown request/);
});

test('the settings refuse what cannot work', () => {
  const clean = questions.cleanSettings({ ask: { trigger: 'pregunta sin signo', cooldownSeconds: -5, replyText: 'x'.repeat(1500) }, atStreamEnd: 'sometimes' });
  assert.equal(clean.ask.trigger, '!pregunta', 'a trigger that is not a !word was kept');
  assert.equal(clean.ask.cooldownSeconds, 0);
  // Room for a few replies, one per line: one is picked each time (random-lines.js).
  assert.equal(clean.ask.replyText.length, 1000);
  assert.equal(clean.atStreamEnd, 'keep');
  assert.equal(questions.cleanSettings({ ask: { trigger: '!Ask', cooldownSeconds: 99999 } }).ask.cooldownSeconds, 3600);
  assert.equal(questions.cleanSettings({ ask: { trigger: '!Ask' } }).ask.trigger, '!ask');
  // Typed without the "!", it is added; two words keep the word it had.
  assert.equal(questions.cleanSettings({ ask: { trigger: 'ask' } }).ask.trigger, '!ask');
  assert.equal(questions.cleanSettings({ ask: { trigger: 'two words' } }, { ask: { ...questions.DEFAULT_ASK, trigger: '!q' } }).ask.trigger, '!q');
  // A setting sent alone leaves the others as they were.
  const before = questions.getSettings();
  questions.setSettings({ atStreamEnd: 'finished' });
  assert.deepEqual(questions.getSettings().ask, before.ask);
  questions.setSettings({ atStreamEnd: 'keep' });
});

// ------------------------------------------------------------ "!pregunta"

questions.clear();
questions.resetCooldownsForTests();
questions.setSettings({ ask: { ...questions.DEFAULT_ASK } });
const saidAt = said.length;
chat('!pregunta ¿Cuándo es el próximo maratón?', { user: 'Ana', userId: 'u-ana', id: 'msg-1' });
chat('!pregunta ¿Y otra más?', { user: 'Ana', userId: 'u-ana', id: 'msg-2' });
chat('!PREGUNTA ¿Juegas Celeste?', { user: 'Luis', userId: 'u-luis', id: 'msg-3' });
chat('!pregunta', { user: 'Sofía', userId: 'u-sofia', id: 'msg-4' });
chat('!pregunta ¿Soy un bot?', { user: 'BotAccount', userId: 'u-bot', id: 'msg-5', isBot: true });
await settle();
const askedByChat = items().map((q) => [q.user, q.text, q.userId, q.msgId, q.platform, q.status]);
const repliedToChat = said.slice(saidAt);

test('"!pregunta" puts a question in Waiting and says so in Discord, once per person per minute', () => {
  assert.deepEqual(askedByChat, [
    ['Ana', '¿Cuándo es el próximo maratón?', 'u-ana', 'msg-1', 'discord', 'pending'],
    ['Luis', '¿Juegas Celeste?', 'u-luis', 'msg-3', 'discord', 'pending'],
  ], 'the cooldown, an empty "!pregunta" or the bot got through');
  assert.deepEqual(repliedToChat, ['¡Pregunta recibida, @Ana!', '¡Pregunta recibida, @Luis!']);
});

// Turned off, and on another word.
questions.clear();
questions.resetCooldownsForTests();
questions.setSettings({ ask: { ...questions.DEFAULT_ASK, enabled: false } });
chat('!pregunta ¿estás apagado?', { user: 'Ana', userId: 'u-ana', id: 'msg-7' });
await settle();
const whileOff = items().length;
questions.setSettings({ ask: { ...questions.DEFAULT_ASK, trigger: '!ask', reply: false } });
const saidBeforeQuiet = said.length;
chat('!ask what is your PB?', { user: 'Sam', userId: 'u-sam', id: 'msg-8' });
chat('!pregunta ¿y la palabra vieja?', { user: 'Leo', userId: 'u-leo', id: 'msg-9' });
await settle();
const onOtherWord = items().map((q) => q.text);
const quietReply = said.slice(saidBeforeQuiet);
questions.setSettings({ ask: { ...questions.DEFAULT_ASK } });

test('it takes nothing when turned off, and follows its word', () => {
  assert.equal(whileOff, 0, 'it took a question while turned off');
  assert.deepEqual(onOtherWord, ['what is your PB?'], 'it did not follow its new word, or still answered the old one');
  assert.deepEqual(quietReply, [], 'it answered in chat with the reply turned off');
});

// ------------------------------------------------------------ the end of the stream

const endWith = (setting) => {
  questions.clear();
  for (const text of ['esperando', 'aprobada', 'respondida']) questions.addQuestion({ user: 'Ana', text });
  questions.setStatus(byText('aprobada').id, 'approved');
  questions.setStatus(byText('respondida').id, 'done');
  questions.setSettings({ atStreamEnd: setting });
  questions.streamEnded();
  return items().map((q) => q.text);
};

test('the end of a stream keeps the queue, clears the finished ones, or clears it all — as chosen', () => {
  assert.deepEqual(endWith('keep'), ['esperando', 'aprobada', 'respondida']);
  assert.deepEqual(endWith('finished'), ['esperando', 'aprobada']);
  assert.deepEqual(endWith('all'), []);
  questions.setSettings({ atStreamEnd: 'keep' });
  assert.ok(read('../engine/questions.js').includes("bus.on('stream:off', () => streamEnded());"), 'nothing calls it when the stream stops');
});

// ------------------------------------------------------------ "Next question"

questions.clear();
let nextRefused = null;
try { questions.control({ op: 'next' }); } catch (err) { nextRefused = err; }
questions.addQuestion({ user: 'Ana', text: 'la siguiente' });
questions.setStatus(byText('la siguiente').id, 'approved');
const nextPressed = questions.control({ op: 'next' });
const nextShowing = questions.getQuestions().showingId;

test('"Next question" takes up the next approved, and says so when there is none', () => {
  assert.ok(/no approved question/.test(nextRefused?.message || ''), 'the button would do nothing and say nothing');
  assert.deepEqual(nextPressed, { ok: true });
  assert.equal(nextShowing, byText('la siguiente').id);
});

test('what everyone sees: the snapshot carries the queue and its settings', () => {
  const snap = engine.snapshot();
  assert.equal(snap.questions.showingId, nextShowing);
  assert.equal(snap.questionSettings.ask.trigger, '!pregunta');
});
questions.clear();

// ------------------------------------------------------------ the screens

test('the Questions screen can edit, add, move on and change the rules', () => {
  const view = read('../../web/components/views/QuestionsView.tsx');
  assert.ok(view.includes("run({ op: 'next' })"), 'no "Next question"');
  assert.ok(view.includes("run({ op: 'edit', id: q.id, text })"), 'a question cannot be edited');
  assert.ok(view.includes("run({ op: 'add', text: newText, user: newAsker })"), 'a question cannot be added by hand');
  assert.ok(view.includes("run({ op: 'settings', settings: { atStreamEnd: choice } })"), 'the end-of-stream choice is missing');
  assert.ok(view.includes('platform?.name') && view.includes('toLocaleTimeString'), 'where a question came from and when is not shown');
  // The row keeps its own editing state, so it cannot be declared inside the screen.
  assert.ok(view.indexOf('const QuestionRow') < view.indexOf('export const QuestionsView'));
});

test('the menu counts what is waiting', () => {
  const app = read('../../web/App.tsx');
  assert.ok(app.includes('number: waitingQuestions || undefined'), 'the menu does not count waiting questions');
  // `0 && …` is 0, and React draws a number: an empty count showed a bare "0".
  const menu = read('../../web/components/NavMenu.tsx');
  assert.ok(menu.includes('{item.number ? (') && !menu.includes('{item.number && ('));
});

test('how viewers ask travels with a backup; what they asked does not', () => {
  const backup = read('../engine/backup.js');
  assert.ok(backup.includes("{ name: 'questions_settings' }"));
  assert.ok(/EXCLUDED = \[[^\]]*'questions'/.test(backup));
});

// ------------------------------------------------------------ from Discord

{
  const queue = () => questions.getQuestions().items;
  const fromDiscord = (msg, over = {}) => bus.emit('discord:message_elsewhere', normaliseChat({
    platform: 'discord', user: 'I_Am_Simon', userId: 'd-simon', msg, raw: { channelId: '1300000000000000001', messageId: '1300000000000000002' }, ...over,
  }));

  questions.clear();
  questions.resetCooldownsForTests();
  questions.setSettings({ ask: { ...questions.DEFAULT_ASK } });

  const sentBefore = discordSent.length;
  fromDiscord('!pregunta que es esto? prueba');
  await settle();
  const askedInDiscord = queue().map((q) => [q.user, q.platform, q.text]);
  const answeredThere = discordSent.slice(sentBefore);

  // Turned off on Connections: commands in the rest of the server do nothing, and neither does this.
  questions.clear();
  questions.resetCooldownsForTests();
  doubles.discordCommandsEverywhere = false;
  fromDiscord('!pregunta ¿y con los comandos apagados?');
  await settle();
  delete doubles.discordCommandsEverywhere;
  const whileCommandsOff = queue().length;

  test('"!pregunta" works in any Discord channel, answered there, unless Discord commands are turned off', () => {
    assert.deepEqual(askedInDiscord, [['I_Am_Simon', 'discord', 'que es esto? prueba']], 'the question asked in Discord went nowhere');
    assert.equal(answeredThere.length, 1, 'nobody was told the question went in');
    const [channelId, text, , , , extra] = answeredThere[0];
    assert.equal(channelId, '1300000000000000001', 'the answer went to another channel');
    assert.equal(text, '¡Pregunta recibida, @I_Am_Simon!');
    assert.deepEqual(extra.message_reference?.message_id, '1300000000000000002', 'the answer is not a reply to the question');
    assert.deepEqual(extra.allowed_mentions, { parse: [] });
    assert.equal(whileCommandsOff, 0, 'it answered with Discord commands turned off');
  });
}
