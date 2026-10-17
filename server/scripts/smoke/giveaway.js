/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Smoke tests: the giveaway — entered by typing the word in Discord or with
 * its button, by the rules set; drawn and told at once; drawn again without
 * the one passed over.
 *
 * Runs in order with the other feature files, on the one engine the harness
 * boots — through scripts/smoke.js, never on its own. After discord.js
 * (levels and role menus are set up).
 */

import { SCRIPT_URL, assert, bus, collection, engine, EVENTS, fs, normaliseChat, test } from './harness.js';

const giveaway = await import('../../engine/giveaway.js');
const shared = await import('../../../shared/giveaway.js');
const leveling = await import('../../leveling/index.js');
const { config } = await import('../../config.js');
const read = (path) => fs.readFileSync(new URL(path, SCRIPT_URL), 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const refused = async (fn) => { try { await fn(); return null; } catch (err) { return err; } };

// ---------------------------------------------------------------- the draw itself

const sequence = (values) => { let i = 0; return () => values[i++ % values.length]; };
const pool = { 'twitch:a': { name: 'Ana', tickets: 1 }, 'twitch:b': { name: 'Bob', tickets: 3 }, 'youtube:c': { name: 'Caro', tickets: 1 } };

test('winners are drawn by their tickets, never the same one twice, and never one left out', () => {
  // 5 tickets: Ana 0-1, Bob 1-4, Caro 4-5.
  assert.equal(shared.pickWinners(pool, 1, [], () => 0.1)[0].name, 'Ana');
  assert.equal(shared.pickWinners(pool, 1, [], () => 0.5)[0].name, 'Bob');
  assert.equal(shared.pickWinners(pool, 1, [], () => 0.99)[0].name, 'Caro');
  assert.deepEqual(shared.pickWinners(pool, 3, [], sequence([0.5, 0.5, 0.5])).map((w) => w.name).sort(), ['Ana', 'Bob', 'Caro']);
  assert.deepEqual(shared.pickWinners(pool, 2, ['twitch:b'], () => 0.1).map((w) => w.name), ['Ana', 'Caro']);
  assert.deepEqual(shared.pickWinners({}, 1), []);
  assert.equal(shared.cleanKeyword('Sorteo extra'), '!sorteo');
  assert.equal(shared.cleanKeyword(''), '!sorteo');
  assert.equal(shared.cleanDuration(5000), 30_000);
  assert.equal(shared.cleanDuration(0), 0);
  assert.deepEqual(shared.cleanRules({ subLuck: 9, platforms: ['twitch'], subsOnly: true, minLevel: 3, discordRole: '777000000000000009' }), { minLevel: 3, discordRole: '777000000000000009' });
});

// ---------------------------------------------------------------- running one

const calls = [];
let nextId = 960000000000000000n;
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init = {}) => {
  const u = String(url);
  if (!u.includes('discord.com')) return realFetch(url, init);
  const path = u.replace(/^.*\/api\/v10/, '');
  const method = init.method || 'GET';
  calls.push({ method, path, body: typeof init.body === 'string' ? JSON.parse(init.body) : null });
  if (method === 'POST' && path.endsWith('/messages')) { nextId += 1n; return new Response(JSON.stringify({ id: String(nextId) }), { status: 200 }); }
  return new Response('{}', { status: 200 });
};
const realToken = config.discord.botToken;
config.discord.botToken = 'test-token';
// The channel the bot talks in: where opening and winning are said.
const discordSettings = collection('discord_settings', {});
const settingsBefore = discordSettings.get();
discordSettings.set({ ...settingsBefore, channelId: '700000000000000004' });
const saidIn = () => calls.filter((c) => c.method === 'POST' && c.path === '/channels/700000000000000004/messages').map((c) => c.body.content);

