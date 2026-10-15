/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The "Starting screen" theme: every look it has, for every kind of layer it dresses.
 * One of the themes in the Library (shared/looks/index.js lists them, in order).
 */

const look =
  {
    id: 'starting',
    name: 'Starting screen',
    hint: 'A panelled wall and a bezelled monitor, in the language of the 2017 marathon screens.',
    objects: [
      {
        id: 'starting-wall',
        layerType: 'shape',
        name: 'Panelled wall',
        hint: 'Full-canvas backdrop with seams and a vignette. Keep it at the bottom of the stack.',
        css: `[data-shape="box"] {
  background:
    repeating-linear-gradient(90deg, rgba(0,0,0,.22) 0 2px, transparent 2px 172px),
    repeating-linear-gradient(0deg, rgba(255,255,255,.03) 0 2px, transparent 2px 210px),
    linear-gradient(180deg, #3a4759, #2b3546) !important;
}

[data-shape="box"]::after {
  content: "";
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at 50% 45%, transparent 35%, rgba(0,0,0,.55) 100%);
}`,
      },
      {
        id: 'starting-housing',
        layerType: 'countdown',
        name: 'Monitor housing',
        hint: 'A bezel with an inset screen and level meters. Set the clock colour to #4ade80.',
        /*
          Every part is a background layer rather than a pseudo-element. A
          positioned ::before paints above the countdown's own text and hides
          the digits, which is exactly what the first version of this did.
        */
        css: `:scope {
  box-sizing: border-box;
  border: 2px solid #4a5769;
  border-radius: 14px;
  box-shadow: inset 0 2px 0 rgba(255,255,255,.14), 0 10px 30px rgba(0,0,0,.55);
  background:
    repeating-linear-gradient(180deg, #f0a12c 0 7px, transparent 7px 13px)
      left 24px top 20px / 16px calc(100% - 40px) no-repeat,
    repeating-linear-gradient(180deg, #4ade80 0 7px, transparent 7px 13px)
      right 24px top 20px / 16px calc(100% - 40px) no-repeat,
    linear-gradient(#05070a, #05070a)
      left 64px top 12px / calc(100% - 128px) calc(100% - 24px) no-repeat,
    linear-gradient(180deg, #232c3a, #12171f);
}`,
      },
      {
        id: 'starting-pill',
        layerType: 'shape',
        name: 'Now-playing pill',
        hint: 'A bordered pill for the bottom. Put a text layer over it.',
        css: `[data-shape="box"] {
  background: #10141c !important;
  border: 2px solid #98a4b6;
  border-radius: 10px !important;
}`,
      },
      {
        id: 'starting-bulkhead',
        layerType: 'shape',
        name: 'Bulkhead',
        hint: 'A chamfered door frame for the left edge. Mirror the polygon for the right.',
        css: `[data-shape="box"] {
  background: linear-gradient(90deg, #47566b, #313d4e) !important;
  clip-path: polygon(0 0, 100% 0, 100% 34%, 72% 50%, 100% 66%, 100% 100%, 0 100%);
  box-shadow: inset -2px 0 0 rgba(0,0,0,.45);
}`,
      },
    ],
  };

export default look;
