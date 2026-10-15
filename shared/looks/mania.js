/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The "Mania Menu" theme: every look it has, for every kind of layer it dresses.
 * One of the themes in the Library (shared/looks/index.js lists them, in order).
 */

const look =
  {
    id: 'mania',
    name: 'Mania Menu',
    hint: 'A casual night in the colours of a 16-bit platformer\'s menus: flat bright grounds with huge rings, a blue title banner with a zigzag edge, black slanted menu bars with the chosen one underlined, round button prompts, 1P–4P player cards and gold HUD lettering.',
    /*
      Drawn from the menus of Sonic Mania — the main menu, the competition
      screen, the save select, the title cards — and not from its artwork:
      nothing here is a sprite. The rings, the cards, the banner and the bars
      are CSS, and the characters are whoever is on stream.

      One face throughout, Pixelify Sans: a heavy pixel letter close to the
      menus' own, bundled and free to use. The HUD's words — TIME, RINGS —
      stay in English, as they do in the game whatever language it is in.

      For casual streams rather than events: the plan is the main menu, the
      chat is a stack of menu bars, the viewers are rings and the camera sits
      in a player card. Every colour is a field; the ground defaults to the
      main menu's yellow, and the competition screen's green, the options'
      blue or anything else is one field away.
    */
    objects: [
      {
        id: 'mm-backdrop',
        layerType: 'shape',
        name: 'Menu backdrop',
        hint: 'The menu screen behind everything: a flat bright ground with a huge pale ring and an orange ring with two dots on it, turning slowly. Yellow like the main menu; make it green, blue or purple for the other screens. Where the game or a camera goes, cut a hole in it with the Hole fields so the source shows through.',
        previewSize: { width: 1920, height: 1080 },
        css: `@keyframes mmTurn { to { transform: translate(-50%, -50%) rotate(360deg); } }

:scope {
  --ground: #f2c53d; /* The ground */
  --ring: #93a9c4; /* The big ring */
  --orbit: #ef9a3a; /* The orange ring and its dots */
  --line: 36px; /* Ring thickness | 4-80 */
  --turn: 160s; /* One turn of the orange ring | 20-600 */
  --hole-x: 0px; /* Hole: from the left | 0-1920 */
  --hole-y: 0px; /* Hole: from the top | 0-1080 */
  --hole-w: 0px; /* Hole: width | 0-1920 */
  --hole-h: 0px; /* Hole: height | 0-1080 */
}

/*
  The hole is cut out of the whole box, rings and all: a source slot draws
  nothing, and OBS shows the source from under the overlay, so anything
  painted over the slot covers the game. Prefixed for the older browser OBS
  carries, then the standard way, which a newer one takes last.
*/
[data-shape="box"] {
  position: relative;
  overflow: hidden;
  background: var(--ground) !important;
  border-radius: 0 !important;
  -webkit-mask: linear-gradient(#000 0 0) var(--hole-x) var(--hole-y) / var(--hole-w) var(--hole-h) no-repeat, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask: linear-gradient(#000 0 0) var(--hole-x) var(--hole-y) / var(--hole-w) var(--hole-h) no-repeat, linear-gradient(#000 0 0);
  mask-composite: exclude;
}

/* The big ring: wider than the screen is tall, so only its sides show. */
[data-shape="box"]::before {
  content: '';
  position: absolute;
  left: 50%;
  top: 54%;
  width: 86%;
  aspect-ratio: 1;
  transform: translate(-50%, -50%);
  border: var(--line) solid var(--ring);
  border-radius: 50%;
}

/* The orange ring and its two dots, drawn rather than bordered so the dots are not cut off by the round corner. */
[data-shape="box"]::after {
  content: '';
  position: absolute;
  left: 50%;
  top: 50%;
  width: 56%;
  aspect-ratio: 1;
  transform: translate(-50%, -50%);
  background:
    radial-gradient(circle at 7.7% 74.4%, var(--orbit) 0 calc(var(--line) * 2.3), #0000 calc(var(--line) * 2.3 + 1px)),
    radial-gradient(circle at 92.3% 25.6%, var(--orbit) 0 calc(var(--line) * 2.3), #0000 calc(var(--line) * 2.3 + 1px)),
    radial-gradient(closest-side, #0000 calc(100% - var(--line)), var(--orbit) calc(100% - var(--line) + 1px) calc(100% - 1px), #0000 100%);
  animation: mmTurn var(--turn) linear infinite;
}`,
      },
      {
        id: 'mm-window',
        layerType: 'shape',
        name: 'Slanted window',
        hint: 'A hollow window with a thick black edge and its right side cut on the slant, the ground filling the corner beyond — the menu\'s picture of the game. Lay it over your camera or the game, and match the ground to the backdrop. With no slant it is a plain black frame, for a game that must not be cut.',
        previewSize: { width: 960, height: 540 },
        previewOver: true,
        css: `:scope {
  --ground: #f2c53d; /* Beyond the slant: the backdrop's ground */
  --line: #000000; /* The edge */
  --thick: 8px; /* Edge thickness | 2-24 */
  --slant: 34%; /* How far the cut leans | 0-70 */
}

[data-shape="box"] {
  background:
    linear-gradient(var(--line), var(--line)) left top / 100% var(--thick) no-repeat,
    linear-gradient(var(--line), var(--line)) left bottom / calc(100% - var(--slant)) var(--thick) no-repeat,
    linear-gradient(var(--line), var(--line)) left top / var(--thick) 100% no-repeat,
    linear-gradient(to bottom right, #0000 calc(50% - var(--thick) * .8), var(--line) calc(50% - var(--thick) * .8) calc(50% + var(--thick) * .8), var(--ground) calc(50% + var(--thick) * .8)) right top / var(--slant) 100% no-repeat,
    linear-gradient(var(--line), var(--line)) right top / var(--thick) 100% no-repeat !important;
  border-radius: 0 !important;
}`,
      },
      {
        id: 'mm-card-frame',
        layerType: 'shape',
        name: 'Player card',
        hint: 'A hollow player card from the competition screen to put your camera in: a thick red frame, coloured corners cut on the diagonal, and the player number in a black corner. 1P by default; the number is a field.',
        previewSize: { width: 640, height: 480 },
        previewOver: true,
        css: `:scope {
  --frame: #c71f2d; /* The frame */
  --dark: #6d0f18; /* Its dark edge */
  --corner: #e2334d; /* Top corner */
  --low: #4a55d8; /* Bottom corner */
  --low-2: #7c5ce0; /* Its stripe */
  --player: 1; /* Player number | 1-8 */
  --thick: 12px; /* Frame thickness | 4-40 */
  --tag: 34px; /* Number size | 12-90 */
  --corners: 20%; /* Coloured corners | 0-40 */
}

[data-shape="box"] {
  counter-reset: mmp var(--player);
  position: relative;
  background:
    linear-gradient(135deg, var(--corner) 50%, #0000 50%) left top / var(--corners) calc(var(--corners) * 1.3) no-repeat,
    linear-gradient(-45deg, var(--low) 0 34%, var(--low-2) 34% 50%, #0000 50%) right bottom / calc(var(--corners) * 1.5) calc(var(--corners) * 1.9) no-repeat,
    linear-gradient(-135deg, #000 50%, #0000 50%) right top / calc(var(--tag) * 3.2) calc(var(--tag) * 2.2) no-repeat !important;
  border: var(--thick) solid var(--frame) !important;
  border-radius: 0 !important;
  box-shadow: inset 0 0 0 3px var(--dark), 0 0 0 3px var(--dark), 8px 8px 0 #0000004d;
}

[data-shape="box"]::after {
  content: counter(mmp) 'P';
  position: absolute;
  top: calc(var(--tag) * .18);
  right: calc(var(--tag) * .3);
  font: 700 var(--tag)/1 'Pixelify Sans', monospace;
  color: #ffffff;
}`,
      },
      {
        id: 'mm-bands',
        layerType: 'shape',
        name: 'Title card bands',
        hint: 'The four colours of a zone\'s title card — blue, yellow, red and green — laid across on the diagonal with black between them. For a starting or break screen, or behind a title.',
        previewSize: { width: 1920, height: 1080 },
        css: `:scope {
  --one: #1f3fc8; /* First band */
  --two: #f5c400; /* Second band */
  --three: #e0262a; /* Third band */
  --four: #22a84a; /* Fourth band */
  --line: #000000; /* Between them */
  --gap: 10px; /* Between the bands | 0-40 */
}

[data-shape="box"] {
  background: linear-gradient(115deg,
    var(--one) 0 calc(28% - var(--gap)), var(--line) 0 28%,
    var(--two) 0 calc(50% - var(--gap)), var(--line) 0 50%,
    var(--three) 0 calc(72% - var(--gap)), var(--line) 0 72%,
    var(--four) 0) !important;
  border-radius: 0 !important;
}`,
      },
      {
        id: 'mm-checker',
        layerType: 'shape',
        name: 'Checkered hill',
        hint: 'The checkered earth of the first zone with a strip of grass along the top. Lay it along the bottom of a break screen as the ground everything stands on.',
        previewSize: { width: 1920, height: 300 },
        css: `:scope {
  --dirt: #b4601c; /* Dark squares */
  --dirt-2: #e08a34; /* Light squares */
  --grass: #3cba1e; /* The grass */
  --grass-2: #1d7a12; /* Its shade */
  --tile: 64px; /* Square size | 16-200 */
  --top: 26px; /* Grass depth | 0-80 */
}

[data-shape="box"] {
  background:
    linear-gradient(var(--grass), var(--grass)) left top / 100% var(--top) no-repeat,
    linear-gradient(-45deg, #0000 50%, var(--grass-2) 0) left 0 top var(--top) / calc(var(--top) * .8) calc(var(--top) * .4) repeat-x,
    linear-gradient(45deg, #0000 50%, var(--grass-2) 0) left 0 top var(--top) / calc(var(--top) * .8) calc(var(--top) * .4) repeat-x,
    conic-gradient(var(--dirt) 25%, var(--dirt-2) 0 50%, var(--dirt) 0 75%, var(--dirt-2) 0) left 0 top var(--top) / calc(var(--tile) * 2) calc(var(--tile) * 2) !important;
  border-radius: 0 !important;
}`,
      },
      {
        id: 'mm-ring',
        layerType: 'shape',
        previewSize: { width: 220, height: 220 },
        name: 'Spinning ring',
        hint: 'One gold ring, turning on the spot the way it does in the game. Best on a small square layer; scatter a few over a break screen.',
        css: `@keyframes mmSpin { 50% { transform: scaleX(.14); } }

:scope {
  --gold: #ffd21f; /* The gold */
  --shade: #c47f00; /* Its shade */
  --shine: #fff6c4; /* Its shine */
  --turn: 1.2s; /* One turn | 0.4-6 */
}

[data-shape="box"] {
  border-radius: 50% !important;
  background: radial-gradient(circle, #0000 0 47%, var(--shade) 49% 53%, var(--gold) 55% 68%, var(--shine) 70% 74%, var(--gold) 76% 86%, var(--shade) 88% 98%, #0000 100%) !important;
  transform: scale(.86);
  animation: mmSpin var(--turn) steps(8) infinite;
}`,
      },
      {
        id: 'mm-banner',
        layerType: 'text',
        name: 'Title banner',
        previewSize: { width: 700, height: 130 },
        previewConfig: { text: 'Main Menu', fontSize: 60, align: 'center' },
        hint: 'The menu\'s title banner: a blue band pointed at both ends, its lower edge red on one side and green on the other with a zigzag between, and the words in gold with a white shine. Size the layer to the banner you want.',
        css: `:scope {
  --banner: #1430b8; /* The banner */
  --edge: #e8262a; /* Lower edge, left */
  --edge-2: #2cb43c; /* Lower edge, right */
  --gold: #ffd21f; /* The words */
  --gold-2: #ffa800; /* Their lower half */
  --shine: #ffffff; /* The shine across them */
  --outline: #0b0b3a; /* Their outline */
}

[data-text="box"] {
  position: relative;
  z-index: 0;
  justify-content: center !important;
  padding: 0 10% 2%;
}

[data-text="box"]::before,
[data-text="box"]::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  z-index: -1;
  clip-path: polygon(7% 0, 93% 0, 100% 50%, 93% 100%, 62% 100%, 59% 84%, 56% 100%, 53% 84%, 50% 100%, 47% 84%, 44% 100%, 41% 84%, 38% 100%, 7% 100%, 0 50%);
}

/* The coloured edge, the same shape set a little lower. */
[data-text="box"]::before { top: 9%; bottom: 0; z-index: -2; background: linear-gradient(90deg, var(--edge) 50%, var(--edge-2) 50%); }
[data-text="box"]::after { top: 0; bottom: 9%; background: var(--banner); }

[data-text="words"] {
  font-family: 'Pixelify Sans', monospace;
  font-weight: 700 !important;
  line-height: 1.1 !important;
  background: linear-gradient(180deg, var(--gold) 0 42%, var(--shine) 42% 56%, var(--gold-2) 56%) 0 0 / 100% 1.1em;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: none;
  filter:
    drop-shadow(.05em 0 0 var(--outline)) drop-shadow(-.05em 0 0 var(--outline))
    drop-shadow(0 .05em 0 var(--outline)) drop-shadow(0 -.05em 0 var(--outline))
    drop-shadow(.05em .07em 0 var(--outline));
}`,
      },
      {
        id: 'mm-option',
        layerType: 'text',
        name: 'Menu option',
        previewSize: { width: 620, height: 110 },
        previewConfig: { text: 'Mania Mode', fontSize: 50, align: 'left' },
        hint: 'One option on the main menu: a black bar slanted at both ends, the words in white, and the red strip under it that says this one is chosen. Stack a few, each a little further left, for the menu itself.',
        css: `:scope {
  --bar: #000000; /* The bar */
  --ink: #ffffff; /* The words */
  --chosen: #ec2f5b; /* The strip under it */
  --cut: 0.9em; /* How far the ends slant | 0-3 */
}

[data-text="box"] {
  position: relative;
  z-index: 0;
  justify-content: center !important;
  padding: 0 var(--cut) .12em calc(var(--cut) + .35em);
}

[data-text="box"]::before,
[data-text="box"]::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  clip-path: polygon(var(--cut) 0, 100% 0, calc(100% - var(--cut)) 100%, 0 100%);
}

[data-text="box"]::before { top: 0; bottom: .2em; z-index: -1; background: var(--bar); }
[data-text="box"]::after { top: .2em; bottom: 0; left: .25em; z-index: -2; background: var(--chosen); }

[data-text="words"] {
  font-family: 'Pixelify Sans', monospace;
  font-weight: 700 !important;
  color: var(--ink);
  text-transform: uppercase;
  letter-spacing: .02em !important;
  text-shadow: none;
}`,
      },
      {
        id: 'mm-hud',
        layerType: 'text',
        name: 'HUD lettering',
        previewSize: { width: 520, height: 110 },
        previewConfig: { text: 'Score 12450', fontSize: 52, align: 'left' },
        hint: 'Words the way the heads-up display writes SCORE, TIME and RINGS: heavy gold capitals with a dark outline and a hard shadow. For a corner of the game.',
        css: `:scope {
  --gold: #ffd21f; /* The words */
  --gold-2: #f08c00; /* Their lower half */
  --outline: #0b0b2e; /* The outline */
}

[data-text="words"] {
  font-family: 'Pixelify Sans', monospace;
  font-weight: 700 !important;
  line-height: 1.1 !important;
  text-transform: uppercase;
  letter-spacing: .04em !important;
  background: linear-gradient(180deg, var(--gold) 0 55%, var(--gold-2) 55%) 0 0 / 100% 1.1em;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: none;
  filter:
    drop-shadow(.05em 0 0 var(--outline)) drop-shadow(-.05em 0 0 var(--outline))
    drop-shadow(0 .05em 0 var(--outline)) drop-shadow(0 -.05em 0 var(--outline))
    drop-shadow(.06em .08em 0 var(--outline));
}`,
      },
      {
        id: 'mm-prompt',
        layerType: 'text',
        name: 'Button prompt',
        previewSize: { width: 440, height: 100 },
        previewConfig: { text: 'Confirm', fontSize: 44, align: 'left' },
        hint: 'A button prompt from the corner of the menus: a round button with its letter, and the words on a black tag. The button is a field — 1 is A, 2 is B, 24 is X, 25 is Y — and so is its colour.',
        /*
          The letter is a counter shown as a capital, so which button it is can
          be a number in a field: A is 1, B is 2, and so on.
        */
        css: `:scope {
  --key: 1; /* Button: 1 is A, 2 is B, 24 is X, 25 is Y | 1-26 */
  --button: #2fb34a; /* The button */
  --tag: #000000; /* The tag */
  --ink: #ffffff; /* The words */
  --outline: #000000; /* The outlines */
}

[data-text="box"] { justify-content: center !important; }

[data-text="words"] {
  position: relative;
  z-index: 0;
  width: auto !important;
  align-self: flex-start;
  margin-left: .1em;
  padding: .12em 1.3em .12em 1.75em;
  font-family: 'Pixelify Sans', monospace;
  font-weight: 700 !important;
  color: var(--ink);
  text-transform: uppercase;
  letter-spacing: .02em !important;
  text-shadow: none;
}

/* The button. */
[data-text="words"]::before {
  content: counter(mmkey, upper-alpha);
  counter-reset: mmkey var(--key);
  position: absolute;
  left: -.1em;
  top: 50%;
  width: 1.45em;
  height: 1.45em;
  transform: translateY(-50%);
  display: grid;
  place-items: center;
  box-sizing: border-box;
  border: .1em solid var(--outline);
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #ffffff66 0 18%, #0000 40%), var(--button);
  color: #ffffff;
  font-size: 1em;
  line-height: 1;
  text-shadow: .06em .06em 0 var(--outline);
}

/* The tag: slanted at its end. */
[data-text="words"]::after {
  content: '';
  position: absolute;
  inset: 0 0 0 .6em;
  z-index: -1;
  background: var(--tag);
  clip-path: polygon(0 0, 100% 0, calc(100% - .7em) 100%, 0 100%);
}`,
      },
      {
        id: 'mm-name-strip',
        layerType: 'text',
        name: 'Name strip',
        previewSize: { width: 480, height: 90 },
        previewConfig: { text: 'Simon', fontSize: 44, align: 'center' },
        hint: 'The black strip a player card has its name on, with red arrows at both ends, as if you could pick somebody else. Lay it along the bottom of a Player card.',
        css: `:scope {
  --bar: #000000; /* The strip */
  --ink: #ffffff; /* The name */
  --arrow: #e0262e; /* The arrows */
}

[data-text="box"] {
  position: relative;
  justify-content: center !important;
  background:
    linear-gradient(var(--bar), var(--bar)) center / 100% 100% no-repeat;
}

[data-text="box"]::before,
[data-text="box"]::after {
  content: '';
  position: absolute;
  top: 50%;
  width: .55em;
  height: .9em;
  transform: translateY(-50%);
  background: var(--arrow);
  font-size: min(44px, 55cqh);
}

[data-text="box"]::before { left: .4em; clip-path: polygon(100% 0, 100% 100%, 0 50%); }
[data-text="box"]::after { right: .4em; clip-path: polygon(0 0, 100% 50%, 0 100%); }

[data-text="words"] {
  padding: 0 1.4em;
  font-family: 'Pixelify Sans', monospace;
  font-weight: 700 !important;
  color: var(--ink);
  text-transform: uppercase;
  letter-spacing: .03em !important;
  text-shadow: none;
}`,
      },
      {
        id: 'mm-titlecard',
        layerType: 'alert',
        applies: 'alert',
        name: 'Title card',
        hint: 'The alert as a zone\'s title card: the four colour bands on the slant behind it, the message in gold with a white shine, and the name on a black bar in white — as if they were the next zone. For raids, subs and the big moments; write the message with the name first or last, since the name gets its own bar under the rest.',
        css: `:scope {
  --one: #1f3fc8; /* First band */
  --two: #f5c400; /* Second band */
  --three: #e0262a; /* Third band */
  --four: #22a84a; /* Fourth band */
  --bar: #000000; /* The name's bar */
  --gold: #ffd21f; /* The message */
  --outline: #0b0b2e; /* Outlines */
}

:scope {
  position: relative;
  z-index: 0;
  padding: 26px 64px 30px;
  text-align: center;
  font-family: 'Pixelify Sans', monospace;
}

:scope::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  background: linear-gradient(115deg, var(--one) 0 26%, #000 0 27%, var(--two) 0 49%, #000 0 50%, var(--three) 0 72%, #000 0 73%, var(--four) 0);
  clip-path: polygon(34px 0, 100% 0, calc(100% - 34px) 100%, 0 100%);
}

[data-alert="caption"] {
  display: flex;
  flex-direction: column;
  align-items: center;
  font-family: var(--alert-font, 'Pixelify Sans', monospace) !important;
  font-weight: 700;
  text-shadow: none !important;
}

/* The name's bar goes last, under the message, wherever the template puts the name. */
[data-alert="message"] {
  color: var(--alert-text, var(--gold)) !important;
  text-transform: uppercase;
  filter:
    drop-shadow(2px 0 0 var(--outline)) drop-shadow(-2px 0 0 var(--outline))
    drop-shadow(0 2px 0 var(--outline)) drop-shadow(0 -2px 0 var(--outline))
    drop-shadow(3px 4px 0 var(--outline));
}

[data-alert="name"] {
  order: 2;
  margin-top: 10px;
  padding: 4px 34px 6px;
  color: var(--alert-name, #ffffff) !important;
  background: var(--bar);
  clip-path: polygon(16px 0, 100% 0, calc(100% - 16px) 100%, 0 100%);
  text-transform: uppercase;
  font-size: 1.25em;
}

[data-alert="media"] { border-radius: 0; filter: drop-shadow(4px 4px 0 #000); }`,
      },
      {
        id: 'mm-menu-alert',
        layerType: 'alert',
        applies: 'alert',
        name: 'Chosen option',
        hint: 'The alert as the menu option somebody just picked: a black bar slanted at both ends with the red strip under it, the name in gold and the message in white. Small enough for follows and cheers.',
        css: `:scope {
  --bar: #000000; /* The bar */
  --chosen: #ec2f5b; /* The strip under it */
  --gold: #ffd21f; /* The name */
  --ink: #ffffff; /* The message */
}

:scope {
  position: relative;
  z-index: 0;
  padding: 16px 52px 22px 58px;
  font-family: 'Pixelify Sans', monospace;
}

:scope::before,
:scope::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  clip-path: polygon(30px 0, 100% 0, calc(100% - 30px) 100%, 0 100%);
}

:scope::before { top: 0; bottom: 8px; z-index: -1; background: var(--bar); }
:scope::after { top: 8px; bottom: 0; left: 10px; z-index: -2; background: var(--chosen); }

[data-alert="caption"] {
  font-family: var(--alert-font, 'Pixelify Sans', monospace) !important;
  font-weight: 700;
  color: var(--alert-text, var(--ink)) !important;
  text-transform: uppercase;
  text-shadow: none !important;
}

[data-alert="name"] { color: var(--alert-name, var(--gold)) !important; }
[data-alert="media"] { border-radius: 0; }`,
      },
      {
        id: 'mm-chat',
        layerType: 'chat',
        applies: 'chat',
        name: 'Menu bar chat',
        hint: 'Chat as a stack of menu options: every message a black bar slanted at both ends, names in their own colour and the words in white pixel letters. Your own messages get the red strip of the chosen option. Applying it turns the chat theme to Custom.',
        css: `:scope {
  --bar: #000000e6; /* The bars */
  --ink: #ffffff; /* The words */
  --chosen: #ec2f5b; /* Under your own messages */
  --cut: 12px; /* How far the ends slant | 0-30 */
}

[data-chat="row"] {
  position: relative;
  z-index: 0;
  /* A colour chosen for the rows fills the slanted bar, below, rather than a rectangle behind it. */
  background-color: transparent !important;
  border: 0 !important;
  border-radius: var(--chat-row-radius, 0) !important;
  padding: var(--chat-row-padding, 7px 20px 7px 24px) !important;
  font-family: 'Pixelify Sans', monospace;
}

[data-chat="row"]::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  background: var(--chat-row-bg, var(--bar));
  clip-path: polygon(var(--cut) 0, 100% 0, calc(100% - var(--cut)) 100%, 0 100%);
}

[data-chat-rank="broadcaster"]::after {
  content: '';
  position: absolute;
  inset: 5px 0 -5px 6px;
  z-index: -2;
  background: var(--chosen);
  clip-path: polygon(var(--cut) 0, 100% 0, calc(100% - var(--cut)) 100%, 0 100%);
}

[data-chat="user"] { font-weight: var(--chat-user-weight, 700) !important; text-shadow: 2px 2px 0 #000; }
[data-chat="text"] { color: var(--chat-text, var(--ink)) !important; font-weight: 400; }
[data-chat="time"] { color: #9a9a9a !important; }
[data-chat="avatar"] { border-radius: 0 !important; box-shadow: 0 0 0 2px #000; }
[data-chat="highlight"] { background: transparent !important; border: 0 !important; }`,
      },
      {
        id: 'mm-omnibar',
        layerType: 'omnibar',
        name: 'Menu strip',
        hint: 'The bar as a black strip along the menu, each label a red-pink chip slanted at both ends, the words in white pixel letters.',
        css: `:scope {
  --bar: #000000; /* The bar */
  --chip: #ec2f5b; /* The labels */
  --ink: #ffffff; /* The words */
}

[data-omnibar="bar"] {
  background: var(--omnibar-background, var(--bar)) !important;
  border-radius: 0 !important;
  font-family: 'Pixelify Sans', monospace;
}

[data-omnibar-state="pinned"] { box-shadow: inset -3px 0 0 #ffffff26; }

[data-omnibar="label"] {
  background: var(--omnibar-accent, var(--chip));
  color: #ffffff !important;
  padding: .05em 1em;
  clip-path: polygon(.55em 0, 100% 0, calc(100% - .55em) 100%, 0 100%);
  font-weight: 700;
  letter-spacing: .04em;
}

[data-omnibar="value"] { color: var(--omnibar-text, var(--ink)) !important; font-weight: 700; letter-spacing: .02em; }`,
      },
      {
        id: 'mm-tallbar',
        layerType: 'omnibar',
        previewTall: true,
        name: 'Menu strip, tall',
        hint: 'For a tall omnibar: black, the context in a red-pink block, the goal as a gold bar on black, and the totals in white pixel figures with gold captions.',
        css: `:scope {
  --bar: #000000; /* The bar */
  --chip: #ec2f5b; /* The context and chips */
  --gold: #ffd21f; /* The goal and captions */
  --ink: #ffffff; /* The words */
}

[data-tallbar="bar"] {
  background: var(--omnibar-background, var(--bar)) !important;
  font-family: 'Pixelify Sans', monospace;
}

[data-tallbar="context"] { background: var(--omnibar-accent, var(--chip)); border-right: 0 !important; }
[data-tallbar="label"], [data-tallbar="sub"] { color: #ffffff !important; letter-spacing: .04em; }
[data-tallbar="title"] { color: var(--omnibar-text, var(--ink)) !important; }

[data-tallbar="goal-track"] { background: #ffffff1f !important; border-radius: 0 !important; }
[data-tallbar="goal-fill"] { background: linear-gradient(180deg, #fff2a0, var(--gold) 45%, #e09a00) !important; border-radius: 0 !important; }
[data-tallbar="goal-marker"] { background: var(--bar) !important; color: var(--gold) !important; border: 2px solid var(--gold) !important; }

[data-tallbar="chip"] { border-color: #ffffff2e !important; border-radius: 0 !important; }
[data-tallbar="chip-value"] { background: var(--omnibar-accent, var(--chip)) !important; color: #ffffff !important; }

[data-tallbar="pinned"] { border-left: 2px solid #ffffff26 !important; }
[data-tallbar="pinned-figure"] { color: var(--omnibar-text, var(--ink)) !important; }
[data-tallbar="pinned-caption"] { color: var(--gold) !important; }`,
      },
      {
        id: 'mm-countdown',
        layerType: 'countdown',
        name: 'Title banner countdown',
        hint: 'The countdown under a title banner: the label in gold on the blue banner with its zigzag edge, the time left in big white pixel figures with a dark outline. Write "Starting soon" as the label.',
        previewSize: { width: 640, height: 300 },
        css: `:scope {
  --banner: #1430b8; /* The banner */
  --edge: #e8262a; /* Lower edge, left */
  --edge-2: #2cb43c; /* Lower edge, right */
  --gold: #ffd21f; /* The label */
  --ink: #ffffff; /* The time */
  --outline: #0b0b2e; /* Outlines */
}

[data-countdown="clock"] { background: transparent !important; gap: .25em !important; font-family: 'Pixelify Sans', monospace; }

[data-countdown="label"] {
  position: relative;
  z-index: 0;
  padding: .45em 2.2em .6em;
  color: var(--countdown-label, var(--gold)) !important;
  font-family: 'Pixelify Sans', monospace;
  font-weight: 700 !important;
  letter-spacing: .06em !important;
  text-shadow: .08em .08em 0 var(--outline);
}

[data-countdown="label"]::before,
[data-countdown="label"]::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  clip-path: polygon(7% 0, 93% 0, 100% 50%, 93% 100%, 62% 100%, 59% 80%, 56% 100%, 53% 80%, 50% 100%, 47% 80%, 44% 100%, 41% 80%, 38% 100%, 7% 100%, 0 50%);
}

[data-countdown="label"]::before { top: .25em; bottom: 0; z-index: -2; background: linear-gradient(90deg, var(--edge) 50%, var(--edge-2) 50%); }
[data-countdown="label"]::after { top: 0; bottom: .25em; z-index: -1; background: var(--banner); }

[data-countdown="digits"] {
  font-family: 'Pixelify Sans', monospace !important;
  font-weight: 700 !important;
  color: var(--countdown-text, var(--ink)) !important;
  text-shadow:
    .05em 0 0 var(--outline), -.05em 0 0 var(--outline), 0 .05em 0 var(--outline), 0 -.05em 0 var(--outline),
    .05em .05em 0 var(--outline), -.05em -.05em 0 var(--outline), .05em -.05em 0 var(--outline), -.05em .05em 0 var(--outline),
    .07em .09em 0 var(--outline);
}

[data-countdown="paused"] { font-family: 'Pixelify Sans', monospace; color: var(--countdown-label, var(--gold)) !important; letter-spacing: .1em; }`,
      },
      {
        id: 'mm-time-hud',
        layerType: 'countdown',
        name: 'TIME',
        hint: 'The countdown as the heads-up display\'s clock: the label in gold capitals with a dark outline, the time left in white beside it. Small, for a corner.',
        previewSize: { width: 480, height: 120 },
        css: `:scope {
  --gold: #ffd21f; /* The label */
  --ink: #ffffff; /* The time */
  --outline: #0b0b2e; /* Outlines */
  --size: 0.5; /* Size, against the timer's own | 0.2-1.5 */
}

[data-countdown="clock"] {
  zoom: var(--size);
  flex-direction: row !important;
  justify-content: flex-start !important;
  align-items: baseline !important;
  gap: .4em !important;
  background: transparent !important;
  font-family: 'Pixelify Sans', monospace;
  --o:
    .06em 0 0 var(--outline), -.06em 0 0 var(--outline), 0 .06em 0 var(--outline), 0 -.06em 0 var(--outline),
    .06em .06em 0 var(--outline), -.06em -.06em 0 var(--outline), .06em -.06em 0 var(--outline), -.06em .06em 0 var(--outline),
    .08em .1em 0 var(--outline);
}

[data-countdown="label"] {
  font-family: 'Pixelify Sans', monospace;
  font-weight: 700 !important;
  letter-spacing: .04em !important;
  color: var(--countdown-label, var(--gold)) !important;
  text-shadow: var(--o);
}

[data-countdown="digits"] {
  font-family: 'Pixelify Sans', monospace !important;
  font-weight: 700 !important;
  color: var(--countdown-text, var(--ink)) !important;
  text-shadow: var(--o);
}

[data-countdown="paused"] { color: var(--countdown-label, var(--gold)) !important; text-shadow: var(--o); }`,
      },
      {
        id: 'mm-stopwatch',
        layerType: 'stopwatch',
        name: 'TIME clock',
        hint: 'The run timer as the heads-up display\'s TIME: the word in gold capitals and the time in white, both outlined. It blinks slowly while held, and turns gold when it is done.',
        previewSize: { width: 520, height: 120 },
        css: `@keyframes mmHeld { 50% { opacity: .35; } }

:scope {
  --gold: #ffd21f; /* TIME */
  --ink: #ffffff; /* The time */
  --outline: #0b0b2e; /* Outlines */
}

[data-stopwatch="clock"] { background: transparent !important; }

[data-stopwatch="digits"] {
  font-family: 'Pixelify Sans', monospace !important;
  font-weight: 700 !important;
  color: var(--stopwatch-colour, var(--ink)) !important;
  text-shadow:
    .05em 0 0 var(--outline), -.05em 0 0 var(--outline), 0 .05em 0 var(--outline), 0 -.05em 0 var(--outline),
    .05em .05em 0 var(--outline), -.05em -.05em 0 var(--outline), .05em -.05em 0 var(--outline), -.05em .05em 0 var(--outline),
    .07em .09em 0 var(--outline);
}

[data-stopwatch="digits"] { white-space: nowrap; }
[data-stopwatch="digits"]::before { content: 'TIME '; color: var(--gold); font-size: .5em; vertical-align: .35em; }
[data-stopwatch-mode="idle"] [data-stopwatch="digits"] { opacity: .6; }
[data-stopwatch-mode="paused"] [data-stopwatch="digits"] { animation: mmHeld 1s steps(1) infinite; }
[data-stopwatch-mode="finished"] [data-stopwatch="digits"] { color: var(--stopwatch-colour, var(--gold)) !important; }`,
      },
      {
        id: 'mm-viewers',
        layerType: 'viewers',
        name: 'RINGS',
        hint: 'The viewer count as the ring counter: RINGS in gold capitals, the count in white, both outlined, and the icons gold.',
        css: `:scope {
  --gold: #ffd21f; /* RINGS and the icons */
  --ink: #ffffff; /* The count */
  --outline: #0b0b2e; /* Outlines */
}

[data-viewers="box"] {
  background: var(--viewers-background, transparent) !important;
  border-radius: 0 !important;
  gap: .45em !important;
  align-items: center !important;
  font-family: 'Pixelify Sans', monospace;
  font-weight: 700 !important;
  --o:
    .06em 0 0 var(--outline), -.06em 0 0 var(--outline), 0 .06em 0 var(--outline), 0 -.06em 0 var(--outline),
    .06em .06em 0 var(--outline), -.06em -.06em 0 var(--outline), .06em -.06em 0 var(--outline), -.06em .06em 0 var(--outline),
    .08em .1em 0 var(--outline);
}

[data-viewers="box"]::before { content: 'RINGS'; color: var(--gold); text-shadow: var(--o); letter-spacing: .04em; }
[data-viewers="row"] { gap: .3em !important; align-items: center !important; }
[data-viewers="icon"] { color: var(--viewers-accent, var(--gold)) !important; filter: drop-shadow(2px 2px 0 var(--outline)); }
[data-viewers="count"] { color: var(--viewers-text, var(--ink)) !important; text-shadow: var(--o); }`,
      },
      {
        id: 'mm-nameplate',
        layerType: 'nameplate',
        name: 'Player name strip',
        hint: 'A name as a player card writes it: white capitals on a black strip with red arrows at both ends, the second line in gold above it.',
        css: `:scope {
  --bar: #000000; /* The strip */
  --ink: #ffffff; /* The name */
  --arrow: #e0262e; /* The arrows */
  --gold: #ffd21f; /* The second line */
}

[data-nameplate="plate"] {
  position: relative;
  flex-direction: column-reverse !important;
  align-items: center !important;
  background: var(--nameplate-background, var(--bar)) !important;
  border: 0 !important;
  border-radius: 0 !important;
  padding-left: 2.2em !important;
  padding-right: 2.2em !important;
  font-family: 'Pixelify Sans', monospace;
}

[data-nameplate="plate"]::before,
[data-nameplate="plate"]::after {
  content: '';
  position: absolute;
  top: 50%;
  width: .9em;
  height: 1.4em;
  transform: translateY(-50%);
  background: var(--nameplate-accent, var(--arrow));
}

[data-nameplate="plate"]::before { left: .6em; clip-path: polygon(100% 0, 100% 100%, 0 50%); }
[data-nameplate="plate"]::after { right: .6em; clip-path: polygon(0 0, 100% 50%, 0 100%); }

[data-nameplate="name"] { color: var(--nameplate-text, var(--ink)) !important; font-weight: 700 !important; letter-spacing: .02em !important; }
[data-nameplate="subtitle"] { color: var(--gold) !important; font-weight: 700 !important; text-transform: uppercase; letter-spacing: .08em; opacity: 1 !important; }`,
      },
      {
        id: 'mm-nameplate-option',
        layerType: 'nameplate',
        name: 'Chosen option plate',
        hint: 'A name as the chosen menu option: white on a black bar slanted at both ends, the red strip under it, the second line in grey like the options not chosen.',
        css: `:scope {
  --bar: #000000; /* The bar */
  --ink: #ffffff; /* The name */
  --chosen: #ec2f5b; /* The strip under it */
  --dim: #8c8c8c; /* The second line */
  --cut: 26px; /* How far the ends slant | 0-80 */
}

[data-nameplate="plate"] {
  position: relative;
  z-index: 0;
  /* A colour chosen for the plate fills the slanted bar, below. */
  background-color: transparent !important;
  border: 0 !important;
  border-radius: 0 !important;
  padding-left: calc(var(--cut) + 18px) !important;
  font-family: 'Pixelify Sans', monospace;
}

[data-nameplate="plate"]::before,
[data-nameplate="plate"]::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  clip-path: polygon(var(--cut) 0, 100% 0, calc(100% - var(--cut)) 100%, 0 100%);
}

[data-nameplate="plate"]::before { top: 0; bottom: 8px; z-index: -1; background: var(--nameplate-background, var(--bar)); }
[data-nameplate="plate"]::after { top: 8px; bottom: 0; left: 10px; z-index: -2; background: var(--nameplate-accent, var(--chosen)); }

[data-nameplate="name"] { color: var(--nameplate-text, var(--ink)) !important; font-weight: 700 !important; letter-spacing: .02em !important; }
[data-nameplate="subtitle"] { color: var(--dim) !important; font-weight: 700 !important; text-transform: uppercase; letter-spacing: .06em; opacity: 1 !important; }`,
      },
      {
        id: 'mm-zonecard',
        layerType: 'runcard',
        name: 'Zone card',
        hint: 'The game as a zone\'s title card: its name in white on a black bar with the four colour bands at the front, the platform and year in gold, the category on a red-pink chip.',
        css: `:scope {
  --bar: #000000; /* The bar */
  --one: #1f3fc8; /* First band */
  --two: #f5c400; /* Second band */
  --three: #e0262a; /* Third band */
  --four: #22a84a; /* Fourth band */
  --ink: #ffffff; /* The game */
  --gold: #ffd21f; /* Platform and year */
  --chip: #ec2f5b; /* The category */
}

[data-runcard="card"] {
  background:
    linear-gradient(115deg, #0000 0 2%, var(--one) 0 5%, var(--two) 0 8%, var(--three) 0 11%, var(--four) 0 14%, #0000 0) left top / 100% 100% no-repeat,
    var(--bar) !important;
  border: 0 !important;
  border-radius: 0 !important;
  clip-path: polygon(4% 0, 100% 0, 96% 100%, 0 100%);
  padding-left: 16% !important;
  font-family: 'Pixelify Sans', monospace;
  color: var(--ink) !important;
}

[data-runcard="title"] { color: var(--ink) !important; font-weight: 700 !important; text-transform: uppercase; letter-spacing: .02em; }
[data-runcard="machine"] { color: var(--gold) !important; font-weight: 700; letter-spacing: .06em; opacity: 1 !important; }

[data-runcard="category"] {
  display: inline-block;
  background: var(--runcard-accent, var(--chip)) !important;
  color: #ffffff !important;
  padding: 0 .7em;
  clip-path: polygon(.4em 0, 100% 0, calc(100% - .4em) 100%, 0 100%);
  text-transform: uppercase;
  font-weight: 700;
}

[data-runcard="estimate"] { color: #bdbdbd !important; font-weight: 700; }`,
      },
      {
        id: 'mm-competition',
        layerType: 'roster',
        name: 'Competition cards',
        hint: 'Everybody on as the competition screen\'s player cards: a red frame, coloured corners, the role in the black corner and the name on a black strip with red arrows. An empty seat says PRESS START.',
        css: `:scope {
  --frame: #c71f2d; /* The frame */
  --card: #a9e6cd; /* Inside the card */
  --corner: #e2334d; /* Top corner */
  --low: #4a55d8; /* Bottom corner */
  --bar: #000000; /* The name strip */
  --arrow: #e0262e; /* The arrows */
  --ink: #ffffff; /* The name */
}

[data-roster="seat"] {
  position: relative;
  background:
    linear-gradient(135deg, var(--corner) 50%, #0000 50%) left top / 26% 46% no-repeat,
    linear-gradient(-45deg, var(--low) 50%, #0000 50%) right bottom / 30% 50% no-repeat,
    var(--card) !important;
  border: 5px solid var(--frame);
  border-radius: 0 !important;
  box-shadow: 0 0 0 2px #6d0f18, 5px 5px 0 #0000004d;
  font-family: 'Pixelify Sans', monospace;
}

[data-roster="tab"] {
  position: absolute;
  top: 0;
  right: 0;
  z-index: 1;
  width: 2.2em !important;
  height: 1.7em;
  background: #000000 !important;
  clip-path: polygon(0 0, 100% 0, 100% 100%);
  align-items: flex-start !important;
  justify-content: flex-end !important;
  padding: .12em .2em 0 0;
}

[data-roster="role"] { color: #ffffff !important; font-weight: 700 !important; }

[data-roster="body"] { justify-content: flex-end !important; padding: 0 !important; }

[data-roster="name"] {
  position: relative;
  box-sizing: border-box;
  padding: .15em 1.3em;
  background: var(--bar);
  color: var(--ink) !important;
  font-weight: 700 !important;
  letter-spacing: .02em;
}

[data-roster="name"]::before,
[data-roster="name"]::after {
  content: '';
  position: absolute;
  top: 50%;
  width: .45em;
  height: .7em;
  transform: translateY(-50%);
  background: var(--arrow);
}

[data-roster="name"]::before { left: .35em; clip-path: polygon(100% 0, 100% 100%, 0 50%); }
[data-roster="name"]::after { right: .35em; clip-path: polygon(0 0, 100% 50%, 0 100%); }

[data-roster="pronouns"] { display: none; }
[data-roster="seat"][data-roster-empty="yes"] { opacity: 1 !important; filter: saturate(.25); }`,
      },
      {
        id: 'mm-players',
        layerType: 'players',
        name: 'Player select',
        hint: 'The players as a menu: the title on the blue banner, each player a black slanted bar with their colour as a ring before the name. Somebody out goes grey with the reason in red.',
        previewSize: { width: 620, height: 380 },
        css: `:scope {
  --banner: #1430b8; /* The title's banner */
  --gold: #ffd21f; /* The title */
  --bar: #000000; /* The bars */
  --ink: #ffffff; /* The names */
  --out: #8c8c8c; /* Somebody out */
  --stamp: #ec2f5b; /* Why */
}

[data-players="list"] { background: var(--players-background, transparent) !important; border-radius: 0 !important; font-family: 'Pixelify Sans', monospace; }

[data-players="title"] {
  background: var(--banner);
  color: var(--gold);
  text-align: center;
  font-weight: 700;
  clip-path: polygon(4% 0, 96% 0, 100% 50%, 96% 100%, 4% 100%, 0 50%);
  box-shadow: inset 0 -.18em 0 #e8262a;
  text-shadow: .08em .08em 0 #0b0b2e;
}

[data-players="row"] {
  background: var(--bar) !important;
  border-radius: 0 !important;
  clip-path: polygon(.6em 0, 100% 0, calc(100% - .6em) 100%, 0 100%);
  padding-left: .8em !important;
  padding-right: .8em !important;
  color: var(--players-text, var(--ink));
}

[data-players="name"] { font-weight: 700 !important; }

[data-players="dot"] {
  box-sizing: border-box;
  background: radial-gradient(circle, #0000 0 38%, currentColor 40%) !important;
  border: 0 !important;
}

[data-players-state="out"], [data-players-state="ejected"], [data-players-state="dead"] { opacity: 1 !important; }
[data-players-state] [data-players="name"] { text-decoration: none !important; }
[data-players-state="out"] [data-players="name"], [data-players-state="ejected"] [data-players="name"], [data-players-state="dead"] [data-players="name"] { color: var(--out) !important; }
[data-players="state"] { color: var(--stamp); font-weight: 700; text-transform: uppercase; }`,
      },
      {
        id: 'mm-voice',
        layerType: 'voice',
        name: 'Competition call',
        hint: 'The Discord call as the competition screen: everybody in a red player card numbered 1P, 2P, 3P, their name on a black strip, and whoever is talking framed in gold and bobbing on the spot.',
        css: `@keyframes mmBob { to { transform: translateY(-4%); } }

:scope {
  --frame: #c71f2d; /* The frame */
  --card: #a9e6cd; /* Inside the card */
  --corner: #e2334d; /* Top corner */
  --low: #4a55d8; /* Bottom corner */
  --talk: #ffd21f; /* Talking */
  --bob: 0.35s; /* One bob while talking | 0.15-2 */
}

[data-voice="list"] { counter-reset: mmp; }
[data-voice="member"] { counter-increment: mmp; }

[data-voice="frame"] {
  position: relative;
  box-sizing: border-box;
  background:
    linear-gradient(135deg, var(--corner) 50%, #0000 50%) left top / 34% 34% no-repeat,
    linear-gradient(-45deg, var(--low) 50%, #0000 50%) right bottom / 40% 40% no-repeat,
    var(--card);
  border: max(3px, 4cqw) solid var(--frame);
  border-radius: 0 !important;
  box-shadow: 0 0 0 2px #6d0f18;
  animation: none !important;
}

[data-voice="frame"]::after {
  content: counter(mmp) 'P';
  position: absolute;
  top: 0;
  right: 0;
  z-index: 2;
  padding: .1em .2em 1.2em 1.6em;
  background: #000000;
  clip-path: polygon(0 0, 100% 0, 100% 100%);
  color: #ffffff;
  font: 700 max(10px, 12cqw)/1 'Pixelify Sans', monospace;
}

[data-voice="avatar"], [data-voice="picture"] { border-radius: 0 !important; box-shadow: none !important; }

[data-voice-speaking="true"] [data-voice="frame"] {
  border-color: var(--voice-glow, var(--talk));
  animation: mmBob var(--bob) steps(2) infinite alternate !important;
}

[data-voice="name"] {
  background: #000000;
  color: #ffffff !important;
  padding: .15em .6em !important;
  font-family: 'Pixelify Sans', monospace !important;
  font-weight: 700 !important;
  text-transform: uppercase;
  text-shadow: none !important;
}

[data-voice="status"] { background: #e0262e !important; color: #ffffff !important; border-color: #000000 !important; }`,
      },
      {
        id: 'mm-rings-goal',
        layerType: 'goal',
        name: 'Ring meter',
        hint: 'The goal as a gold bar filling a black slot slanted at both ends, the label in gold HUD capitals and the numbers in white.',
        css: `:scope {
  --slot: #000000; /* The empty bar */
  --gold: #ffd21f; /* The bar and the label */
  --ink: #ffffff; /* The numbers */
  --outline: #0b0b2e; /* Outlines */
  --size: 22px; /* Text size | 10-60 */
}

:scope { font-family: 'Pixelify Sans', monospace; font-size: var(--size); }

[data-goal="track"] {
  height: 1.1em !important;
  background: var(--goal-track, var(--slot)) !important;
  border-radius: 0 !important;
  border: 3px solid var(--slot);
  clip-path: polygon(.6em 0, 100% 0, calc(100% - .6em) 100%, 0 100%);
  padding: 0 .3em;
}

[data-goal="fill"] {
  background: var(--goal-bar, linear-gradient(180deg, #fff2a0, var(--gold) 40%, #e09a00)) !important;
  border-radius: 0 !important;
}

[data-goal="label"], [data-goal="numbers"], [data-goal="percent"] {
  font-weight: 700;
  opacity: 1 !important;
  text-shadow:
    .06em 0 0 var(--outline), -.06em 0 0 var(--outline), 0 .06em 0 var(--outline), 0 -.06em 0 var(--outline),
    .08em .1em 0 var(--outline);
}

[data-goal="label"] { color: var(--goal-text, var(--gold)) !important; text-transform: uppercase; letter-spacing: .04em !important; }
[data-goal="numbers"], [data-goal="percent"] { color: var(--goal-text, var(--ink)) !important; }`,
      },
      {
        id: 'mm-soundtest',
        layerType: 'spotify',
        name: 'Sound test',
        hint: 'What is playing as the sound test: a black panel slanted at both ends, the label on a red-pink chip, the song in white, the artist in gold, the cover edged in black with a red-pink shadow.',
        css: `:scope {
  --bar: #000000e6; /* The panel */
  --chip: #ec2f5b; /* The label and progress */
  --ink: #ffffff; /* The song */
  --gold: #ffd21f; /* The artist */
}

[data-spotify="player"] {
  position: relative;
  z-index: 0;
  background: transparent !important;
  padding: 12px 34px 12px 30px;
  font-family: 'Pixelify Sans', monospace;
}

[data-spotify="player"]::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  background: var(--bar);
  clip-path: polygon(18px 0, 100% 0, calc(100% - 18px) 100%, 0 100%);
}

[data-spotify="label"] {
  align-self: flex-start;
  width: fit-content;
  background: var(--chip);
  color: #ffffff;
  padding: 0 .8em;
  clip-path: polygon(.4em 0, 100% 0, calc(100% - .4em) 100%, 0 100%);
  font-weight: 700;
  opacity: 1;
}

[data-spotify="art"] { border-radius: 0; box-shadow: 0 0 0 3px #000, 5px 5px 0 var(--chip); }
[data-spotify="title"] { color: var(--ink); font-weight: 700; }
[data-spotify="artist"] { color: var(--gold); }
[data-spotify="album"] { color: #a0a0a0; }
[data-spotify="progress"] { background: #ffffff26; border-radius: 0; }
[data-spotify="fill"] { background: var(--chip); border-radius: 0; }`,
      },
      {
        id: 'mm-main-menu',
        layerType: 'plan',
        name: 'Main menu',
        hint: 'The plan as the main menu: each step a black bar slanted at both ends, stepping left down the list. What is on now is white with the red strip under it; the rest are grey, and what is done is dimmer still.',
        /*
          Each line is pushed in by how far down the list it is, so the bars
          make the menu's diagonal. Past the ninth line they stop stepping.
        */
        css: `:scope {
  --bar: #000000; /* The bars */
  --ink: #ffffff; /* What is on now */
  --dim: #8c8c8c; /* Still to come */
  --chosen: #ec2f5b; /* The strip under what is on now */
  --gold: #ffd21f; /* The title */
  --step: 3%; /* How far each line steps left | 0-8 */
  --size: 26px; /* Text size | 12-60 */
}

[data-plan="list"] { background: transparent !important; border-radius: 0 !important; gap: .3em !important; font-size: var(--size); font-family: 'Pixelify Sans', monospace; }

/* The title over the first line, where the menu starts. */
[data-plan="title"] {
  margin-left: calc(8 * var(--step));
  color: var(--gold) !important;
  font-size: .8em !important;
  font-weight: 700;
  letter-spacing: .06em !important;
  text-shadow: .08em 0 0 #0b0b2e, -.08em 0 0 #0b0b2e, 0 .08em 0 #0b0b2e, 0 -.08em 0 #0b0b2e, .1em .12em 0 #0b0b2e;
}

[data-plan="item"] {
  --k: 8;
  position: relative;
  z-index: 0;
  margin-left: calc((8 - var(--k)) * var(--step));
  padding: .2em 1em .2em 1.1em;
}
[data-plan="item"]:nth-child(1) { --k: 0; }
[data-plan="item"]:nth-child(2) { --k: 1; }
[data-plan="item"]:nth-child(3) { --k: 2; }
[data-plan="item"]:nth-child(4) { --k: 3; }
[data-plan="item"]:nth-child(5) { --k: 4; }
[data-plan="item"]:nth-child(6) { --k: 5; }
[data-plan="item"]:nth-child(7) { --k: 6; }
[data-plan="item"]:nth-child(8) { --k: 7; }

[data-plan="item"]::before,
[data-plan="item"]::after {
  content: '';
  position: absolute;
  inset: 0;
  clip-path: polygon(.7em 0, 100% 0, calc(100% - .7em) 100%, 0 100%);
}

[data-plan="item"]::before { z-index: -1; background: var(--bar); }
[data-plan="item"]::after { z-index: -2; background: transparent; }
[data-plan-state="now"]::after { inset: .2em -.1em -.2em .3em; background: var(--chosen); }

[data-plan="mark"] { display: none !important; }
[data-plan="text"] { color: var(--dim) !important; text-decoration: none !important; opacity: 1 !important; font-weight: 700 !important; text-transform: uppercase; }
[data-plan-state="now"] [data-plan="text"] { color: var(--ink) !important; }
[data-plan-state="done"] [data-plan="text"] { opacity: .5 !important; }
[data-plan="note"] { color: var(--dim); opacity: .8; }`,
      },
      {
        id: 'mm-question',
        layerType: 'question',
        name: 'Menu question',
        hint: 'A question on a black panel slanted at both ends: the label on a small blue banner in gold, who asked in gold, the question in white pixel letters.',
        css: `:scope {
  --bar: #000000e6; /* The panel */
  --banner: #1430b8; /* The label's banner */
  --gold: #ffd21f; /* Label and asker */
  --ink: #ffffff; /* The question */
}

[data-question="card"] {
  position: relative;
  z-index: 0;
  background: transparent !important;
  border: 0 !important;
  border-radius: 0 !important;
  padding-left: 44px !important;
  padding-right: 44px !important;
  font-family: 'Pixelify Sans', monospace;
}

[data-question="card"]::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  background: var(--bar);
  clip-path: polygon(28px 0, 100% 0, calc(100% - 28px) 100%, 0 100%);
}

[data-question="label"] {
  background: var(--banner);
  color: var(--gold) !important;
  padding: .1em 1em .2em;
  clip-path: polygon(.5em 0, calc(100% - .5em) 0, 100% 50%, calc(100% - .5em) 100%, .5em 100%, 0 50%);
  box-shadow: inset 0 -.2em 0 #e8262a;
  letter-spacing: .06em !important;
}

[data-question="asker"] { color: var(--gold) !important; }
[data-question="text"] { color: var(--ink) !important; font-weight: 700; }`,
      },
      {
        id: 'mm-card-picture',
        layerType: 'images',
        name: 'Player card picture',
        hint: 'Each picture in a player card: the red frame, the coloured corners and the black corner with 1P. The number is a field.',
        css: `:scope {
  --frame: #c71f2d; /* The frame */
  --corner: #e2334d; /* Top corner */
  --low: #4a55d8; /* Bottom corner */
  --player: 1; /* Player number | 1-8 */
  --thick: 4%; /* Frame thickness | 1-12 */
}

[data-images="frame"] {
  counter-reset: mmp var(--player);
  background:
    linear-gradient(135deg, var(--corner) 50%, #0000 50%) left top / 24% 24% no-repeat,
    linear-gradient(-45deg, var(--low) 50%, #0000 50%) right bottom / 30% 30% no-repeat,
    var(--frame);
  box-shadow: 0 0 0 3px #6d0f18, 6px 6px 0 #0000004d;
}

[data-images="picture"] {
  left: var(--thick) !important;
  top: var(--thick) !important;
  width: calc(100% - 2 * var(--thick)) !important;
  height: calc(100% - 2 * var(--thick)) !important;
}

[data-images="frame"]::after {
  content: counter(mmp) 'P';
  position: absolute;
  top: 0;
  right: 0;
  padding: .12em .25em 1.3em 1.8em;
  background: #000000;
  clip-path: polygon(0 0, 100% 0, 100% 100%);
  font: 700 28px/1 'Pixelify Sans', monospace;
  color: #ffffff;
}`,
      },
      {
        id: 'mm-slanted-picture',
        layerType: 'images',
        name: 'Slanted picture',
        hint: 'Each picture cut on the slant at both ends with a thick black edge, the way the menu shows a picture of what you are about to play.',
        css: `:scope {
  --line: #000000; /* The edge */
  --behind: #000000; /* Behind a picture with see-through parts */
  --cut: 18%; /* How far the ends slant | 0-40 */
}

[data-images="frame"] {
  filter: drop-shadow(4px 0 0 var(--line)) drop-shadow(-4px 0 0 var(--line)) drop-shadow(0 4px 0 var(--line)) drop-shadow(0 -4px 0 var(--line));
}

[data-images="picture"] { background: var(--behind); clip-path: polygon(var(--cut) 0, 100% 0, calc(100% - var(--cut)) 100%, 0 100%); }`,
      },
      {
        id: 'mm-poll',
        layerType: 'poll',
        name: 'Menu vote',
        hint: 'The poll as a menu to choose from: the question on the blue banner in gold, each answer a black slanted bar that fills red-pink with votes, its number on a round green button. The winner turns gold when it closes.',
        css: `:scope {
  --banner: #1430b8; /* The question's banner */
  --gold: #ffd21f; /* The question and the winner */
  --bar: #000000; /* The answers */
  --fill: #ec2f5b; /* The votes */
  --button: #2fb34a; /* The numbers */
  --ink: #ffffff; /* The words */
}

[data-poll="card"] {
  background: var(--poll-background, transparent) !important;
  border-radius: 0 !important;
  font-family: 'Pixelify Sans', monospace;
  color: var(--poll-text, var(--ink)) !important;
}

[data-poll="question"] {
  background: var(--banner);
  color: var(--gold);
  text-align: center;
  font-weight: 700;
  padding: .15em 1.2em .3em;
  clip-path: polygon(4% 0, 96% 0, 100% 50%, 96% 100%, 4% 100%, 0 50%);
  box-shadow: inset 0 -.2em 0 #e8262a;
  text-shadow: .08em .08em 0 #0b0b2e;
}

[data-poll="option"] {
  background: var(--bar) !important;
  border-radius: 0 !important;
  /* Slanted by the size of its words, not the poll's height: a tall poll would cut deep into its answers. */
  clip-path: polygon(.8em 0, 100% 0, calc(100% - .8em) 100%, 0 100%);
  padding-left: 1em !important;
  /* Room at the slanted end too, or the percent is cut off by it. */
  padding-right: 1em !important;
}

[data-poll="fill"] { background: var(--poll-bar, var(--fill)) !important; opacity: .85 !important; border-radius: 0 !important; }
[data-poll="label"] { font-weight: 700 !important; }

[data-poll="number"] {
  display: grid;
  place-items: center;
  width: 62cqh;
  height: 62cqh;
  box-sizing: border-box;
  border: 2px solid #000;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #ffffff66 0 18%, #0000 40%), var(--button);
  color: #ffffff;
  font-size: 36cqh !important;
  opacity: 1 !important;
}

[data-poll-winner="true"] [data-poll="label"], [data-poll-winner="true"] [data-poll="percent"] { color: var(--gold); }
[data-poll="footer"] { font-weight: 700; }
[data-poll="timer"] { color: var(--gold); }`,
      },
      {
        id: 'mm-avatar',
        layerType: 'avatar',
        name: 'Avatar player card',
        hint: 'Your avatar standing in a player card: the red frame, the coloured corners, 1P in the black corner and its text on a black name strip. It bobs on the spot while you talk.',
        previewConfig: { label: 'Simon' },
        css: `@keyframes mmBob { to { transform: translateY(-3%); } }

:scope {
  --frame: #c71f2d; /* The frame */
  --card: #a9e6cd; /* Inside the card */
  --corner: #e2334d; /* Top corner */
  --low: #4a55d8; /* Bottom corner */
  --thick: 10px; /* Frame thickness | 2-40 */
  --bar: #000000; /* The name strip */
  --player: 1; /* Player number | 1-8 */
  --avatar-size: min(86cqw, 86cqh);
}

[data-avatar="frame"] {
  counter-reset: mmp var(--player);
  position: relative;
  background:
    linear-gradient(135deg, var(--corner) 50%, #0000 50%) left top / 30% 30% no-repeat,
    linear-gradient(-45deg, var(--low) 50%, #0000 50%) right bottom / 36% 36% no-repeat,
    var(--card);
  border: var(--thick) solid var(--frame);
  box-shadow: 0 0 0 2px #6d0f18;
  justify-content: flex-end !important;
  font-family: 'Pixelify Sans', monospace;
}

[data-avatar="frame"]::after {
  content: counter(mmp) 'P';
  position: absolute;
  top: 0;
  right: 0;
  padding: .1em .2em 1.2em 1.6em;
  background: #000000;
  clip-path: polygon(0 0, 100% 0, 100% 100%);
  font: 700 7cqh/1 'Pixelify Sans', monospace;
  color: #ffffff;
}

[data-avatar-talking="true"] [data-avatar="figure"] { animation: mmBob .3s steps(2) infinite alternate; }

[data-avatar="label"] {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  margin: 0 !important;
  padding: .2em 1em;
  background: var(--bar);
  color: #ffffff !important;
  text-align: center;
  font-weight: 700 !important;
  font-size: min(7cqh, 9cqw) !important;
}`,
      },
      {
        id: 'mm-pngtuber',
        layerType: 'pngtuber',
        name: 'PNGtuber player card',
        hint: 'Your pictures in a player card: the red frame and coloured corners behind them, cut out with a black edge, bobbing on the spot while you talk.',
        css: `@keyframes mmBob { to { transform: translateY(-3%); } }

:scope {
  --frame: #c71f2d; /* The frame */
  --card: #a9e6cd; /* Inside the card */
  --corner: #e2334d; /* Top corner */
  --low: #4a55d8; /* Bottom corner */
  --thick: 10px; /* Frame thickness | 2-40 */
  --edge: #000000; /* The cut-out edge */
}

[data-pngtuber="frame"] {
  background:
    linear-gradient(135deg, var(--corner) 50%, #0000 50%) left top / 30% 30% no-repeat,
    linear-gradient(-45deg, var(--low) 50%, #0000 50%) right bottom / 36% 36% no-repeat,
    var(--card);
  border: var(--thick) solid var(--frame);
  box-shadow: 0 0 0 2px #6d0f18;
}

[data-pngtuber="picture"] {
  filter: drop-shadow(3px 0 0 var(--edge)) drop-shadow(-3px 0 0 var(--edge)) drop-shadow(0 3px 0 var(--edge)) drop-shadow(0 -3px 0 var(--edge));
}

[data-pngtuber-talking="true"] [data-pngtuber="figure"] { animation: mmBob .3s steps(2) infinite alternate; }`,
      },
      {
        id: 'mm-hypetrain',
        layerType: 'hypetrain',
        name: 'Boost meter',
        hint: 'The Hype Train as a meter on a black slanted panel: the title in gold HUD capitals, the level on a red-pink chip and a gold bar filling a black slot. A level up flashes the chip gold; a golden train turns the bar to shine.',
        css: `@keyframes mmLevel { 50% { background: #ffd21f; color: #000; } }
@keyframes mmShine { to { background-position: 200% 0, 0 0; } }

:scope {
  --bar: #000000e6; /* The panel */
  --chip: #ec2f5b; /* The level */
  --gold: #ffd21f; /* Title and bar */
  --ink: #ffffff; /* The rest */
}

[data-hype="frame"] {
  background: var(--bar) !important;
  border-radius: 0 !important;
  clip-path: polygon(6cqh 0, 100% 0, calc(100% - 6cqh) 100%, 0 100%);
  padding-left: 8cqh !important;
  padding-right: 8cqh !important;
  font-family: 'Pixelify Sans', monospace;
  color: var(--ink);
}

[data-hype="title"] { color: var(--gold); font-weight: 700; text-shadow: .08em .08em 0 #0b0b2e; }

[data-hype="level"] {
  background: var(--chip);
  color: #ffffff !important;
  padding: .05em .7em;
  clip-path: polygon(.35em 0, 100% 0, calc(100% - .35em) 100%, 0 100%);
  font-weight: 700;
}

[data-hype="track"] { border-radius: 0 !important; background: #ffffff1f !important; }
[data-hype="fill"] { border-radius: 0 !important; background: linear-gradient(180deg, #fff2a0, var(--gold) 40%, #e09a00) !important; }
[data-hype-golden="true"] [data-hype="fill"] {
  background: linear-gradient(100deg, #0000 30%, #ffffffb3 45%, #0000 60%) 0 0 / 200% 100%, linear-gradient(180deg, #fff2a0, var(--gold) 40%, #e09a00) !important;
  animation: mmShine 2s linear infinite;
}

[data-hype="time"] { opacity: .7 !important; }
[data-hype-levelup="true"] [data-hype="level"] { animation: mmLevel 1s steps(2) 3; }`,
      },
      {
        id: 'mm-shoutout',
        layerType: 'shoutout',
        name: 'Challenger card',
        hint: 'A shoutout as a new player stepping in: their picture in a red player card, their name in white on a black strip, the game in gold and the title on a red-pink chip.',
        css: `:scope {
  --frame: #c71f2d; /* The picture's frame */
  --bar: #000000e6; /* The panel */
  --chip: #ec2f5b; /* The title */
  --gold: #ffd21f; /* The game */
  --ink: #ffffff; /* The name */
}

[data-shoutout="frame"] {
  background: var(--bar) !important;
  border-radius: 0 !important;
  clip-path: polygon(8cqh 0, 100% 0, calc(100% - 8cqh) 100%, 0 100%);
  padding-left: 10cqh !important;
  padding-right: 10cqh !important;
  font-family: 'Pixelify Sans', monospace;
}

[data-shoutout="avatar"] {
  border-radius: 0 !important;
  border: 2.5cqh solid var(--frame);
  box-shadow: 0 0 0 2px #6d0f18;
  background: #a9e6cd;
}

[data-shoutout="title"] {
  align-self: flex-start;
  background: var(--chip);
  color: #ffffff;
  padding: 0 .8em;
  clip-path: polygon(.4em 0, 100% 0, calc(100% - .4em) 100%, 0 100%);
  opacity: 1 !important;
}

[data-shoutout="name"] { color: var(--ink) !important; font-weight: 700 !important; }
[data-shoutout="game"] { color: var(--gold); }
[data-shoutout="viewers"] { color: var(--gold); }`,
      },
      {
        id: 'mm-records',
        layerType: 'leaderboard',
        name: 'Time attack records',
        hint: 'The leaderboard as the time attack records: the title on the blue banner, each person a black slanted bar, the first three places in gold, silver and bronze, and a gold bar for how far they are to the next level.',
        css: `:scope {
  --banner: #1430b8; /* The title's banner */
  --gold: #ffd21f; /* The title and first place */
  --silver: #d4dbe6; /* Second place */
  --bronze: #e08a46; /* Third place */
  --bar: #000000e6; /* The bars */
  --chip: #ec2f5b; /* The level */
}

[data-board="frame"] { background: transparent !important; border-radius: 0 !important; font-family: 'Pixelify Sans', monospace; }

[data-board="title"] {
  align-self: center;
  background: var(--banner);
  color: var(--gold) !important;
  padding: .3em 1.6em .5em;
  clip-path: polygon(6% 0, 94% 0, 100% 50%, 94% 100%, 6% 100%, 0 50%);
  box-shadow: inset 0 -.25em 0 #e8262a;
  font-weight: 700;
  text-shadow: .08em .08em 0 #0b0b2e;
}

[data-board="row"] {
  background: var(--bar);
  clip-path: polygon(3cqh 0, 100% 0, calc(100% - 3cqh) 100%, 0 100%);
  padding: 0 4cqh;
  color: #ffffff;
}

[data-board="place"] { font-weight: 700; opacity: 1 !important; color: #ffffff; }
[data-board="avatar"] { border-radius: 0 !important; box-shadow: 0 0 0 2px #000; }
[data-board="name"] { font-weight: 700; }

[data-board="level"] {
  background: var(--chip);
  color: #ffffff !important;
  padding: .05em .6em;
  clip-path: polygon(.3em 0, 100% 0, calc(100% - .3em) 100%, 0 100%);
}

[data-board="track"] { border-radius: 0 !important; background: #ffffff1f !important; }
[data-board="fill"] { border-radius: 0 !important; background: var(--gold) !important; }

[data-board-podium="first"] [data-board="place"], [data-board-podium="first"] [data-board="name"] { color: var(--gold); }
[data-board-podium="second"] [data-board="place"], [data-board-podium="second"] [data-board="name"] { color: var(--silver); }
[data-board-podium="third"] [data-board="place"], [data-board-podium="third"] [data-board="name"] { color: var(--bronze); }`,
      },
      {
        id: 'mm-bonus',
        layerType: 'giveaway',
        name: 'Bonus stage',
        hint: 'A giveaway as a bonus stage: the title on the blue banner, the prize in white, the names spinning past in a gold-framed slot window, and the winner in gold.',
        css: `@keyframes mmWin { 50% { color: #ffffff; } }

:scope {
  --banner: #1430b8; /* The title's banner */
  --gold: #ffd21f; /* The title, the slot's frame, the winner */
  --bar: #000000e6; /* The panel */
  --ink: #ffffff; /* The prize */
}

[data-giveaway="frame"] {
  background: var(--bar) !important;
  border-radius: 0 !important;
  clip-path: polygon(6cqh 0, 100% 0, calc(100% - 6cqh) 100%, 0 100%);
  font-family: 'Pixelify Sans', monospace;
}

[data-giveaway="title"] {
  background: var(--banner);
  color: var(--gold) !important;
  padding: .2em 1.4em .35em;
  clip-path: polygon(6% 0, 94% 0, 100% 50%, 94% 100%, 6% 100%, 0 50%);
  box-shadow: inset 0 -.22em 0 #e8262a;
  font-weight: 700;
}

[data-giveaway="prize"] { color: var(--ink); font-weight: 700; }

[data-giveaway="reel"] {
  color: var(--gold) !important;
  background: #000000;
  border: 1.2cqh solid var(--gold);
  box-shadow: inset 0 0 0 .6cqh #8a5a00;
  padding: .15em .4em;
  font-weight: 700;
}

[data-giveaway="avatar"] { border-radius: 0 !important; box-shadow: 0 0 0 .8cqh #c71f2d; }
[data-giveaway="name"] { color: var(--gold) !important; font-weight: 700; }
[data-giveaway-state="drawn"] [data-giveaway="name"] { animation: mmWin 1s steps(2) 3; }`,
      },

      /*
        How these arrive: the way the menus move — bars sliding in from the
        side and stopping a touch past their place, the title card's bands
        sweeping across.
      */
      {
        id: 'mm-sweep',
        layerType: 'alert',
        applies: 'alert',
        kind: 'motion',
        previewWith: 'mm-titlecard',
        name: 'Title card sweep',
        hint: 'The bands sweep in from the side, then the message drops in and the name\'s bar slides across under it, the way a zone\'s title card arrives. Leaves the built-in exit alone.',
        /*
          Only the parts move, never the alert itself: its built-in exit is the
          alert's own animation, and taking that over would leave it on screen.
        */
        css: `:scope::before { animation: mmSweep .45s cubic-bezier(.2,.9,.3,1) backwards; }
[data-alert="message"] { animation: mmDrop .4s .25s cubic-bezier(.2,1.4,.4,1) backwards; }
[data-alert="name"] { animation: mmSlide .4s .45s cubic-bezier(.2,1.3,.4,1) backwards; }

@keyframes mmSweep { from { clip-path: polygon(34px 0, 34px 0, 0 100%, 0 100%); } }
@keyframes mmDrop { from { transform: translateY(-120%); opacity: 0; } }
@keyframes mmSlide { from { transform: translateX(-140%); } }`,
      },
      {
        id: 'mm-chat-slide',
        layerType: 'chat',
        applies: 'chat',
        kind: 'motion',
        previewWith: 'mm-chat',
        name: 'Menu slide',
        hint: 'Each new message slides in from the side like a menu option and stops a touch past its place. Applying it turns the chat theme to Custom.',
        css: `[data-chat="row"] { animation: mmRowIn .3s cubic-bezier(.2,1.3,.4,1) backwards; }

@keyframes mmRowIn { from { transform: translateX(110%); } }`,
      },
      {
        id: 'mm-plate-slide',
        layerType: 'nameplate',
        kind: 'motion',
        previewWith: 'mm-nameplate-option',
        name: 'Option slide',
        hint: 'The plate slides in from the side like a menu option being chosen, overshoots a little and settles. Replays when the name changes.',
        css: `[data-nameplate="plate"] { animation: mmPlateIn .4s cubic-bezier(.2,1.3,.4,1) backwards; }

@keyframes mmPlateIn { from { transform: translateX(-110%); } }`,
      },
      {
        id: 'mm-question-drop',
        layerType: 'question',
        kind: 'motion',
        previewWith: 'mm-question',
        name: 'Banner drop',
        hint: 'The label drops in from above and the question slides in under it from the side. Replays for every question.',
        css: `[data-question="label"] { animation: mmLabelIn .35s cubic-bezier(.2,1.4,.4,1) backwards; }
[data-question="card"] { animation: mmCardIn .35s cubic-bezier(.2,1.3,.4,1) backwards; }

@keyframes mmLabelIn { from { transform: translateY(-160%); } }
@keyframes mmCardIn { from { transform: translateX(110%); } }`,
      },
    ],
  };

export default look;
