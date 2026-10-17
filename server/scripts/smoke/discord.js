/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Smoke tests: the Discord bot's own jobs — welcoming and seeing off members,
 * and signing in with Discord from the dashboard.
 *
 * Runs in order with the other feature files, on the one engine the harness
 * boots — through scripts/smoke.js, never on its own. The Discord module was
 * set up by the voice tests before this file.
 */

import { SCRIPT_URL, assert, fs, test } from './harness.js';

const roles = await import('../../engine/discord-roles.js');
const discord = await import('../../platforms/discord.js');

// ---------------------------------------------------------------- welcome and goodbye

const simon = { id: '306050655881793586', username: 'i_am_simon', global_name: 'I_Am_Simon', avatar: 'abc123' };

// How the phone's welcome is actually set up: a card, no text line.
const cardOnly = {
  enabled: true, channelId: '1', messages: [], message: '',
  sendCard: true, cardTitle: '', cardDescription: 'Saluditos {user} Bienvenido!', cardFooter: 'Hola {user}',
  cardColor: '#409642', cardThumbnail: true,
};
const welcomeCard = roles.greetingFor(cardOnly, simon, true);
const goodbyeCard = roles.greetingFor({ ...cardOnly, cardDescription: 'Chales, se nos fue {user}' }, simon, false);
const lineOnly = roles.greetingFor({ enabled: true, messages: ['Welcome {user} ({username})!'], sendCard: false }, simon, true);
const nothing = roles.greetingFor({ enabled: true, messages: [], sendCard: false }, simon, true);
const emptyCard = roles.greetingFor({ enabled: true, messages: [], sendCard: true, cardDescription: '' }, simon, true);
const nasty = roles.greetingFor({ messages: ['hi {username}'] }, { id: '1', global_name: '@everyone **bold**' }, true);

test('a welcome set up as a card, with no text line, is posted', () => {
  assert.ok(welcomeCard, 'a card-only welcome posted nothing');
  assert.equal(welcomeCard.content, '');
  // A mention in the description, where Discord draws one; the name in the footer, where it would be raw markup.
  assert.equal(welcomeCard.embed.description, `Saluditos <@${simon.id}> Bienvenido!`);
  assert.equal(welcomeCard.embed.footer, 'Hola I\\_Am\\_Simon');
  assert.equal(welcomeCard.embed.thumbnail, `https://cdn.discordapp.com/avatars/${simon.id}/abc123.png`);
});

test('a goodbye card is sent too, naming rather than mentioning somebody who has left', () => {
  assert.ok(goodbyeCard?.embed, 'the goodbye card was dropped');
  assert.equal(goodbyeCard.embed.description, 'Chales, se nos fue I\\_Am\\_Simon');
});

test('a text line still works alone, and nothing to say posts nothing', () => {
  assert.equal(lineOnly.content, `Welcome <@${simon.id}> (I\\_Am\\_Simon)!`);
  assert.equal(lineOnly.embed, undefined);
  assert.equal(nothing, null);
  assert.equal(emptyCard, null, 'an empty card was posted');
  // A display name cannot ping everyone or format the message.
  assert.ok(!nasty.content.includes('@everyone') && nasty.content.includes('\\*\\*'), nasty.content);
});

// ---------------------------------------------------------------- signing in with Discord

/*
  The token exchange is caught before it leaves: what matters is what would
  have been sent. It used to send the two getter functions themselves, so
  Discord was given source code as the id and secret and every sign-in failed.
*/
discord.setSettings({ clientId: '1306050655881793586', clientSecret: 'test-secret' });
const sent = [];
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init = {}) => {
  sent.push({ url: String(url), body: init.body ? String(init.body) : '' });
  const json = String(url).endsWith('/oauth2/token') ? { access_token: 'tok' } : String(url).endsWith('/guilds') ? [] : { id: '9', username: 'someone' };
  return new Response(JSON.stringify(json), { status: 200, headers: { 'Content-Type': 'application/json' } });
};
let signedIn = null;
let signInError = null;
try {
  signedIn = await discord.exchangeCode('the-code', 'http://localhost/callback');
} catch (err) {
  signInError = err;
} finally {
  globalThis.fetch = realFetch;
}
discord.setSettings({ clientId: '', clientSecret: null });

