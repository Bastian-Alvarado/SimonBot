/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Smoke tests: the bot posting on its own — who a message may ping, and the
 * watch list: Twitch and YouTube channels seen going live with the app's keys
 * only, each with its own going-live post, copied from one to another, and
 * what becomes of a post when the stream stops.
 *
 * Runs in order with the other feature files, on the one engine the harness
 * boots — through scripts/smoke.js, never on its own.
 */

import { SCRIPT_URL, assert, fs, bus, test } from './harness.js';

const discord = await import('../../platforms/discord.js');
const announcer = await import('../../engine/announce.js');
const twitch = await import('../../platforms/twitch.js');
const youtube = await import('../../platforms/youtube.js');
const watch = await import('../../engine/watch.js');
const { config } = await import('../../config.js');

// ---------------------------------------------------------------- who a message pings

const pings = discord.mentionsFrom('<@&111111111> and <@&222222222>, <@&111111111> again, @everyone');
const quiet = discord.mentionsFrom('hello {user}');

test('a role written into a message pings; a viewer typing @everyone pings nobody', () => {
  assert.deepEqual(pings, { parse: ['users', 'everyone'], roles: ['111111111', '222222222'] });
  assert.deepEqual(quiet, { parse: ['users'], roles: [] });
});

// ---------------------------------------------------------------- the going-live post

const info = { platform: 'twitch', name: 'I_Am_Simon', url: 'https://twitch.tv/simon', live: true, title: 'Among Us @everyone con amigos', game: 'Among Us', thumbnail: 'https://thumb/1280x720.jpg?t=1' };
const base = watch.cleanAlert({ channelId: '700000000000000002', message: '{role} {streamer} está en vivo! {title} {link}' });
const toRole = announcer.postFor({ ...base, roleId: '800000000000000001' }, info);
const toAll = announcer.postFor({ ...base, roleId: 'everyone' }, info);
const toNobody = announcer.postFor({ ...base, roleId: '', card: false }, null);
const onYoutube = announcer.postFor(base, { ...info, platform: 'youtube', url: 'https://www.youtube.com/watch?v=abc' });
const cleaned = watch.cleanAlert({ channelId: 'not-an-id', roleId: '<@&1>', delaySeconds: 99999, whenOver: 'explode', cardColor: 'red' });
const oldNext = announcer.fillNext('¡Gracias! Próximo: {next}\nNos vemos');

test('the going-live post pings only the chosen role, names the stream and links to it', () => {
  assert.equal(toRole.content, '<@&800000000000000001> I\\_Am\\_Simon está en vivo! Among Us @​everyone con amigos https://twitch.tv/simon');
  assert.deepEqual(toRole.allowed_mentions, { parse: [], roles: ['800000000000000001'] });
  assert.deepEqual(toAll.allowed_mentions, { parse: ['everyone'] });
  assert.ok(toAll.content.startsWith('@everyone I\\_Am\\_Simon'), toAll.content);
  assert.equal(toRole.embed.author, 'I_Am_Simon · LIVE');
  assert.equal(toRole.embed.url, 'https://twitch.tv/simon');
  assert.equal(toRole.embed.image, info.thumbnail);
  assert.equal(toRole.embed.description, '**Among Us**');
  // A button to watch, named for where the stream is.
  assert.deepEqual(toRole.components[0].components.map((b) => [b.style, b.label, b.url]), [[5, 'Twitch', 'https://twitch.tv/simon']]);
  assert.deepEqual(onYoutube.components[0].components.map((b) => [b.label, b.url]), [['YouTube', 'https://www.youtube.com/watch?v=abc']]);
});

test('with nobody to ping and nothing known about the stream, it still posts, pinging nobody', () => {
  assert.equal(toNobody.content, 'está en vivo!');
  assert.deepEqual(toNobody.allowed_mentions, { parse: [], roles: [] });
  assert.equal(toNobody.embed, undefined);
  assert.equal(toNobody.components, undefined);
});

