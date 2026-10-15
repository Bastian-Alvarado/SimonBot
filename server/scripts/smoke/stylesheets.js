/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Smoke tests: A layer's own stylesheet, the parts it may name, and the library of looks.
 *
 * Runs in order with the other feature files, on the one engine the harness
 * boots — through scripts/smoke.js, never on its own.
 */

import { ALERT_OVERLAY, CHAT_ROW, LAYER_STYLE, SCOPED, SCRIPT_URL, assert, fs, test } from './harness.js';
import { LAYER_TYPES, normaliseLayouts } from './backup-and-layouts.js';
import { OVERLAY_VARS, fillTemplate } from './layers.js';

// -------------------------------------------- a stylesheet that belongs to one layer

test('a layer can carry a stylesheet of its own', () => {
  const [l] = normaliseLayouts([{
    id: 'a', layers: [{ type: 'shape', css: ':scope { clip-path: circle(40%) }' }],
  }]);
  assert.equal(l.layers[0].css, ':scope { clip-path: circle(40%) }');
});

test('and it travels with a copy of that layer', () => {
  /*
    The whole reason this exists beside the canvas stylesheet. That one reaches
    a layer by id, and duplicating mints a new id — so a rule written there
    goes on styling the original and leaves the copy plain.
  */
  const src = fs.readFileSync(new URL('../../web/components/views/LayoutsView.tsx', SCRIPT_URL), 'utf8');
  const fn = src.slice(src.indexOf('const duplicateLayer'), src.indexOf('const removeLayer'));
  assert.ok(fn.includes('JSON.parse(JSON.stringify'), 'a copy no longer takes the whole layer');
  assert.ok(!fn.includes("css: ''"), 'the copy is stripped of its stylesheet');
});

test('a scoped stylesheet needs no selector naming what it styles', () => {
  /*
    A <style> inside an element, holding @scope with nothing in front of it,
    scopes to that element. That is what lets the rules survive being copied:
    there is no id in them to go stale.

    One implementation for the three things that have a box — a layer, an
    alert and the chat — because three copies is three places for this to be
    got wrong independently.
  */
  assert.ok(SCOPED.includes('@scope {'), 'a scoped stylesheet is no longer scoped by position');
  assert.ok(!SCOPED.includes('data-layer-id'), 'the stylesheet writes an id into the rules');
  for (const [what, src] of [['the layer', LAYER_STYLE], ['the alert', ALERT_OVERLAY], ['the chat', CHAT_ROW]]) {
    assert.ok(src.includes('<ScopedStyle'), `${what} keeps a copy of its own`);
  }
});

test('a scoped stylesheet is not applied at all without @scope', () => {
  /*
    Unlike the canvas one, these cannot fall back to applying unscoped: every
    rule is written expecting :scope to be the thing it was typed into, so
    unscoped it would either do nothing or style the whole page. Nothing is
    the safer of the two.
  */
  assert.ok(SCOPED.includes('if (!canScopeStyles) return null;'), 'an unscoped fallback crept in');
});

test('a layer stylesheet cannot stop being one', () => {
  const [l] = normaliseLayouts([{
    id: 'a', layers: [{ type: 'shape', css: `:scope{} ${'<' + '/StYlE'}><img src=x>` }],
  }]);
  assert.ok(!l.layers[0].css.toLowerCase().includes('</style'), l.layers[0].css);
});

const CLEAN_CSS = await import('../../../shared/clean-css.js');

test('every stylesheet box holds ten thousand characters, and keeps them whole', () => {
  /*
    It was 2500 for a layer and 4000 for the rest, to keep small the config
    every page receives on connect and on every save. Measured on a real setup
    the biggest layer stylesheet was 1242 characters, and the only thing
    anybody ever saw the low cap do was cut the end off a long one — so one
    roomy limit replaced both.
  */
  const { MAX_CSS } = CLEAN_CSS;
  assert.equal(MAX_CSS, 10000);
  for (const name of ['MAX_SCOPED_CSS', 'MAX_ALERT_CSS', 'MAX_CHAT_CSS', 'MAX_CANVAS_CSS']) {
    assert.equal(CLEAN_CSS[name], MAX_CSS, `${name} has a limit of its own again`);
  }
  const nearly = `${'a'.repeat(MAX_CSS - 1)}}`;
  const [l] = normaliseLayouts([{ id: 'a', css: nearly, layers: [{ type: 'shape', css: nearly, motionCss: nearly }] }]);
  assert.equal(l.css, nearly, 'the canvas stylesheet lost its end');
  assert.equal(l.layers[0].css, nearly, "a layer's look lost its end");
  assert.equal(l.layers[0].motionCss, nearly, "a layer's motion lost its end");
  // Past it the server still has the last word, for anything sent by a route other than the box.
  const [over] = normaliseLayouts([{ id: 'a', css: 'b'.repeat(99999), layers: [{ type: 'shape', css: 'a'.repeat(99999) }] }]);
  assert.equal(over.css.length, MAX_CSS);
  assert.equal(over.layers[0].css.length, MAX_CSS);
});

test('every stylesheet box counts as you type, and will not save past the limit', () => {
  /*
    Going over used to be invisible: the server cut the end off, usually the
    rule being worked on, and nothing said so. The count turns amber near the
    end and red past it, and the box keeps what was typed without saving it,
    so nothing is lost and the reason is on screen.
  */
  const read = (name) => fs.readFileSync(new URL(`../../web/components/${name}`, SCRIPT_URL), 'utf8');
  const box = read('CssBox.tsx');
  assert.ok(box.includes("import { MAX_CSS } from '../../shared/clean-css.js';"), 'the box counts against a limit of its own');
  assert.ok(box.includes('onCommit={(next) => { if (next.length <= max) onCommit(next); }}'), 'a stylesheet past the limit is saved, to be cut');
  assert.ok(box.includes('onDraft={(text) => setLength(text.length)}'), 'the count waits for the commit');
  assert.ok(box.includes('{length} / {max}') && box.includes('max * 0.95') && box.includes('t.cssTooLong'), 'the count, its warning or the red line is gone');
  assert.ok(read('CommittedInput.tsx').includes('useEffect(() => { onDraft?.(local); }, [local]);'), 'the field no longer reports what is in it');
  // Every box that takes a stylesheet: a layer's look and motion, an alert's and the chat's (one panel), a canvas's.
  for (const name of ['StylesheetPanel.tsx', 'LayoutCssPanel.tsx']) {
    const src = read(name);
    assert.ok(src.includes('<CssBox') && !src.includes('<CommittedInput'), `${name} has a stylesheet box without a count`);
  }
  assert.equal(read('StylesheetPanel.tsx').split('<CssBox').length - 1, 2, 'the look or the motion lost its count');
});

test('every layer may carry one, not only the kinds that draw shapes', () => {
  // It is the same code for any layer, and the rules about how a layer is
  // drawn already belong to the layer rather than to its type.
  for (const type of ['shape', 'text', 'chat', 'runcard']) {
    const [l] = normaliseLayouts([{ id: 'a', layers: [{ type, css: ':scope { opacity: 1 }' }] }]);
    assert.equal(l.layers[0].css, ':scope { opacity: 1 }', type);
  }
});

// ------------------------------------ parts of a layer a stylesheet may name

export const PARTS_PANEL = fs.readFileSync(new URL('../../web/components/LayerCssPanel.tsx', SCRIPT_URL), 'utf8');
const PARTS_LIST = PARTS_PANEL.slice(PARTS_PANEL.indexOf('LAYER_PARTS'), PARTS_PANEL.indexOf('export const LayerCssPanel'));
export const OFFERED = PARTS_LIST.split(String.fromCharCode(10)).map((l) => l.trim()).filter((l) => l.startsWith(String.fromCharCode(39) + '[data-')).map((l) => l.slice(1, l.indexOf(String.fromCharCode(39), 1)));
export const COMPONENTS = fs.readdirSync(new URL('../../web/components/', SCRIPT_URL))
  // The panel holds the list being checked, so scanning it would let every
  // selector prove its own existence.
  .filter((f) => f.endsWith('.tsx') && f !== 'LayerCssPanel.tsx')
  .map((f) => fs.readFileSync(new URL('../../web/components/' + f, SCRIPT_URL), 'utf8'))
  .join(String.fromCharCode(10));

