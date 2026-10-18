/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The live values a Discord page can say: the poll, the Discord call, the
 * next stream, the clock (shared/discord-pages.js adds the page's own).
 *
 * Named once, here, because three things need the same list: the page that
 * fills them in, the screen that offers them, and the tests that check the
 * two agree. A picker offering a value nothing fills would leave "{foo}" in
 * a post, which is exactly the failure this is arranged to prevent.
 */

/**
 * Each entry: the name typed in braces, a label for the picker, and how to get
 * it out of the client's state.
 *
 * Kept as a flat list of single words rather than dotted paths: a person
 * writing "{pollVotes} votos" is not thinking about object shapes.
 */
export const LIVE_VARS = [
  // --- the poll -------------------------------------------------------------
  { name: 'pollQuestion', label: 'The poll question', get: (s) => (s.poll && s.poll.mode !== 'idle' ? s.poll.question : undefined) },
  { name: 'pollVotes', label: 'Votes in the poll', get: (s) => (s.poll && s.poll.mode !== 'idle' ? s.poll.total : undefined) },
  /* A tie names every answer in it. */
  { name: 'pollLeader', label: 'The answer winning the poll', get: (s) => (s.poll?.leaders?.length ? s.poll.leaders.map((i) => s.poll.options[i]).join(' / ') : undefined) },

  // --- the Discord call -----------------------------------------------------
  { name: 'voiceCount', label: 'People in the Discord call', get: (s) => (s.voice?.channelId ? (s.voice.members || []).length : undefined) },
  { name: 'voiceTalking', label: 'Who is talking in the Discord call', get: (s) => ((s.voice?.members || []).filter((m) => m.speaking).map((m) => m.name).join(', ') || undefined) },

  // --- the next stream, from the Twitch schedule ---------------------------
  /*
    In this computer's own time and words, the way it shows {time}. Empty
    while there is nothing on the schedule, so a line reading "Próximo
    stream: {nextStream}" is left out rather than showing a wrong date.
  */
  { name: 'nextStream', label: 'Next stream: day and time', get: (s) => nextAt(s, (d) => d.toLocaleString([], { weekday: 'long', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })) },
  { name: 'nextStreamDay', label: 'Next stream: the day', get: (s) => nextAt(s, (d) => d.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })) },
  { name: 'nextStreamTime', label: 'Next stream: the time', get: (s) => nextAt(s, (d) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })) },
  { name: 'nextStreamIn', label: 'Next stream: how long until', get: (s) => nextAt(s, (d) => untilWords(d)) },
  { name: 'nextStreamTitle', label: 'Next stream: its title', get: (s) => s.twitchSchedule?.next?.title || undefined },
  { name: 'nextStreamGame', label: 'Next stream: its game', get: (s) => s.twitchSchedule?.next?.category || undefined },

  // --- the clock ------------------------------------------------------------
  { name: 'time', label: 'Time now', get: () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
  { name: 'date', label: "Today's date", get: () => new Date().toLocaleDateString() },
];

/** The next stream's start as a Date, put into words by `say`, or nothing when there is none. */
function nextAt(s, say) {
  const iso = s?.twitchSchedule?.next?.start;
  const d = iso ? new Date(iso) : null;
  return d && !Number.isNaN(d.getTime()) ? say(d) : undefined;
}

/** "in 2 days", "in 5 hours", "tomorrow" — in this computer's language. */
function untilWords(d, now = Date.now()) {
  const words = new Intl.RelativeTimeFormat([], { numeric: 'auto' });
  const minutes = Math.round((d.getTime() - now) / 60000);
  if (Math.abs(minutes) < 60) return words.format(minutes, 'minute');
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 36) return words.format(hours, 'hour');
  return words.format(Math.round(hours / 24), 'day');
}

const BY_NAME = new Map(LIVE_VARS.map((v) => [v.name, v]));

/**
 * Fill in a template against the current state.
 *
 * An unknown name is left exactly as typed rather than blanked. That is
 * deliberate and matches how the rest of this app interpolates: a typo that
 * disappears is a mystery, and a typo that shows up as "{folowers}" on the
 * preview is a thing you can see and fix before it goes out.
 *
 * A known name whose value is missing — no poll running, nobody in the call —
 * is replaced with the fallback, because that is an absence rather than a
 * mistake, and a post reading "undefined" is worse than one reading "—".
 */
export function fillTemplate(template, state, fallback = '—') {
  return String(template ?? '').replace(/\{([a-zA-Z]+)\}/g, (whole, name) => {
    const entry = BY_NAME.get(name);
    if (!entry) return whole;
    let value;
    try {
      value = entry.get(state || {});
    } catch {
      value = undefined;
    }
    if (value === undefined || value === null || value === '') return fallback;
    return typeof value === 'number' ? value.toLocaleString() : String(value);
  });
}