test('going-live settings are cleaned on the way in, and a message from the schedule days drops its next stream', () => {
  assert.equal(cleaned.channelId, '');
  assert.equal(cleaned.roleId, '');
  assert.equal(cleaned.delaySeconds, 600);
  assert.equal(cleaned.whenOver, 'edit');
  assert.equal(cleaned.cardColor, '#9146ff');
  assert.equal(oldNext, '¡Gracias!\nNos vemos');
});

/*
  Twitch, stood in for: the app token, users and who is live. Every request
  is counted, so batching can be seen. Discord, caught as before.
*/
const twitchCalls = [];
const liveNow = new Map();
twitch._setFetch(async (url, init = {}) => {
  const u = new URL(String(url));
  twitchCalls.push(`${init.method || 'GET'} ${u.pathname}`);
  if (u.hostname === 'id.twitch.tv') {
    const form = new URLSearchParams(String(init.body));
    if (form.get('client_secret') !== 'shh') return new Response(JSON.stringify({ message: 'invalid client secret' }), { status: 403 });
    return new Response(JSON.stringify({ access_token: 'app-token', expires_in: 3600 }), { status: 200 });
  }
  if (u.pathname === '/helix/users') {
    const data = u.searchParams.getAll('login').filter((l) => l !== 'nobody').map((l, i) => ({ id: `id-${l}`, login: l, display_name: l.toUpperCase(), profile_image_url: `https://pic/${i}` }));
    return new Response(JSON.stringify({ data }), { status: 200 });
  }
  if (u.pathname === '/helix/streams') {
    const data = u.searchParams.getAll('user_login').filter((l) => liveNow.has(l)).map((l) => ({ user_login: l, ...liveNow.get(l) }));
    return new Response(JSON.stringify({ data }), { status: 200 });
  }
  return new Response('{}', { status: 404 });
});

const calls = [];
let nextId = 900000000000000001n;
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init = {}) => {
  const path = String(url).replace(/^.*\/api\/v10/, '');
  const method = init.method || 'GET';
  calls.push({ method, path, body: init.body ? JSON.parse(String(init.body)) : null });
  if (method === 'POST') { nextId += 1n; return new Response(JSON.stringify({ id: String(nextId) }), { status: 200 }); }
  if (method === 'GET') return new Response(JSON.stringify({ embeds: [{ title: 'Among Us', url: 'https://twitch.tv/simon', author: { name: 'SIMON · LIVE' }, image: { url: 'https://thumb' } }] }), { status: 200 });
  if (method === 'PATCH') return new Response('{}', { status: 200 });
  return new Response(null, { status: 204 });
};
const realToken = config.discord.botToken;
config.discord.botToken = 'test-token';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

twitch.initTwitch();
youtube.initYouTube();
watch.initWatch();
announcer.initAnnounce();

// Wrong keys first: said so, and nothing can be watched.
twitch.setCredentials({ clientId: 'app-id', clientSecret: 'wrong' });
await wait(50);
const badKeys = twitch.getStatus();
twitch.setCredentials({ clientSecret: 'shh' });
await wait(50);
const goodKeys = twitch.getStatus();
const creds = twitch.getCredentials();

let notFound = null;
try { await watch.add({ platform: 'twitch', input: 'nobody' }); } catch (err) { notFound = err.code; }
const simon = await watch.add({ platform: 'twitch', input: 'https://www.twitch.tv/Simon', mine: true });
watch.update(simon.id, { alert: { channelId: '700000000000000002', roleId: '800000000000000001', delaySeconds: 0, whenOver: 'edit', overMessage: 'Se acabó', message: '{role} {streamer} en vivo' } });
// A friend: added after Simon's setup was edited, so it starts from it.
const friend = await watch.add({ platform: 'twitch', input: '@amiga' });
let twice = null;
try { await watch.add({ platform: 'twitch', input: 'simon' }); } catch (err) { twice = err.code; }
const friendStart = watch.get(friend.id).alert;
watch.update(friend.id, { alert: { channelId: '700000000000000003', message: 'Mira a {streamer}' } });

