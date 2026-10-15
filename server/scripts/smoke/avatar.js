/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Smoke tests: the pixel avatar — that the drawing is the original, pixel
 * for pixel; that its faces and extras stack as they should; its colours;
 * and the layer that puts it on stream, in the voice call and in the
 * SimonSays Default look.
 *
 * Runs in order with the other feature files, on the one engine the harness
 * boots — through scripts/smoke.js, never on its own.
 */

import { SCRIPT_URL, assert, fs, test } from './harness.js';
import { LAYER_TYPES, normaliseLayouts } from './backup-and-layouts.js';

const avatar = await import('../../../shared/avatar.js');
const art = await import('../../../shared/avatar-art.js');
const { PLAYER_COLOURS } = await import('../../../shared/players.js');
const { CSS_LOOKS } = await import('../../../shared/css-presets.js');
const { cleanPictures } = await import('../../platforms/discord-voice.js');

const read = (path) => fs.readFileSync(new URL(path, SCRIPT_URL), 'utf8');

/** Any avatar SVG back into a grid, by its paths' ids. */
function gridOf(svg) {
  const chars = Object.fromEntries(avatar.AVATAR_PARTS.map((p) => [p.id, p.char]));
  const grid = Array.from({ length: 100 }, () => Array(100).fill('.'));
  for (const m of svg.matchAll(/<path id="([^"]+)" fill="[^"]+" d="([^"]*)"/g)) {
    for (const r of m[2].matchAll(/M(\d+) (\d+)h(\d+)v(\d+)h-(\d+)z/g)) {
      const [x, y, w, h] = [+r[1], +r[2], +r[3], +r[4]];
      for (let yy = y; yy < y + h; yy += 1) for (let xx = x; xx < x + w; xx += 1) grid[yy][xx] = chars[m[1]];
    }
  }
  return grid.map((row) => row.join(''));
}

const ORIGINAL = read('../../art/avatar/original.svg');

// ---------------------------------------------------------------- the drawing

