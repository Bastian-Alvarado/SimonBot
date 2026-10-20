/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The live values a Discord page can say: the Discord call and the clock
 * (shared/discord-pages.js adds the page's own).
 *
 * Named once, here, because three things need the same list: the page that
 * fills them in, the screen that offers them, and the tests that check the
 * two agree. A picker offering a value nothing fills would leave "{foo}" in
 * a post, which is exactly the failure this is arranged to prevent.
 */

/**
 * Each entry: the name typed in braces, a label for the picker, and how to get
 * it out of the client's state.
 *
 * Kept as a flat list of single words rather than dotted paths: a person
 * writing "{voiceCount} en la llamada" is not thinking about object shapes.
 */
export const LIVE_VARS = [
  // --- the Discord call -----------------------------------------------------
  { name: 'voiceCount', label: 'People in the Discord call', get: (s) => (s.voice?.channelId ? (s.voice.members || []).length : undefined) },
  { name: 'voiceTalking', label: 'Who is talking in the Discord call', get: (s) => ((s.voice?.members || []).filter((m) => m.speaking).map((m) => m.name).join(', ') || undefined) },

  // --- the clock ------------------------------------------------------------
  { name: 'time', label: 'Time now', get: () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
  { name: 'date', label: "Today's date", get: () => new Date().toLocaleDateString() },
];

const BY_NAME = new Map(LIVE_VARS.map((v) => [v.name, v]));

/**
 * Fill in a template against the current state.
 *
 * An unknown name is left exactly as typed rather than blanked. That is
 * deliberate and matches how the rest of this app interpolates: a typo that
 * disappears is a mystery, and a typo that shows up as "{folowers}" on the
 * preview is a thing you can see and fix before it goes out.
 *
 * A known name whose value is missing — nobody in the call, nobody talking —
 * is replaced with the fallback, because that is an absence rather than a
 * mistake, and a post reading "undefined" is worse than one reading "—".
 */
export function fillTemplate(template, state, fallback = '—') {
  return String(template ?? '').replace(/\{([a-zA-Z]+)\}/g, (whole, name) => {
    const entry = BY_NAME.get(name);
    if (!entry) return whole;
    let value;
    try {
      value = entry.get(state || {});
    } catch {
      value = undefined;
    }
    if (value === undefined || value === null || value === '') return fallback;
    return typeof value === 'number' ? value.toLocaleString() : String(value);
  });
}