// A hundred and fifty more on the list: Twitch is asked about them in two requests, not a hundred and fifty.
const many = Array.from({ length: 150 }, (_, i) => `canal${i}`);
twitchCalls.length = 0;
const manyLive = await twitch.liveStreams(many);
const streamCalls = twitchCalls.filter((c) => c.endsWith('/helix/streams')).length;

// Simon goes live: one post, in Simon's channel, with Simon's words.
calls.length = 0;
liveNow.set('simon', { title: 'Among Us', game: 'Among Us', thumbnail_url: 'https://thumb/{width}x{height}.jpg', started_at: new Date().toISOString() });
await watch.pollTwitch();
await wait(300);
const livePost = calls.filter((c) => c.method === 'POST');
const liveLast = watch.get(simon.id).last;
const streamOn = watch.mineState().live ? watch.mineInfo() : null;
// Still live a minute later: posted once only.
await watch.pollTwitch();
await wait(100);
const postsAfterSecondLook = calls.filter((c) => c.method === 'POST').length;

// One offline answer is not the end; two in a row are.
liveNow.delete('simon');
await watch.pollTwitch();
await wait(100);
const afterOneOffline = calls.filter((c) => c.method === 'PATCH').length;
await watch.pollTwitch();
await wait(300);
const overEdit = calls.filter((c) => c.method === 'PATCH');
const overLast = watch.get(simon.id).last;
const streamAfter = watch.mineState().live ? watch.mineInfo() : null;

// The friend goes live and stops before its wait is over: never posted.
calls.length = 0;
watch.update(friend.id, { alert: { delaySeconds: 5 } });
liveNow.set('amiga', { title: 'Hola', game: 'Minecraft', thumbnail_url: '', started_at: new Date().toISOString() });
await watch.pollTwitch();
await wait(50);
liveNow.delete('amiga');
await watch.pollTwitch();
await watch.pollTwitch();
await wait(150);
const cancelledCalls = calls.length;
const friendNotMine = watch.mineState().live ? watch.mineInfo() : null;
const lateOne = await announcer.announce(friend.id, { current: { cancelled: true } });

// Copying: Simon's setup to every other channel.
const copied = watch.copy(simon.id, 'all');
const friendAfterCopy = watch.get(friend.id).alert;

// Taken down rather than marked over, and nothing at all while switched off.
calls.length = 0;
watch.update(simon.id, { alert: { whenOver: 'delete' } });
liveNow.set('simon', { title: 'Otra vez', game: '', thumbnail_url: '', started_at: new Date().toISOString() });
await watch.pollTwitch();
await wait(300);
liveNow.delete('simon');
await watch.pollTwitch();
await watch.pollTwitch();
await wait(300);
const deleted = calls.map((c) => c.method);
calls.length = 0;
watch.update(simon.id, { alert: { enabled: false } });
liveNow.set('simon', { title: 'Callado', game: '', thumbnail_url: '', started_at: new Date().toISOString() });
await watch.pollTwitch();
await wait(300);
const whileOff = calls.length;
liveNow.delete('simon');
await watch.pollTwitch();
await watch.pollTwitch();
await wait(100);

watch.remove(friend.id);
watch.remove(simon.id);
config.discord.botToken = realToken;
globalThis.fetch = realFetch;

test('Twitch is read with the app\'s keys only, and wrong keys are said so', () => {
  assert.equal(badKeys.status, 'error');
  assert.match(badKeys.error || '', /turned the keys down/);
  assert.equal(goodKeys.status, 'connected');
  assert.deepEqual(creds, { clientId: 'app-id', hasClientSecret: true }, 'the secret should never be handed to a screen');
});

