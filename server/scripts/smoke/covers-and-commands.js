/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Smoke tests: a cover on the schedule's Discord events, and chat commands
 * that work in every channel of the Discord server.
 *
 * Runs in order with the other feature files, on the one engine the harness
 * boots — through scripts/smoke.js, never on its own. After
 * schedule-events.js.
 */

import path from 'node:path';
import { SCRIPT_URL, assert, bus, collection, EVENTS, fs, test } from './harness.js';

const se = await import('../../engine/schedule-events.js');
const discord = await import('../../platforms/discord.js');
const { config } = await import('../../config.js');
const read = (p) => fs.readFileSync(new URL(p, SCRIPT_URL), 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------- the events' cover

const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da63f8ffff3f0005fe02fea7d6a4630000000049454e44ae426082', 'hex');
fs.mkdirSync(config.assetsDir, { recursive: true });
fs.writeFileSync(path.join(config.assetsDir, 'cover-test.png'), PNG);
fs.writeFileSync(path.join(config.assetsDir, 'cover-test.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>');

const GUILD = '900000000000000002';
const discordSettings = collection('discord_settings', {});
const settingsBefore = discordSettings.get();
discordSettings.set({ ...settingsBefore, guildId: GUILD });
const calls = [];
let nextId = 970000000000000000n;
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init = {}) => {
  const u = String(url);
  if (u === 'https://img.test/cover.png') return new Response(PNG, { status: 200, headers: { 'content-type': 'image/png' } });
  if (!u.includes('discord.com')) return realFetch(url, init);
  const method = init.method || 'GET';
  calls.push({ method, path: u.replace(/^.*\/api\/v10/, ''), body: typeof init.body === 'string' ? JSON.parse(init.body) : null });
  if (method === 'POST') { nextId += 1n; return new Response(JSON.stringify({ id: String(nextId) }), { status: 200 }); }
  if (method === 'DELETE') return new Response(null, { status: 204 });
  return new Response('{}', { status: 200 });
};
const realToken = config.discord.botToken;
config.discord.botToken = 'test-token';

const k1 = { id: 'k1', start: new Date(Date.now() + 86_400_000).toISOString(), end: null, title: 'Con portada', category: 'Among Us' };
const schedule = () => bus.emit(EVENTS.CONFIG, { key: 'twitchSchedule', value: { segments: [k1] } });
const settle = async () => { await wait(20); await se.syncScheduleEvents(); };

se.setScheduleEvents({ enabled: true, count: 1, cover: 'picture', coverPicture: 'https://img.test/cover.png' });
await settle();
calls.length = 0;
schedule();
await settle();
const madeWith = calls.find((c) => c.method === 'POST')?.body;
calls.length = 0;
schedule();
await settle();
const unchanged = calls.length;
se.setScheduleEvents({ coverPicture: '/media/cover-test.png' });
await settle();
const newCover = calls.filter((c) => c.method === 'PATCH').map((c) => c.body);
calls.length = 0;
se.setScheduleEvents({ description: 'Otra cosa' });
await settle();
const wordsOnly = calls.filter((c) => c.method === 'PATCH').map((c) => c.body);
calls.length = 0;
se.setScheduleEvents({ cover: 'none' });
await settle();
const takenOff = calls.filter((c) => c.method === 'PATCH').map((c) => c.body);
calls.length = 0;
se.setScheduleEvents({ cover: 'picture', coverPicture: '/media/cover-test.svg' });
await settle();
const svgCalls = calls.length;
se.setScheduleEvents({ enabled: false, cover: 'twitch', coverPicture: '', description: '{game}\n¡Te espero en {link}!' });

globalThis.fetch = realFetch;
config.discord.botToken = realToken;
discordSettings.set(settingsBefore);

test('an event is made with its cover, and the picture is sent again only when the cover changes', () => {
  assert.ok(madeWith?.image?.startsWith('data:image/png;base64,'), 'the event was made without its cover');
  assert.equal(unchanged, 0, 'the same schedule and cover changed the event');
  assert.equal(newCover.length, 1);
  assert.ok(newCover[0].image?.startsWith('data:image/png;base64,'), 'a new cover was not sent');
  assert.equal(wordsOnly.length, 1);
  assert.ok(!('image' in wordsOnly[0]), 'the picture was sent again with new words');
  assert.equal(takenOff[0]?.image, null, 'turning the cover off did not take it off');
  assert.equal(svgCalls, 0, 'an SVG, which Discord cannot take, was sent');
  assert.deepEqual(se.cleanScheduleEvents({ cover: 'sideways', coverPicture: 'javascript:alert(1)' }).cover, 'twitch');
  assert.equal(se.cleanScheduleEvents({ coverPicture: 'javascript:alert(1)' }).coverPicture, '');
  assert.ok(read('../../web/components/views/GoLiveView.tsx').includes('data-schedule-events-cover-choice={value}'));
});

// ---------------------------------------------------------------- commands in every channel

const everywhereBefore = discordSettings.get();
discordSettings.set({ ...everywhereBefore, commandsEverywhere: false });
const off = discord.commandsEverywhere();
discordSettings.set({ ...everywhereBefore, commandsEverywhere: undefined });
const byDefault = discord.commandsEverywhere();
discordSettings.set(everywhereBefore);

test('chat commands work in every Discord channel unless Connections says otherwise', () => {
  assert.equal(off, false);
  assert.equal(byDefault, true, 'commands everywhere is not on by default');
  assert.ok(read('../engine/questions.js').includes('if (deps.discord?.commandsEverywhere?.() === false) return;'));
  assert.ok(read('../../web/components/views/ConnectionsView.tsx').includes('data-discord-commands-everywhere'));
});
