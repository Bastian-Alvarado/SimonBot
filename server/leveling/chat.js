/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * "!rank" and "!top" in Discord: where somebody stands, and who leads.
 *
 * Answered as a reply in the channel it was typed in, any channel of the
 * server.
 *
 * "!rank Ana" asks about somebody else. Each person is answered at most every
 * half minute per word, and each chat at most every two seconds,
 * so a chat that all asks at once does not bury itself in answers.
 */

import { bus, EVENTS } from '../core/bus.js';
import { createLogger } from '../core/logger.js';
import * as leveling from './index.js';
import * as discord from '../platforms/discord.js';

const log = createLogger('level-chat');

export const PERSON_EVERY_MS = 30_000;
export const CHAT_EVERY_MS = 2_000;

let services = null;
const asked = new Map();
const answered = new Map();

export function initLevelChat(overrides = {}) {
  services = {
    discord: (text, chat) => discord.sendMessage(chat.raw?.channelId, text, null, null, null, {
      allowed_mentions: { parse: [] },
      ...(chat.raw?.messageId ? { message_reference: { message_id: chat.raw.messageId, fail_if_not_exists: false } } : {}),
    }),
    now: () => Date.now(),
    ...overrides,
  };
  bus.on(EVENTS.CHAT, onChat);
  bus.on('discord:message_elsewhere', onChat);
}

export function stopLevelChat() {
  bus.off(EVENTS.CHAT, onChat);
  bus.off('discord:message_elsewhere', onChat);
  asked.clear();
  answered.clear();
}

/** Somebody's name as Discord shows it: it would read markdown in it. */
const nameFor = (_platform, name) => discord.sanitise(name);

/**
 * The answer to "!rank": the words set for it, filled in. For somebody who
 * is not ranked — the channel's own accounts — the parts naming a place are
 * left out.
 */
export function rankAnswer(person, platform, words = leveling.getConfig().chat) {
  const name = nameFor(platform, person.username);
  const place = leveling.rankOf(person.id);
  const next = leveling.xpForLevel((person.level || 0) + 1) - (person.xp || 0);
  const vars = {
    user: name,
    level: String(person.level || 0),
    xp: (person.xp || 0).toLocaleString('es-MX'),
    rank: place ? String(place.rank) : '',
    total: place ? String(place.total) : '',
    next: Math.max(0, next).toLocaleString('es-MX'),
  };
  return words.rankText
    .split(/\s*·\s*/)
    .filter((part) => place || !/\{(rank|total)\}/.test(part))
    .map((part) => part.replace(/\{(user|level|xp|rank|total|next)\}/g, (_, key) => vars[key]))
    .join(' · ')
    .trim();
}

/** The answer to "!top": the first few by XP, one after another. */
export function topAnswer(platform, words = leveling.getConfig().chat) {
  const board = leveling.leaderboard(words.topCount);
  if (!board.length) return 'Todavía nadie tiene XP.';
  const top = board.map((u, i) => `${i + 1}. ${nameFor(platform, u.username)} (nv ${u.level || 0})`).join(' · ');
  return words.topText.replace(/\{count\}/g, String(board.length)).replace(/\{top\}/g, top);
}

function onChat(chat) {
  const words = leveling.getConfig().chat;
  if (!words?.enabled || !chat || chat.isBot || chat.platform !== 'discord') return;
  const said = String(chat.msg ?? '').trim();
  const first = said.split(/\s+/)[0].toLowerCase();
  const which = first === words.rankWord.toLowerCase() ? 'rank' : first === words.topWord.toLowerCase() ? 'top' : null;
  if (!which) return;
  const answer = services.discord;
  if (!answer) return;

  const now = services.now();
  const who = `${chat.platform}:${chat.userId || chat.user}:${which}`;
  if (now - (asked.get(who) || 0) < PERSON_EVERY_MS) return;
  if (now - (answered.get(chat.platform) || 0) < CHAT_EVERY_MS) return;
  asked.set(who, now);
  answered.set(chat.platform, now);
  if (asked.size > 500) for (const [key, at] of asked) if (now - at > PERSON_EVERY_MS) asked.delete(key);

  let text;
  if (which === 'top') {
    text = topAnswer(chat.platform, words);
  } else {
    const named = said.split(/\s+/).slice(1).join(' ');
    const person = named ? leveling.findByName(named) : leveling.findUser(chat.platform, chat.userId || chat.user);
    text = person
      ? rankAnswer(person, chat.platform, words)
      : `${nameFor(chat.platform, named.replace(/^@/, '') || chat.user)} todavía no tiene XP.`;
  }
  Promise.resolve(answer(text, chat)).catch((err) => log.debug(`could not answer ${first} on ${chat.platform}: ${err.message}`));
}
