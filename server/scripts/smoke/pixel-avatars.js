/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Smoke tests: pixel avatars made in the app (shared/pixel-avatars.js) —
 * first of all that the examples, the built-in avatar and the regulars
 * converted to its format, are drawn exactly as shared/avatar.js draws the
 * originals: the same pixels for every face, outfit, hat, extra, glance and
 * frame, the same colours, the same breathing split. That is what makes
 * the format able to hold everything the built-in one does.
 *
 * Runs in order with the other feature files, through scripts/smoke.js.
 */

import { SCRIPT_URL, assert, fs, test } from './harness.js';

const avatar = await import('../../../shared/avatar.js');
const art = await import('../../../shared/avatar-art.js');
const pixel = await import('../../../shared/pixel-avatars.js');
const examples = await import('../../../shared/pixel-avatar-examples.js');
const { PLAYER_COLOURS } = await import('../../../shared/players.js');

// public-edition: leave out
const sim = examples.simonsaysExample();
// public-edition: end
const OUTFITS = avatar.AVATAR_COSTUMES_LIST;
const FACES = ['neutral', ...Object.keys(art.AVATAR_EXPRESSIONS)];
const LOOKS = Object.keys(avatar.AVATAR_LOOKS);

/** Every way the two could differ, gathered, so one failure names them all rather than the first. */
function compare(label, cases, built, made) {
  const wrong = [];
  for (const c of cases) {
    const a = JSON.stringify(built(c));
    const b = JSON.stringify(made(c));
    if (a !== b) wrong.push(JSON.stringify(c));
  }
  assert.equal(wrong.length, 0, `${label}: ${wrong.length} of ${cases.length} differ, e.g. ${wrong.slice(0, 3).join(' | ')}`);
  return cases.length;
}

// ------------------------------------------------- the example is the original

// public-edition: leave out
test('the SimonSays example has every face, extra, hat, outfit and action the built-in avatar has', () => {
  assert.deepEqual(sim.faces.map((f) => f.name).sort(), Object.keys(art.AVATAR_EXPRESSIONS).sort());
  assert.deepEqual(sim.extras.map((e) => e.name), avatar.AVATAR_EXTRAS_LIST);
  assert.deepEqual(pixel.pixelHats(sim), avatar.AVATAR_HATS);
  assert.deepEqual(['', ...sim.outfits.map((o) => o.name)], OUTFITS);
  assert.deepEqual(sim.actions.map((a) => a.name), avatar.AVATAR_ACTIONS_LIST);
  assert.deepEqual(sim.parts.map((p) => p.char), avatar.AVATAR_PARTS.map((p) => p.char));
  assert.deepEqual(sim.base, art.AVATAR_BASE);
});
// public-edition: end

// public-edition: leave out
test('every face, in every outfit, is drawn exactly as the built-in avatar draws it', () => {
  const cases = [];
  for (const outfit of OUTFITS) for (const face of FACES) cases.push({ outfit, faces: [face] });
  // Faces stack: talking and blinking over every face, as the living avatar asks for them.
  for (const outfit of OUTFITS) for (const face of FACES) for (const over of [['talking'], ['talking-soft'], ['talking-loud'], ['blink'], ['talking', 'blink'], ['talking-loud', 'blink']]) cases.push({ outfit, faces: [face, ...over] });
  const n = compare('faces', cases, (c) => avatar.avatarGrid(c.faces, [], c.outfit), (c) => pixel.pixelGrid(sim, { faces: c.faces, outfit: c.outfit }));
  assert.ok(n > 500);
});
// public-edition: end

// public-edition: leave out
test('every extra and hat, alone and together, in every outfit, is drawn as the built-in avatar draws it', () => {
  const cases = [];
  const extras = avatar.AVATAR_EXTRAS_LIST;
  for (const outfit of OUTFITS) {
    for (const e of extras) for (const face of ['neutral', 'sad', 'angry', 'sleepy']) cases.push({ outfit, faces: [face], extras: [e] });
    // Everything at once, and two hats (the last one asked for wins), in both orders.
    cases.push({ outfit, faces: ['neutral'], extras: ['blush', 'sweat', 'mic', 'crown'] });
    cases.push({ outfit, faces: ['angry'], extras: ['wizard-hat', 'party-hat', 'blush'] });
    cases.push({ outfit, faces: ['happy'], extras: ['party-hat', 'wizard-hat'] });
    cases.push({ outfit, faces: ['neutral'], extras: ['not-a-thing', 'mic'] });
  }
  compare('extras', cases, (c) => avatar.avatarGrid(c.faces, c.extras, c.outfit), (c) => pixel.pixelGrid(sim, { faces: c.faces, extras: c.extras, outfit: c.outfit }));
  compare('hat worn', cases, (c) => [avatar.avatarHatWorn(c.extras, c.outfit), avatar.avatarHatPaths(avatar.avatarHatWorn(c.extras, c.outfit))],
    (c) => [pixel.pixelHatWorn(sim, c.extras, c.outfit), pixel.pixelHatPaths(sim, pixel.pixelHatWorn(sim, c.extras, c.outfit))]);
  assert.equal(pixel.pixelHeadroom(sim), avatar.AVATAR_HEADROOM);
});
// public-edition: end

// public-edition: leave out
test('the eyes glance, twinkle and half-shut exactly as the built-in avatar\'s do, in every outfit', () => {
  const cases = [];
  for (const outfit of OUTFITS) {
    for (const faces of [['neutral'], ['neutral', 'talking'], ['sad'], ['neutral', 'blink'], ['neutral', 'talking-loud']]) {
      for (const look of LOOKS) for (const sparkle of ['normal', 'small', 'big']) for (const half of [false, true]) cases.push({ outfit, faces, eyes: { look, sparkle, half } });
    }
  }
  const n = compare('eyes', cases, (c) => avatar.avatarGrid(c.faces, ['blush'], c.outfit, c.eyes), (c) => pixel.pixelGrid(sim, { faces: c.faces, extras: ['blush'], outfit: c.outfit, eyes: c.eyes }));
  assert.ok(n > 1000);
});
// public-edition: end

// public-edition: leave out
test('every frame of drinking water, in every outfit, is the built-in avatar\'s frame', () => {
  const cases = [];
  for (const outfit of OUTFITS) {
    for (const name of avatar.AVATAR_ACTIONS_LIST) {
      const frames = avatar.avatarActionFrames(name, outfit) || [];
      for (let frame = 0; frame < frames.length + 1; frame += 1) cases.push({ outfit, faces: frames[frame]?.eyes === 'shut' ? ['neutral', 'blink'] : ['neutral'], action: { name, frame } });
    }
  }
  compare('actions', cases, (c) => avatar.avatarGrid(c.faces, ['santa-hat'], c.outfit, {}, c.action), (c) => pixel.pixelGrid(sim, { faces: c.faces, extras: ['santa-hat'], outfit: c.outfit, action: c.action }));
  for (const outfit of OUTFITS) {
    assert.deepEqual(pixel.pixelActionFrames(sim, 'drink', outfit), avatar.avatarActionFrames('drink', outfit));
    assert.equal(pixel.pixelActionMs(sim, 'drink', outfit), avatar.avatarActionMs('drink', outfit));
  }
});
// public-edition: end

// public-edition: leave out
test('it splits into head, body and what it carries where the built-in avatar does, and draws each part as the same path', () => {
  const cases = [];
  for (const outfit of OUTFITS) for (const face of ['neutral', 'dizzy', 'deep-sleep', 'startled']) cases.push({ outfit, faces: [face], extras: ['cowboy-hat', 'sweat'] });
  compare('split', cases, (c) => avatar.avatarSplit(avatar.avatarGrid(c.faces, c.extras, c.outfit)), (c) => pixel.pixelSplit(sim, pixel.pixelGrid(sim, c)));
  compare('paths', cases, (c) => avatar.avatarPaths(avatar.avatarGrid(c.faces, c.extras, c.outfit)), (c) => pixel.pixelPaths(sim, pixel.pixelGrid(sim, c)));
  compare('bubble', [0, 1, 2, 3, 4], (n) => avatar.avatarBubblePaths(n), (n) => pixel.pixelBubblePaths(sim, n));
});
// public-edition: end

// public-edition: leave out
test('it takes every colour exactly as the built-in avatar does', () => {
  const cases = [];
  for (const colouring of avatar.AVATAR_COLOURINGS) for (const accent of ['#f43f5e', '#22c55e', '#ffffff', '#000000', '#a56cae', '', 'nonsense']) cases.push({ colouring, accent, own: '#ffd24a' });
  assert.deepEqual(pixel.PIXEL_COLOURINGS, avatar.AVATAR_COLOURINGS);
  compare('colours', cases, (c) => avatar.avatarColours(c.colouring, c), (c) => pixel.pixelColours(sim, c.colouring, c));
  assert.ok(Object.keys(PLAYER_COLOURS).length > 5);
});
// public-edition: end

// public-edition: leave out
test('the faces the living avatar asks for are the same, blinks and all', () => {
  const cases = [];
  for (const expression of FACES) for (const reaction of [null, 'happy', 'dizzy']) for (const mouthOpen of [false, true]) for (const blinking of [false, true]) for (const voice of ['soft', 'normal', 'loud']) cases.push({ expression, reaction, mouthOpen, blinking, voice });
  compare('faces now', cases, (c) => avatar.avatarFacesNow(c), (c) => pixel.pixelFacesNow(sim, c));
});
// public-edition: end

// public-edition: leave out
test('the example written out as an SVG is the built-in avatar\'s SVG, bar its title', () => {
  const untitled = (svg) => svg.replace(/<title>.*<\/title>/, '');
  const cases = [];
  for (const outfit of OUTFITS) for (const extras of [[], ['crown'], ['party-hat', 'mic']]) cases.push({ outfit, extras, faces: ['happy'] });
  compare('svg', cases,
    (c) => untitled(avatar.avatarSvg({ expression: c.faces, extras: c.extras, costume: c.outfit, colours: avatar.avatarColours('red') })),
    (c) => untitled(pixel.pixelSvg(sim, { faces: c.faces, extras: c.extras, outfit: c.outfit, colours: pixel.pixelColours(sim, 'red') })));
});
// public-edition: end

// public-edition: leave out
test('viewers name the same outfits, hats and things to do on the example as on the built-in avatar', () => {
  const said = ['hoodie', 'mesero', 'el link', 'MEGAMAN', 'maid outfit', 'gorro de navidad', 'quitar', 'corona', 'pirata', 'gato', 'nothing at all', 'Mayordomo'];
  for (const words of said) {
    assert.equal(pixel.pixelDressName(sim, 'outfit', words), avatar.avatarDressName('outfit', words), `outfit for "${words}"`);
    assert.equal(pixel.pixelDressName(sim, 'hat', words), avatar.avatarDressName('hat', words), `hat for "${words}"`);
  }
  for (const words of ['agua', 'drink', 'Tomar agua', 'hidrátate', 'jump']) assert.equal(pixel.pixelActionName(sim, words), avatar.avatarActionName(words), `action for "${words}"`);
});
// public-edition: end

// public-edition: leave out
// --------------------------------------------- the regulars' own drawings

test('each regular\'s example is drawn exactly as the regular is, talking, blinking and turning', () => {
  for (const id of avatar.AVATAR_REGULARS_LIST) {
    const reg = examples.regularExample(id);
    const palette = avatar.AVATAR_REGULARS[id].palette;
    assert.equal(new Set(palette).size, palette.length, `${id}'s palette has a colour twice, so its paths cannot be compared by colour`);
    const colourOf = Object.fromEntries(reg.parts.map((p) => [p.char, p.color]));
    const byColour = (paths) => Object.fromEntries(Object.entries(paths).map(([part, d]) => [reg.parts.find((p) => p.id === part).color, d]));
    const cases = [];
    for (const talking of [false, true]) for (const lid of ['open', 'half', 'shut']) for (const facing of ['left', 'front', 'right']) cases.push({ talking, lid, facing });
    const asked = (c) => ({ faces: ['neutral', ...(c.talking ? ['talking-loud'] : []), ...(c.lid === 'shut' ? ['blink'] : [])], eyes: { half: c.lid === 'half' }, facing: c.facing });
    compare(`${id} rows`, cases,
      (c) => avatar.avatarRegularRows(id, c).slice(0, 100).map((row) => [...row].map((ch) => (ch === '.' ? '.' : palette[ch.charCodeAt(0) - 97])).join(',')),
      (c) => pixel.pixelGrid(reg, asked(c)).map((row) => [...row].map((ch) => (ch === '.' ? '.' : colourOf[ch])).join(',')));
    compare(`${id} parts`, cases,
      (c) => avatar.avatarRegularParts(id, c),
      (c) => {
        const split = pixel.pixelSplit(reg, pixel.pixelGrid(reg, asked(c)), { facing: c.facing });
        return { head: byColour(pixel.pixelPaths(reg, split.head)), body: byColour(pixel.pixelPaths(reg, split.body)) };
      });
    assert.equal(pixel.pixelTurns(reg), avatar.avatarRegularTurns(id));
  }
});
// public-edition: end

