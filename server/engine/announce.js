/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Going live, announced in Discord: when a channel on the watch list
 * (engine/watch.js) goes live, the bot posts in the Discord channel that
 * channel's setup names — its words, a role to ping if it has one, a card
 * with the title, the game and the live picture, and a button to watch — and
 * when the stream stops it marks the post as over, takes it down, or leaves it.
 *
 * Every watched channel has its own post, set up apart. The post waits the
 * setup's few seconds first, so the live picture is the stream rather than
 * an offline screen, and is called off if the stream stops before then.
 */

import { bus } from '../core/bus.js';
import { createLogger } from '../core/logger.js';
import { refusal } from '../core/refusal.js';
import * as discord from '../platforms/discord.js';
import * as watch from './watch.js';
import { pickLine } from '../../shared/pick-line.js';

const log = createLogger('announce');

const BUTTON = { twitch: 'Twitch', youtube: 'YouTube' };

/** Posts waiting their few seconds, by watched channel: { timer, run }. */
const pending = new Map();

/**
 * A message written for the Twitch schedule an earlier SimonBot read: the
 * sentence naming the next stream ({next}, {nextTitle}, {nextGame}) is left
 * out, rather than reading "Next stream: " and nothing.
 */
export function fillNext(text) {
  const lines = String(text ?? '').split('\n');
  const named = /\{next(Title|Game)?\}/;
  return lines
    .map((l) => (named.test(l) ? l.replace(/[^.!?—|]*\{next(Title|Game)?\}[^.!?—|]*[.!?]?/g, '').replace(/\s*[—|]\s*$/, '').trimEnd() : l))
    .filter((l, i) => !(named.test(lines[i]) && !l.trim()))
    .join('\n');
}

/**
 * The post, from a channel's setup and what is known about its stream. Only
 * the role chosen in the setup can be pinged: a stream title is the
 * streamer's words, but it still goes into the post as {title}, and a title
 * with "@everyone" in it must not ping everybody.
 */
export function postFor(cfg, info) {
  const role = cfg.roleId === 'everyone' ? '@everyone' : cfg.roleId ? `<@&${cfg.roleId}>` : '';
  const streamer = info?.name || '';
  const fill = (text) => fillNext(text)
    .replace(/\{role\}/g, role)
    .replace(/\{streamer\}/g, discord.sanitise(streamer))
    .replace(/\{title\}/g, discord.sanitise(info?.title || ''))
    .replace(/\{game\}/g, discord.sanitise(info?.game || ''))
    .replace(/\{link\}/g, info?.url || '')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();

  const embed = cfg.card ? {
    author: streamer ? `${streamer} · LIVE` : 'LIVE',
    title: info?.title || undefined,
    url: info?.url || undefined,
    description: info?.game ? `**${discord.sanitise(info.game)}**` : undefined,
    color: cfg.cardColor,
    image: info?.thumbnail || undefined,
  } : undefined;

  const components = info?.url
    ? [{ type: 1, components: [{ type: 2, style: 5, label: BUTTON[info.platform] || 'Watch', url: info.url }] }]
    : undefined;

  const allowed = cfg.roleId === 'everyone'
    ? { parse: ['everyone'] }
    : { parse: [], roles: cfg.roleId ? [cfg.roleId] : [] };
  return { content: fill(cfg.message), embed, components, allowed_mentions: allowed };
}

/** Post a channel's announcement now. `test` posts it whether or not the channel is live. */
export async function announce(id, { test = false, current = null } = {}) {
  const entry = watch.get(id);
  if (!entry) throw refusal('watch_not_found', 'not on the list');
  const cfg = entry.alert;
  if (!cfg.channelId) throw refusal('announce_no_channel', 'choose a channel to announce in');
  // The stream stopped while this waited: there is nothing to announce.
  if (current?.cancelled) return { cancelled: true };
  const info = watch.infoFor(entry);
  const post = postFor(cfg, info);
  if (!post.content && !post.embed) throw refusal('announce_empty', 'the announcement has nothing to say');
  const sent = await discord.sendMessage(cfg.channelId, post.content, post.embed, post.components, undefined, { allowed_mentions: post.allowed_mentions });
  watch.setLast(id, sent?.id ? { channelId: cfg.channelId, messageId: sent.id, at: Date.now(), test } : null);
  log.info(`${test ? 'test ' : ''}announcement posted for ${entry.name}`);
  return { messageId: sent?.id, live: info.live };
}

/** A channel's stream stopped: its post is marked over, taken down or left. */
export async function streamOver(id) {
  const entry = watch.get(id);
  const last = entry?.last;
  if (!last?.messageId) return;
  const cfg = entry.alert;
  if (cfg.whenOver !== 'keep') {
    try {
      if (cfg.whenOver === 'delete') {
        await discord.deleteMessage(last.channelId, last.messageId);
      } else {
        // The card stays, greyed and captioned as over; the ping and the button go.
        const current = await discord.getMessage(last.channelId, last.messageId);
        const card = current?.embeds?.[0];
        await discord.editMessage(
          last.channelId, last.messageId, fillNext(pickLine(cfg.overMessage || '')).trim(),
          card ? { title: card.title, url: card.url, description: card.description, author: card.author?.name?.replace(' · LIVE', ' · OFFLINE'), color: '#4f545c', image: card.image?.url } : undefined,
          [], { allowed_mentions: { parse: [] } },
        );
      }
    } catch (err) {
      log.warn(`could not update the announcement: ${err.message}`);
    }
  }
  watch.setLast(id, null);
}

function cancel(id) {
  const p = pending.get(id);
  if (!p) return false;
  clearTimeout(p.timer);
  p.run.cancelled = true;
  pending.delete(id);
  return true;
}

/** A watched channel went live: its post, after its few seconds. */
function onLive({ entry }) {
  const cfg = entry?.alert;
  if (!cfg?.enabled || !cfg.channelId) return;
  cancel(entry.id);
  const run = { cancelled: false };
  const timer = setTimeout(() => {
    pending.delete(entry.id);
    announce(entry.id, { current: run }).catch((err) => log.warn(`could not announce ${entry.name} going live: ${err.message}`));
  }, cfg.delaySeconds * 1000);
  timer.unref?.();
  pending.set(entry.id, { timer, run });
}

/** A watched channel went offline: a post still waiting is called off; one up is marked over. */
function onEnded({ entry }) {
  if (!entry) return;
  cancel(entry.id);
  streamOver(entry.id).catch(() => {});
}

export function initAnnounce() {
  bus.on('watch:live', onLive);
  bus.on('watch:ended', onEnded);
}

export function stopAnnounce() {
  for (const id of [...pending.keys()]) cancel(id);
}

export const _test = { onLive, onEnded, pending: () => pending };
