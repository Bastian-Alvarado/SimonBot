/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Smoke tests: slash commands (server/engine/slash-commands.js). The list
 * registered on the server, a command handed on as the button it stands for,
 * one handed on as the chat word with the word's answer turned into the
 * command's reply, and the shop shown only to whoever asked.
 *
 * Through scripts/smoke.js, after profile-card.js.
 */

import { assert, bus, test } from './harness.js';

const slash = await import('../../engine/slash-commands.js');
const levelChat = await import('../../leveling/chat.js');
const discord = await import('../../platforms/discord.js');
const { config } = await import('../../config.js');

const calls = [];
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init = {}) => {
  if (!String(url).includes('discord.com')) return realFetch(url, init);
  const route = String(url).replace(/^.*\/api\/v10/, '');
  let body = null;
  if (init.body instanceof FormData) body = JSON.parse(init.body.get('payload_json'));
  else if (typeof init.body === 'string') body = JSON.parse(init.body);
  calls.push({ method: init.method, route, body });
  if (route === '/applications/@me') return new Response(JSON.stringify({ id: '900' }), { status: 200 });
  if (/\/commands$/.test(route)) return new Response(JSON.stringify(body), { status: 200 });
  return new Response(JSON.stringify({ id: '1' }), { status: 200 });
};
const tokenBefore = config.discord.botToken;
config.discord.botToken = 'test-token';

const pressed = [];
const onPress = (i) => { if (i.type === 3) pressed.push(i.data.custom_id); };
bus.on('discord:interaction', onPress);
slash.initSlashCommands();
levelChat.initLevelChat({ now: () => Date.now() });

const registered = await slash.register('700000000000000001');
const member = { user: { id: '760000000000000077', username: 'barra' }, roles: [] };
const command = (name, options = [], id = `i-${name}`) => ({ id, token: `tk-${name}`, type: 2, guild_id: '700000000000000001',
  channel_id: '700000000000000600', member, data: { name, options } });

bus.emit('discord:interaction', command('perfil'));
bus.emit('discord:interaction', command('avisame', [{ name: 'donde', value: 'youtube' }]));
bus.emit('discord:interaction', command('avisame', [{ name: 'donde', value: 'stop' }], 'i-stop'));
await new Promise((r) => setTimeout(r, 50));

const before = calls.length;
bus.emit('discord:interaction', command('top'));
await new Promise((r) => setTimeout(r, 2500));
const topCalls = calls.slice(before);

const shopAt = calls.length;
bus.emit('discord:interaction', command('tienda'));
await new Promise((r) => setTimeout(r, 200));
const shop = calls.slice(shopAt).find((c) => c.route === '/interactions/i-tienda/tk-tienda/callback');

// A plain message, not an answer to a command, goes out as it always did.
const plainAt = calls.length;
await discord.sendMessage('700000000000000600', 'hola');
const plain = calls[plainAt];

bus.off('discord:interaction', onPress);
levelChat.stopLevelChat();
discord.setRequestRewrite(null);
globalThis.fetch = realFetch;
config.discord.botToken = tokenBefore;

test('slash commands are registered on the server the app is set to', () => {
  assert.equal(calls.find((c) => c.method === 'PUT')?.route, '/applications/900/guilds/700000000000000001/commands');
  assert.deepEqual(registered.map((c) => c.name), ['perfil', 'rango', 'top', 'tienda', 'puntos', 'sorteo', 'avisame', 'pregunta', 'comando']);
  for (const c of slash.COMMANDS) assert.ok(c.description.length <= 100 && /^[a-z]+$/.test(c.name), c.name);
});

test('a command that is a button is handed on as a press of that button', () => {
  assert.deepEqual(pressed.slice(0, 3), ['profile:me', 'livedm:on:youtube', 'livedm:stop']);
});

test('a command that is a chat word: thinking first, then the word\'s answer becomes the command\'s reply', () => {
  assert.equal(topCalls[0].route, '/interactions/i-top/tk-top/callback');
  assert.equal(topCalls[0].body.type, 5);
  const reply = topCalls.find((c) => c.route === '/webhooks/900/tk-top/messages/@original');
  assert.ok(reply, `the answer was not the command's reply: ${topCalls.map((c) => c.route).join(', ')}`);
  assert.equal(reply.method, 'PATCH');
  assert.equal(reply.body.message_reference, undefined);
  assert.ok(!topCalls.some((c) => c.route === '/channels/700000000000000600/messages'), 'the answer also went to the channel');
});

test('/tienda shows the shop only to whoever asked; other messages are untouched', () => {
  assert.ok(shop, 'the shop was not shown');
  assert.equal(shop.body.data.flags, 64);
  assert.ok(shop.body.data.embeds[0].title.startsWith('Tienda'));
  assert.equal(plain.route, '/channels/700000000000000600/messages');
  assert.equal(plain.method, 'POST');
});
