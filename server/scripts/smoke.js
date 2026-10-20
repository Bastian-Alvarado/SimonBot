/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Headless smoke test.
 *
 * Boots the engine with stub platform services, pushes synthetic chat and
 * events onto the bus, and asserts the pipeline reacts. No browser, no
 * network, and no page open — the stack runs with nothing attached to it.
 *
 * The tests live in scripts/smoke/, a file per part of the app. They share
 * one engine and run in this order, because later ones build on what earlier
 * ones left behind; smoke/harness.js boots it and holds the helpers.
 *
 *   node scripts/smoke.js
 */

import fs from 'node:fs';

const { flushAll, results, tmp } = await import('./smoke/harness.js');

await import('./smoke/safety.js');
await import('./smoke/backup.js');
await import('./smoke/questions-and-screens.js');
await import('./smoke/drag-order.js');
await import('./smoke/discord-voice.js');
await import('./smoke/discord.js');
await import('./smoke/welcome-card.js');
await import('./smoke/welcome-pictures.js');
await import('./smoke/discord-posts.js');
await import('./smoke/discord-chat.js');
await import('./smoke/levels-in-chat.js');
await import('./smoke/random-lines.js');
await import('./smoke/giveaway.js');
await import('./smoke/covers-and-commands.js');
await import('./smoke/history-and-streams.js');
await import('./smoke/points.js');
await import('./smoke/profile-card.js');
await import('./smoke/slash-commands.js');
await import('./smoke/discord-pages.js');
await import('./smoke/live-pages.js');
await import('./smoke/banner-text.js');
await import('./smoke/uploads.js');
await import('./smoke/pages-and-privacy.js');
await import('./smoke/still-pictures.js');
await import('./smoke/discord-emoji-text.js');
await import('./smoke/nav-menu.js');
await import('./smoke/live-dms.js');
await import('./smoke/discord-questions.js');
await import('./smoke/game-requests.js');
await import('./smoke/moderation.js');
await import('./smoke/questions.js');
await import('./smoke/refusals.js');
await import('./smoke/updates.js');
await import('./smoke/guides.js');
await import('./smoke/version.js');
await import('./smoke/translations.js');
await import('./smoke/tidy.js');
await import('./smoke/voice-call.js');
// Its own server and sockets, switched on and off again within the file.
await import('./smoke/sign-in.js');

// ---------------------------------------------------------------- teardown

flushAll();
fs.rmSync(tmp, { recursive: true, force: true });

const { passed, failed } = results();
console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed === 0 ? 0 : 1);
