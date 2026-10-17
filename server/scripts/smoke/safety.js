/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Smoke tests: Keeping the install safe: what a backup holds, who counts as this machine, emoji keys, secrets.
 *
 * Runs in order with the other feature files, on the one engine the harness
 * boots — through scripts/smoke.js, never on its own.
 */

import { assert, collection, emojiKey, engine, isSameMachine, test } from './harness.js';

// ------------------------------------------------- configuration backup

// Platform modules are not started in the smoke harness, so stand up the one
// collection whose secret handling is worth asserting.
const fakeTwitch = collection('twitch_credentials', {});
fakeTwitch.set({ clientId: 'public-id', clientSecret: 'SECRET-token' });

const bundle = engine.exportConfig();

test('a backup carries the configuration, not just preferences', () => {
  assert.equal(bundle.meta.app, 'SimonBot', 'the backup does not say SimonBot wrote it');
  assert.equal(typeof bundle.collections.questions_settings, 'object', 'the question settings are missing from the backup');
});

test('secrets are left out of a backup', () => {
  const twitch = bundle.collections.twitch_credentials;
  assert.equal(twitch.clientId, 'public-id', 'the non-secret part should travel');
  assert.ok(!('clientSecret' in twitch), 'the Twitch client secret was written into the backup');
  assert.ok(!JSON.stringify(bundle).includes('SECRET-'), 'a secret survived somewhere in the file');
  assert.ok(bundle.meta.stripped.includes('twitch_credentials.clientSecret'), 'the file does not say what it dropped');
});

test('what viewers did tonight and caches are not part of a backup', () => {
  for (const name of ['questions', 'giveaway', 'discord_cache', 'youtube_api', 'youtube_usage']) {
    assert.ok(!(name in bundle.collections), `${name} should not be backed up`);
  }
});

test('importing restores what the file holds', () => {
  const edited = structuredClone(bundle);
  edited.collections.questions_settings = { ...edited.collections.questions_settings, atStreamEnd: 'finished' };
  const summary = engine.importConfig(edited);
  assert.ok(summary.restored.includes('questions_settings'));
  assert.equal(engine.snapshot().questionSettings.atStreamEnd, 'finished', 'the imported question setting did not land');
});

test('a backup from SimonSays is read: what SimonBot has a place for comes in, its overlays are passed over', () => {
  const fromSimonSays = {
    meta: { app: 'SimonSays', kind: 'config-backup', version: 2 },
    collections: { questions_settings: { atStreamEnd: 'keep' }, relay_config: { twitchToDiscord: false }, layouts: [{ id: 'l1' }], commands: [{ id: 'c1' }] },
  };
  const summary = engine.importConfig(fromSimonSays);
  assert.deepEqual(summary.restored, ['questions_settings'], 'only the collections SimonBot keeps are restored');
});

test('importing does not wipe the keys on this machine', () => {
  assert.equal(fakeTwitch.get().clientSecret, 'SECRET-token', 'an import wiped a stored key');
  assert.equal(fakeTwitch.get().clientId, 'public-id');
});

test('a file from another application is refused', () => {
  assert.throws(() => engine.importConfig({ meta: { app: 'SomethingElse' }, collections: {} }), /not a SimonBot or SimonSays/i);
});

test('a file with nothing to restore says so rather than silently doing nothing', () => {
  // V1's settings-only export among them: 2.0.0 no longer names it, it is a file with no collections.
  assert.throws(
    () => engine.importConfig({ meta: { app: 'SimonSays', version: 1 }, data: { app_theme: 'light' } }),
    (err) => err.code === 'backup_empty',
  );
});

// ------------------------------------------------ who counts as this machine

// A fixed interface list, so the result does not depend on the network the
// test happens to run on.
const IFACES = {
  Ethernet: [{ address: '192.168.1.215', family: 'IPv4', internal: false }],
  Loopback: [{ address: '127.0.0.1', family: 'IPv4', internal: true }],
  WiFi: [{ address: 'fe80::1a2b:3c4d:5e6f:7a8b', family: 'IPv6', internal: false }],
};

test('loopback is this machine', () => {
  assert.ok(isSameMachine('127.0.0.1', IFACES));
  assert.ok(isSameMachine('::1', IFACES));
  assert.ok(isSameMachine('::ffff:127.0.0.1', IFACES));
});