const noPrize = await refused(() => giveaway.control('open', { prize: '' }));
const noneToDraw = await refused(() => giveaway.control('draw'));
await giveaway.control('settings', { announce: true, postToDiscord: true, discordChannelId: '700000000000000003' });
await giveaway.control('setDraft', { prize: 'Un juego de Steam', keyword: 'sorteo', winnersCount: 1, durationMs: 0, rules: {} });
const saidBefore = saidIn().length;
await giveaway.control('open');
const opened = giveaway.getState();
const openPost = calls.find((c) => c.method === 'POST' && c.path === '/channels/700000000000000003/messages');
const twice = await refused(() => giveaway.control('open'));

const chat = (over) => bus.emit(EVENTS.CHAT, normaliseChat({ platform: 'discord', msg: '!sorteo', raw: { channelId: '700000000000000004' }, ...over }));
chat({ user: 'Ana', userId: 'ga1' });
chat({ user: 'Ana', userId: 'ga1' });
chat({ user: 'Caro', userId: 'gc1', msg: '!SORTEO ya' });
chat({ user: 'Twitchero', userId: 'gt1', platform: 'twitch' });
chat({ user: 'Bot', userId: 'gbot', isBot: true });
chat({ user: 'Otro', userId: 'go1', msg: 'quiero entrar al !sorteo' });
// Typed in another channel of the server.
bus.emit('discord:message_elsewhere', normaliseChat({ platform: 'discord', user: 'Dani', userId: 'gd1', msg: '!sorteo', raw: { channelId: '1', roles: [] } }));

// The button on the post, and one from an older giveaway's post.
const press = (id, custom = `giveaway:enter:${opened.openedAt}`) => giveaway.onInteraction({
  type: 3, id: `i${id}`, token: 'tok', data: { custom_id: custom }, member: { nick: `Btn${id}`, roles: [], user: { id: `88800000000000000${id}`, username: `btn${id}` } },
});
const pressed = await press(1);
const pressedAgain = await press(1);
const oldButton = await press(2, 'giveaway:enter:123');
const replies = calls.filter((c) => c.path.startsWith('/interactions/')).map((c) => c.body.data.content);
await wait(400);
const entered = giveaway.getState();

test('opening says so in the bot\'s channel, posts with a button, and refuses a second one or one with no prize', () => {
  assert.equal(noPrize?.code, 'giveaway_no_prize');
  assert.equal(noneToDraw?.code, 'giveaway_none');
  assert.equal(twice?.code, 'giveaway_running');
  assert.equal(opened.mode, 'open');
  assert.equal(opened.keyword, '!sorteo');
  assert.ok(saidIn().slice(saidBefore).some((s) => s.startsWith('🎁 ¡Sorteo de Un juego de Steam! Escribe !sorteo para participar')), 'the channel was not told');
  const button = openPost?.body?.components?.[0]?.components?.[0];
  assert.equal(button?.custom_id, `giveaway:enter:${opened.openedAt}`);
  assert.equal(openPost.body.embeds[0].title, '🎁 Un juego de Steam');
});

test('people enter from Discord and the button — once each — and the bot, other platforms and other words do not', () => {
  const names = entered.entrants.map((e) => `${e.name}:${e.platform}`).sort();
  assert.deepEqual(names, ['Ana:discord', 'Btn1:discord', 'Caro:discord', 'Dani:discord']);
  assert.equal(entered.count, 4);
  assert.deepEqual([pressed.ok, pressedAgain.why, oldButton.why], [true, 'already', 'closed']);
  assert.deepEqual(replies, ['¡Estás dentro del sorteo! 🍀', 'Ya estás dentro. ¡Suerte!', 'Este sorteo ya está cerrado.']);
});

// The rules, on their own.
await giveaway.control('setDraft', { rules: { minLevel: 3 } });
await giveaway.control('reset');
await giveaway.control('open');
const someone = Object.values(leveling.getUsers()).find((u) => u.level >= 3);
const levelRule = [giveaway.enter({ platform: 'discord', userId: 'nolevel', name: 'Nuevo' }).why];
await giveaway.control('setDraft', { rules: { minLevel: 0, discordRole: '777000000000000009' } });
await giveaway.control('reset');
await giveaway.control('open');
const roleRule = [giveaway.enter({ platform: 'discord', userId: 'r1', name: 'SinRol', roles: [] }).why, giveaway.enter({ platform: 'discord', userId: 'r2', name: 'ConRol', roles: ['777000000000000009'] }).ok];

