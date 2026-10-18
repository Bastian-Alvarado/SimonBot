/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Where a dragged row lands, for every list that can be put in order by
 * dragging (web/hooks/useDragOrder.tsx).
 */

/**
 * The list with the item at `from` moved to a gap: gap 0 is before the
 * first item, gap n after the last. The same array comes back when nothing
 * would move — the gaps either side of the item itself, or an item that is
 * not there — so a caller can tell a drop that changed nothing.
 */
export function moveToGap(list, from, gap) {
  if (!Array.isArray(list) || from < 0 || from >= list.length) return list;
  const at = Math.max(0, Math.min(list.length, Math.round(Number(gap) || 0)));
  if (at === from || at === from + 1) return list;
  const next = [...list];
  const [moving] = next.splice(from, 1);
  next.splice(at > from ? at - 1 : at, 0, moving);
  return next;
}

/** Where the item from `from` sits after moveToGap — for keeping it selected. */
export function landedAt(from, gap) {
  return gap > from ? gap - 1 : gap;
}
