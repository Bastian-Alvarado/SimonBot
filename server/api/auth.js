/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Who is on the other end: the sign-in for the dashboard.
 *
 * Until now anybody who could reach the server had all of it, and the server
 * is reached from the internet too, through the Cloudflare address. So every
 * request — the live connection and the HTTP API — is asked who it comes
 * from, and gets one of these:
 *
 *   owner   the streamer: signed in with Discord as the owner of the bot's
 *           server (or the account named as the owner), or with the owner key
 *   mod     a moderator of the bot's Discord server — the moderator role
 *           chosen here, or a role that can moderate — signed in with their
 *           own Discord account
 *
 * Or nothing, and is turned away. What each may do is decided where each
 * request is handled; this decides only who it is.
 *
 * Off until the streamer turns it on (Settings → Sign-in), from a sign-in of
 * their own, so turning it on can never lock them out: the switch refuses
 * anybody who is only "owner" because sign-in is off. While off, everyone is
 * the owner, exactly as before.
 *
 * Signing in with Discord: the sign-in page sends the browser to Discord,
 * which comes back with a code; the code is handed here and exchanged with
 * the Discord app's id and secret, so only a code made for this app works.
 * Only who the account is ("identify") is asked for, and its token is used
 * once and not kept. Whether somebody is a moderator is asked of the bot's
 * server with the bot's own token, and asked again when they come back after
 * a while, so somebody who left or lost the role is no longer let in.
 *
 * Never "local" as a reason. The Cloudflare tunnel runs on the same machine
 * as the server, so every visitor from the internet arrives from here.
 */

import crypto from 'node:crypto';
import { collection } from '../core/store.js';
import { createLogger } from '../core/logger.js';
import { refusal } from '../core/refusal.js';
import * as discord from '../platforms/discord.js';

const log = createLogger('auth');

export const COOKIE = 'ss_session';
/** How long a sign-in lasts without being used: the streamer's a month, a moderator's a week. */
export const SESSION_DAYS = { owner: 30, mod: 7 };
/** How long a moderator is taken at their word before the Discord server is asked again. */
export const MOD_RECHECK_MS = 6 * 3_600_000;
/** What a sign-in asks of Discord: only who the account is. */
export const SIGN_IN_SCOPES = ['identify'];

let settings = null;
let secrets = null;
let sessions = null;

const newKey = () => crypto.randomBytes(24).toString('base64url');

export function initAuth() {
  settings = collection('auth_settings', { enabled: false });
  // Keys and sessions are secrets: never in a backup, never in a profile (backup.js EXCLUDED).
  secrets = collection('auth_secrets', {});
  sessions = collection('auth_sessions', {});
  const s = secrets.get();
  if (!s.ownerKey) {
    secrets.set({ ownerKey: newKey() });
    secrets.flush();
  }
  migrateToDiscord();
  prune();
  log.info(isEnabled() ? 'sign-in is on' : 'sign-in is off: everyone who reaches the server is the owner');
}

export const isEnabled = () => settings?.get().enabled === true;

/**
 * Before 0.1.0 people signed in with Twitch. Those sign-ins, the moderators
 * turned away and what moderators did were all by Twitch account, which
 * means nothing to a Discord sign-in: let go once. The owner key stays, so
 * the streamer keeps a way in.
 */
function migrateToDiscord() {
  if (settings.get().signInWith === 'discord') return;
  const had = Object.values(sessions.get()).some((x) => x?.userId);
  sessions.set(Object.fromEntries(Object.entries(sessions.get()).filter(([, x]) => x && !x.userId)));
  collection('auth_tokens', {}).set({});
  collection('mod_activity', { entries: [] }).set({ entries: [] });
  settings.set({ ...settings.get(), blocked: [], signInWith: 'discord' });
  settings.flush();
  if (had) log.info('signing in is with Discord now: the Twitch sign-ins were let go');
}

/** Who may sign in as what: the moderator role, and an owner other than the server's. */
const roles = () => ({
  modRoleId: settings.get().modRoleId || '',
  ownerDiscordId: settings.get().ownerDiscordId || '',
});

