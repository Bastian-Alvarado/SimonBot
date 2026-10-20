/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Smoke tests: the question queue, and the screen chrome.
 *
 * Runs in order with the other feature files, on the one engine the harness
 * boots — through scripts/smoke.js, never on its own.
 */

import { SCRIPT_URL, assert, fs, test } from './harness.js';
import { EXCLUDED } from './backup.js';

const questions = await import('../../engine/questions.js');

// --------------------------------------------------------- the question queue

test('only an approved question is ever the one being answered', () => {
  /*
    The entire point of a queue: a question nobody has looked at is never the
    one being answered, and the refusal lives on the server rather than in
    whichever screen happens to be asking.
  */
  questions.clear();
  questions.add({ user: 'Someone', platform: 'discord', text: 'a question' });
  const [q] = questions.clear('handled').items;

  assert.equal(questions.show(q.id).showingId, '', 'a waiting question was taken up');
  questions.setStatus(q.id, 'approved');
  assert.equal(questions.show(q.id).showingId, q.id, 'an approved question could not be taken up');
});

test('answering the question being answered lets it go', () => {
  questions.clear();
  questions.add({ user: 'Someone', text: 'another' });
  const q = questions.clear('handled').items[0];
  questions.setStatus(q.id, 'approved');
  questions.show(q.id);
  assert.equal(questions.setStatus(q.id, 'done').showingId, '');
});

test('a full queue forgets a waiting question, never an approved one', () => {
  /*
    Approving is work somebody did; a question nobody has looked at yet is not.
    Refusing new ones instead would break the queue during the one segment it
    exists for, and silently.
  */
  questions.clear();
  questions.add({ user: 'Early', text: 'approved and old' });
  const keep = questions.clear('handled').items[0];
  questions.setStatus(keep.id, 'approved');
  for (let i = 0; i < 260; i += 1) questions.add({ user: 'Flood', text: `spam ${i}` });

  const items = questions.clear('handled').items;
  assert.ok(items.length <= 200, String(items.length));
  assert.ok(items.some((q) => q.id === keep.id), 'the approved question was dropped');
});


test('questions do not travel in a config backup', () => {
  // What viewers typed during one segment, stale the moment it ends.
  assert.ok(EXCLUDED.includes('questions'), 'questions are exported as configuration');
});


// ------------------------------------------------------------- screen chrome

test('no screen prints its own name in a heading', () => {
  /*
    The sidebar says which screen you are on and the breadcrumb repeats it, so
    a third copy set in 3xl was costing about 200px of height on every page.

    Easy to reintroduce one view at a time, which is why this counts them all.
  */
  const dir = new URL('../../web/components/views/', SCRIPT_URL);
  const offenders = fs.readdirSync(dir)
// The bot's Home is left out: its heading is the bot's state ("Connect SimonBot to your
// Discord"), the card the screen is for, not the screen's name.
  .filter((f) => f.endsWith('.tsx') && f !== 'BotHomeView.tsx')
    .filter((f) => /<h[12][^>]*text-3xl/.test(fs.readFileSync(new URL(f, dir), 'utf8')));
  assert.deepEqual(offenders, [], `page titles are back in: ${offenders.join(', ')}`);
});

test('the top bar is for phones, where it is the only way out', () => {
  /*
    It holds the menu button and the name of the screen. On a desktop the
    sidebar is already open beside you with that screen lit up, so the bar was
    64px repeating it. On a phone the sidebar is hidden behind that button, so
    hiding the bar everywhere would leave no way to change screens at all —
    which is what this is really guarding.
  */
  const app = fs.readFileSync(new URL('../../web/App.tsx', SCRIPT_URL), 'utf8');
  const bar = app.slice(app.indexOf('sticky top-0 z-40 h-16') - 120, app.indexOf('sticky top-0 z-40 h-16') + 60);
  assert.ok(/md:hidden/.test(bar), 'the bar is back on desktop, costing 64px on every screen');
  assert.ok(/aria-label="Open Menu"/.test(app), 'the phone has no way to open the menu');
  // And the page below it reclaims that height only where the bar is gone.
  assert.ok(/h-\[calc\(100dvh-4rem\)\] md:h-dvh/.test(app),
    'the page still reserves room for a bar that is no longer there');
});
