/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The "Games Done Quick inspired" theme: every look it has, for every kind of layer it dresses.
 * One of the themes in the Library (shared/looks/index.js lists them, in order).
 */

const look =
  {
    id: 'rack',
    // Named for what it is modelled on. The id is still 'rack', which is what
    // every layer and saved copy of it points at, so renaming it moved nothing.
    name: 'Games Done Quick inspired',
    hint: 'Blue-black plates framed by a doubled hairline, in the language of the 2026 summer marathon layout.',
    objects: [
      {
        id: 'rack-omnibar',
        layerType: 'omnibar',
        name: 'Header bar',
        hint: 'A plum bar fading to black, the label as a filled chip and whatever it is announcing centred after it.',
        /*
          The bar is one colour and a fade, which is all the reference's is.
          What makes it read is the chip: a marathon names the thing before
          it says it, and a label that shares the bar's own colour says
          nothing at all.
        */
        css: `[data-omnibar="bar"] {
  --bar: #3a0a23; /* The bar */
  --chip: #5c1038; /* The label behind it */
  --ink: #fff4fe; /* The words */
  background: var(--omnibar-background, linear-gradient(180deg, var(--bar) 0 76%, #0c0309)) !important;
  border-radius: 0 !important;
  padding: 0 !important;
  gap: 0 !important;
}

/* Both stretch, so the label fills the bar however short its text is. */
[data-omnibar="slot"] {
  align-items: stretch !important;
  height: 100%;
  gap: 0 !important;
  flex: 1 1 auto;
}

/* Pinned slots sit beside the rotation, so they take their own width only —
   and get an edge, or a kept cell and the rotation beside it read as one. */
[data-omnibar-state="pinned"] {
  flex: 0 0 auto;
  padding-right: 1.1em;
  box-shadow: inset -2px 0 0 #00000059;
}

[data-omnibar="label"] {
  display: flex;
  align-items: center;
  padding: 0 1.2em;
  background: var(--omnibar-accent, var(--chip));
  color: var(--ink) !important;
  letter-spacing: .2em;
}

/* Centred, the way a marathon centres the thing it is announcing. */
[data-omnibar="value"] {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1 1 auto;
  color: var(--omnibar-text, var(--ink)) !important;
  letter-spacing: .14em;
}`,
      },
      {
        id: 'rack-tallbar',
        layerType: 'omnibar',
        name: 'Donation bar',
        hint: 'For a tall omnibar: a blue-black plate, the label box in milestone magenta, a purple track with what is left riding it in yellow, the leading bid in green and the total in white.',
        previewTall: true,
        previewSize: { width: 1100, height: 110 },
        /*
          The 2026 summer omnibar, which is the tall bar's reason for being:
          one plate the width of the screen, a magenta box saying what kind of
          thing is up, and a card beside it whose second row is a bar.

          The plate is the theme's own — the same blue-black, lit from the top
          left and ruled above and brighter below — so the bar sits in the
          layout as one more plate rather than a strip laid over it.

          The reference colours an incentive's track green and a milestone's
          purple. The bar does not say which it is showing, so this draws the
          milestone, which is the one it shows most; --fill is the one to
          change for an incentive bar of your own.

          The bar paints its colours inline, so the ones replaced here say
          !important. The chips' figures are the bid war: the leader green,
          everybody else cyan.
        */
        css: `:scope {
  --plate: #071a28; /* The plate */
  --rule: #3d5a72; /* The line on top */
  --lit: #5a8fb0; /* The line underneath */
  --ink: #ffffff; /* The words */
  --milestone: #d4136f; /* The label box */
  --track: #150b24; /* The track, still to go */
  --fill: #7b3fd6; /* The track, raised */
  --marker: #fffa02; /* What is left */
  --lead: #2fe07a; /* The leading bid */
  --bid: #03ffe9; /* Every other bid */
  --caption: #d1f2ff; /* Under the total */
}

[data-tallbar="bar"] {
  background: var(--omnibar-background, linear-gradient(160deg, #0a2233, var(--plate))) !important;
  color: var(--omnibar-text, var(--ink)) !important;
  box-shadow: inset 0 1px 0 var(--rule), inset 0 -1px 0 var(--lit);
}

[data-tallbar="logo"], [data-tallbar="pinned"] {
  background: var(--omnibar-background, #04111b);
  box-shadow: inset 0 1px 0 var(--rule), inset 0 -1px 0 var(--lit);
}

[data-tallbar="context"] {
  background: var(--omnibar-accent, linear-gradient(180deg, var(--milestone) 80%, #a50d55)) !important;
  border-right: 0 !important;
  box-shadow: inset 0 1px 0 #ff7ab8;
}
[data-tallbar="label"], [data-tallbar="sub"] { color: var(--ink) !important; }

[data-tallbar="detail"] { color: var(--caption) !important; }

[data-tallbar="goal-track"] {
  background: var(--track) !important;
  border: 0 !important;
  box-shadow: inset 0 0 0 1px #ffffff1f;
}
[data-tallbar="goal-fill"] {
  background: var(--omnibar-accent, linear-gradient(180deg, #a06bf0, var(--fill) 55%, #5a2aa8)) !important;
}
[data-tallbar="goal-marker"] {
  background: var(--marker) !important;
  color: #120a1c !important;
  border: 0 !important;
}

[data-tallbar="chip"] { border-color: var(--rule) !important; border-radius: 0 !important; }
[data-tallbar="chip-value"] { background: var(--omnibar-accent, var(--bid)) !important; color: #04111b !important; }
[data-tallbar="chip"][data-tallbar-first="yes"] [data-tallbar="chip-value"] { background: var(--lead) !important; }

[data-tallbar="pinned"] { border-left: 1px solid var(--rule) !important; }
[data-tallbar="pinned-caption"] { color: var(--caption) !important; }`,
      },
      {
        id: 'rack-runcard',
        layerType: 'runcard',
        name: 'Game card',
        hint: 'Four leaning stripes, a hatched purple band, and the category sunk into a well beneath it.',
        /*
          The stripes are the theme, and they are four colours in a fixed
          order rather than a repeat — cyan, yellow, orange, crimson, leaning
          about fifteen degrees. Widths and lean came off a scan across them.

          The hatch behind is what stops the band reading as a flat purple
          rectangle; it is barely there, four per cent of white, and the band
          looks wrong without it.
        */
        css: `[data-runcard="card"] {
  --band: #2e1a40; /* The band */
  --well: #0d0618; /* The well beneath */
  --cyan: #03ffe9; /* First stripe */
  --yellow: #fffa02; /* Second stripe */
  --orange: #fb9d04; /* Third stripe */
  --crimson: #a90354; /* Fourth stripe */
  --gap: 7px; /* Between stripes */
  --lean: 105deg; /* How far the stripes lean */
  background:
    /* Four bars leaning the way the reference leans them. */
    linear-gradient(var(--lean),
      var(--cyan) 0 26px, #0000 26px calc(26px + var(--gap)),
      var(--yellow) calc(26px + var(--gap)) calc(52px + var(--gap)),
      #0000 calc(52px + var(--gap)) calc(52px + var(--gap) * 2),
      var(--orange) calc(52px + var(--gap) * 2) calc(72px + var(--gap) * 2),
      #0000 calc(72px + var(--gap) * 2) calc(72px + var(--gap) * 3),
      var(--crimson) calc(72px + var(--gap) * 3) calc(94px + var(--gap) * 3),
      #0000 calc(94px + var(--gap) * 3)),
    /* A fine hatch across the band, which is what stops it reading flat. */
    repeating-linear-gradient(135deg, #ffffff0a 0 2px, #0000 2px 7px),
    var(--band) !important;
  border-radius: 0 !important;
  padding: 0.5em 0.9em 0 !important;
  justify-content: flex-start !important;
}

[data-runcard="title"] {
  color: #f5d977 !important;
  text-align: right;
  letter-spacing: -.01em;
}

[data-runcard="machine"] {
  color: #ffffff !important;
  text-align: right;
  letter-spacing: .08em;
}

/*
  The row underneath sits in a well of its own, dark enough to read as sunk
  into the band rather than drawn on it.
*/
[data-runcard="details"] {
  margin: .5em -0.9em 0;
  padding: .45em .9em;
  background: var(--well);
  box-shadow: inset 0 1px 0 #ffffff14;
  justify-content: flex-end !important;
}

[data-runcard="category"] { color: var(--runcard-accent, #d1f2ff) !important; letter-spacing: .1em; }
[data-runcard="estimate"] { color: #d1f2ff !important; opacity: .8 !important; letter-spacing: .1em; }`,
      },
      {
        id: 'rack-timer',
        layerType: 'countdown',
        name: 'Dot matrix',
        hint: 'Cream bulbs on a grid of cells, in a bezel. The glow is what makes them read as lit rather than pale.',
        /*
          A grid of cells rather than a dot texture: two sets of seams laid
          across a lit ground leave the squares, which is what a matrix is.
          Two pixels of cell to one of seam, measured down and across.

          The glow on the digits is the part that matters. Without it the
          numbers are pale letters on a dark panel; with it they are bulbs.
        */
        css: `[data-countdown="clock"] {
  --cell: #1e1e1e; /* The lit cells */
  --seam: #060606; /* Between them */
  --pitch: 3px; /* How big a cell is */
  --frame: #1a141c; /* The bezel */
  --lip: #5c5760; /* Its lip */
  /*
    A grid of cells rather than a texture: two sets of seams crossed over a
    lit ground leaves the squares, which is what a dot matrix is. Measured off
    the reference at two cells of light to one of seam.
  */
  background:
    repeating-linear-gradient(0deg, var(--seam) 0 1px, #0000 1px var(--pitch)),
    repeating-linear-gradient(90deg, var(--seam) 0 1px, #0000 1px var(--pitch)),
    var(--cell) !important;
  border-radius: 0 !important;
  box-shadow:
    inset 0 0 0 1px var(--lip),
    0 0 0 6px var(--frame);
}

/*
  Cream, and lit. The glow is what makes a bulb read as a bulb rather than as
  a pale letter, and it is the one thing a flat colour cannot do here.
*/
[data-countdown="digits"] {
  color: var(--countdown-text, #f8f5dc) !important;
  text-shadow: 0 0 12px #f8f5dc66, 0 0 3px #f8f5dc99;
  letter-spacing: .06em;
}

[data-countdown="label"] {
  color: var(--countdown-label, #8d8877) !important;
  letter-spacing: .3em;
}

/* Paused is the one state worth seeing from across a room. */
[data-countdown="paused"] {
  color: var(--countdown-label, #ff5a7a) !important;
  text-shadow: 0 0 10px #ff5a7a66;
}`,
      },
      {
        id: 'rack-stopwatch',
        layerType: 'stopwatch',
        name: 'Run clock',
        hint: 'The clock beside the run: digital digits lit on a grid of cells in a bezel. Cream while it runs, dimmed and blinking when paused, gold when the run is done.',
        /*
          The countdown's dot matrix, carrying the run timer. The same cells,
          seams and bezel, so a layout holding both reads as one set of
          clocks; the digits are a display face rather than the overlay's own,
          which is what makes it read as a timing clock rather than a number.

          The states are the point of a run clock. Paused has to be seen from
          across the room, so it dims and blinks slowly; finished turns gold
          and glows harder, the moment the whole room is looking at it.
        */
        css: `[data-stopwatch="clock"] {
  --cell: #1e1e1e; /* The lit cells */
  --seam: #060606; /* Between them */
  --pitch: 3px; /* How big a cell is */
  --frame: #1a141c; /* The bezel */
  --lip: #5c5760; /* Its lip */
  --lit: #f8f5dc; /* Running digits */
  --glow: #f8f5dc66; /* Their glow */
  --done: #ffd84a; /* Finished digits */
  --done-glow: #ffd84a8c; /* Its glow */
  background:
    repeating-linear-gradient(0deg, var(--seam) 0 1px, #0000 1px var(--pitch)),
    repeating-linear-gradient(90deg, var(--seam) 0 1px, #0000 1px var(--pitch)),
    var(--cell) !important;
  border-radius: 0 !important;
  box-shadow:
    inset 0 0 0 1px var(--lip),
    0 0 0 6px var(--frame);
}

/*
  A display face, lit. The glow is what makes a digit read as a bulb rather
  than a pale letter; the tracking keeps the colon and the point from
  crowding the numbers either side of them.
*/
[data-stopwatch="digits"] {
  font-family: 'VT323', ui-monospace, monospace !important;
  font-weight: 400 !important;
  color: var(--stopwatch-colour, var(--lit)) !important;
  text-shadow: 0 0 12px var(--glow), 0 0 3px var(--glow);
  letter-spacing: .08em;
}

[data-stopwatch-mode="idle"] [data-stopwatch="digits"] {
  opacity: .55;
}

[data-stopwatch-mode="paused"] [data-stopwatch="digits"] {
  animation: runClockHold 1.6s steps(1, end) infinite;
}

[data-stopwatch-mode="finished"] [data-stopwatch="digits"] {
  color: var(--stopwatch-colour, var(--done)) !important;
  text-shadow: 0 0 18px var(--done-glow), 0 0 4px var(--done);
}

@keyframes runClockHold {
  0% { opacity: 1; }
  50% { opacity: .35; }
}`,
      },
      {
        id: 'rack-nameplate',
        layerType: 'nameplate',
        name: 'Rank plate',
        hint: 'A lit well of cells behind the name, a rank chip at its left, and the pronouns notched into the bottom corner. The cells breathe.',
        previewSize: { width: 520, height: 92 },
        /*
          Measured at native size rather than eyeballed, then drawn beside the
          reference at 4x and corrected five times. The frame is #1a141c, the
          well #1a0008 with soft seams every 28px, the chip #f80047, and the
          well is lipped — maroon along the top, pale rose under the bottom —
          with the cells held three pixels off that lip.

          The cells breathe, and that is a finding rather than a flourish. Two
          captures of the same plate had the cells at red 55 and red 26, and in
          both of them the chip measured 248 and the frame #1a141c, so what
          changed was the bar and not the exposure. Within each capture the
          cells were uniform — six points across the whole width — which rules
          out anything travelling along it: it rises and falls as one. Two
          stills cannot give the period, so 3.2s is a judgement, and the one
          number to change if it reads wrong on air.

          A nameplate has three parts, so the well is two pseudo-elements:
          ::before carries the chip and the lip, ::after the cells, because
          only the cells may take the brightness animation and the chip has to
          hold still. Both sit at z-index -1 inside a stacking context of the
          plate's own, which puts them over its background and under the name.
          The pronouns are lifted out of the flow to the bottom-right corner
          and lipped on two sides, which is how the reference notches them
          into the well rather than sitting them beneath it.

          Two things the reference has that a nameplate cannot: the rank digit
          inside the chip, which would need a fourth part to put a character
          in, and the pixel face its text is set in. The chip is drawn as the
          plain marker it is.
        */
        css: `[data-nameplate="plate"] {
  --frame: #1a141c;
  --rule: #453e45;
  --well: #1a0008;
  --seam: #0d0004;
  --lip: #6d5b65;
  --lip-top: #420c1b;
  --chip: #f80047;
  --cell: 28px;
  --chip-w: 16px;
  --top: 14%;
  --bottom: 17%;
  --side: 14px;
  position: relative !important;
  isolation: isolate;
  container-type: size;
  background: var(--nameplate-background, var(--frame)) !important;
  border: 0 !important;
  border-radius: 0 !important;
  align-items: center !important;
  text-align: center !important;
  padding: 0 !important;
  box-shadow: inset 0 0 0 1px var(--rule);
}

[data-nameplate="plate"]::before {
  content: "";
  position: absolute;
  z-index: -1;
  inset: var(--top) var(--side) var(--bottom) var(--side);
  background: linear-gradient(90deg, var(--chip) 0 var(--chip-w), #0b0003 var(--chip-w));
  box-shadow:
    inset 0 2px 0 var(--lip-top),
    inset 0 -1px 0 var(--lip),
    inset 0 -2px 0 #592939,
    inset 0 0 0 1px var(--lip);
}

/* The cells: held off the lip, and the only part that breathes. */
[data-nameplate="plate"]::after {
  content: "";
  position: absolute;
  z-index: -1;
  inset:
    calc(var(--top) + 3px) calc(var(--side) + 3px)
    calc(var(--bottom) + 3px) calc(var(--side) + var(--chip-w));
  background: repeating-linear-gradient(90deg,
    var(--seam) 0 2px, var(--well) 6px, var(--well) 22px,
    var(--seam) 26px, var(--seam) var(--cell));
  box-shadow: inset 7px 0 7px -6px #f8004766;
  animation: rackBar 3.2s ease-in-out infinite;
}

@keyframes rackBar { 50% { filter: brightness(2.2); } }

[data-nameplate="name"] { color: var(--nameplate-text, #ffffff) !important; letter-spacing: -.01em; }

[data-nameplate="subtitle"] {
  position: absolute;
  right: var(--side);
  bottom: 2px;
  margin: 0 !important;
  padding: 0 .35em;
  font-size: 15cqh !important;
  text-transform: uppercase;
  color: #ffffff !important;
  background: #14090f;
  border-top: 1px solid var(--lip);
  border-left: 1px solid var(--lip);
  letter-spacing: .06em;
}`,
      },
      {
        id: 'rack-viewers',
        layerType: 'viewers',
        name: 'Viewer plate',
        hint: 'A blue-black plate with the mark in a plum chip, the way the header bar names what it is showing.',
        css: `:scope {
  --plate: #071a28; /* The plate */
  --rule: #3d5a72; /* The line on top */
  --lit: #5a8fb0; /* The line underneath */
  --chip: #5c1038; /* Behind the mark */
  --ink: #fff4fe; /* The words */
}

[data-viewers="box"] {
  background: var(--viewers-background, linear-gradient(160deg, #081d2c, var(--plate))) !important;
  border-radius: 0 !important;
  padding: 0 !important;
  gap: 0 !important;
  align-items: stretch !important;
  overflow: hidden;
  box-shadow: inset 0 1px 0 var(--rule), inset 0 -1px 0 var(--lit);
}

[data-viewers="row"] {
  gap: 0 !important;
  align-items: stretch !important;
}

[data-viewers="icon"] {
  display: flex;
  align-items: center;
  padding: 0 .45em;
  background: var(--viewers-accent, var(--chip));
  color: var(--ink) !important;
}

[data-viewers="count"] {
  display: flex;
  align-items: center;
  padding: .25em .6em;
  color: var(--viewers-text, var(--ink)) !important;
  letter-spacing: .06em;
  font-variant-numeric: tabular-nums;
}`,
      },
      {
        id: 'rack-alert',
        layerType: 'alert',
        applies: 'alert',
        name: 'Donation plate',
        hint: 'A plate under a strip of the four stripes, with the name in gold and the message in a plum chip. Built in two pieces so a motion can assemble it.',
        /*
          The run card's four stripes, laid flat along the top as a strip, so
          an alert reads as a piece of the same layout the moment it lands —
          and the plate under it is the theme's plate.

          Two pieces behind the text rather than a border and a background, so
          a motion can build them one at a time, as with every alert look.
        */
        css: `:scope {
  --plate: #071a28; /* The plate */
  --rule: #3d5a72; /* The line on top */
  --lit: #5a8fb0; /* The line underneath */
  --chip: #5c1038; /* Behind the message */
  --name: #f5d977; /* The name */
  --ink: #fff4fe; /* The words */
}

:scope {
  position: relative;
  z-index: 0;
  background: transparent;
  padding: 24px 30px 18px;
}

/* The stripes, cyan to crimson, with the lean the run card gives them. */
:scope::before {
  content: '';
  position: absolute;
  left: 0; right: 0; top: 0;
  height: 6px;
  background: linear-gradient(105deg,
    #03ffe9 0 25%, #0000 25% calc(25% + 6px),
    #fffa02 calc(25% + 6px) 50%, #0000 50% calc(50% + 6px),
    #fb9d04 calc(50% + 6px) 75%, #0000 75% calc(75% + 6px),
    #a90354 calc(75% + 6px));
  transform-origin: left center;
  z-index: -1;
}

/* The plate it hangs from. */
:scope::after {
  content: '';
  position: absolute;
  left: 0; right: 0; top: 8px; bottom: 0;
  background: linear-gradient(160deg, #081d2c, var(--plate));
  box-shadow:
    inset 0 1px 0 var(--rule),
    inset 0 -1px 0 var(--lit),
    0 20px 44px rgba(0,0,0,.6);
  transform-origin: top center;
  z-index: -1;
}

[data-alert="body"] { gap: 16px; }

[data-alert="media"] { border-radius: 0; }

[data-alert="caption"] {
  letter-spacing: .03em;
  text-shadow: none !important;
}

[data-alert="name"] {
  display: inline-block;
  color: var(--alert-name, var(--name)) !important;
}

[data-alert="message"] {
  display: inline-block;
  background: var(--chip);
  color: var(--ink) !important;
  padding: 0 .35em;
  letter-spacing: .12em;
}`,
      },
      {
        id: 'rack-chat',
        layerType: 'chat',
        applies: 'chat',
        name: 'Chat plates',
        hint: 'Every line a thin blue-black plate with a tab down its edge, coloured by rank out of the stripes, and the name in gold. Applying it turns the chat theme to Custom.',
        /*
          The tab down the edge is the one the nameplates carry, and a rank's
          colour is one of the run card's stripes, so a moderator's line reads
          as part of the same layout rather than a colour chosen on its own.
          The broadcaster gets the runner's red.
        */
        css: `:scope {
  --plate: #071a28e6; /* The plate */
  --rule: #3d5a72; /* The line on top */
  --tab: #5c1038; /* The tab, for everyone else */
  --name: #f5d977; /* The name */
  --ink: #fff4fe; /* The words */
  --mod: #03ffe9; /* Moderator */
  --vip: #fb9d04; /* VIP */
  --sub: #fffa02; /* Subscriber */
  --broadcaster: #f80047; /* Broadcaster */
}

[data-chat="row"] {
  background: var(--chat-row-bg, var(--plate)) !important;
  border-radius: var(--chat-row-radius, 0) !important;
  border-left: 4px solid var(--tab) !important;
  box-shadow: inset 0 1px 0 var(--rule);
  padding: var(--chat-row-padding, 7px 12px) !important;
  gap: 8px !important;
}

[data-chat="user"] {
  color: var(--name) !important;
  letter-spacing: .02em !important;
}

[data-chat="text"] { color: var(--chat-text, var(--ink)) !important; }

[data-chat="time"] { color: #d1f2ff59 !important; }

[data-chat="avatar"] { border-radius: 0 !important; }

[data-chat-rank="moderator"] { border-left-color: var(--mod) !important; }
[data-chat-rank="vip"] { border-left-color: var(--vip) !important; }
[data-chat-rank="subscriber"] { border-left-color: var(--sub) !important; }
[data-chat-rank="broadcaster"] { border-left-color: var(--broadcaster) !important; }

/* The tab says the rank; a bubble around the line would say it twice. */
[data-chat="highlight"] {
  border: 0 !important;
  border-radius: 0 !important;
  background: transparent !important;
}`,
      },
      {
        id: 'rack-title',
        layerType: 'text',
        name: 'Event title',
        hint: 'The plum bar the event name sits in across the top of the layout: the colour of the header bar, the words white and centred.',
        css: `:scope {
  --bar: #3a0a23; /* The bar */
  --ink: #fff4fe; /* The words */
}

[data-text="box"] {
  background: linear-gradient(180deg, var(--bar) 0 76%, #0c0309) !important;
  justify-content: center;
}

[data-text="words"] {
  color: var(--ink);
  text-transform: uppercase;
  letter-spacing: .08em !important;
}`,
      },
      {
        id: 'rack-datebox',
        layerType: 'text',
        name: 'Green box',
        hint: 'The words in a green cell with dark ink, the way the reference sets the date and time beside the title. Good for a hashtag too.',
        /* The cell hugs the words, so the alignment controls say where it sits. */
        css: `:scope {
  --cell: #2fe07a; /* The cell */
  --ink: #04111b; /* The words */
}

[data-text="words"] {
  width: auto !important;
  background: linear-gradient(180deg, #5cf29a, var(--cell) 40%, #1fb862);
  color: var(--ink);
  text-transform: uppercase;
  letter-spacing: .06em !important;
  padding: .1em .5em;
}`,
      },
      {
        id: 'rack-goal',
        layerType: 'goal',
        name: 'Milestone bar',
        hint: 'A sunk purple track with the raised part lit from above, the label in milestone magenta and what is left in yellow.',
        css: `:scope {
  --track: #150b24; /* The track, still to go */
  --fill: #7b3fd6; /* The track, raised */
  --label: #d4136f; /* Behind the label */
  --ink: #ffffff; /* The words */
  --percent: #fffa02; /* How far along */
}

/* The track and the fill carry their colours inline, so these take force. */
[data-goal="track"] {
  background: var(--goal-track, var(--track)) !important;
  border-radius: 0 !important;
  box-shadow: inset 0 0 0 1px #ffffff1f;
}

[data-goal="fill"] {
  background: var(--goal-bar, linear-gradient(180deg, #a06bf0, var(--fill) 55%, #5a2aa8)) !important;
  border-radius: 0 !important;
}

[data-goal="label"] {
  background: var(--label);
  color: var(--ink) !important;
  padding: .1em .45em;
  letter-spacing: .08em !important;
}

[data-goal="numbers"] { color: var(--goal-text, var(--ink)) !important; }

[data-goal="target"] { opacity: .5 !important; }

[data-goal="percent"] {
  color: var(--goal-text, var(--percent)) !important;
  opacity: 1 !important;
}`,
      },
      {
        id: 'rack-spotify',
        layerType: 'spotify',
        name: 'Now playing plate',
        hint: 'A blue-black plate with the label in a plum chip, the title in gold and the progress running through the four stripes.',
        css: `:scope {
  --plate: #071a28; /* The plate */
  --rule: #3d5a72; /* The line on top */
  --lit: #5a8fb0; /* The line underneath */
  --chip: #5c1038; /* Behind the label */
  --title: #f5d977; /* The song */
  --ink: #fff4fe; /* The words */
  --well: #04111b; /* The progress, still to go */
}

[data-spotify="player"] {
  background: linear-gradient(160deg, #081d2c, var(--plate));
  box-shadow: inset 0 1px 0 var(--rule), inset 0 -1px 0 var(--lit);
  padding: 12px 14px;
}

[data-spotify="label"] {
  background: var(--chip);
  color: var(--ink);
  padding: 0 .5em;
  justify-self: start;
  opacity: 1;
}

[data-spotify="art"] { border-radius: 0; box-shadow: 0 0 0 1px var(--rule); }

[data-spotify="title"] { color: var(--title); }

[data-spotify="artist"], [data-spotify="album"] { color: var(--ink); }

[data-spotify="progress"] { background: var(--well); border-radius: 0; }

/* Cyan to crimson, clipped to how far through it is. */
[data-spotify="fill"] {
  background: linear-gradient(90deg, #03ffe9, #fffa02 35%, #fb9d04 65%, #a90354);
  border-radius: 0;
}`,
      },
      {
        id: 'rack-plan',
        layerType: 'plan',
        name: 'Schedule',
        hint: 'The heading in a plum chip, the line you are on sunk into a well with a cyan tab, and the ones behind you faded. No ground of its own: lay it on a Plate.',
        /*
          Transparent, like the Marathon plan, because it is meant to sit on
          the theme's Plate — and a second plate on the first is a plate with
          a seam down it.
        */
        css: `:scope {
  --chip: #5c1038; /* Behind the heading */
  --well: #04111b; /* Behind the line you are on */
  --now: #03ffe9; /* The tab on it */
  --ink: #fff4fe; /* The words */
}

[data-plan="list"] {
  background: transparent !important;
  border-radius: 0 !important;
}

[data-plan="title"] {
  background: var(--chip);
  color: var(--ink) !important;
  align-self: flex-start;
  padding: .12em .5em;
  letter-spacing: .14em !important;
  margin-bottom: .3em;
}

[data-plan-state="now"] {
  background: var(--well);
  box-shadow: inset 0 1px 0 #ffffff14;
  margin: 0 -.4em;
  padding: .15em .4em;
}

[data-plan-state="now"] [data-plan="mark"] {
  background: var(--now) !important;
  border-radius: 0 !important;
}

[data-plan-state="now"] [data-plan="text"] {
  color: #f5d977 !important;
  opacity: 1 !important;
}

[data-plan="mark"] { border-radius: 0 !important; }

[data-plan-state="done"] [data-plan="text"] { opacity: .35 !important; }

[data-plan="note"] { color: #d1f2ff; opacity: .7; }`,
      },
      {
        id: 'rack-question',
        layerType: 'question',
        name: 'Question plate',
        hint: 'A plate with a magenta tab down its edge, the label in a plum chip and the question in white. Brings its own ground, since it appears over the game.',
        css: `:scope {
  --plate: #071a28f0; /* The plate */
  --rule: #3d5a72; /* The line on top */
  --lit: #5a8fb0; /* The line underneath */
  --tab: #d4136f; /* The tab down the side */
  --chip: #5c1038; /* Behind the label */
  --asker: #f5d977; /* Who asked */
  --ink: #fff4fe; /* The words */
}

[data-question="card"] {
  background: var(--plate) !important;
  border-radius: 0 !important;
  /* The bar down the side is written inline, so replacing it takes force. */
  border-left: 6px solid var(--tab) !important;
  box-shadow: inset 0 1px 0 var(--rule), inset 0 -1px 0 var(--lit);
}

[data-question="label"] {
  background: var(--chip);
  color: var(--ink) !important;
  padding: .12em .45em;
  letter-spacing: .14em !important;
}

[data-question="asker"] {
  color: var(--asker) !important;
  opacity: 1 !important;
}

[data-question="text"] { color: var(--ink) !important; }`,
      },
      {
        id: 'rack-images',
        layerType: 'images',
        name: 'Sponsor well',
        hint: 'The picture sunk into a dark well inside a plate, the way the reference holds its sponsor and charity marks.',
        /*
          A plate, and inside it a well held a few pixels off the plate's
          edge, which is where the picture sits — so a logo on a transparent
          background lands on the dark the way the rest of the layout does.
        */
        css: `:scope {
  --plate: #071a28; /* The plate */
  --rule: #3d5a72; /* The line on top */
  --lit: #5a8fb0; /* The line underneath */
  --well: #04111b; /* Behind the picture */
  --lip: 5px; /* Plate around the well */
  --inset: 16px; /* Room around the picture */
}

[data-images="frame"] {
  background:
    linear-gradient(var(--well), var(--well)) padding-box,
    linear-gradient(160deg, #081d2c, var(--plate)) border-box;
  border: var(--lip) solid transparent;
  box-shadow:
    inset 0 0 0 1px #ffffff14,
    0 -1px 0 var(--rule),
    0 1px 0 var(--lit);
}

[data-images="picture"] {
  inset: var(--inset) !important;
  width: calc(100% - 2 * var(--inset)) !important;
  height: calc(100% - 2 * var(--inset)) !important;
}`,
      },
      {
        id: 'rack-plate',
        layerType: 'shape',
        name: 'Plate',
        hint: 'The panel the rest of it sits on: lit from the top left, ruled above and brighter below. Opaque, so put it behind a thing rather than over one.',
        /*
          One plate, lit from the top left.

          The note here used to describe two hairlines on every edge, because
          in the first screenshot every panel appeared to have a line, a gap
          and another line. Blown up against a bigger reference, that pair is
          two panels: each rules its own top, and the dark between them is the
          seam the layout leaves. A plate on its own is ruled above and below
          and not at the sides at all.

          Below is the brighter of the two, with two more pixels under it —
          stepped rather than faded, because the reference steps, and a fade
          put ten units of red into a line that has none.

          Both rules are brightest at the left and fall to about two thirds by
          the right, and the fill lightens into the same corner. Read at four
          columns rather than one: at one column the two readings of the lower
          rule disagreed with each other, which is what sent the first version
          looking for a rule that was not there.
        */
        css: `[data-shape="box"] {
  --plate: #071a28; /* The plate */
  --sheen: #081d2c; /* Its lit corner */
  --rule: #3d5a72; /* The line on top */
  --rule-far: #1d3040; /* The line on top, far end */
  --lit: #5a8fb0; /* The line underneath */
  --lit-far: #2d4a5d; /* The line underneath, far end */
  --line: 1px; /* How thick the lines are */
  /* Lit from the top left: see the note above this preset. */
  background:
    linear-gradient(90deg, var(--rule), var(--rule-far)) left top / 100% var(--line) no-repeat,
    linear-gradient(90deg, var(--lit), var(--lit-far)) left bottom / 100% var(--line) no-repeat,
    /* A softer second line under the upper one, which the reference has. */
    linear-gradient(90deg, #0c2437, #0c2130) left 0 top var(--line) / 100% var(--line) no-repeat,
    linear-gradient(90deg, #13486a, #123a52) left 0 bottom var(--line) / 100% var(--line) no-repeat,
    linear-gradient(to top, #0000 0 2px, #002542 2px 3px)
      left bottom / 100% 3px no-repeat,
    linear-gradient(160deg, var(--sheen), var(--plate)) !important;
  border-radius: 0 !important;
  box-shadow: none !important;
}`,
      },
      {
        id: 'rack-nameplate-steady',
        layerType: 'nameplate',
        name: 'Rank plate, steady',
        hint: 'The same plate with its cells simply lit rather than breathing. Made to be paired with the Power on motion.',
        previewSize: { width: 520, height: 92 },
        /*
          The second reading of the same plate, and the right one.

          The first was built from two stills that had the cells at red 55 and
          red 26, uniform across the width in both, and read that as the bar
          breathing. Somebody who has watched the thing run says it does not
          breathe: the lights strike on from the outer ends and reach the
          middle. That explains the same two numbers better than breathing
          does — one capture caught the bar before it struck and the other
          after, which is why both were uniform.

          So the cells sit lit here and the striking is a motion, where an
          arrival belongs. The unlit cells are still drawn, underneath, so
          that the part the motion has not reached yet is a dark row of cells
          rather than an empty well — which is what the unlit capture shows.

          Both rows come from one --cells gradient. A custom property is
          substituted on the element that uses it, and ::before and ::after
          are different elements, so each sets its own --c and gets the same
          cells in its own colour. They are anchored to the same left edge —
          ::before pads its content box by the chip's width and ::after starts
          where the chip ends — so the lit row lands exactly over the unlit
          one instead of half a cell off it.
        */
        css: `[data-nameplate="plate"] {
  --frame: #1a141c;
  --rule: #453e45;
  --lit: #3a0012;
  --dim: #1a0008;
  --seam: #0d0004;
  --lip: #6d5b65;
  --chip: #f80047;
  --cell: 28px;
  --chip-w: 16px;
  --top: 14%;
  --bottom: 17%;
  --side: 14px;
  --cells: repeating-linear-gradient(90deg, var(--seam) 0 2px,
    currentColor 6px, currentColor 22px, var(--seam) 26px, var(--seam) var(--cell));
  position: relative !important;
  isolation: isolate;
  container-type: size;
  background: var(--nameplate-background, var(--frame)) !important;
  border: 0 !important;
  border-radius: 0 !important;
  align-items: center !important;
  text-align: center !important;
  padding: 0 !important;
  box-shadow: inset 0 0 0 1px var(--rule);
}

[data-nameplate="plate"]::before {
  color: var(--dim);
  content: "";
  position: absolute;
  z-index: -1;
  inset: var(--top) var(--side) var(--bottom) var(--side);
  box-sizing: border-box;
  padding: 3px 3px 3px var(--chip-w);
  background:
    linear-gradient(90deg, var(--chip) 0 var(--chip-w), #0000 var(--chip-w)) border-box,
    var(--cells) content-box,
    #0b0003 border-box;
  box-shadow:
    inset 0 2px 0 #420c1b,
    inset 0 -1px 0 var(--lip),
    inset 0 -2px 0 #592939,
    inset 0 0 0 1px var(--lip);
}

[data-nameplate="plate"]::after {
  color: var(--lit);
  content: "";
  position: absolute;
  z-index: -1;
  inset:
    calc(var(--top) + 3px) calc(var(--side) + 3px)
    calc(var(--bottom) + 3px) calc(var(--side) + var(--chip-w));
  background: var(--cells);
  box-shadow: inset 7px 0 7px -6px #f8004766;
}

[data-nameplate="name"] { color: var(--nameplate-text, #ffffff) !important; letter-spacing: -.01em; }

[data-nameplate="subtitle"] {
  position: absolute;
  right: var(--side);
  bottom: 2px;
  margin: 0 !important;
  padding: 0 .35em;
  font-size: 15cqh !important;
  text-transform: uppercase;
  color: #ffffff !important;
  background: #14090f;
  border-top: 1px solid var(--lip);
  border-left: 1px solid var(--lip);
  letter-spacing: .06em;
}`,
      },
      {
        id: 'motion-rack-shutter',
        layerType: 'omnibar',
        kind: 'motion',
        name: 'Shutter',
        hint: 'The chip and the message open against each other, shut the same way, and a slow sheen crosses the bar between them.',
        /*
          Written after the bar learned to let a slot leave, which is what
          makes a shutter possible at all: a wipe that only ever opens is half
          an idea, and until now the closing half had nothing to run on.

          The sheen is the part that does not depend on anything happening. A
          bar between rotations is a still photograph otherwise, and a
          marathon's furniture is never quite still.
        */
        css: `/* The built-in entrance moves the whole slot; this moves its two halves. */
[data-omnibar="slot"] { animation: none !important; }

/*
  A shutter, not a slide: the chip is uncovered downwards and the message
  upwards, so the two halves open against each other and meet. Nothing
  crosses its neighbour on the way in, which is what a slide always looks
  like it is doing on panels with edges this hard.
*/
[data-omnibar="label"] { animation: rackOpenDown .32s cubic-bezier(.2,.75,.2,1) both; }
[data-omnibar="value"] { animation: rackOpenUp .32s cubic-bezier(.2,.75,.2,1) .07s both; }

/* Both ends spelled out: none does not interpolate with a shape. */
@keyframes rackOpenDown {
  from { clip-path: inset(0 0 100% 0) } to { clip-path: inset(0 0 0 0) }
}

@keyframes rackOpenUp {
  from { clip-path: inset(100% 0 0 0) } to { clip-path: inset(0 0 0 0) }
}

/* And shut the way they opened, carrying on rather than reversing. */
[data-omnibar-state="leaving"] [data-omnibar="label"] {
  animation: rackShut .24s cubic-bezier(.5,0,.85,.35) both;
}

[data-omnibar-state="leaving"] [data-omnibar="value"] {
  animation: rackShutUp .24s cubic-bezier(.5,0,.85,.35) both;
}

@keyframes rackShut {
  from { clip-path: inset(0 0 0 0) } to { clip-path: inset(100% 0 0 0) }
}

@keyframes rackShutUp {
  from { clip-path: inset(0 0 0 0) } to { clip-path: inset(0 0 100% 0) }
}

/* Light on a surface, not a thing moving. This furniture is never still. */
[data-omnibar="bar"] { position: relative; }

[data-omnibar="bar"]::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(105deg, #0000 42%, #ffffff12 50%, #0000 58%);
  background-size: 300% 100%;
  animation: rackSheen 9s linear infinite;
}

@keyframes rackSheen {
  from { background-position: 130% 0 } to { background-position: -70% 0 }
}`,
      },
      {
        id: 'rack-couch',
        layerType: 'roster',
        name: 'Couch',
        hint: 'Every seat in the same language as the plates: a role tab, cells behind the name, pronouns notched into the corner. Free seats keep their box with the light off.',
        previewSize: { width: 620, height: 150 },
        /*
          One rule per part, not one per role. The seat sets a colour from its
          own data-roster-role and everything on it reads that with
          currentColor, so the host's tab, outline and pronoun chip all turn
          amber together — and a free seat turns the whole thing down by
          setting one colour rather than by dimming the box, which would take
          the name and the tab down unevenly with it.

          The free seat keeps its outline on purpose. The layer exists because
          a nameplate hides itself when nobody is in it, which is right for a
          lower third and wrong for a couch: the gap is what reads as broken.
        */
        css: `[data-roster="grid"] {
  gap: 10px !important;
}

/*
  The seat's colour is its role's, held in --tab so everything on it can read
  the same one. Not currentColor: the pronoun chip sets its own text colour,
  and currentColor there would have resolved to that rather than to the seat
  — which it did, and painted the chip black on black.
*/
[data-roster="seat"] {
  --tab: var(--overlay-accent, #2ec4b6);
  color: var(--tab);
  background: #0a100f !important;
  border-radius: 0 !important;
  opacity: 1 !important;
  box-shadow: inset 0 0 0 1px var(--tab);
}

[data-roster="seat"][data-roster-role="host"] { --tab: #e0a63a; }

/* Drawn as free rather than drawn as broken: the same box, the light off. */
[data-roster="seat"][data-roster-empty="yes"] { --tab: #2c3a37; }
[data-roster="seat"][data-roster-empty="yes"] [data-roster="tab"] { display: none; }
[data-roster="seat"][data-roster-empty="yes"] [data-roster="name"] {
  color: var(--tab) !important;
}

[data-roster="tab"] {
  width: 1.5em !important;
  background: var(--tab) !important;
}

[data-roster="role"] { color: #07100f !important; }

/* The cells behind the name, held off the seat's edge the way a well is. */
[data-roster="body"] {
  margin: 3px 3px 3px 0;
  background: repeating-linear-gradient(90deg,
    #060d0c 0 2px, #0d1917 6px, #0d1917 20px, #060d0c 24px);
  box-shadow: inset 0 0 0 1px #16211f;
}

[data-roster="name"] { letter-spacing: -.01em; }

[data-roster="pronouns"] {
  margin-top: 3px !important;
  padding: 0 .45em !important;
  background: var(--tab) !important;
  color: #07100f !important;
  letter-spacing: .08em;
}`,
      },
      {
        id: 'rack-power-on',
        layerType: 'nameplate',
        kind: 'motion',
        /* It has nothing to animate without the row of cells this one draws. */
        previewWith: 'rack-nameplate-steady',
        name: 'Power on',
        hint: 'Whole lights strike on from both ends and reach the middle, catching and dropping back on the way, over and over. Goes with Rank plate, steady.',
        previewSize: { width: 520, height: 92 },
        /*
          Whole lights, not a sliding edge, and the rule kept by construction.

          A light may only be on if every light outside it is on. That is not
          something the keyframes have to be careful about: the animation steps
          an integer and the mask is that many cells wide from each end, so the
          lit run is always a block reaching the edge. Measured over the
          strike, at 26 frozen points: no frame with a light on beyond a dark
          one, and no frame with the two sides more than one cell apart.

          Masks rather than a growing background, because a background anchored
          to the right would lay its cells out from the right edge and land
          half a cell off the row underneath; a mask moves nothing.

          The stutter looks random and is not — CSS has no randomness. What it
          has is two counts on periods that do not divide into each other:
          --step walks out and back, --catch adds a light or two on its own
          clock, and the mask is their sum. The pair comes round again in
          minutes rather than in seconds, which is enough that the eye reads it
          as irregular. Both are registered with @property, because an integer
          has to be a real integer for the calc to step in whole cells.

          The walk spends its time between one and ten lights, which is the
          range a plate actually has: a 391-wide plate holds twelve cells, so
          six a side is already full. On a wider plate more of the walk shows,
          which is right — more lights take longer to fill.

          Durations are custom properties. --strike is the whole cycle, of
          which roughly the first third is the struggle, then it holds lit,
          then it drops out and goes again.
        */
        css: `/*
  Whole lights, not a sliding edge. The animation steps a count and the mask
  is that many cells wide from each end, so the lit run is always the outer n
  on both sides — which is the rule, kept by construction rather than by the
  keyframes being careful.

  Two counts, added: --step is the strike, --catch a small jitter on its own
  period. Their durations do not divide into each other, so the combination
  takes minutes to come round again and the stutter does not read as a loop.
*/
@property --step { syntax: "<integer>"; inherits: false; initial-value: 0; }
@property --catch { syntax: "<integer>"; inherits: false; initial-value: 0; }

[data-nameplate="plate"]::after {
  --lights: calc(var(--cell) * (var(--step) + var(--catch)));
  -webkit-mask-image: linear-gradient(#fff, #fff), linear-gradient(#fff, #fff);
  -webkit-mask-repeat: no-repeat;
  -webkit-mask-position: left, right;
  -webkit-mask-size: var(--lights) 100%, var(--lights) 100%;
  animation:
    rackStrike var(--strike, 7s) steps(1, end) infinite,
    rackCatch var(--jitter, 1.7s) steps(1, end) infinite;
}

/* Out from both ends, catching and dropping back, then lit, then out. */
@keyframes rackStrike {
  0% { --step: 0; }
  2% { --step: 1; }
  4% { --step: 0; }
  6% { --step: 1; }
  8% { --step: 2; }
  10% { --step: 1; }
  12% { --step: 3; }
  14% { --step: 2; }
  16% { --step: 3; }
  18% { --step: 5; }
  20% { --step: 3; }
  22% { --step: 4; }
  24% { --step: 6; }
  26% { --step: 4; }
  28% { --step: 7; }
  30% { --step: 5; }
  32% { --step: 8; }
  34% { --step: 6; }
  36% { --step: 10; }
  38% { --step: 7; }
  40% { --step: 40; }
  93% { --step: 0; }
}

@keyframes rackCatch {
  0% { --catch: 0; }
  14% { --catch: 1; }
  20% { --catch: 0; }
  47% { --catch: 2; }
  52% { --catch: 0; }
  71% { --catch: 1; }
  76% { --catch: 0; }
}`,
      },
      {
        id: 'rack-players',
        layerType: 'players',
        name: 'Player plates',
        hint: 'A blue-black plate, ruled above and lit below, the title in a plum chip and each player in a dark well with a square of their colour. Anyone out goes dim, the reason in magenta.',
        css: `:scope {
  --plate: #071a28; /* The plate */
  --rule: #3d5a72; /* The line on top */
  --lit: #5a8fb0; /* The line underneath */
  --well: #0a100f; /* Each player's well */
  --chip: #5c1038; /* Behind the title */
  --tab: #d4136f; /* Somebody out */
  --ink: #fff4fe; /* The words */
}

[data-players="list"] {
  background: var(--players-background, linear-gradient(160deg, #081d2c, var(--plate))) !important;
  border-radius: 0 !important;
  box-shadow: inset 0 1px 0 var(--rule), inset 0 -1px 0 var(--lit);
  color: var(--players-text, var(--ink)) !important;
}

[data-players="title"] { align-self: flex-start; background: var(--chip); padding: .1em .5em; letter-spacing: .12em !important; }
[data-players="row"] { background: var(--well) !important; border-radius: 0 !important; box-shadow: inset 0 0 0 1px #16211f; }
[data-players="dot"] { border-radius: 0 !important; }
[data-players-state="out"], [data-players-state="ejected"], [data-players-state="dead"] { opacity: .55 !important; }
[data-players="state"] { background: var(--tab); color: var(--ink); padding: 0 .4em; }`,
      },
      {
        id: 'rack-poll',
        layerType: 'poll',
        name: 'Poll plate',
        hint: 'A plate with a magenta tab down its edge, each answer in a sunk purple track that rises as it is voted for, the numbers in plum chips and the winner in yellow.',
        css: `:scope {
  --plate: #071a28f0; /* The plate */
  --rule: #3d5a72; /* The line on top */
  --lit: #5a8fb0; /* The line underneath */
  --tab: #d4136f; /* The tab down the side */
  --track: #150b24; /* An answer, still to vote for */
  --fill: #7b3fd6; /* The votes */
  --chip: #5c1038; /* The numbers */
  --win: #fffa02; /* The winner */
  --ink: #fff4fe; /* The words */
}

[data-poll="card"] {
  background: var(--poll-background, var(--plate)) !important;
  border-radius: 0 !important;
  border-left: 6px solid var(--tab);
  box-shadow: inset 0 1px 0 var(--rule), inset 0 -1px 0 var(--lit);
  color: var(--poll-text, var(--ink)) !important;
}

[data-poll="option"] { background: var(--track) !important; border-radius: 0 !important; box-shadow: inset 0 0 0 1px #ffffff1f; }
[data-poll="fill"] { background: var(--poll-bar, linear-gradient(180deg, #a06bf0, var(--fill) 55%, #5a2aa8)) !important; opacity: .85 !important; }
[data-poll="number"] { display: grid; place-items: center; min-width: 1.3em; background: var(--chip); opacity: 1 !important; }
[data-poll-winner="true"] [data-poll="label"], [data-poll-winner="true"] [data-poll="percent"] { color: var(--win); }
[data-poll="timer"] { color: var(--win); }`,
      },
      {
        id: 'rack-voice',
        layerType: 'voice',
        name: 'Call plates',
        hint: 'The Discord call as square pictures set in plates, the one talking edged in magenta, each name in a plum chip under its picture.',
        css: `:scope {
  --rule: #3d5a72; /* The plate's edge */
  --tab: #d4136f; /* Talking */
  --chip: #5c1038; /* The names */
  --ink: #fff4fe; /* The words */
}

[data-voice="avatar"], [data-voice="picture"] { border-radius: 0 !important; }
[data-voice="avatar"] { box-shadow: 0 0 0 2px var(--rule) !important; }
[data-voice-speaking="true"] [data-voice="avatar"] { box-shadow: 0 0 0 max(2px, 4cqw) var(--voice-glow, var(--tab)) !important; }
[data-voice="name"] { background: var(--chip); color: var(--ink) !important; padding: .1em .45em !important; letter-spacing: .06em; }
[data-voice="status"] { border-radius: 0 !important; background: #071a28 !important; color: var(--tab) !important; }`,
      },
      {
        id: 'rack-avatar',
        layerType: 'avatar',
        name: 'Avatar plate',
        hint: 'The avatar on a blue-black plate, ruled above and lit below, its text in a plum chip. A magenta tab down the edge lights while you talk.',
        previewConfig: { label: 'Back soon' },
        css: `:scope {
  --plate: #071a28; /* The plate */
  --rule: #3d5a72; /* The line on top */
  --lit: #5a8fb0; /* The line underneath */
  --tab: #d4136f; /* The tab while talking */
  --chip: #5c1038; /* Behind the text */
  --avatar-size: min(92cqw, 92cqh);
}

[data-avatar="frame"] {
  position: relative;
  background: linear-gradient(160deg, #081d2c, var(--plate));
  box-shadow: inset 0 1px 0 var(--rule), inset 0 -1px 0 var(--lit), inset 6px 0 0 #1d3040;
  justify-content: flex-end !important;
}
[data-avatar-talking="true"] { box-shadow: inset 0 1px 0 var(--rule), inset 0 -1px 0 var(--lit), inset 6px 0 0 var(--tab); }

[data-avatar="label"] {
  position: absolute;
  left: 16px;
  top: 12px;
  margin: 0 !important;
  background: var(--chip);
  color: #fff4fe !important;
  padding: .1em .5em;
  letter-spacing: .1em !important;
  font-size: min(5.5cqh, 8cqw) !important;
}`,
      },
      {
        id: 'rack-pngtuber',
        layerType: 'pngtuber',
        name: 'PNGtuber plate',
        hint: 'Your pictures standing in a blue-black plate, a magenta tab down its edge that lights while you talk.',
        css: `:scope {
  --plate: #071a28; /* The plate */
  --rule: #3d5a72; /* The line on top */
  --lit: #5a8fb0; /* The line underneath */
  --tab: #d4136f; /* The tab while talking */
}

[data-pngtuber="frame"] {
  background: linear-gradient(160deg, #081d2c, var(--plate));
  box-shadow: inset 0 1px 0 var(--rule), inset 0 -1px 0 var(--lit), inset 6px 0 0 #1d3040;
}
[data-pngtuber-talking="true"][data-pngtuber="frame"] {
  box-shadow: inset 0 1px 0 var(--rule), inset 0 -1px 0 var(--lit), inset 6px 0 0 var(--tab);
}`,
      },
      {
        id: 'rack-hypetrain',
        layerType: 'hypetrain',
        name: 'Hype plate',
        hint: 'The Hype Train on a plate: the level in a plum chip, the bar a sunk purple track rising as it fills, the time left in yellow.',
        css: `:scope {
  --plate: #071a28; /* The plate */
  --rule: #3d5a72; /* The line on top */
  --lit: #5a8fb0; /* The line underneath */
  --track: #150b24; /* The track, still to go */
  --fill: #7b3fd6; /* The track, raised */
  --chip: #5c1038; /* The level */
  --time: #fffa02; /* Time left */
}

[data-hype="frame"] {
  background: linear-gradient(160deg, #081d2c, var(--plate)) !important;
  border-radius: 0 !important;
  box-shadow: inset 0 1px 0 var(--rule), inset 0 -1px 0 var(--lit);
}
[data-hype="title"] { color: #fff4fe; letter-spacing: .1em; }
[data-hype="level"] { background: var(--chip); color: #fff4fe !important; padding: .05em .45em; }
[data-hype="track"] { border-radius: 0 !important; background: var(--track) !important; box-shadow: inset 0 0 0 1px #ffffff1f; }
[data-hype="fill"] { border-radius: 0 !important; background: linear-gradient(180deg, #a06bf0, var(--fill) 55%, #5a2aa8) !important; }
[data-hype="time"] { color: var(--time); opacity: 1 !important; }`,
      },
      {
        id: 'rack-shoutout',
        layerType: 'shoutout',
        name: 'Guest plate',
        hint: 'A plate with a magenta tab down its edge, the picture square in a ruled frame, the title in a plum chip, the name in white and the game in yellow.',
        css: `:scope {
  --plate: #071a28f0; /* The plate */
  --rule: #3d5a72; /* The line on top */
  --lit: #5a8fb0; /* The line underneath */
  --tab: #d4136f; /* The tab down the side */
  --chip: #5c1038; /* Behind the title */
  --game: #f5d977; /* The game */
}

[data-shoutout="frame"] {
  background: var(--plate) !important;
  border-radius: 0 !important;
  border-left: 6px solid var(--tab);
  box-shadow: inset 0 1px 0 var(--rule), inset 0 -1px 0 var(--lit);
}
[data-shoutout="avatar"] { border-radius: 0 !important; box-shadow: 0 0 0 2px var(--rule); }
[data-shoutout="title"] { align-self: flex-start; background: var(--chip); color: #fff4fe; padding: 0 .45em; opacity: 1 !important; }
[data-shoutout="name"] { color: #fff4fe !important; }
[data-shoutout="game"] { color: var(--game); }`,
      },
      {
        id: 'rack-leaderboard',
        layerType: 'leaderboard',
        name: 'Standings plate',
        hint: 'A plate of standings: every person in a dark well, the level in a plum chip, a purple track for the way to the next level, first place in yellow.',
        css: `:scope {
  --plate: #071a28; /* The plate */
  --rule: #3d5a72; /* The line on top */
  --lit: #5a8fb0; /* The line underneath */
  --well: #0a100f; /* Each person's well */
  --chip: #5c1038; /* The level */
  --first: #fffa02; /* First place */
}

[data-board="frame"] {
  background: linear-gradient(160deg, #081d2c, var(--plate)) !important;
  border-radius: 0 !important;
  box-shadow: inset 0 1px 0 var(--rule), inset 0 -1px 0 var(--lit);
}
[data-board="title"] { color: #fff4fe !important; letter-spacing: .1em; }
[data-board="row"] { background: var(--well); box-shadow: inset 0 0 0 1px #16211f; padding-right: .5em; }
[data-board="avatar"] { border-radius: 0 !important; }
[data-board="level"] { background: var(--chip); color: #fff4fe !important; padding: .05em .45em; }
[data-board="track"] { border-radius: 0 !important; background: #150b24 !important; }
[data-board="fill"] { border-radius: 0 !important; background: #7b3fd6 !important; }
[data-board-podium="first"] [data-board="place"], [data-board-podium="first"] [data-board="name"] { color: var(--first); opacity: 1 !important; }`,
      },
      {
        id: 'rack-giveaway',
        layerType: 'giveaway',
        name: 'Prize plate',
        hint: 'A plate for the prize: the title in a magenta chip, the names running past in a dark lit well in yellow, and the winner in yellow.',
        css: `:scope {
  --plate: #071a28f0; /* The plate */
  --rule: #3d5a72; /* The line on top */
  --lit: #5a8fb0; /* The line underneath */
  --tab: #d4136f; /* The title */
  --well: #1a0008; /* The well the names run in */
  --win: #fffa02; /* The names and the winner */
}

[data-giveaway="frame"] {
  background: var(--plate) !important;
  border-radius: 0 !important;
  box-shadow: inset 0 1px 0 var(--rule), inset 0 -1px 0 var(--lit);
}
[data-giveaway="title"] { background: var(--tab); color: #fff4fe !important; padding: .1em .5em; letter-spacing: .1em; }
[data-giveaway="prize"] { color: #fff4fe; }
[data-giveaway="reel"] { background: var(--well); color: var(--win) !important; padding: .15em .4em; box-shadow: inset 0 0 0 1px #6d5b65; }
[data-giveaway="avatar"] { border-radius: 0 !important; }
[data-giveaway="name"] { color: var(--win) !important; }`,
      },
    ],
  };

export default look;