test('the editor offers parts that actually exist', () => {
  /*
    A layer names its parts so a stylesheet can reach them. Everything else
    inside a layer is markup rewritten whenever its component is touched, so
    a rule naming that breaks on an update for a reason nobody can see. What
    the editor lists is the promise, and this is what keeps it one.
  */
  assert.ok(OFFERED.length >= 4, `the editor offers only: ${OFFERED.join(', ')}`);
  for (const selector of OFFERED) {
    const attr = selector.slice(1, -1).replace('=', '=');
    assert.ok(COMPONENTS.includes(attr), `the editor offers ${selector}, which no component has`);
  }
});

test('and every part it offers is reachable from the right layer', () => {
  // The omnibar and the run card each name their own, and the editor shows
  // a layer only the ones belonging to its kind.
  for (const [type, attr] of [['omnibar', 'data-omnibar'], ['runcard', 'data-runcard']]) {
    const listed = OFFERED.filter((s) => s.includes(attr));
    assert.ok(listed.length >= 4, `${type} names only ${listed.length} parts`);
    const block = PARTS_LIST.slice(PARTS_LIST.indexOf(type));
    assert.ok(block.includes(attr), `${type} is listed with somebody else's parts`);
  }
});

test('a part is an attribute rather than text on the page', () => {
  /*
    Caught by looking, not by reading: a hook appended after a one-line
    opening tag became a child, and the words data-omnibar appeared in the
    bar's own text where a viewer could read them. An attribute alone on a
    line and a stray child are the same text, so every hook has to sit on a
    line that is visibly part of a tag.
  */
  for (const file of ['Omnibar.tsx', 'RunCard.tsx', 'ShapeLayer.tsx', 'Nameplate.tsx', 'ViewerCount.tsx', 'Countdown.tsx', 'TextLayer.tsx', 'GoalBar.tsx', 'SpotifyNowPlaying.tsx', 'PlanOverlay.tsx', 'QuestionOverlay.tsx']) {
    const src = fs.readFileSync(new URL('../../web/components/' + file, SCRIPT_URL), 'utf8');
    for (const line of src.split(String.fromCharCode(10))) {
      if (!/data-(omnibar|runcard|shape|nameplate|viewers|countdown|text|goal|spotify|plan|question|alert|chat)(-[a-z]+)?=/.test(line)) continue;
      assert.ok(line.includes('className') || line.includes('<'),
        `${file}: this is not inside a tag, so it reaches the page as text: ${line.trim()}`);
    }
  }
});


test('a hidden category does not hand its name to the estimate', () => {
  /*
    The details list drops whatever is switched off, so with the category
    hidden the estimate slides into first place. Anything reading position
    would then call the estimate the category — and a stylesheet written
    against that would paint the wrong one.
  */
  const src = fs.readFileSync(new URL('../../web/components/RunCard.tsx', SCRIPT_URL), 'utf8');
  assert.ok(!src.includes("i === 0 ? 'category'"), 'the part is decided by position again');
  assert.ok(src.includes("part: 'category'"), 'a detail no longer says which one it is');
  assert.ok(src.includes('data-runcard="category"') && src.includes('data-runcard="estimate"'),
    'the two parts are not named in the source, so nothing can check them');
});

test('a shape names the element it actually draws', () => {
  /*
    :scope is the layer around a shape, and the shape sits inside it with its
    fill written inline. A stylesheet aiming at :scope paints behind the shape
    and is never seen — which is exactly what happened the first time a
    starting-soon panel was written against it and came out the fill colour.
  */
  const src = fs.readFileSync(new URL('../../web/components/ShapeLayer.tsx', SCRIPT_URL), 'utf8');
  assert.ok(src.includes('data-shape="box"'), 'the drawn box has no name');
  assert.ok(src.includes('data-shape="rule"'), 'the rule inside a line has no name');
});

// ------------------------------------------------ the library of looks

export const { CSS_LOOKS, ALL_PRESETS, PRESET_LAYER_TYPES, canApplyInBulk } = await import('../../../shared/css-presets.js');

/** Every [data-…="…"] a stylesheet names, without a regex to get wrong. */
const selectorsIn = (css) => {
  const found = [];
  let at = css.indexOf('[data-');
  while (at >= 0) {
    const end = css.indexOf(']', at);
    if (end < 0) break;
    found.push(css.slice(at + 1, end));
    at = css.indexOf('[data-', end);
  }
  return found;
};

/**
 * Is this selector one some component really draws?
 *
 * Most are written out whole. A few name an attribute whose value the
 * component works out — the rank a chatter holds — so the pair never appears
 * in the source as one string. Those are checked as two halves: the attribute
 * is written somewhere, and the value is one the component can produce.
 */
export const componentsDraw = (selector) => {
  if (COMPONENTS.includes(selector)) return true;
  const at = selector.indexOf('=');
  if (at < 0) return false;
  const attr = selector.slice(0, at);
  const value = selector.slice(at + 1).split(String.fromCharCode(34)).join("");
  return COMPONENTS.includes(attr + '=') && COMPONENTS.includes(String.fromCharCode(39) + value + String.fromCharCode(39));
};

test('every preset names only parts the app promises to keep', () => {
  /*
    The whole risk of shipping a library: a preset that names markup a
    component generates looks fine today and quietly stops working the next
    time that component is rewritten, leaving whoever used it no way to know
    why.
  */
  for (const preset of ALL_PRESETS) {
    for (const selector of selectorsIn(preset.css)) {
      assert.ok(componentsDraw(selector),
        `preset "${preset.id}" names ${selector}, which no component has`);
    }
  }
});

test('and names them on the layer it is offered for', () => {
  // A shape preset shown as a nameplate would insert rules matching nothing,
  // which reads as the library being broken rather than as a mistake in it.
  // An omnibar layer draws a classic bar or a tall one, so either's parts belong to it.
  const attrFor = { shape: ['data-shape'], omnibar: ['data-omnibar', 'data-tallbar'], runcard: ['data-runcard'], nameplate: ['data-nameplate'], viewers: ['data-viewers'], countdown: ['data-countdown'], text: ['data-text'], goal: ['data-goal'], spotify: ['data-spotify'], plan: ['data-plan'], question: ['data-question'], roster: ['data-roster'], stopwatch: ['data-stopwatch'], images: ['data-images'], players: ['data-players'] };
  for (const preset of ALL_PRESETS) {
    const expected = attrFor[preset.layerType];
    if (!expected) continue;
    for (const selector of selectorsIn(preset.css)) {
      assert.ok(expected.some((prefix) => selector.startsWith(prefix)),
        `preset "${preset.id}" is offered as a ${preset.layerType} but names ${selector}`);
    }
  }
});

test('a preset that names nothing uses :scope, which always exists', () => {
  for (const preset of ALL_PRESETS) {
    if (selectorsIn(preset.css).length) continue;
    assert.ok(preset.css.includes(':scope'),
      `preset "${preset.id}" names neither a part nor :scope, so it targets nothing`);
  }
});

test('every preset is something a person can tell from the others', () => {
  const seen = new Set();
  for (const preset of ALL_PRESETS) {
    assert.ok(preset.name && preset.name.length <= 24, `bad name: ${preset.id}`);
    assert.ok(preset.hint && preset.hint.length > 10, `${preset.id} has no hint worth reading`);
    assert.ok(!seen.has(preset.id), `two presets share the id ${preset.id}`);
    seen.add(preset.id);
  }
});