// ------------------------------------------------------------- kept and shared

const { engine, bus, EVENTS } = await import('./harness.js');
const kept = await import('../../engine/pixel-avatars.js');

const announced = [];
const onConfig = ({ key, value }) => { if (key === 'pixelAvatars') announced.push(value); };
bus.on(EVENTS.CONFIG, onConfig);
const ask = (payload) => { try { return engine.store.pixelAvatars(payload); } catch (err) { return { refused: err.code, why: err.message }; } };
const all = () => engine.snapshot().pixelAvatars;

/*
  The examples these tests copy, change, put back and delete: here the
  SimonSays example and a regular's. The public edition has one example,
  Sandwichxample, and does all of it to that one.
*/
let EXAMPLE = 'example-sandwichxample';
let OTHER_EXAMPLE = 'example-sandwichxample';
// public-edition: leave out
EXAMPLE = 'example-simonsays';
OTHER_EXAMPLE = 'example-shark';
// public-edition: end

kept.resetForTests();
const firstIds = all().map((a) => a.id);
const made = ask({ op: 'create', name: '  Doodle  ' });
const doodle = all().find((a) => a.id === made.id);
const copied = ask({ op: 'duplicate', id: EXAMPLE });
const copy = all().find((a) => a.id === copied.id);
const renamed = ask({ op: 'rename', id: made.id, name: 'Doodle Two' });
// The example changed: one pixel of its drawing, then put back as the built-in one draws it.
const changed = structuredClone(all().find((a) => a.id === EXAMPLE));
changed.base[50] = 'O'.repeat(100);
changed.name = 'My SimonSays';
const savedChange = ask({ op: 'save', avatar: changed });
const afterChange = all().find((a) => a.id === EXAMPLE);
const reset = ask({ op: 'reset', id: EXAMPLE });
const afterReset = all().find((a) => a.id === EXAMPLE);
const notExample = ask({ op: 'reset', id: made.id });
const invalid = ask({ op: 'save', avatar: { ...doodle, base: ['nope'] } });
const unknownOp = ask({ op: 'explode', id: made.id });
const missing = ask({ op: 'delete', id: 'pa-nobody' });
const deleted = ask({ op: 'delete', id: OTHER_EXAMPLE });
const afterDelete = all().map((a) => a.id);
// Seeding again, as the next start does: a deleted example stays deleted.
kept.initPixelAvatars();
const afterRestart = all().map((a) => a.id);
const restored = ask({ op: 'restore-examples' });
const afterRestore = all().map((a) => a.id);
bus.off?.(EVENTS.CONFIG, onConfig);

// public-edition: leave out
test('a fresh install starts with the examples, and every screen is handed the avatars', () => {
  assert.deepEqual(firstIds, ['example-simonsays', 'example-shark', 'example-sandwichxample']);
  assert.equal(all().find((a) => a.id === 'example-simonsays').example, 'simonsays');
  assert.ok(Array.isArray(engine.snapshot().pixelAvatars));
});
// public-edition: end

test('a new avatar starts empty, with a few colours, and its name trimmed', () => {
  assert.ok(made.ok && /^pa-/.test(made.id));
  assert.equal(doodle.name, 'Doodle');
  assert.ok(doodle.base.every((row) => row === '.'.repeat(100)));
  assert.ok(doodle.parts.length >= 4);
  assert.equal(renamed.ok, true);
  assert.equal(all().find((a) => a.id === made.id).name, 'Doodle Two');
});

// public-edition: leave out
test('a copy of an example is an avatar of its own, no longer an example, and draws the same', () => {
  assert.equal(copy.name, 'SimonSays (copy)');
  assert.equal(copy.example, undefined);
  assert.deepEqual(pixel.pixelGrid(copy, { faces: ['happy'], outfit: 'maid' }), avatar.avatarGrid(['happy'], [], 'maid'));
});
// public-edition: end

// public-edition: leave out
test('an example can be changed and put back as the built-in avatar draws it, keeping its name', () => {
  assert.equal(savedChange.ok, true);
  assert.equal(afterChange.base[50], 'O'.repeat(100));
  assert.equal(reset.ok, true);
  assert.deepEqual(afterReset.base, art.AVATAR_BASE);
  assert.equal(afterReset.name, 'My SimonSays');
  assert.equal(notExample.refused, 'pixel_avatar_not_example');
});
// public-edition: end

// public-edition: leave out
test('the built-in avatar is untouched by anything done to its example', () => {
  assert.deepEqual(avatar.avatarGrid(['neutral']), art.AVATAR_BASE);
});
// public-edition: end

test('what cannot be drawn is refused with why, and nothing else changes', () => {
  assert.equal(invalid.refused, 'pixel_avatar_invalid');
  assert.match(invalid.why, /100 rows/);
  assert.equal(unknownOp.refused, 'pixel_avatar_op');
  assert.equal(missing.refused, 'pixel_avatar_missing');
});

test('a deleted example stays deleted after a restart, and can be put back from the tab', () => {
  assert.equal(deleted.ok, true);
  assert.ok(!afterDelete.includes(OTHER_EXAMPLE));
  assert.ok(!afterRestart.includes(OTHER_EXAMPLE));
  assert.equal(restored.restored, 1);
  assert.ok(afterRestore.includes(OTHER_EXAMPLE));
});

test('every change is announced to the screens, as the whole list', () => {
  // Create, copy, rename, save, reset, delete and restore: seven changes, each announced once.
  assert.equal(announced.length, 7);
  assert.deepEqual(announced.at(-1).map((a) => a.id), afterRestore);
});

// ------------------------------------------------------------- on a layer

const { normaliseLayouts } = await import('./backup-and-layouts.js');

test('an avatar layer keeps which pixel avatar it draws, with that avatar\'s own faces, outfits and hats', () => {
  const [l] = normaliseLayouts([{ id: 'p', layers: [
    { type: 'avatar', uid: 'k', config: { character: 'pa-doodle', expression: 'grumpy', costume: 'space-suit', extras: ['top-hat', 'cape', 'BAD NAME'], loudFace: 'yelling', reactions: { follow: 'grumpy', sub: 'not a face!' } } },
    { type: 'avatar', uid: 'b', config: { character: 'not an id!', expression: 'grumpy', costume: 'space-suit', extras: ['top-hat', 'blush'] } },
  ] }]);
  const [kit, built] = l.layers.map((x) => x.config);
  assert.equal(kit.character, 'pa-doodle');
  assert.equal(kit.expression, 'grumpy');
  assert.equal(kit.costume, 'space-suit');
  assert.deepEqual(kit.extras, ['top-hat', 'cape']);
  assert.equal(kit.loudFace, 'yelling');
  assert.equal(kit.reactions.follow, 'grumpy');
  assert.equal(kit.reactions.sub, avatar.AVATAR_REACTION_DEFAULTS.sub);
  // public-edition: leave out
  // Not a pixel avatar's id: the built-in avatar, held to its own faces and outfits as ever.
  assert.equal(built.character, '');
  assert.equal(built.expression, 'neutral');
  assert.equal(built.costume, '');
  assert.deepEqual(built.extras, ['blush']);
  // public-edition: end
});

// public-edition: leave out
test('an avatar layer drawing the built-in avatar is cleaned exactly as before there were pixel avatars', () => {
  const [l] = normaliseLayouts([{ id: 'q', layers: [{ type: 'avatar', uid: 'z', config: { expression: 'happy', costume: 'maid', extras: ['crown', 'party-hat', 'mic', 'mic'], colouring: 'red' } }] }]);
  const c = l.layers[0].config;
  assert.equal(c.character, '');
  assert.equal(c.expression, 'happy');
  assert.equal(c.costume, 'maid');
  assert.deepEqual(c.extras, ['party-hat', 'mic']);
  assert.equal(c.colouring, 'red');
});
// public-edition: end

test('the layer and the tab draw a pixel avatar with the faces and lists of its own, and the built-in one with the built-in\'s', () => {
  const layer = fs.readFileSync(new URL('../../web/components/AvatarLayer.tsx', SCRIPT_URL), 'utf8');
  assert.ok(layer.includes('kit ? pixelFacesNow(kit,'), 'the faces now are not the pixel avatar\'s');
  assert.ok(layer.includes('kit ? pixelColours(kit, colouring'), 'its colours are not its own');
  assert.ok(layer.includes('<PixelKitAvatar'), 'it is never drawn');
  const stage = fs.readFileSync(new URL('../../web/components/CanvasStage.tsx', SCRIPT_URL), 'utf8');
  // The layer's own settings, or the named avatar's it wears.
  assert.ok(stage.includes('kit={kitFor(avatarCfg.character, (system.data as any).pixelAvatars)}'), 'the stage never hands a layer its pixel avatar');
});

// ------------------------------------------------------------- drawing it

const edit = await import('../../../shared/pixel-edit.js');

// public-edition: leave out
test('drawing nothing changes nothing: the example\'s every face and extra shows as the built-in one, and stays it', () => {
  for (const f of sim.faces) {
    const target = { kind: 'face', name: f.name };
    assert.deepEqual(edit.composed(sim, target), avatar.avatarGrid([f.name]), `${f.name} shows other than the built-in face`);
    assert.deepEqual(edit.paint(sim, target, []).faces.find((x) => x.name === f.name).patches, f.patches, `${f.name} changed by drawing nothing`);
  }
  for (const e of sim.extras.filter((x) => !x.art)) assert.deepEqual(edit.composed(sim, { kind: 'extra', name: e.name }), avatar.avatarGrid(['neutral'], [e.name]));
});
// public-edition: end

// public-edition: leave out
test('a pixel drawn inside a face changes that pixel of that face and nothing else', () => {
  const target = { kind: 'face', name: 'happy' };
  const [x, y] = sim.faces.find((f) => f.name === 'happy').patches[0].at;
  const drawn = edit.paint(sim, target, [[x + 1, y + 1, 'V']]);
  assert.equal(edit.differingPixels(sim, drawn, target), 1);
  assert.equal(edit.composed(drawn, target)[y + 1][x + 1], 'V');
  // The same number of patches: it went into the one already there.
  assert.equal(drawn.faces.find((f) => f.name === 'happy').patches.length, sim.faces.find((f) => f.name === 'happy').patches.length);
  // Every other face untouched.
  for (const f of sim.faces.filter((g) => g.name !== 'happy')) assert.deepEqual(drawn.faces.find((g) => g.name === f.name), f);
});
// public-edition: end

// public-edition: leave out
test('pixels drawn outside a face\'s patches become one new patch that paints only them', () => {
  const target = { kind: 'face', name: 'wink' };
  const before = sim.faces.find((f) => f.name === 'wink').patches.length;
  const drawn = edit.paint(sim, target, [[5, 5, 'V'], [8, 7, 'R'], [6, 6, '_']]);
  const patches = drawn.faces.find((f) => f.name === 'wink').patches;
  assert.equal(patches.length, before + 1);
  assert.deepEqual(patches.at(-1), { at: [5, 5], rows: ['V...', '....', '...R'] }, 'the empty pixel was empty already, so it is no part of it');
  assert.equal(edit.differingPixels(sim, drawn, target), 2);
});
// public-edition: end

// public-edition: leave out
test('putting a pixel back to what is under it, and a patch left empty, go', () => {
  const target = { kind: 'face', name: 'surprised' };
  const drawn = edit.paint(sim, target, [[3, 3, 'V']]);
  const back = edit.paint(drawn, target, [[3, 3, '.']]);
  assert.deepEqual(back.faces.find((f) => f.name === 'surprised').patches, sim.faces.find((f) => f.name === 'surprised').patches);
});
// public-edition: end