test('the avatar is the original drawing, pixel for pixel, in its own fifteen colours', () => {
  assert.deepEqual(avatar.avatarGrid(), gridOf(ORIGINAL));
  const drawn = [...ORIGINAL.matchAll(/<path id="([^"]+)" fill="(#[0-9a-f]{6})"/g)].map((m) => [m[1], m[2]]);
  assert.equal(drawn.length, 15);
  for (const [id, color] of drawn) assert.equal(avatar.AVATAR_PARTS.find((p) => p.id === id)?.color, color, id);
  // And written back out, it is the same drawing again.
  assert.deepEqual(gridOf(avatar.avatarSvg()), gridOf(ORIGINAL));
});

test('every face and extra is drawn on the grid, in colours that exist', () => {
  const chars = new Set([...avatar.AVATAR_PARTS.map((p) => p.char), '.', '_']);
  assert.equal(new Set(avatar.AVATAR_PARTS.map((p) => p.char)).size, avatar.AVATAR_PARTS.length, 'two parts share a character');
  const ownFaces = Object.entries(art.AVATAR_COSTUMES).flatMap(([c, o]) => (o.ownFace ? [[`${c} glasses`, o.ownFace.glasses], ...Object.entries(o.ownFace.expressions).map(([f, p]) => [`${c} ${f}`, p])] : []));
  for (const [name, patches] of [...Object.entries(art.AVATAR_EXPRESSIONS), ...Object.entries(art.AVATAR_EXTRAS), ...ownFaces]) {
    assert.ok(patches.length, `${name} changes nothing`);
    for (const { at: [x, y], rows } of patches) {
      assert.ok(x >= 0 && y >= 0 && x + rows[0].length <= 100 && y + rows.length <= 100, `${name} runs off the grid`);
      assert.ok(rows.every((r) => r.length === rows[0].length), `${name} has ragged rows`);
      for (const c of rows.join('')) assert.ok(chars.has(c), `${name} uses ${c}, which is no colour`);
    }
  }
  for (const face of avatar.AVATAR_EXPRESSIONS_LIST.filter((f) => f !== 'neutral')) {
    assert.notDeepEqual(avatar.avatarGrid(face), avatar.avatarGrid(), `${face} looks like the resting face`);
  }
});

const region = (grid, x0, y0, x1, y1) => grid.slice(y0, y1 + 1).map((r) => r.slice(x0, x1 + 1)).join('\n');
const EYES = [26, 48, 64, 66];
const MOUTH = [40, 68, 54, 76];
const BROW = [26, 38, 40, 47];

test('faces stack: sad, talking and mid-blink is each of them where it belongs', () => {
  const stacked = avatar.avatarGrid(['sad', 'talking', 'blink']);
  assert.equal(region(stacked, ...MOUTH), region(avatar.avatarGrid('talking'), ...MOUTH));
  assert.equal(region(stacked, ...EYES), region(avatar.avatarGrid('blink'), ...EYES));
  assert.equal(region(stacked, ...BROW), region(avatar.avatarGrid('sad'), ...BROW));
  // Unknown faces and extras are ignored rather than breaking the drawing.
  assert.deepEqual(avatar.avatarGrid(['nope'], ['cape']), avatar.avatarGrid());
});

test('extras go over any face, and only one hat at a time', () => {
  const party = avatar.avatarGrid('neutral', ['party-hat']);
  const santa = avatar.avatarGrid('neutral', ['santa-hat']);
  const both = avatar.avatarGrid('neutral', ['party-hat', 'santa-hat']);
  assert.deepEqual(both, santa, 'two hats were worn at once');
  assert.notDeepEqual(party, santa);
  // Blush over a happy face keeps the happy eyes.
  const happyBlush = avatar.avatarGrid('happy', ['blush']);
  assert.equal(region(happyBlush, ...EYES), region(avatar.avatarGrid('happy'), ...EYES));
  assert.ok(happyBlush.join('').includes('R'));
});

// ---------------------------------------------------------------- colours

const green = avatar.avatarColours('layout', { accent: '#22c55e' });
const white = avatar.avatarColours('layout', { accent: '#ffffff' });

test('in the layout colour the hoodie is that colour, and the shading is the drawing\'s', () => {
  assert.equal(green.sudadera, '#22c55e');
  for (const id of avatar.AVATAR_COLOURED) assert.ok(green[id], `${id} did not take the colour`);
  // Skin, hair and outline stay as drawn.
  for (const id of ['piel', 'pelo', 'contorno']) assert.equal(green[id], undefined, `${id} changed colour`);
  // The shadow is darker than the hoodie, as it was drawn.
  const light = (hex) => avatar.hexToHsl(hex)[2];
  assert.ok(light(green['sudadera-sombra']) < light(green.sudadera));
  // A white hoodie does not give white eyes.
  assert.ok(light(white.iris) < 0.7, white.iris);
  // With no layout colour, it is drawn as it was drawn.
  assert.deepEqual(avatar.avatarColours('layout', {}), {});
  assert.deepEqual(avatar.avatarColours('original'), {});
});

test('a crewmate colour is the players list\'s, and night vision greens everything', () => {
  assert.equal(avatar.avatarColours('red').sudadera, PLAYER_COLOURS.red);
  assert.equal(avatar.avatarColours('own', { own: '#123456' }).sudadera, '#123456');
  const night = avatar.avatarColours('night-vision');
  for (const p of avatar.AVATAR_PARTS) {
    const [h, s] = avatar.hexToHsl(night[p.id]);
    assert.ok(Math.abs(h - 110) < 25 || s < 0.05, `${p.id} is not green in night vision: ${night[p.id]}`);
  }
});

// ---------------------------------------------------------------- what it does by itself

test('alerts are reactions by what they are, not where they came from', () => {
  assert.equal(avatar.avatarReactionFor('twitch_sub'), 'sub');
  assert.equal(avatar.avatarReactionFor('youtube_sub_gift_bulk'), 'gift');
  assert.equal(avatar.avatarReactionFor('tiktok_gift'), 'gift');
  assert.equal(avatar.avatarReactionFor('twitch_raid'), 'raid');
  assert.equal(avatar.avatarReactionFor('follow'), 'follow');
  assert.equal(avatar.avatarReactionFor('obs_stream_started'), null);
});

test('the faces now: a reaction replaces the face, talking opens the mouth, and shut eyes do not blink', () => {
  assert.deepEqual(avatar.avatarFacesNow({ expression: 'sad' }), ['sad']);
  assert.deepEqual(avatar.avatarFacesNow({ expression: 'sad', reaction: 'happy', mouthOpen: true }), ['happy', 'talking']);
  assert.deepEqual(avatar.avatarFacesNow({ expression: 'neutral', blinking: true }), ['neutral', 'blink']);
  assert.deepEqual(avatar.avatarFacesNow({ expression: 'happy', blinking: true }), ['happy']);
  assert.deepEqual(avatar.avatarFacesNow({ expression: 'wink', blinking: true }), ['wink']);
});

// ---------------------------------------------------------------- the layer

const [layout] = normaliseLayouts([{
  id: 'av', layers: [
    { type: 'avatar', uid: 'a1', config: {
      expression: 'smug', extras: ['party-hat', 'blush', 'santa-hat', 'cape'], colouring: 'rainbow',
      talkWith: { id: 'not-an-id', name: 'x' }, reactions: { sub: 'wink', raid: 'none', cheer: 'dance' }, label: '  Ya vuelvo  ',
    } },
    { type: 'avatar', uid: 'a2', config: { colouring: 'red', talkWith: { id: '306050655881793586', name: 'I_Am_Simon' }, blink: false } },
  ],
}]);
const [a1, a2] = layout.layers;

test('an avatar layer\'s settings are cleaned on the way in, and a layout can hold several', () => {
  assert.ok(LAYER_TYPES.includes('avatar'));
  assert.equal(layout.layers.length, 2, 'the second avatar layer was dropped');
  assert.equal(a1.config.expression, 'neutral');
  assert.deepEqual(a1.config.extras, ['blush', 'santa-hat']);
  assert.equal(a1.config.colouring, 'layout');
  assert.equal(a1.config.talkWith, null);
  assert.deepEqual(a1.config.reactions, { follow: 'heart-eyes', sub: 'wink', gift: 'star-eyes', cheer: 'surprised', raid: 'none', hype: 'star-eyes' });
  assert.equal(a1.config.label, 'Ya vuelvo');
  assert.equal(a1.config.blink, true);
  assert.equal(a2.config.colouring, 'red');
  assert.deepEqual(a2.config.talkWith, { id: '306050655881793586', name: 'I_Am_Simon' });
  assert.equal(a2.config.blink, false);
  // Placed as a square, not a 400 x 300 box at the corner.
  assert.equal(a1.width, a1.height);
});

test('somebody in the voice call can be drawn as the pixel avatar', () => {
  const pics = cleanPictures({ 306050655881793586: { name: 'Simon', avatar: true }, 123456789: { name: 'x', avatar: 'yes' } });
  assert.deepEqual(pics, { 306050655881793586: { name: 'Simon', avatar: true } });
  const voice = read('../../web/components/VoiceLayer.tsx');
  assert.ok(voice.includes("m.pictures?.avatar === true") && voice.includes('<VoicePixel look={m.pictures?.look} accent={accent}'));
  // The same living avatar, handed a pixel avatar from the tab when the look names one (null for the built-in avatar).
  assert.ok(voice.includes('return <LivingAvatar speaking={speaking} hop={hop} colours={drawn.colours} costume={drawn.costume} extras={drawn.extras} drawing={drawn.drawing} facing={facing} kit={kit}'));
});

test('the avatar layer is on the canvas, in the editor and dressed by SimonSays Default', () => {
  const canvas = read('../../web/components/CanvasStage.tsx');
  assert.ok(canvas.includes("case 'avatar':") && canvas.includes('<AvatarLayer'));
  const editor = read('../../web/components/views/LayoutsView.tsx');
  // The panel, inside the section that lets a layer wear a named avatar.
  assert.ok(editor.includes("type: 'avatar'") && editor.includes('<AvatarLayerSection'));
  const theme = CSS_LOOKS.find((l) => l.id === 'simonsays');
  const looks = theme.objects.filter((o) => o.layerType === 'avatar');
  assert.ok(looks.length >= 3, `SimonSays Default has ${looks.length} avatar looks`);
  for (const look of looks) {
    assert.ok(look.css.includes('--color: var(--overlay-accent, #ffffff);'), `${look.id} does not follow the layout colour`);
    assert.ok(/\[data-avatar="(frame|svg|label)"\]/.test(look.css), `${look.id} names no part of the avatar`);
  }
});

test('the avatar\'s settings are in both languages', () => {
  const strings = read('../../web/constants.ts');
  const panel = read('../../web/components/AvatarLayerPanel.tsx');
  const keys = [...new Set([...panel.matchAll(/t\.(avatar\w+)/g)].map((m) => m[1]))];
  assert.ok(keys.length > 20, `only ${keys.length} strings`);
  for (const key of [...keys, 'voicePicAvatar']) assert.equal(strings.split(`    ${key}:`).length - 1, 2, `${key} is not in both languages`);
});

// ---------------------------------------------------------------- costumes

test('the Link costume is the whole drawing redrawn, with the original face under every expression', () => {
  const link = art.AVATAR_COSTUMES.link;
  assert.equal(link.rows.length, 100);
  const chars = new Set([...avatar.AVATAR_PARTS.map((p) => p.char), '.']);
  for (const row of link.rows) {
    assert.equal(row.length, 100);
    for (const c of row) assert.ok(chars.has(c), `the costume uses ${c}, which is no colour`);
  }
  assert.ok(avatar.AVATAR_COSTUMES_LIST.includes('link'));
  const plain = avatar.avatarGrid('neutral', [], 'link');
  assert.notDeepEqual(plain, avatar.avatarGrid(), 'the costume changed nothing');
  // The face regions are the original's, so every face lands the same way.
  for (const face of ['blink', 'talking', 'happy', 'sad', 'angry']) {
    const worn = avatar.avatarGrid(face, [], 'link');
    const bare = avatar.avatarGrid(face);
    assert.equal(region(worn, ...EYES), region(bare, ...EYES), `${face}: the eyes moved`);
    assert.equal(region(worn, ...MOUTH), region(bare, ...MOUTH), `${face}: the mouth moved`);
  }
  // It has its own cap, so no other hat goes on top of it.
  assert.deepEqual(avatar.avatarGrid('neutral', ['santa-hat'], 'link'), plain);
  assert.equal(avatar.avatarHatWorn(['santa-hat'], 'link'), null, 'a drawn hat goes on over its cap');
  assert.ok(fs.existsSync(new URL('../../art/avatar/link-source.jpg', SCRIPT_URL)), 'the picture it was traced from is not kept');
  assert.ok(fs.existsSync(new URL('../../art/avatar/maid-source.jpg', SCRIPT_URL)), 'the maid picture it was traced from is not kept');
  assert.ok(avatar.AVATAR_COSTUMES_LIST.includes('maid'));
  const [l] = normaliseLayouts([{ id: 'c', layers: [{ type: 'avatar', config: { costume: 'link' } }, { type: 'avatar', config: { costume: 'batman' } }] }]);
  assert.deepEqual(l.layers.map((x) => x.config.costume), ['link', '']);
});

test('a closed eye takes its lash line above the glasses with it, in every outfit', () => {
  // The upper lash sits in the rows just above the frame, outside the lens — or, behind round
  // glasses, in the two rows the original's frame used to cover.
  const lashes = (g) => {
    let n = 0;
    for (let y = 49; y <= 55; y += 1) for (const [a, b] of [[28, 37], [55, 61]]) for (let x = a; x <= b; x += 1) if ('Or'.includes(g[y][x])) n += 1;
    return n;
  };
  for (const costume of avatar.AVATAR_COSTUMES_LIST) {
    assert.ok(lashes(avatar.avatarGrid('neutral', [], costume)) > 30, `${costume || 'hoodie'}: no lashes to begin with`);
    assert.ok(lashes(avatar.avatarGrid('neutral', [], costume, { half: true })) < 3, `${costume || 'hoodie'}: half-shut kept its lashes`);
    for (const face of ['blink', 'happy']) assert.equal(lashes(avatar.avatarGrid(face, [], costume)), 0, `${costume || 'hoodie'} ${face}: the lashes stayed open`);
    // Winking shuts the right eye only.
    const wink = avatar.avatarGrid('wink', [], costume);
    let right = 0; for (let y = 49; y <= 55; y += 1) for (let x = 55; x <= 61; x += 1) if ('Or'.includes(wink[y][x])) right += 1;
    assert.equal(right, 0, `${costume || 'hoodie'} wink: the shut eye kept its lashes`);
  }
});

test('the resting eyes glance, half-shut and twinkle, and a face with eyes of its own keeps them', () => {
  for (const costume of avatar.AVATAR_COSTUMES_LIST) {
    const rest = avatar.avatarGrid('neutral', [], costume);
    const eyes = (e, face = 'neutral') => region(avatar.avatarGrid(face, [], costume, e), ...EYES);
    for (const look of ['centre', 'left', 'up', 'up-left']) assert.notEqual(eyes({ look }), region(rest, ...EYES), `${costume || 'hoodie'}: looking ${look} moved nothing`);
    assert.equal(eyes({ look: 'right' }), region(rest, ...EYES), 'looking the way it was drawn changed the drawing');
    for (const sparkle of ['small', 'big']) assert.notEqual(eyes({ sparkle }), region(rest, ...EYES), `the sparkle did not get ${sparkle}`);
    const half = avatar.avatarGrid('neutral', [], costume, { half: true });
    assert.notEqual(region(half, ...EYES), region(rest, ...EYES));
    // Glancing moves the eyes, never the mouth or anything outside them.
    const glance = avatar.avatarGrid(['neutral', 'talking'], [], costume, { look: 'left', sparkle: 'big' });
    assert.equal(region(glance, ...MOUTH), region(avatar.avatarGrid('talking', [], costume), ...MOUTH));
    // Sad has eyes of its own: it neither glances nor half-shuts.
    assert.equal(eyes({ look: 'left', half: true }, 'sad'), region(avatar.avatarGrid('sad', [], costume), ...EYES));
  }
  const [l] = normaliseLayouts([{ id: 'e', layers: [{ type: 'avatar', config: {} }, { type: 'avatar', config: { glance: false, twinkle: false } }] }]);
  assert.deepEqual(l.layers.map((x) => [x.config.glance, x.config.twinkle]), [[true, true], [false, false]]);
});

test('reactions have eyes of their own: stars, hearts and spirals, in every outfit, and they do not blink', () => {
  for (const face of ['star-eyes', 'heart-eyes', 'dizzy']) {
    assert.ok(avatar.AVATAR_EXPRESSIONS_LIST.includes(face));
    for (const costume of avatar.AVATAR_COSTUMES_LIST) {
      assert.notEqual(region(avatar.avatarGrid(face, [], costume), ...EYES), region(avatar.avatarGrid('neutral', [], costume), ...EYES), `${face} changed no eyes`);
    }
    assert.deepEqual(avatar.avatarFacesNow({ expression: face, blinking: true }), [face], `${face} blinks`);
  }
  const grid = avatar.avatarGrid('star-eyes').join('');
  assert.ok(grid.includes('Y'), 'the stars are not gold');
  assert.ok(avatar.avatarGrid('heart-eyes').join('').includes('N'), 'the hearts are not red');
});

test('the avatar looks toward where something happens on the canvas', () => {
  const me = { x: 1500, y: 700, width: 320, height: 320 };
  const at = (x, y) => avatar.avatarLookToward(me, { x, y, width: 100, height: 100 });
  assert.equal(at(40, 750), 'left');
  assert.equal(at(40, 100), 'up-left');
  assert.equal(at(1610, 50), 'up');
  assert.equal(at(1610, 1000), 'down');
  assert.equal(at(1200, 1000), 'down-left');
  assert.equal(at(1880, 810), 'right');
  assert.equal(avatar.avatarLookToward(me, { x: 0, y: 0, width: 1920, height: 1080 }), 'up-left');
  assert.equal(avatar.avatarLookToward(me, { x: 1560, y: 760, width: 200, height: 200 }), 'centre');
  for (const look of ['down', 'down-left']) {
    assert.notEqual(region(avatar.avatarGrid('neutral', [], '', { look }), ...EYES), region(avatar.avatarGrid(), ...EYES), `looking ${look} moved nothing`);
  }
  const canvas = read('../../web/components/CanvasStage.tsx');
  assert.ok(canvas.includes('happenings={{') && canvas.includes('layers={layers}'), 'the avatar is not told what happens or where');
  const [l] = normaliseLayouts([{ id: 'w', layers: [{ type: 'avatar', config: {} }, { type: 'avatar', config: { watch: false } }] }]);
  assert.deepEqual(l.layers.map((x) => x.config.watch), [true, false]);
});

test('three things to look at within a second and a half make it dizzy', () => {
  const now = 10000;
  assert.equal(avatar.avatarOverwhelmed([now - 1400, now - 700, now], now), true);
  assert.equal(avatar.avatarOverwhelmed([now - 1600, now - 700, now], now), false, 'one of them was too long ago');
  assert.equal(avatar.avatarOverwhelmed([now - 200, now], now), false, 'two is not too much');
  const layer = read('../../web/components/AvatarLayer.tsx');
  assert.ok(layer.includes("forced || (dizzy ? 'dizzy' : null) || reacted.face"), 'an alert face covers the dizziness, or it covers an action');
  assert.ok(layer.includes('lastChatTried'), 'a busy chat alone could make it dizzy');
  const [l] = normaliseLayouts([{ id: 'o', layers: [{ type: 'avatar', config: {} }, { type: 'avatar', config: { overwhelm: false } }] }]);
  assert.deepEqual(l.layers.map((x) => x.config.overwhelm), [true, false]);
});

test('how many things at once make it dizzy is three to six', () => {
  const [l] = normaliseLayouts([{ id: 'n', layers: [3, 5, 1, 99, 'x'].map((n) => ({ type: 'avatar', config: { overwhelmCount: n } })) }]);
  assert.deepEqual(l.layers.map((x) => x.config.overwhelmCount), [3, 5, 3, 6, 3]);
  const now = 5000;
  const four = [now - 900, now - 600, now - 300, now];
  assert.equal(avatar.avatarOverwhelmed(four, now, { count: 5 }), false);
  assert.equal(avatar.avatarOverwhelmed(four, now, { count: 4 }), true);
  assert.ok(read('../../web/components/AvatarLayer.tsx').includes('avatarOverwhelmed(tried.current, at, { count })'), 'the layer ignores its own number');
});

test('sleepy: half-lidded with z\'s over any outfit, dozing off when quiet and woken by talking', () => {
  assert.ok(avatar.AVATAR_EXPRESSIONS_LIST.includes('sleepy'));
  for (const costume of avatar.AVATAR_COSTUMES_LIST) {
    const rest = avatar.avatarGrid('neutral', [], costume);
    const sleepy = avatar.avatarGrid('sleepy', [], costume);
    assert.ok(sleepy.join('').includes('Z'), `${costume || 'hoodie'}: no z's`);
    assert.notEqual(region(sleepy, ...EYES), region(rest, ...EYES), 'the eyes stayed wide open');
    // The z's go over the outfit: everything but them and the eyes is the outfit, untouched (Link's cap included).
    let changed = 0;
    for (let y = 0; y < 100; y += 1) for (let x = 0; x < 100; x += 1) {
      const inEyes = y >= 48 && y <= 66 && ((x >= 26 && x <= 40) || (x >= 51 && x <= 64));
      if (!inEyes && sleepy[y][x] !== rest[y][x] && !'ZO'.includes(sleepy[y][x])) changed += 1;
    }
    assert.equal(changed, 0, `${costume || 'hoodie'}: sleepy painted over the outfit`);
  }
  assert.equal(avatar.avatarRestingFace('neutral', { asleep: true }), 'sleepy');
  assert.equal(avatar.avatarRestingFace('neutral', { asleep: true, speaking: true }), 'neutral');
  assert.equal(avatar.avatarRestingFace('sleepy', {}), 'sleepy', 'a BRB avatar set to sleep is not asleep');
  assert.equal(avatar.avatarRestingFace('sleepy', { speaking: true }), 'neutral', 'talking did not wake it');
  assert.equal(avatar.avatarRestingFace('sad', { asleep: false }), 'sad');
  const [l] = normaliseLayouts([{ id: 's', layers: [0, 5, 7, 'x'].map((n) => ({ type: 'avatar', config: { sleepAfter: n } })) }]);
  assert.deepEqual(l.layers.map((x) => x.config.sleepAfter), [0, 5, 3, 3]);
});

test('on an outfit, a face paints only what it changes: the anger mark leaves the maid\'s headdress alone', () => {
  const [x0, y0] = art.AVATAR_EXPRESSIONS.angry.find((p) => p.rows.join('').includes('V')).at;
  for (const costume of avatar.AVATAR_COSTUMES_LIST.filter(Boolean)) {
    const rest = avatar.avatarGrid('neutral', [], costume);
    const angry = avatar.avatarGrid('angry', [], costume);
    let painted = 0;
    for (let y = y0; y < y0 + 13; y += 1) for (let x = x0; x < x0 + 13; x += 1) if (angry[y][x] !== rest[y][x] && angry[y][x] !== 'V') painted += 1;
    assert.equal(painted, 0, `${costume}: the mark brought the original's hair with it`);
  }
  // Faces laid one over another still replace each other's regions outright.
  assert.equal(region(avatar.avatarGrid(['surprised', 'blink'], [], 'maid'), ...EYES), region(avatar.avatarGrid('blink', [], 'maid'), ...EYES));
});

test('the waiter look: the streamer\'s new style on this grid, with round glasses no face takes off', () => {
  const waiter = art.AVATAR_COSTUMES.waiter;
  const chars = new Set([...avatar.AVATAR_PARTS.map((p) => p.char), '.']);
  assert.equal(waiter.rows.length, 100);
  for (const row of waiter.rows) {
    assert.equal(row.length, 100);
    for (const c of row) assert.ok(chars.has(c), `the waiter look uses ${c}, which is no colour`);
  }
  assert.ok(avatar.AVATAR_COSTUMES_LIST.includes('waiter'));
  assert.ok(fs.existsSync(new URL('../../art/avatar/waiter-source.jpg', SCRIPT_URL)), 'the picture it was traced from is not kept');
  const rest = avatar.avatarGrid('neutral', [], 'waiter');
  const frames = [];
  rest.forEach((row, y) => [...row].forEach((c, x) => { if (c === 'o') frames.push([x, y]); }));
  assert.ok(frames.length > 90, 'no round glasses');
  const [a, b, c, d] = waiter.ownFace.region;
  const looks = [{}, { look: 'left' }, { look: 'up-left' }, { half: true }, { sparkle: 'big' }];
  for (const face of avatar.AVATAR_EXPRESSIONS_LIST) {
    for (const eyes of looks) for (const faces of [[face], [face, 'talking', 'blink']]) {
      const g = avatar.avatarGrid(faces, ['blush', 'sweat'], 'waiter', eyes);
      for (const [x, y] of frames) assert.equal(g[y][x], 'o', `${faces.join('+')}: a frame came off at ${x},${y}`);
      // Not a pixel of the original's thick frames, anywhere in its face.
      for (let y = b; y <= d; y += 1) assert.ok(!g[y].slice(a, c + 1).includes('L'), `${faces.join('+')}: the original's glasses showed through`);
    }
    // Its own face stays inside its face.
    for (const p of waiter.ownFace.expressions[face] || []) {
      assert.ok(p.at[0] >= a && p.at[1] >= b && p.at[0] + p.rows[0].length - 1 <= c && p.at[1] + p.rows.length - 1 <= d, `${face} reaches outside its face`);
    }
    // Its mouth is the original's, so every mouth lands the same way.
    assert.equal(region(avatar.avatarGrid(face, [], 'waiter'), ...MOUTH), region(avatar.avatarGrid(face), ...MOUTH), `${face}: the mouth moved`);
  }
  // Behind the round frames are the original's eyes, and they glance the same way.
  const box = (g) => [[27, 39], [52, 63]].map(([x0, x1]) => g.slice(56, 65).map((r) => r.slice(x0, x1 + 1)).join('\n')).join('\n\n');
  for (const eyes of [{}, { look: 'left' }, { look: 'up' }, { sparkle: 'small' }]) {
    // (The original's frame, where it strays into those boxes, is skin behind round glasses.)
    assert.equal(box(avatar.avatarGrid('neutral', [], 'waiter', eyes)), box(avatar.avatarGrid('neutral', [], '', eyes)).replace(/[LS]/g, 'P'), JSON.stringify(eyes));
  }
  // Every face whose eyes or brows move has them drawn for this look.
  for (const face of avatar.AVATAR_EXPRESSIONS_LIST.filter((f) => !['neutral', 'talking'].includes(f))) {
    assert.ok(waiter.ownFace.expressions[face]?.length, `${face} has no eyes on the waiter look`);
  }
  for (const face of ['surprised', 'sad', 'angry']) {
    assert.notEqual(region(avatar.avatarGrid(face, [], 'waiter'), 24, 42, 38, 48), region(rest, 24, 42, 38, 48), `${face}: the brow did not move`);
  }
  // No headwear of its own: a hat goes on.
  assert.notDeepEqual(avatar.avatarGrid('neutral', ['santa-hat'], 'waiter'), rest);
  assert.equal(avatar.avatarHatWorn(['santa-hat'], 'waiter'), 'santa-hat');
  // Named in both languages beside its art, which the panel shows.
  assert.ok(avatar.AVATAR_OUTFIT_NAMES.waiter?.en && avatar.AVATAR_OUTFIT_NAMES.waiter?.es, 'the outfit is not named in both languages');
});

test('quiet twice as long and it falls fast asleep: shut eyes, open mouth, big z\'s and a bubble at its nose', () => {
  assert.ok(avatar.AVATAR_EXPRESSIONS_LIST.includes('deep-sleep'));
  // Dozing at the minutes set, fast asleep at twice them, never at 0.
  const min = 60000;
  assert.equal(avatar.avatarSleepState(2.9 * min, 3), 'awake');
  assert.equal(avatar.avatarSleepState(3 * min, 3), 'dozing');
  assert.equal(avatar.avatarSleepState(5.9 * min, 3), 'dozing');
  assert.equal(avatar.avatarSleepState(6 * min, 3), 'deep');
  assert.equal(avatar.avatarSleepState(99 * min, 0), 'awake');
  assert.equal(avatar.avatarRestingFace('neutral', { asleep: true, deep: true }), 'deep-sleep');
  assert.equal(avatar.avatarRestingFace('sleepy', { asleep: true, deep: true }), 'deep-sleep', 'a BRB avatar set to sleep never slept deeper');
  assert.equal(avatar.avatarRestingFace('neutral', { asleep: true, deep: true, speaking: true }), 'neutral', 'talking did not wake it');
  assert.equal(avatar.avatarRestingFace('deep-sleep', {}), 'deep-sleep');
  assert.equal(avatar.avatarRestingFace('deep-sleep', { speaking: true }), 'neutral');
  // Its eyes are shut, so it does not blink.
  assert.deepEqual(avatar.avatarFacesNow({ expression: 'deep-sleep', blinking: true }), ['deep-sleep']);
  for (const costume of avatar.AVATAR_COSTUMES_LIST) {
    const rest = avatar.avatarGrid('neutral', [], costume);
    const deep = avatar.avatarGrid('deep-sleep', [], costume);
    const sleepy = avatar.avatarGrid('sleepy', [], costume);
    assert.notEqual(region(deep, ...EYES), region(sleepy, ...EYES), `${costume || 'hoodie'}: no different from sleepy`);
    assert.notEqual(region(deep, ...MOUTH), region(rest, ...MOUTH), `${costume || 'hoodie'}: the mouth stayed shut`);
    assert.ok(deep.join('').split('Z').length > sleepy.join('').split('Z').length, `${costume || 'hoodie'}: the z's are no bigger`);
    // Only the eyes, the mouth and the z's change; the outfit is untouched.
    let changed = 0;
    for (let y = 0; y < 100; y += 1) for (let x = 0; x < 100; x += 1) {
      const inFace = (y >= 48 && y <= 66 && ((x >= 25 && x <= 41) || (x >= 48 && x <= 65))) || (y >= 68 && y <= 76 && x >= 40 && x <= 54);
      if (!inFace && deep[y][x] !== rest[y][x] && !'ZO'.includes(deep[y][x])) changed += 1;
    }
    assert.equal(changed, 0, `${costume || 'hoodie'}: fast asleep painted over the outfit`);
  }
  // The bubble grows through its sizes and is drawn over the face, see-through, not into it.
  const sizes = art.AVATAR_BUBBLE.map((f) => f.rows.length);
  assert.deepEqual(sizes, [...sizes].sort((a, b) => a - b));
  assert.ok(Object.keys(avatar.avatarBubblePaths(4)).includes('burbuja'));
  assert.deepEqual(avatar.avatarBubblePaths(0), {});
  assert.ok(avatar.AVATAR_PARTS.find((p) => p.id === 'burbuja').opacity < 1);
  assert.ok(Math.max(...avatar.AVATAR_BUBBLE_BREATH) === art.AVATAR_BUBBLE.length && avatar.AVATAR_BUBBLE_BREATH.includes(0));
  const layer = read('../../web/components/AvatarLayer.tsx');
  assert.ok(layer.includes("deep: sleep === 'deep'"), 'the layer never sleeps deeper');
  assert.ok(layer.includes('simonsaysAvatarSnore') && layer.includes('bubble={snoring ?'), 'fast asleep does not breathe');
  assert.ok(read('../../web/components/PixelAvatar.tsx').includes('avatarBubblePaths(deep ? bubble : 0)'), 'the bubble is not drawn');
});

test('the mouth opens as wide as the voice is loud: a little, normally, or wide', () => {
  const size = (g) => g.slice(68, 77).map((r) => r.slice(40, 55)).join('').split('').filter((c) => 'bl'.includes(c)).length;
  const open = (voice) => avatar.avatarGrid(avatar.avatarFacesNow({ expression: 'neutral', mouthOpen: true, voice }));
  assert.ok(size(open('soft')) > 0 && size(open('soft')) < size(open('normal')) && size(open('normal')) < size(open('loud')), 'the sizes do not grow with the voice');
  assert.deepEqual(avatar.avatarFacesNow({ expression: 'sad', mouthOpen: true, voice: 'loud' }), ['sad', 'talking-loud']);
  assert.deepEqual(avatar.avatarFacesNow({ expression: 'sad', mouthOpen: false, voice: 'loud' }), ['sad']);
  // On every outfit, only the mouth changes.
  for (const costume of avatar.AVATAR_COSTUMES_LIST) {
    for (const f of ['talking-soft', 'talking-loud']) {
      const g = avatar.avatarGrid(['neutral', f], [], costume);
      const rest = avatar.avatarGrid('neutral', [], costume);
      g.forEach((row, y) => [...row].forEach((c, x) => { if (c !== rest[y][x]) assert.ok(y >= 68 && y <= 76 && x >= 40 && x <= 54, `${costume || 'hoodie'} ${f} changed ${x},${y}`); }));
    }
  }
});

test('startled awake: an alert that lands while it sleeps jolts it up with a "!" first', () => {
  assert.ok(avatar.AVATAR_EXPRESSIONS_LIST.includes('startled'));
  for (const costume of avatar.AVATAR_COSTUMES_LIST) {
    const startled = avatar.avatarGrid('startled', [], costume);
    assert.ok(startled.join('').includes('9'), `${costume || 'hoodie'}: no "!"`);
    // Its eyes and mouth are surprised's.
    assert.equal(region(startled, ...EYES), region(avatar.avatarGrid('surprised', [], costume), ...EYES), `${costume || 'hoodie'}: not surprised's eyes`);
    assert.equal(region(startled, ...MOUTH), region(avatar.avatarGrid('surprised', [], costume), ...MOUTH));
  }
  assert.deepEqual(avatar.AVATAR_SLEEP_FACES, ['sleepy', 'deep-sleep']);
  const layer = read('../../web/components/AvatarLayer.tsx');
  assert.ok(layer.includes("const startled = useStartle((AVATAR_SLEEP_FACES as string[]).includes(resting), wakeKey);"), 'nothing startles it');
  assert.ok(layer.includes("(startled ? 'startled' : null) || forced"), 'the startle does not come first');
  assert.ok(layer.includes('if (!wakeKey || was || !asleep) return undefined;'), 'it is startled when it is not asleep, or by one alert after another');
  assert.ok(layer.includes('simonsaysAvatarStartle') && read('../../web/components/PixelAvatar.tsx').includes('simonsaysAvatarBang'), 'the startle does not jolt');
});

test('coloured eyes match the colour without glowing', () => {
  /*
    The eyes took a colour's hue and all of its vividness, scaled up by how
    much more vivid it was than the muted purple the hoodie was drawn in, so
    nearly every colour gave irises at full saturation — and a yellow six
    times as bright as the eyes as drawn. They looked lit from inside.

    They still take the hue, so they still match. They take part of the
    vividness, and half of whatever brightness a colour would add over the
    drawn eyes. Not none of it: a yellow held to the drawing's own brightness
    was olive, and an orange was brown — dim, but no longer the colour.
  */
  const drawn = avatar.avatarLuminance('#8c58af');
  const hue = (hex) => avatar.hexToHsl(hex)[0];
  const apart = (a, b) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b));
  const colours = { accent: '#f43f5e', ...PLAYER_COLOURS };
  for (const [name, hex] of Object.entries(colours)) {
    const eyes = avatar.avatarInColour(hex);
    for (const id of ['iris', 'iris-claro', 'reflejo']) {
      assert.ok(avatar.hexToHsl(eyes[id])[1] <= avatar.AVATAR_EYE_VIVIDNESS + 0.02,
        `${name}: ${id} ${eyes[id]} is more vivid than the eyes may be`);
    }
    // The iris is the colour's own hue, wherever the colour has one.
    if (avatar.hexToHsl(hex)[1] > 0.3) {
      assert.ok(apart(hue(eyes.iris), hue(hex)) < 8, `${name}: the iris ${eyes.iris} is not ${hex}'s colour`);
    }
  }
  // Dimmer: the layout's pink is about as bright as the drawn eyes now, where it was 1.38 times.
  assert.ok(avatar.avatarLuminance(avatar.avatarInColour('#f43f5e').iris) < drawn * 1.15, 'the pink eyes still glare');
  // But a yellow stays yellow rather than going olive.
  const yellow = avatar.avatarLuminance(avatar.avatarInColour(PLAYER_COLOURS.yellow).iris);
  assert.ok(yellow > drawn * 1.8 && yellow < drawn * 3.5, `a yellow iris at ${(yellow / drawn).toFixed(2)} times the drawn brightness is olive or glaring`);
  // This only ever dims: a colour darker than the drawing keeps what it had.
  const blue = avatar.avatarInColour(PLAYER_COLOURS.blue).iris;
  assert.ok(avatar.avatarLuminance(blue) < drawn, `the blue iris ${blue} was made brighter`);
});

