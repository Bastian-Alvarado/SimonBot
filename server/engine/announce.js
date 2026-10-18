/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Going live, announced in Discord: when the stream goes on, the bot posts
 * in the channel of your choice — your words, a role to ping if you want one,
 * a card with the title, the game and the live thumbnail, and buttons to
 * watch — and when the stream stops it marks the post as over, takes it
 * down, or leaves it.
 *
 * The stream going on (stream-sessions.js) is the moment. The post waits a
 * little, then asks Twitch for the stream's title, game and thumbnail, and
 * keeps asking for a few minutes, so the thumbnail is the stream rather than
 * an offline screen. If Twitch never says so, it posts anyway with what it has.
 */

import { collection } from '../core/store.js';
import { bus, EVENTS } from '../core/bus.js';
import { createLogger } from '../core/logger.js';
import { refusal } from '../core/refusal.js';
import * as discord from '../platforms/discord.js';
import * as twitch from '../platforms/twitch.js';
import { nextStream } from './twitch-schedule.js';
import { pickLine } from '../../shared/pick-line.js';

const log = createLogger('announce');

export const DEFAULT_ANNOUNCE = {
  enabled: false,
  channelId: '',
  roleId: '',
  message: '{role} {streamer} is live! {title}',
  card: true,
  cardColor: '#9146ff',
  delaySeconds: 45,
  /** edit | delete | keep — what becomes of the post when the stream stops. */
  whenOver: 'edit',
  overMessage: 'The stream is over — thanks for watching!',
  youtubeUrl: '',
  tiktokUrl: '',
  /** The post that is up now, so it can be marked over or taken down. */
  last: null,
};

const LIVE_CHECKS = 8;
const LIVE_EVERY_MS = 20000;

let store = null;
let pending = null;
/** This go-live, so stopping the stream can call off an announcement still waiting for Twitch. */
let run = null;

const link = (v) => {
  const s = String(v ?? '').trim();
  return /^https?:\/\/\S+$/.test(s) ? s.slice(0, 300) : '';
};

export function cleanAnnounce(incoming, before = DEFAULT_ANNOUNCE) {
  const c = { ...before, ...(incoming && typeof incoming === 'object' ? incoming : {}) };
  const snowflake = (v) => (/^\d{5,25}$/.test(String(v ?? '')) ? String(v) : '');
  return {
    enabled: c.enabled === true,
    channelId: snowflake(c.channelId),
    roleId: c.roleId === 'everyone' ? 'everyone' : snowflake(c.roleId),
    message: String(c.message ?? '').slice(0, 1500),
    card: c.card !== false,
    cardColor: /^#[0-9a-fA-F]{6}$/.test(c.cardColor || '') ? c.cardColor : DEFAULT_ANNOUNCE.cardColor,
    delaySeconds: Math.min(600, Math.max(0, Math.round(Number(c.delaySeconds) || 0))),
    whenOver: ['edit', 'delete', 'keep'].includes(c.whenOver) ? c.whenOver : 'edit',
    // Room for a few alternatives, one per line.
    overMessage: String(c.overMessage ?? '').slice(0, 1500),
    youtubeUrl: link(c.youtubeUrl),
    tiktokUrl: link(c.tiktokUrl),
    last: before.last ?? null,
  };
}

export const getAnnounce = () => store?.get() ?? DEFAULT_ANNOUNCE;

function announceState() {
  bus.emit(EVENTS.CONFIG, { key: 'announce', value: getAnnounce() });
}

export function setAnnounce(patch) {
  const next = cleanAnnounce(patch, getAnnounce());
  store.set(next);
  announceState();
  return next;
}

/**
 * {next}, {nextTitle} and {nextGame}: the next stream on the Twitch schedule.
 * {next} is a Discord timestamp, so everybody reads the day and time in
 * their own time zone, with "in 3 days" beside it. With nothing on the
 * schedule, any line that names the next stream is left out whole, rather
 * than reading "Next stream: " and nothing.
 */
export function fillNext(text, next = nextStream()) {
  const lines = String(text ?? '').split('\n');
  const named = /\{next(Title|Game)?\}/;
  if (!next) {
    // The sentence naming it goes — "¡Gracias! Próximo: {next}" keeps "¡Gracias!" — and a line left empty goes too.
    return lines
      .map((l) => (named.test(l) ? l.replace(/[^.!?—|]*\{next(Title|Game)?\}[^.!?—|]*[.!?]?/g, '').replace(/\s*[—|]\s*$/, '').trimEnd() : l))
      .filter((l, i) => !(named.test(lines[i]) && !l.trim()))
      .join('\n');
  }
  const unix = Math.floor(Date.parse(next.start) / 1000);
  return lines.join('\n')
    .replace(/\{next\}/g, `<t:${unix}:F> (<t:${unix}:R>)`)
    .replace(/\{nextTitle\}/g, discord.sanitise(next.title || ''))
    .replace(/\{nextGame\}/g, discord.sanitise(next.category || ''));
}