test('a channel is added by name or link, once, and one Twitch does not have is refused', () => {
  assert.equal(notFound, 'watch_not_found');
  assert.equal(simon.id, 'twitch:simon');
  assert.equal(simon.name, 'SIMON');
  assert.equal(simon.mine, true);
  assert.equal(twice, 'watch_already');
  assert.equal(twitch.loginFrom('https://twitch.tv/Some_One/videos'), 'some_one');
  assert.equal(twitch.loginFrom('not a name!'), '');
});

test('a new channel starts from the setup edited last; copying gives one setup to all', () => {
  assert.equal(friendStart.channelId, '700000000000000002');
  assert.equal(friendStart.message, '{role} {streamer} en vivo');
  assert.equal(copied.copied, 1);
  assert.equal(friendAfterCopy.channelId, '700000000000000002');
  assert.equal(friendAfterCopy.delaySeconds, 0);
});

test('Twitch is asked about a hundred channels at a time', () => {
  assert.equal(streamCalls, 2);
  assert.deepEqual(manyLive, {});
});

test('going live posts that channel\'s own announcement, once, and starts the stream when it is yours', () => {
  assert.equal(livePost.length, 1, `posted ${livePost.length} times`);
  const { path, body } = livePost[0];
  assert.equal(path, '/channels/700000000000000002/messages');
  assert.equal(body.content, '<@&800000000000000001> SIMON en vivo');
  assert.deepEqual(body.allowed_mentions, { parse: [], roles: ['800000000000000001'] });
  assert.equal(body.embeds[0].image.url.startsWith('https://thumb/1280x720.jpg'), true);
  assert.equal(body.components[0].components[0].url, 'https://twitch.tv/simon');
  assert.equal(liveLast?.channelId, '700000000000000002');
  assert.equal(postsAfterSecondLook, 1, 'still live was posted again');
  assert.ok(streamOn, 'a "mine" channel going live did not start the stream');
  assert.equal(streamOn.title, 'Among Us');
});

test('two offline answers in a row mark the post over: greyed, the button gone, pinging nobody', () => {
  assert.equal(afterOneOffline, 0, 'one offline answer ended the stream');
  assert.equal(overEdit.length, 1);
  const { path, body } = overEdit[0];
  assert.equal(path, `/channels/700000000000000002/messages/${liveLast.messageId}`);
  assert.equal(body.content, 'Se acabó');
  assert.deepEqual(body.components, []);
  assert.deepEqual(body.allowed_mentions, { parse: [] });
  assert.equal(body.embeds[0].author.name, 'SIMON · OFFLINE');
  assert.equal(body.embeds[0].color, 0x4f545c);
  assert.equal(overLast, null, 'the finished post was still remembered');
  assert.equal(streamAfter, null, 'the stream was not over');
});

test('a stream that stops before it was announced is never announced, and somebody else\'s is not your stream', () => {
  assert.equal(cancelledCalls, 0, `Discord was called ${cancelledCalls} times`);
  assert.deepEqual(lateOne, { cancelled: true });
  assert.equal(friendNotMine, null);
});

test('the post can be taken down instead, and nothing is posted while it is switched off', () => {
  assert.deepEqual(deleted, ['POST', 'DELETE']);
  assert.equal(whileOff, 0);
});

