/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The "Marathon" theme: every look it has, for every kind of layer it dresses.
 * One of the themes in the Library (shared/looks/index.js lists them, in order).
 */

import { SPECTRUM, SPECTRUM_DOWN, A } from './common.js';

const look =
  {
    id: 'marathon',
    name: 'Marathon',
    hint: 'Flat black, a spectrum edge, and the accent as a filled chip. Every piece matches the others.',
    objects: [
      {
        id: 'marathon-omnibar',
        layerType: 'omnibar',
        name: 'Ticker',
        hint: 'The label becomes its own cell at the left.',
        css: `:scope {
  --ground: #09090b; /* The black it sits on */
  --on-accent: #09090b; /* Text on the accent */
  --cell: #131318; /* The raised cell */
  --edge: 4px; /* Spectrum edge */
}

[data-omnibar="bar"] {
  background: var(--omnibar-background, var(--ground)) !important;
  border-top: var(--edge) solid;
  border-image: ${SPECTRUM} 1;
  gap: 0 !important;
  padding: 0 !important;
}

/* Both grow, so the cell fills the bar however short the text is. */
[data-omnibar="slot"] {
  align-items: stretch !important;
  height: 100%;
  gap: 0 !important;
  flex: 1 1 auto;
}

/* Pinned slots sit beside the rotation, so they take their own width only. */
[data-omnibar-state="pinned"] { flex: 0 0 auto; }

[data-omnibar="label"] {
  display: flex;
  align-items: center;
  padding: 0 20px;
  background: var(--omnibar-accent, ${A});
  color: var(--on-accent) !important;
  letter-spacing: .24em;
}

[data-omnibar="value"] {
  display: flex;
  align-items: center;
  padding: 0 24px;
  background: var(--cell);
  border-right: 1px solid rgba(255,255,255,.12);
  letter-spacing: .1em;
  flex: 1 1 auto;
}`,
      },
      {
        id: 'marathon-tallbar',
        layerType: 'omnibar',
        name: 'Tall bar',
        hint: 'For a tall omnibar: the label box filled with the accent, the card a raised cell, chips and goal bars in the accent, the total on black.',
        previewTall: true,
        previewSize: { width: 1100, height: 110 },
        /*
          The Ticker, for the tall bar. The tall bar names its parts
          data-tallbar rather than data-omnibar, so the Ticker never reaches
          it and this never reaches a classic bar — each look lands only on
          the bar it was drawn for, whichever one a layer shows.

          The bar paints its colours inline, so the ones replaced here say
          !important, the same bargain the other layers make.
        */
        css: `:scope {
  --ground: #09090b; /* The black it sits on */
  --on-accent: #09090b; /* Text on the accent */
  --cell: #131318; /* The raised cell */
  --edge: 4px; /* Spectrum edge */
}

[data-tallbar="bar"] {
  background: var(--omnibar-background, var(--ground)) !important;
  border-top: var(--edge) solid;
  border-image: ${SPECTRUM} 1;
}

/* The box saying what kind of thing is up, filled like the Ticker's label. */
[data-tallbar="context"] {
  background: var(--omnibar-accent, ${A});
  border-right: 0 !important;
}
[data-tallbar="label"] { color: var(--on-accent) !important; letter-spacing: .2em; }
[data-tallbar="sub"] { color: var(--on-accent) !important; opacity: .75; letter-spacing: .18em; }

[data-tallbar="card"] {
  background: var(--cell);
  border-right: 1px solid rgba(255,255,255,.12);
}
[data-tallbar="title"] { letter-spacing: .08em; }
[data-tallbar="figure"] { letter-spacing: .04em; }

/* Chips as the run card's category: the figure in a filled cell. */
[data-tallbar="chip"] { border-color: rgba(255,255,255,.18) !important; border-radius: 0 !important; }
[data-tallbar="chip-value"] { color: var(--on-accent) !important; }

/* A goal: a dark track, the accent filling it, the marker as a chip. */
[data-tallbar="goal-track"] {
  background: var(--ground) !important;
  border-color: rgba(255,255,255,.14) !important;
}
[data-tallbar="goal-marker"] {
  background: var(--omnibar-accent, ${A}) !important;
  color: var(--on-accent) !important;
  border: 0 !important;
}

/* The total held at the end, on black with its caption in the accent. */
[data-tallbar="pinned"] {
  background: var(--omnibar-background, var(--ground));
  border-left: 1px solid rgba(255,255,255,.12) !important;
}
[data-tallbar="pinned-caption"] { letter-spacing: .2em; }`,
      },
      {
        id: 'marathon-runcard',
        layerType: 'runcard',
        name: 'Run card',
        hint: 'Spectrum edges top and bottom; the category as a chip.',
        css: `:scope {
  --ground: #09090b; /* The black it sits on */
  --on-accent: #09090b; /* Text on the accent */
}

[data-runcard="card"] {
  background: var(--ground) !important;
  border-top: 4px solid !important;
  border-bottom: 4px solid !important;
  border-image: ${SPECTRUM} 1;
  border-radius: 0 !important;
}

[data-runcard="title"] { letter-spacing: .06em; }

[data-runcard="machine"] { opacity: .55 !important; letter-spacing: .18em; }

[data-runcard="details"] { margin-top: 6px !important; gap: 0 !important; }

[data-runcard="category"] {
  background: var(--runcard-accent, ${A});
  color: var(--on-accent) !important;
  padding: 2px 12px;
  letter-spacing: .2em;
}

[data-runcard="estimate"] {
  padding: 2px 12px;
  border: 1px solid rgba(255,255,255,.18);
  border-left: 0;
  letter-spacing: .14em;
}`,
      },
      {
        id: 'marathon-nameplate',
        layerType: 'nameplate',
        name: 'Nameplate',
        hint: 'The second line becomes a chip, like the category on the card.',
        css: `:scope {
  --ground: #09090b; /* The black it sits on */
  --on-accent: #09090b; /* Text on the accent */
}

[data-nameplate="plate"] {
  background: var(--nameplate-background, var(--ground)) !important;
  border-radius: 0 !important;
  border-left: 0 !important;
  border-top: 4px solid !important;
  border-image: ${SPECTRUM} 1;
}

[data-nameplate="name"] { letter-spacing: .1em !important; }

[data-nameplate="subtitle"] {
  background: var(--nameplate-accent, ${A});
  color: var(--on-accent) !important;
  padding: 2px 10px;
  letter-spacing: .18em;
  align-self: flex-start;
}`,
      },
      {
        id: 'marathon-roster',
        layerType: 'roster',
        name: 'Commentators',
        hint: 'Each seat a black plate with a spectrum edge, the role as an accent tab and the pronouns as a chip. The host takes the spectrum’s yellow; a free seat keeps its plate with the light off.',
        previewSize: { width: 620, height: 150 },
        /*
          The nameplate, once per seat. One colour per seat in --tab, read by
          its tab and its chip alike, so the host turns yellow all at once and a
          free seat dims the whole plate by setting one colour.
        */
        css: `:scope {
  --ground: #09090b; /* The black it sits on */
  --on-accent: #09090b; /* Text on the accent */
  --host: #ffe600; /* The host's tab */
  --free: #26262c; /* A free seat */
}

[data-roster="seat"] {
  --tab: ${A};
  background: var(--ground) !important;
  border-radius: 0 !important;
  border-top: 3px solid;
  border-image: ${SPECTRUM} 1;
  opacity: 1 !important;
}
[data-roster="seat"][data-roster-role="host"] { --tab: var(--host); }

[data-roster="tab"] { background: var(--tab) !important; }
[data-roster="role"] { color: var(--on-accent) !important; }

[data-roster="name"] { letter-spacing: .08em; }
[data-roster="pronouns"] {
  background: var(--tab) !important;
  color: var(--on-accent) !important;
  letter-spacing: .16em;
  padding: 1px 8px !important;
}

/* Free: the plate stays, the light goes out. */
[data-roster="seat"][data-roster-empty="yes"] { --tab: var(--free); border-image: none; border-top-color: var(--free); }
[data-roster="seat"][data-roster-empty="yes"] [data-roster="tab"] { display: none; }
[data-roster="seat"][data-roster-empty="yes"] [data-roster="name"] { color: #52525b !important; }`,
      },
      {
        id: 'marathon-viewers',
        layerType: 'viewers',
        name: 'Viewers',
        hint: 'The mark becomes an accent cell, like the label on the ticker.',
        css: `:scope {
  --ground: #09090b; /* The black it sits on */
  --on-accent: #09090b; /* Text on the accent */
  --cell: #131318; /* The raised cell */
}

[data-viewers="box"] {
  background: var(--viewers-background, var(--ground)) !important;
  border-radius: 0 !important;
  border-top: 4px solid !important;
  border-image: ${SPECTRUM} 1;
  padding: 0 !important;
  gap: 0 !important;
  align-items: stretch !important;
  overflow: hidden;
}

/* Each platform is its own cell when the layer counts them separately. */
[data-viewers="row"] {
  gap: 0 !important;
  align-items: stretch !important;
}

[data-viewers="icon"] {
  background: var(--viewers-accent, ${A});
  color: var(--on-accent) !important;
  padding: 0 .4em;
  align-items: center;
}

[data-viewers="count"] {
  display: flex;
  align-items: center;
  padding: .25em .55em;
  background: var(--cell);
  letter-spacing: .1em;
}`,
      },
      {
        id: 'marathon-panel',
        layerType: 'shape',
        name: 'Panel',
        hint: 'The background the rest of it sits on.',
        css: `:scope {
  --ground: #09090bdd; /* The black it sits on */
  --edge: 4px; /* Spectrum edge */
}

[data-shape="box"] {
  background: var(--ground) !important;
  border-top: var(--edge) solid !important;
  border-image: ${SPECTRUM} 1;
}`,
      },
      {
        id: 'marathon-frame',
        layerType: 'shape',
        name: 'Spectrum frame',
        hint: 'Hollow, for a camera or a capture. Put it above what it frames.',
        css: `:scope {
  --ground: #09090b; /* The black it sits on */
}

[data-shape="box"] {
  background: transparent !important;
  /*
    Longhands, because the border shorthand resets border-image — and with
    !important on it that reset is important too, so the spectrum below it
    loses and the frame comes out a plain 4px line. Measured, not guessed:
    it drew that way the first time.
  */
  border-width: 4px !important;
  border-style: solid !important;
  border-color: transparent !important;
  border-image: ${SPECTRUM} 1 !important;
  border-radius: 0 !important;
  /*
    A black hairline either side of the spectrum. Without it the frame is
    read against whatever is behind it, and a bright game washes it out.
  */
  box-shadow: 0 0 0 2px var(--ground), inset 0 0 0 2px var(--ground);
}`,
      },
      {
        id: 'marathon-brackets',
        layerType: 'shape',
        name: 'Spectrum corners',
        hint: 'Marks the corners without boxing anything in. Each one a colour from the edge.',
        /*
          The corners take the spectrum in order going clockwise, so the same
          five colours that run along every other edge in this look run
          around a capture as well.

          The !important on size, position and repeat is load-bearing: the
          shape writes `background` inline, that shorthand resets all three,
          and without it the eight gradients each fill the whole box.
        */
        css: `:scope {
  --arm: 44px; /* Bracket length */
  --thick: 4px; /* Bracket thickness */
}

[data-shape="box"] {
  background: transparent !important;
  border: 0 !important;
  border-radius: 0 !important;
  --tl: #ff2d95;
  --tr: #ffe600;
  --br: #00ff88;
  --bl: #00d5ff;
  background-image:
    linear-gradient(var(--tl), var(--tl)), linear-gradient(var(--tl), var(--tl)),
    linear-gradient(var(--tr), var(--tr)), linear-gradient(var(--tr), var(--tr)),
    linear-gradient(var(--bl), var(--bl)), linear-gradient(var(--bl), var(--bl)),
    linear-gradient(var(--br), var(--br)), linear-gradient(var(--br), var(--br)) !important;
  background-size: var(--arm) var(--thick), var(--thick) var(--arm), var(--arm) var(--thick), var(--thick) var(--arm),
    var(--arm) var(--thick), var(--thick) var(--arm), var(--arm) var(--thick), var(--thick) var(--arm) !important;
  background-position:
    left top, left top, right top, right top,
    left bottom, left bottom, right bottom, right bottom !important;
  background-repeat: no-repeat !important;
}`,
      },
      {
        id: 'marathon-alert',
        layerType: 'alert',
        applies: 'alert',
        name: 'Alert',
        hint: 'Flat black under a spectrum bar, with the name as a filled chip. Built in two pieces so a motion can assemble it.',
        css: `:scope {
  --ground: #09090b; /* The black it sits on */
  --on-accent: #09090b; /* Text on the accent */
  --ink: #ffffff; /* The words */
}

/*
  The bar and the panel are drawn as two pieces rather than as a border and a
  background on one box, so that a motion can build them one at a time. On
  their own they sit at full size and this looks like one flat panel.

  Both are behind the text: a positioned pseudo-element otherwise paints over
  the children of the element it belongs to, and the caption would end up
  underneath the panel.
*/
:scope {
  position: relative;
  z-index: 0;
  background: transparent;
  padding: 22px 30px 18px;
}

/* The spectrum bar across the top. */
:scope::before {
  content: '';
  position: absolute;
  left: 0; right: 0; top: 0;
  height: 4px;
  background: ${SPECTRUM};
  transform-origin: left center;
  z-index: -1;
}

/* The panel it hangs from. */
:scope::after {
  content: '';
  position: absolute;
  left: 0; right: 0; top: 4px; bottom: 0;
  background: var(--ground);
  box-shadow: 0 20px 44px rgba(0,0,0,.6);
  transform-origin: top center;
  z-index: -1;
}

[data-alert="body"] { gap: 16px; }

[data-alert="media"] { border-radius: 0; }

/* The soft drop shadow is written inline, so saying none needs !important. */
[data-alert="caption"] {
  letter-spacing: .07em;
  text-shadow: none !important;
}

/*
  The words you typed as a filled chip, the way the category sits on the run
  card — and the name plain beside it. The chip is for what you wrote, which
  is the part that says what happened; the name is the part that changes.
*/
[data-alert="message"] {
  display: inline-block;
  background: ${A};
  color: var(--on-accent) !important;
  padding: 0 .3em;
  letter-spacing: .16em;
}

[data-alert="name"] {
  display: inline-block;
  color: var(--alert-name, var(--ink)) !important;
  letter-spacing: .08em;
}`,
      },
      {
        id: 'marathon-countdown',
        layerType: 'countdown',
        name: 'Countdown',
        hint: 'The label as a filled chip over the digits, on the same flat panel as the rest.',
        /*
          The panel goes on the layer rather than on the clock, because the
          clock carries its own background inline and fills the layer exactly.
          Clearing that one lets the panel underneath show through.
        */
        css: `:scope {
  --ground: #09090b; /* The black it sits on */
  --on-accent: #09090b; /* Text on the accent */
  --ink: #ffffff; /* The words */
}

:scope {
  background: var(--ground);
  border-top: 4px solid;
  border-image: ${SPECTRUM} 1;
}

[data-countdown="clock"] {
  background: transparent !important;
  gap: 0 !important;
}

/* The label as a filled chip, the way the category sits on the run card. */
[data-countdown="label"] {
  background: var(--countdown-label, ${A});
  color: var(--on-accent) !important;
  /*
    The tracking puts a space after the last letter as well, which inside a
    filled chip is a gap on the right. The padding is short by that much.
  */
  padding: .12em .5em .12em .8em;
  margin-bottom: .3em;
}

[data-countdown="digits"] {
  color: var(--countdown-text, var(--ink)) !important;
  letter-spacing: .02em;
}

/* Paused reads as a second chip rather than as loose words under the clock. */
[data-countdown="paused"] {
  background: var(--countdown-label, ${A});
  color: var(--on-accent) !important;
  padding: .1em .4em .1em .6em;
  margin-top: .35em;
}`,
      },
      {
        id: 'marathon-stopwatch',
        layerType: 'stopwatch',
        name: 'Run timer',
        hint: 'The run timer on the same flat panel as the countdown: white while it runs, dimmed when paused, the accent when the run is done.',
        /*
          The countdown's panel, carrying the run timer, so the two clocks read
          as one pair. The panel is on the layer, since the clock paints its own
          background inline and fills the layer exactly.
        */
        css: `:scope {
  --ground: #09090b; /* The black it sits on */
  --ink: #ffffff; /* Running digits */
  --held: #71717a; /* Paused digits */
}

:scope {
  background: var(--ground);
  border-top: 4px solid;
  border-image: ${SPECTRUM} 1;
}

[data-stopwatch="clock"] { background: transparent !important; }

[data-stopwatch="digits"] {
  color: var(--stopwatch-colour, var(--ink)) !important;
  letter-spacing: .02em;
}

[data-stopwatch-mode="idle"] [data-stopwatch="digits"] { opacity: .5; }
[data-stopwatch-mode="paused"] [data-stopwatch="digits"] { color: var(--stopwatch-colour, var(--held)) !important; }

/* The one moment the clock is the thing everybody is looking at. */
[data-stopwatch-mode="finished"] [data-stopwatch="digits"] { color: var(--stopwatch-colour, ${A}) !important; }`,
      },
      {
        id: 'marathon-chat',
        layerType: 'chat',
        applies: 'chat',
        name: 'Chat',
        hint: 'Flat rows and the name as a chip, coloured by rank out of the spectrum — the broadcaster gets the whole of it. Applying it turns the chat theme to Custom.',
        /*
          The rows are square and flat rather than the panels the other themes
          draw. Chat is a column of many small things and rounded cards at that
          size read as clutter beside a run card and a ticker that are neither.
        */
        css: `:scope {
  --ground: #09090bcc; /* The black it sits on */
  --on-accent: #09090b; /* Text on the accent */
  --ink: #ffffff; /* The words */
  --mod: #00ff88; /* Moderator */
  --vip: #ff2d95; /* VIP */
  --sub: #00d5ff; /* Subscriber */
}

[data-chat="row"] {
  background: var(--chat-row-bg, var(--ground)) !important;
  border-radius: var(--chat-row-radius, 0) !important;
  border-left: 3px solid ${A} !important;
  padding: var(--chat-row-padding, 7px 12px) !important;
  gap: 8px !important;
}

/* The name as a filled chip, the way the category sits on the run card. */
[data-chat="user"] {
  background: ${A};
  color: var(--on-accent) !important;
  padding: 0 .4em;
  letter-spacing: .1em !important;
  border-radius: 0;
}

[data-chat="text"] {
  color: var(--chat-text, var(--ink)) !important;
  letter-spacing: .01em;
}

[data-chat="time"] { color: rgba(255,255,255,.3) !important; }

/* Square, like everything else in this look. */
[data-chat="avatar"] { border-radius: 0 !important; }

[data-chat="marks"] { opacity: .8; }

/*
  A rank is a colour out of the spectrum rather than the accent, and the
  broadcaster gets the whole of it.

  The colours are the ones running along every other edge in this look, so a
  moderator beside the run card reads as part of the same overlay rather than
  as a colour chosen on its own. Set here rather than read from the rank
  settings on purpose: those are for picking your own, and this look has an
  opinion. Clear the rules below if you would rather have yours.

  Written after the two above, and at the same weight, so the later of the
  two wins — which is the rank.
*/
[data-chat-rank="moderator"] { border-left-color: var(--mod) !important; }
[data-chat-rank="vip"] { border-left-color: var(--vip) !important; }
[data-chat-rank="subscriber"] { border-left-color: var(--sub) !important; }

[data-chat-rank="moderator"] [data-chat="user"] { background: var(--mod); }
[data-chat-rank="vip"] [data-chat="user"] { background: var(--vip); }
[data-chat-rank="subscriber"] [data-chat="user"] { background: var(--sub); }

/*
  The broadcaster is the spectrum itself: across the chip, and down the edge
  — which needs the vertical one, because a 90deg gradient on a left border
  shows a single colour.
*/
[data-chat-rank="broadcaster"] [data-chat="user"] { background: ${SPECTRUM}; }

[data-chat-rank="broadcaster"] {
  border-left-color: transparent !important;
  border-image: ${SPECTRUM_DOWN} 1 !important;
}

/*
  A rank colours the chip and the edge rather than drawing a bubble around
  the line. A bubble is a second box on a thing already made of boxes, and a
  chatty moderator turns it into a wall of outlines.
*/
[data-chat="highlight"] {
  border: 0 !important;
  border-radius: 0 !important;
  background: transparent !important;
}`,
      },
      {
        id: 'marathon-images',
        layerType: 'images',
        name: 'Picture frame',
        hint: 'A black panel with the spectrum along its top, holding the picture off its edges — for a logo, a sponsor or a charity mark.',
        /*
          The picture is held off the panel's edges rather than filling it, so
          a logo with a transparent background sits on the black the way every
          other piece does, instead of floating on whatever is behind the layer.
        */
        css: `:scope {
  --ground: #09090b; /* The black it sits on */
  --inset: 14px; /* Room around the picture */
}

[data-images="frame"] {
  background: var(--ground);
  border-top: 4px solid;
  border-image: ${SPECTRUM} 1;
}

[data-images="picture"] {
  inset: var(--inset) !important;
  width: calc(100% - 2 * var(--inset)) !important;
  height: calc(100% - 2 * var(--inset)) !important;
}`,
      },
      {
        id: 'marathon-label',
        layerType: 'text',
        name: 'Section label',
        hint: 'The words as a filled chip, for naming the thing underneath. Sits over a panel.',
        css: `:scope {
  --on-accent: #09090b; /* Text on the accent */
}

/*
  The chip hugs the words rather than the layer, so where it sits is decided
  by the alignment controls and not by how wide the box happens to be.
*/
[data-text="words"] {
  width: auto !important;
  background: ${A};
  color: var(--on-accent);
  text-transform: uppercase;
  letter-spacing: .3em !important;
  /*
    The tracking puts a space after the last letter as well, which inside a
    filled chip is a gap on the right. The padding is short by that much.
  */
  padding: .12em .5em .12em .8em;
}`,
      },
      {
        id: 'marathon-heading',
        layerType: 'text',
        name: 'Heading',
        hint: 'Big letterspaced type on a spectrum rule. For a starting screen rather than a panel.',
        css: `:scope {
  --ink: #ffffff; /* The words */
}

[data-text="words"] {
  width: auto !important;
  color: var(--ink);
  text-transform: uppercase;
  letter-spacing: .18em !important;
  padding-bottom: .3em;
  /* border-bottom rather than the shorthand, which would reset the image. */
  border-bottom: 5px solid;
  border-image: ${SPECTRUM} 1;
}`,
      },
      {
        id: 'marathon-goal',
        layerType: 'goal',
        name: 'Goal bar',
        hint: 'The fill is the spectrum and the label a chip. Square, like the rest of it.',
        css: `:scope {
  --ground: #09090b; /* The black it sits on */
  --on-accent: #09090b; /* Text on the accent */
  --ink: #ffffff; /* The words */
}

/*
  The track and the fill carry their colours inline from the controls, so
  replacing them takes !important. The radius is inline too.
*/
[data-goal="track"] {
  background: var(--goal-track, var(--ground)) !important;
  border-radius: 0 !important;
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.1);
}

[data-goal="fill"] {
  background: var(--goal-bar, ${SPECTRUM}) !important;
  border-radius: 0 !important;
}

/* The label as a filled chip, the way the category sits on the run card. */
[data-goal="label"] {
  background: ${A};
  color: var(--on-accent) !important;
  /* Short of padding on the right by the tracking, which sits after the
     last letter as well and is a gap inside a filled chip. */
  padding: .1em .35em .1em .55em;
  letter-spacing: .2em !important;
}

[data-goal="numbers"] { color: var(--goal-text, var(--ink)) !important; letter-spacing: .04em; }

/* The target is the part that does not move, so it sits back. */
[data-goal="target"] { opacity: .4 !important; }

[data-goal="percent"] {
  color: var(--goal-text, ${A}) !important;
  opacity: 1 !important;
}`,
      },
      {
        id: 'marathon-spotify',
        layerType: 'spotify',
        name: 'Now playing',
        hint: 'A flat panel with the spectrum as the progress. Art left, words beside it.',
        css: `:scope {
  --ground: #09090bdd; /* The black it sits on */
  --on-accent: #09090b; /* Text on the accent */
  --ink: #ffffff; /* The words */
  --cell: #131318; /* The raised cell */
}

[data-spotify="player"] {
  background: var(--ground);
  padding: 12px 14px;
  border-top: 4px solid;
  border-image: ${SPECTRUM} 1;
}

[data-spotify="label"] {
  background: ${A};
  color: var(--on-accent);
  padding: 0 .5em 0 .7em;
  justify-self: start;
  opacity: 1;
}

[data-spotify="art"] { border-radius: 0; }

[data-spotify="title"] { color: var(--ink); letter-spacing: .02em; }

[data-spotify="progress"] { background: var(--cell); }

/* The spectrum, clipped to how far through it is. */
[data-spotify="fill"] { background: ${SPECTRUM}; }`,
      },
      {
        id: 'marathon-spotify-bar',
        layerType: 'spotify',
        name: 'Now playing bar',
        hint: 'The same markup as one line, the way the ticker reads. Make the layer short and wide.',
        /* Shown at the shape it is for, or its art would eat the row. */
        previewSize: { width: 900, height: 64 },
        /*
          The point of every part being a sibling: turning the card into a bar
          is one grid-template-areas and nothing else. There is no nesting to
          fight, because nothing was wrapped together in the first place.
        */
        css: `:scope {
  --ground: #09090b; /* The black it sits on */
  --on-accent: #09090b; /* Text on the accent */
  --ink: #ffffff; /* The words */
}

[data-spotify="player"] {
  background: var(--ground);
  border-top: 4px solid;
  border-image: ${SPECTRUM} 1;
  /* One row, and the progress laid underneath the whole of it. */
  grid-template-areas: "art label title artist elapsed";
  grid-template-columns: auto auto auto 1fr auto;
  align-items: center;
  align-content: center;
  gap: 0;
  padding: 0;
}

[data-spotify="art"] {
  width: 100%;
  height: 100%;
  aspect-ratio: 1;
}

[data-spotify="label"] {
  background: ${A};
  color: var(--on-accent);
  align-self: stretch;
  display: flex;
  align-items: center;
  padding: 0 .9em 0 1.1em;
  opacity: 1;
}

[data-spotify="title"] { color: var(--ink); padding: 0 .6em 0 1em; }

[data-spotify="artist"] { padding-right: 1em; }

[data-spotify="elapsed"] { padding-right: 1em; }

/* Out of the way: a bar has no room for either. */
[data-spotify="album"], [data-spotify="duration"] { display: none; }

/*
  The progress is not a row of its own here — it is a line along the bottom
  of the whole bar, which is what --spotify-progress is for.
*/
[data-spotify="progress"] {
  grid-area: 1 / 1 / 2 / -1;
  align-self: end;
  height: 3px;
  margin: 0;
  background: transparent;
}

[data-spotify="fill"] { background: ${SPECTRUM}; }`,
      },
      {
        id: 'marathon-plan',
        layerType: 'plan',
        name: 'Stream plan',
        hint: 'The line you are on takes the spectrum; the ones behind you fade out of the way. No ground of its own — lay it on a panel.',
        css: `:scope {
  --on-accent: #09090b; /* Text on the accent */
  --ink: #ffffff; /* The words */
}

/*
  No ground and no edge of its own: this is meant to sit on a panel, and a
  second black box on top of the first is a box with a seam down it.
*/
[data-plan="list"] {
  background: transparent !important;
  border-radius: 0 !important;
  padding: 0 !important;
}

/* The heading as a filled chip, the way the category sits on the run card. */
[data-plan="title"] {
  background: ${A};
  color: var(--on-accent) !important;
  align-self: flex-start;
  padding: .12em .5em .12em .7em;
  letter-spacing: .24em !important;
  margin-bottom: .3em;
}

/*
  The mark on the line you are on takes the spectrum, running down it — the
  vertical one, because a 90deg gradient on something this narrow shows a
  single colour.
*/
[data-plan-state="now"] [data-plan="mark"] {
  background: ${SPECTRUM_DOWN} !important;
  width: .3em !important;
  border-radius: 0 !important;
}

[data-plan-state="now"] [data-plan="text"] {
  color: var(--ink) !important;
  opacity: 1 !important;
}

/* Behind you, and out of the way of what is next. */
[data-plan-state="done"] [data-plan="text"] { opacity: .32 !important; }

[data-plan="note"] { opacity: .55; }`,
      },
      {
        id: 'marathon-question',
        layerType: 'question',
        name: 'Question',
        hint: 'A flat card with the spectrum down its edge. This one brings its own ground, since it appears over the game.',
        /*
          Unlike the plan, this has a ground of its own. It shows up for a
          segment and then goes, usually over whatever is being played, so
          there is nothing underneath it to sit on.
        */
        css: `:scope {
  --ground: #09090be6; /* The black it sits on */
  --on-accent: #09090b; /* Text on the accent */
  --ink: #ffffff; /* The words */
}

[data-question="card"] {
  background: var(--ground) !important;
  border-radius: 0 !important;
  padding: 14px 18px !important;
  /* The bar down the side is written inline, so replacing it takes force. */
  border-left: 5px solid transparent !important;
  border-image: ${SPECTRUM_DOWN} 1 !important;
}

/* The label as a filled chip, the way the category sits on the run card. */
[data-question="label"] {
  background: ${A};
  color: var(--on-accent) !important;
  padding: .12em .45em .12em .65em;
  letter-spacing: .24em !important;
}

[data-question="asker"] {
  color: var(--ink) !important;
  opacity: .5 !important;
}

[data-question="text"] {
  color: var(--ink) !important;
  letter-spacing: .01em;
}`,
      },
      {
        id: 'marathon-side',
        layerType: 'shape',
        name: 'Side panel',
        hint: 'The spectrum down one edge instead of across the top. For a column rather than a strip.',
        css: `:scope {
  --ground: #09090bdd; /* The black it sits on */
  --edge: 4px; /* Spectrum edge */
}

[data-shape="box"] {
  background: var(--ground) !important;
  border-left: var(--edge) solid !important;
  border-image: ${SPECTRUM_DOWN} 1;
  border-radius: 0 !important;
}`,
      },
      {
        id: 'marathon-rule',
        layerType: 'shape',
        name: 'Spectrum rule',
        hint: 'The bar on its own, to separate two things. Works on a box or on a line layer.',
        previewSize: { width: 520, height: 16 },
        /*
          Both are painted, because a line layer draws its own bar inside the
          box and a rect layer does not. One preset either way beats two that
          differ only in which of them somebody happened to pick.
        */
        css: `[data-shape="box"] {
  background: ${SPECTRUM} !important;
  border-radius: 0 !important;
}

[data-shape="rule"] {
  background: ${SPECTRUM} !important;
  border-radius: 0 !important;
}`,
      },
      {
        id: 'marathon-well',
        layerType: 'shape',
        name: 'Capture well',
        hint: 'A dark seat for a game capture to sit in. Put it behind, not over.',
        css: `:scope {
  --ground: #0b0b0e; /* The black it sits on */
  --ring: #09090b; /* The ring around it */
}

[data-shape="box"] {
  background: var(--ground) !important;
  border-radius: 0 !important;
  /*
    A hairline inside so the edge reads against a dark scene, a deep inner
    shade so the middle sits back, and a black ring outside so the whole
    thing separates from whatever it is laid on.
  */
  box-shadow:
    inset 0 0 0 1px rgba(255,255,255,.09),
    inset 0 0 70px rgba(0,0,0,.85),
    0 0 0 4px var(--ring);
}`,
      },
      {
        id: 'marathon-hazard',
        layerType: 'shape',
        name: 'Hazard stripes',
        hint: 'Accent diagonals. A strip of it reads as a marker rather than as a panel.',
        css: `:scope {
  --ground: #09090b; /* The black it sits on */
}

[data-shape="box"] {
  background: repeating-linear-gradient(
    -45deg,
    ${A} 0 14px,
    var(--ground) 14px 28px
  ) !important;
  border-radius: 0 !important;
}`,
      },
      {
        id: 'marathon-cut',
        layerType: 'shape',
        name: 'Cut corner',
        hint: 'A panel with the bar on top and a corner taken off the bottom right.',
        css: `:scope {
  --ground: #09090bdd; /* The black it sits on */
  --edge: 4px; /* Spectrum edge */
  --cut: 26px; /* Corner taken off */
}

[data-shape="box"] {
  background: var(--ground) !important;
  border-top: var(--edge) solid !important;
  border-image: ${SPECTRUM} 1;
  border-radius: 0 !important;
  /* The two top corners are left square, so the bar runs the full width. */
  clip-path: polygon(0 0, 100% 0, 100% calc(100% - var(--cut)), calc(100% - var(--cut)) 100%, 0 100%);
}`,
      },

      /*
        How these arrive, kept in the same theme as how they look.

        Motion used to be a shelf of its own, sitting beside the themes as
        though it were one. But a drawn-in ticker and a flickering alert are
        this theme’s, not a separate set: a theme is how its parts look and
        how they move. They still go in the motion box rather than the look
        one, which is what `kind` says and what keeps the two apart.
      */
      {
        id: 'motion-ticker-draw',
        layerType: 'omnibar',
        kind: 'motion',
        previewWith: 'marathon-omnibar',
        name: 'Draw in',
        hint: 'Each cell rises from the bottom as a sliver at its left edge, then is drawn out to the right — the message first, then the label. On either Marathon bar. Replays on every rotation.',
        /*
          A wipe rather than a slide, because the cells of this bar sit against
          each other and have backgrounds of their own. Slid, a block of colour
          travels across its neighbour to get where it is going, and the eye
          follows the movement instead of reading the words. Drawn, nothing
          ever leaves its own footprint.

          Clip alone, with no fade under it: the two together blur the edge
          that is doing the drawing, and that edge is the whole effect.
        */
        css: `:scope { --sliver: 4px; /* Sliver width | 1-40 */ }

/* The built-in entrance moves the whole slot; this replaces it. */
[data-omnibar="slot"], [data-tallbar="slot"] { animation: none !important; }

/* The message rises and is drawn first… */
[data-omnibar="value"], [data-tallbar="card"] {
  animation: riseDraw .55s cubic-bezier(.3,.7,.2,1) backwards;
}

/* …and the label follows it the same way. */
[data-omnibar="label"], [data-tallbar="context"] {
  animation: riseDraw .55s cubic-bezier(.3,.7,.2,1) .3s backwards;
}

@keyframes riseDraw {
  0% { clip-path: polygon(var(--sliver) 100%, var(--sliver) 100%, var(--sliver) 100%, 0 100%, 0 100%); }
  45% { clip-path: polygon(var(--sliver) 0, var(--sliver) 0, var(--sliver) 100%, 0 100%, 0 0); }
  100% { clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%, 0 0); }
}

/*
  And drawn back out, now that a slot has an exit rather than simply being
  gone. The wipe carries on the way it came in rather than reversing: a
  reveal that runs left to right and then hides right to left reads as the
  words being pulled back, and these are being replaced.

  The label goes first this time, so the two are not the entrance played
  backwards — the cell that arrived last is the one that leaves first.
*/
[data-omnibar-state="leaving"] [data-omnibar="label"] {
  animation: omniUndraw .3s cubic-bezier(.4,0,.75,.4) both;
}

[data-omnibar-state="leaving"] [data-omnibar="value"] {
  animation: omniUndraw .3s cubic-bezier(.4,0,.75,.4) .1s both;
}

@keyframes omniUndraw {
  from { clip-path: inset(0 0 0 0) }
  to   { clip-path: inset(0 0 0 100%) }
}`,
      },
      {
        id: 'motion-card-rise',
        layerType: 'runcard',
        kind: 'motion',
        previewWith: 'marathon-runcard',
        name: 'Rise',
        hint: 'The card rises from the bottom as a sliver at its left edge, then is drawn out to the right. Plays again whenever the run changes.',
        css: `:scope { --sliver: 4px; /* Sliver width | 1-40 */ }

:scope { animation: riseDraw .6s cubic-bezier(.3,.7,.2,1) backwards; }

@keyframes riseDraw {
  0% { clip-path: polygon(var(--sliver) 100%, var(--sliver) 100%, var(--sliver) 100%, 0 100%, 0 100%); }
  45% { clip-path: polygon(var(--sliver) 0, var(--sliver) 0, var(--sliver) 100%, 0 100%, 0 0); }
  100% { clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%, 0 0); }
}`,
      },
      {
        id: 'motion-plate-wipe',
        layerType: 'nameplate',
        kind: 'motion',
        previewWith: 'marathon-nameplate',
        name: 'Wipe in',
        hint: 'The plate rises from the bottom as a sliver at its left edge, then opens to the right. Plays again when the name changes.',
        css: `:scope { --sliver: 4px; /* Sliver width | 1-40 */ }

:scope { animation: riseDraw .55s cubic-bezier(.3,.7,.2,1) backwards; }

@keyframes riseDraw {
  0% { clip-path: polygon(var(--sliver) 100%, var(--sliver) 100%, var(--sliver) 100%, 0 100%, 0 100%); }
  45% { clip-path: polygon(var(--sliver) 0, var(--sliver) 0, var(--sliver) 100%, 0 100%, 0 0); }
  100% { clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%, 0 0); }
}`,
      },
      {
        id: 'motion-alert-flicker',
        layerType: 'alert',
        applies: 'alert',
        kind: 'motion',
        name: 'Flicker on',
        hint: 'Bar wipes in, panel drops from it, letters stutter like a bad tube, then the name. Set On screen to 5.0s.',
        /*
          One timeline rather than four independent entrances, because the
          order is the whole effect: the title has to be there before it can
          flicker, and the name has to arrive after the flicker has settled.

          The exit is part of it too. The built-in one is a class on this same
          element, and a rule here beats a class, so a motion that did not
          finish the job would leave the alert with no way out at all — hence
          the drop at 4.55s, which is the five second duration less its own
          length. Change one and change the other.
        */
        css: `/*
  The panel is built before anything is said on it: the bar draws itself in
  from the left, the panel drops out from under it, and only then do the
  letters strike.

  The two pieces are pseudo-elements the marathon look draws. Under a look
  that does not draw them there is no pseudo-element to animate — no content,
  so no box — and those two steps simply do nothing while the rest still plays.
*/
:scope {
  animation: ma-drop .45s ease-in 4.55s forwards;
}

@keyframes ma-drop {
  from { opacity: 1; transform: translateY(0) }
  to   { opacity: 0; transform: translateY(70px) }
}

/* Left to right, and nothing else moves until it has arrived. */
:scope::before {
  animation: ma-bar .42s cubic-bezier(.3,.6,.25,1) both;
}

@keyframes ma-bar {
  from { transform: scaleX(0) }
  to   { transform: scaleX(1) }
}

/* Then the panel unrolls downwards from the bar. */
:scope::after {
  animation: ma-panel .38s cubic-bezier(.3,.7,.3,1) .42s both;
}

@keyframes ma-panel {
  from { transform: scaleY(0) }
  to   { transform: scaleY(1) }
}

/*
  Steps, not a fade: a tube that cannot strike is on or it is off. It starts
  at nothing rather than dim, so the panel builds itself empty instead of
  carrying a ghost of the text up with it.

  The glow is a filter rather than a text-shadow because the marathon look
  clears the inline text-shadow with !important, and an !important rule beats
  an animation. Nothing speaks about filter, so the flicker keeps its glow
  under that look and under any other.
*/
[data-alert="caption"] {
  animation: ma-flicker 1.1s steps(1, end) .8s both;
}

@keyframes ma-flicker {
  0%, 7%    { opacity: 0; filter: none }
  9%        { opacity: 1; filter: drop-shadow(0 0 7px rgba(255,255,255,.75)) }
  13%       { opacity: .18; filter: none }
  17%       { opacity: 1; filter: drop-shadow(0 0 9px rgba(255,255,255,.8)) }
  21%       { opacity: .3;  filter: none }
  27%       { opacity: 1; filter: drop-shadow(0 0 5px rgba(255,255,255,.55)) }
  35%       { opacity: .14; filter: none }
  39%       { opacity: 1; filter: drop-shadow(0 0 10px rgba(255,255,255,.85)) }
  53%       { opacity: .36; filter: none }
  58%       { opacity: 1; filter: drop-shadow(0 0 6px rgba(255,255,255,.6)) }
  71%       { opacity: .2;  filter: none }
  76%, 100% { opacity: 1; filter: drop-shadow(0 0 4px rgba(255,255,255,.45)) }
}

/* A picture, where there is one, arrives with the letters rather than before. */
[data-alert="media"] {
  animation: ma-appear .3s ease-out .8s both;
}

@keyframes ma-appear {
  from { opacity: 0 }
  to   { opacity: 1 }
}

/*
  The name wipes in from the left once the title has settled. inline-block is
  here rather than only in the look, because a transform does nothing to a
  plain inline span and this has to work under any look.
*/
[data-alert="name"] {
  display: inline-block;
  animation: ma-name .45s cubic-bezier(.25,.7,.3,1) 1.95s both;
}

@keyframes ma-name {
  from { opacity: 0; transform: translateX(-46px); clip-path: inset(0 100% 0 0) }
  to   { opacity: 1; transform: translateX(0); clip-path: inset(0 0 0 0) }
}`,
      },
      {
        id: 'motion-chat-draw',
        layerType: 'chat',
        applies: 'chat',
        kind: 'motion',
        previewWith: 'marathon-chat',
        name: 'Draw a row',
        hint: 'Each message rises as a sliver at its left edge, then is drawn out to the right. Replays on every message.',
        /*
          The same wipe the ticker uses, for the same reason: a row slid into
          place travels over the row below it on the way, and the eye follows
          the movement instead of reading the words. Drawn, nothing leaves its
          own line.

          A message mounts when it arrives and is never re-rendered into a
          different row, so this plays once for each one, which is the whole
          of what an entrance is for.
        */
        css: `[data-chat="row"] {
  --sliver: 4px; /* Sliver width | 1-40 */
  animation: riseDraw .4s cubic-bezier(.3,.7,.2,1) backwards;
}

@keyframes riseDraw {
  0% { clip-path: polygon(var(--sliver) 100%, var(--sliver) 100%, var(--sliver) 100%, 0 100%, 0 100%); }
  45% { clip-path: polygon(var(--sliver) 0, var(--sliver) 0, var(--sliver) 100%, 0 100%, 0 0); }
  100% { clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%, 0 0); }
}`,
      },
      {
        id: 'marathon-players',
        layerType: 'players',
        name: 'Players',
        hint: 'Flat black with the spectrum along the top, the title as an accent chip, each player a raised cell with a square of their colour. Anyone out goes dark, the reason in a chip.',
        css: `:scope {
  --ground: #09090b; /* The black it sits on */
  --on-accent: #09090b; /* Text on the accent */
  --cell: #131318; /* The raised cell */
}

[data-players="list"] {
  background: var(--players-background, var(--ground)) !important;
  border-radius: 0 !important;
  border-top: 4px solid;
  border-image: linear-gradient(90deg, #ff2d95, #ffe600, #00ff88, #00d5ff, #8b5cf6) 1;
  color: var(--players-text, #ffffff) !important;
}

[data-players="title"] {
  align-self: flex-start;
  background: var(--overlay-accent, #f43f5e);
  color: var(--on-accent);
  padding: .1em .35em .1em .55em;
  letter-spacing: .2em !important;
}

[data-players="row"] { background: var(--cell) !important; border-radius: 0 !important; }
[data-players="dot"] { border-radius: 0 !important; }
[data-players="name"] { letter-spacing: .06em; }

[data-players-state="out"], [data-players-state="ejected"], [data-players-state="dead"] { opacity: 1 !important; background: #0d0d10 !important; }
[data-players-state="out"] [data-players="name"], [data-players-state="ejected"] [data-players="name"], [data-players-state="dead"] [data-players="name"] { color: #52525b; }
[data-players="state"] { background: var(--overlay-accent, #f43f5e); color: var(--on-accent); padding: 0 .4em; letter-spacing: .14em !important; }`,
      },
      {
        id: 'marathon-poll',
        layerType: 'poll',
        name: 'Poll',
        hint: 'Flat black with the spectrum along the top, each answer a raised cell that fills with the spectrum as votes come in, its number as an accent chip.',
        css: `:scope {
  --ground: #09090b; /* The black it sits on */
  --on-accent: #09090b; /* Text on the accent */
  --cell: #131318; /* The raised cell */
}

[data-poll="card"] {
  background: var(--poll-background, var(--ground)) !important;
  border-radius: 0 !important;
  border-top: 4px solid;
  border-image: linear-gradient(90deg, #ff2d95, #ffe600, #00ff88, #00d5ff, #8b5cf6) 1;
  color: var(--poll-text, #ffffff) !important;
}

[data-poll="question"] { letter-spacing: .03em; }
[data-poll="option"] { background: var(--cell) !important; border-radius: 0 !important; }
[data-poll="fill"] { background: var(--poll-bar, linear-gradient(90deg, #ff2d95, #ffe600, #00ff88, #00d5ff, #8b5cf6)) !important; opacity: .35 !important; }

[data-poll="number"] {
  display: grid;
  place-items: center;
  min-width: 1.3em;
  background: var(--overlay-accent, #f43f5e);
  color: var(--on-accent);
  opacity: 1 !important;
}

[data-poll-winner="true"] { box-shadow: inset 0 -4px 0 var(--overlay-accent, #f43f5e); }
[data-poll="footer"] { letter-spacing: .16em; text-transform: uppercase; }
[data-poll="timer"] { color: var(--overlay-accent, #f43f5e); }`,
      },
      {
        id: 'marathon-voice',
        layerType: 'voice',
        name: 'Call',
        hint: 'The Discord call as square pictures, the one talking edged in the spectrum, and each name as an accent chip under its picture.',
        css: `:scope {
  --ground: #09090b; /* The black it sits on */
  --on-accent: #09090b; /* Text on the accent */
}

[data-voice="avatar"], [data-voice="picture"] { border-radius: 0 !important; }
[data-voice="avatar"] { box-shadow: 0 0 0 2px var(--ground) !important; }
[data-voice-speaking="true"] [data-voice="frame"] {
  padding: max(2px, 3cqw);
  background: var(--voice-glow, linear-gradient(135deg, #ff2d95, #ffe600, #00ff88, #00d5ff, #8b5cf6));
}

[data-voice="name"] {
  background: var(--ground);
  padding: .1em .45em !important;
  letter-spacing: .14em;
  text-transform: uppercase;
}
[data-voice-speaking="true"] [data-voice="name"] { background: var(--overlay-accent, #f43f5e); color: var(--on-accent) !important; }

[data-voice="status"] { border-radius: 0 !important; background: var(--ground) !important; }`,
      },
      {
        id: 'marathon-avatar',
        layerType: 'avatar',
        name: 'Avatar panel',
        hint: 'The avatar on a flat black panel with the spectrum along its top, its text as an accent chip. The spectrum brightens while you talk.',
        previewConfig: { label: 'Back soon' },
        css: `:scope {
  --ground: #09090b; /* The black it sits on */
  --on-accent: #09090b; /* Text on the accent */
  --avatar-size: min(92cqw, 92cqh);
}

[data-avatar="frame"] {
  position: relative;
  background: var(--ground);
  border-top: 4px solid;
  border-image: linear-gradient(90deg, #ff2d95, #ffe600, #00ff88, #00d5ff, #8b5cf6) 1;
  justify-content: flex-end !important;
  filter: brightness(.92);
  transition: filter 120ms linear;
}
[data-avatar-talking="true"] { filter: brightness(1.08); }

[data-avatar="label"] {
  position: absolute;
  left: 12px;
  top: 14px;
  margin: 0 !important;
  background: var(--overlay-accent, #f43f5e);
  color: var(--on-accent) !important;
  padding: .1em .35em .1em .55em;
  letter-spacing: .2em !important;
  font-size: min(5.5cqh, 8cqw) !important;
}`,
      },
      {
        id: 'marathon-pngtuber',
        layerType: 'pngtuber',
        name: 'PNGtuber on the spectrum',
        hint: 'Your pictures cut out in black, standing on a spectrum bar that lights up while you talk.',
        css: `:scope {
  --edge: #09090b; /* The cut-out edge */
  --thick: 3px; /* Edge thickness */
  --quiet: 0.3; /* The bar while quiet | 0-1 */
}

[data-pngtuber="frame"] { position: relative; }

[data-pngtuber="picture"] {
  filter:
    drop-shadow(var(--thick) 0 0 var(--edge)) drop-shadow(calc(0px - var(--thick)) 0 0 var(--edge))
    drop-shadow(0 var(--thick) 0 var(--edge)) drop-shadow(0 calc(0px - var(--thick)) 0 var(--edge));
}

[data-pngtuber="frame"]::after {
  content: '';
  position: absolute;
  left: 8%;
  right: 8%;
  bottom: 0;
  height: 6px;
  background: linear-gradient(90deg, #ff2d95, #ffe600, #00ff88, #00d5ff, #8b5cf6);
  opacity: var(--quiet);
  transition: opacity 80ms linear;
}
[data-pngtuber-talking="true"][data-pngtuber="frame"]::after { opacity: 1; }`,
      },
      {
        id: 'marathon-hypetrain',
        layerType: 'hypetrain',
        name: 'Hype Train',
        hint: 'Flat black with the spectrum along the top, the level as an accent chip and the bar filling with the spectrum. A level up flashes the chip.',
        css: `@keyframes marathonHype { 50% { background: #ffffff; } }

:scope {
  --ground: #09090b; /* The black it sits on */
  --on-accent: #09090b; /* Text on the accent */
  --cell: #131318; /* The empty bar */
}

[data-hype="frame"] {
  background: var(--ground) !important;
  border-radius: 0 !important;
  border-top: 4px solid;
  border-image: linear-gradient(90deg, #ff2d95, #ffe600, #00ff88, #00d5ff, #8b5cf6) 1;
}

[data-hype="title"] { color: #ffffff; letter-spacing: .2em; }
[data-hype="level"] { background: var(--overlay-accent, #f43f5e); color: var(--on-accent) !important; padding: .05em .45em; }
[data-hype="track"] { border-radius: 0 !important; background: var(--cell) !important; }
[data-hype="fill"] { border-radius: 0 !important; background: linear-gradient(90deg, #ff2d95, #ffe600, #00ff88, #00d5ff, #8b5cf6) !important; }
[data-hype="time"] { opacity: .55 !important; }
[data-hype-levelup="true"] [data-hype="level"] { animation: marathonHype 500ms steps(2) 5; }`,
      },
      {
        id: 'marathon-shoutout',
        layerType: 'shoutout',
        name: 'Shoutout',
        hint: 'Flat black with the spectrum along the top, a square picture, the title as an accent chip, the name large and the game in the accent.',
        css: `:scope {
  --ground: #09090b; /* The black it sits on */
  --on-accent: #09090b; /* Text on the accent */
}

[data-shoutout="frame"] {
  background: var(--ground) !important;
  border-radius: 0 !important;
  border-top: 4px solid;
  border-image: linear-gradient(90deg, #ff2d95, #ffe600, #00ff88, #00d5ff, #8b5cf6) 1;
}

[data-shoutout="avatar"] { border-radius: 0 !important; }
[data-shoutout="title"] {
  align-self: flex-start;
  background: var(--overlay-accent, #f43f5e);
  color: var(--on-accent);
  padding: .1em .35em .1em .55em;
  letter-spacing: .2em !important;
  opacity: 1 !important;
}
[data-shoutout="name"] { color: #ffffff !important; letter-spacing: .04em; }
[data-shoutout="game"] { color: var(--overlay-accent, #f43f5e); }
[data-shoutout="viewers"] { background: #131318; padding: .1em .45em; }`,
      },
      {
        id: 'marathon-leaderboard',
        layerType: 'leaderboard',
        name: 'Level board',
        hint: 'Flat black with the spectrum along the top, every person a raised cell, the level as an accent chip and the spectrum filling their bar. First place gets the spectrum edge.',
        css: `:scope {
  --ground: #09090b; /* The black it sits on */
  --on-accent: #09090b; /* Text on the accent */
  --cell: #131318; /* The raised cell */
}

[data-board="frame"] {
  background: var(--ground) !important;
  border-radius: 0 !important;
  border-top: 4px solid;
  border-image: linear-gradient(90deg, #ff2d95, #ffe600, #00ff88, #00d5ff, #8b5cf6) 1;
}

[data-board="title"] { color: #ffffff !important; letter-spacing: .2em; }
[data-board="row"] { background: var(--cell); padding-right: .6em; }
[data-board="avatar"] { border-radius: 0 !important; }
[data-board="level"] { background: var(--overlay-accent, #f43f5e); color: var(--on-accent) !important; padding: .05em .45em; }
[data-board="track"] { border-radius: 0 !important; background: #ffffff14 !important; }
[data-board="fill"] { border-radius: 0 !important; background: linear-gradient(90deg, #ff2d95, #ffe600, #00ff88, #00d5ff, #8b5cf6) !important; }
[data-board-podium="first"] { box-shadow: inset 4px 0 0 #ffe600; }
[data-board-podium="first"] [data-board="place"] { color: #ffe600; opacity: 1 !important; }`,
      },
      {
        id: 'marathon-giveaway',
        layerType: 'giveaway',
        name: 'Giveaway',
        hint: 'Flat black with the spectrum along the top, the title as an accent chip, the names spinning past in a raised cell and the winner in the accent.',
        css: `@keyframes marathonWin { 50% { color: #ffffff; } }

:scope {
  --ground: #09090b; /* The black it sits on */
  --on-accent: #09090b; /* Text on the accent */
  --cell: #131318; /* The raised cell */
}

[data-giveaway="frame"] {
  background: var(--ground) !important;
  border-radius: 0 !important;
  border-top: 4px solid;
  border-image: linear-gradient(90deg, #ff2d95, #ffe600, #00ff88, #00d5ff, #8b5cf6) 1;
}

[data-giveaway="title"] {
  background: var(--overlay-accent, #f43f5e);
  color: var(--on-accent) !important;
  padding: .1em .35em .1em .55em;
  letter-spacing: .2em;
}
[data-giveaway="prize"] { color: #ffffff; }
[data-giveaway="reel"] { background: var(--cell); padding: .15em .4em; }
[data-giveaway="avatar"] { border-radius: 0 !important; }
[data-giveaway-state="drawn"] [data-giveaway="name"] { animation: marathonWin 600ms steps(2) 4; }`,
      },
    ],
  };

export default look;