test('Mega Simon: the original head exactly, over a suit traced from the streamer\'s picture', () => {
  const mega = art.AVATAR_COSTUMES.mega;
  const chars = new Set([...avatar.AVATAR_PARTS.map((p) => p.char), '.']);
  assert.equal(mega.rows.length, 100);
  for (const row of mega.rows) {
    assert.equal(row.length, 100);
    for (const c of row) assert.ok(chars.has(c), `Mega Simon uses ${c}, which is no colour`);
  }
  assert.ok(avatar.AVATAR_COSTUMES_LIST.includes('mega'));
  assert.ok(fs.existsSync(new URL('../../art/avatar/mega-source.jpg', SCRIPT_URL)), 'the picture it was traced from is not kept');
  /*
    The head is the original's rows, 0 to 76, exactly. The picture's head was
    the original redrawn — it differed only in single cells of JPEG noise at
    colour edges — and taking the original's guarantees every face lands.
  */
  for (let y = 0; y <= 76; y += 1) assert.equal(mega.rows[y], art.AVATAR_BASE[y], `row ${y} of the head is not the original's`);
  for (const face of avatar.AVATAR_EXPRESSIONS_LIST) {
    const worn = avatar.avatarGrid([face, 'talking-loud'], [], 'mega');
    const bare = avatar.avatarGrid([face, 'talking-loud']);
    assert.equal(region(worn, ...EYES), region(bare, ...EYES), `${face}: the eyes moved`);
    assert.equal(region(worn, ...MOUTH), region(bare, ...MOUTH), `${face}: the mouth moved`);
  }
  // Nothing covers the head, so a hat goes on.
  assert.notDeepEqual(avatar.avatarGrid('neutral', ['santa-hat'], 'mega'), avatar.avatarGrid('neutral', [], 'mega'), 'a hat would not go on');
  assert.equal(avatar.avatarHatWorn(['santa-hat'], 'mega'), 'santa-hat', 'a hat would not go on');
  // The suit is there: both the armour and the body, in their three tones each.
  const worn = avatar.avatarGrid('neutral', [], 'mega').join('');
  for (const c of '#@*%=+') assert.ok(worn.split(c).length - 1 > 30, `the suit has hardly any of ${c}`);
  // Named on the panel, in both languages, and something viewers can ask for.
  assert.ok(avatar.AVATAR_OUTFIT_NAMES.mega?.en && avatar.AVATAR_OUTFIT_NAMES.mega?.es, 'the outfit is not named in both languages');
  for (const c of avatar.AVATAR_COSTUMES_LIST) assert.ok(avatar.AVATAR_OUTFIT_NAMES[c]?.en && avatar.AVATAR_OUTFIT_NAMES[c]?.es, `${c || 'the outfit it was drawn in'} has no name`);
  for (const said of ['mega', 'megaman', 'ponte el traje de megaman', 'Mega Simon']) {
    assert.equal(avatar.avatarDressName('outfit', said), 'mega', `"${said}" does not dress it as Mega Simon`);
  }
});