// public-edition: leave out
test('the drawing and an outfit are drawn pixel for pixel, an outfit\'s "back" being the drawing as drawn', () => {
  const drawn = edit.paint(sim, { kind: 'base' }, [[0, 0, 'O'], [50, 50, '_']]);
  assert.equal(drawn.base[0][0], 'O');
  assert.equal(drawn.base[50][50], '.');
  const maid = { kind: 'outfit', name: 'maid' };
  const maidRows = sim.outfits.find((o) => o.name === 'maid').rows;
  const [x, y] = (() => { for (let yy = 0; yy < 100; yy += 1) for (let xx = 0; xx < 100; xx += 1) if (maidRows[yy][xx] !== sim.base[yy][xx]) return [xx, yy]; return [0, 0]; })();
  const back = edit.paint(sim, maid, [[x, y, '.']]);
  assert.equal(back.outfits.find((o) => o.name === 'maid').rows[y][x], sim.base[y][x]);
  assert.equal(edit.differingPixels(sim, back, maid), 1);
});
// public-edition: end

// public-edition: leave out
test('a region takes the whole box: laid over another face, it replaces that face there', () => {
  const made = edit.addFace(sim, { label: 'Calm eyes' });
  assert.equal(made.name, 'calm-eyes');
  const target = { kind: 'face', name: 'calm-eyes' };
  const region = edit.regionPatch(made.avatar, target, [26, 50, 40, 66]);
  const patch = region.faces.find((f) => f.name === 'calm-eyes').patches[0];
  assert.deepEqual(patch.at, [26, 50]);
  assert.equal(patch.rows.length, 17);
  assert.ok(patch.rows.every((r) => r.length === 15 && !r.includes('.')), 'every pixel of a region is said');
  // Over the sad face, the box shows the drawing as drawn, not the sad eye.
  const sadThenCalm = pixel.pixelGrid(region, { faces: ['sad', 'calm-eyes'] });
  const sad = pixel.pixelGrid(region, { faces: ['sad'] });
  assert.notDeepEqual(sad.slice(50, 67).map((r) => r.slice(26, 41)), sim.base.slice(50, 67).map((r) => r.slice(26, 41)), 'the sad face does not change that box');
  assert.deepEqual(sadThenCalm.slice(50, 67).map((r) => r.slice(26, 41)), sim.base.slice(50, 67).map((r) => r.slice(26, 41)));
});
// public-edition: end

test('a fill, a line and a box reach exactly the cells they should', () => {
  const rows = Array.from({ length: 100 }, (_, y) => (y < 10 ? 'A'.repeat(10) + '.'.repeat(90) : '.'.repeat(100)));
  assert.equal(edit.floodCells(rows, 0, 0).length, 100);
  assert.equal(edit.floodCells(rows, 50, 50).length, 100 * 100 - 100);
  assert.deepEqual(edit.lineCells(0, 0, 3, 1), [[0, 0], [1, 0], [2, 1], [3, 1]]);
  assert.equal(edit.boxCells(0, 0, 4, 4).length, 16);
  assert.equal(edit.boxCells(0, 0, 4, 4, true).length, 25);
  assert.deepEqual(edit.mirroredCells([[0, 3, 'A']]), [[0, 3, 'A'], [99, 3, 'A']]);
});

test('a colour is added with a character of its own, and only one drawn nowhere can be taken out', () => {
  const blank = pixel.blankPixelAvatar('pa-t', 'T');
  const more = edit.addPart(blank, { name: 'Gold trim', color: '#FFD700' });
  const gold = more.parts.at(-1);
  assert.equal(gold.id, 'gold-trim');
  assert.equal(gold.color, '#ffd700');
  assert.ok(!blank.parts.some((p) => p.char === gold.char));
  const drawn = edit.paint(more, { kind: 'base' }, [[1, 1, gold.char]]);
  assert.equal(edit.partUse(drawn, gold.char), 1);
  assert.equal(edit.removePart(drawn, 'gold-trim'), drawn, 'a colour still drawn was taken out');
  assert.ok(!edit.removePart(more, 'gold-trim').parts.some((p) => p.id === 'gold-trim'));
  // The colour the avatar takes, taken out, and it takes none.
  assert.equal(edit.removePart(blank, 'clothes').colouring, null);
  assert.doesNotThrow(() => pixel.cleanPixelAvatar(drawn));
});

test('new faces, extras and outfits get names of their own, and drawings made in the tab are ones the server keeps', () => {
  let pa = pixel.blankPixelAvatar('pa-n', 'N');
  ({ avatar: pa } = edit.addFace(pa, { name: 'blink' }));
  ({ avatar: pa } = edit.addFace(pa, { label: 'Blink' }));
  assert.deepEqual(pa.faces.map((f) => f.name), ['blink', 'blink-2']);
  assert.equal(pa.faces[0].blinks, false, 'eyes shut cannot blink');
  ({ avatar: pa } = edit.addFace(pa, { name: 'talking' }));
  assert.equal(pa.faces.find((f) => f.name === 'talking').glances, true);
  ({ avatar: pa } = edit.addExtra(pa, { label: 'Top hat', hat: true }));
  ({ avatar: pa } = edit.addOutfit(pa, { label: 'Pyjamas' }));
  pa = edit.paint(pa, { kind: 'outfit', name: 'pyjamas' }, [[10, 90, 'S']]);
  pa = edit.paint(pa, { kind: 'extra', name: 'top-hat' }, [[40, 10, 'O'], [41, 10, 'O']]);
  pa = edit.setItem(pa, 'extra', 'top-hat', { words: 'top hat, Chistera ,', label: 'Top hat' });
  assert.deepEqual(pa.extras[0].words, ['top hat', 'chistera']);
  const kept = pixel.cleanPixelAvatar(pa);
  assert.deepEqual(kept.extras[0].patches, [{ at: [40, 10], rows: ['OO'] }]);
  assert.equal(pixel.pixelGrid(kept, { extras: ['top-hat'], outfit: 'pyjamas' })[90][10], 'S');
  assert.deepEqual(edit.removeItem(kept, 'outfit', 'pyjamas').outfits, []);
});

// ------------------------------------------------------------------ drawn hats

// public-edition: leave out
test('a new drawn hat is one the server keeps, and is worn as a picture over the head', () => {
  const { avatar: pa, name } = edit.addDrawnHat(pixel.blankPixelAvatar('pa-h', 'H'), { label: 'Beret' });
  assert.equal(name, 'beret');
  const drawn = edit.paintHat(pa, name, [[0, 0, 'a'], [1, 0, 'b'], [2, 0, '_']]);
  const kept = pixel.cleanPixelAvatar(drawn);
  assert.equal(kept.extras[0].art.rows[0].slice(0, 3), 'ab.');
  assert.equal(pixel.pixelHatWorn(kept, ['beret']), 'beret');
  assert.deepEqual(Object.keys(pixel.pixelHatPaths(kept, 'beret')).sort(), ['#3a2a4a', '#6b4f8a']);
});
// public-edition: end

// public-edition: leave out
test('a hat grown or shrunk on its left or top keeps what is drawn exactly where it was on the head', () => {
  const { avatar: pa, name } = edit.addDrawnHat(pixel.blankPixelAvatar('pa-h', 'H'), { label: 'Beret' });
  const drawn = edit.paintHat(pa, name, [[3, 2, 'a']]);
  const before = pixel.pixelHatPaths(drawn, name);
  for (const [side, by] of [['left', 2], ['top', 3], ['left', -1], ['right', 4], ['bottom', -2]]) {
    const resized = edit.resizeHat(drawn, name, side, by);
    // The same square of the head, written the same way, whatever grid it sits in now.
    const where = (p) => Object.values(p)[0].match(/[\d.-]+/g).map(Number).map((v) => Math.round(v * 100) / 100);
    assert.deepEqual(where(pixel.pixelHatPaths(resized, name)), where(before), `${side} ${by} moved it`);
  }
  assert.equal(edit.resizeHat(drawn, name, 'right', -1000).extras[0].art.rows[0].length, 1, 'a hat keeps at least a pixel');
});
// public-edition: end

// public-edition: leave out
test('a hat colour taken out moves the later ones down, so every pixel keeps its colour; one still drawn stays', () => {
  let { avatar: pa, name } = edit.addDrawnHat(pixel.blankPixelAvatar('pa-h', 'H'), { label: 'Cap' });
  pa = edit.addHatColour(pa, name, '#ff0000');
  pa = edit.paintHat(pa, name, [[0, 0, 'a'], [1, 0, 'c']]);
  assert.equal(edit.removeHatColour(pa, name, 0), pa, 'a colour still drawn was taken out');
  const fewer = edit.removeHatColour(pa, name, 1);
  const art = fewer.extras[0].art;
  assert.deepEqual(art.palette, ['#3a2a4a', '#ff0000']);
  assert.equal(art.rows[0].slice(0, 2), 'ab');
  assert.deepEqual(edit.placeHat(pa, name, { x: 9999, size: 0 }).extras[0].art.x, 200);
  assert.deepEqual(edit.placeHat(pa, name, { size: 0 }).extras[0].art.size, 0.1);
});
// public-edition: end

// public-edition: leave out
test('the example\'s drawn hats are drawn on as their own pictures, and unchanged drawn on by nothing', () => {
  for (const name of pixel.pixelHats(sim).filter((h) => sim.extras.find((e) => e.name === h).art)) {
    assert.deepEqual(edit.paintHat(sim, name, []).extras, sim.extras, `${name} changed by drawing nothing`);
    assert.deepEqual(edit.hatPicture(sim, name).rows, avatar.AVATAR_HAT_ART[name].rows);
  }
});
// public-edition: end

// ------------------------------------------------------------ things it does

const tuber = await import('../../engine/pngtuber.js');

test('something to do is drawn a frame at a time: added, copied, moved, timed, its eyes shut, taken out', () => {
  let { avatar: pa, name } = edit.addAction(pixel.blankPixelAvatar('pa-w', 'W'), { label: 'Wave' });
  assert.equal(name, 'wave');
  pa = edit.paint(pa, { kind: 'frame', action: 'wave', outfit: '', index: 0 }, [[70, 40, 'P']]);
  pa = edit.addFrame(pa, 'wave', '', 1, 0);
  pa = edit.paint(pa, { kind: 'frame', action: 'wave', outfit: '', index: 1 }, [[71, 38, 'P']]);
  pa = edit.addFrame(pa, 'wave', '', 2);
  pa = edit.setFrame(pa, 'wave', '', 2, { ms: 5, eyes: 'shut' });
  let frames = edit.framesOf(pa, 'wave', '');
  assert.equal(frames.length, 3);
  assert.equal(frames[2].ms, 16, 'no frame is shorter than a screen refresh');
  assert.equal(frames[2].eyes, 'shut');
  assert.deepEqual(frames[1].patches.length, 2, 'the copy kept the first frame\'s pixel and added its own');
  pa = edit.moveFrame(pa, 'wave', '', 2, -5);
  assert.equal(edit.framesOf(pa, 'wave', '')[0].eyes, 'shut');
  assert.equal(edit.framePixels(pa, 'wave', '', 2)[38][71], 'P');
  // Drawn in, the frame is over the drawing at rest — with its eyes shut, when it shuts them.
  assert.equal(edit.composed(pa, { kind: 'frame', action: 'wave', outfit: '', index: 1 })[40][70], 'P');
  pa = edit.removeFrame(edit.removeFrame(edit.removeFrame(pa, 'wave', '', 0), 'wave', '', 0), 'wave', '', 0);
  assert.equal(edit.framesOf(pa, 'wave', ''), null, 'an outfit with no frames left does not do it');
  assert.doesNotThrow(() => pixel.cleanPixelAvatar(pa));
});

// public-edition: leave out
test('an outfit starts doing it from another outfit\'s frames, to redraw in its own cloth', () => {
  const started = edit.startOutfitFrames(sim, 'drink', 'mega', '');
  assert.deepEqual(edit.framesOf(started, 'drink', 'mega'), edit.framesOf(sim, 'drink', ''));
  assert.equal(pixel.pixelActionMs(started, 'drink', 'mega'), avatar.avatarActionMs('drink', ''));
  assert.equal(edit.startOutfitFrames(sim, 'drink', 'mega', null).actions[0].outfits.mega.length, 1);
  // The example's own frames, drawn on by nothing, are the built-in ones exactly.
  assert.deepEqual(edit.paint(sim, { kind: 'frame', action: 'drink', outfit: 'maid', index: 3 }, []).actions, sim.actions);
});
// public-edition: end

