/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The GitHub Pages site: a landing page drawn like SimonSays' own, in
 * SimonBot's leaf and plum, made from README.md, with the README's guide
 * under it.
 *
 *   npm i --no-save marked@15 && node scripts/pages.mjs [outDir]
 *
 * Writes outDir (default _site) with index.html, the bot's avatar and the
 * dashboard screenshots in art/simonbot/site/. The modules, the slash
 * commands, the first steps, the privacy and license notes and the guide
 * come from the README, and the releases from CHANGELOG.md, so the page
 * follows them. Links to other files in
 * the repository go to them on GitHub; links to headings stay on the page.
 * .github/workflows/pages.yml runs this on every push to main that touches
 * any of those, this script or the art, and publishes it to the gh-pages branch.
 */
import fs from 'node:fs';
import path from 'node:path';
import { marked } from 'marked';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT = path.resolve(process.argv[2] || path.join(ROOT, '_site'));
const REPO = 'https://github.com/Bastian-Alvarado/SimonBot';
const FACE = 'art/simonbot/bot-avatar-mint-circle-512.png';
const SHOTS = 'art/simonbot/site';
const VERSION = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version;

const slug = (text) => text.toLowerCase().replace(/<[^>]+>/g, '').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-');
const local = (href) => href && !/^(https?:|mailto:|#)/.test(href);
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

marked.use({
  renderer: {
    heading({ tokens, depth }) {
      const text = this.parser.parseInline(tokens);
      return `<h${depth} id="${slug(text)}">${text}</h${depth}>\n`;
    },
  },
  walkTokens(token) {
    if (token.type === 'link' && local(token.href)) token.href = `${REPO}/blob/main/${token.href}`;
  },
});

// ------------------------------------------------------------ the README, in parts

const readme = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8');
// The README's own header (avatar, name, tagline) becomes the page's hero.
const header = /^[\s\S]*?<\/p>\s*<h1[\s\S]*?<\/h1>\s*<p[^>]*>([\s\S]*?)<\/p>\s*/.exec(readme);
const [tagline, heroLede] = header[1].split(/<br\s*\/?>/).map((s) => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim());
const md = readme.slice(header[0].length);

// Split at each "## " heading: the intro, then every section by its title.
const sections = { intro: [] };
let current = sections.intro;
for (const token of marked.lexer(md)) {
  if (token.type === 'heading' && token.depth === 2) sections[token.text] = current = [];
  else current.push(token);
}
const inline = (text) => marked.parseInline(text);
const firstSentence = (text) => text.split(/(?<=[.:])\s+/)[0];
const paragraphs = (tokens) => tokens.filter((t) => t.type === 'paragraph');
const tables = (tokens) => tokens.filter((t) => t.type === 'table');
const cells = (table) => table.rows.map((row) => row.map((c) => c.text));
// A paragraph that opens with its own bold label: "**Privacy.** What it keeps…".
const labelled = (tokens, label) => paragraphs(tokens).find((p) => p.text.startsWith(`**${label}`))?.text.replace(/^\*\*[^*]+\*\*\s*/, '');

const does = sections['What SimonBot does'];
const [moduleTable, commandTable] = tables(does);
const modules = cells(moduleTable);
const commands = cells(commandTable).map(([name, what]) => [name.replace(/`/g, ''), what]);
const commandsLede = labelled(does, 'Slash commands.');
const privacy = labelled(does, 'Privacy.');
const license = paragraphs(sections.License)[0].text;
const [, headless, replica] = paragraphs(sections.intro).map((p) => p.text);

// The changelog's releases, newest first: each one's opening line, or else its first item's.
const releases = [];
for (const t of marked.lexer(fs.readFileSync(path.join(ROOT, 'CHANGELOG.md'), 'utf8'))) {
  const m = t.type === 'heading' && t.depth === 2 && /^\[(.+?)\]\s*[—-]\s*(.+)$/.exec(t.text);
  if (m) releases.push({ version: m[1], date: m[2] });
  else if (releases.length && !releases.at(-1).text && (t.type === 'paragraph' || t.type === 'list')) {
    releases.at(-1).text = (t.type === 'list' ? t.items[0].text : t.text).replace(/\*\*/g, '').split(/(?<=\.)\s+/)[0];
  }
}

// Getting started: its opening line is the section's title, the rest its lede.
const start = sections['Getting started'];
const [startTitle, ...startRest] = paragraphs(start)[0].text.split(/(?<=\.)\s+/);
const steps = [];
for (let i = 0; i < start.length; i++) {
  const t = start[i];
  if (t.type !== 'heading' || t.depth !== 3) continue;
  const body = [];
  for (let j = i + 1; j < start.length && !(start[j].type === 'heading' && start[j].depth <= 3); j++) body.push(start[j]);
  steps.push({ title: t.text, body });
}
const need = steps.find((s) => s.title === 'What you need');
const needLine = need.body.find((t) => t.type === 'list').items
  .map((item, i) => /\*\*(.+?)\*\*/.exec(item.text)[1].replace(/\.$/, ''))
  .map((s, i) => (i ? s[0].toLowerCase() + s.slice(1) : s)).join(', ');
// The first four numbered steps get you to the bot's home; the guide has the rest.
const firstSteps = steps.filter((s) => /^\d+\./.test(s.title)).slice(0, 4).map((s) => {
  const words = s.body.find((t) => t.type === 'paragraph');
  const code = s.body.find((t) => t.type === 'code');
  return { title: s.title.replace(/^\d+\.\s*/, ''), text: firstSentence(words.text), code: code?.text.split('\n')[0] };
});

// The guide: the README from "Getting started" on, less the heading and opening line shown above it.
const guideNames = Object.keys(sections).slice(Object.keys(sections).indexOf('Getting started'));
const guide = guideNames.map((name, i) => (i ? `<h2 id="${slug(name)}">${inline(name)}</h2>\n` : '') + marked.parser(i ? sections[name] : start.filter((t) => t !== paragraphs(start)[0]))).join('\n');

// ------------------------------------------------------------ drawn pieces

const icon = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
// The dashboard's own icons for each module, matched by name.
const ICONS = [
  [/welcome/i, 'M13 4h3a2 2 0 0 1 2 2v14M2 20h3M13 20h9M10 12v.01M13 4.562v16.157a1 1 0 0 1-1.242.97L5 20V5.562a2 2 0 0 1 1.515-1.94l4-1A2 2 0 0 1 13 4.561Z'],
  [/level/i, 'M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22M18 2H6v7a6 6 0 0 0 12 0V2Z'],
  [/point/i, 'M14 8a6 6 0 1 1-12 0 6 6 0 0 1 12 0ZM18.09 10.37A6 6 0 1 1 10.34 18M7 6h1v4M16.71 13.88l.7.71-2.82 2.82'],
  [/giveaway/i, 'M3 8h18v4H3zM12 8v13M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7M7.5 8a2.5 2.5 0 0 1 0-5C9.5 3 11 5 12 8c1-3 2.5-5 4.5-5a2.5 2.5 0 0 1 0 5'],
  [/live/i, 'M4.9 19.1C1 15.2 1 8.8 4.9 4.9M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5M19.1 4.9C23 8.8 23 15.1 19.1 19M14 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z'],
  [/mod/i, 'M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1zM9 12l2 2 4-4'],
  [/question/i, 'M7.9 20A9 9 0 1 0 4 16.1L2 22ZM9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01'],
  [/menu/i, 'M3 12h.01M3 18h.01M3 6h.01M8 12h13M8 18h13M8 6h13'],
  [/poll/i, 'M3 3v18h18M18 17V9M13 17V5M8 17v-3'],
  [/page/i, 'M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7ZM14 2v4a2 2 0 0 0 2 2h4M10 9H8M16 13H8M16 17H8'],
  [/voice/i, 'M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3'],
];
const iconFor = (name) => icon((ICONS.find(([rx]) => rx.test(name)) || ICONS[0])[1]);
// The app's mark: a hexagon round Pixel Simon's heart, on a leaf tile.
const HEART = 'M8.5 9h2v1h-2zM13.5 9h2v1h-2zM7.5 10h9v2h-9zM8.5 12h7v1h-7zM9.5 13h5v1h-5zM10.5 14h3v1h-3zM11.5 15h1v1h-1z';
const mark = (id) => `<svg viewBox="0 0 32 32" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#66AD4F"/><stop offset="1" stop-color="#3C7B5A"/></linearGradient></defs><rect width="32" height="32" rx="8" fill="url(#${id})"/><g transform="translate(6 6) scale(.8333)"><path d="M12 2l9 5v10l-9 5-9-5V7l9-5z" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path fill="#fff" shape-rendering="crispEdges" d="${HEART}"/></g></svg>`;
const outline = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l9 5v10l-9 5-9-5V7l9-5z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path fill="currentColor" shape-rendering="crispEdges" d="${HEART}"/></svg>`;

const SCREENS = [
  ['home', 'Home', 'Home: whether the bot is online, every module with its state, and the slash commands your server sees.'],
  ['go-live', 'Go live', 'Go live: the Twitch and YouTube channels the bot watches, each with its own post in Discord when it goes live.'],
  ['giveaways', 'Giveaways', 'Giveaways: a prize and a word to type. People enter in Discord, with the word or the button.'],
  ['points', 'Points', 'Points: a score apart from XP, earned by talking and by coming to streams, with a board of its own.'],
  ['moderators', 'Moderators', 'Moderators: who signed in with Discord, what they did, and the mod log of bans and timeouts.'],
];

// ------------------------------------------------------------ the page

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>SimonBot · ${esc(tagline.replace(/\.$/, ''))}</title>
<meta name="description" content="${esc(tagline)}">
<link rel="icon" href="bot-avatar.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@500;600;700;800;900&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
<style>
  /* Layout: SimonSays' page, band by band — one dark screen, a hairline between bands, copy on
     the left and the working thing on the right — in the bot's leaf, mint, grape and plum. */
  :root {
    --screen: #0A060C;   /* the darkest plum, behind every band */
    --page: #0F0913;     /* the dashboard's own ground, for alternate bands */
    --panel: #1C1121;
    --panel-2: #2C2032;
    --line: #2A1B30;
    --line-2: #42344A;
    --ink: #F3EEF5;
    --ink-2: #A394AA;
    --ink-3: #7B6B83;
    --leaf: #66AD4F;
    --leaf-deep: #3C7B5A;
    --mint: #B8E99C;
    --grape: #976792;
    --leaf-glow: rgba(102, 173, 79, .16);
    --display: "Montserrat", "Segoe UI", system-ui, sans-serif;
    --mono: "JetBrains Mono", ui-monospace, "Cascadia Mono", Menlo, monospace;
    --r: 24px;
    color-scheme: dark;
  }
  * { box-sizing: border-box; }
  html { scroll-behavior: smooth; }
  @media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto; } }
  body { margin: 0; background: var(--screen); color: var(--ink); font: 500 16px/1.6 var(--display); -webkit-font-smoothing: antialiased; overflow-x: hidden; }
  a { color: inherit; }
  :focus-visible { outline: 2px solid var(--mint); outline-offset: 3px; border-radius: 6px; }
  h1, h2, h3 { margin: 0; text-wrap: balance; }
  img { max-width: 100%; }

  .band { padding: 96px max(16px, env(safe-area-inset-right, 0px), calc((100% - 1152px) / 2)) 96px max(16px, env(safe-area-inset-left, 0px), calc((100% - 1152px) / 2)); border-top: 1px solid var(--line); }
  .band.alt { background: var(--page); }
  .eyebrow { font: 700 12px/1 var(--display); letter-spacing: .24em; text-transform: uppercase; color: var(--leaf); }
  .title { font: 900 44px/1.05 var(--display); letter-spacing: -.03em; }
  .lede { margin: 0; color: var(--ink-2); font-size: 18px; line-height: 1.6; max-width: 62ch; }
  .lede a, .note p a { color: var(--mint); }
  .head { display: grid; gap: 14px; margin-bottom: 40px; }
  .btn { display: inline-flex; align-items: center; gap: 8px; padding: 12px 18px; border-radius: 12px; font: 800 13px/1 var(--display); letter-spacing: .04em; text-decoration: none; }
  .btn.main { background: var(--leaf); color: var(--page); }
  .btn.ghost { border: 1px solid var(--line-2); color: var(--ink); padding: 11px 17px; }
  .btn:hover { filter: brightness(1.1); }
  code { font-family: var(--mono); }

  /* nav */
  .nav { position: sticky; top: env(safe-area-inset-top, 0px); z-index: 10; display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 16px max(16px, env(safe-area-inset-right, 0px), calc((100% - 1152px) / 2)) 16px max(16px, env(safe-area-inset-left, 0px), calc((100% - 1152px) / 2)); background: rgba(10, 6, 12, .85); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border-bottom: 1px solid var(--line); }
  body::before { content: ""; position: fixed; inset: 0 0 auto; height: env(safe-area-inset-top, 0px); z-index: 10; background: var(--screen); }
  .brand { display: flex; align-items: center; gap: 10px; text-decoration: none; font: 900 18px/1 var(--display); }
  .brand svg { width: 28px; height: 28px; color: var(--leaf); }
  .brand em, .wordmark em { font-style: normal; color: var(--leaf); }
  .links { display: flex; align-items: center; gap: 22px; }
  .links a { font: 700 13px/1 var(--display); color: var(--ink-2); text-decoration: none; }
  .links a:hover { color: var(--ink); }
  .links .gh { padding: 8px 14px; border: 1px solid var(--line-2); border-radius: 999px; color: var(--ink); }

  /* hero */
  .hero { display: flex; align-items: center; gap: 48px; padding-top: 80px; padding-bottom: 88px; border-top: 0; }
  .hero-copy { flex: 1 1 0; min-width: 0; display: flex; flex-direction: column; align-items: flex-start; gap: 22px; }
  .wordmark { display: flex; align-items: center; gap: 16px; }
  .wordmark svg { width: 64px; height: 64px; border-radius: 16px; box-shadow: 0 10px 30px -10px rgba(102, 173, 79, .45); }
  .wordmark b { display: block; font: 900 34px/1 var(--display); letter-spacing: -.03em; }
  .wordmark small { display: block; margin-top: 8px; font: 700 11px/1 var(--display); letter-spacing: .24em; text-transform: uppercase; color: var(--leaf); }
  .hero h1 { font: 900 52px/1.02 var(--display); letter-spacing: -.04em; }
  .hero .lede { font-size: 19px; }
  .buttons { display: flex; flex-wrap: wrap; gap: 12px; }
  .chips { display: flex; flex-wrap: wrap; gap: 8px; }
  .chips span { font: 700 11px/1 var(--display); padding: 7px 10px; border-radius: 8px; background: var(--panel-2); color: var(--ink-2); }
  .hero-art { flex: none; width: 46%; position: relative; }
  .hero-art::before { content: ""; position: absolute; inset: 10% 6%; background: radial-gradient(closest-side, rgba(102, 173, 79, .35), transparent); filter: blur(40px); }
  .window { position: relative; border-radius: 16px; overflow: hidden; border: 1px solid var(--line-2); background: var(--page); box-shadow: 0 40px 80px -30px rgba(0, 0, 0, .9); }
  .window .bar { display: flex; align-items: center; gap: 7px; padding: 11px 14px; border-bottom: 1px solid var(--line); background: var(--panel); }
  .window .bar i { width: 10px; height: 10px; border-radius: 50%; background: var(--line-2); }
  .window .bar span { margin-left: 10px; font: 400 12px/1 var(--mono); color: var(--ink-3); }
  .window img { display: block; width: 100%; height: auto; aspect-ratio: 16 / 10; object-fit: cover; object-position: top left; }
  .face { position: absolute; left: -28px; bottom: -28px; width: 108px; height: 108px; border-radius: 50%; image-rendering: pixelated; box-shadow: 0 0 0 6px var(--screen), 0 18px 40px rgba(0, 0, 0, .6); }

  /* runs without a browser */
  .split { display: flex; gap: 56px; align-items: flex-start; }
  .split > .copy { flex: 1 1 0; min-width: 0; display: grid; gap: 14px; }
  .split .lede + .lede { margin-top: 4px; }
  .facts { margin: 18px 0 0; border-top: 1px solid var(--line); }
  .facts div { display: grid; grid-template-columns: 130px minmax(0, 1fr); gap: 16px; padding: 14px 0; border-bottom: 1px solid var(--line); font-size: 14px; }
  .facts dt { font: 700 11px/1.6 var(--display); letter-spacing: .2em; text-transform: uppercase; color: var(--ink-3); }
  .facts dd { margin: 0; }
  .demo { flex: none; width: 600px; max-width: 100%; background: var(--panel); border: 1px solid var(--line); border-radius: var(--r); overflow: hidden; box-shadow: 0 40px 80px -40px rgba(0, 0, 0, .8); }
  .demo-bar { display: flex; align-items: center; gap: 10px; padding: 14px 18px; border-bottom: 1px solid var(--line); }
  .demo-bar .eyebrow { font-size: 10px; color: var(--ink-3); }
  .demo-bar .hint { margin-left: auto; font: 600 12px/1.3 var(--display); color: var(--ink-3); text-align: right; }
  .demo-body { padding: 20px; display: grid; gap: 16px; }
  .server { border: 1px solid var(--line-2); border-radius: 18px; padding: 16px; background: var(--screen); }
  .server-top { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .server-top b { font: 800 14px/1 var(--display); }
  .server-top small { font: 400 12px/1 var(--mono); color: var(--ink-3); }
  .server-top .up { margin-left: auto; display: flex; align-items: center; gap: 6px; font: 700 10px/1 var(--display); letter-spacing: .2em; color: var(--leaf); }
  .server-top .up::before { content: ""; width: 7px; height: 7px; border-radius: 50%; background: var(--leaf); }
  .log { margin-top: 14px; height: 176px; overflow: hidden; display: flex; flex-direction: column; justify-content: flex-end; gap: 6px; font: 400 12.5px/1.45 var(--mono); }
  .log div { display: grid; grid-template-columns: 5.6em 6.6em minmax(0, 1fr); gap: 8px; color: var(--ink-2); }
  .log i { font-style: normal; color: var(--ink-3); }
  .log b { font-weight: 600; color: var(--mint); }
  .log span { color: var(--ink); overflow-wrap: anywhere; }
  @media (prefers-reduced-motion: no-preference) { .log div:last-child { animation: rise .35s ease-out; } @keyframes rise { from { transform: translateY(8px); opacity: .3; } } }
  .clients { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
  .client { border: 1px solid var(--line-2); border-radius: 14px; padding: 12px; display: grid; gap: 10px; transition: opacity .3s; }
  .client .t { display: flex; align-items: center; gap: 8px; font: 800 13px/1.2 var(--display); }
  .client .t::before { content: ""; width: 8px; height: 8px; border-radius: 50%; background: var(--leaf); flex: none; }
  .client.closed { opacity: .5; border-style: dashed; }
  .client.closed .t::before { background: var(--ink-3); }
  .toggle { justify-self: start; font: 700 12px/1 var(--display); border-radius: 999px; padding: 7px 12px; cursor: pointer; background: transparent; border: 1px solid var(--line-2); color: var(--ink-2); }
  .toggle:hover { border-color: var(--ink-3); color: var(--ink); }
  .wire { font: 600 12px/1.4 var(--display); color: var(--ink-3); text-align: center; }
  .wire strong { color: var(--ink); }

  /* modules */
  .grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; }
  .card { background: var(--panel); border: 1px solid var(--line); border-radius: 18px; padding: 22px 20px; display: grid; align-content: start; gap: 10px; }
  .card .ic { width: 40px; height: 40px; border-radius: 10px; display: grid; place-items: center; background: var(--leaf-glow); color: var(--mint); margin-bottom: 6px; }
  .card .ic svg { width: 22px; height: 22px; }
  .card h3 { font: 800 16px/1.25 var(--display); }
  .card p { margin: 0; color: var(--ink-2); font-size: 13px; line-height: 1.55; }

  /* inside the app */
  .tabs { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 20px; }
  .tab { font: 700 13px/1 var(--display); padding: 10px 14px; border-radius: 999px; border: 1px solid var(--line-2); background: transparent; color: var(--ink-2); cursor: pointer; }
  .tab:hover { color: var(--ink); }
  .tab[aria-selected="true"] { background: var(--leaf); border-color: var(--leaf); color: var(--page); }
  .screen { border: 1px solid var(--line-2); border-radius: 16px; overflow: hidden; background: var(--page); }
  .screen img { display: block; width: 100%; height: auto; aspect-ratio: 16 / 10; object-fit: cover; object-position: top left; }
  .caption { margin: 18px 0 0; color: var(--ink-2); font-size: 14px; }

  /* slash commands */
  .commands { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 10px; }
  .command { border: 1px solid var(--line); background: var(--panel); border-radius: 14px; padding: 14px 16px; display: grid; gap: 4px; }
  .command code { font-weight: 600; font-size: 15px; color: var(--mint); }
  .command span { color: var(--ink-2); font-size: 13px; }

  /* getting started */
  .steps { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 12px; }
  .step { background: var(--panel); border: 1px solid var(--line); border-radius: 18px; padding: 20px; display: flex; flex-direction: column; align-items: flex-start; gap: 10px; }
  .step .n { font: 400 13px/1 var(--mono); color: var(--leaf); }
  .step h3 { font: 800 16px/1.25 var(--display); }
  .step p { margin: 0; color: var(--ink-2); font-size: 13px; line-height: 1.55; overflow-wrap: anywhere; }
  .step p code { color: var(--ink); font-size: 12px; }
  .step > code { margin-top: auto; padding: 7px 10px; border-radius: 8px; background: var(--screen); border: 1px solid var(--line-2); font-size: 12px; color: var(--mint); }
  .more { margin-top: 16px; display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 20px 20px 20px 24px; border-radius: 18px; border: 1px solid rgba(102, 173, 79, .3); background: linear-gradient(180deg, rgba(102, 173, 79, .14) 0%, rgba(102, 173, 79, .03) 100%); }
  .more b { display: block; font: 800 17px/1.3 var(--display); }
  .more span { color: var(--ink-2); font-size: 14px; }

  /* roadmap */
  .releases { border-top: 1px solid var(--line); }
  .release { display: grid; grid-template-columns: 80px 200px minmax(0, 1fr); gap: 24px; align-items: baseline; padding: 20px 0; border-bottom: 1px solid var(--line); }
  .release code { color: var(--leaf); font-size: 14px; }
  .release b { font: 800 17px/1.3 var(--display); }
  .release span { color: var(--ink-2); font-size: 15px; }
  .soon b { display: flex; align-items: center; gap: 12px; }
  .soon i { width: 10px; height: 18px; background: var(--leaf); display: block; flex: none; }
  @media (prefers-reduced-motion: no-preference) { .soon i { animation: blink 1.1s steps(1) infinite; } @keyframes blink { 50% { opacity: 0; } } }

  /* closing */
  .notes { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
  .note { background: var(--panel); border: 1px solid var(--line); border-radius: var(--r); padding: 24px; display: grid; gap: 10px; align-content: start; }
  .note .eyebrow { font-size: 11px; }
  .note p { margin: 0; font-size: 16px; line-height: 1.6; }
  .final { margin-top: 40px; display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 28px; border-radius: var(--r); border: 1px solid rgba(102, 173, 79, .3); background: linear-gradient(180deg, rgba(102, 173, 79, .15) 0%, rgba(102, 173, 79, .03) 100%); }
  .final h2 { font: 900 34px/1.1 var(--display); letter-spacing: -.03em; }
  .final p { margin: 8px 0 0; color: var(--ink-2); }

  /* the guide: the README itself */
  .guide { max-width: 780px; }
  .guide h2 { font: 900 30px/1.15 var(--display); letter-spacing: -.02em; margin: 64px 0 16px; padding-top: 24px; border-top: 1px solid var(--line); }
  .guide h3 { font: 800 19px/1.3 var(--display); margin: 36px 0 10px; color: var(--mint); }
  .guide p, .guide li { color: var(--ink-2); }
  .guide strong { color: var(--ink); }
  .guide a { color: var(--mint); }
  .guide li { margin: 6px 0; }
  .guide li::marker { color: var(--leaf); }
  .guide :not(pre) > code { font-size: .86em; background: var(--panel); border: 1px solid var(--line); border-radius: 6px; padding: 1px 6px; color: var(--ink); overflow-wrap: anywhere; }
  .guide pre { background: var(--screen); border: 1px solid var(--line-2); border-radius: 14px; padding: 16px; overflow-x: auto; line-height: 1.45; }
  .guide pre code { font-size: 13px; color: var(--mint); }
  .guide table { width: 100%; border-collapse: collapse; margin: 16px 0; display: block; overflow-x: auto; }
  .guide th, .guide td { text-align: left; padding: 10px 12px; border-bottom: 1px solid var(--line); vertical-align: top; }
  .guide th { font: 700 11px/1.4 var(--display); letter-spacing: .16em; text-transform: uppercase; color: var(--ink-3); }
  .guide hr { display: none; }

  /* footer */
  .foot { display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 28px max(16px, env(safe-area-inset-right, 0px), calc((100% - 1152px) / 2)) 40px max(16px, env(safe-area-inset-left, 0px), calc((100% - 1152px) / 2)); border-top: 1px solid var(--line); }
  .foot .who { display: flex; align-items: center; gap: 12px; font: 700 14px/1 var(--display); color: var(--ink-2); }
  .foot img { width: 36px; height: 36px; border-radius: 10px; image-rendering: pixelated; display: block; }
  .foot nav { display: flex; gap: 18px; }
  .foot nav a { font: 400 12px/1 var(--mono); color: var(--ink-3); text-decoration: none; }
  .foot nav a:hover { color: var(--ink); }

  @media (max-width: 1100px) {
    .hero h1 { font-size: clamp(38px, 5vw, 52px); }
    .demo { width: 52%; }
    .grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .steps { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  }
  @media (max-width: 860px) {
    .hero, .split, .more, .final { flex-direction: column; align-items: stretch; }
    .hero { padding-top: 48px; padding-bottom: 64px; gap: 40px; }
    .hero-art, .demo { width: 100%; }
    .face { left: auto; right: 12px; bottom: -24px; width: 84px; height: 84px; }
    .band { padding-top: 64px; padding-bottom: 64px; }
    .title { font-size: 30px; }
    .grid, .steps { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .notes { grid-template-columns: minmax(0, 1fr); }
    .foot { flex-direction: column; align-items: flex-start; }
  }
  @media (max-width: 560px) {
    .links a:not(.gh):not([href="#start"]) { display: none; }
    .links { gap: 14px; }
    .hero h1 { font-size: 36px; }
    .grid, .steps, .clients { grid-template-columns: minmax(0, 1fr); }
    .facts div, .release { grid-template-columns: minmax(0, 1fr); gap: 2px; }
    .log div { grid-template-columns: 6.6em minmax(0, 1fr); }
    .log i { display: none; }
    .final h2 { font-size: 28px; }
  }
</style>
</head>
<body>

<header class="nav">
  <a class="brand" href="#top">${outline}<span>Simon<em>Bot</em></span></a>
  <nav class="links" aria-label="Sections">
    <a href="#features">Features</a>
    <a href="#inside">Inside</a>
    <a href="#commands">Commands</a>
    <a href="#start">Start</a>
    <a href="#guide">Guide</a>
    <a class="gh" href="${REPO}">GitHub</a>
  </nav>
</header>

<main id="top">
<section class="band hero">
  <div class="hero-copy">
    <div class="wordmark">${mark('mk-hero')}<div><b>Simon<em>Bot</em></b><small>Discord bot · v${esc(VERSION)}</small></div></div>
    <h1>${esc(tagline)}</h1>
    <p class="lede">${esc(heroLede)}</p>
    <div class="buttons">
      <a class="btn main" href="${REPO}">Get SimonBot</a>
      <a class="btn ghost" href="#start">How to set it up</a>
    </div>
    <div class="chips"><span>Discord</span><span>Slash commands</span><span>English &amp; Spanish</span><span>Runs on your machine</span></div>
  </div>
  <div class="hero-art">
    <div class="window"><div class="bar"><i></i><i></i><i></i><span>localhost:8081</span></div><img src="screen-home.jpg" alt="SimonBot's home screen in the dashboard" width="1920" height="1200"></div>
    <img class="face" src="bot-avatar.png" alt="" width="512" height="512">
  </div>
</section>

<section class="band alt" id="headless">
  <div class="split">
    <div class="copy">
      <span class="eyebrow">Runs without a browser open</span>
      <h2 class="title">Close the browser. The bot keeps going.</h2>
      <p class="lede">${inline(headless)}</p>
      <p class="lede">${inline(replica)}</p>
      <dl class="facts">
        <div><dt>Runs on</dt><dd>Windows, macOS or Linux, a spare PC, or an old Android phone</dd></div>
        <div><dt>Reach it from</dt><dd>Any laptop, phone or tablet on your network, at port 8081</dd></div>
        <div><dt>Leave open</dt><dd>The one terminal window. That is the bot</dd></div>
      </dl>
    </div>
    <div class="demo" aria-label="A server that keeps working with every dashboard closed">
      <div class="demo-bar"><span class="eyebrow">Try it</span><span class="hint">Close the tabs. The bot keeps going.</span></div>
      <div class="demo-body">
        <div class="server">
          <div class="server-top"><b>server/</b><small>always running</small><span class="up" id="up">UP 0:00</span></div>
          <div class="log" id="log" aria-live="off"></div>
        </div>
        <div class="wire" id="wire"><strong>3 of 3</strong> dashboards open, one WebSocket each</div>
        <div class="clients">
          <div class="client"><span class="t">Laptop</span><button class="toggle" type="button">Close tab</button></div>
          <div class="client"><span class="t">Phone</span><button class="toggle" type="button">Close tab</button></div>
          <div class="client"><span class="t">Tablet</span><button class="toggle" type="button">Close tab</button></div>
        </div>
      </div>
    </div>
  </div>
</section>

<section class="band" id="features">
  <div class="head">
    <span class="eyebrow">What it does</span>
    <h2 class="title">Everything your server needs, in one bot.</h2>
    <p class="lede">${modules.length} modules, each with its own screen in the dashboard, in English and Spanish throughout.</p>
  </div>
  <div class="grid">
${modules.map(([name, what]) => `    <div class="card"><span class="ic">${iconFor(name)}</span><h3>${inline(name)}</h3><p>${inline(what)}</p></div>`).join('\n')}
  </div>
</section>

<section class="band alt" id="inside">
  <div class="head">
    <span class="eyebrow">Inside the app</span>
    <h2 class="title">The real thing, version ${esc(VERSION)}.</h2>
    <p class="lede">Screens from SimonBot as it opens on a fresh install, before Discord is connected.</p>
  </div>
  <div class="tabs" role="tablist" aria-label="Screens">
${SCREENS.map(([key, name, caption], i) => `    <button class="tab" type="button" role="tab" aria-selected="${i === 0}" data-shot="screen-${key}.jpg" data-caption="${esc(caption)}">${esc(name)}</button>`).join('\n')}
  </div>
  <div class="screen"><img id="shot" src="screen-${SCREENS[0][0]}.jpg" alt="${esc(SCREENS[0][1])} screen" width="1920" height="1200"></div>
  <p class="caption" id="caption">${esc(SCREENS[0][2])}</p>
</section>

<section class="band" id="commands">
  <div class="head">
    <span class="eyebrow">Slash commands</span>
    <h2 class="title">Type / and it answers.</h2>
    <p class="lede">${inline(commandsLede)}</p>
  </div>
  <div class="commands">
${commands.map(([name, what]) => `    <div class="command"><code>${esc(name)}</code><span>${inline(what)}</span></div>`).join('\n')}
  </div>
</section>

<section class="band alt" id="start">
  <div class="head">
    <span class="eyebrow">Getting started</span>
    <h2 class="title">${inline(startTitle)}</h2>
    <p class="lede">${inline(startRest.join(' '))}</p>
  </div>
  <div class="steps">
    <div class="step"><span class="n">01</span><h3>What you need</h3><p>${inline(needLine)}.</p></div>
${firstSteps.map((s, i) => `    <div class="step"><span class="n">${String(i + 2).padStart(2, '0')}</span><h3>${inline(s.title)}</h3><p>${inline(s.text)}</p>${s.code ? `<code>${esc(s.code)}</code>` : ''}</div>`).join('\n')}
  </div>
  <div class="more"><div><b>The full guide</b><span>Connecting Discord, where you stream, and making it yours, step by step.</span></div><a class="btn main" href="#guide">Read the guide</a></div>
</section>

<section class="band" id="roadmap">
  <div class="head">
    <span class="eyebrow">Roadmap</span>
    <h2 class="title">More features to come.</h2>
    <p class="lede">SimonBot is at ${esc(VERSION)}. What each version changed is in the <a href="${REPO}/blob/main/CHANGELOG.md">changelog</a>.</p>
  </div>
  <div class="releases">
    <div class="release soon"><code>next</code><b>More to come<i aria-hidden="true"></i></b><span>New features, a version at a time.</span></div>
${releases.map((r) => `    <div class="release"><code>${esc(r.version)}</code><b>${esc(r.date)}</b><span>${inline(r.text || '')}</span></div>`).join('\n')}
  </div>
</section>

<section class="band alt" id="closing">
  <div class="notes">
    <div class="note"><span class="eyebrow">Privacy</span><p>${inline(privacy)}</p></div>
    <div class="note"><span class="eyebrow">License</span><p>${inline(license)}</p></div>
  </div>
  <div class="final">
    <div><h2>Simon dice: bienvenidos.</h2><p>For your own Discord server, in English and Spanish.</p></div>
    <a class="btn main" href="${REPO}">Get SimonBot on GitHub</a>
  </div>
</section>

<section class="band" id="guide">
  <div class="head">
    <span class="eyebrow">The guide</span>
    <h2 class="title">Setting it up, step by step.</h2>
  </div>
  <article class="guide">
${guide}
  </article>
</section>
</main>

<footer class="foot">
  <span class="who"><img src="bot-avatar.png" alt="" width="36" height="36">Made by Simon · @Bastian-Alvarado</span>
  <nav aria-label="Elsewhere"><a href="${REPO}">GitHub</a><a href="${REPO}/blob/main/CHANGELOG.md">Changelog</a><a href="${REPO}/blob/main/PRIVACY.md">Privacy</a></nav>
</footer>

<script>
  // Inside the app: one screen at a time.
  const shot = document.getElementById('shot'), caption = document.getElementById('caption');
  document.querySelectorAll('.tab').forEach((tab) => tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((t) => t.setAttribute('aria-selected', String(t === tab)));
    shot.src = tab.dataset.shot; shot.alt = tab.textContent + ' screen'; caption.textContent = tab.dataset.caption;
  }));

  // Runs without a browser: the server's log keeps going whatever the dashboards do.
  const EVENTS = [
    ['welcome', 'Welcome card for @nova_byte'],
    ['/perfil', 'Profile card for @ripple_cat'],
    ['level', '@luzmarina reached level 12'],
    ['role', 'Gave @nova_byte the Regulars role'],
    ['/sorteo', '@pixel_otter entered the giveaway'],
    ['request', '@ripple_cat asked for Celeste'],
    ['page', 'Rules page edited in #info'],
    ['/pregunta', 'Question from @luzmarina'],
  ];
  const log = document.getElementById('log'), up = document.getElementById('up');
  let tick = 0;
  const clock = (s) => Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  const add = () => {
    const [kind, what] = EVENTS[tick % EVENTS.length];
    const row = document.createElement('div');
    row.innerHTML = '<i></i><b></b><span></span>';
    row.children[0].textContent = '20:14:' + String(10 + (tick * 7) % 50).padStart(2, '0');
    row.children[1].textContent = kind;
    row.children[2].textContent = what;
    log.append(row);
    while (log.children.length > 8) log.firstElementChild.remove();
    tick++;
  };
  for (let i = 0; i < 6; i++) add();
  let seconds = 192;
  up.textContent = 'UP ' + clock(seconds);
  setInterval(() => { up.textContent = 'UP ' + clock(++seconds); }, 1000);
  setInterval(add, 1800);
  const wire = document.getElementById('wire');
  document.querySelectorAll('.client .toggle').forEach((button) => button.addEventListener('click', () => {
    const client = button.closest('.client');
    const closed = client.classList.toggle('closed');
    button.textContent = closed ? 'Open tab' : 'Close tab';
    const open = document.querySelectorAll('.client:not(.closed)').length;
    wire.innerHTML = open ? '<strong>' + open + ' of 3</strong> dashboards open, one WebSocket each' : '<strong>0 of 3</strong> open. The bot keeps going.';
  }));
</script>
</body>
</html>
`;

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'index.html'), html);
fs.copyFileSync(path.join(ROOT, FACE), path.join(OUT, 'bot-avatar.png'));
for (const file of fs.readdirSync(path.join(ROOT, SHOTS))) fs.copyFileSync(path.join(ROOT, SHOTS, file), path.join(OUT, file));
fs.writeFileSync(path.join(OUT, '.nojekyll'), '');
console.log(`pages: wrote ${OUT}`);