/**
 * The settings screen's view of it: whether it is on, and the owner key —
 * only to somebody signed in as the owner — never to an "open"
 * visitor, who is the owner only because sign-in is off, and could otherwise
 * keep a way in for after it is switched on.
 */
export const authState = (identity) => ({
  enabled: isEnabled(),
  ownerKey: identity && identity.role === 'owner' && identity.via !== 'open' ? secrets.get().ownerKey : '',
  ...roles(),
});

/*
  Whoever wants to know when a sign-in ends (api/ws.js), to let its open
  connections go at once rather than whenever they next reconnect.
*/
const endedListeners = new Set();
export const onSessionsEnded = (fn) => { endedListeners.add(fn); return () => endedListeners.delete(fn); };

/** End every sign-in `drop` picks, and say which. */
function dropSessions(drop) {
  const all = sessions.get();
  const gone = Object.keys(all).filter((id) => drop(all[id], id));
  if (!gone.length) return [];
  sessions.set(Object.fromEntries(Object.entries(all).filter(([id]) => !gone.includes(id))));
  sessions.flush();
  for (const fn of endedListeners) { try { fn(gone); } catch (err) { log.warn('a sign-in listener failed:', err.message); } }
  return gone;
}

/** Equal without saying, by how long it took, how much of it was right. */
function same(a, b) {
  const x = Buffer.from(String(a || ''));
  const y = Buffer.from(String(b || ''));
  return x.length === y.length && x.length > 0 && crypto.timingSafeEqual(x, y);
}

export function parseCookies(header) {
  const out = {};
  for (const part of String(header || '').split(';')) {
    const at = part.indexOf('=');
    if (at <= 0) continue;
    // A cookie somebody else's page set badly is no reason to drop the connection: it is just not ours.
    try { out[part.slice(0, at).trim()] = decodeURIComponent(part.slice(at + 1).trim()); } catch { /* skipped */ }
  }
  return out;
}

/** Whether the browser reached us over HTTPS: directly, or through Cloudflare, which says so in a header. */
const isHttps = (req) => Boolean(req?.socket?.encrypted) || String(req?.headers?.['x-forwarded-proto'] || '').split(',')[0].trim() === 'https';

export function sessionCookie(req, id, days) {
  return `${COOKIE}=${id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${days * 86_400}${isHttps(req) ? '; Secure' : ''}`;
}
export const clearCookie = (req) => `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${isHttps(req) ? '; Secure' : ''}`;

function prune(now = Date.now()) {
  const all = sessions.get();
  const kept = Object.fromEntries(Object.entries(all).filter(([, s]) => s && s.expiresAt > now));
  if (Object.keys(kept).length !== Object.keys(all).length) sessions.set(kept);
}

function startSession(user, role, now = Date.now()) {
  const id = newKey();
  const days = SESSION_DAYS[role] || 7;
  sessions.update((all) => ({ ...all, [id]: { ...user, role, createdAt: now, seenAt: now, checkedAt: now, expiresAt: now + days * 86_400_000 } }));
  sessions.flush();
  return { id, days };
}

const who = (s, via) => ({ role: s.role, userId: s.userId || '', login: s.login || '', name: s.name || s.login || '', via });

/**
 * Who a request comes from, or null for nobody the server will talk to: a
 * sign-in's cookie, or the owner key as a script's Authorization header.
 */
export function identify(req, { now = Date.now() } = {}) {
  const open = { role: 'owner', userId: '', login: '', name: '', via: 'open' };
  const cookie = parseCookies(req?.headers?.cookie)[COOKIE];
  if (cookie) {
    const s = sessions.get()[cookie];
    // With sign-in off, a streamer's own sign-in is still theirs (it is how they turn it on); anybody else is the owner as before.
    if (s && s.expiresAt > now && (isEnabled() || s.role === 'owner')) {
      // Used, so it lasts: a sign-in in use every day never runs out.
      const days = SESSION_DAYS[s.role] || 7;
      if (now - (s.seenAt || 0) > 3_600_000) sessions.update((all) => ({ ...all, [cookie]: { ...s, seenAt: now, expiresAt: now + days * 86_400_000 } }));
      return { ...who(s, 'session'), sessionId: cookie, checkedAt: s.checkedAt || 0 };
    }
  }
  // The owner key only as a header, from a script: never in an address, where history and logs keep it.
  const header = bearer(req);
  if (header && same(header, secrets.get().ownerKey)) return { role: 'owner', userId: '', login: '', name: '', via: 'owner-key' };
  if (!isEnabled()) return open;
  return null;
}