test('a lowest level and a Discord role keep out who they should', () => {
  assert.deepEqual(levelRule, ['level']);
  assert.ok(someone === undefined || someone.level >= 3);
  assert.deepEqual(roleRule, ['role', true]);
});

// ---------------------------------------------------------------- the draw

await giveaway.control('setDraft', { rules: { discordRole: '' }, winnersCount: 1 });
await giveaway.control('reset');
calls.length = 0;
await giveaway.control('open');
for (const [id, name] of [['w1', 'Uno'], ['w2', 'Dos'], ['w3', 'Tres']]) giveaway.enter({ platform: 'discord', userId: id, name });
giveaway.enter({ platform: 'discord', userId: '999000000000000001', name: 'Disco' });
const events = [];
const onEvent = (e) => { if (e.type === 'giveaway_winner') events.push(e); };
bus.on(EVENTS.EVENT, onEvent);
const saidBeforeDraw = saidIn().length;
const drawn = giveaway.draw({ random: () => 0.99 });
// Discord's edits go one at a time through its queue: the closing, then the winner.
await wait(1200);
const toldAfter = saidIn().slice(saidBeforeDraw);
const closedPatch = calls.find((c) => c.method === 'PATCH' && c.body?.components?.[0]?.components?.[0]?.disabled === true && /Cerrado/.test(c.body.embeds[0].description));
const winnerPatch = calls.find((c) => c.method === 'PATCH' && /Ganador/.test(c.body?.embeds?.[0]?.description || ''));
const firstWinner = drawn.winners[0];
const rerolled = giveaway.draw({ reroll: true, random: () => 0.99 });
await wait(1200);
bus.off(EVENTS.EVENT, onEvent);
await giveaway.control('remove', 'discord:w1');
const afterRemove = giveaway.getState().count;
await giveaway.control('reset');
const cleared = giveaway.getState();

await giveaway.control('settings', { postToDiscord: false, discordChannelId: '' });
discordSettings.set(settingsBefore);
globalThis.fetch = realFetch;
config.discord.botToken = realToken;

test('drawing closes entries, and tells the channel, the post and viewer history who won', () => {
  assert.equal(drawn.mode, 'drawn');
  assert.equal(firstWinner.name, 'Disco');
  assert.ok(toldAfter.includes('🎉 ¡Disco ganó Un juego de Steam! Felicidades.'));
  assert.ok(closedPatch, 'the Discord post was not closed');
  assert.ok(winnerPatch, 'the Discord post was not given the winner');
  assert.ok(winnerPatch.body.embeds[0].description.includes('<@999000000000000001>'), 'a Discord winner was not pinged');
  assert.deepEqual(winnerPatch.body.allowed_mentions, { parse: [], users: ['999000000000000001'] });
  assert.equal(events[0]?.user, 'Disco');
  assert.equal(events[0]?.data.prize, 'Un juego de Steam');
});

test('drawing again passes over the last winner; somebody can be taken out; clearing keeps the setup', () => {
  assert.notEqual(rerolled.winners[0].name, 'Disco');
  assert.equal(rerolled.winners.length, 1);
  assert.equal(events.length, 2);
  assert.equal(events[1].data.reroll, true);
  assert.equal(afterRemove, 3);
  assert.equal(cleared.mode, 'idle');
  assert.equal(cleared.count, 0);
  assert.equal(cleared.draft.prize, 'Un juego de Steam', 'clearing lost the setup');
});

// ---------------------------------------------------------------- around it

test('tonight\'s entrants stay out of backups, and the giveaway has its own screen', () => {
  const backup = read('../engine/backup.js');
  assert.ok(/EXCLUDED = \[[^\]]*'giveaway'/.test(backup) && backup.includes("{ name: 'giveaway_settings' },"));
  assert.ok(read('../../web/App.tsx').includes("{view === 'giveaway' && ("));
  assert.ok(typeof engine.store.giveaway === 'function');
  assert.ok(collection('giveaway', {}).get().mode === 'idle');
});