// public-edition: leave out
test('chat and actions reach what a pixel avatar from the tab does, and wears, after the built-in avatar\'s own', () => {
  let { avatar: pa } = edit.addAction(pixel.blankPixelAvatar('pa-chat', 'Chatty'), { label: 'Wave' });
  pa = edit.setItem(pa, 'action', 'wave', { words: 'hola, saludar' });
  ({ avatar: pa } = edit.addOutfit(pa, { label: 'Pyjamas' }));
  pa = edit.setItem(pa, 'outfit', 'pyjamas', { words: 'pijama' });
  engine.store.pixelAvatars({ op: 'save', avatar: pa });
  assert.equal(tuber.playAvatarAction('saludar')?.name, 'wave');
  assert.equal(tuber.playAvatarAction('wave')?.name, 'wave');
  assert.equal(tuber.playAvatarAction('tomar agua')?.name, 'drink', 'the built-in avatar\'s words still come first');
  assert.equal(tuber.playAvatarAction('juggle'), null);
  assert.equal(tuber.dressAvatar('outfit', 'ponte la pijama', 2)?.outfit, 'pyjamas');
  assert.equal(tuber.dressAvatar('outfit', 'mesero', 2)?.outfit, 'waiter');
  tuber.undressAvatar();
  engine.store.pixelAvatars({ op: 'delete', id: 'pa-chat' });
});
// public-edition: end

// ------------------------------------------------------- in the call, turning

const { cleanPictures } = await import('../../platforms/discord-voice.js');

// public-edition: leave out
test('somebody in the call can be drawn as a pixel avatar from the tab, and the built-in looks are kept as before', () => {
  const kept = cleanPictures({
    111111: { name: 'A', avatar: true, look: { kit: 'pa-doodle', costume: 'pyjamas', hat: 'beret', colouring: 'red', ownColour: '#ABCDEF' } },
    222222: { name: 'B', avatar: true, look: { kit: 'NOT AN ID', costume: 'maid', hat: 'crown' } },
    333333: { name: 'C', avatar: true, look: { drawing: 'shark' } },
  });
  assert.deepEqual(kept['111111'].look, { kit: 'pa-doodle', colouring: 'red', ownColour: '#abcdef', costume: 'pyjamas', hat: 'beret' });
  assert.deepEqual(kept['222222'].look, avatar.avatarCallLook({ kit: 'NOT AN ID', costume: 'maid', hat: 'crown' }));
  assert.deepEqual(kept['333333'].look, { drawing: 'shark' });
});
// public-edition: end

test('a drawing made to turn gets a front view to draw, its own faces, and keeps its writing unmirrored', () => {
  let pa = edit.paint(pixel.blankPixelAvatar('pa-t', 'T'), { kind: 'base' }, [[10, 50, 'O'], [20, 50, 'S']]);
  pa = edit.setTurns(pa, true);
  assert.deepEqual(pa.turn.front.base, pa.base, 'the front view starts as the drawing');
  pa = edit.addFrontFace(pa, 'talking');
  pa = edit.addFrontFace(pa, 'grumpy');
  assert.deepEqual(pa.turn.front.faces.map((f) => f.name), ['talking']);
  pa = edit.paint(pa, { kind: 'front' }, [[50, 50, 'H']]);
  pa = edit.paint(pa, { kind: 'front-face', name: 'talking' }, [[50, 60, 'P']]);
  pa = edit.setTurn(pa, { drawnFacing: 'right', frontHeadLastRow: 70, mirrorKeep: [[20, 50, 10, 50]] });
  const kept = pixel.cleanPixelAvatar(pa);
  assert.deepEqual(kept.turn.mirrorKeep, [[10, 50, 20, 50]]);
  assert.equal(pixel.pixelTurns(kept), true);
  assert.equal(pixel.pixelGrid(kept, { facing: 'front' })[50][50], 'H');
  assert.equal(pixel.pixelGrid(kept, { facing: 'front', faces: ['neutral', 'talking'] })[60][50], 'P');
  // Drawn facing right: facing left is the mirror — the box (10-20) lands at 79-89 — with what is in it the right way round, not reversed.
  const left = pixel.pixelGrid(kept, { facing: 'left' });
  assert.equal(left[50][79], 'O');
  assert.equal(left[50][89], 'S');
  assert.equal(left[50][10], '.');
  assert.equal(pixel.pixelGrid(kept, { facing: 'right' })[50][10], 'O');
  assert.equal(edit.setTurns(kept, false).turn, null);
});

test('outfits and extras are drawn from the front too, worn from the front by the same rules, and go with what they belong to', () => {
  let pa = edit.paint(pixel.blankPixelAvatar('pa-f', 'F'), { kind: 'base' }, [[40, 40, 'O'], [41, 40, 'O']]);
  const coat = edit.addOutfit(pa, { label: 'Coat' }); pa = coat.avatar;
  const cap = edit.addExtra(pa, { label: 'Cap', hat: true }); pa = cap.avatar;
  const glow = edit.addExtra(pa, { label: 'Glow' }); pa = glow.avatar;
  pa = edit.paint(pa, { kind: 'outfit', name: coat.name }, [[40, 60, 'S']]);
  pa = edit.paint(pa, { kind: 'extra', name: cap.name }, [[40, 20, 'H']]);
  pa = edit.setTurns(pa, true);
  // Nothing from the front yet: said, and from the front the front view as it is.
  assert.deepEqual(edit.frontMissing(pa), { outfits: [coat.name], extras: [cap.name, glow.name] });
  assert.ok(edit.pixelWarnings(pa).some((w) => w.code === 'front-missing' && w.kind === 'outfit' && w.name === coat.name));
  const plain = pixel.pixelGrid(pa, { facing: 'front' });
  assert.deepEqual(pixel.pixelGrid(pa, { facing: 'front', outfit: coat.name, extras: [cap.name] }), plain);
  // An outfit from the front starts as the front view; "back" on it is the front view again.
  pa = edit.addFrontOutfit(pa, coat.name);
  assert.deepEqual(pa.turn.front.outfits[0].rows, pa.turn.front.base);
  pa = edit.paint(pa, { kind: 'front-outfit', name: coat.name }, [[45, 70, 'S'], [40, 40, 'W']]);
  pa = edit.paint(pa, { kind: 'front-outfit', name: coat.name }, [[40, 40, '.']]);
  assert.equal(pa.turn.front.outfits[0].rows[40][40], 'O', 'back on an outfit from the front was not the front view');
  pa = edit.addFrontExtra(pa, cap.name);
  pa = edit.addFrontExtra(pa, glow.name);
  pa = edit.paint(pa, { kind: 'front-extra', name: cap.name }, [[45, 25, 'H']]);
  pa = edit.paint(pa, { kind: 'front-extra', name: glow.name }, [[60, 50, 'W']]);
  assert.deepEqual(edit.frontMissing(pa), { outfits: [], extras: [] });
  assert.equal(edit.outfitChecklist(pa, coat.name).front, true);
  // Kept by the server, worn from the front.
  const kept = pixel.cleanPixelAvatar(pa);
  const front = (opts) => pixel.pixelGrid(kept, { facing: 'front', ...opts });
  assert.equal(front({ outfit: coat.name })[70][45], 'S');
  assert.equal(front({ outfit: coat.name })[60][40], '.', 'the side\'s outfit showed from the front');
  assert.equal(front({ extras: [cap.name, glow.name] })[25][45], 'H');
  assert.equal(front({ extras: [cap.name, glow.name] })[50][60], 'W');
  assert.equal(front({ extras: [cap.name] })[20][40], '.', 'the side\'s hat showed from the front');
  // Headwear from the front too: no hat over it.
  const hooded = edit.setItem(kept, 'outfit', coat.name, { headwear: true });
  assert.equal(pixel.pixelGrid(hooded, { facing: 'front', outfit: coat.name, extras: [cap.name] })[25][45], '.');
  // A face over the outfit keeps the outfit where it paints what the front view has there.
  const withFace = pixel.cleanPixelAvatar({ ...kept, turn: { ...kept.turn, front: { ...kept.turn.front, faces: [{ name: 'talking', label: '', patches: [{ at: [44, 70], rows: ['.._'] }], glances: false, blinks: true }] } } });
  const talking = pixel.pixelGrid(withFace, { facing: 'front', outfit: coat.name, faces: ['talking'] });
  assert.equal(talking[70][45], 'S', 'a face wiped the outfit where it only kept the front view');
  // What it does is drawn from the side only.
  let acting = edit.addAction(kept, { label: 'Hop' }).avatar;
  acting = edit.paint(acting, { kind: 'frame', action: 'hop', outfit: '', index: 0 }, [[70, 70, 'O']]);
  assert.deepEqual(pixel.pixelGrid(acting, { facing: 'front', action: { name: 'hop', frame: 0 } }), pixel.pixelGrid(acting, { facing: 'front' }));
  // A colour drawn only from the front is still a colour in use.
  assert.ok(edit.partUse(kept, 'W') > 0);
  // The server keeps only front versions of outfits and extras it has, once each.
  const odd = pixel.cleanPixelAvatar({ ...kept, turn: { ...kept.turn, front: { ...kept.turn.front, outfits: [...kept.turn.front.outfits, { name: 'nope', rows: kept.turn.front.base }, kept.turn.front.outfits[0]] } } });
  assert.deepEqual(odd.turn.front.outfits.map((o) => o.name), [coat.name]);
  // Taken out with what it belongs to, or on its own.
  assert.deepEqual(edit.removeItem(kept, 'outfit', coat.name).turn.front.outfits, []);
  assert.deepEqual(edit.removeItem(kept, 'extra', glow.name).turn.front.extras.map((e) => e.name), [cap.name]);
  assert.deepEqual(edit.removeFrontVersion(kept, 'extra', cap.name).turn.front.extras.map((e) => e.name), [glow.name]);
  // An avatar from before there were front versions is kept as it was, with none.
  const older = structuredClone(kept);
  delete older.turn.front.outfits; delete older.turn.front.extras;
  assert.deepEqual(pixel.cleanPixelAvatar(older).turn.front.outfits, []);
});

const read = (p) => fs.readFileSync(new URL(p, SCRIPT_URL), 'utf8');

test('the editor has one list for both views: Side | Front over the canvas opens what is picked in the view chosen', () => {
  const editor = read('../../web/components/pixel/PixelEditor.tsx');
  // The switch, and no list of the front view's own any more.
  for (const s of ['data-pixel-views', 'data-pixel-view="side"', 'data-pixel-view="front"']) assert.ok(editor.includes(s), `${s} is not in the editor`);
  for (const s of ['data-pixel-front-toggle', 'data-pixel-front-versions', 'data-pixel-side-heading']) assert.ok(!editor.includes(s), `${s} is still in the editor`);
  // Each thing's front version: the drawing, a face, an outfit, an extra or hat; what it does and the set-up have none.
  for (const s of ["if (tg.kind === 'base') return { kind: 'front' };", "if (tg.kind === 'face') return { kind: 'front-face', name: tg.name };",
    "if (tg.kind === 'outfit') return { kind: 'front-outfit', name: tg.name };", "if (tg.kind === 'extra' || tg.kind === 'hat') return { kind: 'front-extra', name: tg.name };"]) {
    assert.ok(editor.includes(s), `${s} is gone`);
  }
  // On Front, picking something else opens its front version; a face drawn only from the front opens there.
  assert.ok(editor.includes('if (front && exists(front) && (stayFront || !exists(tg))) { setTarget(front); return; }'));
  // Every list item goes through it, and an outfit or extra missing from the front is marked.
  for (const s of ["pick({ kind: 'base' })", "pick({ kind: 'outfit', name: o.name })", "pick({ kind: 'face', name })", "pick({ kind: 'extra', name: e.name })", "pick({ kind: 'hat', name: e.name })"]) {
    assert.ok(editor.includes(s), `a list item does not open through the switch: ${s}`);
  }
  for (const s of ["setTarget({ kind: 'face', name: f.name })", "setTarget({ kind: 'extra', name: e.name })", "setTarget({ kind: 'hat', name: e.name })", "setTarget({ kind: 'outfit', name: o.name })"]) {
    assert.ok(!editor.includes(s), `a list item still opens past the switch: ${s}`);
  }
  assert.ok(editor.includes("{frontDot('outfit', o.name)}") && editor.includes("{frontDot('extra', e.name)}"));
  // Hats of both kinds under Hats; Extras keeps the rest.
  assert.ok(editor.includes('draft.extras.filter((e) => !e.art && !e.hat)'));
  assert.ok(editor.includes('draft.extras.filter((e) => e.hat || e.art)'));
  // The preview faces the way of what is being drawn.
  assert.ok(editor.includes("setFacing(FRONT_KINDS.includes(tgt.kind) ? 'front' : (draft.drawnFacing || 'left'));"));
  const strings = read('../../web/constants.ts');
  for (const key of ['pixelViewSide', 'pixelViewFront', 'pixelViewSideHint', 'pixelViewFrontHint', 'pixelViewBoth', 'pixelViewActionsSide', 'pixelViewSideOnly', 'pixelViewFrontNote', 'pixelViewFrontOnly', 'pixelSideMirrorHint', 'pixelHatsList', 'pixelWarnFrontMissing', 'pixelDrawFromFront']) {
    assert.equal(strings.split(`    ${key}: `).length - 1, 2, `${key} is not in both languages`);
  }
});

