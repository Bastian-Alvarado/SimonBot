/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Sign-in (server/api/auth.js): who is on the other end of the HTTP API and
 * the live connection, and what each may ask.
 *
 * A real server on a free port and real sockets; only Discord is a stand-in,
 * answering for the server's owner, a moderator, a member who is not one,
 * somebody not in the server, and a code that is not real.
 */

import { WebSocket } from 'ws';
import { SCRIPT_URL, assert, collection, fs, test } from './harness.js';

const auth = await import('../../api/auth.js');
const { createHttpServer } = await import('../../api/http.js');
const { initWebSocket, closeWebSocket, mayAsk } = await import('../../api/ws.js');
const { C2S, S2C } = await import('../../../shared/protocol.js');
const { EXCLUDED } = await import('../../engine/backup.js');
const { config } = await import('../../config.js');
const questions = await import('../../engine/questions.js');
const read = (rel) => fs.readFileSync(new URL(rel, SCRIPT_URL), 'utf8');

// ------------------------------------------------------------ Discord, stood in

const GUILD = '600000000000000006';
const OWNER = '100000000000000001';
const MOD = '200000000000000002';
const MEMBER = '300000000000000003';
const NAMED = '400000000000000004';
const MOD_ROLE = '500000000000000005';
// The Discord app and server, as the Connections screen sets them; put back at the end.
const discordSettings = collection('discord_settings', {});
const discordBefore = structuredClone(discordSettings.get());
discordSettings.set({ ...discordBefore, clientId: 'app-1', clientSecret: 'app-secret', guildId: GUILD, botToken: 'bot-token' });

const CODES = { 'code-owner': OWNER, 'code-mod': MOD, 'code-member': MEMBER, 'code-stranger': '900000000000000009', 'code-named': NAMED };
const USERS = { [OWNER]: 'streamer', [MOD]: 'modone', [MEMBER]: 'viewer', '900000000000000009': 'stranger', [NAMED]: 'otraCuenta' };
const members = { [OWNER]: [], [MOD]: [MOD_ROLE], [MEMBER]: [], [NAMED]: [] };
let discordDown = false;
const seen = [];
const realFetch = globalThis.fetch;
const reply = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
globalThis.fetch = async (url, init = {}) => {
  const u = String(url);
  if (!u.startsWith('https://discord.com/api/v10')) return realFetch(url, init);
  if (discordDown) throw new Error('Discord is down');
  const path = u.replace('https://discord.com/api/v10', '');
  const auth2 = String(init.headers?.Authorization || init.headers?.authorization || '');
  seen.push(`${init.method || 'GET'} ${path} ${auth2.split(' ')[0]}`);
  if (path === '/oauth2/token') {
    const form = new URLSearchParams(String(init.body));
    if (form.get('client_secret') !== 'app-secret' || !CODES[form.get('code')]) return reply(400, { error: 'invalid_grant' });
    return reply(200, { access_token: `at-${CODES[form.get('code')]}`, token_type: 'Bearer' });
  }
  if (path === '/users/@me') {
    const id = auth2.replace(/^Bearer at-/, '');
    return USERS[id] ? reply(200, { id, username: USERS[id], global_name: USERS[id] === 'modone' ? 'Mod Uno' : null }) : reply(401, { message: '401: Unauthorized' });
  }
  if (path === `/guilds/${GUILD}`) return reply(200, { id: GUILD, owner_id: OWNER });
  const member = new RegExp(`^/guilds/${GUILD}/members/(\\d+)$`).exec(path)?.[1];
  if (member) return members[member] ? reply(200, { user: { id: member, username: USERS[member] }, roles: members[member] }) : reply(404, { message: 'Unknown Member', code: 10007 });
  return reply(404, { message: 'Unknown', code: 0 });
};
auth.initAuth();

// ------------------------------------------------------------- a real server

const server = createHttpServer({});
initWebSocket(server);
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const base = `http://127.0.0.1:${port}`;

const http = async (path, { method = 'GET', body, headers = {} } = {}) => {
  const res = await fetch(base + path, { method, headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...headers }, body: body ? JSON.stringify(body) : undefined });
  return { status: res.status, body: await res.json().catch(() => ({})), cookie: res.headers.get('set-cookie') || '' };
};
const cookieOf = (setCookie) => setCookie.split(';')[0];

