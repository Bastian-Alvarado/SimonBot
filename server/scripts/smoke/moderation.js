/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Smoke tests: the Discord mod log (server/engine/moderation.js) — a ban or
 * a timeout in the server written in the log channel and kept for the
 * Moderators screen; the same timeout told twice written once; and nothing
 * posted while no log channel is chosen.
 *
 * Runs in order with the other feature files, on the one engine the harness
 * boots — through scripts/smoke.js, never on its own. After game-requests.js.
 */

import { SCRIPT_URL, assert, bus, fs, test } from './harness.js';

const moderation = await import('../../engine/moderation.js');
const { config } = await import('../../config.js');
moderation.initModeration();

const LOG = '700000000000009001';
const calls = [];
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init = {}) => {
  if (!String(url).includes('discord.com')) return realFetch(url, init);
  const route = String(url).replace(/^.*\/api\/v10/, '');
  calls.push({ method: init.method || 'GET', route, body: typeof init.body === 'string' ? JSON.parse(init.body) : null });
  return new Response(JSON.stringify({ id: '1' }), { status: 200 });
};
const tokenBefore = config.discord.botToken;
config.discord.botToken = 'test-token';
const posted = () => calls.filter((c) => c.method === 'POST' && c.route === `/channels/${LOG}/messages`);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// No log channel yet: kept for the screen, posted nowhere.
moderation.control({ settings: { logChannelId: '' } });
bus.emit('discord:member_ban', { user: { id: '880000000000005500', username: 'antes' } });
await wait(100);
const nowhere = posted().length;

const saved = await moderation.control({ settings: { logChannelId: LOG } });
const badChannel = await moderation.control({ settings: { logChannelId: 'not-a-channel' } });
await moderation.control({ settings: { logChannelId: LOG } });

// Banned in Discord: into the log.
bus.emit('discord:member_ban', { user: { id: '880000000000005501', username: 'trol', global_name: 'Trol_D' } });
await wait(200);
const ban = posted().at(-1);
// Timed out: logged once, however many times Discord tells of the same timeout.
const until = new Date(Date.now() + 3_600_000).toISOString();
moderation._test.onDiscordMember({ user: { id: '880000000000005502', username: 'otro' }, communication_disabled_until: until });
moderation._test.onDiscordMember({ user: { id: '880000000000005502', username: 'otro' }, communication_disabled_until: until });
await wait(200);
const afterTimeout = posted();
const kept = await moderation.control({ op: 'log' });

moderation.control({ settings: { logChannelId: '' } });
globalThis.fetch = realFetch;
config.discord.botToken = tokenBefore;

test('a ban in Discord is written in the mod log, naming them, pinging nobody', () => {
  assert.equal(nowhere, 0, 'something was posted with no log channel');
  assert.equal(saved.logChannelId, LOG);
  assert.equal(badChannel.logChannelId, '', 'a channel that is not one was kept');
  assert.ok(ban, 'nothing in the mod log');
  assert.equal(ban.body.embeds[0].title, '🔨 Ban');
  assert.match(ban.body.embeds[0].description, /Trol\\_D/);
  assert.match(ban.body.embeds[0].description, /<@880000000000005501>/);
  assert.deepEqual(ban.body.allowed_mentions, { parse: [] });
});

test('a timeout is logged once, and the latest are kept for the Moderators screen', () => {
  const timeouts = afterTimeout.filter((c) => c.body.embeds[0].title.startsWith('⏳ Timeout'));
  assert.equal(timeouts.length, 1, 'the same timeout was logged twice');
  assert.match(timeouts[0].body.embeds[0].title, /\(1 h\)|\(60 min\)/);
  assert.deepEqual(kept.slice(0, 3).map((e) => e.kind), ['timeout', 'ban', 'ban']);
  const view = fs.readFileSync(new URL('../../web/components/views/ModeratorsView.tsx', SCRIPT_URL), 'utf8');
  assert.ok(view.includes('data-mod-log-channel') && view.includes("modLog.save('settings'"), 'the log channel cannot be chosen on the Moderators screen');
});