function bearer(req) {
  const m = /^Bearer\s+(\S+)$/i.exec(String(req?.headers?.authorization || ''));
  return m ? m[1] : '';
}

/*
  Where the live connection may be opened from: a page on this same address,
  or the development page beside it. Without this any website a signed-in
  streamer visited could open a connection with their cookie and drive the
  whole app.
*/
export function originAllowed(req) {
  const origin = req?.headers?.origin;
  if (!origin) return true;
  // With sign-in off there is nothing a borrowed sign-in would add, and a page pointed elsewhere with ?server= must still connect.
  if (!isEnabled()) return true;
  let o;
  try { o = new URL(origin); } catch { return false; }
  const host = String(req.headers.host || '').toLowerCase();
  if (o.host.toLowerCase() === host) return true;
  // The UI on Vite's port while developing, against a server on this machine.
  return (o.hostname === 'localhost' || o.hostname === '127.0.0.1') && /^(localhost|127\.0\.0\.1):\d+$/.test(host);
}

/** The owner: the account named on the Settings screen, or else the owner of the bot's server. */
async function ownerId(guildId) {
  const named = roles().ownerDiscordId;
  if (named) return named;
  return discord.guildOwner(guildId).catch(() => null);
}

/** Whether a member of the server is one of its moderators: the role chosen, or a role that can moderate. */
function isMod(guildId, userId, member) {
  const { modRoleId } = roles();
  if (modRoleId && (member?.roles || []).includes(modRoleId)) return true;
  return discord.isModerator(guildId, userId, member);
}

/**
 * Sign in with the code Discord handed the sign-in page back. Answers the
 * new session, or refuses with a code the page says in its own words.
 */
export async function signInWithDiscord(code, redirectUri) {
  const d = discord.getStatus();
  if (!d.clientId || !d.hasClientSecret || !d.guildId) throw refusal('signin_no_discord', 'the bot\'s Discord app and server are not set up yet');
  let account;
  try {
    account = await discord.userFromCode(String(code || '').trim(), String(redirectUri || ''));
  } catch (err) {
    log.debug(`a Discord sign-in failed: ${err.message}`);
    throw refusal('signin_code_bad', 'Discord did not accept that sign-in; try again');
  }
  if (!account?.id) throw refusal('signin_code_bad', 'Discord did not accept that sign-in; try again');
  const user = { userId: String(account.id), login: String(account.username || ''), name: String(account.global_name || account.username || '') };
  if (user.userId === String(await ownerId(d.guildId) || '')) {
    log.info(`${user.login} signed in as the owner`);
    return { ...startSession(user, 'owner'), role: 'owner', login: user.login };
  }
  // Turned away by the streamer (the Moderators screen): a moderator of the server, but not let in here.
  if (isBlocked(user.userId)) throw refusal('signin_blocked', 'the streamer has turned this account away from the dashboard');
  let member;
  try {
    member = await discord.getMemberOf(d.guildId, user.userId);
  } catch {
    throw refusal('signin_mod_check', 'Discord would not say who moderates the server; try again');
  }
  if (!member) throw refusal('signin_not_member', 'only members of the bot\'s Discord server can sign in');
  if (!isMod(d.guildId, user.userId, member)) throw refusal('signin_not_mod', 'only moderators of the Discord server can sign in');
  if (member.nick) user.name = String(member.nick);
  log.info(`${user.login} signed in as a moderator`);
  return { ...startSession(user, 'mod'), role: 'mod', login: user.login };
}

