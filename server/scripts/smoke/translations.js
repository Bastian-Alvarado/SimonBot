/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Smoke tests: both languages, everywhere.
 *
 * Runs in order with the other feature files, on the one engine the harness
 * boots — through scripts/smoke.js, never on its own.
 */

import path from 'node:path';
import { SCRIPT_URL, assert, fs, test } from './harness.js';

const web = new URL('../../web/', SCRIPT_URL);
const constants = fs.readFileSync(new URL('constants.ts', web), 'utf8');
const esAt = constants.indexOf('\n  es: {');
const keysIn = (block) => new Map([...block.matchAll(/^\s{4}([A-Za-z0-9_]+)\s*:\s*(['"])((?:\\.|(?!\2).)*)\2/gm)].map((m) => [m[1], m[3]]));
const EN = keysIn(constants.slice(constants.indexOf('\n  en: {'), esAt));
const ES = keysIn(constants.slice(esAt));

const sources = [];
const walk = (dir) => {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory() && !['dist', 'node_modules'].includes(f.name)) walk(p);
    else if (/\.(tsx|ts)$/.test(f.name) && f.name !== 'constants.ts') sources.push(p);
  }
};
walk(decodeURIComponent(web.pathname).replace(/^\/(\w:)/, '$1'));

test('every string the dashboard reaches for with an English fallback exists in both languages', () => {
  /*
    `t.key || 'English'` renders the English wherever the key is missing, so
    a missing Spanish string is not an error anywhere — it is a screen that
    silently speaks English. 186 of them had built up, the Library's among
    them, before they were written down.
  */
  const missing = [];
  const re = /\bt\??\.([A-Za-z0-9_]+)\s*\|\|\s*['"`]/g;
  for (const f of sources) {
    for (const m of fs.readFileSync(f, 'utf8').matchAll(re)) {
      if (!EN.has(m[1]) || !ES.has(m[1])) missing.push(`${m[1]} (${path.basename(f)})`);
    }
  }
  assert.ok(sources.length > 30, `only ${sources.length} source files found`);
  assert.deepEqual([...new Set(missing)], [], 'these have only their English fallback');
  assert.equal(EN.size, ES.size, 'the two languages hold different numbers of strings');
});


test('the Spanish strings keep their accents', () => {
  /*
    Some were once typed on a keyboard without them — "diseno", "Anade",
    "Tamano" — which reads as broken to anybody who speaks it. Only words that
    are wrong without the accent in every use are checked here, so a right
    word can never be flagged.
  */
  const NEVER = /\b(diseno|disenos|anade|anadir|anadida|tamano|basicos|aparecera|reporto|ajustala|reune|pagina|musica|cancion|titulo|categoria|numero|ultimo|ultima|tambien|accion|opcion|configuracion|conexion|informacion|sesion|boton|automatico|automatica|aqui|rotacion|telefono|camara|imagenes|codigo|vacio|vacia|todavia|envia|despues|segun|unica|unico)\b/i;
  const bad = [...ES].filter(([, v]) => NEVER.test(v)).map(([k, v]) => `${k}: ${v.slice(0, 60)}`);
  assert.deepEqual(bad, [], 'Spanish written without its accents');
});
