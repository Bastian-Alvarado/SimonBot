/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The "Found Footage" theme: every look it has, for every kind of layer it dresses.
 * One of the themes in the Library (shared/looks/index.js lists them, in order).
 */

const look =
  {
    id: 'footage',
    name: 'Found Footage',
    hint: 'Horror as the tape it was found on, in two styles: the viewfinder of a camcorder — REC, the battery, a running tape counter, scanlines — and the feed of a security camera, with camera numbers and a clock. Case files, an evidence transcript and an EMF meter for the rest.',
    /*
      The overlay pretends to be the equipment. Two families share the
      theme, because found footage is shot on one or the other: the
      camcorder (Paranormal Activity, Blair Witch) and the security camera
      (the night-vision hallway, the timestamped feed). Pieces where the two
      would differ come in both; the rest — the case file, the transcript,
      the EMF meter, the tape deck — belong to the investigation either way.

      On-screen display text is VT323, the pixel face of a camcorder's OSD;
      paperwork is Special Elite, a worn typewriter. Night cards are set in
      a plain sans, as the films set theirs; what night it is is typed in,
      on the countdown's label or a text layer.

      The clocks that run on their own — the tape counter, the feed's
      timestamp — are CSS counters driven by registered integers, so they
      tick without the app: they count from when the overlay loaded, the
      way a tape counter counts from when it was reset. Blinking is once a
      second at most, far under anything that strobes.
    */
    objects: [
      {
        id: 'ff-viewfinder',
        layerType: 'shape',
        name: 'Camcorder viewfinder',
        hint: 'A hollow viewfinder to lay over your camera: corner marks, a blinking REC, the battery, scanlines, a darkened edge and a tape counter running in the corner.',
        css: `@property --ffs { syntax: "<integer>"; inherits: true; initial-value: 0; }
@property --ffm { syntax: "<integer>"; inherits: true; initial-value: 0; }
@keyframes ffSec { to { --ffs: 60; } }
@keyframes ffMin { to { --ffm: 60; } }
@keyframes ffBlink { 50% { opacity: 0; } }

:scope {
  --osd: #f4f4f4; /* The display */
  --rec: #ff2b2b; /* The REC light */
  --size: 34px; /* Display text | 12-90 */
  --scan: 0.16; /* Scanlines | 0-0.6 */
}

[data-shape="box"] {
  --g: linear-gradient(var(--osd), var(--osd));
  --a: 1.5em 3px;
  --b: 3px 1.5em;
  position: relative;
  font: 400 var(--size)/1 'VT323', monospace;
  color: var(--osd);
  text-shadow: 2px 2px 0 #0009;
  background:
    var(--g) .5em .5em / var(--a), var(--g) .5em .5em / var(--b),
    var(--g) right .5em top .5em / var(--a), var(--g) right .5em top .5em / var(--b),
    var(--g) left .5em bottom .5em / var(--a), var(--g) left .5em bottom .5em / var(--b),
    var(--g) right .5em bottom .5em / var(--a), var(--g) right .5em bottom .5em / var(--b),
    repeating-linear-gradient(90deg, var(--osd) 0 .32em, #0000 0 .44em) right 1.3em top 1.05em / 1.2em .3em,
    linear-gradient(#000a, #000a) right 1.2em top .95em / 1.4em .5em,
    var(--g) right 1.1em top .85em / 1.6em .7em,
    repeating-linear-gradient(rgba(0,0,0,var(--scan)) 0 1px, #0000 0 3px),
    radial-gradient(#0000 55%, #0008) !important;
  background-repeat: no-repeat !important;
  border-radius: 0 !important;
}

[data-shape="box"]::before {
  content: '● REC';
  position: absolute;
  left: 1.1em;
  top: .85em;
  color: var(--rec);
  animation: ffBlink 1s steps(1) infinite;
}

[data-shape="box"]::after {
  content: 'SP 0:' counter(ffm, decimal-leading-zero) ':' counter(ffs, decimal-leading-zero);
  counter-reset: ffm var(--ffm) ffs var(--ffs);
  animation: ffSec 60s steps(60) infinite, ffMin 3600s steps(60) infinite;
  position: absolute;
  right: 1.1em;
  bottom: .85em;
}`,
      },
      {
        id: 'ff-cctv',
        layerType: 'shape',
        name: 'Security feed',
        hint: 'A hollow security camera feed to lay over your camera: the camera number, a blinking record light, a running clock, heavy scanlines and a green tint.',
        css: `@property --ffs { syntax: "<integer>"; inherits: true; initial-value: 0; }
@property --ffm { syntax: "<integer>"; inherits: true; initial-value: 0; }
@property --ffh { syntax: "<integer>"; inherits: true; initial-value: 0; }
@property --ffdot { syntax: "<color>"; inherits: true; initial-value: #ff2b2b; }
@keyframes ffSec { to { --ffs: 60; } }
@keyframes ffMin { to { --ffm: 60; } }
@keyframes ffHour { to { --ffh: 24; } }
@keyframes ffRec { 50% { --ffdot: #0000; } }

:scope {
  --feed: #e6efe0; /* The lettering */
  --rec: #ff2b2b; /* The record light */
  --tint: #1e3a2426; /* Tint over the picture */
  --cam: 2; /* Camera number | 1-99 */
  --size: 30px; /* Lettering | 12-80 */
  --scan: 0.24; /* Scanlines | 0-0.6 */
}

[data-shape="box"] {
  counter-reset: cam var(--cam);
  position: relative;
  font: 400 var(--size)/1 'VT323', monospace;
  color: var(--feed);
  animation: ffRec 1s steps(1) infinite;
  background:
    radial-gradient(circle, var(--ffdot) 0 .24em, #0000 .27em) right .8em top .7em / .56em .56em no-repeat,
    repeating-linear-gradient(0deg, rgba(0,0,0,var(--scan)) 0 2px, #0000 2px 4px),
    linear-gradient(var(--tint), var(--tint)) !important;
  border: 2px solid #ffffff33 !important;
  border-radius: 0 !important;
}

[data-shape="box"]::before {
  content: 'CAM ' counter(cam, decimal-leading-zero);
  position: absolute;
  left: .7em;
  top: .6em;
  padding: .08em .35em;
  background: #0000008c;
  letter-spacing: .08em;
}

/* The feed's clock, since the overlay loaded. */
[data-shape="box"]::after {
  content: counter(ffh, decimal-leading-zero) ':' counter(ffm, decimal-leading-zero) ':' counter(ffs, decimal-leading-zero);
  counter-reset: ffh var(--ffh) ffm var(--ffm) ffs var(--ffs);
  animation: ffSec 60s steps(60) infinite, ffMin 3600s steps(60) infinite, ffHour 86400s steps(24) infinite;
  position: absolute;
  left: .7em;
  bottom: .6em;
  padding: .08em .35em;
  background: #0000008c;
  letter-spacing: .08em;
}`,
      },
      {
        id: 'ff-static',
        layerType: 'shape',
        name: 'Tape static',
        hint: 'Snow, with a tracking band rolling down through it. For a hold screen behind a Night card, or a camera that has lost its signal.',
        css: `@keyframes ffGrain {
  25% { background-position: 3px 5px, -4px 2px, 2px -3px; }
  50% { background-position: -2px 1px, 5px -4px, -3px 4px; }
  75% { background-position: 4px -2px, -1px 3px, 5px 1px; }
}
@keyframes ffBand { from { top: -20%; } to { top: 110%; } }

:scope {
  --ground: #0e0e10; /* Behind the snow */
  --grain: #ffffff; /* The snow */
  --amount: 0.32; /* How much snow | 0-1 */
  --band: 6s; /* One pass of the band | 2-30 */
}

[data-shape="box"] {
  position: relative;
  overflow: hidden;
  background: var(--ground) !important;
  border-radius: 0 !important;
}

[data-shape="box"]::after {
  content: '';
  position: absolute;
  inset: 0;
  opacity: var(--amount);
  background:
    repeating-radial-gradient(circle at 17% 32%, var(--grain) 0 1px, #0000 1px 3px) 0 0 / 7px 5px,
    repeating-radial-gradient(circle at 71% 60%, var(--grain) 0 1px, #0000 1px 4px) 0 0 / 11px 9px,
    repeating-radial-gradient(circle at 40% 80%, var(--grain) 0 1px, #0000 1px 2px) 0 0 / 5px 13px;
  animation: ffGrain .3s steps(1) infinite;
}

/* The tracking band: a soft bright stripe rolling down. */
[data-shape="box"]::before {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  height: 14%;
  z-index: 1;
  background: linear-gradient(#0000, #ffffff1f 40%, #ffffff38 50%, #ffffff1f 60%, #0000);
  animation: ffBand var(--band) linear infinite;
}`,
      },
      {
        id: 'ff-night-title',
        layerType: 'text',
        name: 'Night title',
        hint: 'Type "Night #13" and it reads like the title cards between nights: plain white on nothing, no outline. Put it on black for a hold screen.',
        css: `:scope {
  --ink: #f5f5f5; /* The words */
}

[data-text="words"] {
  font-family: Arial, Helvetica, sans-serif;
  font-weight: 400 !important;
  color: var(--ink);
  letter-spacing: .01em !important;
  text-transform: none;
  text-shadow: none;
}`,
      },
      {
        id: 'ff-osd',
        layerType: 'text',
        name: 'Camcorder text',
        hint: 'Any words as the camcorder shows them on screen: pixel capitals in white with a hard shadow. "PLAY ▶", a date, a name.',
        css: `:scope {
  --osd: #f4f4f4; /* The display */
  --shade: #000000a6; /* Its shadow */
}

[data-text="words"] {
  font-family: 'VT323', monospace;
  font-weight: 400 !important;
  color: var(--osd);
  text-transform: uppercase;
  letter-spacing: .06em !important;
  text-shadow: 2px 2px 0 var(--shade);
}`,
      },
      {
        id: 'ff-cam-tag',
        layerType: 'text',
        name: 'Camera label',
        hint: 'A security camera label: the words in a dark box, pixel capitals in the feed colour. "CAM 03 — HALLWAY".',
        css: `:scope {
  --feed: #e6efe0; /* The lettering */
  --ground: #0000009e; /* The box */
}

[data-text="words"] {
  width: auto !important;
  font-family: 'VT323', monospace;
  font-weight: 400 !important;
  color: var(--feed);
  text-transform: uppercase;
  letter-spacing: .08em !important;
  text-shadow: none;
  background: var(--ground);
  padding: .05em .4em;
}`,
      },
      {
        id: 'ff-stamp',
        layerType: 'text',
        name: 'Evidence stamp',
        hint: 'A rubber stamp on the case file: typewriter capitals in a double red border, knocked slightly askew. "EVIDENCE", "CASE CLOSED".',
        css: `:scope {
  --stamp: #c2281f; /* The ink */
  --tilt: 4deg; /* How askew | 0-15 */
}

[data-text="words"] {
  width: auto !important;
  font-family: 'Special Elite', monospace;
  font-weight: 400 !important;
  color: var(--stamp);
  text-transform: uppercase;
  letter-spacing: .12em !important;
  text-shadow: none;
  border: 3px double var(--stamp);
  padding: .05em .5em;
  transform: rotate(calc(var(--tilt) * -1));
  opacity: .88;
}`,
      },
      {
        id: 'ff-motion',
        layerType: 'alert',
        applies: 'alert',
        name: 'Motion detected',
        hint: 'The security system catching something: MOTION DETECTED and the camera number in red, blinking, over the alert in the feed lettering. The media goes black and white.',
        css: `@keyframes ffAlarm { 50% { opacity: .3; } }

:scope {
  --feed: #e6efe0; /* The lettering */
  --alarm: #ff2b2b; /* The alarm */
  --ground: #000000d9; /* The box */
  --cam: 2; /* Camera number | 1-99 */
}

:scope {
  counter-reset: cam var(--cam);
  background: var(--ground);
  border: 2px solid var(--alarm);
  padding: 16px 28px;
  font-family: 'VT323', monospace;
}

:scope::before {
  content: '▲ MOTION DETECTED — CAM ' counter(cam, decimal-leading-zero);
  display: block;
  margin-bottom: 8px;
  color: var(--alarm);
  font-size: 22px;
  letter-spacing: .1em;
  white-space: nowrap;
  animation: ffAlarm 1s steps(1) infinite;
}

[data-alert="caption"] {
  font-family: var(--alert-font, 'VT323', monospace) !important;
  color: var(--alert-text, var(--feed)) !important;
  text-transform: uppercase;
  letter-spacing: .05em;
  font-weight: 400;
  text-shadow: none !important;
}

[data-alert="name"] { color: var(--alert-name, var(--feed)) !important; }
[data-alert="media"] { border-radius: 0; filter: grayscale(1) contrast(1.2); }`,
      },
      {
        id: 'ff-rec-alert',
        layerType: 'alert',
        applies: 'alert',
        name: 'Camcorder alert',
        hint: 'The alert as the camcorder saw it: a blinking REC above pixel capitals with a hard shadow, on a dark band with scanlines.',
        css: `@keyframes ffAlarm { 50% { opacity: .3; } }

:scope {
  --osd: #f4f4f4; /* The display */
  --rec: #ff2b2b; /* The REC light */
  --band: #000000a6; /* The band behind */
}

:scope {
  background:
    repeating-linear-gradient(0deg, #00000040 0 1px, #0000 1px 3px),
    var(--band);
  padding: 14px 30px;
  font-family: 'VT323', monospace;
}

:scope::before {
  content: '● REC';
  display: block;
  color: var(--rec);
  font-size: 26px;
  letter-spacing: .12em;
  animation: ffAlarm 1s steps(1) infinite;
}

[data-alert="caption"] {
  font-family: var(--alert-font, 'VT323', monospace) !important;
  color: var(--alert-text, var(--osd)) !important;
  text-transform: uppercase;
  letter-spacing: .05em;
  font-weight: 400;
  text-shadow: 2px 2px 0 #000a !important;
}

[data-alert="name"] { color: var(--alert-name, var(--osd)) !important; }
[data-alert="media"] { border-radius: 0; filter: contrast(1.1) saturate(.7); }`,
      },
      {
        id: 'ff-transcript',
        layerType: 'chat',
        applies: 'chat',
        name: 'Evidence transcript',
        hint: 'Chat as a typed transcript of the evidence: each line in typewriter on a dark strip, times in pixel print, names in capitals, avatars in black and white.',
        css: `:scope {
  --ink: #e8e2d0; /* The words */
  --stamp: #9a978f; /* Times */
  --ground: #0b0b0cb3; /* Behind each line */
  --rule: #ffffff24; /* The margin rule */
}

[data-chat="row"] {
  background: var(--chat-row-bg, var(--ground)) !important;
  border-radius: var(--chat-row-radius, 0) !important;
  border-left: 2px solid var(--rule) !important;
  padding: var(--chat-row-padding, 5px 10px) !important;
  font-family: 'Special Elite', monospace;
}

[data-chat="time"] { font-family: 'VT323', monospace; color: var(--stamp) !important; }
[data-chat="user"] { text-transform: uppercase; letter-spacing: .06em !important; font-weight: var(--chat-user-weight, 400) !important; filter: saturate(.35); }
[data-chat="text"] { color: var(--chat-text, var(--ink)) !important; }
[data-chat="avatar"] { border-radius: 0 !important; filter: grayscale(1) contrast(1.15); }
[data-chat-rank="broadcaster"] [data-chat="user"] { text-decoration: underline; }
[data-chat="highlight"] { background: transparent !important; border: 0 !important; }`,
      },
      {
        id: 'ff-omnibar',
        layerType: 'omnibar',
        name: 'Tape deck bar',
        hint: 'The bar as a tape deck display: black with scanlines, each label a lit block with a red play mark, the rest in pixel print.',
        css: `:scope {
  --osd: #f4f4f4; /* The display */
  --ground: #0b0b0c; /* The bar */
  --rec: #ff2b2b; /* The play mark */
  --scan: 0.22; /* Scanlines | 0-0.6 */
}

[data-omnibar="bar"] {
  background: var(--omnibar-background,
    repeating-linear-gradient(0deg, rgba(0,0,0,var(--scan)) 0 1px, #0000 1px 3px),
    var(--ground)) !important;
  border-radius: 0 !important;
  border-top: 1px solid #ffffff26;
  font-family: 'VT323', monospace;
}

[data-omnibar-state="pinned"] { box-shadow: inset -1px 0 0 #ffffff26; }

[data-omnibar="label"] {
  background: var(--omnibar-accent, var(--osd));
  color: var(--ground) !important;
  padding: 0 .6em;
  letter-spacing: .12em;
}

[data-omnibar="label"]::before { content: '▶ '; color: var(--rec); }

[data-omnibar="value"] {
  color: var(--omnibar-text, var(--osd)) !important;
  letter-spacing: .06em;
  text-shadow: 2px 2px 0 #0009;
}`,
      },
      {
        id: 'ff-tallbar',
        layerType: 'omnibar',
        previewTall: true,
        name: 'Tape deck tall bar',
        hint: 'For a tall omnibar: the deck display in pixel print, the goal as a tape running from one reel to the other, and the totals lit white.',
        css: `:scope {
  --osd: #f4f4f4; /* The display */
  --ground: #0b0b0c; /* The bar */
  --rec: #ff2b2b; /* The play mark */
  --line: #ffffff2e; /* Hairlines */
}

[data-tallbar="bar"] {
  background: var(--omnibar-background,
    repeating-linear-gradient(0deg, #00000038 0 1px, #0000 1px 3px),
    var(--ground)) !important;
  border-top: 1px solid var(--line);
  font-family: 'VT323', monospace;
}

[data-tallbar="context"] { background: var(--omnibar-accent, var(--osd)); border-right: 0 !important; }
[data-tallbar="label"], [data-tallbar="sub"] { color: var(--ground) !important; letter-spacing: .1em; }
[data-tallbar="label"]::before { content: '▶ '; color: var(--rec); }

[data-tallbar="goal-track"] {
  background: #ffffff14 !important;
  border: 1px solid var(--line) !important;
  border-radius: 0 !important;
}
[data-tallbar="goal-fill"] { background: var(--omnibar-accent, var(--osd)) !important; border-radius: 0 !important; }
[data-tallbar="goal-marker"] {
  background: var(--ground) !important;
  color: var(--omnibar-accent, var(--osd)) !important;
  border: 1px solid var(--omnibar-accent, var(--osd)) !important;
}

[data-tallbar="chip"] { border-color: var(--line) !important; border-radius: 0 !important; }
[data-tallbar="chip-value"] { background: var(--omnibar-accent, var(--osd)) !important; color: var(--ground) !important; }

[data-tallbar="pinned"] { border-left: 1px solid var(--line) !important; }
[data-tallbar="pinned-figure"] { color: var(--omnibar-text, var(--osd)) !important; }
[data-tallbar="pinned-caption"] { color: #ffffffa6 !important; }`,
      },
      {
        id: 'ff-night-card',
        layerType: 'countdown',
        name: 'Night card',
        hint: 'The card between nights: type "Night #13" as the countdown label and it is the big line, plain white on black, with the time left under it fast-forwarding in pixel print.',
        css: `@keyframes ffFwd { 50% { opacity: .35; } }

:scope {
  --ink: #f5f5f5; /* The night */
  --osd: #f4f4f4; /* The time */
  --ground: #000000; /* The card */
  --title: 3.2; /* Night size | 1-6 */
  --timer: 0.42; /* Time size | 0.2-1 */
}

:scope { background: var(--ground); }

[data-countdown="clock"] { background: transparent !important; gap: .15em !important; }

[data-countdown="label"] {
  zoom: var(--title);
  font-family: Arial, Helvetica, sans-serif;
  font-weight: 400 !important;
  text-transform: none !important;
  letter-spacing: .01em !important;
  color: var(--countdown-label, var(--ink)) !important;
}

[data-countdown="digits"] {
  zoom: var(--timer);
  font-family: 'VT323', monospace !important;
  font-weight: 400 !important;
  color: var(--countdown-text, var(--osd)) !important;
  letter-spacing: .04em;
}

/* Fast-forward, blinking slowly while it runs. */
[data-countdown="digits"]::before {
  content: '►► ';
  animation: ffFwd 1s steps(1) infinite;
}

[data-countdown="paused"] {
  font-family: 'VT323', monospace;
  color: var(--countdown-label, var(--osd)) !important;
  letter-spacing: .14em;
}`,
      },
      {
        id: 'ff-standby',
        layerType: 'countdown',
        name: 'Standby feed',
        hint: 'The countdown as a security feed on standby: the label in a camera box, the time left as the feed clock, tinted and scanlined.',
        css: `:scope {
  --feed: #e6efe0; /* The lettering */
  --ground: #0a120c; /* The feed */
  --scan: 0.3; /* Scanlines | 0-0.6 */
}

:scope {
  background:
    repeating-linear-gradient(0deg, rgba(0,0,0,var(--scan)) 0 2px, #0000 2px 4px),
    var(--ground);
  border: 2px solid #ffffff2e;
}

[data-countdown="clock"] { background: transparent !important; gap: .3em !important; }

[data-countdown="label"] {
  font-family: 'VT323', monospace;
  font-weight: 400 !important;
  color: var(--countdown-label, var(--feed)) !important;
  letter-spacing: .14em !important;
  background: #0000008c;
  padding: .05em .5em;
}

[data-countdown="digits"] {
  font-family: 'VT323', monospace !important;
  font-weight: 400 !important;
  color: var(--countdown-text, var(--feed)) !important;
  letter-spacing: .06em;
}

[data-countdown="paused"] { font-family: 'VT323', monospace; color: var(--countdown-label, var(--feed)) !important; letter-spacing: .14em; }`,
      },
      {
        id: 'ff-counter',
        layerType: 'stopwatch',
        name: 'Tape counter',
        hint: 'The run timer as a tape counter: pixel digits after SP, a pause mark while it is held, END when it is done.',
        css: `:scope {
  --osd: #f4f4f4; /* The display */
  --held: #8a8a8a; /* Held */
  --ground: #000000b3; /* Behind it */
}

:scope { background: var(--ground); }

[data-stopwatch="clock"] { background: transparent !important; }

[data-stopwatch="digits"] {
  font-family: 'VT323', monospace !important;
  font-weight: 400 !important;
  color: var(--stopwatch-colour, var(--osd)) !important;
  letter-spacing: .04em;
  text-shadow: 3px 3px 0 #0009;
}

[data-stopwatch="digits"]::before { content: 'SP '; font-size: .45em; letter-spacing: .1em; }
[data-stopwatch-mode="idle"] [data-stopwatch="digits"] { opacity: .45; }
[data-stopwatch-mode="paused"] [data-stopwatch="digits"] { color: var(--stopwatch-colour, var(--held)) !important; }
[data-stopwatch-mode="paused"] [data-stopwatch="digits"]::before { content: '❚❚ '; }
[data-stopwatch-mode="finished"] [data-stopwatch="digits"]::before { content: 'END '; }`,
      },
      {
        id: 'ff-viewers',
        layerType: 'viewers',
        name: 'Watching',
        hint: 'The viewer count as a camcorder readout: a red light and the number in pixel print.',
        css: `:scope {
  --osd: #f4f4f4; /* The display */
  --rec: #ff2b2b; /* The light */
  --ground: #000000a6; /* Behind it */
}

[data-viewers="box"] {
  background: var(--viewers-background, var(--ground)) !important;
  border-radius: 0 !important;
  padding: .2em .6em !important;
  gap: .5em !important;
  align-items: center !important;
}

[data-viewers="row"] { gap: .4em !important; align-items: center !important; }
[data-viewers="icon"] { color: var(--viewers-accent, var(--rec)) !important; }

[data-viewers="count"] {
  color: var(--viewers-text, var(--osd)) !important;
  font-family: 'VT323', monospace;
  font-size: 1.3em;
  letter-spacing: .06em;
}`,
      },
      {
        id: 'ff-interview',
        layerType: 'nameplate',
        name: 'Interview caption',
        hint: 'A documentary caption from the camcorder tapes: the name in typewriter on a dark strip, the second line in pixel print under it.',
        css: `:scope {
  --ink: #f2efe6; /* The name */
  --osd: #c9c9c9; /* The second line */
  --ground: #000000b8; /* The strip */
}

[data-nameplate="plate"] {
  background: var(--nameplate-background, var(--ground)) !important;
  border: 0 !important;
  border-left: 3px solid var(--nameplate-accent, var(--ink)) !important;
  border-radius: 0 !important;
  font-family: 'Special Elite', monospace;
}

[data-nameplate="name"] {
  color: var(--nameplate-text, var(--ink)) !important;
  font-weight: 400 !important;
  letter-spacing: .03em !important;
}

[data-nameplate="subtitle"] {
  color: var(--nameplate-accent, var(--osd)) !important;
  font-family: 'VT323', monospace;
  text-transform: uppercase;
  letter-spacing: .12em;
  opacity: 1 !important;
}`,
      },
      {
        id: 'ff-subject',
        layerType: 'nameplate',
        name: 'Subject tag',
        hint: 'A name as the security system tags a subject: the second line above as the tag, the name in the feed lettering, boxed.',
        css: `:scope {
  --feed: #e6efe0; /* The lettering */
  --ground: #000000b3; /* The box */
  --line: #e6efe066; /* The box edge */
}

[data-nameplate="plate"] {
  background: var(--nameplate-background, var(--ground)) !important;
  border: 1px solid var(--line) !important;
  border-radius: 0 !important;
  flex-direction: column-reverse !important;
  font-family: 'VT323', monospace;
}

[data-nameplate="name"] {
  color: var(--nameplate-text, var(--feed)) !important;
  text-transform: uppercase;
  font-weight: 400 !important;
  letter-spacing: .08em !important;
}

[data-nameplate="subtitle"] {
  color: var(--nameplate-accent, var(--feed)) !important;
  text-transform: uppercase;
  letter-spacing: .16em;
  opacity: .7 !important;
}`,
      },
      {
        id: 'ff-casefile',
        layerType: 'runcard',
        name: 'Case file',
        hint: 'The run as a case file: the game typed in capitals, the platform and year in pixel print, the category stamped in red.',
        css: `:scope {
  --paper: #1a1814; /* The file */
  --ink: #e8e2d0; /* The typing */
  --stamp: #c2281f; /* The stamp */
  --line: #e8e2d033; /* The edge */
}

[data-runcard="card"] {
  background: var(--paper) !important;
  border: 1px solid var(--line) !important;
  border-radius: 2px !important;
  font-family: 'Special Elite', monospace;
  color: var(--ink) !important;
}

[data-runcard="title"] {
  color: var(--ink) !important;
  text-transform: uppercase;
  font-weight: 400 !important;
  letter-spacing: .04em;
}

[data-runcard="machine"] { font-family: 'VT323', monospace; letter-spacing: .1em; opacity: .7 !important; }
[data-runcard="details"] { gap: .6em !important; }

[data-runcard="category"] {
  display: inline-block;
  background: transparent !important;
  color: var(--runcard-accent, var(--stamp)) !important;
  border: 2px solid var(--stamp);
  padding: 0 .4em;
  transform: rotate(-3deg);
  text-transform: uppercase;
  letter-spacing: .08em;
}

[data-runcard="estimate"] { font-family: 'VT323', monospace; letter-spacing: .08em; }`,
      },
      {
        id: 'ff-investigators',
        layerType: 'roster',
        name: 'Investigators',
        hint: 'The commentators as the investigation team: each seat an ID card, the role typed on its tab, the name in typewriter, the pronouns in pixel print. A free seat keeps its card, faded.',
        css: `:scope {
  --paper: #1a1814; /* The card */
  --ink: #e8e2d0; /* The typing */
  --tab: #e8e2d0; /* The role tab */
  --on-tab: #1a1814; /* The role */
  --line: #e8e2d033; /* The edge */
}

[data-roster="seat"] {
  background: var(--paper) !important;
  border-radius: 2px !important;
  box-shadow: inset 0 0 0 1px var(--line);
  opacity: 1 !important;
  font-family: 'Special Elite', monospace;
}

[data-roster="tab"] { background: var(--tab) !important; }
[data-roster="role"] { color: var(--on-tab) !important; letter-spacing: .1em; }
[data-roster="name"] { color: var(--ink) !important; font-weight: 400 !important; letter-spacing: .03em; }

[data-roster="pronouns"] {
  background: transparent !important;
  color: var(--ink) !important;
  font-family: 'VT323', monospace;
  letter-spacing: .12em;
  text-transform: uppercase;
  opacity: .75;
}

[data-roster="seat"][data-roster-empty="yes"] [data-roster="tab"] { display: none; }
[data-roster="seat"][data-roster-empty="yes"] [data-roster="name"] { color: #e8e2d059 !important; }`,
      },
      {
        id: 'ff-feeds',
        layerType: 'voice',
        name: 'Security feeds',
        hint: 'The Discord call as a wall of security cameras: everybody their own feed in night vision, numbered, with their name along the bottom in the feed lettering and a red light on while they talk.',
        /*
          A camera does not hop, so the feed stays put and only the light and
          the picture say who is talking: quiet feeds sit dim, a talking one
          comes up to full brightness with its light on. Numbering starts at
          2, since camera 1 is usually the stream's own; each feed after the
          first counts one on. The lettering is the layer's text colour.
        */
        css: `:scope {
  --talk: #ff2b2b; /* The light while talking */
  --screen: #0b120d; /* Behind the picture */
  --night: 0.85; /* Night vision | 0-1 */
  --first: 2; /* First camera number | 1-99 */
  --scan: 0.24; /* Scanlines | 0-0.6 */
}

[data-voice="list"] { counter-reset: ffcam var(--first); }
[data-voice="member"] + [data-voice="member"] { counter-increment: ffcam; }
[data-voice="member"] { --w: min(94cqw, 118cqh); --lit: brightness(.72); --fade: .18s ease-out; }
[data-voice-speaking="true"] { --lit: brightness(1.05); --fade: 30ms linear; --tally: var(--voice-glow, var(--talk)); }

[data-voice="frame"] {
  width: var(--w) !important;
  aspect-ratio: 4 / 3 !important;
  box-sizing: border-box;
  overflow: hidden;
  background: var(--screen);
  border: 2px solid var(--tally, #ffffff33);
  font: 400 max(10px, calc(var(--w) * .075))/1 'VT323', monospace;
  animation: none !important;
  transition: border-color var(--fade);
}

[data-voice="avatar"],
[data-voice="picture"] {
  border-radius: 0 !important;
  box-shadow: none !important;
  filter: grayscale(var(--night)) sepia(calc(var(--night) * .6)) hue-rotate(calc(var(--night) * 70deg)) contrast(1.15) var(--lit);
  transition: filter var(--fade) !important;
}

[data-voice="frame"]::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 1;
  background:
    radial-gradient(circle, var(--tally, #0000) 0 .22em, #0000 .25em) right .45em top .4em / .5em .5em no-repeat,
    repeating-linear-gradient(rgba(0,0,0,var(--scan)) 0 2px, #0000 2px 4px),
    radial-gradient(#0000 55%, #000a);
}

[data-voice="frame"]::after,
[data-voice="status"] {
  position: absolute;
  z-index: 2;
  top: .4em;
  background: #0000008c !important;
}

[data-voice="frame"]::after {
  content: 'CAM ' counter(ffcam, decimal-leading-zero);
  left: .45em;
  padding: .06em .3em;
  letter-spacing: .08em;
}

[data-voice="status"] {
  right: .4em;
  bottom: auto;
  width: 1.2em !important;
  height: 1.2em !important;
  border: 0 !important;
  border-radius: 0 !important;
  color: var(--talk) !important;
}

[data-voice="name"] {
  position: relative;
  z-index: 2;
  box-sizing: border-box;
  width: var(--w) !important;
  margin-top: calc(-1.7em - 2px) !important;
  padding: .35em .5em !important;
  font: 400 max(10px, calc(var(--w) * .075))/1 'VT323', monospace !important;
  letter-spacing: .08em;
  text-transform: uppercase;
  background: linear-gradient(#0000, #000c);
}`,
      },
      {
        id: 'ff-emf',
        layerType: 'goal',
        name: 'EMF meter',
        hint: 'The goal as an EMF meter: a row of LEDs that light green, then amber, then red as it climbs — the colours stay where they are on the meter as it fills.',
        css: `:scope {
  --low: #3ddc56; /* Low */
  --mid: #ffc53d; /* Rising */
  --high: #ff3b30; /* Spiking */
  --off: #ffffff1f; /* Unlit */
  --ink: #f4f4f4; /* The words */
  --size: 16px; /* Size | 10-60 */
  font-size: var(--size);
}

[data-goal="track"] {
  height: .9em !important;
  background: repeating-linear-gradient(90deg, var(--goal-track, var(--off)) 0 calc(10% - 3px), #0000 calc(10% - 3px) 10%) !important;
  border-radius: 0 !important;
}

/* The lit LEDs: the whole meter's colours and cells, sized to the track and cut off where the fill ends. */
[data-goal="fill"] {
  --span: calc(100% * 100 / var(--goal-pct, 100));
  background: var(--goal-bar, linear-gradient(90deg, var(--low) 0 50%, var(--mid) 50% 80%, var(--high) 80%) 0 0 / var(--span) 100% no-repeat) !important;
  -webkit-mask: repeating-linear-gradient(90deg, #000 0 calc(10% - 3px), #0000 calc(10% - 3px) 10%) 0 0 / var(--span) 100%;
  mask: repeating-linear-gradient(90deg, #000 0 calc(10% - 3px), #0000 calc(10% - 3px) 10%) 0 0 / var(--span) 100%;
  border-radius: 0 !important;
}

[data-goal="label"] {
  color: var(--goal-text, var(--ink)) !important;
  font-family: 'VT323', monospace;
  letter-spacing: .14em !important;
}

[data-goal="numbers"] { color: var(--goal-text, var(--ink)) !important; font-family: 'VT323', monospace; letter-spacing: .06em; }
[data-goal="percent"] { color: var(--goal-text, var(--ink)) !important; font-family: 'VT323', monospace; opacity: 1 !important; }`,
      },
      {
        id: 'ff-tapedeck',
        layerType: 'spotify',
        name: 'Tape deck',
        hint: 'What is playing as a tape in a deck: pixel print on black with scanlines, the cover washed out, the progress as tape running between the reels.',
        css: `:scope {
  --osd: #f4f4f4; /* The display */
  --ground: #0b0b0ce6; /* The deck */
  --rec: #ff2b2b; /* The play mark */
  --line: #ffffff2e; /* Hairlines */
}

[data-spotify="player"] {
  background:
    repeating-linear-gradient(0deg, #00000038 0 1px, #0000 1px 3px),
    var(--ground);
  box-shadow: inset 0 0 0 1px var(--line);
  padding: 12px 14px;
  font-family: 'VT323', monospace;
}

[data-spotify="label"] { color: var(--osd); letter-spacing: .14em; opacity: 1; }
[data-spotify="label"]::before { content: '▶ '; color: var(--rec); }
[data-spotify="art"] { border-radius: 0; filter: grayscale(.5) sepia(.25) contrast(1.1); }
[data-spotify="title"] { color: var(--osd); text-transform: uppercase; letter-spacing: .04em; }
[data-spotify="artist"], [data-spotify="album"] { color: #c9c9c9; }

[data-spotify="progress"] { background: #ffffff1a; border-radius: 0; }
[data-spotify="fill"] { background: var(--osd); border-radius: 0; }`,
      },
      {
        id: 'ff-caselog',
        layerType: 'plan',
        name: 'Case log',
        hint: 'The stream plan as the case log: typed lines, the one underway marked with a red play mark, the ones done struck through.',
        css: `:scope {
  --ink: #e8e2d0; /* The typing */
  --rec: #ff2b2b; /* The mark */
}

[data-plan="list"] {
  background: transparent !important;
  border-radius: 0 !important;
  font-family: 'Special Elite', monospace;
}

[data-plan="title"] {
  color: var(--ink) !important;
  font-family: 'VT323', monospace;
  letter-spacing: .18em !important;
}

[data-plan="mark"] { border-radius: 0 !important; background: #e8e2d040 !important; }
[data-plan-state="now"] [data-plan="mark"] { background: var(--rec) !important; }

[data-plan="text"] { color: var(--ink) !important; }
[data-plan-state="now"] [data-plan="text"] { opacity: 1 !important; text-transform: uppercase; }
[data-plan-state="done"] [data-plan="text"] { opacity: .4 !important; text-decoration: line-through; }

[data-plan="note"] { font-family: 'VT323', monospace; opacity: .6; }`,
      },
      {
        id: 'ff-note',
        layerType: 'question',
        name: 'Evidence note',
        hint: 'A question as a note pinned to the evidence board: typed on a dark card, the label stamped in red, who asked in pixel print.',
        css: `:scope {
  --paper: #1a1814e6; /* The card */
  --ink: #e8e2d0; /* The typing */
  --stamp: #c2281f; /* The stamp */
  --line: #e8e2d033; /* The edge */
}

[data-question="card"] {
  background: var(--paper) !important;
  border: 1px solid var(--line) !important;
  border-radius: 2px !important;
  font-family: 'Special Elite', monospace;
}

[data-question="label"] {
  display: inline-block;
  color: var(--stamp) !important;
  border: 2px solid var(--stamp);
  padding: 0 .4em;
  transform: rotate(-3deg);
  letter-spacing: .12em !important;
}

[data-question="asker"] { font-family: 'VT323', monospace; color: var(--ink) !important; opacity: .7 !important; }
[data-question="text"] { color: var(--ink) !important; font-weight: 400; }`,
      },
      {
        id: 'ff-polaroid',
        layerType: 'images',
        name: 'Polaroid',
        hint: 'Each picture as an instant photo from the case: a worn white border, deeper at the bottom, and the picture faded and warm.',
        css: `:scope {
  --border: #ece7da; /* The border */
  --side: 5%; /* Border | 2-15 */
  --foot: 18%; /* Bottom border | 5-35 */
}

[data-images="frame"] {
  background: var(--border);
  box-shadow: 0 10px 30px #0009;
}

[data-images="picture"] {
  left: var(--side) !important;
  top: var(--side) !important;
  width: calc(100% - 2 * var(--side)) !important;
  height: calc(100% - var(--side) - var(--foot)) !important;
  filter: sepia(.3) contrast(.95) saturate(.8);
}`,
      },
      {
        id: 'ff-still',
        layerType: 'images',
        name: 'Camera still',
        hint: 'Each picture as a still pulled from a security camera: black and white, scanlined, with the feed lettering in the corner.',
        css: `:scope {
  --feed: #e6efe0; /* The lettering */
  --cam: 3; /* Camera number | 1-99 */
  --scan: 0.3; /* Scanlines | 0-0.6 */
}

[data-images="frame"] {
  counter-reset: cam var(--cam);
  background: #000;
  border: 2px solid #ffffff33;
}

[data-images="picture"] { filter: grayscale(1) contrast(1.25) brightness(.9); }

/* Scanlines over the picture, and the camera in the corner. */
[data-images="frame"]::after {
  content: 'CAM ' counter(cam, decimal-leading-zero);
  position: absolute;
  inset: 0;
  padding: .4em .6em;
  font: 400 24px/1 'VT323', monospace;
  color: var(--feed);
  letter-spacing: .08em;
  background: repeating-linear-gradient(0deg, rgba(0,0,0,var(--scan)) 0 2px, #0000 2px 4px);
  pointer-events: none;
}`,
      },
      {
        id: 'ff-tracking',
        layerType: 'alert',
        applies: 'alert',
        kind: 'motion',
        previewWith: 'ff-rec-alert',
        name: 'Tracking glitch',
        hint: 'The alert comes in the way a bad tape does: the words torn into bands and skewed, jumping into place as the tracking catches. Leaves the built-in exit alone.',
        css: `[data-alert="caption"] { animation: ffTrack .7s steps(7, end) backwards; }

@keyframes ffTrack {
  0% { opacity: 0; transform: translateX(-6%) skewX(14deg); clip-path: inset(40% 0 42% 0); }
  25% { opacity: 1; transform: translateX(5%) skewX(-10deg); clip-path: inset(8% 0 55% 0); }
  55% { transform: translateX(-2%) skewX(5deg); clip-path: inset(0 0 22% 0); }
  80% { transform: translateX(1%); clip-path: inset(0); }
  100% { transform: none; clip-path: inset(0); }
}`,
      },
      {
        id: 'ff-tear',
        layerType: 'chat',
        applies: 'chat',
        kind: 'motion',
        previewWith: 'ff-transcript',
        name: 'Tape tear',
        hint: 'Each new message tears in sideways and snaps straight, like a line of tape catching. Applying it turns the chat theme to Custom.',
        css: `[data-chat="row"] { animation: ffTear .35s steps(4, end) backwards; }

@keyframes ffTear {
  0% { opacity: 0; transform: translateX(-8%); clip-path: inset(0 0 60% 0); }
  50% { opacity: 1; transform: translateX(4%); clip-path: inset(30% 0 0 0); }
  100% { transform: none; clip-path: inset(0); }
}`,
      },
      {
        id: 'ff-rewind',
        layerType: 'nameplate',
        kind: 'motion',
        previewWith: 'ff-interview',
        name: 'Rewind in',
        hint: 'The caption rewinds into place: it streaks in from the side, blurred and jittering, and settles. Replays when the name changes.',
        css: `[data-nameplate="plate"] { animation: ffRewind .6s steps(6, end) backwards; }

@keyframes ffRewind {
  0% { opacity: 0; transform: translateX(30%) skewX(-12deg); filter: blur(6px); }
  40% { opacity: 1; transform: translateX(-4%) skewX(6deg); filter: blur(3px); }
  70% { transform: translateX(2%); filter: blur(1px); }
  100% { transform: none; filter: none; }
}`,
      },
      {
        id: 'ff-flicker',
        layerType: 'question',
        kind: 'motion',
        previewWith: 'ff-note',
        name: 'Failing light',
        hint: 'The card comes on like a failing bulb: two dim flickers, then steady. Slow enough to be safe — never more than a couple of flashes. Replays for every question.',
        css: `[data-question="card"] { animation: ffFlicker 1s linear backwards; }

@keyframes ffFlicker {
  0% { opacity: 0; }
  15% { opacity: .75; }
  30% { opacity: .15; }
  55% { opacity: .9; }
  70% { opacity: .35; }
  100% { opacity: 1; }
}`,
      },
      {
        id: 'ff-subjects',
        layerType: 'players',
        name: 'Subjects',
        hint: 'The players as the list of subjects in the case file: typed on dark paper, a square of each one\'s colour, and anyone out stamped in red.',
        css: `:scope {
  --paper: #1a1814; /* The file */
  --ink: #e8e2d0; /* The typing */
  --stamp: #c2281f; /* The stamp */
  --line: #e8e2d033; /* The rules */
}

[data-players="list"] {
  background: var(--players-background, var(--paper)) !important;
  border: 1px solid var(--line);
  border-radius: 2px !important;
  color: var(--players-text, var(--ink)) !important;
  font-family: 'Special Elite', monospace;
}
[data-players="title"] { font-family: 'VT323', monospace; letter-spacing: .18em !important; }
[data-players="row"] { background: transparent !important; border-radius: 0 !important; border-bottom: 1px solid var(--line); }
[data-players="dot"] { border-radius: 0 !important; filter: saturate(.6); }
[data-players="name"] { font-weight: 400 !important; text-transform: uppercase; }
[data-players-state="out"], [data-players-state="ejected"], [data-players-state="dead"] { opacity: 1 !important; }
[data-players-state] [data-players="name"] { text-decoration: none !important; }
[data-players-state="out"] [data-players="name"], [data-players-state="ejected"] [data-players="name"], [data-players-state="dead"] [data-players="name"] { opacity: .5; }
[data-players="state"] { color: var(--stamp); border: .14em solid var(--stamp); padding: 0 .25em; transform: rotate(-6deg); font-family: 'VT323', monospace; letter-spacing: .1em; }`,
      },
      {
        id: 'ff-witness',
        layerType: 'poll',
        name: 'Witness vote',
        hint: 'The poll as a witness sheet: typed on dark paper, each answer ruled off and filled in red as votes come in, the numbers in pixel print, the winner circled in red when it closes.',
        css: `:scope {
  --paper: #1a1814; /* The sheet */
  --ink: #e8e2d0; /* The typing */
  --stamp: #c2281f; /* The red */
  --line: #e8e2d033; /* The rules */
}

[data-poll="card"] {
  background: var(--poll-background, var(--paper)) !important;
  border: 1px solid var(--line);
  border-radius: 2px !important;
  color: var(--poll-text, var(--ink)) !important;
  font-family: 'Special Elite', monospace;
}
[data-poll="question"] { font-weight: 400 !important; }
[data-poll="option"] { background: transparent !important; border-radius: 0 !important; border-bottom: 1px solid var(--line); }
[data-poll="fill"] { background: var(--poll-bar, var(--stamp)) !important; opacity: .3 !important; }
[data-poll="number"], [data-poll="percent"], [data-poll="votes"], [data-poll="timer"] { font-family: 'VT323', monospace; letter-spacing: .06em; }
[data-poll="label"] { font-weight: 400 !important; }
[data-poll-winner="true"] { box-shadow: inset 0 0 0 2px var(--stamp); border-radius: 40% / 50% !important; }`,
      },
      {
        id: 'ff-nightvision',
        layerType: 'avatar',
        name: 'Night vision',
        hint: 'The avatar as a security camera sees it: green night vision, scanlines, the camera number in the corner and a record light that blinks once a second while you talk. Its text is the camera label.',
        previewConfig: { label: 'Hallway' },
        css: `@keyframes ffBlink { 50% { opacity: 0; } }

:scope {
  --feed: #e6efe0; /* The lettering */
  --rec: #ff2b2b; /* The record light */
  --screen: #0b120d; /* Behind the avatar */
  --cam: 1; /* Camera number | 1-99 */
  --scan: 0.24; /* Scanlines | 0-0.6 */
  --avatar-size: min(92cqw, 92cqh);
}

[data-avatar="frame"] {
  counter-reset: cam var(--cam);
  position: relative;
  background: var(--screen);
  border: 2px solid #ffffff33;
  justify-content: flex-end !important;
  color: var(--feed);
}
[data-avatar="svg"] { filter: grayscale(.85) sepia(.5) hue-rotate(70deg) contrast(1.15) brightness(.85); }

[data-avatar="frame"]::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  background: repeating-linear-gradient(rgba(0,0,0,var(--scan)) 0 2px, #0000 2px 4px), radial-gradient(#0000 55%, #000a);
}
[data-avatar="frame"]::after {
  content: 'CAM ' counter(cam, decimal-leading-zero);
  position: absolute;
  z-index: 2;
  top: .5em;
  right: .6em;
  font: 400 max(10px, 6cqh)/1 'VT323', monospace;
  padding: .05em .3em;
  background: #0000008c;
  letter-spacing: .08em;
}
[data-avatar-talking="true"]::after { content: '● CAM ' counter(cam, decimal-leading-zero); color: var(--rec); animation: ffBlink 1s steps(1) infinite; }

[data-avatar="label"] {
  position: absolute;
  z-index: 2;
  left: .6em;
  top: .5em;
  margin: 0 !important;
  padding: .05em .3em;
  background: #0000008c;
  color: var(--feed) !important;
  text-transform: uppercase;
  letter-spacing: .08em !important;
  font: 400 max(10px, 6cqh)/1 'VT323', monospace !important;
}`,
      },
      {
        id: 'ff-oncamera',
        layerType: 'pngtuber',
        name: 'On tape',
        hint: 'Your pictures as if caught on the camcorder: washed out and warm, with a hard shadow, and REC blinking in the corner once a second while you talk.',
        css: `@keyframes ffBlink { 50% { opacity: 0; } }

:scope {
  --osd: #f4f4f4; /* The display */
  --rec: #ff2b2b; /* The REC light */
}

[data-pngtuber="frame"] { position: relative; }
[data-pngtuber="picture"] { filter: sepia(.35) contrast(1.1) saturate(.8) drop-shadow(4px 4px 0 #0009); }
[data-pngtuber-talking="true"][data-pngtuber="frame"]::after {
  content: '● REC';
  position: absolute;
  top: 4%;
  left: 4%;
  font: 400 max(14px, 7cqh)/1 'VT323', monospace;
  color: var(--rec);
  text-shadow: 2px 2px 0 #0009;
  animation: ffBlink 1s steps(1) infinite;
}`,
      },
      {
        id: 'ff-spike',
        layerType: 'hypetrain',
        name: 'Activity spike',
        hint: 'The Hype Train as readings going off the scale: a dark band with scanlines, the level stamped in red and the bar as a row of LEDs that light as it climbs.',
        css: `:scope {
  --ground: #0b0b0ce6; /* The band */
  --osd: #f4f4f4; /* The display */
  --led: #3ddc56; /* The lit LEDs */
  --stamp: #ff3b30; /* The level */
}

[data-hype="frame"] {
  background: repeating-linear-gradient(0deg, #00000040 0 1px, #0000 1px 3px), var(--ground) !important;
  border-radius: 0 !important;
  border: 1px solid #ffffff2e;
  font-family: 'VT323', monospace;
  color: var(--osd);
}
[data-hype="title"], [data-hype="time"], [data-hype="top"] { letter-spacing: .12em; }
[data-hype="level"] { color: var(--stamp) !important; border: 2px solid var(--stamp); padding: 0 .3em; }
[data-hype="track"] { border-radius: 0 !important; background: repeating-linear-gradient(90deg, #ffffff1f 0 calc(5% - 3px), #0000 calc(5% - 3px) 5%) !important; }
[data-hype="fill"] {
  border-radius: 0 !important;
  background: var(--led) !important;
  -webkit-mask: repeating-linear-gradient(90deg, #000 0 14px, #0000 14px 18px);
  mask: repeating-linear-gradient(90deg, #000 0 14px, #0000 14px 18px);
}
[data-hype-golden="true"] [data-hype="fill"] { background: #ffc53d !important; }`,
      },
      {
        id: 'ff-poi',
        layerType: 'shoutout',
        name: 'Person of interest',
        hint: 'A shoutout as a person of interest pinned in the case file: the picture in black and white with a worn white border, the name typed, the title stamped in red.',
        css: `:scope {
  --paper: #1a1814e6; /* The file */
  --ink: #e8e2d0; /* The typing */
  --stamp: #c2281f; /* The stamp */
  --border: #ece7da; /* The photo's border */
}

[data-shoutout="frame"] {
  background: var(--paper) !important;
  border: 1px solid #e8e2d033;
  border-radius: 2px !important;
  font-family: 'Special Elite', monospace;
}
[data-shoutout="avatar"] { border-radius: 0 !important; border: .5em solid var(--border); filter: grayscale(1) contrast(1.15); }
[data-shoutout="title"] { align-self: flex-start; color: var(--stamp) !important; border: 2px solid var(--stamp); padding: 0 .4em; transform: rotate(-3deg); opacity: 1 !important; }
[data-shoutout="name"] { color: var(--ink) !important; font-weight: 400 !important; text-transform: uppercase; }
[data-shoutout="game"], [data-shoutout="link"], [data-shoutout="viewers"] { font-family: 'VT323', monospace; color: var(--ink); letter-spacing: .08em; }`,
      },
      {
        id: 'ff-caseboard',
        layerType: 'leaderboard',
        name: 'Case board',
        hint: 'The leaderboard as the case board: typed on dark paper, the places in pixel print, the bar in red and first place stamped.',
        css: `:scope {
  --paper: #1a1814; /* The board */
  --ink: #e8e2d0; /* The typing */
  --stamp: #c2281f; /* The red */
  --line: #e8e2d033; /* The rules */
}

[data-board="frame"] {
  background: var(--paper) !important;
  border: 1px solid var(--line);
  border-radius: 2px !important;
  color: var(--ink);
  font-family: 'Special Elite', monospace;
}
[data-board="title"] { color: var(--ink) !important; font-family: 'VT323', monospace; letter-spacing: .18em; }
[data-board="row"] { border-bottom: 1px solid var(--line); }
[data-board="place"], [data-board="level"], [data-board="xp"] { font-family: 'VT323', monospace; }
[data-board="avatar"] { border-radius: 0 !important; filter: grayscale(1); }
[data-board="level"] { color: var(--ink) !important; }
[data-board="track"] { border-radius: 0 !important; background: #e8e2d01a !important; }
[data-board="fill"] { border-radius: 0 !important; background: var(--stamp) !important; }
[data-board-podium="first"] [data-board="place"] { color: var(--stamp); opacity: 1 !important; }
[data-board-podium="first"] [data-board="name"] { text-decoration: underline; text-decoration-color: var(--stamp); }`,
      },
      {
        id: 'ff-evidence-draw',
        layerType: 'giveaway',
        name: 'Evidence draw',
        hint: 'A giveaway drawn from the evidence box: the title stamped in red on dark paper, the names flicking past on a camcorder screen, the winner typed and underlined in red.',
        css: `:scope {
  --paper: #1a1814e6; /* The file */
  --ink: #e8e2d0; /* The typing */
  --stamp: #c2281f; /* The stamp */
  --osd: #f4f4f4; /* The screen's lettering */
}

[data-giveaway="frame"] {
  background: var(--paper) !important;
  border: 1px solid #e8e2d033;
  border-radius: 2px !important;
  color: var(--ink);
  font-family: 'Special Elite', monospace;
}
[data-giveaway="title"] { color: var(--stamp) !important; border: 2px solid var(--stamp); padding: 0 .4em; transform: rotate(-3deg); }
[data-giveaway="reel"] { background: #000000d9; color: var(--osd) !important; font-family: 'VT323', monospace; letter-spacing: .06em; padding: .05em .4em; }
[data-giveaway="avatar"] { border-radius: 0 !important; filter: grayscale(1); }
[data-giveaway="name"] { color: var(--ink) !important; text-decoration: underline; text-decoration-color: var(--stamp); }
[data-giveaway="count"], [data-giveaway="time"], [data-giveaway="platform"] { font-family: 'VT323', monospace; }`,
      },
    ],
  };

export default look;
