/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Font names, shared by the server and the editors.
 */

/**
 * The family name an uploaded font file is known by.
 *
 * Taken from the filename, because there is nowhere else to take it from
 * without parsing the font, and because somebody who uploads
 * Bebas_Neue.woff2 expects to see "Bebas Neue" offered. The server writes
 * this into the @font-face it generates and the editor lists it, so both
 * read it from here — two rules would mean a font you can pick and a font
 * that never loads.
 */
export function fontFamilyName(file) {
  // Separators become spaces rather than being dropped: "Bebas.Neue.woff2"
  // is a real filename, and a font that silently fails to be offered reads
  // as the upload having failed.
  return safeFontName(String(file ?? '').replace(/\.[^.]+$/, '').replace(/[._]+/g, ' '));
}

/**
 * A font name that is safe to write into CSS.
 *
 * A font the user uploaded is a name this build has never heard of, so a
 * closed list
 * would throw it away on save with nothing on screen to say why.
 *
 * So the check is on the shape of the name rather than on membership.
 * These names reach a page as inline style and inside a font-family
 * declaration, so letters, digits, spaces and hyphens only — a quote, a
 * semicolon or a bracket would be a way to write CSS rather than to name a
 * typeface. A name that does not fit becomes empty, which means "whatever
 * the surface already uses".
 */
export function safeFontName(value) {
  const name = String(value ?? '').trim().slice(0, 40);
  return /^[A-Za-z0-9 -]+$/.test(name) ? name : '';
}