test('the Go live screen is wired to the server, in both languages', () => {
  const protocol = fs.readFileSync(new URL('../../shared/protocol.js', SCRIPT_URL), 'utf8');
  const ws = fs.readFileSync(new URL('../api/ws.js', SCRIPT_URL), 'utf8');
  const view = fs.readFileSync(new URL('../../web/components/views/GoLiveView.tsx', SCRIPT_URL), 'utf8');
  const strings = fs.readFileSync(new URL('../../web/constants.ts', SCRIPT_URL), 'utf8');
  const backup = fs.readFileSync(new URL('../engine/backup.js', SCRIPT_URL), 'utf8');
  assert.ok(protocol.includes("WATCH: 'watch'"));
  assert.ok(ws.includes('case C2S.WATCH') && ws.includes('...watch.snapshot()'));
  assert.ok(backup.includes("name: 'watch_list'"), 'the watch list is not backed up');
  for (const key of ['goLiveNav', 'goLiveTest', 'goLiveTestHint', 'watchHint', 'watchCopyFrom', 'watchApplyAll']) {
    assert.equal(strings.split(`${key}:`).length - 1, 2, `${key} is not in both languages`);
  }
  for (const key of ['goLiveChannel', 'goLivePing', 'goLiveWhenOver', 'watchCopyFrom', 'watchApplyAll', 'watchMine']) assert.ok(view.includes(`t.${key}`), `${key} is not used`);
});

// ---------------------------------------------------------------- YouTube, with an API key

const ytCalls = [];
youtube._setFetch(async (url) => {
  const u = new URL(String(url));
  ytCalls.push(u.pathname);
  if (u.hostname === 'www.youtube.com') {
    return new Response(`<feed><author><name>Simon &amp; Co</name></author><entry><yt:videoId>live1</yt:videoId></entry><entry><yt:videoId>old1</yt:videoId></entry></feed>`, { status: 200 });
  }
  if (u.pathname.endsWith('/channels')) {
    return new Response(JSON.stringify({ items: [{ id: 'UC1234567890123456789012', snippet: { title: 'Simon YT', thumbnails: { default: { url: 'https://yt/pic' } } } }] }), { status: 200 });
  }
  if (u.pathname.endsWith('/videos')) {
    if (u.searchParams.get('key') === 'spent') return new Response(JSON.stringify({ error: { message: 'quota', errors: [{ reason: 'quotaExceeded' }] } }), { status: 403 });
    const ids = (u.searchParams.get('id') || '').split(',');
    const items = ids.map((id) => ({
      id,
      snippet: { channelId: 'UC1234567890123456789012', channelTitle: 'Simon YT', title: id === 'live1' ? 'En directo' : 'Viejo', liveBroadcastContent: id === 'live1' ? 'live' : 'none', thumbnails: { high: { url: `https://yt/${id}.jpg` } } },
      ...(id === 'live1' ? { liveStreamingDetails: { actualStartTime: new Date().toISOString() } } : {}),
    }));
    return new Response(JSON.stringify({ items }), { status: 200 });
  }
  return new Response('{}', { status: 404 });
});
youtube.setCredentials({ apiKey: 'yt-key' });
await wait(50);
const ytStatus = youtube.getStatus();
const ytChannel = await watch.add({ platform: 'youtube', input: 'https://youtube.com/@simon' });
await watch.pollYouTube();
const ytLive = watch.get(ytChannel.id).live;
const usedUnits = youtube.usageToday().used;
youtube.setCredentials({ apiKey: 'spent' });
await wait(50);
const ytSpent = youtube.getStatus();
const ytSpentUsage = youtube.usageToday();
watch.remove(ytChannel.id);
youtube.setCredentials({ apiKey: '' });

test('YouTube: a channel by @handle, its feed for the newest videos, one call for which is live', () => {
  assert.equal(ytStatus.status, 'connected');
  assert.equal(ytChannel.id, 'youtube:UC1234567890123456789012');
  assert.equal(ytChannel.name, 'Simon YT');
  assert.equal(ytLive?.on, true);
  assert.equal(ytLive?.title, 'En directo');
  assert.equal(ytLive?.url, 'https://www.youtube.com/watch?v=live1');
  assert.ok(usedUnits >= 3 && usedUnits <= 4, `counted ${usedUnits} units`);
});

test('YouTube: a spent allowance is said so, with when it comes back, and not knocked on again', () => {
  assert.equal(ytSpent.status, 'quota');
  assert.ok(ytSpentUsage.outUntil > Date.now(), 'no time to wait for');
  assert.ok(youtube.nextQuotaReset() > Date.now());
});
