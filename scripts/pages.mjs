/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The GitHub Pages site: README.md as one page, in SimonBot's colours.
 *
 *   npm i --no-save marked@15 && node scripts/pages.mjs [outDir]
 *
 * Writes outDir (default _site) with index.html and the bot's avatar. Links
 * to other files in the repository go to them on GitHub; links to headings
 * stay on the page. .github/workflows/pages.yml runs this on every push to
 * main that touches the README and publishes it to the gh-pages branch.
 */
import fs from 'node:fs';
import path from 'node:path';
import { marked } from 'marked';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT = path.resolve(process.argv[2] || path.join(ROOT, '_site'));
const REPO = 'https://github.com/Bastian-Alvarado/SimonBot';
const FACE = 'art/simonbot/bot-avatar-mint-circle-512.png';

const slug = (text) => text.toLowerCase().replace(/<[^>]+>/g, '').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-');
const local = (href) => href && !/^(https?:|mailto:|#)/.test(href);

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

let md = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8');
// The README's own header (avatar, name, tagline) becomes the page's hero.
md = md.replace(/^[\s\S]*?<\/p>\s*<h1[\s\S]*?<\/h1>\s*<p[\s\S]*?<\/p>\s*/, '');
const body = marked.parse(md);

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>SimonBot</title>
<meta name="description" content="Simon's community bot for Discord, running on your own machine.">
<link rel="icon" href="bot-avatar.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;800&family=Pixelify+Sans:wght@600&family=JetBrains+Mono&display=swap" rel="stylesheet">
<style>
  :root { --bg:#0F0913; --panel:#140B18; --line:#2A1B30; --text:#F3EEF5; --muted:#A394AA; --leaf:#66AD4F; --mint:#B8E99C; --grape:#A855F7; }
  * { box-sizing: border-box; }
  html { scroll-behavior: smooth; }
  body { margin:0; background:var(--bg); color:var(--text); font:16px/1.65 Montserrat, system-ui, sans-serif; }
  a { color:var(--mint); }
  .hero { text-align:center; padding:64px 16px 40px; background:radial-gradient(ellipse at top, #22132A 0%, var(--bg) 70%); border-bottom:1px solid var(--line); }
  .hero img { width:150px; height:150px; image-rendering:pixelated; border-radius:50%; box-shadow:0 0 0 6px #1C1121, 0 0 60px #66AD4F55; }
  .hero h1 { font-family:'Pixelify Sans', monospace; font-size:clamp(40px, 8vw, 64px); margin:20px 0 8px; color:var(--mint); letter-spacing:1px; }
  .hero p { max-width:640px; margin:0 auto; color:var(--muted); font-size:18px; }
  .hero .buttons { margin-top:28px; display:flex; gap:12px; justify-content:center; flex-wrap:wrap; }
  .btn { display:inline-block; padding:12px 22px; border-radius:999px; font-weight:800; text-decoration:none; }
  .btn.main { background:var(--leaf); color:#0F0913; }
  .btn.alt { border:1px solid var(--line); color:var(--text); background:var(--panel); }
  main { max-width:860px; margin:0 auto; padding:24px 16px 80px; }
  h2 { font-size:28px; margin-top:56px; padding-bottom:8px; border-bottom:1px solid var(--line); }
  h3 { font-size:20px; margin-top:32px; color:var(--mint); }
  h4 { color:var(--muted); }
  code { font-family:'JetBrains Mono', monospace; font-size:.88em; background:#1C1121; border:1px solid var(--line); border-radius:6px; padding:1px 6px; }
  pre { background:var(--panel); border:1px solid var(--line); border-radius:14px; padding:16px; overflow-x:auto; line-height:1.4; }
  p code, li code, td code { overflow-wrap:anywhere; }
  pre code { background:none; border:0; padding:0; font-size:13px; }
  table { width:100%; border-collapse:collapse; margin:16px 0; display:block; overflow-x:auto; }
  th, td { text-align:left; padding:10px 12px; border-bottom:1px solid var(--line); vertical-align:top; }
  th { color:var(--muted); font-size:12px; text-transform:uppercase; letter-spacing:.12em; }
  hr { border:0; border-top:1px solid var(--line); margin:48px 0; }
  li { margin:4px 0; }
  footer { text-align:center; color:var(--muted); font-size:14px; padding:32px 16px; border-top:1px solid var(--line); }
</style>
</head>
<body>
<header class="hero">
  <img src="bot-avatar.png" alt="SimonBot, Pixel Simon holding a pixel heart">
  <h1>SimonBot</h1>
  <p>Simon's community bot for Discord, running on your own machine.</p>
  <div class="buttons">
    <a class="btn main" href="#getting-started">Get started</a>
    <a class="btn alt" href="${REPO}">View on GitHub</a>
  </div>
</header>
<main>
${body}
</main>
<footer>SimonBot · built on SimonSays · <a href="${REPO}">github.com/Bastian-Alvarado/SimonBot</a></footer>
</body>
</html>
`;

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'index.html'), html);
fs.copyFileSync(path.join(ROOT, FACE), path.join(OUT, 'bot-avatar.png'));
fs.writeFileSync(path.join(OUT, '.nojekyll'), '');
console.log(`pages: wrote ${OUT}`);
