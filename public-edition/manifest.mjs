/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * What the public edition is: this app without its streamer's own content.
 * scripts/public-edition.mjs reads this to build it from a release of this
 * repo. Nothing here is shipped.
 *
 * The streamer's commands, actions, layouts, alerts and every other setting
 * live in data/, which is never in the repo, so they never reach it. What
 * is in the code and is theirs is left out or replaced below.
 */

/** The themes it ships, by id (shared/looks/<id>.js); every other theme file is left out. */
export const THEMES = ['simonsays', 'cyberpunky'];

/** The welcome card's looks it ships (shared/card-looks.js): the two themes' own, and the plain one. */
export const CARD_LOOKS = ['card-simonsays', 'card-cyberpunky', 'card-minimal'];

/** The pixel avatar drawn wherever none is chosen (shared/house-avatar.js): the built-in character is not shipped. */
export const HOUSE_CHARACTER = 'example-sandwichxample';

/** Where a copy of the public edition finds its updates (shared/edition.js, server/engine/updater.js). */
export const UPDATE_REPO = 'Bastian-Alvarado/SimonSays';

/** Who gives the licence: named on its "Licensor:" line (public-edition/overrides/LICENSE), and nowhere else. */
export const LICENSOR = 'Bastian Alvarado';

/** Paths left out, as given or as a folder ending in "/". */
export const DROP = [
  '.claude/',
  'public-edition/',
  'scripts/public-edition.mjs',
  // Pictures of the built-in character and of the regulars, and the script that draws them.
  'art/',
  'server/scripts/avatar-export.js',
  // Notes on moving this streamer's own install from V2.
  'docs/MIGRATION.md',
];

/**
 * Test files about content that is left out: the built-in character, the
 * regulars, the themes not shipped. Left out with it, and taken out of the
 * test runner's list.
 */
export const DROP_TESTS = [
  // The built-in character, drawn and dressed: none in the edition.
  'server/scripts/smoke/avatar.js',
];

/**
 * Real names and ids in the code — viewers, accounts, a Discord server's
 * channels and roles, the streamer's OBS scenes and sources — swapped for
 * made-up ones, the same everywhere so the tests that use them still agree.
 * A word is matched without case; a pattern, as it is written. Either is
 * written in the case found (all lower stays all lower).
 */
export const SWAPS = [
  ['i_might_be_simon', 'i_might_be_a_bot'],
  ['I_Am_Simon', 'I_Am_Streamer'],
  // As the tests write it for Discord, each underscore escaped.
  ['I\\\\_Am\\\\_Simon', 'I\\\\_Am\\\\_Streamer'],
  ['SimonBot', 'StreamBot'],
  ['samuri_02', 'ninja_07'],
  ['NelsoNyxx', 'PixelPepp'],
  ['NelsoNyx', 'PixelPep'],
  ['BetoTV', 'BenjiTV'],
  ['bassnojado', 'basslinekid'],
  ['Salva1999', 'Rocco1999'],
  ['Switsed', 'Sharky'],
  // Friends from game nights, in the tests and in the Library's sample players and call.
  // Longer names first, so "Samuri" is not read as "Samu".
  ['Samuri', 'Ninja'],
  ['Samu', 'Benji'],
  ['Krifox', 'Moxie'],
  ['Zorito', 'Pancho'],
  ['Nelson', 'Nolan'],
  ['𝒮𝒶𝓉𝓊𝓇𝓃', '𝒫𝒾𝓍ℯ𝓁'],
  ['saturn', 'pixel'],
  ['1306050655881793586', '1199000000000000001'],
  ['1305612807185633351', '1199000000000000002'],
  ['1306060026590531694', '1199000000000000003'],
  ['1306057976997478410', '1199000000000000004'],
  ['1305613143908679700', '1199000000000000005'],
  ['1555692440415899668', '1199000000000000006'],
  ['1314638946818588762', '1199000000000000007'],
  /*
    The streamer's OBS: the names the app gives the remote players' browser
    sources and the stand-in for whichever is on screen, and the scenes and
    sources in the examples and tests. Patterns, so "Jugadores" and "in game"
    in a sentence are left alone.
  */
  [/Jugador en pantalla/g, 'Player on screen'],
  [/\bJugador(?=(?: |%20)(?:[1-9N]\b|\$\{|\(|\[))/g, 'Player'],
  // After "Player 4" in order, as the real one comes after "Jugador 4": the tests sort them.
  [/Monitor Principal/g, 'Screen Capture'],
  [/In Game - Main/g, 'Gameplay'],
  [/\bIn[ -]Game\b/g, 'Gameplay'],
  ['st-in-game-main', 'st-gameplay'],
  ['Hablación', 'Conversación'],
  ['Hablacion', 'Conversacion'],
  // A comment inside a look's stylesheet, which changes only here: changed in the app, every layer wearing the look would see a new version of it.
  ['in the layout colour, the hoodie is the colour of the block', 'in the layout colour, an avatar dressed in it is the colour of the block'],
  // The streamer's own name, where the tests and the Library's samples use it for a person. The app keeps its name.
  [/\bSimon\b(?! ?Says|-Default)/g, 'Rowan'],
  [/\bSIMON\b(?! SAYS)/g, 'ROWAN'],
  [/\bsimon\b(?!-default|-says)/g, 'rowan'],
  // A friend's nickname in the call, in the tests.
  ['Tiburón', 'Delfín'],
];

/** Anything here still in the edition after the swaps stops the build: case does not matter. */
export const FORBIDDEN = [
  ...SWAPS.filter(([real]) => typeof real === 'string').map(([real]) => real),
  'alvarado', 'bastian', 'sucbrenda', 'petrikov', 'Saturno', 'simonsays_phone',
  // The built-in character and its outfits.
  'mega simon', 'megasimon', 'waiter', 'mesero', 'maid', 'sirvienta', 'zelda', 'the hoodie', 'la sudadera',
  // The streamer's OBS scenes and sources.
  // ("jugador 2" alone stays: it is what a viewer may type for seat 2.)
  'jugador en pantalla', 'jugador ${', 'jugador (', 'jugador [', 'jugador%20', 'jugador 1 to 4', 'jugador 1 a 4',
  'monitor principal', 'in game - main', 'in-game', 'hablaci',
];

/** The licence line every file carries, and what it becomes. */
export const LICENSE_HEADER = ['SPDX-License-Identifier: Apache-2.0', 'SPDX-License-Identifier: Apache-2.0 AND LicenseRef-Commons-Clause-1.0'];
