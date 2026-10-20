/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Entry point for the headless SimonBot server.
 *
 * Boot order matters: the store must exist before anything reads config, the
 * engine must be listening before platforms start emitting, and the HTTP/WS
 * surface comes up last so a client can never observe a half-built system.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { config, describeConfig } from './config.js';
import { initStore, flushAll } from './core/store.js';
import { createLogger } from './core/logger.js';

import { initEngine } from './engine/index.js';
import { initDiscordRoles } from './engine/discord-roles.js';
import { initSlashCommands } from './engine/slash-commands.js';
import { initAnnounce, stopAnnounce } from './engine/announce.js';
import { initDiscordPages } from './engine/discord-pages.js';
import { initLeveling } from './leveling/index.js';
import { initLevelChat } from './leveling/chat.js';
import { initStreamSessions } from './engine/stream-sessions.js';
import { initViewerHistory } from './engine/viewer-history.js';
import { initPoints } from './engine/points.js';
import { initProfileCard } from './engine/profile-card.js';
import { initLiveDms } from './engine/live-dms.js';
import { initUpdater } from './engine/updater.js';
import { initDiscordQuestions } from './engine/discord-questions.js';
import { initGameRequests } from './engine/game-requests.js';
import { initModeration } from './engine/moderation.js';

import * as twitch from './platforms/twitch.js';
import * as youtube from './platforms/youtube.js';
import { initWatch, stopWatch } from './engine/watch.js';
import * as discord from './platforms/discord.js';
import * as discordVoice from './platforms/discord-voice.js';

import { createHttpServer } from './api/http.js';
import { initWebSocket, closeWebSocket } from './api/ws.js';
import { initAuth } from './api/auth.js';
import { initModActivity } from './engine/mod-activity.js';
import { VERSION } from '../shared/version.js';

const log = createLogger('boot');
const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  log.info(`SimonBot ${VERSION} — headless server starting`);
  log.info('config:', describeConfig());

  // 1. Persistence
  initStore();

  // Twitch and YouTube, read with the app's keys only, and the channels watched
  // for going live: first, since the stream on now (below) follows them.
  twitch.initTwitch();
  youtube.initYouTube();
  initWatch();

  // 2. Engine, wired to the platform services it will drive
  initEngine({ discord: discord.service });

  // 3. Leveling (subscribes to Discord chat on the bus)
  initLeveling();
  // "!rank" and "!top", answered in the chat they were asked in.
  initLevelChat();
  // Every stream kept (when it was on, chat speed, who took part), and what each person has done across them.
  initStreamSessions();
  initViewerHistory();
  // Points: a score apart from XP, earned in Discord.
  initPoints();
  // "!perfil": a person's level, points and streams, as a picture in Discord.
  initProfileCard();
  // Going live, told privately to those who asked, with the link to where they watch.
  initLiveDms();
  // Questions posted in a Discord channel, into the Questions screen; answered there.
  initDiscordQuestions();
  // A Discord channel of game suggestions, as a board by votes.
  initGameRequests();
  // The mod log: who was banned or timed out in Discord.
  initModeration();

  // 4. Discord membership automation (reaction roles, buttons, welcomes)
  initDiscordRoles();
  // Slash commands: today's !words and buttons, as Discord's own commands.
  initSlashCommands();
  // Going live, announced in Discord: a post per watched channel.
  initAnnounce();
  // A channel's standing posts — welcome, rules, links — built from blocks.
  initDiscordPages();

  // 5. Platform connectors
  // Before the gateway connects, so it hears the first voice states.
  discordVoice.initDiscordVoice();
  discord.initDiscord();

  // 6. Public surface: who may use it (api/auth.js), then the UI when it is built.
  initAuth();
  // What they did, for the streamer's Moderators screen (engine/mod-activity.js).
  initModActivity();
  const webDist = path.join(__dirname, '..', 'web', 'dist');
  const webRoot = fs.existsSync(webDist) ? webDist : null;
  if (webRoot) log.info(`serving built UI from ${webDist}`);
  else log.info('no web/dist build found — run the UI with `npm run dev:web`');

  const server = createHttpServer({ webRoot });
  initWebSocket(server);

  // A failed bind must be fatal and legible. Without this the process kept
  // running with no listener, and requests were silently answered by whatever
  // stale instance already held the port.
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      log.error(`port ${config.port} is already in use — another SimonBot or SimonSays server is probably running.`);
      log.error('Stop it first, or start this one with a different PORT.');
    } else {
      log.error('server error:', err);
    }
    process.exit(1);
  });

  server.listen(config.port, config.host, () => {
    log.info(`listening on http://${config.host}:${config.port}`);
    log.info('the stack is now live and does not need a browser open');
    // Started by the launcher (start.js): it waits for this before trusting a new version.
    if (process.send) process.send({ type: 'simonbot-ready', version: VERSION });
  });

  const shutdown = installShutdownHandlers(server);
  // Updates from GitHub, once a repository is named (shared/edition.js): ready a new version, then stop for the launcher to start it.
  initUpdater({ restarter: (code) => shutdown('update', code) });
}

function installShutdownHandlers(server) {
  let shuttingDown = false;

  // An exit code other than 0 tells the launcher why: RESTART_FOR_UPDATE starts the version just readied.
  const shutdown = async (signal, code = 0) => {
    if (shuttingDown) return;
    shuttingDown = true;
    log.info(`${signal} received — shutting down`);

    // Persist before tearing down connections; an unflushed store is the one
    // piece of state we cannot rebuild.
    flushAll();

    // Don't hang forever: on a stuck socket, or a platform slow to say goodbye.
    // An update waits on this, so it is seconds, not tens.
    setTimeout(() => process.exit(code), 6000).unref();

    // Saying goodbye to each platform is a courtesy, so it gets three seconds.
    await Promise.race([new Promise((resolve) => { setTimeout(resolve, 3000); }), Promise.allSettled([
      Promise.resolve(stopWatch()),
      Promise.resolve(discordVoice.stopDiscordVoice()),
      Promise.resolve(stopAnnounce()),
      Promise.resolve(discord.disconnect()),
    ])]);

    closeWebSocket();
    server.close(() => {
      log.info('goodbye');
      process.exit(code);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  // A crash must not take the database with it.
  process.on('uncaughtException', (err) => {
    log.error('uncaught exception:', err);
    flushAll();
  });
  process.on('unhandledRejection', (reason) => {
    log.error('unhandled rejection:', reason);
  });
  return shutdown;
}

main().catch((err) => {
  log.error('fatal during boot:', err);
  process.exit(1);
});
