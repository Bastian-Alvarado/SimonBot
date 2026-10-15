/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Writes the pixel avatar out as files, into art/avatar/: every face and
 * every extra as its own SVG, the colourings too, and one sheet of them all
 * as a PNG to look at. The drawing is in shared/avatar-art.js; this is how
 * to see what is drawn there, and how to hand a variant to somebody else.
 *
 * original.svg beside them is the drawing as it was given, and is never
 * written by this.
 *
 *   node scripts/avatar-export.js
 */

import fs from 'node:fs';
import { Resvg } from '@resvg/resvg-js';
import {
  AVATAR_EXPRESSIONS_LIST, AVATAR_EXTRAS_LIST, AVATAR_COSTUMES_LIST, avatarSvg, avatarColours,
} from '../../shared/avatar.js';

const OUT = new URL('../../art/avatar/', import.meta.url);
fs.mkdirSync(OUT, { recursive: true });

const files = [];
const write = (name, options) => {
  const svg = avatarSvg(options);
  fs.writeFileSync(new URL(`${name}.svg`, OUT), svg);
  files.push({ name, svg });
};

for (const face of AVATAR_EXPRESSIONS_LIST) write(face, { expression: face });
for (const extra of AVATAR_EXTRAS_LIST) write(extra, { extras: [extra] });
for (const costume of AVATAR_COSTUMES_LIST.filter(Boolean)) {
  write(costume, { costume });
  write(`${costume}-happy`, { costume, expression: 'happy' });
}
write('night-vision', { colours: avatarColours('night-vision') });
for (const c of ['red', 'blue', 'green', 'yellow', 'black', 'white']) write(`colour-${c}`, { colours: avatarColours(c) });

// The sheet: six to a row, each labelled.
const cell = 200;
const gap = 16;
const cols = 6;
const rows = Math.ceil(files.length / cols);
const body = files.map(({ name, svg }, i) => {
  const x = (i % cols) * (cell + gap) + gap;
  const y = Math.floor(i / cols) * (cell + gap + 22) + gap;
  const inner = svg.replace(/^[\s\S]*?<\/title>/, '').replace(/<\/svg>\s*$/, '');
  return `<svg x="${x}" y="${y}" width="${cell}" height="${cell}" viewBox="0 0 100 100" shape-rendering="crispEdges">${inner}</svg>`
    + `<text x="${x + cell / 2}" y="${y + cell + 16}" fill="#a1a1aa" font-family="sans-serif" font-size="14" text-anchor="middle">${name}</text>`;
}).join('');
const width = cols * (cell + gap) + gap;
const height = rows * (cell + gap + 22) + gap;
const sheet = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#0a0a0b"/>${body}</svg>`;
fs.writeFileSync(new URL('sheet.png', OUT), new Resvg(sheet, { font: { loadSystemFonts: true } }).render().asPng());

console.log(`wrote ${files.length} SVGs and sheet.png to art/avatar/`);
