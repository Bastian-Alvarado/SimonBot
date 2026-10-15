#!/usr/bin/env node
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Builds the public edition into a folder:
 *
 *   node scripts/public-edition.mjs <folder> [--release] [--report]
 *
 * The folder gets this repo's files without its streamer's content, as
 * public-edition/manifest.mjs says: themes and welcome-card looks not
 * shipped, the built-in character's art and pictures, its regulars, real
 * names and ids in the code, passages marked as the streamer's own — and the
 * files in public-edition/overrides/ over the top (the licence, the README,
 * the changelog, the empty art files, the examples). Anything still
 * forbidden afterwards stops it.
 *
 * A .git in the folder is kept, so the folder can be the public repo's own
 * clone: build into it, look at the difference, commit. --release refuses a
 * working tree with changes, so what is built is exactly a commit. --report
 * says what is still forbidden without stopping, to look at the build while
 * content is being separated.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { pathToFileURL, fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const M = await import(pathToFileURL(path.join(root, 'public-edition/manifest.mjs')).href);
const at = (...p) => path.join(root, ...p);

const outArg = process.argv[2];
if (!outArg || outArg.startsWith('--')) {
  console.error('Usage: node scripts/public-edition.mjs <folder> [--release] [--report]');
  process.exit(1);
}
const out = path.resolve(outArg);
if (out === root || out.startsWith(root + path.sep)) throw new Error('the edition is built outside this repo, never into it');
if (process.argv.includes('--release')) {
  const dirty = execSync('git status --porcelain', { cwd: root, encoding: 'utf8' }).trim();
  if (dirty) throw new Error(`the working tree has changes; commit them first:\n${dirty}`);
}

/*
  Lines, whatever ends them: a file here can hold both CRLF and LF, so it is
  split at every LF, each line keeps the CR it had, and joining with LF gives
  the file back exactly. bare() is a line without its CR, to compare.
*/
const CR = String.fromCharCode(13);
const LF = String.fromCharCode(10);
const linesOf = (text) => text.split(LF);
const bare = (line) => (line.endsWith(CR) ? line.slice(0, -1) : line);
const crOf = (lines) => (lines.some((l) => l.endsWith(CR)) ? CR : '');

// ------------------------------------------------------------------ what goes in
// The repo's files, and new ones not yet committed (never ignored ones), so a build to look at matches the working tree; --release has none of those.
const tracked = [...new Set(execSync('git ls-files -z --cached --others --exclude-standard', { cwd: root }).toString('utf8').split('\0').filter(Boolean))];
const themeIds = fs.readdirSync(at('shared/looks')).filter((f) => f.endsWith('.js') && !['index.js', 'common.js'].includes(f)).map((f) => f.slice(0, -3));
const unknown = M.THEMES.filter((id) => !themeIds.includes(id));
if (unknown.length) throw new Error(`no such themes: ${unknown.join(', ')}`);
const droppedThemes = themeIds.filter((id) => !M.THEMES.includes(id));
const dropped = (p) => [...M.DROP, ...M.DROP_TESTS].some((d) => (d.endsWith('/') ? p.startsWith(d) : p === d))
  || droppedThemes.some((id) => p === `shared/looks/${id}.js`);

fs.mkdirSync(out, { recursive: true });
// Emptied first, but never through a link: one could point at somebody's real files.
const links = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
  const p = path.join(dir, d.name);
  if (d.isSymbolicLink() || fs.lstatSync(p).isSymbolicLink()) return [p];
  return d.isDirectory() && d.name !== '.git' ? links(p) : [];
});
const linked = links(out);
if (linked.length) throw new Error(`the folder has links in it; remove them first, so nothing they point at is touched:\n  ${linked.join('\n  ')}`);
for (const entry of fs.readdirSync(out)) if (entry !== '.git') fs.rmSync(path.join(out, entry), { recursive: true, force: true });
const put = (rel, data) => { const f = path.join(out, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, data); };
let copied = 0;
for (const rel of tracked) {
  if (dropped(rel) || !fs.existsSync(at(rel))) continue;
  put(rel, fs.readFileSync(at(rel)));
  copied += 1;
}

// The overrides, over the top.
const overrides = at('public-edition/overrides');
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
  if (d.isSymbolicLink()) return [];
  return d.isDirectory() ? (d.name === '.git' ? [] : walk(path.join(dir, d.name))) : [path.join(dir, d.name)];
});
const overridden = walk(overrides).map((f) => path.relative(overrides, f).split(path.sep).join('/'));
for (const rel of overridden) put(rel, fs.readFileSync(path.join(overrides, rel)));

const read = (rel) => fs.readFileSync(path.join(out, rel), 'utf8');
const write = (rel, text) => fs.writeFileSync(path.join(out, rel), text);

