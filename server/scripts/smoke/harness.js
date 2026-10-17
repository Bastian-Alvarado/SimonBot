/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The smoke test's harness: the engine booted once, with stub platform
 * services, and the helpers every feature file shares.
 *
 * Boots the engine with stub platform services, pushes synthetic chat and
 * events onto the bus, and asserts the bot reacts. No browser, no network.
 *
 *   Run through scripts/smoke.js, never on its own.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/*
  Paths in the tests were written from server/scripts/smoke.js, and are still
  read from there, so a test moved into a feature file did not have to change.
*/
export const SCRIPT_URL = new URL('../smoke.js', import.meta.url).href;

// Point the store at a throwaway directory before anything imports config.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'simonbot-smoke-'));
process.env.DATA_DIR = path.join(tmp, 'data');
process.env.ASSETS_DIR = path.join(tmp, 'assets');
process.env.AUTO_START = 'false';
process.env.LOG_LEVEL = 'warn';

export const { initStore, flushAll, collection } = await import('../../core/store.js');
export const { isSameMachine } = await import('../../core/net.js');
export const { emojiKey } = await import('../../engine/discord-roles.js');
const { mentionsFrom } = await import('../../platforms/discord.js');
export const { bus, EVENTS, normaliseChat, normaliseEvent } = await import('../../core/bus.js');
export const engine = await import('../../engine/index.js');

// ---------------------------------------------------------------- harness

/** Every message the bot was asked to send: [channelId, content, embed, components, files, extra]. */
export const discordSent = [];
let passed = 0;
let failed = 0;

export function test(name, fn) {
  try {
    /*
      Nothing here is awaited, so a test body that returns a promise is a test
      whose assertions run after the summary has already been printed — it can
      only pass, however wrong it is. Work that has to be awaited belongs above
      the test, with the result asserted here.
    */
    const returned = fn();
    if (returned && typeof returned.then === 'function') {
      throw new Error('this test is async, and an async test can only ever pass: await above it instead');
    }
    passed += 1;
    console.log(`  ok   ${name}`);
  } catch (err) {
    failed += 1;
    console.error(`  FAIL ${name}\n       ${err.message}`);
  }
}

export const settle = () => new Promise((r) => setTimeout(r, 60));

/*
  What the stub services answer, set by the tests that need them to answer
  differently. One object rather than several variables, because a test in
  another file can change a field but can never reassign an import.
*/
export const doubles = {};

initStore();

engine.initEngine({
  discord: {
    sendMessage: async (...args) => { discordSent.push(args); return { id: '1' }; },
    // Commands in the rest of the server, as Connections sets them: on unless a test says otherwise.
    commandsEverywhere: () => doubles.discordCommandsEverywhere !== false,
    mentionsFrom,
  },
});

/** Somebody talking in the Discord channel the bot reads. */
export const chat = (msg, over = {}) => bus.emit(EVENTS.CHAT, normaliseChat({
  platform: 'discord', user: 'Viewer', msg, raw: { channelId: 'c-stream' }, ...over,
}));

export { assert, fs };

/** How many passed and failed, for the runner's summary. */
export const results = () => ({ passed, failed });

/** The throwaway data directory, for the runner to remove. */
export { tmp };
