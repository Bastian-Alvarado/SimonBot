/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The mod log. When somebody is banned or timed out in the Discord server,
 * a private Discord channel says so, and the Moderators screen keeps the
 * latest entries.
 */

import { collection } from '../core/store.js';
import { bus, EVENTS } from '../core/bus.js';
import { createLogger } from '../core/logger.js';
import * as discord from '../platforms/discord.js';

const log = createLogger('moderation');

export const DEFAULT_MODERATION = { logChannelId: '' };
const LOG_LIMIT = 200;

let store = null;
const lastTimeout = new Map();

export function cleanModeration(c = {}) {
  return {
    logChannelId: /^\d{5,25}$/.test(String(c.logChannelId || '')) ? String(c.logChannelId) : '',
  };
}
export const getModeration = () => cleanModeration({ ...DEFAULT_MODERATION, ...(store?.get().settings || {}) });

const span = (sec) => (sec >= 86_400 ? `${Math.round(sec / 86_400)} d` : sec >= 3600 ? `${Math.round(sec / 3600)} h` : sec >= 60 ? `${Math.round(sec / 60)} min` : `${sec} s`);

/** The mod log's entry: what happened, to whom. */
export function logEntry({ kind, user, userId, seconds = 0, reason = '' }) {
  const what = kind === 'ban' ? '🔨 Ban' : `⏳ Timeout (${span(seconds)})`;
  return {
    embed: {
      title: what,
      description: [`**${discord.sanitise(user || userId || '?', 60)}**${userId ? ` (<@${userId}>)` : ''}`, reason ? `> ${discord.sanitise(reason, 200)}` : ''].filter(Boolean).join('\n'),
      color: kind === 'ban' ? '#ed4245' : '#faa61a',
    },
  };
}

function remember(entry) {
  store.update((v) => ({ ...v, log: [{ at: Date.now(), ...entry }, ...(v.log || [])].slice(0, LOG_LIMIT) }));
  bus.emit(EVENTS.CONFIG, { key: 'moderationLog', value: store.get().log });
}

/** Somebody banned or timed out: into the log, and the mod log channel when there is one. */
async function onAction(a) {
  if (!a?.userId) return;
  remember({ platform: 'discord', kind: a.kind, user: a.user || a.userId, userId: a.userId, seconds: a.seconds || 0, reason: a.reason || '' });
  const cfg = getModeration();
  if (!cfg.logChannelId) return;
  const { embed } = logEntry(a);
  await discord.sendMessage(cfg.logChannelId, '', embed, undefined, undefined, { allowed_mentions: { parse: [] } })
    .catch((err) => log.warn(`could not write the mod log: ${err.message}`));
}

/** A ban, and a timeout that has just been put on somebody. */
function onDiscordBan(d) {
  if (!d?.user?.id) return;
  onAction({ kind: 'ban', userId: String(d.user.id), user: d.user.global_name || d.user.username }).catch(() => {});
}
function onDiscordMember(d) {
  const id = d?.user?.id;
  const until = d?.communication_disabled_until ? Date.parse(d.communication_disabled_until) : 0;
  if (!id) return;
  const was = lastTimeout.get(id) || 0;
  lastTimeout.set(id, until);
  if (until > Date.now() && until !== was) {
    onAction({ kind: 'timeout', userId: String(id), user: d.nick || d.user.global_name || d.user.username, seconds: Math.round((until - Date.now()) / 1000) }).catch(() => {});
  }
}

/** From the Moderators screen: the log, or the settings. */
export async function control(payload = {}) {
  if (payload.op === 'log') return store.get().log || [];
  const next = cleanModeration({ ...getModeration(), ...(payload.settings || {}) });
  store.update((v) => ({ ...v, settings: next }));
  bus.emit(EVENTS.CONFIG, { key: 'moderation', value: next });
  return next;
}

export const snapshot = () => ({ moderation: getModeration(), moderationLog: (store?.get().log || []).slice(0, 50) });

export function initModeration() {
  store = collection('moderation', { settings: DEFAULT_MODERATION, log: [] });
  bus.on('discord:member_ban', onDiscordBan);
  bus.on('discord:member_update', onDiscordMember);
}

export const _test = { onAction, onDiscordMember };
