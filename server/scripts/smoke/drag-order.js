/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Smoke tests: putting lists in order by dragging a grip — where a dropped row
 * lands, and every list that can be reordered wired the same way.
 *
 * Runs in order with the other feature files, on the one engine the harness
 * boots — through scripts/smoke.js, never on its own.
 */

import { SCRIPT_URL, assert, fs, test } from './harness.js';

const { moveToGap, landedAt } = await import('../../../shared/list-order.js');
const read = (path) => fs.readFileSync(new URL(path, SCRIPT_URL), 'utf8');

// ------------------------------------------------- where a row lands

const ABCD = ['a', 'b', 'c', 'd'];

test('a row dropped in a gap lands in that gap, from above or below', () => {
  assert.deepEqual(moveToGap(ABCD, 0, 4), ['b', 'c', 'd', 'a'], 'the first row did not go to the end');
  assert.deepEqual(moveToGap(ABCD, 3, 0), ['d', 'a', 'b', 'c'], 'the last row did not go to the start');
  assert.deepEqual(moveToGap(ABCD, 0, 2), ['b', 'a', 'c', 'd'], 'dropped between b and c, it is not there');
  assert.deepEqual(moveToGap(ABCD, 3, 1), ['a', 'd', 'b', 'c'], 'dropped between a and b, it is not there');
});

test('a drop either side of the row itself, or of a row that is not there, changes nothing', () => {
  assert.equal(moveToGap(ABCD, 1, 1), ABCD);
  assert.equal(moveToGap(ABCD, 1, 2), ABCD);
  assert.equal(moveToGap(ABCD, -1, 0), ABCD);
  assert.equal(moveToGap(ABCD, 9, 0), ABCD);
  assert.deepEqual(moveToGap(ABCD, 0, 99), ['b', 'c', 'd', 'a'], 'a gap past the end is not the end');
  assert.deepEqual(ABCD, ['a', 'b', 'c', 'd'], 'the list given was changed in place');
});

test('where a dropped row ends up is where it is, so it can stay selected', () => {
  for (let from = 0; from < ABCD.length; from += 1) {
    for (let gap = 0; gap <= ABCD.length; gap += 1) {
      const moved = moveToGap(ABCD, from, gap);
      assert.equal(moved.indexOf(ABCD[from]), landedAt(from, gap), `from ${from} to gap ${gap}`);
    }
  }
});

// ------------------------------------------------- the grip, everywhere

test('the grip drags with a finger as well as a mouse, and only ever moves rows of its own list', () => {
  const hook = read('../../web/hooks/useDragOrder.tsx');
  assert.ok(hook.includes('touch-none'), 'a finger on the grip scrolls the page instead of dragging');
  assert.ok(hook.includes('setPointerCapture'), 'the drag is lost as soon as the pointer leaves the grip');
  assert.ok(hook.includes("e.key === 'Escape'"), 'a held row cannot be put back');
  assert.ok(hook.includes('requestAnimationFrame'), 'a long list cannot be crossed in one drag');
  assert.ok(hook.includes("window.addEventListener('pointerup', onUp);"), 'letting go away from the grip leaves the row held');
  assert.ok(hook.includes('[data-drag-list="${key}"]'), 'a list inside a row of another would measure both');
  assert.ok(hook.includes('now.gap !== now.from && now.gap !== now.from + 1'), 'a drop where it already was still saves');
  assert.ok(!hook.includes('draggable'), 'the browser drag and drop is back, which a finger cannot do');
});

test('every list that can be put in order has the grip', () => {
  const lists = [
    ['../../web/components/views/VoiceView.tsx', 'pinOrder', 'pinned voice people'],
    ['../../web/components/views/DiscordPagesView.tsx', 'blockOrder', 'a Discord page\'s blocks'],
    ['../../web/components/views/DiscordButtonsView.tsx', 'buttonOrder', 'Discord buttons'],
    ['../../web/components/views/ReactionRolesView.tsx', 'mappingOrder', 'reaction roles'],
  ];
  for (const [path, name, what] of lists) {
    const src = read(path);
    assert.ok(src.includes(`const ${name} = useDragOrder(`), `${what}: no drag order`);
    assert.ok(src.includes(`${name}.grip(`), `${what}: no grip`);
    assert.ok(src.includes(`${name}.row(`), `${what}: the rows are not marked, so no gap can be measured`);
    assert.ok(src.includes(`ref={${name}.listRef}`), `${what}: the line has nowhere to be drawn`);
    assert.ok(src.includes(`{${name}.line}`), `${what}: nothing shows where the row would land`);
  }
});