/** Sign in with the owner key: the way back in when Discord cannot be. */
export function signInWithOwnerKey(key) {
  if (!same(key, secrets.get().ownerKey)) throw refusal('signin_key_wrong', 'that is not the owner key');
  log.info('signed in with the owner key');
  return { ...startSession({ userId: '', login: '', name: '' }, 'owner'), role: 'owner', login: '' };
}

/** Sign this browser out here and on every connection it has open. */
export function signOut(sessionId) {
  if (!sessionId || !sessions.get()[sessionId]) return false;
  return dropSessions((_s, id) => id === sessionId).length > 0;
}

/**
 * This browser signed in as the owner, while sign-in is off — which is what
 * anybody reaching the app is anyway. It is how a streamer with no Discord
 * set up yet gets a sign-in to switch it on with; switching on then ends
 * every other sign-in (setEnabled), so one taken meanwhile does not last.
 */
export function claimOwner(identity) {
  if (isEnabled() || identity?.via !== 'open') throw refusal('signin_owner_only', 'only the streamer can change sign-in');
  log.info('signed in as the owner while sign-in is off');
  return { ...startSession({ userId: '', login: '', name: '' }, 'owner'), role: 'owner', login: '' };
}

/**
 * A moderator coming back after a while is asked about again: somebody who
 * left the server, or no longer moderates it, is signed out. Answers
 * whether they may stay.
 */
export async function recheckMod(identity, { now = Date.now() } = {}) {
  if (identity?.role !== 'mod') return true;
  // When it was last asked is the sign-in's, not this connection's copy: a connection open for days is asked again too.
  const session = sessions.get()[identity.sessionId];
  if (!session) return false;
  // Turned away by the streamer: not let back in by a sign-in from before.
  if (isBlocked(identity.userId)) { signOut(identity.sessionId); return false; }
  if (now - (session.checkedAt || 0) < MOD_RECHECK_MS) return true;
  /*
    Let go only on Discord's word: not in the server any more, or no longer a
    moderator there. Discord not answering is not a reason to sign a
    moderator out mid-stream; they are asked again later.
  */
  const guildId = discord.getStatus().guildId;
  let verdict;
  try {
    const member = guildId ? await discord.getMemberOf(guildId, identity.userId) : null;
    verdict = member && isMod(guildId, identity.userId, member) ? 'in' : 'out';
  } catch { verdict = 'later'; }
  if (verdict === 'later') return true;
  if (verdict === 'out') {
    signOut(identity.sessionId);
    log.info(`${identity.login} is no longer let in: not in the server, or not a moderator any more`);
    return false;
  }
  sessions.update((all) => (all[identity.sessionId] ? { ...all, [identity.sessionId]: { ...all[identity.sessionId], checkedAt: now } } : all));
  return true;
}

// ------------------------------------------------------------ the moderators

/** Moderators the streamer has turned away: [{ userId, login, at }]. A moderator of the server all the same, just not let in here. */
const blockedList = () => settings.get().blocked || [];
export const isBlocked = (userId) => blockedList().some((b) => b.userId === String(userId));

/** Every moderator who has signed in, by their Discord account: how many sign-ins, since when, last seen. */
export function moderators() {
  const byUser = new Map();
  for (const s of Object.values(sessions.get())) {
    if (s?.role !== 'mod' || !s.userId) continue;
    const m = byUser.get(s.userId) || { userId: s.userId, login: s.login || '', name: s.name || s.login || '', sessions: 0, since: Infinity, seenAt: 0 };
    m.sessions += 1;
    m.since = Math.min(m.since, s.createdAt || Infinity);
    m.seenAt = Math.max(m.seenAt, s.seenAt || 0);
    byUser.set(s.userId, m);
  }
  return {
    signedIn: [...byUser.values()].map((m) => ({ ...m, since: Number.isFinite(m.since) ? m.since : 0 })).sort((a, b) => b.seenAt - a.seenAt),
    blocked: blockedList(),
  };
}

