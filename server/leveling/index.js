/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * XP and levels, earned by talking in Discord.
 *
 * Identity model: a `user` record holds the XP, and an `accounts` map points
 * a `discord:<id>` key at it.
 *
 * XP is awarded from the bus directly, not from a message a browser sends, so
 * it accrues whether or not a page is open.
 */

import { collection } from '../core/store.js';
import { bus, EVENTS } from '../core/bus.js';
import { createLogger } from '../core/logger.js';
import * as discord from '../platforms/discord.js';
import { pickLine } from '../../shared/pick-line.js';

const log = createLogger('leveling');

const DEFAULT_CONFIG = {
  enabled: true,
  xpRate: 1,
  minXp: 15,
  maxXp: 25,
  cooldown: 60,
  levelUpMessage: '🎉 GG {user}! You just reached **Level {level}**!',
  announceChannelId: null,
  roleRewards: [],
  ignoredChannelIds: [],
};

/*
  "!rank" and "!top" in Discord (leveling/chat.js): the words that ask, and
  what is answered. In the stream's language.
*/
export const DEFAULT_LEVEL_CHAT = {
  enabled: true,
  rankWord: '!rank',
  topWord: '!top',
  rankText: '{user}: nivel {level} · {xp} XP · puesto #{rank} de {total}',
  topText: 'Top {count}: {top}',
  topCount: 5,
};

/** The chat answers as stored: words of a sane length, a count of 1 to 10. */
export function cleanLevelChat(c) {
  const word = (v, fallback) => {
    const w = String(v ?? '').trim().split(/\s+/)[0].slice(0, 30);
    return w || fallback;
  };
  const text = (v, fallback, max) => String(v ?? '').trim().slice(0, max) || fallback;
  const count = Number(c?.topCount);
  return {
    enabled: c?.enabled !== false,
    rankWord: word(c?.rankWord, DEFAULT_LEVEL_CHAT.rankWord),
    topWord: word(c?.topWord, DEFAULT_LEVEL_CHAT.topWord),
    rankText: text(c?.rankText, DEFAULT_LEVEL_CHAT.rankText, 200),
    topText: text(c?.topText, DEFAULT_LEVEL_CHAT.topText, 200),
    topCount: Number.isFinite(count) ? Math.min(10, Math.max(1, Math.round(count))) : DEFAULT_LEVEL_CHAT.topCount,
  };
}

let users = null;
let accounts = null;
let cfg = null;

export const getLevel = (xp) => Math.floor(0.1 * Math.sqrt(Math.max(0, xp)));

export function initLeveling() {
  users = collection('users', {});
  accounts = collection('accounts', {});
  cfg = collection('xp_config', DEFAULT_CONFIG);

  const onMessage = (chat) => {
    if (!cfg.get().enabled || chat?.platform !== 'discord') return;
    // Channels can be left out of XP.
    const ignored = cfg.get().ignoredChannelIds || [];
    if (ignored.includes(chat.raw?.channelId)) return;
    award(chat).catch((err) => log.error('award failed:', err));
  };
  bus.on(EVENTS.CHAT, onMessage);
  // The rest of the Discord server: not the stream's chat, but talking there counts too.
  bus.on('discord:message_elsewhere', onMessage);

  log.info(`ready — ${Object.keys(users.get()).length} users tracked`);
}

const newUid = () => `u_${Math.random().toString(36).slice(2, 11)}`;

/** Resolve (or create) the unified user for a platform identity. */
function resolveUser(platform, id, username, avatar) {
  const key = `${platform}:${id}`;
  const map = accounts.get();

  let uid = map[key];
  if (!uid || !users.get()[uid]) {
    uid = newUid();
    users.update((prev) => {
      prev[uid] = { id: uid, username, avatar, xp: 0, level: 0, lastXpTime: 0, createdAt: Date.now() };
      return prev;
    });
    accounts.update((prev) => { prev[key] = uid; return prev; });
  }
  return uid;
}

async function award(chat) {
  const c = cfg.get();
  const identityId = chat.userId || chat.user;
  const uid = resolveUser(chat.platform, identityId, chat.user, chat.avatar);

  const user = users.get()[uid];
  const now = Date.now();

  if (now - (user.lastXpTime || 0) < c.cooldown * 1000) return;

  const base = Math.floor(Math.random() * (c.maxXp - c.minXp + 1)) + c.minXp;
  const gain = Math.max(0, Math.round(base * (c.xpRate || 1)));

  const nextXp = user.xp + gain;
  const nextLevel = getLevel(nextXp);
  const levelledUp = nextLevel > user.level;

  users.update((prev) => {
    prev[uid] = {
      ...prev[uid],
      username: chat.user || prev[uid].username,
      avatar: chat.avatar || prev[uid].avatar,
      xp: nextXp,
      level: nextLevel,
      lastXpTime: now,
      // Bots: they keep their XP, but are not ranked among the people.
      ...(chat.isBot ? { own: true } : {}),
    };
    return prev;
  });

  // The Levels screen's board follows, a few seconds behind (api/ws.js gathers these).
  bus.emit('xp:changed', uid);
  if (!levelledUp) return;

  log.info(`${chat.user} reached level ${nextLevel} (via ${chat.platform})`);
  bus.emit(EVENTS.LEVELUP, { user: chat.user, level: nextLevel, platform: chat.platform, uid });

  await grantRewards(uid, nextLevel, chat);
}