test('the Pixel avatars screen takes the whole width, and which avatar is open is a dropdown with every one\'s picture', () => {
  // As wide as the overlay editor: no reading-width cap.
  assert.ok(read('../../web/App.tsx').includes("view === 'layouts' || view === 'pixel-avatars' ? '' : 'max-w-7xl'"));
  const view = read('../../web/components/views/PixelAvatarsView.tsx');
  // No list beside the editor; the dropdown at the top of the editor box, over the panels after it.
  assert.ok(!view.includes('lg:grid-cols-[15rem_1fr]'), 'the list column is still there');
  assert.ok(view.includes('<AvatarPicker avatars={avatars} kit={kit} onPick={setSelectedId} t={t}>'));
  assert.ok(view.indexOf('{picker}') > view.indexOf('relative z-20'), 'the dropdown is not in the box above the rest');
  // The one open with its picture and an arrow; the rest, each with its picture; closed by a click elsewhere or Escape.
  assert.ok(view.includes('{kit ? <AvatarRow a={kit} t={t} /> :') && view.includes('<ChevronDown size={14}'));
  assert.ok(view.includes('const others = avatars.filter((a) => a.id !== kit?.id);') && view.includes('<AvatarRow a={a} t={t} />'));
  assert.ok(view.includes("if (e.key === 'Escape') setOpen(false);") && view.includes("document.addEventListener('mousedown', away);"));
  // Making one, bringing one in and the examples, at its foot, each closing it.
  for (const s of ['data-pixel-new-name', 'data-pixel-create', 'data-pixel-from-file', 'data-pixel-restore']) assert.ok(view.includes(s), `${s} is gone`);
  assert.ok(view.includes("run({ op: 'restore-examples' }); close();"));
  // The editor beside the colours from a laptop up, and opened as big as fits across and down.
  const editor = read('../../web/components/pixel/PixelEditor.tsx');
  assert.ok(editor.includes('xl:grid-cols-[11rem_minmax(0,1fr)_15rem]'));
  assert.ok(editor.includes('Math.min(12, Math.floor(w / 100), h ? Math.floor(h / 100) : 12)'));
  assert.equal(read('../../web/constants.ts').split('    pixelNoOthers: ').length - 1, 2, 'pixelNoOthers is not in both languages');
});

test('any face it has from the side can be started from the front, blinking as the side\'s does; one it has not, cannot', () => {
  let pa = edit.setTurns(pixel.blankPixelAvatar('pa-ff', 'FF'), true);
  pa = edit.addFace(pa, { name: 'happy' }).avatar;
  pa = edit.setItem(pa, 'face', 'happy', { blinks: false });
  pa = edit.addFrontFace(pa, 'happy');
  pa = edit.addFrontFace(pa, 'grumpy');
  pa = edit.addFrontFace(pa, 'blink');
  assert.deepEqual(pa.turn.front.faces.map((f) => [f.name, f.blinks, f.glances]), [['happy', false, false], ['blink', false, false]]);
});

test('one that turns, doing something while it faces the front, turns to the side it was drawn for to do it', () => {
  const layer = read('../../web/components/AvatarLayer.tsx');
  assert.ok(layer.includes("facing={turns ? (acting && facingNow === 'front' ? kit.drawnFacing || 'left' : facingNow) : null}"));
});

// An example seeded before it was drawn from the front catches up on the next start — unless it was changed.
const { collection } = await import('../../core/store.js');
const avatarsKept = collection('pixel_avatars');
const versionsKept = collection('pixel_avatar_versions');
const keptBefore = structuredClone(avatarsKept.get());
const versionsBefore = structuredClone(versionsKept.get());
const SAND = 'example-sandwichxample';
const firstShipped = (a) => { const c = structuredClone(a); delete c.turn.front.outfits; delete c.turn.front.extras; return c; };
const asInstalled = (change = (a) => a) => avatarsKept.set({ ...avatarsKept.get(), items: avatarsKept.get().items.map((i) => (i.id === SAND ? change(firstShipped(i)) : i)), seededAs: {} });
kept.resetForTests();
const shippedSand = structuredClone(all().find((a) => a.id === SAND));
asInstalled((a) => ({ ...a, name: 'Sandy' }));
kept.catchUpForTests(Date.now());
const caughtUp = structuredClone(all().find((a) => a.id === SAND));
const caughtMark = avatarsKept.get().seededAs?.sandwichxample;
const caughtVersions = (versionsKept.get().items[SAND] || []).length;
kept.catchUpForTests(Date.now());
const secondPass = structuredClone(all().find((a) => a.id === SAND));
const secondVersions = (versionsKept.get().items[SAND] || []).length;
asInstalled((a) => ({ ...a, base: ['o'.repeat(100), ...a.base.slice(1)] }));
kept.catchUpForTests(Date.now());
const leftAlone = structuredClone(all().find((a) => a.id === SAND));
// Edited until it is the one shipped again, under a fingerprint of before: unchanged from here, so it catches up again.
avatarsKept.set({ ...avatarsKept.get(), items: avatarsKept.get().items.map((i) => (i.id === SAND ? structuredClone(shippedSand) : i)), seededAs: { sandwichxample: 'from-an-older-copy' } });
kept.catchUpForTests(Date.now());
const remarked = avatarsKept.get().seededAs?.sandwichxample;
avatarsKept.set(keptBefore);
versionsKept.set(versionsBefore);

test('an example nobody changed catches up with the one shipped, keeping its name; one changed is left as it is', () => {
  assert.ok(shippedSand.turn.front.outfits.length > 0, 'the example shipped has no outfits from the front');
  assert.deepEqual(caughtUp.turn.front.outfits, shippedSand.turn.front.outfits, 'the copy from before did not catch up');
  assert.deepEqual(caughtUp.turn.front.extras, shippedSand.turn.front.extras);
  assert.equal(caughtUp.name, 'Sandy', 'catching up took its name');
  assert.equal(caughtVersions, 1, 'what it was is not kept as a version');
  assert.ok(caughtMark, 'what it is now is not remembered');
  assert.deepEqual(secondPass, caughtUp, 'a second start changed it again');
  assert.equal(secondVersions, caughtVersions, 'a second start kept another version');
  assert.equal(leftAlone.base[0], 'o'.repeat(100), 'a changed copy was replaced');
  assert.deepEqual(leftAlone.turn.front.outfits || [], [], 'a changed copy was given the new drawings');
  assert.ok(remarked && remarked !== 'from-an-older-copy', 'a copy that is the one shipped again is not taken as unchanged');
  assert.ok(read('../engine/pixel-avatars.js').includes('markShipped(avatar);'), 'putting one back does not let it catch up again');
});

// ------------------------------------------------------------------- outfits

// public-edition: leave out
test('an outfit\'s own face and glasses are drawn over what is under them, and laid back together are the built-in waiter', () => {
  for (const face of ['neutral', 'blink', 'happy', 'sad', 'surprised']) {
    const target = face === 'neutral' ? { kind: 'own-glasses', outfit: 'waiter' } : { kind: 'own-face', outfit: 'waiter', name: face };
    const shown = edit.composed(sim, target);
    const glasses = sim.outfits.find((o) => o.name === 'waiter').ownFace.glasses;
    const whole = face === 'neutral' ? shown : edit.layPatches(shown, glasses);
    assert.deepEqual(whole, avatar.avatarGrid([face], [], 'waiter'), `${face} on the waiter`);
    assert.deepEqual(edit.paint(sim, target, []).outfits, sim.outfits, `${face} on the waiter changed by drawing nothing`);
  }
});
// public-edition: end

// public-edition: leave out
test('an outfit gets a face of its own in a box, drawn face by face, and the checklist says what each outfit has', () => {
  let pa = edit.startOutfitFrames(sim, 'drink', 'mega', null);
  ({ avatar: pa } = edit.addOutfit(pa, { label: 'Pyjamas' }));
  pa = edit.setOwnFace(pa, 'pyjamas', true);
  pa = edit.setOwnFaceBox(pa, 'pyjamas', { region: [60, 70, 20, 30], lashesTo: 55 });
  pa = edit.paint(pa, { kind: 'own-face', outfit: 'pyjamas', name: 'wink' }, [[40, 60, 'V']]);
  pa = edit.paint(pa, { kind: 'own-glasses', outfit: 'pyjamas' }, [[30, 58, 'L']]);
  const kept = pixel.cleanPixelAvatar(pa);
  const pj = kept.outfits.find((o) => o.name === 'pyjamas');
  assert.deepEqual(pj.ownFace.region, [20, 30, 60, 70]);
  assert.equal(pj.lashesTo, 55);
  assert.equal(pixel.pixelGrid(kept, { faces: ['wink'], outfit: 'pyjamas' })[60][40], 'V');
  assert.equal(pixel.pixelGrid(kept, { faces: ['happy'], outfit: 'pyjamas' })[58][30], 'L', 'the glasses go over every face');
  const list = edit.outfitChecklist(kept, 'pyjamas');
  assert.deepEqual(list.actions, [{ name: 'drink', frames: 0 }]);
  assert.equal(list.ownFaces.find((f) => f.name === 'wink').drawn, true);
  assert.equal(list.ownFaces.find((f) => f.name === 'sad').drawn, false);
  assert.equal(edit.outfitChecklist(kept, 'maid').hats, null, 'the maid has headwear of her own');
  assert.equal(edit.outfitChecklist(kept, 'mega').actions[0].frames, 1);
  assert.equal(edit.setOwnFace(kept, 'pyjamas', false).outfits.find((o) => o.name === 'pyjamas').ownFace, undefined);
});
// public-edition: end

// ------------------------------------------------------------ drawn sheets

const imp = await import('../../../shared/pixel-import.js');

/** A picture of `rows` drawn at `scale` image pixels a drawing pixel, on a white page, with JPEG-like noise everywhere and smear at every edge. */
function drawnSheet(rows, colours, scale, { at = [7, 5], noise = 6 } = {}) {
  const width = Math.ceil(rows[0].length * scale + at[0] + 9); const height = Math.ceil(rows.length * scale + at[1] + 9);
  const data = new Uint8ClampedArray(width * height * 4);
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed / 2147483647) * 2 - 1; };
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = Math.floor((x - at[0]) / scale); const j = Math.floor((y - at[1]) / scale);
      const c = rows[j]?.[i];
      let rgb = c && c !== '.' ? imp.hexRgb(colours[c]) : [255, 255, 255];
      // Smear: a pixel on a cell's edge is half its neighbour's.
      const fx = ((x - at[0]) / scale) % 1; const fy = ((y - at[1]) / scale) % 1;
      if (fx < 0.12 || fy < 0.12) { const n = rows[j]?.[i - 1] || '.'; const other = n !== '.' ? imp.hexRgb(colours[n]) : [255, 255, 255]; rgb = rgb.map((v, k) => (v + other[k]) / 2); }
      const k = (y * width + x) * 4;
      for (let ch = 0; ch < 3; ch += 1) data[k + ch] = Math.max(0, Math.min(255, rgb[ch] + rnd() * noise));
      data[k + 3] = 255;
    }
  }
  return { width, height, data };
}

// public-edition: leave out
test('a picture drawn at its own pixel size, smeared and speckled as a JPEG is, reads back exactly, in the avatar\'s own colours', () => {
  const rows = ['..OO..', '.OSSO.', 'OSSSSO', 'OSPPSO', '.OOOO.'];
  const colours = { O: '#380354', S: '#a56cae', P: '#e5c5b3' };
  for (const scale of [3, 4, 7.25, 12]) {
    const sheet = drawnSheet(rows, colours, scale);
    const cells = imp.sampleCells(sheet, { x: 7, y: 5, w: 6 * scale, h: 5 * scale }, 6);
    const back = imp.cellsToRows(cells, sim.parts, { background: '#ffffff' });
    assert.deepEqual(back, rows, `at ${scale} image pixels a pixel`);
  }
});
// public-edition: end

