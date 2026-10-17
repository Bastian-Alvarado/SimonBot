/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Smoke tests: Discord as a chat — which messages are the stream's and which
 * only count for levels, who is a moderator there, how its markup reads on
 * other platforms, its emoji in small print, one-role menus moving the
 * reaction with the role.
 *
 * Runs in order with the other feature files, on the one engine the harness
 * boots — through scripts/smoke.js, never on its own. After discord.js, which
 * set leveling and the role menus up.
 */

import { SCRIPT_URL, assert, bus, collection, EVENTS, fs, normaliseChat, test } from './harness.js';

const discord = await import('../../platforms/discord.js');
const roles = await import('../../engine/discord-roles.js');
const leveling = await import('../../leveling/index.js');
const { config } = await import('../../config.js');

const read = (path) => fs.readFileSync(new URL(path, SCRIPT_URL), 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------- which channel, who is a mod

const cache = collection('discord_cache', {});
const cacheBefore = cache.get();
const MOD = String(1n << 40n); // Timeout members
cache.set({
  ...cacheBefore,
  roles: [{ id: 'g1', name: '@everyone', permissions: '1024' }, { id: '333', name: 'Mods', permissions: MOD }, { id: 'r-fan', name: 'Fans', permissions: '1024' }],
  channels: [{ id: '111', name: 'general' }],
});
const cfg = { guildId: 'g1', channelId: 'c-stream' };
const author = { id: '42', username: 'ana', global_name: 'Ana' };
const msg = (over) => ({ id: 'm1', guild_id: 'g1', channel_id: 'c-stream', author, member: { roles: ['r-fan'] }, content: 'hola', ...over });

const inStream = discord.messageFromGateway(msg({}), cfg);
const inGeneral = discord.messageFromGateway(msg({ channel_id: 'c-general' }), cfg);
const otherServer = discord.messageFromGateway(msg({ guild_id: 'g2', channel_id: 'c-x' }), cfg);
const fromABot = discord.messageFromGateway(msg({ author: { ...author, bot: true } }), cfg);
const fromAMod = discord.messageFromGateway(msg({ member: { roles: ['333'] } }), cfg);
const marked = discord.messageFromGateway(msg({
  content: '<@7> mira <#111> <:Wow:999>  <@&333>\n¡hola!',
  mentions: [{ id: '7', username: 'bob', global_name: 'Bob' }],
}), cfg);
cache.set(cacheBefore);

test('the channel the app reads is the stream\'s chat; the rest of the server only counts for levels', () => {
  assert.equal(inStream.where, 'stream');
  assert.equal(inStream.chat.platform, 'discord');
  assert.equal(inStream.chat.user, 'Ana');
  assert.equal(inGeneral.where, 'elsewhere');
  assert.equal(inGeneral.chat.raw.channelId, 'c-general');
  assert.equal(otherServer, null, 'another server\'s message was counted');
  assert.equal(fromABot, null, 'a bot was counted');
  assert.ok(read('../platforms/discord.js').includes("bus.emit(message.where === 'stream' ? EVENTS.CHAT : 'discord:message_elsewhere', message.chat);"));
});

test('somebody whose role can moderate the server is a mod for commands', () => {
  assert.equal(fromAMod.chat.isMod, true);
  assert.equal(inStream.chat.isMod, false);
  const all = [{ id: 'g1', permissions: '0' }, { id: 'r-admin', permissions: '8' }, { id: 'r-msgs', permissions: String(1 << 13) }];
  assert.equal(discord.isModerator('g1', '1', { roles: ['r-admin'] }, all), true, 'an administrator is not a mod');
  assert.equal(discord.isModerator('g1', '1', { roles: ['r-msgs'] }, all), true, 'Manage Messages is not a mod');
  assert.equal(discord.isModerator('g1', '1', { roles: [] }, all), false);
  // A permission everyone has makes everyone a mod.
  assert.equal(discord.isModerator('g1', '1', { roles: [] }, [{ id: 'g1', permissions: '8' }]), true);
  assert.equal(discord.isModerator('g1', '1', null, all), false);
  // The owner, learned when the server comes in; roles kept current as they change.
  const src = read('../platforms/discord.js');
  assert.ok(src.includes('guildOwners.set(d.id, d.owner_id)') && src.includes("case 'GUILD_ROLE_UPDATE':"));
});

test('Discord\'s markup reads as names in plain text', () => {
  assert.equal(marked.chat.raw.plain, '@Bob mira #general :Wow: @Mods ¡hola!');
  assert.equal(marked.chat.msg.startsWith('<@7>'), true, 'the Discord copy itself was changed');
});

// ---------------------------------------------------------------- small print

test('a server emoji in a footer or author line becomes its picture instead of showing as code', () => {
  assert.deepEqual(discord.smallPrint('<:Wow:123> Bienvenido', 'text', 2048), { text: 'Bienvenido', icon_url: 'https://cdn.discordapp.com/emojis/123.png' });
  assert.deepEqual(discord.smallPrint('Hola <a:Dance:55> amigos', 'text', 2048), { text: 'Hola amigos', icon_url: 'https://cdn.discordapp.com/emojis/55.gif' });
  assert.deepEqual(discord.smallPrint('<:Wow:1>', 'name', 256), { name: '​', icon_url: 'https://cdn.discordapp.com/emojis/1.png' });
  assert.deepEqual(discord.smallPrint('Hola 👋', 'text', 2048), { text: 'Hola 👋' });
});

test('a long line keeps up to 500 characters; a name stays short', () => {
  assert.equal(discord.sanitise('a'.repeat(450), 500).length, 450);
  assert.equal(discord.sanitise('b'.repeat(300)).length, 200);
  // Cut before escaping, so a line never ends on half an escape.
  assert.ok(!discord.sanitise(`${'c'.repeat(199)}*`).endsWith('\\'));
});

// ---------------------------------------------------------------- one-role menus

const calls = [];
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init = {}) => {
  calls.push(`${init.method || 'GET'} ${String(url).replace(/^.*\/api\/v10/, '')}`);
  return new Response(null, { status: 204 });
};
const realToken = config.discord.botToken;
config.discord.botToken = 'test-token';
roles.store.setReactionRoles([{
  messageId: 'rm2', channelId: 'ch1', guildId: 'g1', name: 'Equipo', mode: 'unique',
  mappings: [{ emoji: '🔴', roleId: 'r-red' }, { emoji: '🔵', roleId: 'r-blue' }, { emoji: '<:Wow:999>', roleId: 'r-wow' }],
}]);
bus.emit('discord:reaction_add', { message_id: 'rm2', channel_id: 'ch1', guild_id: 'g1', user_id: '5151', emoji: { name: '🔵' }, member: { nick: 'Azul' } });
await wait(900);
roles.store.setReactionRoles([]);
config.discord.botToken = realToken;
globalThis.fetch = realFetch;