test('signing in with Discord sends the real client id and secret', () => {
  assert.equal(signInError, null, signInError?.message);
  const exchange = sent.find((r) => r.url.endsWith('/oauth2/token'));
  const form = new URLSearchParams(exchange.body);
  assert.equal(form.get('client_id'), '1306050655881793586');
  assert.equal(form.get('client_secret'), 'test-secret');
  assert.equal(form.get('code'), 'the-code');
  assert.equal(signedIn.user.username, 'someone');
});

// ---------------------------------------------------------------- shared by the tests below

const { config } = await import('../../config.js');
const { bus, EVENTS, normaliseChat } = await import('../../core/bus.js');
const leveling = await import('../../leveling/index.js');

leveling.initLeveling();
roles.initDiscordRoles();
const realToken = config.discord.botToken;

// ---------------------------------------------------------------- button role menus reach Discord

const rows = roles.buttonRows([
  ...Array.from({ length: 7 }, (_, i) => ({ label: `R${i}`, roleId: `role${i}`, style: String((i % 4) + 1) })),
  { label: 'Again', roleId: 'role0', style: '1' },
  { label: 'Custom', roleId: 'rc', style: '9', emoji: '<a:party:112233445566>' },
  { label: '', roleId: 'rx', emoji: '🎮' },
]);

const menuCalls = [];
let messageGone = false;
const realFetch3 = globalThis.fetch;
globalThis.fetch = async (url, init = {}) => {
  const method = init.method || 'GET';
  menuCalls.push({ method, path: String(url).replace(/^.*\/api\/v10/, ''), body: init.body ? JSON.parse(init.body) : null });
  if (method === 'PATCH' && messageGone) return new Response(JSON.stringify({ message: 'Unknown Message', code: 10008 }), { status: 404 });
  if (method === 'POST') return new Response(JSON.stringify({ id: `msg${menuCalls.length}` }), { status: 200 });
  return new Response(JSON.stringify({ id: 'same' }), { status: 200 });
};
config.discord.botToken = 'test-token';
roles.store.setButtonMenus([{ id: 'm1', name: 'Pronouns', channelId: '42', messageId: '', content: 'Pick yours', buttons: [{ label: 'he/him', roleId: '777', style: '3' }] }]);
const firstPost = await roles.publishButtonMenu('m1');
const savedId = roles.snapshot().discordButtonConfigs[0].messageId;
const secondPost = await roles.publishButtonMenu('m1');
messageGone = true;
const afterDeleted = await roles.publishButtonMenu('m1');
messageGone = false;
let noButtons = null;
roles.store.setButtonMenus([...roles.snapshot().discordButtonConfigs, { id: 'm2', name: 'Empty', channelId: '42', buttons: [{ label: 'x', roleId: '' }] }]);
try { await roles.publishButtonMenu('m2'); } catch (err) { noButtons = err.message; }
await roles.unpublishButtonMenu('m1');
config.discord.botToken = realToken;
globalThis.fetch = realFetch3;
roles.store.setButtonMenus([]);

test('a button menu becomes rows of five buttons, one per role, as Discord wants them', () => {
  assert.deepEqual(rows.map((r) => r.components.length), [5, 4]);
  const all = rows.flatMap((r) => r.components);
  assert.equal(all.filter((b) => b.custom_id === 'role:role0').length, 1, 'two buttons shared a role, which Discord refuses');
  const custom = all.find((b) => b.custom_id === 'role:rc');
  assert.deepEqual(custom.emoji, { id: '112233445566', name: 'party', animated: true });
  assert.equal(custom.style, 1, 'a style Discord does not have was kept');
  const unicode = all.find((b) => b.custom_id === 'role:rx');
  assert.deepEqual(unicode.emoji, { name: '🎮' });
  assert.equal(unicode.label, undefined);
});

