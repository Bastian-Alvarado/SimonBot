/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The engine: what the community features share. It starts the poll, the
 * giveaway and the questions queue with the platforms they answer through,
 * keeps the relay's settings, and gives every page their part of the
 * snapshot and every backup its contents.
 *
 * Each feature keeps its own rules in its own module (polls.js, giveaway.js,
 * questions.js); this is only where they are started and reached from.
 */

import { collection } from '../core/store.js';
import * as polls from './polls.js';
import * as giveaway from './giveaway.js';
import * as questionsModule from './questions.js';
import * as backup from './backup.js';

/** Which chats are carried to which, by engine/relay.js. All off until the streamer turns one on. */
const DEFAULT_RELAY = { twitchToDiscord: false, tiktokToDiscord: false, youtubeToDiscord: false, discordToTwitch: false, discordToYoutube: false };

let db = null;

/** Started once, with the platform services the features answer through. */
export function initEngine({ twitch, discord } = {}) {
  db = { relay: collection('relay_config', DEFAULT_RELAY) };
  polls.initPolls({ twitch });
  giveaway.initGiveaway({ twitch });
  questionsModule.initQuestions({ twitch, discord });
}

/** The community features as every page gets them on connecting. */
export function snapshot() {
  return {
    questions: questionsModule.getQuestions(),
    questionSettings: questionsModule.getSettings(),
    ...giveaway.snapshot(),
    poll: polls.getState(),
    pollSettings: polls.getSettings(),
    pollHistory: polls.getHistory(),
    relayConfig: db.relay.get(),
  };
}

/** Everything needed to stand this install up on another machine. */
export function exportConfig() {
  return backup.buildBundle();
}

/** Replace this install's configuration with a bundle from one. */
export function importConfig(bundle) {
  return backup.applyBundle(bundle);
}

export const store = {
  setRelayConfig(cfg) {
    return db.relay.set({ ...db.relay.get(), ...cfg });
  },
  setQuestionStatus(id, status) {
    return questionsModule.setStatus(id, status);
  },
  clearQuestions(which) {
    return questionsModule.clear(which);
  },
  /** Add one by hand, edit one, "Next question", and the settings. */
  questions(payload) {
    return questionsModule.control(payload);
  },
  /** Set up, open, close or clear the poll. */
  poll(op, value) {
    return polls.control(op, value);
  },
  /** Set up, open, close, draw, reroll or clear the giveaway. */
  giveaway(op, value) {
    return giveaway.control(op, value);
  },
};