async function grantRewards(uid, level, chat) {
  const c = cfg.get();
  const discordKey = Object.keys(accounts.get()).find(
    (k) => k.startsWith('discord:') && accounts.get()[k] === uid,
  );
  const discordId = discordKey ? discordKey.split(':')[1] : null;
  const guildId = chat.raw?.guildId || discord.getSettings().guildId;

  const reward = (c.roleRewards || []).find((r) => Number(r.level) === level);
  if (reward && discordId && guildId) {
    try {
      await discord.addRole(guildId, discordId, reward.roleId);
      log.info(`granted role ${reward.roleName || reward.roleId} to ${chat.user}`);
    } catch (err) {
      log.warn(`could not grant role: ${err.message}`);
    }
  }

  const channelId = c.announceChannelId || chat.raw?.channelId;
  if (!channelId) return;

  // A Discord mention is safe verbatim; a raw username is not.
  const who = discordId ? `<@${discordId}>` : discord.sanitise(chat.user);
  // One of the messages written, when there are several (shared/pick-line.js).
  const text = String(pickLine(c.levelUpMessage || ''))
    .replace(/\{user\}/g, who)
    .replace(/\{level\}/g, String(level));

  try {
    await discord.sendMessage(channelId, text);
  } catch (err) {
    log.warn(`could not announce level-up: ${err.message}`);
  }
}

// ------------------------------------------------------------------- public

export const getUsers = () => users.get();
/** Which person every account belongs to: `discord:<id>` → their uid. */
export const getAccounts = () => accounts.get();
/** The settings, with the chat answers filled in for a config saved before they existed. */
export const getConfig = () => ({ ...cfg.get(), chat: cleanLevelChat(cfg.get().chat || DEFAULT_LEVEL_CHAT) });

export function setConfig(patch) {
  const next = { ...cfg.get(), ...patch };
  if (patch?.chat !== undefined) next.chat = cleanLevelChat(patch.chat);
  if (patch?.ignoredChannelIds !== undefined) {
    next.ignoredChannelIds = [...new Set((Array.isArray(patch.ignoredChannelIds) ? patch.ignoredChannelIds : []).map(String).filter((id) => /^\d{1,25}$/.test(id)))];
  }
  return cfg.set(next);
}

/**
 * The server's own people — the bot, any bot that has talked, and the
 * server's owner — by uid, so they are known before either says another word.
 */
function ownUids() {
  const all = Object.values(users.get());
  const own = new Set(all.filter((u) => u.own).map((u) => u.id));
  let status = null;
  try {
    status = discord.getStatus();
  } catch {
    status = null;
  }
  const map = accounts.get();
  for (const id of [status?.botUserId, status?.guildId ? discord.ownerOf(status.guildId) : null]) {
    if (id && map[`discord:${id}`]) own.add(map[`discord:${id}`]);
  }
  return own;
}

/**
 * The chatters by XP, most first: what "top chatters" and the Levels screen
 * rank. The streamer and their bot are left out — they are the channel, not
 * its chat — though they keep their XP and their levels.
 */
export function leaderboard(limit = 50) {
  const own = ownUids();
  return Object.values(users.get())
    .filter((u) => !own.has(u.id))
    .sort((a, b) => b.xp - a.xp)
    .slice(0, limit);
}

/** XP a level starts at: the inverse of getLevel. */
export const xpForLevel = (level) => (level <= 0 ? 0 : (level * 10) ** 2);

/** The person behind a platform account, if they have ever earned XP. */
export function findUser(platform, id) {
  const uid = accounts?.get()[`${platform}:${id}`];
  return uid ? users.get()[uid] || null : null;
}

/** Somebody by the name they chat under, whatever the platform. */
export function findByName(name) {
  const wanted = String(name ?? '').replace(/^@/, '').trim().toLowerCase();
  if (!wanted) return null;
  const all = Object.values(users?.get() || {});
  return all.filter((u) => String(u.username || '').toLowerCase() === wanted).sort((a, b) => b.xp - a.xp)[0] || null;
}

/** Where somebody stands: { rank, total }, or null for the channel's own accounts. */
export function rankOf(uid) {
  const board = leaderboard(Infinity);
  const at = board.findIndex((u) => u.id === uid);
  return at < 0 ? null : { rank: at + 1, total: board.length };
}

export function reset() {
  users.set({});
  accounts.set({});
  log.warn('all XP data reset');
}

/** Every account one person has, as `platform:id` keys. */
export function accountsOf(uid) {
  return Object.entries(accounts?.get() || {}).filter(([, v]) => v === uid).map(([k]) => k);
}

/** The person behind a platform account, made if they are new: for something they did before they ever chatted. */
export const personFor = (platform, id, username, avatar) => resolveUser(platform, String(id), username, avatar);

/**
 * Forget people altogether: their XP, and every account of theirs. Whatever
 * else is kept per person hears it and lets them go too.
 */
export function forget(uids) {
  const gone = new Set(uids);
  if (!gone.size) return { people: 0, accounts: 0 };
  const keys = Object.entries(accounts.get()).filter(([, v]) => gone.has(v)).map(([k]) => k);
  users.update((prev) => { for (const uid of gone) delete prev[uid]; return prev; });
  accounts.update((prev) => { for (const k of keys) delete prev[k]; return prev; });
  bus.emit('people:forgotten', { uids: [...gone], keys });
  log.info(`forgot ${gone.size} people (${keys.length} accounts)`);
  return { people: gone.size, accounts: keys.length };
}