test('this machine reached by its own LAN address is still this machine', () => {
  // The dashboard is normally opened at this URL, not at localhost.
  assert.ok(isSameMachine('192.168.1.215', IFACES), 'the host was treated as a remote device');
  assert.ok(isSameMachine('::ffff:192.168.1.215', IFACES), 'the IPv6-mapped form was not recognised');
});

test('an IPv6 address with a zone index is matched', () => {
  assert.ok(isSameMachine('fe80::1a2b:3c4d:5e6f:7a8b%eth0', IFACES));
});

test('another device on the same network is not this machine', () => {
  assert.ok(!isSameMachine('192.168.1.50', IFACES), 'a phone on the LAN would have been allowed to import');
  assert.ok(!isSameMachine('192.168.1.2', IFACES));
  assert.ok(!isSameMachine('10.0.0.5', IFACES));
  assert.ok(!isSameMachine('8.8.8.8', IFACES));
});

test('a near-miss address is not this machine', () => {
  // Guards against a prefix or substring comparison creeping in.
  assert.ok(!isSameMachine('192.168.1.2150', IFACES));
  assert.ok(!isSameMachine('1192.168.1.215', IFACES));
  assert.ok(!isSameMachine('', IFACES));
  assert.ok(!isSameMachine(undefined, IFACES));
});

// -------------------------------------------------- reaction role emoji keys

// How the gateway describes a reaction, versus how a stored mapping spells it.
const gatewayUnicode = { name: '❤️' };
const gatewayCustom = { name: 'thinking', id: '1314638946818588762' };
const gatewayAnimated = { name: 'Minecraft', id: '1306057976997478410' };

test('a unicode emoji matches the way it is stored', () => {
  assert.equal(emojiKey('❤️'), emojiKey(gatewayUnicode));
});

test('a custom emoji written as markup matches what Discord sends', () => {
  // This is the form V2 stored, and the reason those menus did nothing.
  assert.equal(emojiKey('<:thinking:1314638946818588762>'), emojiKey(gatewayCustom));
  assert.equal(emojiKey('<a:Minecraft:1306057976997478410>'), emojiKey(gatewayAnimated));
});

test('the bare name:id an earlier key produced is no longer read as a custom emoji (2.0.0)', () => {
  assert.notEqual(emojiKey('thinking:1314638946818588762'), emojiKey(gatewayCustom));
});

test('a renamed custom emoji still matches', () => {
  // Keyed on the id, so renaming it in Discord does not break the menu.
  assert.equal(emojiKey('<:was_called_something_else:1314638946818588762>'), emojiKey(gatewayCustom));
});

test('different custom emoji do not collide', () => {
  assert.notEqual(emojiKey(gatewayCustom), emojiKey(gatewayAnimated));
  // Same name, different emoji: must not be treated as the same one.
  assert.notEqual(emojiKey({ name: 'thinking', id: '111' }), emojiKey({ name: 'thinking', id: '222' }));
});

test('a custom emoji is never confused with a unicode one of the same name', () => {
  assert.notEqual(emojiKey({ name: 'thinking', id: '111' }), emojiKey('thinking'));
});

// ------------------------------------------------- secrets stay on the server

// The collections that gained secrets so a first-run setup needs no .env file.
collection('discord_settings', {}).set({ guildId: 'g1', channelId: 'c1', clientId: 'public', clientSecret: 'SECRET-dc', botToken: 'SECRET-bot' });

const withSecrets = engine.exportConfig();

test('secrets never travel in a backup', () => {
  const raw = JSON.stringify(withSecrets);
  for (const needle of ['SECRET-dc', 'SECRET-bot']) {
    assert.ok(!raw.includes(needle), `${needle} was written into the backup`);
  }
});

test('the non-secret settings beside them still travel', () => {
  assert.equal(withSecrets.collections.discord_settings.guildId, 'g1');
  assert.equal(withSecrets.collections.discord_settings.clientId, 'public');
});

test('a backup says which secrets it dropped', () => {
  for (const field of ['discord_settings.botToken', 'discord_settings.clientSecret']) {
    assert.ok(withSecrets.meta.stripped.includes(field), `${field} is not named in meta.stripped`);
  }
});