test('Mega Simon\'s suit takes the layout\'s colour and stays two colours', () => {
  /*
    Mega Man's armour changes with whatever power he has copied, so the suit
    follows the layout's colour the way the hoodie does. As drawn, it is blue.
  */
  const suit = ['traje-sombra', 'traje', 'traje-brillo', 'cuerpo-sombra', 'cuerpo', 'cuerpo-brillo'];
  for (const id of suit) assert.ok(avatar.AVATAR_COLOURED.includes(id), `${id} does not take the colour`);
  const hue = (hex) => avatar.hexToHsl(hex)[0];
  const apart = (a, b) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b));
  const pink = avatar.avatarInColour('#f43f5e');
  for (const id of suit) assert.ok(apart(hue(pink[id]), hue('#f43f5e')) < 8, `${id} is ${pink[id]}, not the layout's pink`);
  /*
    As drawn, the armour and the body are told apart mostly by hue, blue
    against cyan, and one colour has only one hue — so in pink, red or orange
    the suit came out a single flat colour. The body keeps how many times
    brighter than the armour it was drawn instead, the way Mega Man's own
    power suits make the body a far lighter tint of the armour's colour.
  */
  const lum = avatar.avatarLuminance;
  const drawn = lum('#6fcfdd') / lum('#3d75ca');
  for (const [name, hex] of [['pink', '#f43f5e'], ['red', PLAYER_COLOURS.red], ['green', PLAYER_COLOURS.green], ['purple', PLAYER_COLOURS.purple]]) {
    const c = avatar.avatarInColour(hex);
    const ratio = lum(c.cuerpo) / lum(c.traje);
    assert.ok(Math.abs(ratio - drawn) / drawn < 0.12, `${name}: the body is ${ratio.toFixed(2)} times as bright as the armour, drawn ${drawn.toFixed(2)}`);
  }
  /*
    A bright colour runs out of room above it: yellow armour is already 93%
    as bright as white, so the body cannot be three times brighter. It goes
    as pale as it can instead — yellow against cream — which is still two
    colours, told apart by how much colour is in them rather than by light.
  */
  const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const yellow = avatar.avatarInColour(PLAYER_COLOURS.yellow);
  const gap = Math.hypot(...rgb(yellow.cuerpo).map((v, i) => v - rgb(yellow.traje)[i]));
  assert.ok(gap > 80, `in yellow the body ${yellow.cuerpo} and armour ${yellow.traje} are one colour`);
});

test('the avatar splits into head, body and what it carries, and at rest they are the drawing exactly', () => {
  /*
    Awake and quiet, not a pixel of it moved but the eyes, and it read as
    stiff. To breathe and turn, the head and the body move apart, so the
    drawing is drawn as three groups. At rest they must add up to the drawing
    with nothing lost and nothing doubled — every outfit, face and extra.
  */
  for (const costume of avatar.AVATAR_COSTUMES_LIST) {
    for (const face of avatar.AVATAR_EXPRESSIONS_LIST) {
      for (const extras of [[], ['santa-hat', 'blush', 'mic']]) {
        const grid = avatar.avatarGrid([face, 'talking'], extras, costume);
        const { head, body, carried } = avatar.avatarSplit(grid);
        for (let y = 0; y < 100; y += 1) {
          for (let x = 0; x < 100; x += 1) {
            const here = [head[y][x], body[y][x], carried[y][x]].filter((c) => c !== '.');
            const want = grid[y][x] === '.' ? [] : [grid[y][x]];
            assert.deepEqual(here, want, `${costume || 'hoodie'} ${face}: ${x},${y} is ${JSON.stringify(here)}, drawn ${JSON.stringify(want)}`);
          }
        }
        // The body's last row carries on below the drawing, so rising opens no gap at the bottom.
        assert.equal(body[100], body[99], `${costume || 'hoodie'}: nothing below the body to rise into`);
      }
    }
  }
  // The head is every row a face paints; the body is below it.
  assert.equal(avatar.AVATAR_HEAD_LAST_ROW, 76);
  // Link's sword reaches up past the neck over the shoulder, and is still the body's.
  const link = avatar.avatarSplit(avatar.avatarGrid('neutral', [], 'link'));
  const chars = Object.fromEntries(avatar.AVATAR_PARTS.map((p) => [p.id, p.char]));
  for (const id of avatar.AVATAR_CARRIED) assert.ok(!link.head.join('').includes(chars[id]), `${id} moves with the head`);
  assert.ok(link.carried.slice(0, 77).join('').replace(/\./g, '').length > 50, 'the sword above the shoulder is not the body\'s');
});

test('it breathes: shoulders up, the head a beat after, never the head above the shoulders', () => {
  const breath = avatar.AVATAR_BREATH;
  // The head lifted off the shoulders opens a gap at the neck, so it never happens.
  for (const [bodyUp, headUp] of breath) assert.ok(headUp <= bodyUp, `a phase lifts the head ${headUp} over shoulders at ${bodyUp}`);
  // Up the shoulders lead, down the head leads: rest, shoulders, both, shoulders, rest.
  assert.deepEqual(breath.map(([b, h]) => `${b}${h}`), ['00', '10', '11', '10']);
  // Whole pixels, and lengths that differ breath to breath rather than a metronome.
  for (const [b, h, [lo, hi]] of breath) {
    assert.ok([0, 1].includes(b) && [0, 1].includes(h), 'a breath moves by part of a pixel');
    assert.ok(hi > lo, 'a phase is always the same length');
  }
  const total = breath.reduce((s, [, , [lo, hi]]) => s + (lo + hi) / 2, 0);
  assert.ok(total > 3000 && total < 5000, `one breath takes ${total}ms`);
  assert.ok(avatar.AVATAR_DOZING_BREATH > 1, 'dozing breathes no slower');
  // Fast asleep it has its own sway, and does not breathe this way on top of it.
  const layer = read('../../web/components/AvatarLayer.tsx');
  assert.ok(layer.includes('if (!breathe || deep || '), 'it breathes on top of the snore');
});

test('the head follows the eyes by a pixel, a beat after them, and never lifts', () => {
  assert.deepEqual(avatar.avatarHeadTurn('right'), { x: 0, y: 0 }, 'it turns while looking the way it was drawn');
  for (const look of ['centre', 'left', 'up-left']) assert.equal(avatar.avatarHeadTurn(look).x, -1, `looking ${look}, the head stays`);
  assert.equal(avatar.avatarHeadTurn('down').y, 1, 'looking down, it does not nod');
  assert.equal(avatar.avatarHeadTurn('up').y, 0, 'looking up lifts the head off the shoulders');
  assert.ok(avatar.AVATAR_HEAD_FOLLOW_MS >= 60 && avatar.AVATAR_HEAD_FOLLOW_MS <= 250, 'the head does not follow a beat after the eyes');
});

test('breathing and turning are whole pixels of the drawing, and switch off together', () => {
  const drawn = read('../../web/components/PixelAvatar.tsx');
  // In the drawing's own units, so a pixel of the art moves by exactly one pixel of the art at any size.
  assert.ok(drawn.includes('const bodyAt = `translate(0 ${-(pose?.bodyUp || 0)})`;'), 'the body moves by something other than whole pixels');
  assert.ok(drawn.includes('data-avatar="body"') && drawn.includes('data-avatar="head"') && drawn.includes('data-avatar="carried"'), 'the groups are not named');
  // What it carries is drawn after the head, as the sword is in front of the cap.
  assert.ok(drawn.indexOf('data-avatar="carried"') > drawn.indexOf('data-avatar="head"'), 'the sword is drawn behind the head');
  const [l] = normaliseLayouts([{ id: 'b', layers: [{ type: 'avatar', config: {} }, { type: 'avatar', config: { breathe: false } }] }]);
  assert.deepEqual(l.layers.map((x) => x.config.breathe), [true, false], 'the setting is not kept, or is off unless asked for');
  const layer = read('../../web/components/AvatarLayer.tsx');
  assert.ok(layer.includes('const turn = breathe ? avatarHeadTurn(headLook) : { x: 0, y: 0 };'), 'the head still turns with breathing switched off');
  assert.ok(read('../../web/components/AvatarLayerPanel.tsx').includes('patch({ breathe: v })'), 'there is no switch for it');
  assert.equal(read('../../web/constants.ts').split('    avatarBreathes:').length - 1, 2, 'the switch is not named in both languages');
});

