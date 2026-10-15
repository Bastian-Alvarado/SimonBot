/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The examples in the Pixel avatars tab: the built-in avatar and the
 * regulars' own drawings, converted to the tab's format (see
 * shared/pixel-avatars.js) — every part, face, extra, hat, outfit and frame
 * of them.
 *
 * Read from the built-in ones, never written back: the built-in avatar
 * keeps its own code and art, and nothing done to an example in the tab
 * reaches it. They are a copy to start from and to check against. A test
 * holds that shared/pixel-avatars.js draws each example exactly as
 * shared/avatar.js draws the original.
 *
 * Their labels are left empty where the built-in one has a translated name
 * (a face, an outfit, a hat): the tab shows that name, in either language.
 */

import {
  AVATAR_PARTS, AVATAR_EXPRESSIONS_LIST, AVATAR_EXTRAS_LIST, AVATAR_HATS, AVATAR_COLOURED, AVATAR_CARRIED,
  AVATAR_OVER_HAT, AVATAR_HEAD_LAST_ROW, AVATAR_DRESS_WORDS, AVATAR_ACTION_WORDS, AVATAR_HAT_ART, AVATAR_REGULARS, AVATAR_ACTIONS,
} from './avatar.js';
import { AVATAR_BASE, AVATAR_EXPRESSIONS, AVATAR_EXTRAS, AVATAR_COSTUMES, AVATAR_BUBBLE } from './avatar-art.js';
import { PIXEL_AVATAR_VERSION } from './pixel-avatars.js';
import { SANDWICHXAMPLE } from './sandwichxample.js';

const copy = (v) => JSON.parse(JSON.stringify(v));

/*
  The built-in avatar's faces whose eyes rest, and so can glance and
  half-blink (RESTING_EYES in shared/avatar.js), and those a blink would
  spoil (EYES_SHUT there). Neither is exported, so they are written out
  here, and the test that compares the two drawings holds them to it.
*/
const GLANCES = ['talking'];
const NO_BLINK = ['blink', 'happy', 'wink', 'star-eyes', 'heart-eyes', 'dizzy', 'deep-sleep'];

/** The order the built-in faces are offered in, with the softer and louder talking beside talking. */
function faceOrder() {
  const listed = AVATAR_EXPRESSIONS_LIST.filter((f) => f !== 'neutral');
  const rest = Object.keys(AVATAR_EXPRESSIONS).filter((f) => !listed.includes(f));
  const at = listed.indexOf('talking') + 1;
  return [...listed.slice(0, at), ...rest.filter((f) => f.startsWith('talking')), ...listed.slice(at), ...rest.filter((f) => !f.startsWith('talking'))];
}