test('a menu that allows one role moves the member\'s reaction along with the role', () => {
  assert.ok(calls.includes('DELETE /guilds/g1/members/5151/roles/r-red'));
  assert.ok(calls.includes(`DELETE /channels/ch1/messages/rm2/reactions/${encodeURIComponent('🔴')}/5151`), 'the old reaction was left on');
  assert.ok(calls.includes(`DELETE /channels/ch1/messages/rm2/reactions/${encodeURIComponent('Wow:999')}/5151`), 'a server emoji reaction was left on');
  assert.ok(!calls.some((c) => c.includes(encodeURIComponent('🔵'))), 'the new choice\'s reaction was taken off');
  assert.ok(calls.includes('PUT /guilds/g1/members/5151/roles/r-blue'));
});

// ---------------------------------------------------------------- levels from the whole server

const levelCfg = leveling.getConfig();
leveling.setConfig({ enabled: true, ignoredChannelIds: ['111222'] });
const elsewhere = (id, channelId) => bus.emit('discord:message_elsewhere', normaliseChat({
  platform: 'discord', user: `Talker${id}`, userId: `talker${id}`, msg: 'hey', raw: { guildId: 'g1', channelId },
}));
elsewhere('1', 'c-general');
elsewhere('2', '111222');
await wait(50);
const talkers = Object.values(leveling.getUsers()).filter((u) => /^Talker/.test(u.username)).map((u) => [u.username, u.xp > 0]);
leveling.setConfig(levelCfg);

test('talking anywhere in the server earns XP, except in the channels set to be left out', () => {
  assert.deepEqual(talkers, [['Talker1', true]]);
  assert.ok(read('../leveling/index.js').includes("bus.on('discord:message_elsewhere', onMessage);"));
});
