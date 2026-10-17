/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Configuration backup — the thing "Export Configuration" always claimed to be.
 *
 * It reads the server's collections: everything the bot is set up with, and
 * what its community has built up (levels, points, history), without secrets.
 * A backup from SimonSays, which SimonBot was made from, is read too: what of
 * it SimonBot has a place for is restored, and the rest is left out.
 *
 * Everything goes through the live collections rather than the JSON files on
 * disk. Writing the files directly would be shorter, but a running server
 * holds each collection in memory and flushes it later — so a file written
 * underneath it is invisible until restart and then overwritten. Going through
 * the store keeps memory, disk and every connected client in agreement.
 */

import { getCollection } from '../core/store.js';
import { createLogger } from '../core/logger.js';
import { refusal } from '../core/refusal.js';
import { VERSION } from '../../shared/version.js';

const log = createLogger('backup');

/** What a file has to say about itself to be accepted: SimonBot's own, or one from SimonSays. */
export const BACKUP_APP = 'SimonBot';
export const BACKUP_APPS = ['SimonBot', 'SimonSays'];
export const BACKUP_KIND = 'config-backup';
export const BACKUP_VERSION = 2;

/**
 * What travels.
 *
 * `strip` removes secrets. They are deliberately not in a backup — a file that
 * carries OAuth tokens is a file that hands over the account to anyone who
 * reads it, and on a new machine those tokens are the wrong ones anyway: the
 * redirect URI includes the host, so the new install has to sign in regardless.
 * Naming what was stripped lets the UI say which connections need attention.
 */
export const MANIFEST = [
  // Questions are what people typed, not configuration — see EXCLUDED.
  // How they ask, though, is: the word, its cooldown, and the reply.
  { name: 'questions_settings' },
  { name: 'reaction_roles' },
  { name: 'discord_buttons' },
  // Which voice channel the bot follows, and whether it joins it.
  { name: 'discord_voice' },
  // The channels watched for going live, each with its post; and the channel pages.
  { name: 'watch_list' }, { name: 'discord_pages' },
  // How giveaways are told and posted; the giveaway itself is tonight's.
  { name: 'giveaway_settings' },
  { name: 'welcome_goodbye' },
  { name: 'xp_config' },
  // People's levels, and the Discord accounts they belong to. The whole point
  // of levels is that they accumulate, so a migration that dropped them would
  // be worse than no migration.
  { name: 'users' },
  { name: 'accounts' },
  // What each person has done across streams, and the streams themselves: they
  // accumulate the same way, and nothing could rebuild them.
  { name: 'viewer_history' },
  { name: 'points' },
  { name: 'profile_card' },
  // Who asked to be told privately when the stream starts, and where they watch.
  { name: 'live_dms' },
  // Which Discord channels feed the Questions screen.
  { name: 'discord_questions' },
  // The game requests board: what people asked for, their votes, what was played.
  { name: 'game_requests' },
  // Where the mod log goes, and what it said.
  { name: 'moderation' },
  { name: 'stream_sessions' },
  { name: 'discord_settings', strip: ['botToken', 'clientSecret'] },
  { name: 'twitch_credentials', strip: ['clientSecret'] },
];

/**
 * Left out on purpose:
 *   discord_cache, role_activity_log — rebuilt from the source at runtime
 *   stream_live                 — the stream on now, until it is kept with the rest
 *   banner_text                 — which drawn banner each page block has: drawn again when missing
 *   giveaway                    — who entered tonight's giveaway: tonight's, not setup
 *   xp_data                     — the pre-migration shape, already converted
 *   questions                   — what viewers typed during a segment, not
 *                                 configuration, and stale the moment it ends
 *   auth_*                      — the sign-in: whether it is on, the owner
 *                                 key, who is signed in; secrets, and this
 *                                 install's own
 *   mod_activity                — what moderators did, this install's record
 *   youtube_api                 — nothing but the YouTube API key, a secret
 *   youtube_usage               — today's count of YouTube's allowance, by this app
 *   discord_announce            — the one go-live post before 0.1.0, moved
 *                                 onto the watch list (engine/watch.js)
 */
export const EXCLUDED = ['updates', 'discord_cache', 'role_activity_log', 'xp_data', 'questions', 'stream_live', 'giveaway', 'banner_text', 'auth_settings', 'auth_secrets', 'auth_sessions', 'auth_tokens', 'mod_activity', 'youtube_api', 'youtube_usage', 'discord_announce'];

/** Everything needed to stand this install up somewhere else. */
export function buildBundle() {
  const collections = {};
  const stripped = [];
  const missing = [];

  for (const entry of MANIFEST) {
    const c = getCollection(entry.name);
    if (!c) { missing.push(entry.name); continue; }

    const value = structuredClone(c.get());
    if (entry.strip && value && typeof value === 'object') {
      for (const field of entry.strip) {
        if (value[field]) { delete value[field]; stripped.push(`${entry.name}.${field}`); }
        else delete value[field];
      }
    }
    collections[entry.name] = value;
  }

  log.info(`exported ${Object.keys(collections).length} collections`
    + (stripped.length ? `, ${stripped.length} secret field(s) left out` : ''));

  return {
    meta: {
      app: BACKUP_APP,
      kind: BACKUP_KIND,
      version: BACKUP_VERSION,
      // Which app wrote it, for whoever reads it later. `version` is the file's own format.
      appVersion: VERSION,
      exportedAt: new Date().toISOString(),
      // So the file itself says what it does not contain.
      stripped,
      excluded: EXCLUDED,
      unavailable: missing,
    },
    collections,
  };
}

/**
 * Restore a bundle, replacing what is there.
 *
 * Collections absent from the file are left alone rather than emptied: an older
 * backup should not wipe something it predates. Collections in the file that
 * SimonBot has no place for (as a SimonSays backup can carry) are passed over.
 */
export function applyBundle(bundle) {
  if (!bundle || typeof bundle !== 'object') throw refusal('backup_not_file', 'not a backup file');

  const meta = bundle.meta;
  if (!meta || !BACKUP_APPS.includes(meta.app)) throw refusal('backup_not_simonsays', 'not a SimonBot or SimonSays backup file');
  if (!bundle.collections || typeof bundle.collections !== 'object') throw refusal('backup_empty', 'backup file has no collections');

  const restored = [];
  const skipped = [];

  for (const entry of MANIFEST) {
    if (!(entry.name in bundle.collections)) continue;
    const value = bundle.collections[entry.name];
    if (value === undefined || value === null) continue;

    const c = getCollection(entry.name);
    if (!c) { skipped.push(entry.name); continue; }

    if (entry.strip) {
      // A backup carries no secrets, so writing it verbatim would delete the
      // ones already here — importing onto a machine that is signed in would
      // sign it out. Keep what this machine holds and take everything else
      // from the file. If the imported settings belong to a different account
      // the stored sign-in is simply the wrong one, and reconnecting replaces
      // it; that is recoverable, whereas a wiped token is not.
      const current = (c.get() && typeof c.get() === 'object') ? c.get() : {};
      const keep = {};
      for (const field of entry.strip) {
        if (current[field] !== undefined) keep[field] = current[field];
      }
      c.set({ ...current, ...value, ...keep });
    } else {
      c.set(value);
    }
    restored.push(entry.name);
  }

  log.info(`imported ${restored.length} collections`
    + (skipped.length ? `; ${skipped.length} had no home on this server` : ''));

  return { restored, skipped, exportedAt: meta.exportedAt ?? null, stripped: meta.stripped ?? [] };
}