test('a picture\'s own colours are found, the background left out, and it is placed as one stroke', () => {
  const rows = ['AB.', 'BBA'];
  const sheet = drawnSheet(rows, { A: '#123456', B: '#e0a030' }, 5);
  const cells = imp.sampleCells(sheet, { x: 7, y: 5, w: 15, h: 10 }, 3);
  const found = imp.pictureColours(cells, { background: '#ffffff' });
  assert.equal(found.length, 2);
  // The colour drawn most is first, each within a whisker of what was drawn.
  const near = (a, b) => imp.hexRgb(a).every((v, i) => Math.abs(v - imp.hexRgb(b)[i]) <= 8);
  assert.ok(near(found[0], '#e0a030') && near(found[1], '#123456'), found.join(' '));
  const stroke = imp.placeRows(['AB.', 'BBA'], 10, 20);
  assert.equal(stroke.length, 5, 'its empty pixel is left alone');
  assert.deepEqual(stroke[0], [10, 20, 'A']);
  assert.equal(imp.placeRows(['A.'], 0, 0, { clear: true })[1][2], '_');
  assert.ok(imp.isBackground([0, 0, 0, 0]) && !imp.isBackground([0, 0, 0, 255]));
});

// --------------------------------------------------------------- setting up

test('a new avatar is set up to take a colour: its main part exactly, the parts that follow it, its eyes softer', () => {
  let pa = pixel.blankPixelAvatar('pa-c', 'C');
  pa = edit.setColouring(pa, { main: 'clothes', coloured: ['clothes-shadow', 'eye', 'gone'], eyes: ['eye', 'skin'], suit: { armour: 'nope' } });
  assert.deepEqual(pa.colouring, { main: 'clothes', coloured: ['clothes', 'clothes-shadow', 'eye'], eyes: ['eye'], suit: null });
  const red = pixel.pixelColours(pa, 'red');
  assert.equal(red.clothes, PLAYER_COLOURS.red.toLowerCase(), 'the main part does not take the colour exactly');
  assert.ok(red['clothes-shadow'] && red.eye && !red.skin);
  assert.equal(edit.setColouring(pa, null).colouring, null);
  assert.doesNotThrow(() => pixel.cleanPixelAvatar(pa));
});

test('a new avatar\'s eyes are guessed, kept, and move by themselves; taken away, its faces stop glancing', () => {
  let pa = pixel.blankPixelAvatar('pa-e', 'E');
  // Two eyes: a dark ring, an iris, a white with a sparkle.
  const eye = (x0) => [[x0, 55, 'O'], [x0 + 1, 55, 'O'], [x0 + 2, 55, 'O'], [x0, 56, 'O'], [x0 + 1, 56, 'W'], [x0 + 2, 56, 'I'], [x0 + 3, 56, 'I'], [x0, 57, 'O'], [x0 + 1, 57, 'W'], [x0 + 2, 57, 'I'], [x0 + 3, 57, 'W']];
  pa = edit.paint(pa, { kind: 'base' }, [...eye(32), ...eye(58), [45, 40, 'P'], [46, 40, 'P']]);
  const guess = edit.guessEyes(pa);
  assert.equal(guess.line, 'O');
  assert.equal(guess.shine, 'W');
  assert.equal(guess.lid, 'P');
  pa = edit.setEyes(pa, { ...guess, boxes: [[31, 37], [57, 63]], rows: [55, 57], split: 56, lidRow: 57, lashes: [53, 54] });
  ({ avatar: pa } = edit.addFace(pa, { name: 'talking' }));
  const kept = pixel.cleanPixelAvatar(pa);
  const rest = pixel.pixelGrid(kept, {});
  const looking = pixel.pixelGrid(kept, { eyes: { look: 'left' } });
  const half = pixel.pixelGrid(kept, { eyes: { half: true } });
  assert.notDeepEqual(looking, rest, 'the eyes do not glance');
  assert.notDeepEqual(half, rest, 'the eyes do not half-shut');
  assert.equal(edit.setEyes(kept, null).faces.find((f) => f.name === 'talking').glances, false);
});

test('a part is set to be carried, drawn over a hat, float or pop, and see-through; the outfit it was drawn in named', () => {
  let pa = pixel.blankPixelAvatar('pa-p', 'P');
  pa = edit.setPart(pa, 'white', { carried: true, overHat: true, effect: 'float', opacity: 0.5 });
  assert.deepEqual(pa.split.carried, ['white']);
  assert.deepEqual(pa.overHat, ['white']);
  assert.equal(pa.parts.find((p) => p.id === 'white').effect, 'float');
  assert.equal(pa.parts.find((p) => p.id === 'white').opacity, 0.5);
  pa = edit.setPart(pa, 'white', { carried: false, effect: '', opacity: 1 });
  assert.deepEqual(pa.split.carried, []);
  assert.equal(pa.parts.find((p) => p.id === 'white').effect, undefined);
  assert.equal(pa.parts.find((p) => p.id === 'white').opacity, undefined);
  pa = edit.setBaseOutfit(pa, { label: 'Jumper', words: 'jumper, Sweater' });
  assert.deepEqual([pa.baseLabel, pa.baseWords], ['Jumper', ['jumper', 'sweater']]);
  assert.equal(pixel.pixelDressName(pa, 'outfit', 'put the sweater on'), '');
  assert.doesNotThrow(() => pixel.cleanPixelAvatar(pa));
});

test('a reference picture is fitted inside the drawing keeping its shape, and lands on a drawn hat\'s grid where it is on the head', () => {
  assert.deepEqual(edit.fitReference(400, 200), { x: 0, y: 25, w: 100 });
  assert.deepEqual(edit.fitReference(300, 600), { x: 25, y: 0, w: 50 });
  assert.deepEqual(edit.fitReference(0, 10), { x: 0, y: 0, w: 100 });
  const onHat = edit.referenceOnHat({ x: 10, y: 4, w: 60, opacity: 0.5 }, { x: 4, y: -2, size: 1.5 });
  assert.deepEqual(onHat, { x: 4, y: 4, w: 40, opacity: 0.5 });
});

// ------------------------------------------------------- selecting and copying

test('a box of the drawing is picked up, moved and put down: where it was is empty, where it went has it', () => {
  let pa = edit.paint(pixel.blankPixelAvatar('pa-s', 'S'), { kind: 'base' }, [[10, 10, 'O'], [11, 10, 'S'], [10, 11, 'P']]);
  const lifted = edit.liftBox(pa, { kind: 'base' }, [12, 12, 9, 9]);
  assert.deepEqual(lifted, { x: 9, y: 9, rows: ['....', '.OS.', '.P..', '....'] });
  pa = edit.vacateBox(pa, { kind: 'base' }, [9, 9, 12, 12]);
  pa = edit.stampRows(pa, { kind: 'base' }, { ...lifted, x: 50, y: 60 });
  assert.equal(pa.base[10].slice(9, 13), '....');
  assert.equal(pa.base[61].slice(50, 54), '.OS.');
  assert.equal(pa.base[62][51], 'P');
  assert.deepEqual(edit.flipRows(['ab', 'cd'], 'h'), ['ba', 'dc']);
  assert.deepEqual(edit.flipRows(['ab', 'cd'], 'v'), ['cd', 'ab']);
});

// public-edition: leave out
test('from a face only what it changes is picked up, and moving it puts the drawing back where it was', () => {
  const target = { kind: 'face', name: 'surprised' };
  const own = edit.ownPixels(sim, target);
  const box = edit.patchBoxes(sim, target)[0];
  const lifted = edit.liftBox(sim, target, box);
  // Nothing of the head under the face comes with it: every pixel lifted is one the face itself paints.
  lifted.rows.forEach((row, j) => [...row].forEach((c, i) => assert.equal(c, own[lifted.y + j][lifted.x + i])));
  const moved = edit.stampRows(edit.vacateBox(sim, target, box), target, { ...lifted, x: lifted.x + 1 });
  const shown = edit.composed(moved, target);
  // Where the face no longer paints, the drawing as drawn shows again.
  assert.equal(shown[box[1]][box[0]], sim.base[box[1]][box[0]] === own[box[1]][box[0]] || own[box[1]][box[0]] === '.' ? shown[box[1]][box[0]] : sim.base[box[1]][box[0]]);
  assert.deepEqual(edit.composed(edit.stampRows(edit.vacateBox(sim, target, box), target, lifted), target), edit.composed(sim, target), 'put back where it was, it is the face it was');
});
// public-edition: end

// public-edition: leave out
test('pixels pasted into another avatar take its colours: the same, or the nearest', () => {
  const blank = pixel.blankPixelAvatar('pa-r', 'R');
  const rows = ['HS', 'Wm'];
  const colours = edit.coloursOf(rows, sim.parts);
  const back = edit.remapRows(rows, colours, blank.parts, imp.nearestPart);
  // Hair and white have their match in the blank avatar's colours; the hoodie its own; the face-line purple the nearest.
  assert.equal(back[0][0], 'H');
  assert.equal(back[1][0], 'W');
  assert.ok(blank.parts.some((p) => p.char === back[1][1]));
  assert.deepEqual(edit.remapRows(['_.'], {}, blank.parts, imp.nearestPart), ['_.']);
});
// public-edition: end

test('mirrored drawing goes across a line that moves, and the middle of a drawing is found', () => {
  assert.deepEqual(edit.mirroredCells([[40, 5, 'A']], 100, 45), [[40, 5, 'A'], [50, 5, 'A']]);
  assert.deepEqual(edit.mirroredCells([[40, 5, 'A']], 100, 45.5), [[40, 5, 'A'], [51, 5, 'A']]);
  assert.deepEqual(edit.mirroredCells([[0, 0, 'A']]), [[0, 0, 'A'], [99, 0, 'A']]);
  const two = Array.from({ length: 100 }, (_, y) => (y === 3 ? `${'.'.repeat(10)}A${'.'.repeat(19)}B${'.'.repeat(69)}` : '.'.repeat(100)));
  assert.equal(edit.drawnMiddle(two), 20);
  assert.equal(edit.drawnMiddle(Array(100).fill('.'.repeat(100))), 49.5, 'nothing drawn: the grid\'s own middle');
});

test('a colour\'s shadow and highlight are added beside it, the same hue, darker and lighter', () => {
  const pa = edit.addShades(pixel.blankPixelAvatar('pa-sh', 'Sh'), 'clothes');
  const [shadow, light] = pa.parts.slice(-2);
  assert.equal(shadow.name, 'Clothes shadow');
  assert.equal(light.name, 'Clothes highlight');
  const [h0, , l0] = avatar.hexToHsl('#a56cae');
  const [h1, , l1] = avatar.hexToHsl(shadow.color);
  const [h2, , l2] = avatar.hexToHsl(light.color);
  assert.ok(Math.abs(h1 - h0) < 2 && Math.abs(h2 - h0) < 2, 'the hue moved');
  assert.ok(l1 < l0 && l2 > l0);
  assert.doesNotThrow(() => pixel.cleanPixelAvatar(pa));
});

// ---------------------------------------------------------------- warnings

test('before saving it says what is worth a look: a face below the head, an empty face or frame, colours drawn nowhere', () => {
  let pa = pixel.blankPixelAvatar('pa-w', 'W');
  pa = edit.paint(pa, { kind: 'base' }, [[50, 50, 'O']]);
  ({ avatar: pa } = edit.addFace(pa, { label: 'Low' }));
  pa = edit.paint(pa, { kind: 'face', name: 'low' }, [[50, 90, 'S']]);
  ({ avatar: pa } = edit.addFace(pa, { label: 'Nothing yet' }));
  ({ avatar: pa } = edit.addAction(pa, { label: 'Wave' }));
  const codes = edit.pixelWarnings(pa).map((w) => `${w.code}:${w.name || w.parts?.length}`);
  assert.ok(codes.includes('face-below-head:low'));
  assert.ok(codes.includes('empty:nothing-yet'));
  assert.ok(codes.includes('empty:wave'), 'the empty frame of something new to do');
  assert.ok(codes.some((c) => c.startsWith('unused-colours:')));
});

