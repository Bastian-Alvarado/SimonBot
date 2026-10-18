/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Shared wire protocol between the headless server and the dashboard (or any
 * other client).
 *
 * This file is consumed by both `server/` and `web/` (ESM via Vite). Keep it
 * dependency-free and side-effect-free.
 */

/** Client -> Server */
export const C2S = {
  // Handshake / sync
  HELLO: 'hello',
  GET_SNAPSHOT: 'get_snapshot',

  // Settings (server is the source of truth)
  SET_RELAY_CONFIG: 'set_relay_config',
  QUESTION_SET_STATUS: 'question_set_status',
  QUESTIONS_CLEAR: 'questions_clear',
  QUESTIONS: 'questions',
  POLL: 'poll',
  /** The giveaway: { op, value } — setDraft, open, close, draw, reroll, reset, remove, settings. */
  GIVEAWAY: 'giveaway',
  /** The Discord pages screen: { op, … } — save, remove, post, test, unpost, import, delete_source (server/engine/discord-pages.js). */
  DISCORD_PAGES: 'discord_pages',
  /** The Twitch schedule, asked for again (server/engine/twitch-schedule.js). */
  TWITCH_SCHEDULE: 'twitch_schedule',
  SET_VOICE: 'set_voice',
  ROLE_SYNC: 'role_sync',
  WELCOME_CARD_PREVIEW: 'welcome_card_preview',
  /** Post a welcome, goodbye, boost or ban now, with the settings on screen: { kind, config, testChannelId }. */
  WELCOME_TEST: 'welcome_test',
  ANNOUNCE: 'announce',
  /** The Twitch schedule as Discord events: { settings } or { op: 'sync' }. */
  SCHEDULE_EVENTS: 'schedule_events',
  /** Viewer history: { op: 'settings', settings } | { op: 'stats' } | { op: 'prune' } (server/engine/viewer-history.js). */
  HISTORY: 'history',
  /** The Points screen: { op: 'settings' | 'give' | 'board', … } (server/engine/points.js). */
  POINTS: 'points',
  /** The profile card: { op: 'settings', settings } | { op: 'preview', uid?, settings? } (server/engine/profile-card.js). */
  PROFILE_CARD: 'profile_card',
  /** Highlights: { op: 'settings', settings } | { op: 'test' } (server/engine/highlights.js). */
  HIGHLIGHTS: 'highlights',
  /** Private go-live messages: { op: 'settings', settings } | { op: 'post', channelId } | { op: 'test' } (server/engine/live-dms.js). */
  LIVE_DMS: 'live_dms',
  /** Updates from GitHub: { op: 'check' | 'apply' } (server/engine/updater.js). */
  UPDATES: 'updates',
  /** Sign-in, the streamer's only: { op: 'get' } | { op: 'enable', on } | { op: 'new-key', which: 'ownerKey' } | { op: 'signout' } (server/api/auth.js). */
  AUTH: 'auth',
  /** The Moderators screen, the streamer's only: { op: 'list' } | { op: 'block' | 'unblock' | 'signout', userId } | { op: 'activity', userId? } (server/api/ws.js). */
  MODERATORS: 'moderators',
  /** Questions from Discord: { settings } (server/engine/discord-questions.js). */
  DISCORD_QUESTIONS: 'discord_questions',
  /** Game requests: { op: 'settings' | 'read' | 'played' | 'dismiss' | 'reopen' | 'remove', … } (server/engine/game-requests.js). */
  GAME_REQUESTS: 'game_requests',
  /** Moderation: { op: 'settings', settings } | { op: 'act', uid, platform, action } | { op: 'log' } (server/engine/moderation.js). */
  MODERATION: 'moderation',
  SET_ROLE_MAPPINGS: 'set_role_mappings',
  SET_WELCOME_GOODBYE: 'set_welcome_goodbye',
  SET_REACTION_ROLES: 'set_reaction_roles',
  SET_BUTTON_MENUS: 'set_button_menus',
  CLEAR_ROLE_LOG: 'clear_role_log',

  // Platform lifecycle
  PLATFORM_CONNECT: 'platform_connect',
  PLATFORM_DISCONNECT: 'platform_disconnect',
  SET_CREDENTIALS: 'set_credentials',
  CONFIG_EXPORT: 'config_export',
  CONFIG_IMPORT: 'config_import',

  // Twitch and YouTube
  TWITCH_GET_USER: 'twitch_get_user',
  YOUTUBE_EXCHANGE_CODE: 'youtube_exchange_code',
  YOUTUBE_SET_SETTINGS: 'youtube_set_settings',
  YOUTUBE_LOGOUT: 'youtube_logout',

  // Leveling
  GET_XP_DATA: 'get_xp_data',
  UPDATE_XP_CONFIG: 'update_xp_config',
  RESET_XP: 'reset_xp',
  LINK_IDENTITIES: 'link_identities',
  UNLINK_USER: 'unlink_user',

  // Discord passthrough
  DISCORD: 'discord',
};

/** Server -> Client */
export const S2C = {
  // Full state replication
  SNAPSHOT: 'snapshot',
  CONFIG_PATCH: 'config_patch',
  STATUS: 'status',
  /** Who this connection is signed in as: { role: 'owner' | 'mod', login, name, via, signIn } (server/api/auth.js). */
  ME: 'me',

  // Leveling
  XP_DATA: 'xp_data',
  XP_LEVELUP: 'xp_levelup',

  // Request/response correlation
  REPLY: 'reply',
  ERROR: 'error',
};