/**
 * The post, from the settings and what Twitch says about the stream. Only the
 * role chosen here can be pinged: a stream title is the streamer's words, but
 * it still goes into the post as {title}, and a title with "@everyone" in it
 * must not ping everybody.
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

  // A button to watch wherever the stream is.
  const watch = [
    info?.url ? { label: 'Twitch', url: info.url } : null,
    cfg.youtubeUrl ? { label: 'YouTube', url: cfg.youtubeUrl } : null,
    cfg.tiktokUrl ? { label: 'TikTok', url: cfg.tiktokUrl } : null,
  ].filter(Boolean);
  const components = watch.length
    ? [{ type: 1, components: watch.map((w) => ({ type: 2, style: 5, label: w.label, url: w.url })) }]
    : undefined;

  const allowed = cfg.roleId === 'everyone'
    ? { parse: ['everyone'] }
    : { parse: [], roles: cfg.roleId ? [cfg.roleId] : [] };
  return { content: fill(cfg.message), embed, components, allowed_mentions: allowed };
}

/** Wait for Twitch to say it is live, for a few minutes at most; then whatever it says. */
async function liveInfo(current) {
  let info = null;
  for (let i = 0; i < LIVE_CHECKS; i += 1) {
    try { info = await twitch.getLiveInfo(); } catch (err) { log.debug(`Twitch could not say: ${err.message}`); }
    if (!info || info.live) return info;
    await new Promise((r) => setTimeout(r, LIVE_EVERY_MS));
    if (current?.cancelled) return info;
  }
  return info;
}

/** Post the announcement now. `test` posts it without waiting for Twitch to be live. */
export async function announce({ test = false, current = null } = {}) {
  const cfg = getAnnounce();
  if (!cfg.channelId) throw refusal('announce_no_channel', 'choose a channel to announce in');
  const info = test ? await twitch.getLiveInfo().catch(() => null) : await liveInfo(current);
  // The stream stopped while this waited for Twitch: there is nothing to announce.
  if (current?.cancelled) return { cancelled: true };
  const post = postFor(cfg, info);
  if (!post.content && !post.embed) throw refusal('announce_empty', 'the announcement has nothing to say');
  const sent = await discord.sendMessage(cfg.channelId, post.content, post.embed, post.components, undefined, { allowed_mentions: post.allowed_mentions });
  store.set({ ...getAnnounce(), last: sent?.id ? { channelId: cfg.channelId, messageId: sent.id, at: Date.now(), test } : null });
  announceState();
  log.info(`${test ? 'test ' : ''}announcement posted${info?.live ? '' : ' (Twitch did not say it was live)'}`);
  return { messageId: sent?.id, live: Boolean(info?.live) };
}

/** The stream stopped: the post is marked over, taken down or left. */
export async function streamOver() {
  const cfg = getAnnounce();
  const last = cfg.last;
  if (!last?.messageId || cfg.whenOver === 'keep') return;
  try {
    if (cfg.whenOver === 'delete') {
      await discord.deleteMessage(last.channelId, last.messageId);
    } else {
      // The card stays, greyed and captioned as over; the ping and the buttons go.
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
  store.set({ ...getAnnounce(), last: null });
  announceState();
}

/** The stream went on (stream-sessions.js): announce it, after the delay set. */
function onStreamOn() {
  const cfg = getAnnounce();
  if (cfg.enabled && cfg.channelId) {
    clearTimeout(pending);
    if (run) run.cancelled = true;
    const current = { cancelled: false };
    run = current;
    pending = setTimeout(() => {
      pending = null;
      announce({ current }).catch((err) => log.warn(`could not announce going live: ${err.message}`));
    }, cfg.delaySeconds * 1000);
  }
}

/** The stream went off. */
function onStreamOff() {
  // Stopped before it was announced: nothing to announce, and nothing to take down.
  if (pending) { clearTimeout(pending); pending = null; }
  if (run) { run.cancelled = true; run = null; }
  streamOver().catch(() => {});
}

export function initAnnounce() {
  store = collection('discord_announce', DEFAULT_ANNOUNCE);
  bus.on('stream:on', onStreamOn);
  bus.on('stream:off', onStreamOff);
}

export function stopAnnounce() {
  clearTimeout(pending);
  pending = null;
}
