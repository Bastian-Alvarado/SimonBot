/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The "Emergency Meeting" theme: every look it has, for every kind of layer it dresses.
 * One of the themes in the Library (shared/looks/index.js lists them, in order).
 */

const look =
  {
    id: 'emergency',
    name: 'Emergency Meeting',
    hint: 'A social-deduction party night: a voting tablet of crewmates, meeting-chat bubbles, the task bar and the task list, and the red alarm when somebody calls a meeting.',
    /*
      Drawn from the screens every Among Us player knows by sight — the voting
      tablet, the chat bubbles in a meeting, the green task bar, the task
      list, the red emergency splash and the ejection line over space — and
      not from its artwork: the crewmates are CSS, a bean, a visor and a
      backpack, so nothing of the game's own is copied. The name says the
      thing the screens say rather than the game's.

      The face is Baloo 2, heavy and rounded like the game's own lettering,
      and the outlines are a hard black, as they are there. Every colour is a
      field on the layer.

      Made for the players list first: a player's colour dot becomes a
      crewmate in that colour, and a player who is out keeps their card on
      the tablet, greyed, with the reason stamped across it.
    */
    objects: [
      {
        id: 'em-players',
        layerType: 'players',
        name: 'Voting tablet',
        hint: 'The meeting tablet: a card per player with a crewmate in their colour. Out, ejected or dead greys the card and stamps the reason on it. Give the layer the title "Who Is The Impostor?".',
        previewSize: { width: 620, height: 380 },
        css: `:scope {
  --tablet: #aebfd0; /* The tablet */
  --header: #1d2b3a; /* The header */
  --card: #eef3f7; /* Cards */
  --gone: #8a97a3; /* Cards that are out */
  --ink: #111820; /* The names */
  --line: #111111; /* The outlines */
  --visor: #a7d9ea; /* The visor */
  --stamp: #d1202e; /* Out stamp */
}
[data-players="list"] { background: var(--players-background, var(--tablet)) !important; border: .35em solid var(--header); border-radius: 1.1em !important; font-family: 'Baloo 2', sans-serif; }
[data-players="title"] { background: var(--header); color: #fff; text-align: center; text-transform: none; font-size: 1.4em !important; font-weight: 800; margin: -.55em -.55em .1em; }
[data-players="row"] { background: var(--card) !important; border: 2px solid var(--line); border-radius: .6em !important; color: var(--players-text, var(--ink)); }
[data-players="name"] { font-weight: 800 !important; }
[data-players="dot"] { position: relative; width: 24cqh !important; height: 40cqh !important; margin-left: 11cqh; border: 2px solid var(--line); border-radius: 46% 46% 30% 30% / 50% 50% 22% 22% !important; box-shadow: inset -5cqh -3cqh 0 #0004; }
[data-players="dot"]::before, [data-players="dot"]::after { content: ''; position: absolute; border: 2px solid var(--line); }
[data-players="dot"]::before { left: -48%; top: 30%; width: 42%; height: 46%; background: inherit; border-right: 0; border-radius: 40% 0 0 40%; }
[data-players="dot"]::after { top: 15%; left: 34%; width: 80%; height: 30%; background: var(--visor); border-radius: 50%; }
[data-players-state="out"], [data-players-state="ejected"], [data-players-state="dead"] { opacity: 1 !important; background: var(--gone) !important; }
[data-players-state] [data-players="name"] { text-decoration: none !important; }
[data-players-state="dead"] [data-players="dot"] { filter: grayscale(1) brightness(.75); }
[data-players="state"] { color: var(--stamp); border: 2px solid; border-radius: .3em; padding: 0 .3em; font-size: 24cqh !important; transform: rotate(-8deg); }`,
      },
      {
        id: 'em-chat',
        layerType: 'chat',
        applies: 'chat',
        name: 'Meeting chat',
        hint: 'White bubbles with a hard outline, the way chat looks in a meeting, and a crewmate head in each chatter\'s own colour before their name. Applying it turns the chat theme to Custom.',
        /*
          The head is drawn in currentColor, which on the name is the
          chatter's own colour — so everybody's crewmate is theirs without a
          rule per person. The visor is a gradient laid over it.
        */
        css: `:scope {
  --bubble: #ffffff; /* The bubble */
  --ink: #111820; /* The words */
  --outline: #111111; /* The outlines */
  --visor: #a7d9ea; /* The visor */
}

[data-chat="row"] {
  background: var(--chat-row-bg, var(--bubble)) !important;
  border: 2px solid var(--outline) !important;
  border-radius: var(--chat-row-radius, .9em) !important;
  padding: var(--chat-row-padding, 8px 12px) !important;
  box-shadow: 0 3px 0 rgba(0,0,0,.35);
  font-family: 'Baloo 2', sans-serif;
}

[data-chat="user"] { font-weight: var(--chat-user-weight, 800) !important; }

[data-chat="user"]::before {
  content: '';
  display: inline-block;
  width: .8em;
  height: 1em;
  margin-right: .35em;
  vertical-align: -.12em;
  border: 2px solid var(--outline);
  border-radius: 46% 46% 30% 30% / 50% 50% 22% 22%;
  background:
    radial-gradient(ellipse 48% 20% at 66% 34%, var(--visor) 92%, transparent 100%),
    currentColor;
}

[data-chat="text"] { color: var(--chat-text, var(--ink)) !important; font-weight: 600; }
[data-chat="time"] { color: #6b7785 !important; }
[data-chat="avatar"] { border: 2px solid var(--outline); }

[data-chat="highlight"] {
  border: 0 !important;
  background: transparent !important;
}`,
      },
      {
        id: 'em-alert',
        layerType: 'alert',
        applies: 'alert',
        name: 'Emergency meeting',
        hint: 'The red alarm splash, striped and outlined, with the message huge and the name under it. For raids and big moments — write the message as "Emergency Meeting!".',
        css: `:scope {
  --alarm: #c8102e; /* The alarm */
  --stripe: #7a0818; /* Its stripes */
  --ink: #ffffff; /* The words */
  --outline: #111111; /* The outlines */
}

:scope {
  position: relative;
  z-index: 0;
  background: transparent;
  padding: 24px 44px;
  text-align: center;
  font-family: 'Baloo 2', sans-serif;
}

:scope::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  background: repeating-linear-gradient(-45deg, var(--alarm) 0 22px, var(--stripe) 22px 30px);
  border: 4px solid var(--outline);
  border-radius: 18px;
  box-shadow: 0 18px 44px rgba(0,0,0,.6);
}

[data-alert="caption"] {
  color: var(--alert-text, var(--ink)) !important;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: .02em;
  text-shadow:
    3px 3px 0 var(--outline), -2px -2px 0 var(--outline),
    2px -2px 0 var(--outline), -2px 2px 0 var(--outline) !important;
}

[data-alert="message"] { display: block; font-size: 1.3em; }
/* The alert paints the name in the accent; here it is the words' colour. */
[data-alert="name"] { display: block; color: var(--alert-name, var(--ink)) !important; }
[data-alert="media"] { border-radius: 12px; }`,
      },
      {
        id: 'em-ejected',
        layerType: 'alert',
        applies: 'alert',
        name: 'Ejected',
        hint: 'White words over a black starfield, the ejection line. Write the message as "was not The Impostor." and pair it with the Typed out motion.',
        css: `:scope {
  --space: #05060d; /* Space */
  --star: #ffffff; /* The stars */
  --ink: #ffffff; /* The words */
}

:scope {
  padding: 34px 52px;
  font-family: 'Baloo 2', sans-serif;
  background:
    radial-gradient(1.6px 1.6px at 12% 22%, var(--star), transparent),
    radial-gradient(1px 1px at 28% 70%, var(--star), transparent),
    radial-gradient(1.4px 1.4px at 46% 30%, var(--star), transparent),
    radial-gradient(1px 1px at 63% 82%, var(--star), transparent),
    radial-gradient(1.8px 1.8px at 78% 40%, var(--star), transparent),
    radial-gradient(1px 1px at 91% 16%, var(--star), transparent),
    radial-gradient(1.2px 1.2px at 6% 88%, var(--star), transparent),
    var(--space);
}

[data-alert="caption"] {
  color: var(--alert-text, var(--ink)) !important;
  font-weight: 600;
  letter-spacing: .01em;
  text-shadow: none !important;
}

[data-alert="name"], [data-alert="message"] { display: inline; }
/* One colour for the whole line, as it reads in the game: not the accent. */
[data-alert="name"] { color: var(--alert-name, var(--ink)) !important; }`,
      },
      {
        id: 'em-goal',
        layerType: 'goal',
        name: 'Total tasks',
        hint: 'The green task bar in its dark frame, the label in outlined white — "Total tasks completed".',
        css: `:scope {
  --frame: #2b3440; /* The frame */
  --track: #3f4b59; /* The empty bar */
  --fill: #43d62c; /* Tasks done */
  --ink: #ffffff; /* The words */
  --outline: #111111; /* The outlines */
}

:scope { font-family: 'Baloo 2', sans-serif; }

[data-goal="track"] {
  /* Chunky, like the task bar in the game, not the thin default. */
  height: 1.3em !important;
  background: var(--goal-track, var(--track)) !important;
  border: 3px solid var(--outline);
  border-radius: 4px !important;
  box-shadow: inset 0 3px 0 rgba(0,0,0,.35), 0 0 0 3px var(--frame);
}

[data-goal="fill"] {
  background: var(--goal-bar, linear-gradient(180deg, #7cf06a, var(--fill) 45%, #2a9a18)) !important;
  border-radius: 0 !important;
}

[data-goal="label"], [data-goal="numbers"], [data-goal="percent"] {
  color: var(--goal-text, var(--ink)) !important;
  opacity: 1 !important;
  font-weight: 800;
  text-shadow:
    2px 2px 0 var(--outline), -1px -1px 0 var(--outline),
    1px -1px 0 var(--outline), -1px 1px 0 var(--outline);
}
[data-goal="label"] { text-transform: uppercase; letter-spacing: .04em !important; }`,
      },
      {
        id: 'em-plan',
        layerType: 'plan',
        name: 'Task list',
        hint: 'The task list in the corner: a dark translucent panel, tasks in white, the one you are on in yellow and the ones done in green.',
        css: `:scope {
  --panel: #1b212bcc; /* The panel */
  --ink: #ffffff; /* A task */
  --now: #f5f557; /* The one you are on */
  --done: #43d62c; /* Done */
}

[data-plan="list"] {
  background: var(--panel) !important;
  border: 2px solid #111111;
  border-radius: 10px !important;
  font-family: 'Baloo 2', sans-serif;
}

[data-plan="title"] {
  color: var(--ink) !important;
  font-weight: 800;
  text-transform: none;
  letter-spacing: .02em !important;
  font-size: 1.15em;
}

[data-plan="mark"] { display: none !important; }
[data-plan="text"] { color: var(--ink) !important; font-weight: 600; }
[data-plan-state="now"] [data-plan="text"] { color: var(--now) !important; opacity: 1 !important; }
[data-plan-state="done"] [data-plan="text"] { color: var(--done) !important; opacity: 1 !important; }
[data-plan="note"] { color: var(--ink); opacity: .6; }`,
      },
      {
        id: 'em-omnibar',
        layerType: 'omnibar',
        name: 'Task strip',
        hint: 'A dark strip with an outlined top edge, the label in task-bar green and the message in white.',
        css: `:scope {
  --bar: #1b212be6; /* The bar */
  --label: #43d62c; /* The label */
  --ink: #ffffff; /* The words */
  --outline: #111111; /* The outlines */
}

[data-omnibar="bar"] {
  background: var(--omnibar-background, var(--bar)) !important;
  border-top: 3px solid var(--outline);
  border-radius: 0 !important;
  font-family: 'Baloo 2', sans-serif;
}

[data-omnibar-state="pinned"] { box-shadow: inset -2px 0 0 #ffffff26; }

[data-omnibar="label"] {
  color: var(--omnibar-accent, var(--label)) !important;
  font-weight: 800;
  letter-spacing: .06em;
  text-shadow: 2px 2px 0 var(--outline);
}

[data-omnibar="value"] { color: var(--omnibar-text, var(--ink)) !important; font-weight: 700; }`,
      },
      {
        id: 'em-countdown',
        layerType: 'countdown',
        name: 'Game starting',
        hint: 'The lobby countdown: heavy outlined white digits under a rounded label — "Game starting in".',
        css: `:scope {
  --ink: #ffffff; /* The digits */
  --outline: #111111; /* The outlines */
  --paused: #f5f557; /* Paused */
}

[data-countdown="clock"] {
  background: transparent !important;
  font-family: 'Baloo 2', sans-serif;
}

[data-countdown="label"] {
  color: var(--countdown-label, var(--ink)) !important;
  font-weight: 700;
  text-transform: none;
  letter-spacing: .02em;
  text-shadow: 2px 2px 0 var(--outline);
}

[data-countdown="digits"] {
  color: var(--countdown-text, var(--ink)) !important;
  font-weight: 800 !important;
  text-shadow:
    4px 4px 0 var(--outline), -2px -2px 0 var(--outline),
    2px -2px 0 var(--outline), -2px 2px 0 var(--outline);
}

[data-countdown="paused"] { color: var(--countdown-label, var(--paused)) !important; font-weight: 800; }`,
      },
      {
        id: 'em-question',
        layerType: 'question',
        name: 'Meeting question',
        hint: 'A white card with a hard outline and a red label chip, as if asked across the meeting table.',
        css: `:scope {
  --card: #ffffff; /* The card */
  --ink: #111820; /* The words */
  --chip: #c8102e; /* The label */
  --outline: #111111; /* The outlines */
}

[data-question="card"] {
  background: var(--card) !important;
  border: 3px solid var(--outline) !important;
  border-radius: 16px !important;
  box-shadow: 0 5px 0 rgba(0,0,0,.35);
  font-family: 'Baloo 2', sans-serif;
}

[data-question="label"] {
  background: var(--chip);
  color: #ffffff !important;
  border: 2px solid var(--outline);
  border-radius: .5em;
  padding: 0 .5em;
  font-weight: 800;
}

[data-question="asker"] { color: #56626e !important; opacity: 1 !important; }
[data-question="text"] { color: var(--ink) !important; font-weight: 700; }`,
      },
      {
        id: 'em-viewers',
        layerType: 'viewers',
        name: 'Crewmates',
        hint: 'A white pill with a hard outline and the count in heavy rounded type.',
        css: `:scope {
  --pill: #ffffff; /* The pill */
  --ink: #111820; /* The count */
  --mark: #c8102e; /* The mark */
  --outline: #111111; /* The outlines */
}

[data-viewers="box"] {
  background: var(--viewers-background, var(--pill)) !important;
  border: 3px solid var(--outline);
  border-radius: 999px !important;
  padding: .15em .8em !important;
  box-shadow: 0 4px 0 rgba(0,0,0,.35);
  font-family: 'Baloo 2', sans-serif;
}

[data-viewers="icon"] { color: var(--viewers-accent, var(--mark)) !important; }
[data-viewers="count"] { color: var(--viewers-text, var(--ink)) !important; font-weight: 800; }`,
      },
      {
        id: 'em-nameplate',
        layerType: 'nameplate',
        name: 'Crew card',
        hint: 'A white card with a hard outline, the name heavy and dark and the second line softer under it.',
        css: `:scope {
  --card: #ffffff; /* The card */
  --ink: #111820; /* The name */
  --soft: #56626e; /* The second line */
  --outline: #111111; /* The outlines */
}

[data-nameplate="plate"] {
  background: var(--nameplate-background, var(--card)) !important;
  border: 3px solid var(--outline) !important;
  border-radius: 16px !important;
  box-shadow: 0 5px 0 rgba(0,0,0,.35);
  font-family: 'Baloo 2', sans-serif;
}

[data-nameplate="name"] { color: var(--nameplate-text, var(--ink)) !important; font-weight: 800 !important; }
[data-nameplate="subtitle"] { color: var(--nameplate-accent, var(--soft)) !important; font-weight: 600; }`,
      },
      {
        id: 'em-shout',
        layerType: 'text',
        name: 'Red shout',
        hint: 'Heavy red capitals with a hard black outline — "SHHHHHH!", "EMERGENCY MEETING", "DEFEAT".',
        css: `:scope {
  --red: #e0162b; /* The words */
  --outline: #111111; /* The outline */
}

[data-text="words"] {
  color: var(--red);
  font-family: 'Baloo 2', sans-serif;
  font-weight: 800 !important;
  text-transform: uppercase;
  letter-spacing: .01em !important;
  text-shadow:
    5px 5px 0 var(--outline), -3px -3px 0 var(--outline),
    3px -3px 0 var(--outline), -3px 3px 0 var(--outline);
}`,
      },
      {
        id: 'em-line',
        layerType: 'text',
        name: 'Ejection line',
        hint: 'Plain white words, set the way the line reads out over space. Sits on the Starfield.',
        css: `:scope {
  --ink: #ffffff; /* The words */
}

[data-text="words"] {
  color: var(--ink);
  font-family: 'Baloo 2', sans-serif;
  font-weight: 600 !important;
  letter-spacing: .01em !important;
}`,
      },
      {
        id: 'em-monitor',
        layerType: 'shape',
        name: 'Security monitor',
        hint: 'A hollow monitor bezel for your camera, like the security screens on the ship: a thick rounded frame, a CAM label and a blinking red light. Put it above the camera. The camera number is a field, for a wall of several.',
        /*
          Hollow: the middle is left clear for the camera under it. The light
          blinks once a second — slow, and nowhere near a strobe.
        */
        css: `:scope {
  --bezel: #2b3440; /* The bezel */
  --edge: #111111; /* The outlines */
  --light: #e0162b; /* The recording light */
  --label: #cfd8e3; /* The CAM label */
  --thick: 22px; /* How thick the bezel is | 6-60 */
  --cam: 1; /* Camera number | 1-99 */
}

[data-shape="box"] {
  counter-reset: cam var(--cam);
  position: relative;
  background: transparent !important;
  border: var(--thick) solid var(--bezel) !important;
  border-radius: 26px !important;
  box-shadow: 0 0 0 3px var(--edge), inset 0 0 0 3px var(--edge), inset 0 0 40px rgba(0,0,0,.45);
}

/* The label, set into the top of the bezel. */
[data-shape="box"]::before {
  content: 'CAM ' counter(cam, decimal-leading-zero);
  position: absolute;
  top: calc(var(--thick) * -1);
  left: 24px;
  height: var(--thick);
  display: flex;
  align-items: center;
  font: 800 calc(var(--thick) * .62) 'Baloo 2', sans-serif;
  letter-spacing: .08em;
  color: var(--label);
}

/* The light, top right, blinking once a second. */
[data-shape="box"]::after {
  content: '';
  position: absolute;
  top: calc(var(--thick) * -.72);
  right: 26px;
  width: calc(var(--thick) * .44);
  height: calc(var(--thick) * .44);
  border-radius: 50%;
  background: var(--light);
  box-shadow: 0 0 8px var(--light);
  animation: emBlink 1s steps(1, end) infinite;
}

@keyframes emBlink { 50% { opacity: .15; } }`,
      },
      {
        id: 'em-crewmate',
        layerType: 'shape',
        previewSize: { width: 200, height: 260 }, // Tall, as its hint says: in a wide box it was stretched sideways.
        name: 'Crewmate',
        hint: 'A crewmate on its own, in any colour, to stand beside things or peek from behind the camera. Tall layers suit it best.',
        /*
          The bean is the box; the backpack and the visor are its two
          pseudo-elements. No gap between the legs: cutting one needs a mask,
          and a mask clips the backpack off with it, which it did. Drawn at
          whatever size the layer is.
        */
        css: `:scope {
  --suit: #c51111; /* The suit */
  --visor: #a7d9ea; /* The visor */
  --line: #111111; /* The outlines */
}

[data-shape="box"] {
  position: relative;
  background: var(--suit) !important;
  border: 6px solid var(--line) !important;
  border-radius: 48% 48% 26% 26% / 42% 42% 18% 18% !important;
  box-shadow: inset -14px -10px 0 #0004;
  width: 70% !important;
  margin-left: 24%;
}

[data-shape="box"]::before {
  content: '';
  position: absolute;
  left: -34%; top: 30%;
  width: 30%; height: 42%;
  background: var(--suit);
  border: 6px solid var(--line);
  border-right: 0;
  border-radius: 40% 0 0 40%;
}

[data-shape="box"]::after {
  content: '';
  position: absolute;
  top: 14%; left: 24%;
  width: 76%; height: 26%;
  background: linear-gradient(170deg, #ffffffcc 0 18%, var(--visor) 22%);
  border: 6px solid var(--line);
  border-radius: 50%;
}`,
      },
      {
        id: 'em-spotify',
        layerType: 'spotify',
        name: 'Dropship radio',
        hint: 'What is playing, on a small tablet card: the song heavy and dark, the progress as a task bar.',
        css: `:scope {
  --card: #eef3f7; /* The card */
  --frame: #1d2b3a; /* The frame */
  --ink: #111820; /* The words */
  --fill: #43d62c; /* The progress */
}

[data-spotify="player"] {
  background: var(--card);
  border: 6px solid var(--frame);
  border-radius: 18px;
  box-shadow: 0 0 0 2px #111111, 0 8px 22px rgba(0,0,0,.5);
  padding: 12px 16px;
  font-family: 'Baloo 2', sans-serif;
}

[data-spotify="label"] { color: var(--frame); font-weight: 800; opacity: 1; }
[data-spotify="art"] { border-radius: 10px; border: 2px solid #111111; }
[data-spotify="title"] { color: var(--ink); font-weight: 800; }
[data-spotify="artist"], [data-spotify="album"], [data-spotify="elapsed"], [data-spotify="duration"] { color: #56626e; }
[data-spotify="progress"] { background: #3f4b59; border: 2px solid #111111; border-radius: 3px; }
[data-spotify="fill"] { background: var(--fill); border-radius: 0; }`,
      },
      {
        id: 'em-drift',
        layerType: 'shape',
        name: 'Drifting crewmate',
        hint: 'A crewmate tumbling slowly across space, like the ejection screen. Give it a wide, short layer: it crosses from edge to edge. Set its size to fit the layer.',
        /*
          The crewmate is drawn at its own size and flies from off one
          edge to off the other, turning as it goes. The layer clips it, so it
          slides in and out rather than popping.
        */
        css: `:scope {
  --suit: #c51111; /* The suit */
  --visor: #a7d9ea; /* The visor */
  --line: #111111; /* The outlines */
  --cross: 40s; /* Seconds to cross | 8-180 */
  --size: 130px; /* How tall it is | 30-400 */
}

[data-shape="box"] {
  position: absolute !important;
  top: calc(50% - var(--size) / 2);
  left: 0;
  height: var(--size) !important;
  width: calc(var(--size) * .62) !important;
  background: var(--suit) !important;
  border: 5px solid var(--line) !important;
  border-radius: 48% 48% 26% 26% / 42% 42% 18% 18% !important;
  box-shadow: inset -10px -8px 0 #0004;
  animation: emTumble var(--cross) linear infinite;
}

[data-shape="box"]::before {
  content: '';
  position: absolute;
  left: -34%; top: 30%;
  width: 30%; height: 42%;
  background: var(--suit);
  border: 5px solid var(--line);
  border-right: 0;
  border-radius: 40% 0 0 40%;
}

[data-shape="box"]::after {
  content: '';
  position: absolute;
  top: 14%; left: 24%;
  width: 76%; height: 26%;
  background: linear-gradient(170deg, #ffffffcc 0 18%, var(--visor) 22%);
  border: 5px solid var(--line);
  border-radius: 50%;
}

@keyframes emTumble {
  from { left: -12%; transform: rotate(0deg); }
  to { left: 108%; transform: rotate(540deg); }
}`,
      },
      {
        id: 'em-poll',
        layerType: 'poll',
        name: 'Voting screen',
        hint: 'The poll as the meeting vote: the tablet, the question in its dark header, each answer a card that fills green with votes, and the winner ticked when it closes.',
        css: `:scope {
  --tablet: #aebfd0; /* The tablet */
  --header: #1d2b3a; /* The header */
  --card: #eef3f7; /* Cards */
  --fill: #8fdc7c; /* The votes */
  --ink: #111820; /* The words */
  --line: #111111; /* The outlines */
  --win: #1e9e3c; /* The winner */
  --time: #d1202e; /* Time left */
}

[data-poll="card"] {
  background: var(--poll-background, var(--tablet)) !important;
  border: .35em solid var(--header);
  border-radius: 1.1em !important;
  font-family: 'Baloo 2', sans-serif;
  color: var(--poll-text, var(--ink)) !important;
}

[data-poll="question"] {
  background: var(--header);
  color: #fff;
  text-align: center;
  font-size: 1.6em !important;
  font-weight: 800;
  margin: -1em -1em .15em;
  border-radius: .7em .7em 0 0;
  padding: .15em .5em;
}

[data-poll="option"] {
  background: var(--card) !important;
  border: 2px solid var(--line);
  border-radius: .6em !important;
}

[data-poll="fill"] { background: var(--poll-bar, var(--fill)) !important; opacity: 1 !important; }
[data-poll="label"] { font-weight: 800 !important; }
[data-poll="number"] {
  display: grid;
  place-items: center;
  width: 62cqh;
  height: 62cqh;
  border: 2px solid var(--line);
  border-radius: 50%;
  background: #fff;
  font-size: 34cqh !important;
  opacity: 1 !important;
}

[data-poll-winner="true"] { border-color: var(--win); box-shadow: 0 0 0 3px var(--win); }
[data-poll-winner="true"] [data-poll="number"] { background: var(--win); color: #fff; font-size: 0 !important; }
[data-poll-winner="true"] [data-poll="number"]::after { content: '✓'; font-size: 40cqh; }

[data-poll="footer"] { font-size: 1em !important; font-weight: 800; }
[data-poll="timer"] { color: var(--time); font-size: 1.3em; }`,
      },
      {
        id: 'em-voice',
        layerType: 'voice',
        name: 'Meeting call',
        hint: 'The Discord call as the meeting table: thick outlined portraits and names, and whoever is talking lit green and bobbing, the way a crewmate hops when they speak up.',
        css: `:scope {
  --line: #111111; /* The outlines */
  --talk: #43d62c; /* Talking */
  --stamp: #d1202e; /* Muted */
  --hop: 0.45s; /* One hop while talking | 0.2-2 */
}

[data-voice="avatar"] {
  border: max(3px, 4cqw) solid var(--line);
  box-sizing: border-box;
  background: #eef3f7;
}

[data-voice-speaking="true"] [data-voice="avatar"] {
  border-color: var(--voice-glow, var(--talk));
  box-shadow: 0 0 0 max(2px, 3cqw) var(--line), 0 0 max(8px, 16cqw) var(--voice-glow, var(--talk)) !important;
}

[data-voice-speaking="true"] [data-voice="frame"] {
  animation: emHop var(--hop) ease-in-out infinite alternate;
}

@keyframes emHop { to { transform: translateY(-5%) scale(1.04); } }

[data-voice="name"] {
  font-family: 'Baloo 2', sans-serif;
  font-weight: 800 !important;
  text-shadow: 2px 2px 0 var(--line), -1px -1px 0 var(--line), 1px -1px 0 var(--line), -1px 1px 0 var(--line) !important;
}

[data-voice="status"] {
  background: var(--stamp) !important;
  color: #ffffff !important;
  border-color: var(--line) !important;
}`,
      },
      {
        id: 'em-stars',
        layerType: 'shape',
        name: 'Starfield',
        hint: 'Black space with stars drifting slowly past, for a starting or break screen, or behind the ejection line.',
        /*
          Three layers of stars on tiles of different sizes, each drifting at
          its own speed, so the field has depth and never visibly repeats. A
          tile moved by exactly its own width loops without a seam.
        */
        css: `:scope {
  --space: #05060d; /* Space */
  --star: #ffffff; /* The stars */
  --drift: 90s; /* One pass | 10-300 */
}

[data-shape="box"] {
  background:
    radial-gradient(1.6px 1.6px at 20% 30%, var(--star), transparent) 0 0 / 260px 200px,
    radial-gradient(1px 1px at 70% 60%, var(--star), transparent) 0 0 / 180px 160px,
    radial-gradient(1.2px 1.2px at 40% 80%, #ffffffaa, transparent) 0 0 / 120px 110px,
    var(--space) !important;
  border-radius: 0 !important;
  animation: emDrift var(--drift) linear infinite;
}

@keyframes emDrift {
  to { background-position: -260px 0, -540px 0, -960px 0, 0 0; }
}`,
      },
      {
        id: 'em-tablet',
        layerType: 'shape',
        name: 'Tablet',
        hint: 'The meeting tablet on its own: grey-blue with a thick dark frame and rounded corners. Lay chat or the players on it.',
        css: `:scope {
  --tablet: #aebfd0; /* The tablet */
  --frame: #1d2b3a; /* The frame */
}

[data-shape="box"] {
  background: var(--tablet) !important;
  border: 10px solid var(--frame) !important;
  border-radius: 28px !important;
  box-shadow: inset 0 0 0 3px #ffffff55, 0 12px 30px rgba(0,0,0,.5);
}`,
      },
      {
        id: 'em-button',
        layerType: 'shape',
        previewSize: { width: 220, height: 220 }, // Square, as its hint says: in a wide box the round button came out an oval.
        name: 'Emergency button',
        hint: 'The big red button under its dome, round, with a metal rim. Best on a square layer.',
        css: `:scope {
  --button: #d11a2a; /* The button */
  --rim: #9aa6b2; /* The rim */
}

[data-shape="box"] {
  border-radius: 50% !important;
  background:
    radial-gradient(circle at 38% 32%, #ffffffaa 0 8%, transparent 22%),
    radial-gradient(circle, var(--button) 0 58%, #7d0a14 62% 64%, var(--rim) 66% 80%, #4c555e 84%) !important;
  border: 4px solid #111111 !important;
  box-shadow: 0 10px 0 #2b3138, 0 14px 30px rgba(0,0,0,.6);
  /* A little smaller than its box, so the shadow under it is not cut off. */
  transform: scale(.84);
  transform-origin: 50% 38%;
}`,
      },

      /*
        How these arrive.
      */
      {
        id: 'em-alarm',
        layerType: 'alert',
        applies: 'alert',
        kind: 'motion',
        name: 'Alarm',
        hint: 'The splash flashes red and the words slam in from big, like the meeting alarm. Pair it with Emergency meeting.',
        previewWith: 'em-alert',
        /*
          Only the panel and the words move, never the alert itself: the
          built-in exit is the alert's own animation, and taking it over
          would leave the alert on screen. The flash is two slow steps — well
          under the three a second a photosensitive viewer can be hurt by.
        */
        css: `:scope::before { animation: emFlash 1.2s steps(2, jump-none) 2; }
[data-alert="caption"] { animation: emSlam .45s cubic-bezier(.2,1.4,.4,1) backwards; }

@keyframes emFlash { 50% { filter: brightness(1.6); } }
@keyframes emSlam { from { transform: scale(2.2); opacity: 0; } }`,
      },
      {
        id: 'em-typed',
        layerType: 'alert',
        applies: 'alert',
        kind: 'motion',
        name: 'Typed out',
        hint: 'The line types itself out a letter at a time, the way the ejection line does. Pair it with Ejected.',
        previewWith: 'em-ejected',
        css: `:scope { --typing: 2s; /* How long it takes to type | 0.5-6 */ }

[data-alert="caption"] {
  animation: emType var(--typing) steps(30, end) .3s backwards;
}

@keyframes emType { from { clip-path: inset(0 100% 0 0); } to { clip-path: inset(0 0 0 0); } }`,
      },
      {
        id: 'em-bubble',
        layerType: 'chat',
        applies: 'chat',
        kind: 'motion',
        name: 'Bubble pop',
        hint: 'Each message pops in, a little too big and then settling, like a meeting-chat bubble.',
        previewWith: 'em-chat',
        css: `[data-chat="row"] {
  animation: emPop .32s cubic-bezier(.2,1.5,.4,1) backwards;
  transform-origin: left center;
}

@keyframes emPop { from { transform: scale(.6); opacity: 0; } }`,
      },
      {
        id: 'em-tallbar',
        layerType: 'omnibar',
        previewTall: true,
        name: 'Task strip, tall',
        hint: 'For a tall omnibar: the dark task strip with an outlined edge, the context in task-bar green, the goal as the green task bar and the totals in heavy white.',
        css: `:scope {
  --bar: #1b212be6; /* The bar */
  --label: #43d62c; /* The context and the goal */
  --ink: #ffffff; /* The words */
  --outline: #111111; /* The outlines */
}

[data-tallbar="bar"] {
  background: var(--omnibar-background, var(--bar)) !important;
  border-top: 3px solid var(--outline);
  font-family: 'Baloo 2', sans-serif;
}
[data-tallbar="context"] { background: var(--omnibar-accent, var(--label)); border-right: 3px solid var(--outline) !important; }
[data-tallbar="label"], [data-tallbar="sub"] { color: var(--outline) !important; font-weight: 800; }
[data-tallbar="title"] { color: var(--omnibar-text, var(--ink)) !important; font-weight: 800; }
[data-tallbar="goal-track"] { background: #3f4b59 !important; border: 2px solid var(--outline) !important; border-radius: 4px !important; }
[data-tallbar="goal-fill"] { background: linear-gradient(180deg, #7cf06a, var(--label) 45%, #2a9a18) !important; border-radius: 0 !important; }
[data-tallbar="goal-marker"] { background: var(--outline) !important; color: var(--label) !important; border: 2px solid var(--label) !important; }
[data-tallbar="chip"] { border-color: var(--outline) !important; border-radius: 8px !important; }
[data-tallbar="chip-value"] { background: var(--omnibar-accent, var(--label)) !important; color: var(--outline) !important; }
[data-tallbar="pinned-figure"] { color: var(--omnibar-text, var(--ink)) !important; font-weight: 800; text-shadow: 2px 2px 0 var(--outline); }
[data-tallbar="pinned-caption"] { color: #cfd8e3 !important; }`,
      },
      {
        id: 'em-frame',
        layerType: 'images',
        name: 'Tablet frame',
        hint: 'Each picture set in the meeting tablet: a thick dark frame with rounded corners and a hard outline, the picture rounded inside it.',
        css: `:scope {
  --frame: #1d2b3a; /* The frame */
  --line: #111111; /* The outlines */
  --thick: 5%; /* Frame thickness | 1-15 */
}

[data-images="frame"] {
  background: var(--frame);
  border-radius: 18px;
  box-shadow: 0 0 0 3px var(--line), 0 10px 26px rgba(0,0,0,.5);
}
[data-images="picture"] {
  left: var(--thick) !important;
  top: var(--thick) !important;
  width: calc(100% - 2 * var(--thick)) !important;
  height: calc(100% - 2 * var(--thick)) !important;
  border-radius: 10px;
}`,
      },
      {
        id: 'em-taskcard',
        layerType: 'runcard',
        name: 'Task card',
        hint: 'The game as a task card: a white card with a hard outline, the game heavy and dark, the platform softer and the category in a red chip.',
        css: `:scope {
  --card: #ffffff; /* The card */
  --ink: #111820; /* The game */
  --soft: #56626e; /* Platform and estimate */
  --chip: #c8102e; /* The category */
  --outline: #111111; /* The outlines */
}

[data-runcard="card"] {
  background: var(--card) !important;
  border: 3px solid var(--outline) !important;
  border-radius: 16px !important;
  box-shadow: 0 5px 0 rgba(0,0,0,.35);
  color: var(--ink) !important;
  font-family: 'Baloo 2', sans-serif;
}
[data-runcard="title"] { color: var(--ink) !important; font-weight: 800 !important; }
[data-runcard="machine"], [data-runcard="estimate"] { color: var(--soft) !important; opacity: 1 !important; font-weight: 700; }
[data-runcard="category"] {
  background: var(--runcard-accent, var(--chip)) !important;
  color: #ffffff !important;
  border: 2px solid var(--outline);
  border-radius: .5em;
  padding: 0 .5em;
  font-weight: 800;
}`,
      },
      {
        id: 'em-crew',
        layerType: 'roster',
        name: 'Crew seats',
        hint: 'Everybody on as crew cards: white with a hard outline, the role in a red tab, the name heavy and dark. A free seat stays as a grey card.',
        css: `:scope {
  --card: #ffffff; /* The card */
  --ink: #111820; /* The name */
  --tab: #c8102e; /* The role tab */
  --free: #8a97a3; /* A free seat */
  --outline: #111111; /* The outlines */
}

[data-roster="seat"] {
  background: var(--card) !important;
  border: 3px solid var(--outline);
  border-radius: 14px !important;
  box-shadow: 0 4px 0 rgba(0,0,0,.35);
  opacity: 1 !important;
  font-family: 'Baloo 2', sans-serif;
}
[data-roster="tab"] { background: var(--tab) !important; border-right: 3px solid var(--outline); }
[data-roster="role"] { color: #ffffff !important; }
[data-roster="name"] { color: var(--ink) !important; font-weight: 800 !important; }
[data-roster="pronouns"] { background: #eef3f7 !important; color: var(--ink) !important; border: 2px solid var(--outline); border-radius: .4em; }
[data-roster="seat"][data-roster-empty="yes"] { background: var(--free) !important; }
[data-roster="seat"][data-roster-empty="yes"] [data-roster="tab"] { display: none; }`,
      },
      {
        id: 'em-roundclock',
        layerType: 'stopwatch',
        name: 'Round clock',
        hint: 'The run timer in heavy outlined white digits, the way the lobby counts down. Held, it goes yellow; done, green.',
        css: `:scope {
  --ink: #ffffff; /* The digits */
  --outline: #111111; /* The outlines */
  --held: #f5f557; /* Held */
  --done: #43d62c; /* Done */
}

[data-stopwatch="clock"] { background: transparent !important; font-family: 'Baloo 2', sans-serif; }
[data-stopwatch="digits"] {
  color: var(--stopwatch-colour, var(--ink)) !important;
  font-weight: 800 !important;
  text-shadow:
    4px 4px 0 var(--outline), -2px -2px 0 var(--outline),
    2px -2px 0 var(--outline), -2px 2px 0 var(--outline);
}
[data-stopwatch-mode="idle"] [data-stopwatch="digits"] { opacity: .6; }
[data-stopwatch-mode="paused"] [data-stopwatch="digits"] { color: var(--stopwatch-colour, var(--held)) !important; }
[data-stopwatch-mode="finished"] [data-stopwatch="digits"] { color: var(--stopwatch-colour, var(--done)) !important; }`,
      },
      {
        id: 'em-avatar',
        layerType: 'avatar',
        name: 'Crewmate tablet',
        hint: 'The avatar on the meeting tablet: grey-blue with a thick dark frame, its text in the dark header. It hops while you talk, the way a crewmate does when they speak up.',
        previewConfig: { label: 'Speaking' },
        css: `@keyframes emAvatarHop { to { transform: translateY(-4%); } }

:scope {
  --tablet: #aebfd0; /* The tablet */
  --frame: #1d2b3a; /* The frame and header */
  --line: #111111; /* The outlines */
  --avatar-size: min(86cqw, 80cqh);
}

[data-avatar="frame"] {
  position: relative;
  background: var(--tablet);
  border: 8px solid var(--frame);
  border-radius: 22px;
  box-shadow: 0 0 0 3px var(--line);
  justify-content: flex-end !important;
  font-family: 'Baloo 2', sans-serif;
}
[data-avatar-talking="true"] [data-avatar="figure"] { animation: emAvatarHop .22s ease-in-out infinite alternate; }

[data-avatar="label"] {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  margin: 0 !important;
  padding: .1em .5em .2em;
  background: var(--frame);
  color: #ffffff !important;
  text-align: center;
  font-weight: 800 !important;
  font-size: min(6cqh, 8cqw) !important;
}`,
      },
      {
        id: 'em-pngtuber',
        layerType: 'pngtuber',
        name: 'Speaking up',
        hint: 'Your pictures with a hard black outline, hopping on the spot while you talk, the way a crewmate does in a meeting.',
        css: `@keyframes emPngHop { to { transform: translateY(-4%) scale(1.02); } }

:scope {
  --line: #111111; /* The outline */
  --thick: 4px; /* Outline thickness | 1-12 */
  --hop: 0.22s; /* One hop | 0.1-1 */
}

[data-pngtuber="picture"] {
  filter:
    drop-shadow(var(--thick) 0 0 var(--line)) drop-shadow(calc(0px - var(--thick)) 0 0 var(--line))
    drop-shadow(0 var(--thick) 0 var(--line)) drop-shadow(0 calc(0px - var(--thick)) 0 var(--line));
}
[data-pngtuber-talking="true"] [data-pngtuber="figure"] { animation: emPngHop var(--hop) ease-in-out infinite alternate; }`,
      },
      {
        id: 'em-taskrush',
        layerType: 'hypetrain',
        name: 'Task rush',
        hint: 'The Hype Train as the total task bar: a dark outlined panel, the title in outlined white, the level in a red chip and the bar filling green.',
        css: `@keyframes emRush { 50% { filter: brightness(1.5); } }

:scope {
  --panel: #1b212be6; /* The panel */
  --track: #3f4b59; /* The empty bar */
  --fill: #43d62c; /* The bar */
  --chip: #c8102e; /* The level */
  --outline: #111111; /* The outlines */
}

[data-hype="frame"] {
  background: var(--panel) !important;
  border: 3px solid var(--outline);
  border-radius: 14px !important;
  font-family: 'Baloo 2', sans-serif;
}
[data-hype="title"] { color: #ffffff; font-weight: 800; text-shadow: 2px 2px 0 var(--outline); }
[data-hype="level"] { background: var(--chip); color: #ffffff !important; border: 2px solid var(--outline); border-radius: .5em; padding: 0 .5em; font-weight: 800; }
[data-hype="track"] { background: var(--track) !important; border: 3px solid var(--outline); border-radius: 4px !important; }
[data-hype="fill"] { background: linear-gradient(180deg, #7cf06a, var(--fill) 45%, #2a9a18) !important; border-radius: 0 !important; }
[data-hype-levelup="true"] [data-hype="fill"] { animation: emRush 1s steps(2) 2; }`,
      },
      {
        id: 'em-newcrew',
        layerType: 'shoutout',
        name: 'New crewmate',
        hint: 'A shoutout as a new crewmate on board: a white card with a hard outline, the picture round in an outline, the title in a red chip and the name heavy and dark.',
        css: `:scope {
  --card: #ffffff; /* The card */
  --ink: #111820; /* The name */
  --soft: #56626e; /* The rest */
  --chip: #c8102e; /* The title */
  --outline: #111111; /* The outlines */
}

[data-shoutout="frame"] {
  background: var(--card) !important;
  border: 3px solid var(--outline);
  border-radius: 18px !important;
  box-shadow: 0 5px 0 rgba(0,0,0,.35);
  font-family: 'Baloo 2', sans-serif;
}
[data-shoutout="avatar"] { border: 3px solid var(--outline); }
[data-shoutout="title"] { align-self: flex-start; background: var(--chip); color: #ffffff; border: 2px solid var(--outline); border-radius: .5em; padding: 0 .5em; opacity: 1 !important; }
[data-shoutout="name"] { color: var(--ink) !important; font-weight: 800 !important; }
[data-shoutout="game"], [data-shoutout="link"], [data-shoutout="viewers"] { color: var(--soft); }`,
      },
      {
        id: 'em-ranking',
        layerType: 'leaderboard',
        name: 'Crew ranking',
        hint: 'The leaderboard on the meeting tablet: the title in the dark header, every person a white card with a hard outline, the level in a red chip and a green task bar for the way to the next.',
        css: `:scope {
  --tablet: #aebfd0; /* The tablet */
  --header: #1d2b3a; /* The header */
  --card: #eef3f7; /* Each person */
  --ink: #111820; /* The words */
  --chip: #c8102e; /* The level */
  --fill: #43d62c; /* The bar */
  --outline: #111111; /* The outlines */
}

[data-board="frame"] {
  background: var(--tablet) !important;
  border: .35em solid var(--header);
  border-radius: 1em !important;
  font-family: 'Baloo 2', sans-serif;
  color: var(--ink);
}
[data-board="title"] { background: var(--header); color: #ffffff !important; text-align: center; font-weight: 800; padding: .1em 0; }
[data-board="row"] { background: var(--card); border: 2px solid var(--outline); border-radius: .5em; padding-right: .5em; }
[data-board="place"] { font-weight: 800; opacity: 1 !important; }
[data-board="avatar"] { border: 2px solid var(--outline); }
[data-board="name"] { font-weight: 800; }
[data-board="level"] { background: var(--chip); color: #ffffff !important; border-radius: .4em; padding: 0 .4em; }
[data-board="track"] { background: #3f4b59 !important; border-radius: 2px !important; }
[data-board="fill"] { background: var(--fill) !important; border-radius: 0 !important; }`,
      },
      {
        id: 'em-draw',
        layerType: 'giveaway',
        name: 'Emergency draw',
        hint: 'A giveaway called like a meeting: a white card with a hard outline under the red striped alarm, the names running past on a dark screen in green, and the winner heavy and dark.',
        css: `:scope {
  --card: #ffffff; /* The card */
  --alarm: #c8102e; /* The alarm */
  --stripe: #7a0818; /* Its stripes */
  --screen: #1b212b; /* The screen */
  --green: #43d62c; /* The names */
  --ink: #111820; /* The words */
  --outline: #111111; /* The outlines */
}

[data-giveaway="frame"] {
  background: var(--card) !important;
  border: 3px solid var(--outline);
  border-radius: 18px !important;
  font-family: 'Baloo 2', sans-serif;
  color: var(--ink);
}
[data-giveaway="title"] {
  background: repeating-linear-gradient(-45deg, var(--alarm) 0 14px, var(--stripe) 14px 20px);
  color: #ffffff !important;
  border: 3px solid var(--outline);
  border-radius: .5em;
  padding: .1em .7em;
  font-weight: 800;
  text-shadow: 2px 2px 0 var(--outline);
}
[data-giveaway="prize"] { font-weight: 800; }
[data-giveaway="reel"] { background: var(--screen); color: var(--green) !important; border: 3px solid var(--outline); border-radius: .4em; padding: .1em .4em; }
[data-giveaway="avatar"] { border: 3px solid var(--outline); }
[data-giveaway="name"] { color: var(--ink) !important; font-weight: 800; }`,
      },
    ],
  };

export default look;
