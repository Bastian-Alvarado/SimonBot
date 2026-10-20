/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Environment-driven configuration.
 *
 * An earlier version hardcoded secrets directly in server.js ("YOUR_CLIENT_ID_HERE"). That made
 * the file impossible to commit safely and impossible to run in more than one
 * environment. Everything now comes from the environment with sane defaults.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Minimal .env loader.
 *
 * Node's own `--env-file` flag is version-sensitive (it hard-errors on a
 * missing file before 20.12), and pulling in dotenv for ~15 lines of parsing
 * is not worth a dependency. Real environment variables always win, so
 * `PORT=9000 npm start` still overrides the file.
 */
function loadEnvFile() {
  const candidates = [
    process.env.ENV_FILE,
    path.join(__dirname, '..', '.env'),
    path.join(__dirname, '.env'),
  ].filter(Boolean);

  const file = candidates.find((p) => fs.existsSync(p));
  if (!file) return;

  for (const rawLine of fs.readFileSync(file, 'utf8').split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const eq = line.indexOf('=');
    if (eq === -1) continue;

    const key = line.slice(0, eq).trim();
    if (key in process.env) continue; // real env wins

    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

loadEnvFile();

const num = (v, fallback) => {
  const n = Number.parseInt(v ?? '', 10);
  return Number.isNaN(n) ? fallback : n;
};

const bool = (v, fallback) => {
  if (v === undefined || v === '') return fallback;
  return v === 'true' || v === '1';
};

/*
  The install: this folder's parent, or — started by the launcher (start.js)
  from a version's own folder under versions/ — the folder the app was
  installed in. Whatever is the streamer's lives there whichever version runs.
  A relative DATA_DIR or ASSETS_DIR is from the install's server folder, where
  the server has always been started, not from the version running.
*/
const install = process.env.SIMONBOT_ROOT || path.join(__dirname, '..');
const place = (dir, fallback) => (dir ? path.resolve(install, 'server', dir) : fallback);

export const config = {
  port: num(process.env.PORT, 8081),
  host: process.env.HOST || '0.0.0.0',

  // Where runtime state lives. Override to relocate the whole database.
  dataDir: place(process.env.DATA_DIR, path.join(install, 'data')),
  assetsDir: place(process.env.ASSETS_DIR, path.join(install, 'assets')),

  // Served to the config UI so it can build OAuth redirect URLs.
  publicUrl: process.env.PUBLIC_URL || 'http://localhost:5173',

  discord: {
    clientId: process.env.DISCORD_CLIENT_ID || '',
    clientSecret: process.env.DISCORD_CLIENT_SECRET || '',
    botToken: process.env.DISCORD_BOT_TOKEN || '',
  },

  // Going-live alerts only: no sign-in, just the keys that let the bot see who is live.
  twitch: {
    clientId: process.env.TWITCH_CLIENT_ID || '',
    clientSecret: process.env.TWITCH_CLIENT_SECRET || '',
  },

  youtube: {
    apiKey: process.env.YOUTUBE_API_KEY || '',
  },

  logLevel: process.env.LOG_LEVEL || 'info',

  // Auto-reconnect platforms on boot using stored credentials.
  autoStart: bool(process.env.AUTO_START, true),
};

export function describeConfig() {
  const mask = (s) => (s ? `${'*'.repeat(Math.max(0, Math.min(8, s.length - 4)))}${s.slice(-4)}` : '(unset)');
  return {
    port: config.port,
    dataDir: config.dataDir,
    discordClientId: config.discord.clientId || '(unset)',
    discordBotToken: mask(config.discord.botToken),
    twitchClientId: config.twitch.clientId || '(unset)',
  };
}
