/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * What may be uploaded, and how big each kind may be — one list for the
 * server, which enforces it, and the screen, which says so before sending a
 * file that would only be turned away.
 *
 * Pictures, for welcome cards, Discord pages and event covers, and fonts, for
 * the welcome cards. Sounds and video were for the stream's alerts, and nothing
 * here plays them.
 */
export const ASSET_KINDS = {
  /*
    Half what Discord takes from a bot, on purpose: a picture is shown far
    smaller than a big file is drawn, and a banner with words on it is drawn
    again at 1100 pixels across at most anyway.
  */
  image: { exts: ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'], max: 5 * 1024 * 1024 },
  /*
    A typeface is what makes a page look like somebody's rather than like
    this app's. Small on purpose: a woff2 of a display face is tens of
    kilobytes, and anything approaching this cap is a whole family in one
    file, which a page does not need.
  */
  font: { exts: ['.woff2', '.woff', '.ttf', '.otf'], max: 2 * 1024 * 1024 },
};

/** Which kind a file name's extension belongs to, or null if it is not accepted. */
export function assetKindOf(name) {
  const m = /\.[^.]+$/.exec(String(name || '').toLowerCase());
  if (!m) return null;
  for (const [kind, spec] of Object.entries(ASSET_KINDS)) if (spec.exts.includes(m[0])) return kind;
  return null;
}
