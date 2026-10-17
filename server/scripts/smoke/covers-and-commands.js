/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Smoke tests: chat commands that work in every channel of the Discord server.
 *
 * Runs in order with the other feature files, on the one engine the harness
 * boots — through scripts/smoke.js, never on its own.
 */

import { SCRIPT_URL, assert, collection, fs, test } from './harness.js';

const discord = await import('../../platforms/discord.js');
const read = (p) => fs.readFileSync(new URL(p, SCRIPT_URL), 'utf8');
const discordSettings = collection('discord_settings', {});

// ---------------------------------------------------------------- commands in every channel

const everywhereBefore = discordSettings.get();
discordSettings.set({ ...everywhereBefore, commandsEverywhere: false });
const off = discord.commandsEverywhere();
discordSettings.set({ ...everywhereBefore, commandsEverywhere: undefined });
const byDefault = discord.commandsEverywhere();
discordSettings.set(everywhereBefore);

test('chat commands work in every Discord channel unless Connections says otherwise', () => {
  assert.equal(off, false);
  assert.equal(byDefault, true, 'commands everywhere is not on by default');
  assert.ok(read('../engine/questions.js').includes('if (deps.discord?.commandsEverywhere?.() === false) return;'));
  assert.ok(read('../../web/components/views/ConnectionsView.tsx').includes('data-discord-commands-everywhere'));
});