/** A live connection: what it was told, how it closed, and a way to ask. */
function connect({ headers = {}, query = '' } = {}) {
  return new Promise((resolve) => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/${query}`, { headers });
    const got = { ws, me: null, closed: null, replies: {} };
    let n = 0;
    got.ask = (type, payload) => new Promise((done) => {
      const id = `t${++n}`;
      got.replies[id] = done;
      ws.send(JSON.stringify({ type, payload, id }));
    });
    ws.on('message', (raw) => {
      const msg = JSON.parse(String(raw));
      if (msg.type === S2C.ME) { got.me = msg.payload; resolve(got); }
      if (msg.id && got.replies[msg.id]) got.replies[msg.id](msg);
    });
    ws.on('close', (code) => { got.closed = code; resolve(got); });
    ws.on('error', () => {});
  });
}
const closeAll = (...conns) => conns.forEach((c) => { try { c.ws.close(); } catch { /* gone */ } });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// ------------------------------------------------------------- while it is off

const offSnapshot = await http('/api/snapshot');
const offConn = await connect();
const offEnable = await offConn.ask(C2S.AUTH, { op: 'enable', on: true });
const offConfig = await http('/auth/config');

const signIn = (code, extra = {}) => http('/auth/discord', { method: 'POST', body: { code, redirectUri: 'http://127.0.0.1/', ...extra } });
// Signing in works while off: it is how the streamer gets a sign-in to switch it on with.
const ownerIn = await signIn('code-owner');
const ownerCookie = cookieOf(ownerIn.cookie);
const ownerConn = await connect({ headers: { Cookie: ownerCookie } });
const ownerGet = await ownerConn.ask(C2S.AUTH, { op: 'get' });

const refusedViewer = await signIn('code-member');
const refusedStranger = await signIn('code-stranger');
const refusedBad = await signIn('nonsense');
const refusedKey = await http('/auth/owner-key', { method: 'POST', body: { key: 'not-it' } });

// While it is off, everybody is the owner: so nobody "open" is shown the owner key, or gets to change the keys.
const openGet = await offConn.ask(C2S.AUTH, { op: 'get' });
const openNewKey = await offConn.ask(C2S.AUTH, { op: 'new-key', which: 'ownerKey' });
// Somebody who signed in while it was off — claimed the owner, or used the key they could have read: let go when it is switched on.
const claimed = await http('/auth/claim', { method: 'POST', body: {} });
const claimedCookie = cookieOf(claimed.cookie);
const claimedConn = await connect({ headers: { Cookie: claimedCookie } });
const keyBefore = auth.authState({ role: 'owner', via: 'session' }).ownerKey;
const keyWhileOff = await http('/auth/owner-key', { method: 'POST', body: { key: keyBefore } });
// A cookie some other page set badly is no reason to fail.
const badCookieOff = await connect({ headers: { Cookie: 'x=%; y=%E0%A4%A' } });

test('sign-in starts off: everyone is the owner as before, and nobody can switch it on just because it is off', () => {
  assert.equal(offSnapshot.status, 200);
  assert.deepEqual([offConn.me.role, offConn.me.via, offConn.me.signIn], ['owner', 'open', false]);
  assert.equal(offEnable.payload.code, 'signin_first');
  assert.equal(auth.isEnabled(), false);
  assert.deepEqual([offConfig.body.enabled, offConfig.body.clientId], [false, 'app-1']);
  assert.deepEqual(offConfig.body.scopes, ['identify'], 'a sign-in asks Discord for more than who the account is');
});

test('the server\'s owner signs in with Discord even while it is off, and gets a cookie scripts and other sites cannot read', () => {
  assert.equal(ownerIn.status, 200);
  assert.equal(ownerIn.body.role, 'owner');
  assert.match(ownerIn.cookie, /^ss_session=[\w-]{20,}; Path=\/; HttpOnly; SameSite=Lax; Max-Age=2592000$/);
  assert.deepEqual([ownerConn.me.role, ownerConn.me.via], ['owner', 'session']);
  assert.equal(ownerGet.payload.enabled, false);
  assert.ok(ownerGet.payload.ownerKey);
  assert.ok(!('pageKey' in ownerGet.payload), 'there is no page key: nothing shows a page in OBS');
  // The code was swapped with the app's secret, and the account asked with that one token: nothing else of theirs.
  assert.ok(seen.includes('POST /oauth2/token ') && seen.includes('GET /users/@me Bearer'), seen.join(' | '));
  assert.ok(!seen.some((x) => x.startsWith('GET /users/@me/guilds')), 'a sign-in read which servers they are in');
});

test('Discord sign-ins from somebody not a moderator, not in the server, or not real are refused, each with its reason', () => {
  assert.deepEqual([refusedViewer.status, refusedViewer.body.code], [400, 'signin_not_mod']);
  assert.equal(refusedStranger.body.code, 'signin_not_member');
  assert.equal(refusedBad.body.code, 'signin_code_bad');
  assert.equal(refusedKey.body.code, 'signin_key_wrong');
  assert.ok(!refusedViewer.cookie && !refusedKey.cookie, 'no cookie for a refused sign-in');
});

test('while it is off, nobody "open" sees the owner key or changes a key; this browser can sign in as the owner, as anybody can then', () => {
  assert.equal(openGet.payload.ownerKey, '');
  assert.equal(openNewKey.payload.code, 'signin_owner_only');
  assert.deepEqual([claimed.status, claimed.body.role], [200, 'owner']);
  assert.deepEqual([claimedConn.me.role, claimedConn.me.via], ['owner', 'session']);
  assert.equal(keyWhileOff.body.role, 'owner');
  assert.equal(badCookieOff.me?.role, 'owner', 'a bad cookie is skipped, and the connection goes on');
});

// ------------------------------------------------------------- switched on

const onEnable = await ownerConn.ask(C2S.AUTH, { op: 'enable', on: true });
await wait(400);
const offConnAfter = offConn.closed;
const { ownerKey } = auth.authState({ role: 'owner', via: 'session' });
const claimedAfter = await http('/api/snapshot', { headers: { Cookie: claimedCookie } });
const keySessionAfter = await http('/api/snapshot', { headers: { Cookie: cookieOf(keyWhileOff.cookie) } });
const oldKey = await http('/api/snapshot', { headers: { Authorization: `Bearer ${keyBefore}` } });
const claimWhileOn = await http('/auth/claim', { method: 'POST', body: {} });
const crossSite = await http('/auth/owner-key', { method: 'POST', body: { key: ownerKey }, headers: { Origin: 'https://evil.example' } });
const badCookieOn = await connect({ headers: { Cookie: 'x=%' } });

test('switching on ends every sign-in made while it was off but the streamer\'s own, at once, and changes the owner key', () => {
  assert.equal(onEnable.payload.ownerKey, ownerKey, 'the streamer is shown the new key');
  assert.notEqual(ownerKey, keyBefore);
  assert.equal(claimedConn.closed, 4401, 'its open connection let go');
  assert.equal(claimedAfter.status, 401);
  assert.equal(keySessionAfter.status, 401);
  assert.equal(oldKey.status, 401, 'the old key opens nothing');
  assert.equal(claimWhileOn.body.code, 'signin_owner_only');
  assert.equal(ownerConn.closed, null, 'the streamer stays');
});

test('with it on, signing in from a page on another website is refused, and a bad cookie is turned away rather than left hanging', () => {
  assert.deepEqual([crossSite.status, crossSite.body.code], [403, 'signin_origin']);
  assert.equal(crossSite.cookie, '');
  assert.equal(badCookieOn.closed, 4401);
});

const anon = await http('/api/snapshot');
const health = await http('/api/health');
const withCookie = await http('/api/snapshot', { headers: { Cookie: ownerCookie } });
const withBearer = await http('/api/snapshot', { headers: { Authorization: `Bearer ${ownerKey}` } });
const ownerKeyInUrl = await http(`/api/snapshot?key=${encodeURIComponent(ownerKey)}`);
const meAnon = await http('/auth/me');

const anonConn = await connect();
const evilConn = await connect({ headers: { Origin: 'https://evil.example', Cookie: ownerCookie } });
const devConn = await connect({ headers: { Origin: 'http://localhost:5173', Cookie: ownerCookie } });
const keyInAddressConn = await connect({ query: `?key=${encodeURIComponent(ownerKey)}` });

test('switched on by the signed-in streamer; every other page is let go, to be asked again who it is', () => {
  assert.equal(onEnable.payload.enabled, true);
  assert.equal(auth.isEnabled(), true);
  assert.equal(offConnAfter, 4001);
});

test('with it on, the API wants a sign-in or the owner key as a header — never the owner key in an address — and the health check stays open', () => {
  assert.deepEqual([anon.status, anon.body.code], [401, 'signin_needed']);
  assert.equal(health.status, 200);
  assert.equal(withCookie.status, 200);
  assert.equal(withBearer.status, 200);
  assert.equal(ownerKeyInUrl.status, 401);
  assert.equal(meAnon.body.role, null);
});

test('a key in the address opens no connection either', () => {
  assert.equal(keyInAddressConn.closed, 4401);
});

test('a connection from nobody is closed with 4401; from another website, even with the cookie, 4403; the development page is fine', () => {
  assert.equal(anonConn.closed, 4401);
  assert.equal(evilConn.closed, 4403);
  assert.deepEqual([devConn.me?.role, devConn.closed], ['owner', null]);
});

// ------------------------------------------------------------- a moderator

// Moderators are the ones with the role chosen in Settings.
const setRole = await ownerConn.ask(C2S.AUTH, { op: 'roles', modRoleId: MOD_ROLE });
const modIn = await signIn('code-mod');
const modCookie = cookieOf(modIn.cookie);
const modConn = await connect({ headers: { Cookie: modCookie } });
const modCreds = await modConn.ask(C2S.SET_CREDENTIALS, { platform: 'twitch', clientId: 'elsewhere' });
const modImport = await modConn.ask(C2S.CONFIG_IMPORT, { bundle: {} });
const modAuth = await modConn.ask(C2S.AUTH, { op: 'get' });
const modOff = await modConn.ask(C2S.AUTH, { op: 'enable', on: false });
const modRoles = await modConn.ask(C2S.AUTH, { op: 'roles', modRoleId: '' });
const modSnapshot = await modConn.ask(C2S.GET_SNAPSHOT, {});
const modApi = await http('/api/snapshot', { headers: { Cookie: modCookie } });
const modAssets = await http('/api/assets', { headers: { Cookie: modCookie } });
const modMe = await http('/auth/me', { headers: { Cookie: modCookie } });

test('a moderator of the server signs in with their own Discord, for a week; their Discord token is not kept', () => {
  assert.equal(setRole.payload.modRoleId, MOD_ROLE);
  assert.equal(modIn.body.role, 'mod');
  assert.match(modIn.cookie, /Max-Age=604800/);
  assert.deepEqual([modConn.me.role, modConn.me.login, modConn.me.name], ['mod', 'modone', 'Mod Uno']);
  assert.deepEqual([modMe.body.role, modMe.body.login], ['mod', 'modone']);
  assert.ok(!JSON.stringify(auth._test.sessions()).includes('at-'), 'a Discord token was kept');
});

test('a moderator gets the app but not what is the streamer\'s: accounts, restoring a backup, sign-in, the raw API', () => {
  assert.equal(modCreds.payload.code, 'signin_not_allowed');
  assert.equal(modImport.payload.code, 'signin_not_allowed');
  assert.equal(modAuth.payload.code, 'signin_owner_only');
  assert.equal(modOff.payload.code, 'signin_owner_only');
  assert.equal(modRoles.payload.code, 'signin_owner_only');
  assert.equal(auth.isEnabled(), true);
  assert.equal(modSnapshot.type, S2C.REPLY);
  assert.equal(modApi.status, 403);
  assert.equal(modAssets.status, 200);
  for (const type of [C2S.WATCH, C2S.GIVEAWAY, C2S.QUESTIONS, C2S.DISCORD_PAGES, C2S.MODERATION]) assert.ok(mayAsk({ role: 'mod' }, type), type);
  for (const type of [C2S.UPDATES, C2S.CONFIG_EXPORT, C2S.PLATFORM_CONNECT, C2S.MODERATORS]) assert.ok(!mayAsk({ role: 'mod' }, type), type);
  assert.ok(!mayAsk({ role: 'mod' }, C2S.DISCORD, { op: 'exchange_code' }), 'signing the app in to Discord is the streamer\'s');
  assert.ok(mayAsk({ role: 'mod' }, C2S.DISCORD, { op: 'get_roles' }));
  assert.ok(read('../api/ws.js').includes('ok && !ws.revoked && ws.readyState === WebSocket.OPEN && handleMessage(ws, raw)'), 'a connection let go is not heard');
});

// ------------------------------------------- the dashboard, for a moderator

// Something a moderator carries out, for the record.
const modAdds = await modConn.ask(C2S.QUESTIONS, { op: 'add', text: 'De un mod', user: 'modone' });
questions.clear();

test('the dashboard: a moderator\'s menu leaves out the streamer\'s screens, and never lands on one', () => {
  const app = read('../../web/App.tsx');
  assert.ok(app.includes("const MOD_HIDDEN_VIEWS = new Set<AppView>(['gallery', 'guides', 'moderators']);"));
  assert.ok(app.includes("useEffect(() => { if (system.auth.isMod && MOD_HIDDEN_VIEWS.has(view)) setView('bot-home'); }, [system.auth.isMod, view]);"));
});

// ------------------------------------------- the Moderators screen (step 4)

const modsList = (await ownerConn.ask(C2S.MODERATORS, { op: 'list' })).payload;
const modsActivity = (await ownerConn.ask(C2S.MODERATORS, { op: 'activity', userId: MOD })).payload.entries;
const modAsksMods = await modConn.ask(C2S.MODERATORS, { op: 'list' });

test('the Moderators screen lists who signed in and whether they are here now — the streamer\'s only', () => {
  const one = modsList.moderators.find((m) => m.userId === MOD);
  assert.ok(one, 'the moderator is listed');
  assert.equal(one.login, 'modone');
  assert.ok(one.online >= 1, 'here now');
  assert.equal(modsList.enabled, true);
  assert.equal(modAsksMods.payload.code, 'signin_not_allowed');
});

test('what a moderator did is on the record — what they carried out, not what they looked at or were refused', () => {
  const types = modsActivity.map((e) => e.type);
  assert.equal(modAdds.type, S2C.REPLY, JSON.stringify(modAdds.payload));
  assert.ok(modsActivity.some((e) => e.type === C2S.QUESTIONS && e.op === 'add' && e.what === 'De un mod'), types.join(','));
  for (const quiet of [C2S.GET_SNAPSHOT, C2S.HELLO]) assert.ok(!types.includes(quiet), quiet);
  for (const refused of [C2S.SET_CREDENTIALS, C2S.CONFIG_IMPORT]) assert.ok(!types.includes(refused), refused);
  assert.ok(modsActivity.every((e) => e.login === 'modone' && e.at > 0));
});

// No longer a moderator: asked again once their sign-in is old enough, and let go.
const modSessionId = modCookie.split('=')[1];
const modWho = { ...auth.identify({ headers: { cookie: modCookie } }) };
// Uploads: new ones, never replacing the streamer's, and no deleting them.
fs.mkdirSync(config.assetsDir, { recursive: true });
fs.writeFileSync(`${config.assetsDir}/signin-streamers.png`, 'png');
fs.writeFileSync(`${config.assetsDir}/signin_logo.png`, 'png');
const modReplaceSly = await http('/api/assets/signin%20logo.png', { method: 'POST', headers: { Cookie: modCookie } });
const modReplace = await http('/api/assets/signin-streamers.png', { method: 'POST', headers: { Cookie: modCookie } });
const modDelete = await http('/api/assets/signin-streamers.png', { method: 'DELETE', headers: { Cookie: modCookie } });
// An upload opened on its own runs nothing: an SVG can carry a script.
fs.writeFileSync(`${config.assetsDir}/signin-test.svg`, '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
const svgRes = await fetch(`${base}/media/signin-test.svg`);
const svgHeaders = { csp: svgRes.headers.get('content-security-policy') || '', sniff: svgRes.headers.get('x-content-type-options') || '' };
await svgRes.text();
// Discord not answering is no reason to let a moderator go; Discord saying they lost the role is.
members[MOD] = [];
const keptFresh = await auth.recheckMod(modWho);
auth._test.age(modSessionId, auth.MOD_RECHECK_MS + 1);
discordDown = true;
const keptWhenDown = await auth.recheckMod(modWho);
discordDown = false;
const keptStale = await auth.recheckMod(modWho);
const modGone = !auth._test.sessions()[modSessionId];
await wait(50);
const modConnLetGo = modConn.closed;
const modApiAfter = await http('/api/assets', { headers: { Cookie: modCookie } });
members[MOD] = [MOD_ROLE];

// Turned away: signed out at once, kept out, let back in.
const modBack = await signIn('code-mod');
const modBackConn = await connect({ headers: { Cookie: cookieOf(modBack.cookie) } });
const blockedNow = (await ownerConn.ask(C2S.MODERATORS, { op: 'block', userId: MOD, login: 'modone' })).payload;
await wait(50);
const blockedConnClosed = modBackConn.closed;
const blockedSignIn = await signIn('code-mod');
const unblocked = (await ownerConn.ask(C2S.MODERATORS, { op: 'unblock', userId: MOD })).payload;
const backAgain = await signIn('code-mod');
const signedOutAll = (await ownerConn.ask(C2S.MODERATORS, { op: 'signout', userId: MOD })).payload;
// Somebody who is not the server's owner named as the streamer's own account.
const named = await ownerConn.ask(C2S.AUTH, { op: 'roles', ownerDiscordId: NAMED });
const namedIn = await signIn('code-named');
const realOwnerAfter = await signIn('code-owner');
await ownerConn.ask(C2S.AUTH, { op: 'roles', ownerDiscordId: '' });

test('a moderator turned away is signed out at once and cannot sign in until let back in; signing one out ends every sign-in they have', () => {
  assert.deepEqual(blockedNow.blocked.map((b) => b.login), ['modone']);
  assert.ok(!blockedNow.moderators.some((m) => m.userId === MOD));
  assert.equal(blockedConnClosed, 4401);
  assert.deepEqual([blockedSignIn.status, blockedSignIn.body.code], [400, 'signin_blocked']);
  assert.deepEqual(unblocked.blocked, []);
  assert.equal(backAgain.body.role, 'mod');
  assert.ok(!signedOutAll.moderators.some((m) => m.userId === MOD));
});

test('the streamer\'s own Discord account can be named, when it is not the one that owns the server', () => {
  assert.equal(named.payload.ownerDiscordId, NAMED);
  assert.equal(namedIn.body.role, 'owner');
  assert.equal(realOwnerAfter.body.role, 'mod', 'the server\'s owner was still the streamer once another account was named');
});

// There is only the owner key to change.
const newPage = await ownerConn.ask(C2S.AUTH, { op: 'new-key', which: 'pageKey' });

// Signing out, and the owner key as the way back in.
const keyIn = await http('/auth/owner-key', { method: 'POST', body: { key: ownerKey } });
const keyCookie = cookieOf(keyIn.cookie);
const keyConn = await connect({ headers: { Cookie: keyCookie } });
const meRenewed = await http('/auth/me', { headers: { Cookie: keyCookie } });
const out = await http('/auth/signout', { method: 'POST', headers: { Cookie: keyCookie } });
const afterOut = await http('/api/snapshot', { headers: { Cookie: keyCookie } });
await wait(50);
const keyConnAfterOut = keyConn.closed;
// A new owner key ends the sign-ins made with the old one, but not the streamer's Discord one asking for it.
const keyIn2 = await http('/auth/owner-key', { method: 'POST', body: { key: ownerKey } });
const rotated = await ownerConn.ask(C2S.AUTH, { op: 'new-key', which: 'ownerKey' });
const afterRotate = await http('/api/snapshot', { headers: { Cookie: cookieOf(keyIn2.cookie) } });
const ownerAfterRotate = await http('/api/snapshot', { headers: { Cookie: ownerCookie } });

test('a moderator uploads new files but replaces or deletes none of the streamer\'s', () => {
  assert.deepEqual([modReplace.status, modReplace.body.code], [403, 'signin_not_allowed']);
  assert.equal(modReplaceSly.status, 403, '"signin logo.png" would be saved as the streamer\'s signin_logo.png');
  assert.equal(fs.readFileSync(`${config.assetsDir}/signin_logo.png`, 'utf8'), 'png');
  assert.equal(modDelete.status, 403);
  assert.ok(fs.existsSync(`${config.assetsDir}/signin-streamers.png`));
});

test('an upload opened on its own is sandboxed: no script runs with the streamer\'s sign-in', () => {
  assert.match(svgHeaders.csp, /sandbox/);
  assert.match(svgHeaders.csp, /default-src 'none'/);
  assert.equal(svgHeaders.sniff, 'nosniff');
});

test('somebody no longer a moderator is let go when next asked about — not before, and not because Discord did not answer — and their connection goes with them', () => {
  assert.equal(keptWhenDown, true, 'Discord down: asked again later');
  assert.equal(keptFresh, true, 'asked about recently: not asked again');
  assert.equal(keptStale, false);
  assert.ok(modGone);
  assert.equal(modConnLetGo, 4401, 'the open connection let go at once');
  assert.equal(modApiAfter.status, 401);
});

test('there is no page key to change; the owner key signs in; signing out ends that sign-in', () => {
  assert.equal(newPage.payload.code, 'unknown_request');
  assert.equal(keyIn.body.role, 'owner');
  assert.match(meRenewed.cookie, /^ss_session=[\w-]+; Path=\/; HttpOnly; SameSite=Lax; Max-Age=2592000$/, 'the cookie renewed with the sign-in');
  assert.equal(out.status, 200);
  assert.match(out.cookie, /Max-Age=0/);
  assert.equal(afterOut.status, 401);
  assert.equal(keyConnAfterOut, 4401, 'signing out over HTTP lets its open connection go too');
});

test('a new owner key ends every sign-in made with the old one, and not the streamer\'s own', () => {
  assert.ok(rotated.payload.ownerKey && rotated.payload.ownerKey !== ownerKey);
  assert.equal(afterRotate.status, 401);
  assert.equal(ownerAfterRotate.status, 200);
});

// Off again, for whatever runs after.
const offAgain = await ownerConn.ask(C2S.AUTH, { op: 'enable', on: false });
closeAll(ownerConn, devConn, modConn, keyInAddressConn);
await wait(50);
closeWebSocket();
server.closeAllConnections();
await new Promise((r) => server.close(r));
discordSettings.set(discordBefore);
globalThis.fetch = realFetch;

test('switched off again by the streamer, everyone is the owner once more', () => {
  assert.equal(offAgain.payload.enabled, false);
  assert.equal(auth.identify({ headers: {} }).via, 'open');
});

test('the sign-in is never in a backup, and the app signs in with its cookie', () => {
  for (const name of ['auth_settings', 'auth_secrets', 'auth_sessions', 'auth_tokens']) assert.ok(EXCLUDED.includes(name), name);
  const backend = read('../../web/hooks/useBackend.ts');
  assert.ok(backend.includes("credentials: 'include'"));
});

test('the dashboard: a code from Discord for signing in is the sign-in page\'s, never mistaken for connecting Discord', () => {
  assert.ok(read('../../web/hooks/useStreamSystem.ts').includes("if (!code || provider !== 'discord') return;"));
  const page = read('../../web/components/SignInPage.tsx');
  assert.ok(page.includes("url.searchParams.set('prompt', 'consent');") && page.includes("url.searchParams.set('response_type', 'code');"));
  assert.ok(page.includes('if (!expected || state !== expected)'));
});

test('sign-in is said in both languages, and so is every refusal it gives', () => {
  const words = read('../../web/constants.ts');
  const codes = ['signin_no_discord', 'signin_code_bad', 'signin_not_member', 'signin_mod_check', 'signin_not_mod', 'signin_key_wrong', 'signin_owner_only', 'signin_first', 'signin_not_allowed', 'signin_needed', 'signin_origin', 'signin_blocked'];
  for (const code of codes) {
    const key = `refuse${code.split('_').map((w) => w[0].toUpperCase() + w.slice(1)).join('')}`;
    assert.equal(words.split(`    ${key}: `).length - 1, 2, key);
  }
  for (const key of ['signInSection', 'signInDiscord', 'signInEnableConfirm', 'signInModRole', 'signInOwnerId']) assert.equal(words.split(`    ${key}: `).length - 1, 2, key);
  for (const gone of ['refuseSigninNoTwitch', 'refuseSigninScope', 'signInTwitch']) assert.ok(!words.includes(`${gone}:`), `${gone} is still in the words`);
  assert.ok(!words.includes('signInPageKey'), 'the words still talk about a page key');
});