/** Sign a moderator out everywhere: every browser they are signed in on. */
export function signOutUser(userId, identity) {
  if (identity?.role !== 'owner') throw refusal('signin_owner_only', 'only the streamer can change sign-in');
  return dropSessions((s) => s.userId === String(userId)).length;
}

/** Turn a moderator away from the dashboard, or let them back in. Turned away, they are signed out at once. */
export function setBlocked(userId, blocked, identity, login = '') {
  if (identity?.role !== 'owner') throw refusal('signin_owner_only', 'only the streamer can change sign-in');
  const id = String(userId || '');
  if (!id) throw refusal('unknown_request', 'no moderator named');
  const rest = blockedList().filter((b) => b.userId !== id);
  settings.set({ ...settings.get(), blocked: blocked ? [...rest, { userId: id, login: String(login || '').slice(0, 40), at: Date.now() }] : rest });
  settings.flush();
  if (blocked) dropSessions((s) => s.userId === id);
  log.info(`${login || id} ${blocked ? 'turned away from' : 'let back into'} the dashboard`);
  return moderators();
}

/**
 * Turn sign-in on or off. Only somebody who would still be the owner with
 * it on may: from a sign-in of their own, or the owner key — never merely
 * because it is off, or turning it on would lock out the one who did it.
 */
export function setEnabled(enabled, identity) {
  if (identity?.role !== 'owner') throw refusal('signin_owner_only', 'only the streamer can change sign-in');
  if (enabled && identity.via === 'open') throw refusal('signin_first', 'sign in first, so turning this on cannot lock you out');
  if (enabled && !isEnabled()) {
    /*
      While it was off, anybody who reached the app was the owner, and could
      have signed in as one or read the owner key. Switching on is where that
      ends: a new owner key, and every sign-in but the one switching it on
      let go. Moderators and the streamer sign in again.
    */
    secrets.set({ ...secrets.get(), ownerKey: newKey() });
    secrets.flush();
    dropSessions((_s, id) => id !== identity.sessionId);
  }
  settings.set({ ...settings.get(), enabled: Boolean(enabled) });
  settings.flush();
  log.info(`sign-in turned ${enabled ? 'on' : 'off'}`);
  return authState(identity);
}

/**
 * Who may sign in as what: the moderator role ('' for any role that can
 * moderate), and the owner's Discord account ('' for the server's owner).
 */
export function setRoles(patch, identity) {
  if (identity?.role !== 'owner' || identity.via === 'open') throw refusal('signin_owner_only', 'only the streamer can change sign-in');
  const snowflake = (v) => (/^\d{5,25}$/.test(String(v ?? '')) ? String(v) : '');
  const next = { ...settings.get() };
  if ('modRoleId' in (patch || {})) next.modRoleId = snowflake(patch.modRoleId);
  if ('ownerDiscordId' in (patch || {})) next.ownerDiscordId = snowflake(patch.ownerDiscordId);
  settings.set(next);
  settings.flush();
  return authState(identity);
}

/** A new owner key: the old one stops working, and so does every sign-in made with it. */
export function newSecret(which, identity) {
  if (identity?.role !== 'owner' || identity.via === 'open') throw refusal('signin_owner_only', 'only the streamer can change sign-in');
  if (which !== 'ownerKey') throw refusal('unknown_request', `no key called ${which}`);
  secrets.set({ ...secrets.get(), [which]: newKey() });
  secrets.flush();
  // A sign-in made with the owner key has no Discord account to it; with a new key, those end — but not the one asking.
  if (which === 'ownerKey') dropSessions((s, id) => s.role === 'owner' && !s.userId && id !== identity.sessionId);
  return authState(identity);
}

/** For tests. */
export const _test = {
  sessions: () => sessions.get(),
  /** Make a sign-in look as if it was last asked about long ago. */
  age: (sessionId, ms) => sessions.update((all) => (all[sessionId] ? { ...all, [sessionId]: { ...all[sessionId], checkedAt: all[sessionId].checkedAt - ms } } : all)),
};