test('a saved menu is posted with its buttons, then edited in place, and posted again if deleted in Discord', () => {
  const post = menuCalls.find((c) => c.method === 'POST');
  assert.equal(post.path, '/channels/42/messages');
  assert.equal(post.body.components[0].components[0].custom_id, 'role:777');
  assert.equal(savedId, firstPost.messageId, 'the posted message was not remembered, so presses could never be matched to it');
  assert.equal(secondPost.messageId, firstPost.messageId);
  assert.ok(menuCalls.some((c) => c.method === 'PATCH' && c.path === `/channels/42/messages/${firstPost.messageId}`), 'the second publish did not edit the message');
  assert.notEqual(afterDeleted.messageId, firstPost.messageId, 'a menu deleted in Discord was not posted again');
  assert.match(noButtons || '', /at least one button/);
  assert.ok(menuCalls.some((c) => c.method === 'DELETE' && c.path.startsWith('/channels/42/messages/')), 'deleting the menu left its message in Discord');
  const strings = fs.readFileSync(new URL('../../web/constants.ts', SCRIPT_URL), 'utf8');
  for (const key of ['buttonMenuPosted', 'buttonMenuNotPosted', 'buttonMenuPost', 'buttonMenuUpdate']) assert.equal(strings.split(key + ':').length - 1, 2, key);
});

// ---------------------------------------------------------------- the activity log says who, by name

const logCalls = [];
const realFetch5 = globalThis.fetch;
globalThis.fetch = async (url, init = {}) => {
  const path = String(url).replace(/^.*\/api\/v10/, '');
  logCalls.push(`${init.method || 'GET'} ${path}`);
  if (/\/members\/6666666666$/.test(path)) return new Response(JSON.stringify({ user: { username: 'azul', global_name: 'Azulado' } }), { status: 200 });
  return new Response(null, { status: 204 });
};
config.discord.botToken = 'test-token';
roles.store.clearActivityLog();
roles.store.setReactionRoles([{ messageId: 'rm1', guildId: 'g1', name: 'Colores', mode: 'normal', mappings: [{ emoji: '🔴', roleId: 'r-red', roleName: 'Red' }] }]);
bus.emit('discord:reaction_add', { message_id: 'rm1', guild_id: 'g1', user_id: '5555555555', emoji: { name: '🔴' }, member: { nick: 'Rojito', user: { username: 'rojo' } } });
await new Promise((r) => setTimeout(r, 700));
// Taking a reaction off comes without the member: remembered from before, or asked for once.
bus.emit('discord:reaction_remove', { message_id: 'rm1', guild_id: 'g1', user_id: '5555555555', emoji: { name: '🔴' } });
bus.emit('discord:reaction_remove', { message_id: 'rm1', guild_id: 'g1', user_id: '6666666666', emoji: { name: '🔴' } });
await new Promise((r) => setTimeout(r, 1200));
const namedLog = roles.snapshot().roleActivityLog.map((e) => [e.user, e.userId, e.action]);
config.discord.botToken = realToken;
globalThis.fetch = realFetch5;
roles.store.setReactionRoles([]);

test('the role activity log names people rather than showing their Discord id', () => {
  assert.deepEqual(namedLog.slice().reverse(), [
    ['Rojito', '5555555555', 'added'],
    ['Rojito', '5555555555', 'removed'],
    ['Azulado', '6666666666', 'removed'],
  ]);
  // Rojito was named by the reaction itself: nobody asked Discord who they were.
  assert.ok(!logCalls.some((c) => c.startsWith('GET') && c.endsWith('/members/5555555555')), 'a known name was looked up again');
});

// ---------------------------------------------------------------- the bot is not a top chatter

{
  const say = (over) => bus.emit(EVENTS.CHAT, normaliseChat({ platform: 'discord', msg: 'hola', raw: { channelId: 'c1' }, ...over }));
  say({ user: 'SimonBot', userId: '9002', isBot: true });
  say({ user: 'Fan', userId: '7777' });
  await new Promise((r) => setTimeout(r, 50));
  const board = leveling.leaderboard().map((u) => u.username);
  const everyone = Object.values(leveling.getUsers()).map((u) => u.username);

  test('the bot keeps its XP, but is not ranked among the people talking; nor is the server\'s owner', () => {
    assert.ok(board.includes('Fan'), 'a member is missing from the board');
    assert.ok(!board.includes('SimonBot'), 'the bot is ranked');
    assert.ok(everyone.includes('SimonBot'), 'the bot lost its XP');
    assert.equal(normaliseChat({ platform: 'discord', user: 'x', isBot: true }).isBot, true, 'a chat message forgets it came from the bot');
    const src = fs.readFileSync(new URL('../leveling/index.js', SCRIPT_URL), 'utf8');
    assert.ok(src.includes('discord.ownerOf(status.guildId)'), 'the server owner is not left off the board');
  });
}