test('the library is grouped by look, and every look has something in it', () => {
  assert.ok(CSS_LOOKS.length >= 2, `only ${CSS_LOOKS.length} look(s)`);
  for (const look of CSS_LOOKS) {
    assert.ok(look.name && look.hint, `look ${look.id} is unlabelled`);
    assert.ok(look.objects.length >= 1, `look ${look.id} is empty`);
  }
});

/*
  And layers no theme ever will: an OBS source's slot draws nothing on stream
  — the source shows through it — so there is nothing to put a look on.
*/
const NEVER_DRESSED = ['source'];

/*
  Layers the themes have not dressed yet, drawn in their plain default look for
  now. There were nine — the players list, the poll, the call, the avatar, the
  PNGtuber and the Twitch pieces arrived before their looks did — and every
  theme has caught up. A new kind of layer that arrives before its looks goes
  here, and taking it off holds every theme to covering it again.
*/
const NOT_YET_DRESSED = [...NEVER_DRESSED];

test('every theme has a look for every kind of layer, and one for a tall bar', () => {
  /*
    A theme is only a theme if every piece of a layout can wear it. The two
    groups that are pieces to build with rather than whole looks — a starting
    screen's wall and the building blocks — are not held to it.
  */
  const PIECE_SETS = ['starting', 'blocks'];
  const themes = CSS_LOOKS.filter((l) => !PIECE_SETS.includes(l.id));
  assert.ok(themes.length >= 2, `only ${themes.length} themes`);
  for (const theme of themes) {
    const kinds = new Set(theme.objects.map((o) => (o.layerType === 'alert' ? 'alerts' : o.layerType)));
    for (const type of LAYER_TYPES.filter((t) => !NOT_YET_DRESSED.includes(t))) assert.ok(kinds.has(type), `${theme.name} has nothing for a ${type} layer`);
    assert.ok(theme.objects.some((o) => o.previewTall && o.css.includes('[data-tallbar="bar"]')), `${theme.name} has no look for a tall bar`);
  }
  // Each players list and poll reads the colours chosen on the layer before its own.
  for (const p of ALL_PRESETS.filter((o) => o.layerType === 'players')) {
    for (const v of ['--players-background', '--players-text']) assert.ok(p.css.includes(`var(${v},`), `${p.id} ignores ${v}`);
  }
  for (const p of ALL_PRESETS.filter((o) => o.layerType === 'poll')) {
    for (const v of ['--poll-background', '--poll-text']) assert.ok(p.css.includes(`var(${v},`), `${p.id} ignores ${v}`);
  }
});

// public-edition: leave out
test('this app keeps all nine of its themes, in the Library\'s order', () => {
  assert.deepEqual(CSS_LOOKS.map((l) => l.id), ['marathon', 'simonsays', 'rack', 'cyberpunky', 'emergency', 'footage', 'mania', 'starting', 'blocks']);
});
// public-edition: end

// public-edition: leave out
test('Marathon has a look for every kind of layer', () => {
  /*
    A theme is only a theme if every piece of a layout can wear it. Alerts are
    dressed as "alert" on the Alerts screen; everything else is its own kind.
  */
  const marathon = CSS_LOOKS.find((l) => l.id === 'marathon');
  const kinds = new Set(marathon.objects.map((o) => (o.layerType === 'alert' ? 'alerts' : o.layerType)));
  for (const type of LAYER_TYPES.filter((t) => !NOT_YET_DRESSED.includes(t))) assert.ok(kinds.has(type), `Marathon has nothing for a ${type} layer`);
  // The tall bar has its own look, drawn on a tall bar in the Library.
  const tall = marathon.objects.find((o) => o.id === 'marathon-tallbar');
  assert.ok(tall && tall.previewTall && tall.css.includes('[data-tallbar="bar"]'), 'there is no Marathon look for a tall bar');
  // The countdown's look is not called Timer now that the run timer is a layer of its own.
  assert.equal(marathon.objects.find((o) => o.id === 'marathon-countdown').name, 'Countdown');
});
// public-edition: end

// public-edition: leave out
test('Games Done Quick inspired has a look for every kind of layer', () => {
  // The same promise Marathon makes, for the theme drawn from the 2026 summer layout.
  const rack = CSS_LOOKS.find((l) => l.id === 'rack');
  const kinds = new Set(rack.objects.map((o) => (o.layerType === 'alert' ? 'alerts' : o.layerType)));
  for (const type of LAYER_TYPES.filter((t) => !NOT_YET_DRESSED.includes(t))) assert.ok(kinds.has(type), `Games Done Quick inspired has nothing for a ${type} layer`);
  const tall = rack.objects.find((o) => o.id === 'rack-tallbar');
  assert.ok(tall && tall.previewTall && tall.css.includes('[data-tallbar="bar"]'), 'there is no Games Done Quick look for a tall bar');
});
// public-edition: end

