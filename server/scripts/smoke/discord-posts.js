/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Smoke tests: the bot posting on its own — who a message may ping, the
 * going-live announcement and what becomes of it when the stream stops, and
 * the daily subscriber list that takes away roles from subscriptions that
 * ran out.
 *
 * Runs in order with the other feature files, on the one engine the harness
 * boots — through scripts/smoke.js, never on its own. Role sync was set up
 * by the Discord tests before this file.
 */

import { SCRIPT_URL, assert, fs, bus, EVENTS, test } from './harness.js';

const discord = await import('../../platforms/discord.js');
const announcer = await import('../../engine/announce.js');
const roleSync = await import('../../engine/role-sync.js');
const roles = await import('../../engine/discord-roles.js');
const { config } = await import('../../config.js');

// ---------------------------------------------------------------- who a message pings

const pings = discord.mentionsFrom('<@&111111111> and <@&222222222>, <@&111111111> again, @everyone');
const quiet = discord.mentionsFrom('hello {user}');

test('a role written into a message pings; a viewer typing @everyone pings nobody', () => {
  assert.deepEqual(pings, { parse: ['users', 'everyone'], roles: ['111111111', '222222222'] });
  assert.deepEqual(quiet, { parse: ['users'], roles: [] });
});

// ---------------------------------------------------------------- the going-live post

const info = { login: 'simon', name: 'I_Am_Simon', url: 'https://twitch.tv/simon', live: true, title: 'Among Us @everyone con amigos', game: 'Among Us', thumbnail: 'https://thumb/1280x720.jpg?t=1' };
const base = announcer.cleanAnnounce({ channelId: '700000000000000002', message: '{role} {streamer} está en vivo! {title} {link}', youtubeUrl: 'https://youtube.com/@simon/live', tiktokUrl: 'javascript:alert(1)' });
const toRole = announcer.postFor({ ...base, roleId: '800000000000000001' }, info);
const toAll = announcer.postFor({ ...base, roleId: 'everyone' }, info);
const toNobody = announcer.postFor({ ...base, roleId: '', card: false }, null);
const cleaned = announcer.cleanAnnounce({ channelId: 'not-an-id', roleId: '<@&1>', delaySeconds: 99999, whenOver: 'explode', cardColor: 'red' });

test('the going-live post pings only the chosen role, names the stream and links to it', () => {
  assert.equal(toRole.content, '<@&800000000000000001> I\\_Am\\_Simon está en vivo! Among Us @​everyone con amigos https://twitch.tv/simon');
  assert.deepEqual(toRole.allowed_mentions, { parse: [], roles: ['800000000000000001'] });
  assert.deepEqual(toAll.allowed_mentions, { parse: ['everyone'] });
  assert.ok(toAll.content.startsWith('@everyone I\\_Am\\_Simon'), toAll.content);
  assert.equal(toRole.embed.author, 'I_Am_Simon · LIVE');
  assert.equal(toRole.embed.url, 'https://twitch.tv/simon');
  assert.equal(toRole.embed.image, info.thumbnail);
  assert.equal(toRole.embed.description, '**Among Us**');
  // Twitch and YouTube buttons; a link that is not a web address is dropped rather than made a button.
  assert.deepEqual(toRole.components[0].components.map((b) => [b.style, b.label, b.url]), [
    [5, 'Twitch', 'https://twitch.tv/simon'],
    [5, 'YouTube', 'https://youtube.com/@simon/live'],
  ]);
});

test('with nobody to ping and Twitch saying nothing, it still posts, pinging nobody', () => {
  assert.equal(toNobody.content, 'está en vivo!');
  assert.deepEqual(toNobody.allowed_mentions, { parse: [], roles: [] });
  assert.equal(toNobody.embed, undefined);
  assert.equal(toNobody.components[0].components.length, 1, 'only the YouTube button should be left');
});

test('going-live settings are cleaned on the way in', () => {
  assert.equal(cleaned.channelId, '');
  assert.equal(cleaned.roleId, '');
  assert.equal(cleaned.delaySeconds, 600);
  assert.equal(cleaned.whenOver, 'edit');
  assert.equal(cleaned.cardColor, '#9146ff');
});

