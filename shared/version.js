/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The app's version: one number for the server, the pages it serves, the
 * package files and the backups it writes. Changed with `npm run bump`
 * (scripts/bump.mjs), which changes it everywhere at once and opens its
 * entry in CHANGELOG.md.
 *
 * Numbered major.minor.patch:
 *   - patch: fixes and wording, nothing new to learn;
 *   - minor: something new, and everything that was there still works;
 *   - major: something the server owner has to do or re-do to keep working —
 *     a backup an older app cannot read, a feature taken out, a sign-in
 *     every platform needs again.
 *
 * 0.0.1 is SimonBot's first version (2026-10-17). It was made from
 * SimonSays 2.2.1, but keeps none of that app's numbers or history.
 */
export const VERSION = '0.1.0';
