/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Smoke tests: the backup manifest.
 *
 * Runs in order with the other feature files, on the one engine the harness
 * boots — through scripts/smoke.js, never on its own.
 */

import { SCRIPT_URL, assert, fs, test } from './harness.js';

// -------------------------------------------------- the backup manifest

export const { MANIFEST, EXCLUDED, buildBundle, applyBundle } = await import('../../engine/backup.js');
export const { says, has, platformsWith } = await import('../../../shared/platforms.js');
export const youtubeModule = await import('../../platforms/youtube.js');
export const busModule = await import('../../core/bus.js');
export const { resolveServerUrl } = await import('../../../shared/server-url.js');
export const { getCollection } = await import('../../core/store.js');

test('every stored collection either travels in a backup or is excluded on purpose', () => {
  // The manifest and the code that creates collections are two lists that have
  // to agree, and nothing made them. They had already drifted: the subscriber
  // ledger was in neither list once, so "Export Configuration" quietly left it
  // behind and a restore came back without it.
  const root = new URL('../', SCRIPT_URL);
  const named = new Set();

  const walk = (dir) => {
    for (const entry of fs.readdirSync(new URL(dir, root), { withFileTypes: true })) {
      // scripts/ is this file's own home and holds no collections.
      if (entry.name === 'node_modules' || entry.name === 'scripts') continue;
      const next = `${dir}${entry.name}${entry.isDirectory() ? '/' : ''}`;
      if (entry.isDirectory()) { walk(next); continue; }
      if (!entry.name.endsWith('.js')) continue;
      const src = fs.readFileSync(new URL(next, root), 'utf8');
      for (const m of src.matchAll(/\bcollection\(\s*'([a-z0-9_]+)'/g)) named.add(m[1]);
    }
  };
  walk('');

  // If the scan finds nothing the comparison below passes vacuously.
  assert.ok(named.size > 20, `expected to find the collections by scanning, found ${named.size}`);

  const manifest = MANIFEST.map((e) => e.name);
  const orphans = [...named].filter((n) => !manifest.includes(n) && !EXCLUDED.includes(n));
  assert.deepEqual(orphans, [],
    `in neither the backup manifest nor the excluded list: ${orphans.join(', ')}`);
});

test('nothing is both exported and excluded', () => {
  const both = MANIFEST.map((e) => e.name).filter((n) => EXCLUDED.includes(n));
  assert.deepEqual(both, [], `listed twice: ${both.join(', ')}`);
});