/*
  The whole run, with every call to Discord caught. Twitch is not connected
  in the tests, so the post goes out as soon as the wait is over.
*/
const calls = [];
let nextId = 900000000000000001n;
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init = {}) => {
  const path = String(url).replace(/^.*\/api\/v10/, '');
  const method = init.method || 'GET';
  calls.push({ method, path, body: init.body ? JSON.parse(String(init.body)) : null });
  if (method === 'POST') { nextId += 1n; return new Response(JSON.stringify({ id: String(nextId) }), { status: 200 }); }
  if (method === 'GET') return new Response(JSON.stringify({ embeds: [{ title: 'Among Us', url: 'https://twitch.tv/simon', author: { name: 'I_Am_Simon · LIVE' }, image: { url: 'https://thumb' } }] }), { status: 200 });
  if (method === 'PATCH') return new Response('{}', { status: 200 });
  return new Response(null, { status: 204 });
};
const realToken = config.discord.botToken;
config.discord.botToken = 'test-token';
announcer.initAnnounce();
announcer.setAnnounce({ enabled: true, channelId: '700000000000000002', roleId: '800000000000000001', delaySeconds: 0, whenOver: 'edit', overMessage: 'Se acabó', message: '{role} en vivo', youtubeUrl: 'https://youtube.com/@simon/live' });
// The stream going on and off, as stream-sessions.js says it.
const stream = (type) => bus.emit(type === 'on' ? 'stream:on' : 'stream:off', {});
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

stream('on');
await wait(300);
const livePost = calls.filter((c) => c.method === 'POST');
const liveLast = announcer.getAnnounce().last;
stream('off');
await wait(300);
const overEdit = calls.filter((c) => c.method === 'PATCH');
const overLast = announcer.getAnnounce().last;

// Stopped before the wait was over: nothing is posted, and nothing is left to take down.
calls.length = 0;
announcer.setAnnounce({ delaySeconds: 5 });
stream('on');
await wait(50);
stream('off');
await wait(150);
const cancelledCalls = calls.length;
// And an announcement still waiting for Twitch when the stream stopped posts nothing either.
const lateOne = await announcer.announce({ current: { cancelled: true } });

// Taken down rather than marked over.
calls.length = 0;
announcer.setAnnounce({ delaySeconds: 0, whenOver: 'delete' });
stream('on');
await wait(300);
stream('off');
await wait(300);
const deleted = calls.map((c) => c.method);

// Switched off: going live posts nothing.
calls.length = 0;
announcer.setAnnounce({ enabled: false });
stream('on');
await wait(300);
const whileOff = calls.length;
stream('off');
await wait(100);

config.discord.botToken = realToken;
globalThis.fetch = realFetch;

test('OBS starting posts the announcement, with the ping it was allowed and buttons to watch', () => {
  assert.equal(livePost.length, 1, `posted ${livePost.length} times`);
  const { path, body } = livePost[0];
  assert.equal(path, '/channels/700000000000000002/messages');
  assert.equal(body.content, '<@&800000000000000001> en vivo');
  assert.deepEqual(body.allowed_mentions, { parse: [], roles: ['800000000000000001'] });
  assert.equal(body.components[0].components[0].url, 'https://youtube.com/@simon/live');
  assert.equal(liveLast?.channelId, '700000000000000002');
  assert.ok(liveLast?.messageId, 'the post was not remembered');
});

test('the stream stopping marks the post as over: greyed, the buttons gone, pinging nobody', () => {
  assert.equal(overEdit.length, 1);
  const { path, body } = overEdit[0];
  assert.equal(path, `/channels/700000000000000002/messages/${liveLast.messageId}`);
  assert.equal(body.content, 'Se acabó');
  assert.deepEqual(body.components, []);
  assert.deepEqual(body.allowed_mentions, { parse: [] });
  assert.equal(body.embeds[0].author.name, 'I_Am_Simon · OFFLINE');
  assert.equal(body.embeds[0].color, 0x4f545c);
  assert.equal(overLast, null, 'the finished post was still remembered');
});

test('a stream that stops before it was announced is never announced', () => {
  assert.equal(cancelledCalls, 0, `Discord was called ${cancelledCalls} times`);
  assert.deepEqual(lateOne, { cancelled: true });
});

test('the post can be taken down instead, and nothing is posted while it is switched off', () => {
  assert.deepEqual(deleted, ['POST', 'DELETE']);
  assert.equal(whileOff, 0);
});