// public-edition: leave out
test('hair showing above a drawn hat is found — on the example only the waiter\'s, whose hair the hats were not cut for', () => {
  const pokes = edit.pixelWarnings(sim).filter((w) => w.code === 'hat-hair-pokes');
  assert.ok(pokes.length > 0);
  assert.ok(pokes.every((w) => w.outfit === 'waiter'), JSON.stringify(pokes));
  assert.deepEqual(edit.pixelWarnings(examples.regularExample('shark')), []);
  // The hair it hides rubbed out, the warning goes.
  let { avatar: pa, name } = edit.addDrawnHat(edit.paint(pixel.blankPixelAvatar('pa-h2', 'H'), { kind: 'base' }, [[30, 2, 'H'], [31, 2, 'H'], [32, 2, 'H'], [30, 20, 'H']]), { label: 'Cap' });
  pa = edit.paintHat(pa, name, Array.from({ length: 10 }, (_, i) => [i, 5, 'a']));
  assert.ok(edit.pixelWarnings(pa).some((w) => w.code === 'hat-hair-pokes'));
  pa = edit.paint(pa, { kind: 'extra', name }, [[30, 2, '_'], [31, 2, '_'], [32, 2, '_']]);
  assert.ok(!edit.pixelWarnings(pa).some((w) => w.code === 'hat-hair-pokes'));
});
// public-edition: end

// public-edition: leave out
test('a hat\'s hidden hair can be drawn over an outfit, to see the hair that outfit has', () => {
  const onWaiter = edit.composed(sim, { kind: 'extra', name: 'cowboy-hat', outfit: 'waiter' });
  assert.deepEqual(onWaiter, edit.layPatches(pixel.pixelGrid(sim, { outfit: 'waiter' }), sim.extras.find((e) => e.name === 'cowboy-hat').patches));
  // Drawn on there, it is the same hat everywhere: its patches are its own, whatever they were drawn over.
  const rubbed = edit.paint(sim, { kind: 'extra', name: 'cowboy-hat', outfit: 'waiter' }, [[73, 21, '_']]);
  assert.equal(pixel.pixelGrid(rubbed, { extras: ['cowboy-hat'], outfit: 'waiter' })[21][73], '.');
});
// public-edition: end

// ---------------------------------------------------------------- GIFs

const gif = await import('../../../shared/gif.js');

/** A GIF read back: its size, colours, and each frame's pixels and delay — a decoder written from the format, to hold the encoder to it. */
function readGif(bytes) {
  let p = 6;
  const u16 = () => { const v = bytes[p] | (bytes[p + 1] << 8); p += 2; return v; };
  const width = u16(); const height = u16();
  const packed = bytes[p]; p += 3;
  const size = 1 << ((packed & 7) + 1);
  const table = []; for (let i = 0; i < size; i += 1) { table.push([bytes[p], bytes[p + 1], bytes[p + 2]]); p += 3; }
  const frames = []; let control = { delay: 0, transparent: -1 }; let loops = false;
  while (p < bytes.length) {
    const b = bytes[p]; p += 1;
    if (b === 0x3b) break;
    if (b === 0x21) {
      const label = bytes[p]; p += 1;
      if (label === 0xf9) { p += 1; const flags = bytes[p]; p += 1; control = { delay: u16(), transparent: flags & 1 ? bytes[p] : -1 }; p += 2; continue; }
      if (label === 0xff) loops = true;
      while (bytes[p]) p += bytes[p] + 1;
      p += 1;
      continue;
    }
    if (b === 0x2c) {
      p += 8; p += 1;
      const min = bytes[p]; p += 1;
      const data = [];
      while (bytes[p]) { data.push(...bytes.slice(p + 1, p + 1 + bytes[p])); p += bytes[p] + 1; }
      p += 1;
      // LZW, read back.
      const clear = 1 << min; const eoi = clear + 1;
      let codeSize = min + 1; let dict; let prev = null; let cur = 0; let bits = 0; const out = [];
      const reset = () => { dict = Array.from({ length: clear }, (_, i) => [i]); dict.push(null, null); codeSize = min + 1; prev = null; };
      reset();
      outer: for (const byte of data) {
        cur |= byte << bits; bits += 8;
        while (bits >= codeSize) {
          const code = cur & ((1 << codeSize) - 1); cur >>>= codeSize; bits -= codeSize;
          if (code === clear) { reset(); continue; }
          if (code === eoi) break outer;
          const entry = code < dict.length ? dict[code] : [...prev, prev[0]];
          out.push(...entry);
          if (prev) { dict.push([...prev, entry[0]]); if (dict.length === (1 << codeSize) && codeSize < 12) codeSize += 1; }
          prev = entry;
        }
      }
      frames.push({ delay: control.delay, pixels: out.map((i) => (i === control.transparent ? null : table[i])) });
    }
  }
  return { width, height, frames, loops };
}

test('an animated GIF is written that reads back pixel for pixel: colours, see-through, each frame\'s delay, looping', () => {
  const width = 37; const height = 23;
  const frame = (seed) => {
    const rgba = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < width * height; i += 1) {
      const v = (i * 7 + seed * 13) % 19;
      if (v === 0) continue; // see-through
      rgba[i * 4] = (v * 40) % 256; rgba[i * 4 + 1] = (v * 90) % 256; rgba[i * 4 + 2] = (v * 17) % 256; rgba[i * 4 + 3] = 255;
    }
    return rgba;
  };
  const frames = [{ rgba: frame(1), ms: 450 }, { rgba: frame(2), ms: 250 }, { rgba: frame(3), ms: 900 }];
  const back = readGif(gif.encodeGif({ width, height, frames }));
  assert.equal(back.width, width); assert.equal(back.height, height);
  assert.ok(back.loops);
  assert.deepEqual(back.frames.map((f) => f.delay), [45, 25, 90]);
  back.frames.forEach((f, n) => {
    const rgba = frames[n].rgba;
    f.pixels.forEach((px, i) => {
      if (rgba[i * 4 + 3] < 128) assert.equal(px, null, `frame ${n} pixel ${i} should be see-through`);
      else assert.deepEqual(px, [rgba[i * 4], rgba[i * 4 + 1], rgba[i * 4 + 2]], `frame ${n} pixel ${i}`);
    });
  });
});

test('a big busy picture, enough to fill the compression table and start it again, reads back exactly', () => {
  const width = 300; const height = 200;
  const rgba = new Uint8ClampedArray(width * height * 4);
  let s = 3;
  for (let i = 0; i < width * height; i += 1) { s = (s * 1103515245 + 12345) & 0x7fffffff; const v = s % 200; rgba[i * 4] = v; rgba[i * 4 + 1] = 255 - v; rgba[i * 4 + 2] = (v * 3) % 256; rgba[i * 4 + 3] = 255; }
  const back = readGif(gif.encodeGif({ width, height, frames: [{ rgba, ms: 100 }], loop: false }));
  assert.equal(back.loops, false);
  let wrong = 0;
  back.frames[0].pixels.forEach((px, i) => { if (!px || px[0] !== rgba[i * 4] || px[1] !== rgba[i * 4 + 1] || px[2] !== rgba[i * 4 + 2]) wrong += 1; });
  assert.equal(wrong, 0);
});

// ---------------------------------------------------------------- versions

// public-edition: leave out
test('every change keeps what it was before: newest first, a dozen at most, and one brought back makes what it is now a version', () => {
  const made = engine.store.pixelAvatars({ op: 'create', name: 'Versioned' });
  const now = () => engine.snapshot().pixelAvatars.find((a) => a.id === made.id);
  for (let i = 0; i < 15; i += 1) {
    const next = edit.paint(now(), { kind: 'base' }, [[i, 0, 'O']]);
    engine.store.pixelAvatars({ op: 'save', avatar: next });
  }
  // Saving it unchanged keeps no version.
  engine.store.pixelAvatars({ op: 'save', avatar: now() });
  const { versions } = engine.store.pixelAvatars({ op: 'versions', id: made.id });
  assert.equal(versions.length, kept.VERSIONS_KEPT);
  assert.ok(versions.every((v, i) => i === 0 || v.at < versions[i - 1].at), 'newest first, each its own moment');
  assert.equal(versions[0].avatar.base[0].slice(0, 15), 'O'.repeat(14) + '.');
  assert.ok(!('versions' in engine.snapshot()) && !JSON.stringify(engine.snapshot().pixelAvatars).includes('"versions"'), 'versions are not handed to the screens');
  const back = versions[4];
  engine.store.pixelAvatars({ op: 'restore', id: made.id, at: back.at });
  assert.deepEqual(now().base, back.avatar.base);
  const after = engine.store.pixelAvatars({ op: 'versions', id: made.id }).versions;
  assert.equal(after[0].avatar.base[0].slice(0, 15), 'O'.repeat(15), 'what it was before the restore is a version now');
  let refused = null;
  try { engine.store.pixelAvatars({ op: 'restore', id: made.id, at: 1 }); } catch (err) { refused = err.code; }
  assert.equal(refused, 'pixel_avatar_no_version');
  engine.store.pixelAvatars({ op: 'delete', id: made.id });
  engine.store.pixelAvatars({ op: 'create', name: 'Other' });
  assert.deepEqual(engine.store.pixelAvatars({ op: 'versions', id: 'example-shark' }).versions, []);
});
// public-edition: end

// ------------------------------------------------------ alerts and the dock

const docks = await import('../../../shared/dock-builtins.js');

test('an avatar layer keeps what it does at each kind of alert, and a layer that does nothing is written as before', () => {
  const [l] = normaliseLayouts([{ id: 'r', layers: [
    { type: 'avatar', uid: 'a', config: { reactionActions: { raid: 'drink', follow: 'jump!', sub: 'wave' } } },
    { type: 'avatar', uid: 'b', config: { character: 'pa-x', reactionActions: { raid: 'wave', hype: 'BAD' } } },
    { type: 'avatar', uid: 'c', config: {} },
  ] }]);
  const [built, kit, none] = l.layers.map((x) => x.config);
  // public-edition: leave out
  assert.deepEqual(built.reactionActions, { raid: 'drink' }, 'the built-in avatar does only what it can');
  // public-edition: end
  assert.deepEqual(kit.reactionActions, { raid: 'wave' });
  assert.ok(!('reactionActions' in none));
  const layer = fs.readFileSync(new URL('../../web/components/AvatarLayer.tsx', SCRIPT_URL), 'utf8');
  assert.ok(layer.includes('config.reactionActions?.[k]') && layer.includes('setDoing({ name, key: `alert:${alert.id}` })'), 'the layer never plays what it does at an alert');
});

test('something a tab avatar does is a dock button of its own, played on every avatar that does it, and refused when none does', () => {
  const b = docks.dockBuiltin(docks.pixelActionBuiltinId('wave-hello'));
  assert.deepEqual([b.category, b.op, b.name, b.pixel], ['avatar', 'wave-hello', 'Wave hello', true]);
  assert.equal(docks.dockBuiltin('avatar_do:NOT OK'), null);
  assert.equal(docks.dockBuiltin('avatar_drink').op, 'drink', 'the built-in ones are as they were');
});

let { avatar: dockPa } = edit.addAction(pixel.blankPixelAvatar('pa-dock', 'Docky'), { label: 'Wave hello' });
engine.store.pixelAvatars({ op: 'save', avatar: dockPa });
const dockPlayed = await engine.runDockBuiltin('avatar_do:wave-hello');
let dockRefused = null;
try { await engine.runDockBuiltin('avatar_do:juggle'); } catch (err) { dockRefused = err.code; }
const dockBefore = engine.snapshot().dockButtons;
const dockKept = engine.store.setDockButtons([{ id: 'd1', builtin: 'avatar_do:wave-hello' }]);
engine.store.setDockButtons(dockBefore);
engine.store.pixelAvatars({ op: 'delete', id: 'pa-dock' });

test('the dock plays it, refuses what no avatar does, and keeps such a button', () => {
  assert.equal(dockPlayed.ok, true);
  assert.equal(dockRefused, 'avatar_cannot_do');
  assert.ok(JSON.stringify(dockKept).includes('avatar_do:wave-hello'), JSON.stringify(dockKept).slice(0, 200));
});