/** The built-in pixel avatar, as a pixel avatar of the tab's. */
export function simonsaysExample() {
  return {
    id: 'example-simonsays',
    name: 'SimonSays',
    example: 'simonsays',
    version: PIXEL_AVATAR_VERSION,
    parts: AVATAR_PARTS.map((p) => ({
      id: p.id, char: p.char, color: p.color, name: p.name,
      ...(p.opacity ? { opacity: p.opacity } : {}),
      ...(p.id === 'sueno' ? { effect: 'float' } : p.id === 'susto' ? { effect: 'pop' } : {}),
    })),
    base: copy(AVATAR_BASE),
    baseLabel: '',
    baseWords: copy(AVATAR_DRESS_WORDS.outfit['']),
    faces: faceOrder().map((name) => ({
      name, label: '', patches: copy(AVATAR_EXPRESSIONS[name]), glances: GLANCES.includes(name), blinks: !NO_BLINK.includes(name),
    })),
    extras: AVATAR_EXTRAS_LIST.map((name) => {
      const art = AVATAR_HAT_ART[name];
      return {
        name, label: '',
        patches: copy(art ? art.hides : AVATAR_EXTRAS[name]),
        hat: AVATAR_HATS.includes(name),
        ...(art ? { art: { x: art.x, y: art.y, size: art.size, palette: copy(art.palette), rows: copy(art.rows) } } : {}),
        words: copy(AVATAR_DRESS_WORDS.hat[name] || []),
      };
    }),
    outfits: Object.entries(AVATAR_COSTUMES).map(([name, o]) => ({
      name, label: '', rows: copy(o.rows), headwear: Boolean(o.headwear),
      // Round glasses of its own, which reach further down: their lashes go with the lid to row 55, not 53.
      ...(o.ownFace ? { ownFace: { region: copy(o.ownFace.region), glasses: copy(o.ownFace.glasses), faces: copy(o.ownFace.expressions) }, lashesTo: 55 } : {}),
      words: copy(AVATAR_DRESS_WORDS.outfit[name] || []),
    })),
    actions: Object.entries(AVATAR_ACTIONS).map(([name, a]) => ({
      name, label: '', words: copy(AVATAR_ACTION_WORDS[name] || []), outfits: copy(a.costumes),
    })),
    split: { headLastRow: AVATAR_HEAD_LAST_ROW, carried: copy(AVATAR_CARRIED), follow: true },
    overHat: copy(AVATAR_OVER_HAT),
    eyes: {
      boxes: [[27, 39], [52, 63]],
      rows: [56, 64],
      opening: 'OrWIi',
      white: 'rW',
      iris: 'OIi',
      shine: 'W',
      line: 'O',
      split: 59,
      fill: ['r', 'W'],
      irisFill: ['I', 'i'],
      lid: 'P',
      lidLine: 'O',
      lidRow: 60,
      lashes: [49, 53],
      lashChars: 'Or',
    },
    colouring: {
      main: 'sudadera',
      coloured: copy(AVATAR_COLOURED),
      eyes: ['iris', 'iris-claro', 'reflejo'],
      suit: { armour: 'traje', body: ['cuerpo-sombra', 'cuerpo', 'cuerpo-brillo'] },
    },
    bubble: copy(AVATAR_BUBBLE),
    turn: null,
    drawnFacing: 'right',
  };
}

/**
 * A regular's own drawing (shared/avatar-regulars.js) as a pixel avatar of
 * the tab's: its palette as its parts, its open mouth and eyelids as faces,
 * its front view and what stays unmirrored as its turn.
 */
export function regularExample(id) {
  const r = AVATAR_REGULARS[id];
  if (!r) return null;
  const faces = (view) => [
    ...(view.talking ? [{ name: 'talking', label: '', patches: copy([view.talking]), glances: false, blinks: true }] : []),
    ...(view.blink?.shut ? [{ name: 'blink', label: '', patches: copy(view.blink.shut), glances: false, blinks: false }] : []),
    ...(view.blink?.half ? [{ name: 'blink-half', label: '', patches: copy(view.blink.half), glances: false, blinks: false }] : []),
  ];
  return {
    id: `example-${id}`,
    name: r.name || id,
    example: id,
    version: PIXEL_AVATAR_VERSION,
    parts: r.palette.map((color, i) => ({ id: `colour-${i + 1}`, char: String.fromCharCode(97 + i), color, name: `Colour ${i + 1}` })),
    base: copy(r.rows),
    baseLabel: '',
    baseWords: [],
    faces: faces(r),
    extras: [],
    outfits: [],
    actions: [],
    split: { headLastRow: r.breathSplit ?? 99, carried: [], follow: false },
    overHat: [],
    eyes: null,
    colouring: null,
    bubble: [],
    turn: r.front ? { front: { base: copy(r.front.rows), faces: faces(r.front), headLastRow: r.front.breathSplit ?? 99 }, mirrorKeep: copy(r.mirrorKeep || []) } : null,
    drawnFacing: 'left',
  };
}

/** Sandwichxample (shared/sandwichxample.js): drawn in the tab's own format, every part of it. */
export function sandwichxampleExample() {
  return copy(SANDWICHXAMPLE);
}

/** Every example, in the order the tab lists them. */
export function pixelAvatarExamples() {
  return [simonsaysExample(), ...Object.keys(AVATAR_REGULARS).map(regularExample), sandwichxampleExample()];
}

/** One example afresh, by the built-in it was made from: to put it back as it was. */
export function pixelAvatarExample(example) {
  if (example === 'simonsays') return simonsaysExample();
  if (example === 'sandwichxample') return sandwichxampleExample();
  return regularExample(example);
}