test('SimonSays Default has a look for every kind of layer, in one colour', () => {
  const theme = CSS_LOOKS.find((l) => l.id === 'simonsays');
  assert.equal(theme.name, 'SimonSays Default');
  const kinds = new Set(theme.objects.map((o) => (o.layerType === 'alert' ? 'alerts' : o.layerType)));
  for (const type of LAYER_TYPES.filter((t) => !NOT_YET_DRESSED.includes(t))) assert.ok(kinds.has(type), `SimonSays Default has nothing for a ${type} layer`);
  assert.ok(theme.objects.some((o) => o.previewTall && o.css.includes('[data-tallbar="bar"]')), 'there is no SimonSays Default look for a tall bar');
  for (const look of theme.objects) {
    // No spectrum: the only colour is the one somebody chose.
    assert.ok(!/#ff2d95|#ffe600|#00ff88|#00d5ff/i.test(look.css), `${look.id} still draws the spectrum`);
    // And where it has a colour, it follows the layout accent and is white without one.
    if (look.css.includes('--color:')) {
      assert.ok(look.css.includes('--color: var(--overlay-accent, #ffffff);'), `${look.id} does not follow the layout accent`);
    }
  }
});

test('Cyberpunky has a look for every kind of layer, white by default and every colour a field', () => {
  const theme = CSS_LOOKS.find((l) => l.id === 'cyberpunky');
  assert.equal(theme.name, 'Cyberpunky');
  const kinds = new Set(theme.objects.map((o) => (o.layerType === 'alert' ? 'alerts' : o.layerType)));
  for (const type of LAYER_TYPES.filter((t) => !NOT_YET_DRESSED.includes(t))) assert.ok(kinds.has(type), `Cyberpunky has nothing for a ${type} layer`);
  assert.ok(theme.objects.some((o) => o.previewTall && o.css.includes('[data-tallbar="bar"]')), 'there is no Cyberpunky look for a tall bar');
  // Looks, not motions: a motion has no colours of its own to declare.
  for (const look of theme.objects.filter((o) => o.kind !== 'motion')) {
    // The main colour is white out of the box, and a field somebody can change.
    assert.ok(look.css.includes('--neon: #ffffff; /* Main colour */'), `${look.id} has no Main colour field, or it is not white`);
    // Its own colourway, not the layout's: SimonSays Default is the one that follows.
    assert.ok(!look.css.includes('--overlay-accent'), `${look.id} follows the layout accent`);
  }
  const styles = fs.readFileSync(new URL('../../web/styles.css', SCRIPT_URL), 'utf8');
  assert.ok(styles.includes("@fontsource/chakra-petch/700.css"), 'the squared face the theme is set in is not bundled');
  /*
    The hatching moves. Every hatch is offset by --hatch, which only animates
    because it is registered as a length; the loop is one stripe long, and its
    speed is a field. A hatch written without the offset would sit still
    beside ones that move.
  */
  for (const look of theme.objects.filter((o) => o.css.includes('repeating-linear-gradient'))) {
    assert.ok(!/repeating-linear-gradient\(-45deg, [^,]+ 0 /.test(look.css), `${look.id} has a hatch that does not move`);
    assert.ok(look.css.includes('@property --hatch { syntax: "<length>"'), `${look.id} animates a length it never registered`);
    assert.ok(/animation: cyberHatch\w* var\(--speed\) linear infinite/.test(look.css), `${look.id} never sets its hatch moving`);
    assert.ok(look.css.includes('--speed: 0.6s; /* Seconds per stripe | 0.1-4 */'), `${look.id} has no speed field`);
  }
});

test('every Cyberpunky layer that can replay a motion draws itself in the same way', () => {
  const theme = CSS_LOOKS.find((l) => l.id === 'cyberpunky');
  const motions = theme.objects.filter((o) => o.kind === 'motion');
  for (const type of ['omnibar', 'runcard', 'nameplate', 'alert', 'chat', 'question']) {
    const m = motions.find((o) => o.layerType === type);
    assert.ok(m, `there is no Cyberpunky motion for a ${type}`);
    assert.ok(/cyber(Header|DrawBox)/.test(m.css), `${m.id} does not draw up from a sliver`);
    // Each previews over the look it was drawn for, or there is nothing filled to see drawn.
    assert.ok(theme.objects.some((o) => o.id === m.previewWith && o.layerType === type), `${m.id} previews over nothing of its own`);
  }
  // Chat and alerts are styled elsewhere, so their motions have to say so or they reach nothing.
  for (const type of ['alert', 'chat']) {
    assert.equal(motions.find((o) => o.layerType === type).applies, type, `the ${type} motion does not say where it applies`);
  }
  // The alert's own animation is its way out; a motion that set it would leave the alert on screen.
  const alert = motions.find((o) => o.layerType === 'alert');
  assert.ok(!/(^|\n):scope \{[^}]*animation/.test(alert.css), 'the alert motion takes over the alert itself and its exit with it');
  // Both chips are cut to the corner the chip draw starts from.
  for (const id of ['cyber-runcard', 'cyber-question']) {
    assert.ok(theme.objects.find((o) => o.id === id).css.includes('clip-path: polygon(.5em 0, 100% 0, 100% 100%, 0 100%, 0 .5em)'), `${id} is cut to another corner`);
  }
});

test('Cyberpunky\'s bars draw their header up from a sliver as wide as the cut corner', () => {
  const theme = CSS_LOOKS.find((l) => l.id === 'cyberpunky');
  const motion = theme.objects.find((o) => o.id === 'cyber-header-draw');
  assert.ok(motion && motion.kind === 'motion' && motion.layerType === 'omnibar', 'there is no header motion for the bars');
  assert.ok(motion.css.includes('[data-omnibar="label"], [data-tallbar="context"]'), 'it does not reach both bars\' headers');
  // The corner is one field, read by the look and the motion alike, so the sliver is always as wide as it.
  for (const id of ['cyber-omnibar', 'cyber-tallbar']) {
    const look = theme.objects.find((o) => o.id === id);
    assert.ok(/--notch: [\d.]+em; \/\* Cut corner/.test(look.css), `${id} has no Cut corner field`);
    assert.ok(look.css.includes('clip-path: polygon(var(--notch) 0, 100% 0, 100% 100%, 0 100%, 0 var(--notch))'), `${id} cuts its corner some other way`);
  }
  // Three shapes with the same five points, so each can become the next; the last is the look's own.
  const frames = [...motion.css.matchAll(/^\s*\d+% \{ clip-path: polygon\((.*)\); \}$/gm)];
  assert.equal(frames.length, 3, 'the header is not drawn in three steps');
  for (const [, points] of frames) {
    // The corner reads as one token, so its own comma is not counted as a point.
    assert.equal(points.split('var(--notch, .7em)').join('N').split(',').length, 5, 'a step has a different number of points and cannot be tweened');
  }
  assert.ok(motion.css.includes('100% { clip-path: polygon(var(--notch, .7em) 0, 100% 0, 100% 100%, 0 100%, 0 var(--notch, .7em)); }'),
    'the draw does not end on the shape the look gives the header');
  // Naming its own wipe would stop the look's hatch on the same element; the motion keeps it going.
  assert.ok(motion.css.includes('cyberHatch var(--speed, .6s) linear infinite'), 'the hatch stops while the motion is on');
  // A loop is never a way out, or the moving hatch would hold every outgoing slot.
  const bar = fs.readFileSync(new URL('../../web/components/Omnibar.tsx', SCRIPT_URL), 'utf8');
  assert.ok(bar.includes("a.effect?.getTiming().iterations === Infinity"), 'an endless animation still counts as a slot leaving');
});

// public-edition: leave out
test('Emergency Meeting dresses a game night, its crewmates drawn rather than copied', () => {
  const theme = CSS_LOOKS.find((l) => l.id === 'emergency');
  assert.ok(theme, 'there is no Emergency Meeting theme');
  const kinds = new Set(theme.objects.map((o) => o.layerType));
  // The screens a party night uses, at the least.
  for (const type of ['players', 'chat', 'alert', 'goal', 'plan', 'omnibar', 'countdown', 'question', 'shape']) {
    assert.ok(kinds.has(type), `Emergency Meeting has nothing for a ${type} layer`);
  }
  // A player's colour dot becomes a crewmate: a bean, a backpack and a visor, all CSS.
  const tablet = theme.objects.find((o) => o.id === 'em-players');
  assert.ok(tablet.css.includes('[data-players="dot"]::before') && tablet.css.includes('[data-players="dot"]::after'), 'the crewmate has no backpack or visor');
  // Somebody out keeps their card, greyed and stamped, rather than half-vanishing.
  assert.ok(/\[data-players-state="ejected"\][^{]*\{[^}]*opacity: 1 !important/.test(tablet.css), 'an ejected player still fades away');
  // No picture of the game's: everything is drawn.
  for (const look of theme.objects) assert.ok(!/url\(/.test(look.css), `${look.id} pulls in an image`);
  // The alert motions leave the alert's own exit alone.
  for (const m of theme.objects.filter((o) => o.kind === 'motion' && o.layerType === 'alert')) {
    assert.ok(!/(^|\n):scope \{[^}]*animation/.test(m.css), `${m.id} takes over the alert and its exit with it`);
  }
  const styles = fs.readFileSync(new URL('../../web/styles.css', SCRIPT_URL), 'utf8');
  assert.ok(styles.includes("@fontsource/baloo-2/800.css"), 'the rounded face the theme is set in is not bundled');
});
// public-edition: end

test('a text layer can say how many players are in, and the lobby has what it needs', () => {
  const state = { players: { items: [{ state: 'in' }, { state: 'in' }, { state: 'out' }] } };
  assert.equal(fillTemplate('{playersIn}/{playersTotal} crewmates', state), '2/3 crewmates');
  assert.ok(OVERLAY_VARS.some((v) => v.name === 'playersIn') && OVERLAY_VARS.some((v) => v.name === 'playersTotal'));
  // The canvas hands the text layer the list, or the counts could never be filled.
  const stage = fs.readFileSync(new URL('../../web/components/CanvasStage.tsx', SCRIPT_URL), 'utf8');
  assert.ok(stage.includes('players: (system.data as any).players,'), 'a text layer is not given the players list');
  // public-edition: leave out
  const theme = CSS_LOOKS.find((l) => l.id === 'emergency');
  for (const id of ['em-monitor', 'em-crewmate', 'em-spotify', 'em-drift']) assert.ok(theme.objects.some((o) => o.id === id), `${id} is missing`);
  // The monitor is hollow: the camera under it has to show through.
  assert.ok(theme.objects.find((o) => o.id === 'em-monitor').css.includes('background: transparent !important'), 'the monitor covers the camera');
  // public-edition: end
});

test('the filter offers only kinds the library has something for', () => {
  // A filter with nothing behind it is a dead end somebody has to try.
  for (const kind of PRESET_LAYER_TYPES) {
    assert.ok(ALL_PRESETS.some((p) => p.layerType === kind), `nothing is a ${kind}`);
  }
});

// public-edition: leave out
test('Found Footage has a look for every kind of layer, in both of its styles', () => {
  const theme = CSS_LOOKS.find((l) => l.id === 'footage');
  assert.ok(theme, 'there is no Found Footage theme');
  assert.equal(theme.name, 'Found Footage');
  const kinds = new Set(theme.objects.map((o) => (o.layerType === 'alert' ? 'alerts' : o.layerType)));
  for (const type of LAYER_TYPES.filter((t) => !NOT_YET_DRESSED.includes(t))) assert.ok(kinds.has(type), `Found Footage has nothing for a ${type} layer`);
  assert.ok(theme.objects.some((o) => o.previewTall && o.css.includes('[data-tallbar="bar"]')), 'there is no Found Footage look for a tall bar');
  // Both styles where they differ: the camcorder and the security camera each have a frame, an alert and a countdown.
  for (const id of ['ff-viewfinder', 'ff-cctv', 'ff-rec-alert', 'ff-motion', 'ff-night-card', 'ff-standby']) {
    assert.ok(theme.objects.some((o) => o.id === id), `${id} is missing`);
  }
  // The frames are hollow — the camera under them has to show through — and their clocks run on registered integers.
  for (const id of ['ff-viewfinder', 'ff-cctv']) {
    const css = theme.objects.find((o) => o.id === id).css;
    assert.ok(css.includes('@property --ffs { syntax: "<integer>"') && css.includes('counter(ffs, decimal-leading-zero)'), `${id} has no running clock`);
    assert.ok(!/\bvar\(--osd\) !important;|background: #[0-9a-f]{6} !important/.test(css), `${id} paints over the camera`);
  }
  // Nothing blinks faster than once a second: every blink here is a 1s step or slower.
  for (const look of theme.objects) {
    for (const m of look.css.matchAll(/animation: (ffBlink|ffRec|ffAlarm|ffFwd) ([\d.]+)s/g)) {
      assert.ok(Number(m[2]) >= 1, `${look.id} blinks every ${m[2]}s`);
    }
  }
  // The EMF meter's colours stay put on the meter as it fills, which the goal makes possible.
  const bar = fs.readFileSync(new URL('../../web/components/GoalBar.tsx', SCRIPT_URL), 'utf8');
  assert.ok(bar.includes("['--goal-pct' as any]"), 'the goal does not say how full it is to a stylesheet');
  assert.ok(theme.objects.find((o) => o.id === 'ff-emf').css.includes('var(--goal-pct, 100)'));
  // Both its fonts bundled — declared for every weight, in one-weight-fonts.css, so neither is ever given a faked bold.
  const styles = fs.readFileSync(new URL('../../web/styles.css', SCRIPT_URL), 'utf8');
  const oneWeight = fs.readFileSync(new URL('../../web/one-weight-fonts.css', SCRIPT_URL), 'utf8');
  assert.ok(styles.includes("@import './one-weight-fonts.css';"), 'its fonts are not bundled');
  for (const family of ["'Special Elite'", "'VT323'"]) assert.ok(oneWeight.includes(`font-family: ${family};`), `${family} is not bundled`);
});
// public-edition: end

// public-edition: leave out
test('Mania Menu dresses every kind of layer, the ones still waiting elsewhere too', () => {
  /*
    Made for a casual stream, so it covers everything a casual stream puts on
    screen — the players list, the poll, the call, the avatar and the rest
    that the other themes have not reached yet — and only the OBS source's
    slot, which draws nothing, is left out.
  */
  const theme = CSS_LOOKS.find((l) => l.id === 'mania');
  assert.ok(theme, 'there is no Mania Menu theme');
  assert.equal(theme.name, 'Mania Menu');
  const kinds = new Set(theme.objects.map((o) => (o.layerType === 'alert' ? 'alerts' : o.layerType)));
  for (const type of LAYER_TYPES.filter((t) => !NEVER_DRESSED.includes(t))) assert.ok(kinds.has(type), `Mania Menu has nothing for a ${type} layer`);
  assert.ok(theme.objects.some((o) => o.previewTall && o.css.includes('[data-tallbar="bar"]')), 'there is no Mania Menu look for a tall bar');
  // Drawn, not copied: no picture of the game's in any of it.
  for (const look of theme.objects) assert.ok(!/url\(/.test(look.css), `${look.id} pulls in an image`);
  // The backdrop can be cut open where a source goes, or it would cover the game under the overlay.
  const backdrop = theme.objects.find((o) => o.id === 'mm-backdrop').css;
  for (const field of ['--hole-x', '--hole-y', '--hole-w', '--hole-h']) assert.ok(backdrop.includes(`${field}: 0px;`), `the backdrop has no ${field} field, or it is not shut by default`);
  assert.ok(backdrop.includes('-webkit-mask-composite: xor;') && backdrop.includes('mask-composite: exclude;'), 'the hole is not cut for both the older browser OBS carries and a newer one');
  // A window with no slant keeps its right side, for a game that must not be cut.
  assert.ok(theme.objects.find((o) => o.id === 'mm-window').css.includes('right top / var(--thick) 100% no-repeat !important;'), 'a window with no slant has no right side');
  // The alert motion leaves the alert itself, and with it the built-in exit, alone.
  for (const m of theme.objects.filter((o) => o.kind === 'motion' && o.layerType === 'alert')) {
    assert.ok(!/(^|\n):scope \{[^}]*animation/.test(m.css), `${m.id} takes over the alert and its exit with it`);
  }
  // The title card puts the name's bar under the message, wherever the template has it.
  assert.ok(/\[data-alert="name"\] \{[^}]*order: 2;/.test(theme.objects.find((o) => o.id === 'mm-titlecard').css), 'the name is not moved under the message');
  // Nothing blinks faster than once a second.
  for (const look of theme.objects) {
    for (const m of look.css.matchAll(/animation: mm(Held|Level|Win) ([\d.]+)s/g)) assert.ok(Number(m[2]) >= 1, `${look.id} blinks every ${m[2]}s`);
  }
  // Its one face is bundled.
  const styles = fs.readFileSync(new URL('../../web/styles.css', SCRIPT_URL), 'utf8');
  assert.ok(styles.includes("@fontsource/pixelify-sans/700.css"), 'the pixel face the theme is set in is not bundled');
});
// public-edition: end

test('a whole look is never dropped across every shape at once', () => {
  /*
    A layout holds many shapes and each is a different piece of the build — a
    wall, a frame, a divider. One stylesheet written across all of them would
    destroy the rest, so shapes are copy-only.
  */
  assert.equal(canApplyInBulk('shape'), false);
  for (const kind of ['omnibar', 'runcard', 'nameplate', 'countdown', 'viewers']) {
    assert.equal(canApplyInBulk(kind), true, kind);
  }
  const view = fs.readFileSync(new URL('../../web/components/views/LibraryView.tsx', SCRIPT_URL), 'utf8');
  assert.ok(view.includes('!canApplyInBulk(object.layerType)'),
    'the library can apply a stylesheet across every shape in a layout');
});

test('the library draws each preset with the component that will draw it', () => {
  /*
    A picture of a preset is a second thing to keep in step with the preset.
    Rendering the real component through the real canvas cannot drift, because
    it is the preset.
  */
  const view = fs.readFileSync(new URL('../../web/components/views/LibraryView.tsx', SCRIPT_URL), 'utf8');
  const preview = view.slice(view.indexOf('const Preview ='), view.indexOf('export const LibraryView'));
  assert.ok(preview.includes('<CanvasStage'), 'the previews are no longer the real thing');
  assert.ok(preview.includes('object.css') && preview.includes('motionCss:'),
    'the preview layer is drawn without the preset, or ignores its motion');
});

test('the layer panel no longer carries its own copy of the library', () => {
  // Two places offering presets is two places to keep in step, and the one in
  // the panel could only ever show names.
  const panel = fs.readFileSync(new URL('../../web/components/LayerCssPanel.tsx', SCRIPT_URL), 'utf8');
  assert.ok(!panel.includes('css-presets'), 'the panel still lists presets of its own');
});



test('the two lists of repeatable kinds agree in both directions', () => {
  /*
    The old check only walked from the server to the editor, so a kind the
    editor offered repeats of while the server dropped them passed. That is
    what happened to the run card: a second one could be placed and vanished
    on save, with nothing said.
  */
  const src = fs.readFileSync(new URL('../../web/components/views/LayoutsView.tsx', SCRIPT_URL), 'utf8');
  const server = fs.readFileSync(new URL('../engine/layouts.js', SCRIPT_URL), 'utf8');
  const line = server.split(String.fromCharCode(10)).find((l) => l.startsWith('const REPEATABLE'));
  const allowed = line.split(String.fromCharCode(39)).filter((_, i) => i % 2 === 1);

  for (const kind of src.split(String.fromCharCode(10))) {
    if (!kind.includes('repeatable: true')) continue;
    const name = kind.split(String.fromCharCode(39))[1];
    assert.ok(allowed.includes(name),
      `the editor offers repeats of ${name}, but the server drops them on save`);
  }
});

test('every preset closes what it opens, so nothing in it leaves its layer', () => {
  /*
    A stylesheet is written inside the layer's @scope. One closing brace too
    many ends that @scope early: whatever follows — the rest of the preset,
    and the values its fields are set to, which are written after it — lands
    outside the layer and never reaches it. The Games Done Quick "Power on"
    motion had exactly that, and its timing fields did nothing.
  */
  for (const preset of ALL_PRESETS) {
    const css = preset.css.replace(/\/\*[\s\S]*?\*\//g, '');
    let depth = 0;
    for (const c of css) {
      if (c === '{') depth += 1;
      if (c === '}') {
        depth -= 1;
        assert.ok(depth >= 0, `${preset.id} closes a brace it never opened, ending its layer's @scope early`);
      }
    }
    assert.equal(depth, 0, `${preset.id} leaves a brace open`);
  }
});

test('the one-weight fonts are declared for every weight, so no look gets a faked bold', () => {
  /*
    VT323 and Special Elite come in one weight. Declared at 400 alone, any
    bold asked of them — and components' headings ask — was a bold the browser
    made up by smearing the letters, which on the pixel font breaks its steps.
    Measured in the Library: about twenty Cyberpunky and Found Footage looks.
  */
  const styles = fs.readFileSync(new URL('../../web/styles.css', SCRIPT_URL), 'utf8');
  const fonts = fs.readFileSync(new URL('../../web/one-weight-fonts.css', SCRIPT_URL), 'utf8');
  assert.ok(styles.includes("@import './one-weight-fonts.css';"), 'the fonts declared for every weight are not loaded');
  for (const pkg of ['vt323', 'special-elite']) {
    assert.ok(!styles.includes(`@fontsource/${pkg}/400.css`), `${pkg} is still declared at 400 alone, beside the declaration for every weight`);
    // Every character range the package has, each with its files, declared for the whole range of weights.
    const packaged = fs.readFileSync(new URL(`../../web/node_modules/@fontsource/${pkg}/400.css`, SCRIPT_URL), 'utf8');
    const ranges = [...packaged.matchAll(/unicode-range:\s*([^;]+);/g)].map((m) => m[1]);
    assert.ok(ranges.length >= 2, `${pkg}: its package declares ${ranges.length} ranges`);
    for (const range of ranges) assert.ok(fonts.includes(`unicode-range: ${range};`), `${pkg}: the range ${range.slice(0, 30)}… is missing, so those characters would fall back to another font`);
    for (const file of [...fonts.matchAll(new RegExp(`url\\(\\./(node_modules/@fontsource/${pkg}/files/[^)]+)\\)`, 'g'))].map((m) => m[1])) {
      assert.ok(fs.existsSync(new URL(`../../web/${file}`, SCRIPT_URL)), `${file} does not exist`);
    }
  }
  const faces = fonts.split('@font-face').slice(1);
  assert.equal(faces.length, 5, 'VT323 has three ranges and Special Elite two');
  for (const face of faces) assert.ok(face.includes('font-weight: 100 900;'), 'a face is declared for fewer than every weight');
});

// ------------------------------------------------------ applying, safely, a theme at a time

const apply = await import('../../../shared/theme-apply.js');
const presetById = (id) => ALL_PRESETS.find((p) => p.id === id);
const themeById = (id) => CSS_LOOKS.find((l) => l.id === id);
const sampleLayout = () => ({ id: 'main', name: 'Main', layers: [
  { uid: 'o1', type: 'omnibar', config: {} },
  { uid: 'o2', type: 'omnibar', config: { bar: 'tall1' } },
  { uid: 's1', type: 'shape', css: ':scope { background: red; }' },
  { uid: 's2', type: 'shape' },
  { uid: 'c1', type: 'chat' },
  { uid: 'a1', type: 'alerts' },
  { uid: 't1', type: 'text', css: ':scope { color: red; }' },
  { uid: 'n1', type: 'nameplate', motionCss: presetById('cyber-row-draw').css },
  { uid: 'n2', type: 'nameplate', motionCss: ':scope { animation: mine 1s; }' },
  { uid: 'p1', type: 'poll' },
] });
const TALL = [{ id: 'tall1', kind: 'tall' }];

test('a whole theme dresses every layer it has a look for, and never a shape', () => {
  for (const theme of CSS_LOOKS) {
    const { changes, left } = apply.themePlan(theme, sampleLayout(), { omnibars: TALL });
    assert.ok(!changes.some((c) => c.uid === 's1' || c.uid === 's2'), `${theme.id} writes on a shape`);
    assert.deepEqual(left.find((l) => l.why === 'shape'), { kind: 'shape', why: 'shape', count: 2 }, `${theme.id} does not say it left the shapes`);
    // The alerts layer plays what every layout shares: never written on from a layout.
    assert.ok(!changes.some((c) => c.uid === 'a1'), `${theme.id} writes on the alerts layer`);
    // The chat is a layer like the rest: a theme with a chat look dresses it, and turns it to the theme that reads one.
    const chatLook = ALL_PRESETS.find((p) => p.lookId === theme.id && p.layerType === 'chat' && p.kind !== 'motion');
    const onChat = changes.filter((c) => c.uid === 'c1');
    if (chatLook) {
      assert.equal(onChat.find((c) => c.field === 'css')?.to, chatLook.css, `${theme.id} leaves the chat undressed`);
      assert.equal(onChat.find((c) => c.field === 'chatTheme')?.to, 'custom', `${theme.id} dresses the chat in a theme that ignores it`);
    } else {
      assert.ok(!onChat.some((c) => c.field !== 'motionCss'), `${theme.id} has no chat look but writes one`);
    }
    for (const c of changes) {
      if (c.to === '' || c.field === 'chatTheme') continue;
      const piece = ALL_PRESETS.find((p) => p.css === c.to);
      assert.ok(piece && piece.lookId === theme.id, `${theme.id} puts ${piece?.id || 'something'} on ${c.uid}, which is not its own`);
    }
  }
  // public-edition: leave out
  const marathon = apply.themePlan(themeById('marathon'), sampleLayout(), { omnibars: TALL });
  const look = (uid) => marathon.changes.find((c) => c.uid === uid && c.field === 'css')?.piece;
  // The bar look on a bar, the tall-bar look on a tall bar.
  assert.equal(look('o1'), 'Ticker');
  assert.equal(look('o2'), 'Tall bar');
  assert.equal(look('t1'), 'Section label');
  // Every theme dresses the poll now; a set of pieces with nothing for it says so.
  assert.ok(marathon.changes.some((c) => c.field === 'css' && c.piece === 'Poll'), 'Marathon leaves the poll undressed');
  const pieces = apply.themePlan(themeById('starting'), sampleLayout(), { omnibars: TALL });
  assert.ok(pieces.left.some((l) => l.kind === 'poll' && l.why === 'nothing'), 'a kind the theme has nothing for is not said');
  // A theme with no tall-bar look leaves a tall bar alone rather than drawing a bar look on it.
  // Every theme has one now, so one is taken away for this.
  const withoutTall = { ...themeById('emergency'), objects: themeById('emergency').objects.filter((o) => !o.previewTall) };
  const emergency = apply.themePlan(withoutTall, sampleLayout(), { omnibars: TALL });
  assert.ok(!emergency.changes.some((c) => c.uid === 'o2'));
  assert.ok(emergency.left.some((l) => l.kind === 'omnibar' && l.why === 'nothing'));
  // Themes that are only shapes offer no whole-theme apply at all.
  assert.ok(!apply.themesToApply().some((th) => th.id === 'blocks'), 'Building blocks offers to apply its shapes');
  assert.ok(apply.themesToApply().some((th) => th.id === 'marathon'));
  // public-edition: end
});

// public-edition: leave out
test('a theme\'s motions go with the looks they were made for, and another theme\'s come off', () => {
  const marathon = apply.themePlan(themeById('marathon'), sampleLayout(), { omnibars: TALL });
  const motion = (uid) => marathon.changes.find((c) => c.uid === uid && c.field === 'motionCss');
  assert.equal(motion('o1')?.piece, 'Draw in', 'the bar does not get the motion made for it');
  assert.equal(motion('o2'), undefined, 'the tall bar gets a motion made for the plain bar');
  // Cyberpunky's row draw, on a nameplate now wearing Marathon's: replaced by Marathon's own.
  assert.equal(motion('n1')?.piece, 'Wipe in');
  // "Power on" was made for Games Done Quick's steady plate, not the one it leads with — so it is not put on, and another theme's comes off.
  const rack = apply.themePlan(themeById('rack'), sampleLayout(), { omnibars: TALL });
  const off = rack.changes.find((c) => c.uid === 'n1' && c.field === 'motionCss');
  assert.ok(off && off.to === '' && off.piece === null, 'another theme\'s motion is left on a look it does not fit');
  // A motion written by hand stays, whatever the theme.
  for (const theme of CSS_LOOKS) {
    const { changes } = apply.themePlan(theme, sampleLayout(), { omnibars: TALL });
    const mine = changes.find((c) => c.uid === 'n2' && c.field === 'motionCss');
    assert.ok(!mine || mine.to !== '', `${theme.id} takes off a motion somebody wrote`);
  }
  // Without motion, no motion is touched.
  assert.ok(!apply.themePlan(themeById('marathon'), sampleLayout(), { omnibars: TALL, motion: false }).changes.some((c) => c.field === 'motionCss'));
});
// public-edition: end

// public-edition: leave out
test('applying keeps what it replaced, and undoing leaves alone anything changed since', () => {
  const layout = sampleLayout();
  const { changes } = apply.themePlan(themeById('marathon'), layout, { omnibars: TALL });
  const done = apply.withChanges(layout, changes, 'to');
  const same = (a, b) => (a || '') === (b || '');
  for (const c of changes) assert.ok(same(apply.fieldOf(done.layers.find((l) => l.uid === c.uid), c.field), c.to));
  // A chat layer's look is written into its settings, beside the rest of what decides how it draws.
  const chatDone = done.layers.find((l) => l.uid === 'c1');
  assert.equal(chatDone.config?.css, presetById('marathon-chat').css, 'the chat look is not in the chat\'s settings');
  assert.equal(chatDone.config?.chatTheme, 'custom');
  assert.equal(chatDone.css, undefined, 'the chat look went in the layer\'s own box, which the chat does not read it from');
  // Somebody edits one layer after applying; the undo takes back the rest and leaves theirs.
  const edited = { ...done, layers: done.layers.map((l) => (l.uid === 't1' ? { ...l, css: ':scope { color: blue; }' } : l)) };
  assert.equal(apply.stillApplied(edited, changes), changes.length - 1);
  const undone = apply.withChanges(edited, changes, 'from');
  for (const layer of layout.layers) {
    const back = undone.layers.find((l) => l.uid === layer.uid);
    if (layer.uid === 't1') { assert.equal(back.css, ':scope { color: blue; }', 'the undo took away a later edit'); continue; }
    for (const field of ['css', 'motionCss']) assert.ok(same(back[field], layer[field]), `${layer.uid}.${field} is not put back`);
  }
  // The chat's settings too, its theme included.
  const chatBack = undone.layers.find((l) => l.uid === 'c1').config || {};
  assert.deepEqual([chatBack.css || '', chatBack.motionCss || '', chatBack.chatTheme || ''], ['', '', ''], 'the chat is not put back');
  // Written by hand, as against something from the library.
  assert.ok(apply.isOwnCss(':scope { color: red; }'));
  assert.ok(!apply.isOwnCss(presetById('marathon-omnibar').css));
  assert.ok(!apply.isOwnCss('') && !apply.isOwnCss('   '));
  // The text layer's own look, and the nameplate's own motion, which Marathon has a motion of its own for.
  assert.equal(apply.replacesOwn(changes), 2, 'a stylesheet written by hand is not counted as replaced');
});
// public-edition: end

// public-edition: leave out
test('one piece goes on the layers it was drawn for, and says when it would replace your own', () => {
  const layout = sampleLayout();
  // A bar look on the bar only, a tall-bar look on the tall bar only.
  assert.deepEqual(apply.pieceTargets(presetById('marathon-omnibar'), layout, TALL).map((l) => l.uid), ['o1']);
  assert.deepEqual(apply.pieceTargets(presetById('marathon-tallbar'), layout, TALL).map((l) => l.uid), ['o2']);
  // A motion for the bar kind goes on every bar, as before.
  assert.deepEqual(apply.pieceTargets(presetById('motion-ticker-draw'), layout, TALL).map((l) => l.uid), ['o1', 'o2']);
  // Never a shape, and never an alert, which is not a layer.
  assert.deepEqual(apply.pieceTargets(presetById('block-frame') || ALL_PRESETS.find((p) => p.layerType === 'shape'), layout, TALL), []);
  assert.deepEqual(apply.pieceTargets(presetById('marathon-alert'), layout, TALL), []);
  const onText = apply.piecePlan(presetById('marathon-label'), layout, TALL);
  assert.equal(apply.replacesOwn(onText), 1);
  // Nothing to write where it is on already.
  const worn = apply.withChanges(layout, onText, 'to');
  assert.deepEqual(apply.piecePlan(presetById('marathon-label'), worn, TALL), []);

  // The chat's look goes on the chat layer, in its settings, with its theme turned to the one that reads it.
  assert.deepEqual(apply.pieceTargets(presetById('marathon-chat'), layout, TALL).map((l) => l.uid), ['c1']);
  const mine = { ...layout, layers: layout.layers.map((l) => (l.uid === 'c1' ? { ...l, config: { chatTheme: 'modern', css: ':scope { color: red; }' } } : l)) };
  const onChat = apply.piecePlan(presetById('marathon-chat'), mine, TALL);
  assert.deepEqual(onChat.map((c) => [c.field, c.from, c.to]), [
    ['css', ':scope { color: red; }', presetById('marathon-chat').css],
    ['chatTheme', 'modern', 'custom'],
  ]);
  // The theme switch beside it is not a stylesheet, so it is not counted as replacing one.
  assert.equal(apply.replacesOwn(onChat), 1, 'the chat\'s own stylesheet is not flagged, or its theme is counted as one');
  const chatWorn = apply.withChanges(mine, onChat, 'to');
  assert.deepEqual(apply.piecePlan(presetById('marathon-chat'), chatWorn, TALL), [], 'a chat already wearing it is rewritten');
  // A motion for the chat lands in its settings' motion box, and leaves its look alone.
  const moved = apply.withChanges(chatWorn, apply.piecePlan(presetById('motion-chat-draw'), chatWorn, TALL), 'to');
  assert.equal(moved.layers.find((l) => l.uid === 'c1').config.motionCss, presetById('motion-chat-draw').css);
  assert.equal(moved.layers.find((l) => l.uid === 'c1').config.css, presetById('marathon-chat').css);
});
// public-edition: end

// public-edition: leave out
test('the alerts take a theme only when asked, and keep what they had', () => {
  // The chat is not among them any more: it is a layer, dressed with the rest of its layout (above).
  assert.ok(!('chatPlan' in apply), 'the chat is planned apart from its layout again');
  const alerts = [{ id: 'a', name: 'Follow', css: '' }, { id: 'b', name: 'Sub', css: ':scope { color: red; }' }, { id: 'c', name: 'Raid', css: presetById('marathon-alert').css, motionCss: presetById('motion-alert-flicker').css }];
  const plan = apply.alertPlan(themeById('marathon'), alerts);
  assert.deepEqual(plan.changes.map((c) => c.id), ['a', 'b'], 'an alert already wearing it is rewritten, or one is missed');
  assert.equal(plan.own, 1);
  assert.deepEqual(plan.changes[1].before, { css: ':scope { color: red; }', motionCss: '' });

  // The screen: asks before replacing your own, shows a theme's plan first, and offers the way back.
  const view = fs.readFileSync(new URL('../../web/components/views/LibraryView.tsx', SCRIPT_URL), 'utf8');
  assert.ok(view.includes('if (ownFor(object)) { setConfirming(object.id); return; }'), 'a piece replaces your own stylesheet without asking');
  assert.ok(view.includes('data-library="theme-plan"') && view.includes('onClick={applyTheme}'), 'a theme is applied without its plan shown first');
  assert.ok(view.includes('data-library="undo-bar"') && view.includes('onClick={runUndo}'), 'there is no way back from an apply');
  assert.ok(view.includes('useState({ motion: true, alerts: false })'), 'the alerts, shared by every layout, are changed without being asked');
  // A chat piece takes the same road as any layer's: its plan, its undo, its question before replacing your own.
  assert.ok(!view.includes('setChatStyle'), 'the Library writes a chat look somewhere other than the chat layer');
  assert.ok(view.includes("if (c.field === 'chatTheme') continue;"), 'the theme plan lists turning the chat to Custom as a look of its own');
  const strings = fs.readFileSync(new URL('../../web/constants.ts', SCRIPT_URL), 'utf8');
  for (const key of ['libraryApplyTheme', 'libraryThemePlanTitle', 'libraryLeftShapes', 'libraryOptAlerts', 'libraryReplacesLayers', 'libraryUndo', 'libraryReplace']) {
    assert.equal(strings.split(`    ${key}:`).length - 1, 2, `${key} is not in both languages`);
  }
});
// public-edition: end

const { liveLayout } = await import('../../../shared/live-layout.js');

test('the Library aims at the layout on stream, by the same rule the canvas draws it by', () => {
  const a = { id: 'a', scenes: [] }, b = { id: 'b', scenes: ['Just chatting'] }, c = { id: 'c', scenes: ['Gameplay'] };
  // The one bound to the live scene.
  assert.equal(liveLayout([a, b, c], 'Gameplay'), c);
  // A scene nobody bound, once anybody binds: nothing is on stream.
  assert.equal(liveLayout([a, b, c], 'BRB'), null);
  // Nobody binds at all: the first, as a source set up before binding keeps showing.
  assert.equal(liveLayout([{ id: 'x' }, { id: 'y' }], 'Anything').id, 'x');
  assert.equal(liveLayout([{ id: 'x' }, { id: 'y' }], '').id, 'x');
  assert.equal(liveLayout([], 'Gameplay'), null);
  assert.equal(liveLayout(undefined, ''), null);

  // One rule, used by both: the canvas, and the Library's "Apply to".
  const app = fs.readFileSync(new URL('../../web/App.tsx', SCRIPT_URL), 'utf8');
  assert.ok(app.includes(': liveLayout(layouts, currentScene, omni);'), 'the canvas picks its layout by a rule of its own');
  const view = fs.readFileSync(new URL('../../web/components/views/LibraryView.tsx', SCRIPT_URL), 'utf8');
  assert.ok(view.includes("const live = liveLayout(layouts, system?.connections?.obsData?.currentScene || '', (system?.data as any)?.omnilayer);"));
  // Following what is on stream until somebody chooses, and saying which that is.
  assert.ok(view.includes("const [target, setTarget] = useState<string>('');"), 'the Library still starts on the first layout');
  assert.ok(view.includes('const layout = layouts.find((l) => l.id === target) || live || layouts[0];'));
  assert.ok(view.includes("{l.name}{live && l.id === live.id ? ` · ${t.libraryLiveNow || 'on stream now'}` : ''}"), 'the layout on stream is not marked');
});

test('a piece with nowhere to go says why beside its button, not only when hovered', () => {
  const view = fs.readFileSync(new URL('../../web/components/views/LibraryView.tsx', SCRIPT_URL), 'utf8');
  assert.ok(view.includes('{bulk && !count && (') && view.includes('data-library="apply-why">{whyNot(object)}</span>'), 'a greyed-out Apply does not say why');
  // Said precisely: no layer of the kind, or bars there but all of the other shape, or nothing to apply to at all.
  for (const said of ["'No {kind} layer in {layout}'", "'No omnibar in {layout} shows a tall bar'", "'Every omnibar in {layout} shows a tall bar'", "'Make a layout first, on the Overlays screen'"]) {
    assert.ok(view.includes(said), `the reason ${said} is never given`);
  }
  // The tooltip and the words beside the button are the same reason.
  assert.ok(view.includes(': whyNot(object)}'), 'the tooltip gives a different reason');
});

test('the alert list beside "Apply to" is named, and each list is its label\'s', () => {
  const view = fs.readFileSync(new URL('../../web/components/views/LibraryView.tsx', SCRIPT_URL), 'utf8');
  const alertList = view.slice(view.indexOf("{t.libraryAlertTo || 'Alert pieces go on'}") - 400, view.indexOf('data-library="alert-to"'));
  assert.ok(alertList.includes('<label className="flex items-center gap-2">'), 'the alert list has no label of its own');
  const layoutList = view.slice(view.indexOf("{t.libraryApplyTo || 'Apply to'}") - 400, view.indexOf('data-library="apply-to"'));
  assert.ok(layoutList.includes('<label className="flex items-center gap-2">'), 'the layout list is not inside its label');
});

// public-edition: leave out
test('a preview is the shape of its piece, whole, and seen against what it is about', () => {
  const view = fs.readFileSync(new URL('../../web/components/views/LibraryView.tsx', SCRIPT_URL), 'utf8');
  // The box follows the piece, held between a strip and a panel, so a tall piece is not shrunk past reading.
  assert.ok(view.includes('...(height ? { height } : { aspectRatio: `${size.width} / ${size.height}`, minHeight: 110, maxHeight: 240 }),'), 'every preview is still one height');
  // A chat is as tall as its messages, so none is cut off at the top.
  assert.ok(view.includes("style={{ backgroundColor: '#0b0b0e', ...(height ? { height } : { minHeight: 150 }) }}"), 'a chat preview still cuts off its first message');
  // Pieces about what is behind them are shown over something.
  assert.ok(view.includes('...(object.previewOver ? [{') && view.includes('config: { sources: [SAMPLE_SCENE], fit: \'cover\' }'), 'nothing is drawn behind a piece that needs it');
  for (const id of ['block-glass', 'block-scanlines', 'block-notched']) assert.equal(presetById(id).previewOver, true, `${id} is shown over nothing`);
  // Drawn at the shape they were drawn for, not stretched across a wide box.
  const crewmate = presetById('em-crewmate').previewSize;
  assert.ok(crewmate && crewmate.height > crewmate.width, 'the crewmate is shown in a wide box');
  const button = presetById('em-button').previewSize;
  assert.ok(button && button.height === button.width, 'the round button is shown in a box that is not square');
});
// public-edition: end