test('with no pixel avatars, the tab starts with three plain ways in: an example, a picture, or drawing it', () => {
  const view = read('../../web/components/views/PixelAvatarsView.tsx');
  for (const s of ['data-pixel-start', 'data-pixel-start-examples', 'data-pixel-start-from-picture', 'data-pixel-start-draw', 'data-pixel-start-name', 'data-pixel-start-file']) assert.ok(view.includes(s), `${s} is not on the start page`);
  // Started from a picture: opened to draw, the picture brought in its own colours.
  assert.ok(view.includes("setPictureFor(fromPicture ? made.id : '');") && view.includes('startWithPicture={pictureFor === kit.id}'));
  const editor = read('../../web/components/pixel/PixelEditor.tsx');
  assert.ok(editor.includes('useState(startWithPicture)') && editor.includes('ownColours={startWithPicture}'));
  assert.ok(read('../../web/components/pixel/PixelImport.tsx').includes('const [own, setOwn] = useState(startOwn);'));
  const strings = read('../../web/constants.ts');
  for (const key of ['pixelStartTitle', 'pixelStartHint', 'pixelStartExample', 'pixelStartExampleHint', 'pixelStartExampleHintHouse', 'pixelStartExampleGo', 'pixelStartPicture', 'pixelStartPictureHint', 'pixelStartPictureGo', 'pixelStartBlank', 'pixelStartBlankHintStarter', 'pixelStartBlankGo', 'pixelStartName', 'pixelStartNamePlaceholder']) {
    assert.equal(strings.split(`    ${key}: `).length - 1, 2, `${key} is not in both languages`);
  }
});

test('drawing is quicker: brush sizes, right click rubs out, Alt picks, Ctrl and the wheel zoom, Space drags about, keys shown', () => {
  const canvas = read('../../web/components/pixel/PixelCanvas.tsx');
  // Brushes of 1, 2 and 3 for the hand-drawn tools, the outline under the pointer as wide.
  assert.ok(canvas.includes('export function brushCells(') && canvas.includes("const freehand = tool === 'pencil' || tool === 'eraser' || tool === 'restore';"));
  assert.ok(canvas.includes('brushCells(at[0], at[1], size, W, H)') && canvas.includes('brushCells(x, y, size, W, H)'));
  // The right button rubs out with the drawing tools, and no menu opens over the drawing.
  assert.ok(canvas.includes("const v = right ? '_' : value;") && canvas.includes('onContextMenu={(e) => e.preventDefault()}'));
  // Alt and a click picks the colour, whatever the tool.
  assert.ok(canvas.includes('if (e.altKey && !right) {'));
  const editor = read('../../web/components/pixel/PixelEditor.tsx');
  // The wheel's listener is not passive, or the page would zoom instead.
  assert.ok(editor.includes("el.addEventListener('wheel', onWheel, { passive: false });") && editor.includes('if (!(e.ctrlKey || e.metaKey) || !e.deltaY) return;'));
  // Space only over the canvas, so it still presses buttons elsewhere; the middle button too.
  assert.ok(editor.includes("if (k === ' ' && overCanvas.current) { e.preventDefault(); setSpaceHeld(true); return; }") && editor.includes('if (!(spaceHeld || e.button === 1) || !scroller.current) return;'));
  for (const s of ["if (k === '[')", "if (k === ']')", "if (k === '+' || k === '=')", "if (k === '-' || k === '_')"]) assert.ok(editor.includes(s), `${s} is not a key`);
  // Each tool shows its key; every key is listed in one place.
  assert.ok(editor.includes('data-pixel-tool-key') && editor.includes('data-pixel-keys') && editor.includes('data-pixel-brush'));
  // The colours at hand over the canvas, the last ones used first.
  assert.ok(editor.includes('data-pixel-quick-colours') && editor.includes('const chooseColour = (c: string) =>'));
  // The colours column sits beside the canvas from a laptop up, not only on the widest screens.
  assert.ok(editor.includes('md:col-span-2 xl:col-span-1 xl:grid-cols-1') && !editor.includes('2xl:col-span-1'));
  const strings = read('../../web/constants.ts');
  for (const key of ['pixelBrushHint', 'pixelKeys', 'pixelKeysTools', 'pixelKeysRubOut', 'pixelKeysZoom', 'pixelKeysPan', 'pixelRecent', 'pixelAllColours', 'pixelFewerColours']) {
    assert.equal(strings.split(`    ${key}: `).length - 1, 2, `${key} is not in both languages`);
  }
});

test('the head line is dragged on the drawing, and boxes are drawn on it, instead of typing numbers', () => {
  const canvas = read('../../web/components/pixel/PixelCanvas.tsx');
  // Dragged, it shows where it is going and is handed over once, when let go: one step to undo.
  assert.ok(canvas.includes('if (heading && drag.current) { setHeadDrag(headRowAt(e)); return; }') && canvas.includes('const row = headDragNow.current;') && canvas.includes('if (row !== null && row !== headLastRow) onHeadRow?.(row);'));
  assert.ok(canvas.includes('if (boxing) { if (ax !== bx || ay !== by) onPickBox?.([Math.min(ax, bx), Math.min(ay, by), Math.max(ax, bx), Math.max(ay, by)]); return; }'), 'a click makes a box');
  const editor = read('../../web/components/pixel/PixelEditor.tsx');
  assert.ok(!editor.includes('placeholder="x0, y0, x1, y1"'), 'a box is still typed in as numbers');
  assert.ok(!editor.includes('data-pixel-head-row') && !editor.includes('data-pixel-front-head-row'), 'the head line is still a slider');
  for (const s of ['data-pixel-head-move', 'data-pixel-mirror-keep-draw', 'data-pixel-own-face-box', 'data-pixel-setting-on-canvas']) assert.ok(editor.includes(s), `${s} is gone`);
  // Opening something else ends it.
  assert.ok(editor.includes('useEffect(() => { setHeadMoving(headNext.current); headNext.current = false; setBoxPick(null); }, [where]);'));
  const strings = read('../../web/constants.ts');
  assert.equal(strings.split('    pixelMirrorKeepHint: ').length - 1, 0, 'the old typed-box hint is still in the words');
  for (const key of ['pixelHeadMove', 'pixelHeadLineHint', 'pixelHeadMoveHint', 'pixelKeepBoxDraw', 'pixelKeepBoxHint', 'pixelMirrorKeepHintBox', 'pixelOwnFaceBoxDraw', 'pixelOwnFaceBoxHint', 'pixelDone']) {
    assert.equal(strings.split(`    ${key}: `).length - 1, 2, `${key} is not in both languages`);
  }
});

test('a new avatar can start with a simple character, alive from the first save: talking, blinking, the head line under its head', () => {
  const pa = edit.starterPixelAvatar('pa-starter', 'Starter');
  // The server keeps it as it is: a drawing it can draw.
  assert.ok(pixel.cleanPixelAvatar(pa), 'the starter is not an avatar the server keeps');
  assert.deepEqual(pa.faces.map((f) => f.name), ['talking', 'blink', 'blink-half']);
  assert.deepEqual(edit.pixelWarnings(pa), [], 'the starter has something worth a look before it is touched');
  assert.ok(edit.pixelReadySteps(pa).every((s) => s.done), 'the starter is not ready to come alive');
  // Talking opens the mouth; blinking shuts the eyes.
  const rest = pixel.pixelGrid(pa, {});
  assert.notDeepEqual(pixel.pixelGrid(pa, { faces: ['talking'] }), rest);
  assert.notDeepEqual(pixel.pixelGrid(pa, { faces: ['blink'] }), rest);
  // Asked for by the start page; without it, empty as before.
  const made = ask({ op: 'create', name: 'With a body', starter: true });
  assert.ok(made.id, `the starter was refused: ${made.refused} ${made.why}`);
  const kept2 = all().find((a) => a.id === made.id);
  assert.ok(kept2, `not in the list: ${all().length} avatars, ${JSON.stringify(made)}`);
  assert.equal(kept2.faces.length, 3);
  assert.ok(kept2.base.some((r) => /[^.]/.test(r)));
  const madeEmpty = ask({ op: 'create', name: 'Empty' });
  const empty = all().find((a) => a.id === madeEmpty.id);
  assert.ok(empty, `the empty one is not in the list: ${JSON.stringify(madeEmpty)}`);
  assert.ok(empty.base.every((r) => /^\.+$/.test(r)) && empty.faces.length === 0);
  ask({ op: 'delete', id: made.id });
  ask({ op: 'delete', id: empty.id });
});

test('getting it ready: drawn, the head line between head and body, a talking face, a blink — and the front view for one that turns', () => {
  let pa = pixel.blankPixelAvatar('pa-steps', 'Steps');
  const done = () => Object.fromEntries(edit.pixelReadySteps(pa).map((s) => [s.id, s.done]));
  assert.deepEqual(done(), { drawn: false, head: false, talking: false, blink: false });
  // Drawn only above the line: drawn, but nothing moves as a body yet.
  pa = edit.paint(pa, { kind: 'base' }, [[50, 10, 'O']]);
  assert.deepEqual(done(), { drawn: true, head: false, talking: false, blink: false });
  pa = edit.paint(pa, { kind: 'base' }, [[50, 90, 'O']]);
  assert.equal(done().head, true);
  // A face made but empty is not done; drawn in, it is.
  pa = edit.addFace(pa, { name: 'talking' }).avatar;
  assert.equal(done().talking, false);
  pa = edit.paint(pa, { kind: 'face', name: 'talking' }, [[50, 40, 'O']]);
  assert.equal(done().talking, true);
  pa = edit.setTurns(pa, true);
  assert.ok('front' in done(), 'one that turns is not asked for its front view');
  // Set not to split (a prop, a head alone): no head line to place, so nothing nags about it.
  assert.ok(!('head' in Object.fromEntries(edit.pixelReadySteps({ ...pa, split: { ...pa.split, headLastRow: 99 } }).map((x) => [x.id, x.done]))), 'one set not to split is asked to place its head line');
  for (const ex of examples.pixelAvatarExamples()) assert.ok(edit.pixelReadySteps(ex).every((x) => x.done), `the example ${ex.id} is not ready, so its editor nags`);
  const editor = read('../../web/components/pixel/PixelEditor.tsx');
  for (const s of ['data-pixel-ready', 'data-pixel-ready-step', 'data-pixel-ready-hide', 'data-pixel-ready-open', 'data-pixel-ready-done']) assert.ok(editor.includes(s), `${s} is gone`);
  // Said done only for one that was not ready when it was opened.
  assert.ok(editor.includes('const readyAtOpen = useRef(stepsLeft === 0);') && editor.includes('!readyAtOpen.current'));
});

test('the list folds by group with counts, the preview sits over the drawing, and the settings say what they do', () => {
  const editor = read('../../web/components/pixel/PixelEditor.tsx');
  for (const id of ['outfits', 'faces', 'extras', 'hats', 'actions']) assert.ok(editor.includes(`<Group id="${id}"`), `the ${id} group is not foldable`);
  // The group of what is opened unfolds by itself.
  assert.ok(editor.includes('useEffect(() => { if (openGroup && closedGroups.includes(openGroup)) toggleGroup(openGroup); }, [where]);'));
  // Clicks go through the preview to the drawing; its own buttons still take them.
  assert.ok(editor.includes('pointer-events-none absolute top-2') && editor.includes('pointer-events-auto flex border-t'));
  for (const s of ['data-pixel-pip-talk', 'data-pixel-pip-move', 'data-pixel-pip-hide', 'data-pixel-pip-show']) assert.ok(editor.includes(s), `${s} is gone`);
  // Under each setting, what it does; no longer only a tooltip.
  assert.ok(!editor.includes("title={t.pixelPartCarriedHint") && editor.includes('<span className="block text-zinc-600">{t.pixelPartCarriedHint'));
  const view = read('../../web/components/views/PixelAvatarsView.tsx');
  assert.ok(view.includes("start(false, true)") && view.includes('...(starter ? { starter: true } : {})'));
  const strings = read('../../web/constants.ts');
  for (const key of ['pixelGroupOutfitsHint', 'pixelGroupFacesHint', 'pixelGroupExtrasHint', 'pixelGroupHatsHint', 'pixelGroupActionsHint', 'pixelSpecialList', 'pixelReadyTitle', 'pixelReadyLeft', 'pixelReadyDone', 'pixelStepDrawn', 'pixelStepHead', 'pixelStepTalking', 'pixelStepBlink', 'pixelStepFront', 'pixelPipTalk', 'pixelPipShow', 'pixelPartEffect', 'pixelPartOpacityNow', 'pixelStartStarterGo', 'pixelStartBlankHintStarter']) {
    assert.equal(strings.split(`    ${key}: `).length - 1, 2, `${key} is not in both languages`);
  }
});
