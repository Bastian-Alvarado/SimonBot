/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The themes in the Library, in the order it shows them: one file each, so a
 * theme can be added, changed or left out on its own. Each is a theme object as
 * shared/css-presets.js describes; CSS_LOOKS there is this list.
 */

import marathon from './marathon.js';
import simonsays from './simonsays.js';
import rack from './rack.js';
import cyberpunky from './cyberpunky.js';
import emergency from './emergency.js';
import footage from './footage.js';
import mania from './mania.js';
import starting from './starting.js';
import blocks from './blocks.js';

export const LOOK_THEMES = [marathon, simonsays, rack, cyberpunky, emergency, footage, mania, starting, blocks];