// ------------------------------------------------------------------ the themes it ships
{
  const rel = 'shared/looks/index.js';
  const lines = linesOf(read(rel));
  const cr = crOf(lines);
  const varOf = {};
  const order = [];
  const kept = lines.filter((line) => {
    const m = bare(line).match(/^import (\w+) from '\.\/([a-z0-9-]+)\.js';$/);
    if (!m) return true;
    varOf[m[2]] = m[1];
    order.push(m[2]);
    return M.THEMES.includes(m[2]);
  });
  const listAt = kept.findIndex((l) => bare(l).startsWith('export const LOOK_THEMES = ['));
  if (listAt < 0) throw new Error('shared/looks/index.js has no LOOK_THEMES');
  kept[listAt] = `export const LOOK_THEMES = [${order.filter((id) => M.THEMES.includes(id)).map((id) => varOf[id]).join(', ')}];${cr}`;
  write(rel, kept.join(LF));
}

// ------------------------------------------------------------------ the house avatar
{
  const rel = 'shared/house-avatar.js';
  const line = "export const HOUSE_CHARACTER = '';";
  const text = read(rel);
  if (!text.includes(line)) throw new Error(`${rel} has no "${line}"`);
  write(rel, text.replace(line, `export const HOUSE_CHARACTER = '${M.HOUSE_CHARACTER}';`));
}

// ------------------------------------------------------------------ where updates come from
{
  const rel = 'shared/edition.js';
  const line = "export const UPDATE_REPO = '';";
  const text = read(rel);
  if (!text.includes(line)) throw new Error(`${rel} has no "${line}"`);
  write(rel, text.replace(line, `export const UPDATE_REPO = '${M.UPDATE_REPO}';`));
}

// ------------------------------------------------------------------ data that names what is left out
/*
  An exported list or table, with the entries for what is left out cut from
  it line by line — every other line stays exactly as it was written — and
  then loaded again and held to exactly what was asked for, so a cut in the
  wrong place stops the build rather than shipping.
*/
async function keepOnly(rel, name, keep) {
  const file = path.join(out, rel);
  const load = async () => (await import(`${pathToFileURL(file).href}?t=${Date.now()}${Math.random()}`))[name];
  const before = await load();
  const isList = Array.isArray(before);
  const expected = isList ? before.filter((item) => keep(item.id, item)) : Object.fromEntries(Object.entries(before).filter(([k, v]) => keep(k, v)));

  const lines = linesOf(read(rel));
  const s = lines.findIndex((l) => bare(l).startsWith(`export const ${name} = `));
  if (s < 0) throw new Error(`${rel} has no ${name}`);
  let e = s + 1;
  while (e < lines.length && !['};', '];'].includes(bare(lines[e]))) e += 1;
  if (e >= lines.length) throw new Error(`${rel}: the end of ${name} was not found`);
  const KEY = /^  (?:'([^']+)'|"([^"]+)"|([A-Za-z_$][\w$-]*))\s*:/;
  const startsAt = [];
  for (let i = s + 1; i < e; i += 1) {
    const b = bare(lines[i]);
    if (isList ? b === '  {' : KEY.test(b)) startsAt.push(i);
  }
  const cut = new Set();
  startsAt.forEach((from, n) => {
    const to = (startsAt[n + 1] ?? e) - 1;
    let key;
    if (isList) {
      for (let i = from; i <= to && key === undefined; i += 1) key = bare(lines[i]).match(/^    id: '([^']+)',$/)?.[1];
    } else {
      const m = bare(lines[from]).match(KEY);
      key = m[1] ?? m[2] ?? m[3];
    }
    const value = isList ? before.find((item) => item.id === key) : before[key];
    if (key === undefined || value === undefined) throw new Error(`${rel}: an entry of ${name} at line ${from + 1} could not be read`);
    if (!keep(key, value)) for (let i = from; i <= to; i += 1) cut.add(i);
  });
  write(rel, lines.filter((_, i) => !cut.has(i)).join(LF));
  const after = await load();
  if (JSON.stringify(after) !== JSON.stringify(expected)) throw new Error(`${rel}: ${name} is not what was asked for after the cut`);
  return isList ? before.length - after.length : Object.keys(before).length - Object.keys(after).length;
}
const piecesOf = async (id) => (await import(pathToFileURL(at(`shared/looks/${id}.js`)).href)).default.objects.map((o) => o.id);
const droppedPieces = new Set((await Promise.all(droppedThemes.map(piecesOf))).flat());
const keptPieces = new Set((await Promise.all(M.THEMES.map(piecesOf))).flat());

let entriesCut = 0;
entriesCut += await keepOnly('shared/looks-es.js', 'THEMES_ES', (k) => M.THEMES.includes(k));
entriesCut += await keepOnly('shared/looks-es.js', 'LOOKS_ES', (k) => !droppedPieces.has(k));
entriesCut += await keepOnly('shared/looks-superseded.js', 'SUPERSEDED', (_, piece) => !droppedPieces.has(piece));
entriesCut += await keepOnly('shared/card-looks.js', 'CARD_LOOKS', (id) => M.CARD_LOOKS.includes(id));
entriesCut += await keepOnly('shared/card-looks-previous.js', 'PREVIOUS_CARD_LOOKS', (k) => M.CARD_LOOKS.includes(k));

