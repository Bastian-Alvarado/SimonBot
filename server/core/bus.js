/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The central nervous system.
 *
 * Platforms publish *normalised* events here; the engine, the leveling system
 * and the WebSocket hub all subscribe. Nothing talks to anything else directly,
 * which is what lets the whole stack run with zero browsers attached.
 *
 * A listener that throws is isolated — one bad subscriber can never stop an
 * event reaching the others.
 */

import { createLogger } from './logger.js';

const log = createLogger('bus');

/** Canonical event names. Use these constants, never raw strings. */
export const EVENTS = {
  /** A chat message from any platform. Payload: NormalisedChatMessage */
  CHAT: 'chat',
  /** A stream event (follow/sub/cheer/raid/gift/...). Payload: NormalisedEvent */
  EVENT: 'event',
  /** A platform connection status change. Payload: { platform, status, error? } */
  STATUS: 'status',
  /** Config mutated server-side. Payload: { key, value } */
  CONFIG: 'config',
  /** The authoritative Twitch subscriber list. Payload: helix subscription[] */
  SUBSCRIBER_LIST: 'subscriber_list',
  /**
   * What the Twitch channel is set to. Payload: { categoryId, categoryName,
   * title, initial }. `initial` marks the reading taken on connect rather than
   * a change Twitch announced, so a listener can tell "this is how it is" from
   * "this just changed".
   */
  CHANNEL: 'channel',
  /** Leveling emitted a level-up. Payload: { user, level, platform } */
  LEVELUP: 'levelup',
  /** A live reading worth passing on, such as whether Twitch is live. Payload: { key, value } */
  STAT: 'stat',
  /** Messages were removed upstream. Payload: { platform, msgIds[], userIds[] } */
  CHAT_DELETE: 'chat_delete',
};

class Bus {
  #listeners = new Map();
  #wildcard = new Set();

  on(event, fn) {
    if (!this.#listeners.has(event)) this.#listeners.set(event, new Set());
    this.#listeners.get(event).add(fn);
    return () => this.off(event, fn);
  }

  off(event, fn) {
    this.#listeners.get(event)?.delete(fn);
  }

  /** Subscribe to every event. Used by the WS hub and diagnostics. */
  onAny(fn) {
    this.#wildcard.add(fn);
    return () => this.#wildcard.delete(fn);
  }

  emit(event, payload) {
    const direct = this.#listeners.get(event);
    if (direct) {
      for (const fn of direct) {
        try {
          fn(payload);
        } catch (err) {
          log.error(`listener for "${event}" threw:`, err);
        }
      }
    }
    for (const fn of this.#wildcard) {
      try {
        fn(event, payload);
      } catch (err) {
        log.error(`wildcard listener threw on "${event}":`, err);
      }
    }
  }
}

export const bus = new Bus();

/**
 * Normalises a chat message from any platform into the exact shape the UI's
 * `ChatMessage` type expects, plus the flags the engine reads: mod, sub,
 * VIP and broadcaster.
 */
export function normaliseChat({
  platform,
  // The platform's own message id when it has one, so upstream deletions can
  // be matched. Falls back to a generated id for platforms that send none.
  id = null,
  user,
  userId = null,
  msg = '',
  color = '#ffffff',
  avatar,
  isMod = false,
  isSub = false,
  isVip = false,
  isBroadcaster = false,
  // Said by the channel's own bot account: the streamer's, not a viewer's.
  isBot = false,
  emotes,
  highlighted = false,
  // Set when the message was typed into a channel-point reward that asks for
  // text, so a page can tell such a line apart from an ordinary one.
  rewardId = null,
  raw = null,
  // A Discord line's mentions by name (discord.js mentionNames), kept with it for screens.
  names = undefined,
}) {
  return {
    id: id || `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
    platform,
    user,
    userId,
    msg,
    color,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    /*
      The moment it arrived, kept alongside the formatted string.

      `time` is formatted here, in the server's locale, so a client cannot
      offer 12h/24h without the raw value. A page that reloads is replayed the
      recent log, and the raw value is what tells it how old each line is.
    */
    at: Date.now(),
    avatar,
    isMod,
    isSub,
    isVip,
    isBroadcaster,
    isBot,
    emotes,
    highlighted,
    rewardId,
    raw,
    ...(names ? { names } : {}),
  };
}

/** Normalises a stream event. `type` says what happened, as `platform_kind` (e.g. `twitch_follow`). */
export function normaliseEvent({ type, platform, user, data = {}, avatar }) {
  return {
    id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
    type,
    platform,
    user,
    data,
    avatar,
    timestamp: Date.now(),
  };
}
