/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The engine: what the community features share. It starts the giveaway and
 * the questions queue with the Discord service they answer through, and
 * gives every page their part of the snapshot and every backup its contents.
 *
 * Each feature keeps its own rules in its own module (giveaway.js,
 * questions.js); this is only where they are started and reached from.
 */

import * as giveaway from './giveaway.js';
import * as questionsModule from './questions.js';
import * as backup from './backup.js';

/** Started once, with the Discord service the features answer through. */
export function initEngine({ discord } = {}) {
  giveaway.initGiveaway();
  questionsModule.initQuestions({ discord });
}

/** The community features as every page gets them on connecting. */
export function snapshot() {
  return {
    questions: questionsModule.getQuestions(),
    questionSettings: questionsModule.getSettings(),
    ...giveaway.snapshot(),
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
  /** Set up, open, close, draw, reroll or clear the giveaway. */
  giveaway(op, value) {
    return giveaway.control(op, value);
  },
};