// ------------------------------------------------------------------ the tests left out, out of the runner too
{
  const rel = 'server/scripts/smoke.js';
  const lines = linesOf(read(rel));
  const gone = M.DROP_TESTS.map((p) => p.replace('server/scripts/', './'));
  const runs = (line, g) => (g.endsWith('/') ? bare(line).startsWith(`await import('${g}`) : bare(line) === `await import('${g}');`);
  write(rel, lines.filter((line) => !gone.some((g) => runs(line, g))).join(LF));
}

// ------------------------------------------------------------------ marked passages, left out
/*
  A passage about the streamer's own content — a test of a theme not
  shipped, say — sits between these two lines in this repo, where it runs,
  and is cut from the edition, lines and all. Unmatched, the build stops.
*/
const MARK_START = '// public-edition: leave out';
const MARK_END = '// public-edition: end';
const files = walk(out);
const textFiles = files.filter((f) => !fs.readFileSync(f).includes(0));
let passages = 0;
for (const f of textFiles) {
  const text = fs.readFileSync(f, 'utf8');
  if (!text.includes(MARK_START) && !text.includes(MARK_END)) continue;
  const kept = [];
  let inside = false;
  linesOf(text).forEach((line, i) => {
    const t = bare(line).trim();
    if (t === MARK_START) { if (inside) throw new Error(`${path.relative(out, f)}:${i + 1}: a passage starts inside another`); inside = true; passages += 1; return; }
    if (t === MARK_END) { if (!inside) throw new Error(`${path.relative(out, f)}:${i + 1}: a passage ends that never started`); inside = false; return; }
    if (!inside) kept.push(line);
  });
  if (inside) throw new Error(`${path.relative(out, f)}: a passage never ends`);
  fs.writeFileSync(f, kept.join(LF));
}

// ------------------------------------------------------------------ names, ids and the licence line, in every text file
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const swaps = M.SWAPS.map(([real, fake]) => [real instanceof RegExp ? real : new RegExp(escape(real), 'gi'), fake]);
for (const [re] of swaps) if (!re.global) throw new Error(`the swap ${re} is not global (g), so it would change only the first of each`);
let swapped = 0;
for (const f of textFiles) {
  const before = fs.readFileSync(f, 'utf8');
  let text = before;
  for (const [re, fake] of swaps) {
    text = text.replace(re, (m) => { swapped += 1; return m === m.toLowerCase() ? fake.toLowerCase() : fake; });
  }
  text = text.split(M.LICENSE_HEADER[0]).join(M.LICENSE_HEADER[1]);
  if (text !== before) fs.writeFileSync(f, text);
}

// ------------------------------------------------------------------ nothing forbidden left
// The licensor is named on the licence's own line, which is one of the two places a forbidden name may be;
// the other is the repository updates come from, which is public under that name.
const licensorLine = `Licensor: ${M.LICENSOR}`;
const updateLine = `export const UPDATE_REPO = '${M.UPDATE_REPO}';`;
if (!read('LICENSE').includes(licensorLine)) throw new Error(`LICENSE has no "${licensorLine}" line`);
const found = [];
for (const f of textFiles) {
  let text = fs.readFileSync(f, 'utf8');
  if (path.relative(out, f) === 'LICENSE') text = text.replace(licensorLine, '');
  if (path.relative(out, f).split(path.sep).join('/') === 'shared/edition.js') text = text.replace(updateLine, '');
  text = text.toLowerCase();
  for (const word of M.FORBIDDEN) if (text.includes(word.toLowerCase())) found.push(`${path.relative(out, f)}: ${word}`);
}
const leftThemes = droppedThemes.filter((id) => textFiles.some((f) => fs.readFileSync(f, 'utf8').includes(`id: '${id}',`)));
if (leftThemes.length) found.push(`themes left in: ${leftThemes.join(', ')}`);
if (found.length) {
  console.error(`Forbidden content in the edition:\n  ${found.join('\n  ')}`);
  if (!process.argv.includes('--report')) process.exit(2);
}

console.log(`Built the public edition in ${out}`);
console.log(`  ${copied} files copied, ${overridden.length} overridden, ${passages} marked passages and ${entriesCut} data entries left out, ${swapped} names and ids swapped`);
console.log(`  themes: ${M.THEMES.join(', ')} (left out: ${droppedThemes.join(', ')}); ${droppedPieces.size} looks left out, ${keptPieces.size} kept`);
console.log(`  house avatar: ${M.HOUSE_CHARACTER}`);