test('the going-live screen is wired to the server, in both languages', () => {
  const protocol = fs.readFileSync(new URL('../../shared/protocol.js', SCRIPT_URL), 'utf8');
  const ws = fs.readFileSync(new URL('../api/ws.js', SCRIPT_URL), 'utf8');
  const view = fs.readFileSync(new URL('../../web/components/views/GoLiveView.tsx', SCRIPT_URL), 'utf8');
  const strings = fs.readFileSync(new URL('../../web/constants.ts', SCRIPT_URL), 'utf8');
  const backup = fs.readFileSync(new URL('../engine/backup.js', SCRIPT_URL), 'utf8');
  assert.ok(protocol.includes("ANNOUNCE: 'announce'"));
  assert.ok(ws.includes('case C2S.ANNOUNCE') && ws.includes('announce: announcer.getAnnounce()'));
  assert.ok(backup.includes("name: 'discord_announce'"), 'the announcement settings are not backed up');
  for (const key of ['goLiveNav', 'goLiveTest', 'goLiveTestHint', 'subsCheckFailed']) {
    assert.equal(strings.split(`${key}:`).length - 1, 2, `${key} is not in both languages`);
  }
  for (const key of ['goLiveChannel', 'goLivePing', 'goLiveWhenOver']) assert.ok(view.includes(`t.${key}`), `${key} is not used`);
});

// ---------------------------------------------------------------- subscriptions that ran out

const held = new Set(['r-t1']);
const subCalls = [];
const realFetch2 = globalThis.fetch;
globalThis.fetch = async (url, init = {}) => {
  const u = String(url);
  const method = init.method || 'GET';
  subCalls.push(`${method} ${u.replace(/^.*\/api\/v10/, '')}`);
  const role = /\/roles\/([\w-]+)$/.exec(u)?.[1];
  if (method === 'PUT' && role) held.add(role);
  if (method === 'DELETE' && role) held.delete(role);
  if (method === 'GET' && /\/members\/\d+$/.test(u)) return new Response(JSON.stringify({ roles: [...held] }), { status: 200 });
  return new Response(null, { status: 204 });
};
config.discord.botToken = 'test-token';
roles.store.setRoleMappings({ subscriberTier1: 'r-t1', subscriberTier2: 'r-t2' });

// Linked while a tier 1 subscriber, by their badge.
bus.emit(EVENTS.CHAT, (await import('../../core/bus.js')).normaliseChat({
  platform: 'twitch', user: 'Lapsed', userId: '777', msg: 'hi', isSub: true, raw: { badges: { subscriber: '6' } },
}));
await roleSync.link({ platform: 'twitch', platformId: '777', platformName: 'Lapsed', discordId: '777777777777', discordName: 'LapsedD' });
const whileSubbed = [...held].sort();

// A list that did not finish loading proves nothing, so it changes nothing.
const partial = [{ user_id: '1', tier: '1000' }];
partial.complete = false;
bus.emit(EVENTS.SUBSCRIBER_LIST, partial);
await wait(300);
const afterPartial = [...held].sort();

// The daily list, without them: the subscription ran out without a word in chat.
const lapsed = [{ user_id: '1', tier: '1000' }];
lapsed.complete = true;
bus.emit(EVENTS.SUBSCRIBER_LIST, lapsed);
await wait(900);
const afterLapse = [...held].sort();
const lapseCheck = roleSync.snapshot().roleSyncSubsCheck;

// Back, at tier 2.
const back = [{ user_id: '777', tier: '2000' }];
back.complete = true;
bus.emit(EVENTS.SUBSCRIBER_LIST, back);
await wait(900);
const afterReturn = [...held].sort();

roleSync.unlink('twitch:777');
config.discord.botToken = realToken;
globalThis.fetch = realFetch2;

test('the daily subscriber list takes away the role of a subscription that ran out, and gives it back', () => {
  assert.deepEqual(whileSubbed, ['r-t1']);
  assert.deepEqual(afterPartial, ['r-t1'], 'a list that did not finish loading took a role away');
  assert.deepEqual(afterLapse, [], 'the lapsed subscriber kept the role');
  assert.deepEqual(afterReturn, ['r-t2']);
  assert.equal(lapseCheck.ok, true);
  assert.equal(lapseCheck.subscribers, 1);
  assert.equal(lapseCheck.changed, 1);
});

test('Role Management says when subscriptions were last checked', () => {
  const view = fs.readFileSync(new URL('../../web/components/views/RoleManagementView.tsx', SCRIPT_URL), 'utf8');
  assert.ok(view.includes('roleSyncSubsCheck') && view.includes('t.subsCheckFailed'));
});