test('dizzy teeters from the feet, two whole rocks to a spell, ending upright', () => {
  /*
    Dizzy was a face on a body that stood perfectly still, where asleep it
    sways. It now teeters from its feet, further one way than the other, and
    the spell a pile-up brings is exactly two rocks so it ends upright rather
    than snapping back from mid-lean.
  */
  assert.equal(avatar.AVATAR_OVERWHELM.dizzyMs % avatar.AVATAR_DIZZY_ROCK_MS, 0, 'the dizzy spell is not a whole number of rocks, so it stops mid-lean');
  const layer = read('../../web/components/AvatarLayer.tsx');
  const teeter = /@keyframes simonsaysAvatarTeeter \{([^']*)\}/.exec(layer);
  assert.ok(teeter, 'there is no teeter');
  assert.ok(/0%, 55%, 100% \{ transform: translateX\(0\) rotate\(0\); \}/.test(teeter[1]), 'a rock does not start and end upright');
  // Uneven: it leans further one way than the other, which is what losing balance looks like.
  const leans = [...teeter[1].matchAll(/rotate\((-?[\d.]+)deg\)/g)].map((m) => Math.abs(Number(m[1])));
  assert.equal(leans.length, 2);
  assert.notEqual(leans[0], leans[1], 'it rocks like a metronome');
  // Only a glass of water in its hand comes before it: a frame is drawn upright.
  assert.ok(layer.includes('animation: acting ? undefined\n          : dizzy ? `simonsaysAvatarTeeter ${AVATAR_DIZZY_ROCK_MS}ms ease-in-out infinite`'), 'the teeter is not what dizzy does first');
  assert.ok(layer.includes("...(snoring || dizzy ? { transformOrigin: '50% 100%' } : {})"), 'it teeters from its middle rather than its feet');
});

test('its head lolls after the teeter in whole pixels, on the teeter\'s own clock', () => {
  const loll = avatar.AVATAR_DIZZY_LOLL;
  const starts = loll.map(([from]) => from);
  assert.deepEqual(starts, [...starts].sort((a, b) => a - b), 'the loll goes back in time');
  assert.ok(starts[0] === 0 && starts[starts.length - 1] < avatar.AVATAR_DIZZY_ROCK_MS, 'the loll is not one rock long');
  for (const [, [x, y]] of loll) {
    assert.ok([-1, 0, 1].includes(x) && [0, 1].includes(y), `the head lolls to ${x},${y}: part of a pixel, or up off the shoulders`);
  }
  assert.deepEqual(avatar.avatarLollAt(0), [0, 0], 'a rock does not start with the head upright');
  // Behind the body: the body leans furthest right at 30% of a rock, and the head gets there after.
  const furthest = loll.find(([, [x, y]]) => x === 1 && y === 1)[0];
  assert.ok(furthest > avatar.AVATAR_DIZZY_ROCK_MS * 0.3, 'the head is not behind the body');
  // The same pose a whole rock later, however long it lasts.
  for (const t of [0, 450, 700, 1200]) assert.deepEqual(avatar.avatarLollAt(t + avatar.AVATAR_DIZZY_ROCK_MS * 7), avatar.avatarLollAt(t), `out of step after seven rocks at ${t}ms`);
  // Read off the clock since it began, so it cannot drift away from the teeter.
  const layer = read('../../web/components/AvatarLayer.tsx');
  assert.ok(layer.includes('const t = (performance.now() - began) % AVATAR_DIZZY_ROCK_MS;'), 'the loll keeps its own time');
});

test('coming to, it shakes its head clear, and it breathes again after', () => {
  const shake = avatar.AVATAR_SHAKE_OFF;
  for (const [, [x, y]] of shake) assert.ok([-1, 0, 1].includes(x) && y === 0, `the shake moves ${x},${y}`);
  assert.deepEqual(shake[shake.length - 1][1], [0, 0], 'the shake does not end still');
  assert.ok(shake.filter(([, [x]]) => x !== 0).length >= 4, 'it does not shake both ways twice');
  assert.ok(shake[shake.length - 1][0] < 500, 'the shake drags on');
  const layer = read('../../web/components/AvatarLayer.tsx');
  assert.ok(layer.includes('if (dizzy || !was) return undefined;'), 'it shakes at something other than coming to');
  // Neither breathing nor following the eyes while it does its own moving.
  assert.ok(layer.includes('if (!breathe || deep || dizzy || shakingOff) { setBreath([0, 0]); return undefined; }'), 'it breathes on top of the wobble');
  assert.ok(layer.includes('const head = dizzy ? { x: loll[0], y: loll[1] } : shakeOff ? { x: shakeOff[0], y: shakeOff[1] } : turn;'), 'the head follows the eyes while dizzy');
});

// ------------------------------------------------------------------- hats

/*
  The hats drawn for it, eight to a sheet, kept as pictures of their own at
  their own pixel size rather than redrawn onto the grid. Each is placed on the
  grid by its top-left corner and the size of one of its pixels there.
*/
const HAT_ART = avatar.AVATAR_HAT_ART;
const DRAWN_HATS = ['wizard-hat', 'deerstalker', 'pirate-hat', 'cat-beanie', 'cowboy-hat', 'santa-hat', 'chef-hat', 'crown'];

test('each drawn hat is a whole picture: square rows, its own colours, its own pixel size', () => {
  assert.deepEqual(Object.keys(HAT_ART), DRAWN_HATS);
  assert.deepEqual(avatar.AVATAR_HATS, ['party-hat', ...DRAWN_HATS], 'the hats offered are not the party hat and the drawn ones');
  for (const [id, hat] of Object.entries(HAT_ART)) {
    const width = hat.rows[0].length;
    assert.ok(hat.rows.every((r) => r.length === width), `${id}: its rows are not all ${width} wide`);
    assert.ok(hat.palette.every((c) => /^#[0-9a-f]{6}$/.test(c)), `${id}: a colour is not a colour`);
    const letters = new Set(hat.rows.join('').replace(/\./g, ''));
    for (const l of letters) assert.ok(l.charCodeAt(0) - 97 < hat.palette.length && l >= 'a', `${id}: "${l}" is not one of its colours`);
    assert.equal(letters.size, hat.palette.length, `${id}: a colour is never used`);
    // Chunkier than the avatar's own pixels, as drawn — not redrawn onto its grid.
    assert.ok(hat.size > 1.4 && hat.size < 1.8, `${id}: its pixels are ${hat.size} of the avatar's`);
    // On the drawing, and above it no further than the room kept there.
    assert.ok(hat.x >= 0 && hat.x + width * hat.size <= 100, `${id}: it runs off the side`);
    assert.ok(hat.y > -avatar.AVATAR_HEADROOM + 1, `${id}: it rises past the room kept above the head`);
    // Its first and last rows and columns are not empty: nothing is placed by blank pixels.
    assert.ok(/[^.]/.test(hat.rows[0]) && /[^.]/.test(hat.rows[hat.rows.length - 1]), `${id}: it has an empty row at an edge`);
    assert.ok(hat.rows.some((r) => r[0] !== '.') && hat.rows.some((r) => r[width - 1] !== '.'), `${id}: it has an empty column at an edge`);
  }
  // The picture they were taken from is kept.
  assert.ok(fs.existsSync(new URL('../../art/avatar/hats-source.jpg', SCRIPT_URL)), 'the hats picture is not kept');
});

test('a hat is drawn as one shape a colour, its pixels meeting edge to edge', () => {
  for (const [id, hat] of Object.entries(HAT_ART)) {
    const paths = avatar.avatarHatPaths(id);
    assert.deepEqual(Object.keys(paths).sort(), [...hat.palette].sort(), `${id}: not one shape per colour`);
    // Every pixel is there: the rectangles along each row add up to its pixels.
    const cells = hat.rows.join('').replace(/\./g, '').length;
    const area = Object.values(paths).join('').match(/M[^Z]+Z/g).reduce((sum, rect) => {
      const [x0, y0, x1, y1] = rect.match(/M(-?[\d.]+) (-?[\d.]+)H(-?[\d.]+)V(-?[\d.]+)/).slice(1).map(Number);
      return sum + (x1 - x0) * (y1 - y0);
    }, 0);
    assert.ok(Math.abs(area - cells * hat.size ** 2) < cells * 0.01, `${id}: ${area} drawn for ${cells * hat.size ** 2}`);
    // Its edges come from one list, so neighbouring pixels meet on the same line with no seam between.
    const xs = new Set(Object.values(paths).join('').match(/[MH](-?[\d.]+)/g).map((m) => m.slice(1)));
    assert.ok(xs.size <= hat.rows[0].length + 1, `${id}: ${xs.size} different edges across ${hat.rows[0].length} pixels`);
  }
  assert.deepEqual(avatar.avatarHatPaths('party-hat'), {}, 'the party hat is still drawn on the grid');
  assert.deepEqual(avatar.avatarHatPaths('nope'), {});
});

test('a hat takes away only the hair poking out of it, never the face, and never covers the eyes', () => {
  const plain = avatar.avatarGrid('neutral');
  for (const [id, hat] of Object.entries(HAT_ART)) {
    for (const patch of hat.hides) assert.ok(patch.rows.every((r) => /^[._]+$/.test(r)), `${id}: its patch draws rather than clears`);
    const worn = avatar.avatarGrid('neutral', [id]);
    plain.forEach((row, y) => [...row].forEach((c, x) => {
      if (worn[y][x] === c) return;
      assert.equal(worn[y][x], '.', `${id}: ${x},${y} is painted, not cleared`);
      assert.ok('OHMmLG'.includes(c), `${id}: it takes away ${c} at ${x},${y}, which is not hair or its outline`);
    }));
    // Whatever the face, the eyes show under the hat.
    for (const face of avatar.AVATAR_EXPRESSIONS_LIST) {
      const grid = avatar.avatarGrid(face);
      grid.forEach((row, y) => [...row].forEach((c, x) => {
        if (!'IiWr'.includes(c)) return;
        const i = Math.floor((x + 0.5 - hat.x) / hat.size); const j = Math.floor((y + 0.5 - hat.y) / hat.size);
        assert.ok((hat.rows[j]?.[i] || '.') === '.', `${id}: it covers the eye at ${x},${y} when ${face}`);
      }));
    }
  }
});

test('one hat at a time, the last asked for, and none over an outfit\'s own headwear', () => {
  assert.equal(avatar.avatarHatWorn(['party-hat', 'wizard-hat']), 'wizard-hat');
  assert.equal(avatar.avatarHatWorn(['crown', 'blush', 'party-hat']), null, 'the party hat is on the grid, not a picture');
  assert.deepEqual(avatar.avatarGrid('neutral', ['crown', 'party-hat']), avatar.avatarGrid('neutral', ['party-hat']), 'the crown still clears hair under the party hat');
  assert.deepEqual(avatar.avatarGrid('neutral', ['party-hat', 'crown']), avatar.avatarGrid('neutral', ['crown']), 'the party hat is drawn under the crown');
  assert.equal(avatar.avatarHatWorn(['blush', 'mic']), null);
  assert.equal(avatar.avatarHatWorn([]), null);
  for (const costume of avatar.AVATAR_HEADWEAR) {
    for (const hat of DRAWN_HATS) {
      assert.equal(avatar.avatarHatWorn([hat], costume), null, `${hat} goes on over ${costume}'s own`);
      assert.deepEqual(avatar.avatarGrid('neutral', [hat], costume), avatar.avatarGrid('neutral', [], costume), `${hat} clears ${costume}'s hair though it is not worn`);
    }
  }
});

test('the marks that float by the head are drawn over a hat, with room above for the tallest', () => {
  const tallest = Math.max(...Object.values(HAT_ART).map((h) => -h.y));
  assert.ok(avatar.AVATAR_HEADROOM >= Math.ceil(tallest) + 1, 'no room for the tallest hat to breathe');
  assert.ok(avatar.AVATAR_HEADROOM <= 6, 'more room than any hat needs');
  // Exported: under the marks, over the rest, and the picture taller only when the hat rises past the top.
  const svg = avatar.avatarSvg({ expression: 'sleepy', extras: ['wizard-hat'] });
  const at = (s) => svg.indexOf(s);
  assert.ok(at('class="hat"') > at('id="pelo"') && at('class="hat"') < at('id="sueno"'), 'the hat is not between the head and its z\'s');
  assert.ok(svg.includes(`viewBox="0 ${-avatar.AVATAR_HEADROOM} 100 ${100 + avatar.AVATAR_HEADROOM}"`), 'the wizard hat\'s tip is cut off');
  assert.ok(avatar.avatarSvg({ extras: ['chef-hat'] }).includes('viewBox="0 0 100 100"'), 'a hat that stays on the drawing makes it taller');
  assert.ok(avatar.avatarSvg({}).includes('viewBox="0 0 100 100"'));
  for (const mark of ['sueno', 'susto', 'vena', 'lagrima']) assert.ok(avatar.AVATAR_OVER_HAT.includes(mark), `${mark} is hidden by a hat`);
  for (const part of avatar.AVATAR_OVER_HAT) assert.ok(avatar.AVATAR_PARTS.some((p) => p.id === part), `${part} is no part`);
  // On stream: the hat in the head, so it breathes and turns with it; the marks after it; and the box as tall as the drawing.
  const drawn = read('../../web/components/PixelAvatar.tsx');
  const head = drawn.slice(drawn.indexOf('data-avatar="head"'));
  assert.ok(head.indexOf("draw(groups.head, 'head', (id) => !overHat(id))") < head.indexOf('data-avatar="hat"'), 'the hat is under the head');
  assert.ok(head.indexOf('data-avatar="hat"') < head.indexOf("draw(groups.head, 'over', overHat)"), 'the marks are under the hat');
  assert.ok(head.indexOf('data-avatar="hat"') < head.indexOf('data-avatar="carried"'), 'the hat does not move with the head');
  assert.ok(drawn.includes('viewBox={crop || `0 ${-AVATAR_HEADROOM} 100 ${100 + AVATAR_HEADROOM}`}'), 'no room above the head on stream');
  const layer = read('../../web/components/AvatarLayer.tsx');
  // The built-in avatar's room above it; a pixel avatar from the tab has its own (see smoke/pixel-avatars.js).
  assert.ok(layer.includes('const headroom = kit ? pixelHeadroom(kit) as number : AVATAR_HEADROOM;'), 'the built-in avatar has no room above its head');
  assert.ok(layer.includes('aspectRatio: `100 / ${100 + headroom}`'), 'the box is not as tall as the drawing');
  assert.ok(layer.includes("`min(100cqw, calc(100cqh * 100 / ${100 + headroom}))`"), "the box can be taller than the layer");
});

test('every hat can be asked for by name, and is named in both languages', () => {
  const said = {
    'wizard-hat': ['wizard', 'sombrero de mago', 'bruja'],
    deerstalker: ['sherlock', 'detective'],
    'pirate-hat': ['pirate hat', 'pirata'],
    'cat-beanie': ['cat ears', 'orejas de gato'],
    'cowboy-hat': ['cowboy', 'sombrero de vaquero'],
    'santa-hat': ['santa', 'gorro de navidad'],
    'chef-hat': ['chef', 'gorro de cocinero'],
    crown: ['crown', 'ponte la corona', 'reina'],
  };
  for (const [hat, words] of Object.entries(said)) {
    for (const w of words) assert.equal(avatar.avatarDressName('hat', w), hat, `"${w}" is not the ${hat}`);
  }
  const panel = read('../../web/components/AvatarLayerPanel.tsx');
  const strings = read('../../web/constants.ts');
  // Every built-in hat, by its name, for the built-in avatar; a pixel avatar from the tab offers its own.
  assert.ok(panel.includes('const hatList: string[] = kit ? pixelHats(kit) : AVATAR_HATS;'), 'the panel does not offer every hat');
  assert.ok(panel.includes('const hatName = (h: string) => (kit ? pixelExtraName(kit, h, t) : avatarHatNames(t)[h] || h);'), 'the panel does not name every hat');
  assert.ok(panel.includes('{hatList.map((h: string) => <option key={h} value={h}>{hatName(h)}</option>)}'), 'the panel does not offer every hat');
  assert.ok(read('../../web/components/views/PngtuberView.tsx').includes(': AVATAR_HATS.map((h: string) => [h, avatarHatNames(t)[h] || h]);'), 'the PNGtuber page does not offer every hat');
  const keys = {
    'party-hat': 'avatarPartyHat', 'wizard-hat': 'avatarWizardHat', deerstalker: 'avatarDeerstalker', 'pirate-hat': 'avatarPirateHat',
    'cat-beanie': 'avatarCatBeanie', 'cowboy-hat': 'avatarCowboyHat', 'santa-hat': 'avatarSantaHat', 'chef-hat': 'avatarChefHat', crown: 'avatarCrown',
  };
  assert.deepEqual(Object.keys(keys), avatar.AVATAR_HATS);
  for (const [hat, key] of Object.entries(keys)) {
    assert.ok(panel.includes(`${hat.includes('-') ? `'${hat}'` : hat}: t.${key} ||`), `the ${hat} has no name in the panel`);
    assert.equal(strings.split(`    ${key}:`).length - 1, 2, `${key} is not in both languages`);
  }
});

// ------------------------------------------------------- regulars and the call

/*
  Somebody in the voice call drawn as the pixel avatar has a look: the
  choices an avatar layer has, or a regular's own drawing — a picture of its
  own on the avatar's grid, which opens its mouth as they talk.
*/
const REGULARS = avatar.AVATAR_REGULARS;

test('a regular\'s drawing is on the avatar\'s own grid, in its own colours, whole', () => {
  assert.ok(avatar.AVATAR_REGULARS_LIST.includes('shark'));
  for (const [id, r] of Object.entries(REGULARS)) {
    assert.ok(r.name && typeof r.name === 'string', `${id} has no name to be listed by`);
    // 100 x 100: one of its pixels is one of the avatar's, so the two are the same size side by side.
    assert.equal(r.rows.length, 100, `${id} is not 100 rows`);
    assert.ok(r.rows.every((row) => row.length === 100), `${id} has a row not 100 wide`);
    assert.ok(r.palette.every((c) => /^#[0-9a-f]{6}$/.test(c)), `${id}: a colour is not a colour`);
    // Every view it has — from the side, and the front if it turns — with its mouth and lids.
    const views = [r, ...(r.front ? [r.front] : [])];
    const drawn = views.flatMap((v) => [...v.rows, ...(v.talking?.rows || []), ...['half', 'shut'].flatMap((lid) => (v.blink?.[lid] || []).flatMap((p) => p.rows))]);
    const letters = new Set(drawn.join('').replace(/\./g, ''));
    for (const l of letters) assert.ok(l >= 'a' && l.charCodeAt(0) - 97 < r.palette.length, `${id}: "${l}" is not one of its colours`);
    assert.equal(letters.size, r.palette.length, `${id}: a colour is never drawn`);
    // Not a speck of background kept: nothing on the picture's edge but what runs off it.
    assert.ok(r.rows.join('').includes('.'), `${id} has no transparent pixels: its background was kept`);
  }
  for (const f of ['shark-quiet.jpg', 'shark-talking.jpg']) {
    assert.ok(fs.existsSync(new URL(`../../art/avatar/regulars/${f}`, SCRIPT_URL)), `${f}, the picture it was taken from, is not kept`);
  }
  // Nobody's own drawing is an outfit the streamer's avatar can be put in, by the panel or by chat.
  for (const id of avatar.AVATAR_REGULARS_LIST) {
    assert.ok(!avatar.AVATAR_COSTUMES_LIST.includes(id), `${id} is offered as an outfit`);
    assert.notEqual(avatar.avatarDressName('outfit', id), id);
  }
});

test('talking opens its mouth and changes nothing else, and its body runs off the bottom', () => {
  for (const [id, r] of Object.entries(REGULARS)) {
    const shut = avatar.avatarRegularRows(id, false);
    const open = avatar.avatarRegularRows(id, true);
    // Two rows more below, repeating the last, so rising a pixel as it breathes shows no gap.
    assert.equal(shut.length, 102);
    assert.equal(shut[100], shut[99]);
    assert.equal(shut[101], shut[99]);
    const [x0, y0] = r.talking.at;
    const x1 = x0 + r.talking.rows[0].length - 1, y1 = y0 + r.talking.rows.length - 1;
    assert.ok(x1 < 100 && y1 < 100, `${id}: its mouth runs off the drawing`);
    let changed = 0;
    for (let y = 0; y < 102; y += 1) {
      for (let x = 0; x < 100; x += 1) {
        if (shut[y][x] === open[y][x]) continue;
        changed += 1;
        assert.ok(x >= x0 && x <= x1 && y >= y0 && y <= y1, `${id}: talking changes ${x},${y}, away from its mouth — it would shimmer as they speak`);
      }
    }
    assert.ok(changed > 20, `${id}: its mouth barely moves (${changed} pixels)`);
    // Drawn as one shape a colour, every pixel there.
    for (const talking of [false, true]) {
      const paths = avatar.avatarRegularPaths(id, talking);
      const rows = talking ? open : shut;
      const cells = rows.join('').replace(/\./g, '').length;
      const area = Object.values(paths).join('').match(/h(\d+)/g).reduce((sum, h) => sum + Number(h.slice(1)), 0);
      assert.equal(area, cells, `${id}: ${area} pixels drawn of ${cells}`);
      assert.ok(Object.keys(paths).every((c) => r.palette.includes(c)));
    }
  }
  assert.deepEqual(avatar.avatarRegularPaths('nobody'), {});
  // Talking is any of the talking faces, soft, normal or loud.
  assert.ok(avatar.avatarMouthOpen(['neutral', 'talking-soft']) && avatar.avatarMouthOpen(['talking-loud']));
  assert.ok(!avatar.avatarMouthOpen(['neutral', 'blink']));
});

test('somebody in the call keeps the avatar layer\'s choices, or a regular\'s drawing, and nothing unknown', () => {
  const look = avatar.avatarCallLook;
  assert.deepEqual(look(null), {});
  assert.deepEqual(look({ colouring: 'layout' }), {}, 'the default is stored');
  assert.deepEqual(look({ colouring: 'red', costume: 'maid', hat: 'crown' }), { colouring: 'red', costume: 'maid' }, 'a hat went on over the maid\'s headdress');
  assert.deepEqual(look({ colouring: 'own', ownColour: '#FF8800', costume: 'mega', hat: 'crown' }), { colouring: 'own', ownColour: '#ff8800', costume: 'mega', hat: 'crown' });
  assert.deepEqual(look({ colouring: 'plaid', ownColour: 'orange', costume: 'pirate', hat: 'fez' }), {});
  // Their own drawing is theirs: none of the avatar's choices go with it.
  assert.deepEqual(look({ drawing: 'shark', colouring: 'red', costume: 'mega', hat: 'crown' }), { drawing: 'shark' });
  assert.deepEqual(look({ drawing: 'nobody', costume: 'mega' }), { costume: 'mega' });

  // Drawn: the avatar layer's own colours, against the layout's accent.
  const props = avatar.avatarCallProps;
  assert.deepEqual(props({}, '#22c55e').colours, avatar.avatarColours('layout', { accent: '#22c55e' }));
  assert.deepEqual(props({ colouring: 'own', ownColour: '#ff8800' }, '#22c55e').colours, avatar.avatarColours('own', { own: '#ff8800' }));
  assert.deepEqual(props({ costume: 'mega', hat: 'crown' }).extras, ['crown']);
  assert.deepEqual(props({ drawing: 'shark' }, '#22c55e'), { drawing: 'shark', costume: '', extras: [], colours: {} });

  // Kept by the server with their pictures, even while the avatar is off; somebody set up before is as they were.
  const pics = cleanPictures({
    111111111111: { name: 'Ana', avatar: true, look: { drawing: 'shark' } },
    222222222222: { name: 'Bo', avatar: true, look: { colouring: 'blue', hat: 'wizard-hat', costume: 'nope' } },
    333333333333: { name: 'Cy', quiet: '/media/cy.png', look: { colouring: 'red' } },
    444444444444: { name: 'Di', avatar: true },
    555555555555: { name: 'Ed', look: { colouring: 'red' } },
  });
  assert.deepEqual(pics['111111111111'], { name: 'Ana', avatar: true, look: { drawing: 'shark' } });
  assert.deepEqual(pics['222222222222'], { name: 'Bo', avatar: true, look: { colouring: 'blue', hat: 'wizard-hat' } });
  assert.deepEqual(pics['333333333333'], { name: 'Cy', quiet: '/media/cy.png', look: { colouring: 'red' } });
  assert.deepEqual(pics['444444444444'], { name: 'Di', avatar: true });
  assert.equal(pics['555555555555'], undefined, 'a look alone, with no avatar and no pictures, is kept');
});

test('a regular\'s drawing is drawn in place of the avatar, and the Voice call screen previews every look live', () => {
  const drawn = read('../../web/components/PixelAvatar.tsx');
  assert.ok(drawn.includes('const talking = avatarMouthOpen(faceKey.split(\'+\'));'), 'the drawing does not open its mouth with the talking faces');
  assert.ok(drawn.includes('data-avatar-drawing={drawing} data-avatar-mouth={talking ? \'open\' : \'shut\'}'));
  // Breathing moves it in its two parts, as the avatar's head and body; turning does not — it has no head of its own to turn.
  assert.ok(drawn.includes('<g transform={bodyAt} data-avatar="body">{draw(regularParts.body, \'body\')}</g>'));
  assert.ok(drawn.includes('<g transform={`translate(0 ${-(pose?.headUp || 0)})`} data-avatar="head">{draw(regularParts.head, \'head\')}</g>'));
  // Its lids follow the avatar's blink: shut with the blink face, half as the lids come and go.
  assert.ok(drawn.includes("const lid = faceKey.split('+').includes('blink') ? 'shut' : eyes?.half ? 'half' : 'open';"));
  assert.ok(read('../../web/components/AvatarLayer.tsx').includes('drawing={drawing}'), 'the living avatar does not pass the drawing on');

  const editor = read('../../web/components/VoicePicturesEditor.tsx');
  assert.ok(editor.includes('<VoicePixel look={look} accent={accent} speaking={previewTalking} pixelAvatars={pixelAvatars} />'), 'the look is not previewed live');
  assert.ok(editor.includes('data-voice-look-talk'), 'the preview cannot be made to talk');
  // The colours are the avatar layer's own controls, not a second set.
  assert.ok(editor.includes('<AvatarColourSelect colouring={look.colouring || \'layout\'} set={setLook} t={t} />'));
  assert.ok(editor.includes('<AvatarColourExtras colouring={look.colouring || \'layout\'}'));
  const panel = read('../../web/components/AvatarLayerPanel.tsx');
  assert.ok(panel.includes('<AvatarColourSelect colouring={colouring} set={patch} t={t} />'), 'the avatar layer has its own copy of the colour controls');
  for (const attr of ['data-voice-look-drawing', 'data-voice-look-costume', 'data-voice-look-hat']) assert.ok(editor.includes(attr), attr);
  // "The layout colour" previews in the colour of the layout that shows the call.
  const view = read('../../web/components/views/VoiceView.tsx');
  assert.ok(view.includes("(l.layers || []).some((x) => x.type === 'voice')"));
  assert.ok(view.includes('accent={accent}') && read('../../web/App.tsx').replace(/\r\n/g, '\n').includes("layouts={(system.data as any).layouts || []}\n               t={t}"));

  const strings = read('../../web/constants.ts');
  const keys = [...new Set([...editor.matchAll(/t\.(voiceLook\w+|voicePic\w+|avatar\w+)/g)].map((m) => m[1]))];
  assert.ok(keys.includes('voiceLookTheirOwn') && keys.includes('voiceLookPreviewTalking'));
  for (const key of keys) assert.equal(strings.split(`    ${key}:`).length - 1, 2, `${key} is not in both languages`);
});

test('Switsed is edged all round, and the backpack says rappi legibly', () => {
  const s = REGULARS.shark;
  assert.equal(s.name, 'Switsed');
  const rows = avatar.avatarRegularRows('shark', false).slice(0, 100);
  const colour = (x, y) => (rows[y]?.[x] && rows[y][x] !== '.' ? s.palette[rows[y][x].charCodeAt(0) - 97] : null);
  // Only its edges meet the background: outlines, straps, the handle and the loops — never a fill,
  // as the fin by the strap and the backpack's top once did where their black edging went with the background.
  const edges = new Set(['#161939', '#23201e', '#343536', '#828285', '#000000']);
  for (let y = 0; y < 100; y += 1) {
    for (let x = 0; x < 100; x += 1) {
      const c = colour(x, y);
      if (!c || edges.has(c)) continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx > 99 || ny > 99) continue;
        assert.ok(colour(nx, ny), `${c} at ${x},${y} meets the background at ${nx},${ny} with no edge between`);
      }
    }
  }
  // The face: five letters in their own columns, a clear column between each but the r and a.
  const white = (x, y0, y1) => { for (let y = y0; y <= y1; y += 1) if (colour(x, y) === '#ffffff') return true; return false; };
  for (const x of [87, 91, 95]) assert.ok(!white(x, 44, 58), `the letters run together at column ${x}`);
  for (const [x0, x1] of [[82, 83], [84, 86], [88, 90], [92, 94], [96, 96]]) {
    let ink = false;
    for (let x = x0; x <= x1; x += 1) ink = ink || white(x, 44, 58);
    assert.ok(ink, `no letter at ${x0}..${x1}`);
  }
  // Nothing but the word and its orange between the grey stripe and the mustache.
  for (let y = 42; y <= 59; y += 1) for (let x = 82; x <= 96; x += 1) assert.ok(['#ffffff', '#f15230'].includes(colour(x, y)), `${colour(x, y)} on the backpack's face at ${x},${y}`);
});

test('Switsed blinks: lids half and shut over his eyes only, and he can blink while he talks', () => {
  const s = REGULARS.shark;
  assert.ok(s.blink?.half?.length && s.blink?.shut?.length, 'no eyelids');
  const boxes = [];
  for (const lid of ['half', 'shut']) {
    for (const { at: [x0, y0], rows } of s.blink[lid]) {
      assert.ok(rows.every((r) => r.length === rows[0].length), `${lid}: a ragged patch`);
      assert.ok(x0 + rows[0].length <= 100 && y0 + rows.length <= 100, `${lid}: a patch runs off the drawing`);
      for (const c of rows.join('').replace(/\./g, '')) assert.ok(c.charCodeAt(0) - 97 < s.palette.length, `${lid}: "${c}" is not one of his colours`);
      boxes.push([x0, y0, x0 + rows[0].length - 1, y0 + rows.length - 1]);
    }
  }
  const inAny = (x, y, list) => list.some(([a, b, c, d]) => x >= a && x <= c && y >= b && y <= d);
  const open = avatar.avatarRegularRows('shark', { lid: 'open' });
  const changed = {};
  for (const lid of ['half', 'shut']) {
    const rows = avatar.avatarRegularRows('shark', { lid });
    changed[lid] = 0;
    for (let y = 0; y < 100; y += 1) {
      for (let x = 0; x < 100; x += 1) {
        if (rows[y][x] === open[y][x]) continue;
        changed[lid] += 1;
        assert.ok(inAny(x, y, boxes), `${lid} changes ${x},${y}, away from his eyes`);
      }
    }
  }
  assert.ok(changed.half > 20 && changed.shut > changed.half, `the lids barely move: half ${changed.half}, shut ${changed.shut}`);
  // Shut, no pupil is left showing: the black left on the right eye is the lid's line, no more.
  const shut = avatar.avatarRegularRows('shark', { lid: 'shut' });
  const black = String.fromCharCode(97 + s.palette.indexOf('#000000'));
  let lidLine = 0;
  for (let y = 32; y <= 47; y += 1) for (let x = 56; x <= 70; x += 1) if (shut[y][x] === black) lidLine += 1;
  assert.ok(lidLine > 8 && lidLine < 30, `the shut right eye has ${lidLine} black pixels: an eye still open, or no lid line`);
  // The mouth and the eyes are apart, so talking and blinking lay over each other without a pixel between them.
  const [mx, my] = s.talking.at;
  const mouth = [mx, my, mx + s.talking.rows[0].length - 1, my + s.talking.rows.length - 1];
  for (const [a, b, c, d] of boxes) assert.ok(c < mouth[0] || a > mouth[2] || d < mouth[1] || b > mouth[3], `an eyelid over the mouth at ${a},${b}`);
  const both = avatar.avatarRegularRows('shark', { talking: true, lid: 'shut' });
  const talking = avatar.avatarRegularRows('shark', { talking: true });
  for (let y = 0; y < 100; y += 1) for (let x = 0; x < 100; x += 1) {
    const want = inAny(x, y, boxes) ? shut[y][x] : talking[y][x];
    assert.equal(both[y][x], want, `talking with his eyes shut is wrong at ${x},${y}`);
  }
  assert.deepEqual(avatar.AVATAR_REGULAR_LIDS, ['open', 'half', 'shut']);
});

test('Switsed breathes in two parts, split where a row can slip behind the next unseen', () => {
  const s = REGULARS.shark;
  const split = s.breathSplit;
  assert.ok(Number.isInteger(split) && split > 55 && split < 95, `he breathes from row ${split}`);
  for (const now of [{}, { talking: true }, { lid: 'shut' }]) {
    const rows = avatar.avatarRegularRows('shark', now);
    // Risen a pixel, the lower part covers the row above it: that row and the next must be as good as the same.
    let differ = 0;
    for (let x = 0; x < 100; x += 1) if (rows[split][x] !== rows[split + 1][x]) differ += 1;
    assert.ok(differ <= 2, `rows ${split} and ${split + 1} differ in ${differ} pixels: breathing would show a seam`);
    // The two parts are the whole: every pixel in one of them, none in both.
    const { head, body } = avatar.avatarRegularParts('shark', now);
    const area = (paths) => Object.values(paths).join('').match(/h(\d+)/g)?.reduce((sum, h) => sum + Number(h.slice(1)), 0) || 0;
    const whole = area(avatar.avatarRegularPaths('shark', now));
    assert.equal(area(head) + area(body), whole, 'the parts do not add up to the drawing');
    const lowestHead = Math.max(...Object.values(head).join('').match(/M\d+ (\d+)/g).map((m) => Number(m.split(' ')[1])));
    const highestBody = Math.min(...Object.values(body).join('').match(/M\d+ (\d+)/g).map((m) => Number(m.split(' ')[1])));
    assert.equal(lowestHead, split);
    assert.equal(highestBody, split + 1);
  }
  assert.deepEqual(avatar.avatarRegularParts('nobody'), { head: {}, body: {} });
});

test('Switsed from the front: his grid, his colours, straps on both sides, and a mouth, lids and breath of its own', () => {
  const s = REGULARS.shark;
  const f = s.front;
  assert.ok(avatar.avatarRegularTurns('shark'), 'he has no front view to turn through');
  assert.equal(f.rows.length, 100);
  assert.ok(f.rows.every((r) => r.length === 100));
  for (const c of new Set(f.rows.join('').replace(/\./g, ''))) assert.ok(c.charCodeAt(0) - 97 < s.palette.length, `"${c}" is not one of his colours`);
  assert.ok(s.palette.length <= 26, 'more colours than letters');
  assert.ok(fs.existsSync(new URL('../../art/avatar/regulars/shark-front-quiet.jpg', SCRIPT_URL)) && fs.existsSync(new URL('../../art/avatar/regulars/shark-front-talking.jpg', SCRIPT_URL)), 'the front pictures are not kept');
  // As tall as from the side, head to foot, so turning does not make him jump or grow.
  const extent = (rows) => { const ys = []; rows.forEach((r, y) => { if (/[^.]/.test(r)) ys.push(y); }); return [ys[0], ys[ys.length - 1]]; };
  assert.deepEqual(extent(f.rows), extent(s.rows), 'the front and the side are not the same height');
  // The straps, drawn as the side view's: black, grey, grey, black down his side, the right the left mirrored.
  const colour = (x, y) => (f.rows[y][x] === '.' ? null : s.palette[f.rows[y][x].charCodeAt(0) - 97]);
  for (let y = 64; y <= 83; y += 1) {
    assert.deepEqual([22, 23, 24, 25].map((x) => colour(x, y)), ['#000000', '#343536', '#343536', '#000000'], `no strap at row ${y} on his left`);
    assert.deepEqual([77, 76, 75, 74].map((x) => colour(x, y)), ['#000000', '#343536', '#343536', '#000000'], `no strap at row ${y} on his right`);
  }
  // Talking opens only his mouth; blinking shuts only his eyes; the two never meet.
  const [mx, my] = f.talking.at;
  const mouth = [mx, my, mx + f.talking.rows[0].length - 1, my + f.talking.rows.length - 1];
  const shut = avatar.avatarRegularRows('shark', { facing: 'front' });
  const open = avatar.avatarRegularRows('shark', { facing: 'front', talking: true });
  const lids = f.blink.shut.map(({ at: [x, y], rows }) => [x, y, x + rows[0].length - 1, y + rows.length - 1]);
  const within = (x, y, [a, b, c, d]) => x >= a && x <= c && y >= b && y <= d;
  let moved = 0;
  for (let y = 0; y < 100; y += 1) for (let x = 0; x < 100; x += 1) {
    if (shut[y][x] !== open[y][x]) { moved += 1; assert.ok(within(x, y, mouth), `talking changes ${x},${y} from the front`); }
  }
  assert.ok(moved > 20, 'his mouth barely opens from the front');
  for (const lid of ['half', 'shut']) {
    const rows = avatar.avatarRegularRows('shark', { facing: 'front', lid });
    let changed = 0;
    for (let y = 0; y < 100; y += 1) for (let x = 0; x < 100; x += 1) {
      if (rows[y][x] !== shut[y][x]) { changed += 1; assert.ok(lids.some((b) => within(x, y, b)), `${lid} changes ${x},${y}, away from his eyes`); }
    }
    assert.ok(changed > 20, `the ${lid} lids barely move from the front`);
  }
  for (const b of lids) assert.ok(b[2] < mouth[0] || b[0] > mouth[2] || b[3] < mouth[1] || b[1] > mouth[3], 'a lid over the mouth');
  // Breathing from a row the next one hides without a seam.
  assert.equal(f.breathSplit, 72);
  let differ = 0;
  for (let x = 0; x < 100; x += 1) if (shut[72][x] !== shut[73][x]) differ += 1;
  assert.ok(differ <= 2, `rows 72 and 73 from the front differ in ${differ}`);
  const parts = avatar.avatarRegularParts('shark', { facing: 'front' });
  const lowest = Math.max(...Object.values(parts.head).join('').match(/M\d+ (\d+)/g).map((m) => Number(m.split(' ')[1])));
  assert.equal(lowest, 72, 'the front breathes from the wrong row');
});

test('facing your right he is his side view mirrored, the backpack still reading "rappi"', () => {
  const s = REGULARS.shark;
  const left = avatar.avatarRegularRows('shark', { facing: 'left' });
  const right = avatar.avatarRegularRows('shark', { facing: 'right' });
  assert.deepEqual(avatar.avatarRegularRows('shark', {}), left, 'as drawn is not facing left');
  const keep = s.mirrorKeep;
  assert.deepEqual(keep, [[82, 41, 96, 78]]);
  const [k0, ky0, k1, ky1] = keep[0];
  for (let y = 0; y < 100; y += 1) {
    for (let x = 0; x < 100; x += 1) {
      const inKept = x >= 99 - k1 && x <= 99 - k0 && y >= ky0 && y <= ky1;
      // The writing copied as it is; everything else mirrored.
      const want = inKept ? left[y][x - (99 - k1) + k0] : left[y][99 - x];
      assert.equal(right[y][x], want, `facing right is wrong at ${x},${y}`);
    }
  }
  // Mirrored, his mouth and lids go with him.
  const talkingRight = avatar.avatarRegularRows('shark', { facing: 'right', talking: true });
  const talkingLeft = avatar.avatarRegularRows('shark', { talking: true });
  for (let y = 43; y <= 55; y += 1) assert.equal(talkingRight[y].slice(46, 71), [...talkingLeft[y].slice(29, 54)].reverse().join(''), `his mouth is not mirrored at row ${y}`);
  assert.deepEqual(avatar.AVATAR_REGULAR_FACINGS, ['left', 'front', 'right']);
});

test('in the call he faces whoever talks, through the front, and the front while nobody does', () => {
  const toward = avatar.avatarFacingToward;
  // A row of three: the first looks right at the third, the third left at the first.
  assert.equal(toward(0, 2, 3), 'right');
  assert.equal(toward(2, 0, 3), 'left');
  assert.equal(toward(1, 1, 3), null, 'he faces himself');
  // A column: straight above or below is no way a drawing can turn.
  assert.equal(toward(0, 1, 1), null);
  // A grid of two across: the one below and to the right is to the right.
  assert.equal(toward(0, 3, 2), 'right');
  assert.equal(toward(1, 2, 2), 'left');
  assert.equal(toward(0, -1, 3), null, 'toward somebody not on the layer');
  assert.ok(avatar.AVATAR_TURN_STEP_MS >= 60 && avatar.AVATAR_TURN_STEP_MS <= 200);
  assert.ok(avatar.AVATAR_TURN_HOLD_MS >= 1500, 'he would turn away between words');

  const layer = read('../../web/components/VoiceLayer.tsx');
  assert.ok(layer.includes('const lastSpeaker = useLastSpeaker(shown);'));
  assert.ok(layer.includes("const facing = m.speaking && !m.muted ? 'front'"), 'talking, he does not face the stream');
  assert.ok(layer.includes('facing={facing} pixelAvatars={pixelAvatars} />'), 'the tile does not pass the way to face');
  assert.ok(layer.includes('const timer = setTimeout(() => setLast(null), AVATAR_TURN_HOLD_MS);'), 'the last speaker is forgotten at the first pause');
  const living = read('../../web/components/AvatarLayer.tsx');
  // From one side to the other, through the front; a beat behind, as the head follows the eyes.
  assert.ok(living.includes("const nextFacing = now !== 'front' && wantFacing !== 'front' ? 'front' : wantFacing;"));
  assert.ok(living.includes('timer = setTimeout(step, AVATAR_HEAD_FOLLOW_MS);'));
  assert.ok(living.includes('const wantFacing = facing || idleFacing;'));
  // Asleep, it does not look about: it faces the stream, where the nose bubble is drawn.
  assert.ok(living.includes('const asleep = deep || dozing;') && living.includes("if (!turns || !glance || asleep) { setIdleFacing('front'); return undefined; }"), 'it glances about in its sleep');
  assert.ok(living.includes("facing={turns ? facingNow : 'left'}"), 'a drawing that cannot turn is turned');
  assert.ok(read('../../web/components/PixelAvatar.tsx').includes('data-avatar-facing={facing}'));
});

// ---------------------------------------------------------------- something it does: a glass of water

test('drinking is the streamer\'s eight frames, in the avatar\'s own colours and the glass\'s', () => {
  const frames = avatar.avatarActionFrames('drink', '');
  assert.equal(frames.length, 8);
  const chars = new Set([...avatar.AVATAR_PARTS.map((p) => p.char), '.', '_']);
  for (const [i, f] of frames.entries()) {
    assert.ok(f.ms >= 100 && f.ms <= 1500, `frame ${i + 1} is up for ${f.ms} ms`);
    for (const { at: [x, y], rows } of f.patches) {
      assert.ok(x >= 0 && y >= 0 && x + Math.max(...rows.map((r) => r.length)) <= 100 && y + rows.length <= 100, `frame ${i + 1} runs off the grid`);
      for (const row of rows) for (const c of row) assert.ok(chars.has(c), `frame ${i + 1} has "${c}", which is no part`);
    }
  }
  // Eyes shut while it drinks, open either side.
  assert.deepEqual(frames.map((f) => f.eyes === 'shut'), [false, false, false, true, true, true, false, false]);
  const ms = avatar.avatarActionMs('drink', '');
  assert.ok(ms >= 2500 && ms <= 5000, `a sip that takes ${ms} ms`);
  // The glass and the water are glass and water, whatever colour the layout paints the hoodie.
  for (const id of ['vaso', 'vaso-brillo', 'agua', 'agua-sombra']) {
    assert.ok(avatar.AVATAR_PARTS.some((p) => p.id === id), `no ${id}`);
    assert.ok(!avatar.AVATAR_COLOURED.includes(id), `${id} takes the layout's colour`);
  }
  assert.ok(fs.existsSync(new URL('../../art/avatar/drink-source.jpg', SCRIPT_URL)), 'the drawing it came from is not kept');
});

test('a frame goes over everything, only in an outfit drawn doing it', () => {
  const plain = avatar.avatarGrid('neutral', ['blush'], '');
  const glass = new Set(['f', 'F', 'n', 'z']);
  const glassIn = (grid) => grid.join('').split('').filter((c) => glass.has(c)).length;
  for (let frame = 0; frame < 8; frame += 1) {
    const g = avatar.avatarGrid('neutral', ['blush'], '', {}, { name: 'drink', frame });
    assert.ok(glassIn(g) > 20, `no glass in frame ${frame + 1}`);
    assert.notDeepEqual(g, plain);
  }
  assert.equal(glassIn(plain), 0, 'the glass is there without drinking');
  /*
    Only the hand, the arm and the glass move. Read at the wrong size — the
    sheet's second row is drawn bigger than its first — a frame pasted a
    bigger hoodie over the avatar's: the body's right half, which the arm
    never reaches, and the head above the chin must stay as they are.
  */
  for (const outfit of ['', 'waiter', 'maid', 'link']) {
    const bare = avatar.avatarGrid('neutral', [], outfit);
    for (let frame = 0; frame < 8; frame += 1) {
      const g = avatar.avatarGrid('neutral', [], outfit, {}, { name: 'drink', frame });
      const moved = [];
      for (let y = 0; y < 100; y += 1) for (let x = 0; x < 100; x += 1) {
        if (g[y][x] !== bare[y][x] && (y < 67 || (x >= 56 && y >= 80))) moved.push(`${x},${y}`);
      }
      assert.deepEqual(moved, [], `frame ${frame + 1} reshapes the ${outfit || 'hoodie'} where only the drawing is`);
    }
  }
  // Not drawn for Mega yet: he does not drink with the hoodie's sleeve.
  assert.equal(avatar.avatarActionFrames('drink', 'mega'), null);
  assert.equal(avatar.avatarActionMs('drink', 'mega'), 0);
  assert.deepEqual(avatar.avatarGrid('neutral', [], 'mega', {}, { name: 'drink', frame: 3 }), avatar.avatarGrid('neutral', [], 'mega'));
  assert.deepEqual(avatar.avatarGrid('neutral', [], '', {}, { name: 'drink', frame: 99 }), avatar.avatarGrid('neutral', [], ''));
  assert.deepEqual(avatar.avatarGrid('neutral', [], '', {}, { name: 'dance', frame: 0 }), avatar.avatarGrid('neutral', [], ''));
  // Chat names it loosely, in either language.
  for (const w of ['drink', 'Agua', 'tomar agua', 'BEBER', 'hidrátate', 'Hidratarse']) assert.equal(avatar.avatarActionName(w), 'drink', `"${w}"`);
  for (const w of ['', 'bailar', 'drinking games']) assert.equal(avatar.avatarActionName(w), null, `"${w}"`);
});

test('the waiter, the maid and Link drink the same sip in their own sleeves, nothing of theirs taking the layout colour', () => {
  const hoodie = avatar.avatarActionFrames('drink', '');
  const chars = new Set([...avatar.AVATAR_PARTS.map((p) => p.char), '.', '_']);
  const coloured = new Set(avatar.AVATAR_COLOURED.map((id) => avatar.AVATAR_PARTS.find((p) => p.id === id).char));
  // His white shirt; her dark dress; Link's cream undershirt, his tunic's sleeves stopping short of the forearm.
  const CLOTH = { waiter: new Set(['j', 'J', 'g']), maid: new Set(['v', 'w']), link: new Set(['c', 'C']) };
  for (const [outfit, cloth] of Object.entries(CLOTH)) {
    const frames = avatar.avatarActionFrames('drink', outfit);
    assert.equal(frames.length, hoodie.length, outfit);
    assert.deepEqual(frames.map((f) => [f.ms, f.eyes || '']), hoodie.map((f) => [f.ms, f.eyes || '']), `the ${outfit} sips to a different beat`);
    for (const [i, f] of frames.entries()) {
      for (const c of f.patches.flatMap((p) => p.rows.join('').split(''))) {
        assert.ok(chars.has(c), `the ${outfit}'s frame ${i + 1} has "${c}", which is no part`);
        // The hoodie's purples, the glasses' and the hair's highlight all follow the layout's colour: none of them is theirs.
        assert.ok(!coloured.has(c), `the ${outfit}'s frame ${i + 1} paints "${c}", which takes the layout's colour`);
      }
      // The glass is the same pixels as in the hoodie — all but a lone speck of the JPEG in the sleeve.
      const g = avatar.avatarGrid('neutral', [], outfit, {}, { name: 'drink', frame: i });
      const h = avatar.avatarGrid('neutral', [], '', {}, { name: 'drink', frame: i });
      const glassy = (x, y) => 'fFnz'.includes(h[y]?.[x] || '');
      let glass = 0;
      for (let y = 0; y < 100; y += 1) for (let x = 0; x < 100; x += 1) {
        if (!glassy(x, y) || ![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => glassy(x + dx, y + dy))) continue;
        glass += 1;
        assert.equal(g[y][x], h[y][x], `the ${outfit}'s frame ${i + 1}: the glass moved at ${x},${y}`);
      }
      assert.ok(glass > 20);
    }
    // Glass up at the mouth, the arm is up too: in the outfit's own cloth, not the hoodie's purple.
    const up = avatar.avatarGrid('neutral', [], outfit, {}, { name: 'drink', frame: 4 });
    let sleeve = 0;
    for (let y = 85; y < 100; y += 1) for (let x = 8; x < 26; x += 1) if (cloth.has(up[y][x])) sleeve += 1;
    assert.ok(sleeve > 100, `only ${sleeve} pixels of the ${outfit}'s cloth in the raised arm`);
  }
});

test('while it drinks it holds still, eyes as drawn, mouth shut, and a page opening mid-sip plays nothing', () => {
  const living = read('../../web/components/AvatarLayer.tsx');
  assert.ok(living.includes('const seenAction = useRef(action?.key ?? null);'), 'a page opening mid-drink would drink late');
  assert.ok(living.includes("if (!frames?.length || doingTimer.current !== undefined) return;"), 'a drink underway would start over');
  assert.ok(living.includes("const faces = acting ? (frameNow?.eyes === 'shut' ? ['neutral', 'blink'] : ['neutral'])"), 'it talks with the glass at its lips');
  assert.ok(living.includes('pose={acting ? {} :'), 'it breathes out of its frames');
  assert.ok(living.includes('animation: acting ? undefined'), 'it hops with a glass in its hand');
  // Handed down as what it is doing: the action's own key from the moment the layer opens (so a page opening mid-sip plays nothing), and each new one as it comes.
  assert.ok(living.includes('glanceAt={glanceAt} action={doing}'), 'the layer does not hand it down');
  assert.ok(living.includes('useState<{ name: string; key: string } | null>(acted ?? null)'), 'a page opening mid-sip would play it');
  assert.ok(living.includes('useEffect(() => { if (acted?.key) setDoing(acted); }, [acted?.key]);'), 'a new action never reaches it');
  const pixel = read('../../web/components/PixelAvatar.tsx');
  assert.ok(pixel.includes('avatarGrid(faceKey.split(\'+\'), extraKey ? extraKey.split(\'+\') : [], costume, eyes, action)'));
  assert.ok(pixel.includes('[faceKey, extraKey, costume, eyeKey, actionKey]'), 'the frames would never redraw');
});
