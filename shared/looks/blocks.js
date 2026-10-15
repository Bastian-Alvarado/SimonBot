/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The "Building blocks" theme: every look it has, for every kind of layer it dresses.
 * One of the themes in the Library (shared/looks/index.js lists them, in order).
 */

import { A } from './common.js';

const look =
  {
    id: 'blocks',
    name: 'Building blocks',
    hint: 'Backgrounds, frames and textures with no look of their own — the pieces you build one out of.',
    objects: [
      {
        id: 'block-notched',
        layerType: 'shape',
        previewOver: true, // Its corners are cut out of something: over nothing it looked like Frosted glass.
        name: 'Notched panel',
        hint: 'Corners cut off, the way a marathon cuts them.',
        css: `[data-shape="box"] {
  background: #0d1117e6 !important;
  border: 2px solid #3a4455;
  clip-path: polygon(22px 0, 100% 0, 100% calc(100% - 22px), calc(100% - 22px) 100%, 0 100%, 0 22px);
}`,
      },
      {
        id: 'block-titled',
        layerType: 'shape',
        name: 'Titled box',
        hint: 'An accent strip across the top, dark body beneath.',
        css: `[data-shape="box"] {
  background:
    linear-gradient(${A}, ${A}) top left / 100% 34px no-repeat,
    #09090be6 !important;
  border: 1px solid #2a3040;
  border-radius: 6px !important;
}`,
      },
      {
        id: 'block-glass',
        layerType: 'shape',
        previewOver: true, // It blurs what is behind it: over nothing it was a plain dark box.
        name: 'Frosted glass',
        hint: 'Blurs the canvas layers behind it. Not the game — the browser cannot see that.',
        css: `[data-shape="box"] {
  background: rgba(20,24,34,.45) !important;
  backdrop-filter: blur(14px);
  border: 1px solid rgba(255,255,255,.14);
  border-radius: 10px !important;
}`,
      },
      {
        id: 'block-frame',
        layerType: 'shape',
        name: 'Frame',
        hint: 'Hollow outline for a camera or a feed. Put it above what it frames.',
        css: `[data-shape="box"] {
  background: transparent !important;
  border: 3px solid ${A};
  box-shadow: 0 0 0 1px #00000088, inset 0 0 0 1px #00000088;
}`,
      },
      {
        id: 'block-brackets',
        layerType: 'shape',
        name: 'Corner brackets',
        hint: 'Frames without boxing in. Every longhand needs !important, or it comes out solid.',
        /*
          The !important on size, position and repeat is load-bearing. The
          shape writes `background` inline, that shorthand resets all three,
          and without it the eight gradients each fill the whole box.
        */
        css: `[data-shape="box"] {
  background: transparent !important;
  border: 0 !important;
  --b: ${A};
  background-image:
    linear-gradient(var(--b), var(--b)), linear-gradient(var(--b), var(--b)),
    linear-gradient(var(--b), var(--b)), linear-gradient(var(--b), var(--b)),
    linear-gradient(var(--b), var(--b)), linear-gradient(var(--b), var(--b)),
    linear-gradient(var(--b), var(--b)), linear-gradient(var(--b), var(--b)) !important;
  background-size: 34px 4px, 4px 34px, 34px 4px, 4px 34px,
    34px 4px, 4px 34px, 34px 4px, 4px 34px !important;
  background-position:
    left top, left top, right top, right top,
    left bottom, left bottom, right bottom, right bottom !important;
  background-repeat: no-repeat !important;
}`,
      },
      {
        id: 'block-scanlines',
        layerType: 'shape',
        previewOver: true, // It lies over a picture: over the checkerboard it could hardly be seen.
        name: 'Scanlines',
        hint: 'A texture to lay over a camera or a feed, not behind it.',
        css: `[data-shape="box"] {
  background: repeating-linear-gradient(0deg, rgba(0,0,0,.28) 0 1px, transparent 1px 3px) !important;
}`,
      },
      {
        id: 'block-rule',
        layerType: 'shape',
        name: 'Fading rule',
        hint: 'A divider that fades out at both ends. Make the layer a few pixels tall.',
        previewSize: { width: 520, height: 16 },
        css: `[data-shape="box"] {
  background: linear-gradient(90deg, transparent, ${A}, transparent) !important;
}`,
      },
    ],
  };

export default look;
