/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Smoke tests: levels in Discord — XP and levels earned by talking, and
 * "!rank" and "!top" answered in the channel they were asked in.
 *
 * Runs in order with the other feature files, on the one engine the harness
 * boots — through scripts/smoke.js, never on its own. After discord-chat.js;
 * leveling was set up by discord.js.
 */

import { SCRIPT_URL, assert, bus, EVENTS, fs, normaliseChat, test } from './harness.js';

const leveling = await import('../../leveling/index.js');
const levelChat = await import('../../leveling/chat.js');

const read = (path) => fs.readFileSync(new URL(path, SCRIPT_URL), 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const before = leveling.getConfig();
// Every message a level's worth: 100 XP is level 1, 400 level 2.
leveling.setConfig({ enabled: true, cooldown: 0, minXp: 100, maxXp: 100, xpRate: 1, announceChannelId: null });

const levelUps = [];
const onLevelUp = (l) => levelUps.push(l);
bus.on(EVENTS.LEVELUP, onLevelUp);
const xpChanges = [];
const onXp = (uid) => xpChanges.push(uid);
bus.on('xp:changed', onXp);
const chat = (over) => bus.emit(EVENTS.CHAT, normaliseChat({ platform: 'discord', msg: 'hola', raw: { channelId: 'c-stream' }, ...over }));

chat({ user: 'Escalador', userId: 'esc1', avatar: 'https://x/e.png' });
chat({ user: 'MiBot', userId: 'own1', isBot: true });
await wait(30);
const firstLevel = levelUps.find((l) => l.user === 'Escalador');

test('chat earns XP and levels, and the Levels screen is told as it changes', () => {
  assert.ok(firstLevel, 'no level-up');
  assert.deepEqual([firstLevel.platform, firstLevel.level], ['discord', 1]);
  assert.ok(xpChanges.length >= 2, 'the board is not told XP changed');
  // Sent as XP comes in, a few seconds behind, without the whole user list.
  assert.ok(read('../api/ws.js').includes("broadcast(S2C.XP_DATA, { leaderboard: leveling.leaderboard() });"));
});

// ---------------------------------------------------------------- !rank and !top

const answers = [];
let clock = Date.now();
levelChat.initLevelChat({
  discord: async (text, c) => { answers.push(['discord', text, c.raw?.channelId]); },
  now: () => clock,
});
const step = async (ms = levelChat.CHAT_EVERY_MS + 1) => { clock += ms; await wait(5); };

chat({ user: 'Escalador', userId: 'esc1', msg: '!rank' });
await step();
const rankLine = answers.at(-1);
const count = answers.length;
chat({ user: 'Escalador', userId: 'esc1', msg: '!rank' });
await step();
const tooSoon = answers.length - count;
await step(levelChat.PERSON_EVERY_MS);
chat({ user: 'Escalador', userId: 'esc1', msg: '!RANK' });
await step();
const afterWaiting = answers.length - count;

chat({ user: 'Otro', userId: 'o1', msg: '!top' });
await step();
const topLine = answers.at(-1);

chat({ user: 'Curioso', userId: 'c1', msg: '!rank @Escalador' });
await step();
const aboutSomeone = answers.at(-1);
chat({ user: 'Curioso2', userId: 'c2', msg: '!rank Nadie' });
await step();
const nobody = answers.at(-1);

// Discord, in a channel that is not the stream's: answered there.
bus.emit('discord:message_elsewhere', normaliseChat({ platform: 'discord', user: 'Disc_or*d', userId: 'd1', msg: '!rank', raw: { channelId: 'c-general', messageId: 'm1' } }));
await step();
const fromDiscord = answers.at(-1);

// Only Discord is answered, and never the bot itself.
const beforeQuiet = answers.length;
chat({ platform: 'twitch', user: 'Tw', userId: 't1', msg: '!top' });
chat({ user: 'MiBot', userId: 'own1', isBot: true, msg: '!top' });
await step();
const quiet = answers.length - beforeQuiet;

levelChat.stopLevelChat();
bus.off(EVENTS.LEVELUP, onLevelUp);
bus.off('xp:changed', onXp);

test('"!rank" says where somebody stands, in the chat it was asked in, and no more than every half minute', () => {
  assert.deepEqual([rankLine[0], rankLine[2]], ['discord', 'c-stream']);
  assert.match(rankLine[1], /^Escalador: nivel \d+ · [\d,]+ XP · puesto #\d+ de \d+$/);
  assert.equal(tooSoon, 0, 'the same person was answered twice in a row');
  assert.equal(afterWaiting, 1, 'asking again later was not answered (or the word is case-sensitive)');
  assert.match(aboutSomeone[1], /^Escalador: nivel/, '"!rank @name" did not ask about them');
  assert.equal(nobody[1], 'Nadie todavía no tiene XP.');
  assert.deepEqual([fromDiscord[0], fromDiscord[2]], ['discord', 'c-general'], 'Discord was not answered in its own channel');
  assert.ok(fromDiscord[1].startsWith('Disc\\_or\\*d'), 'a name in Discord was not escaped');
});

test('"!top" names the leaders; anywhere but Discord, and the bot, get nothing', () => {
  assert.match(topLine[1], /^Top \d: 1\. .+ \(nv \d+\)/);
  assert.equal(quiet, 0, 'something other than a person in Discord was answered');
});

test('the bot\'s own level leaves out a place it does not have', () => {
  const own = leveling.findUser('discord', 'own1');
  assert.ok(own, 'the bot earned no XP');
  assert.match(levelChat.rankAnswer(own, 'discord'), /^MiBot: nivel \d+ · [\d,]+ XP$/);
});

test('the chat answers are kept sane: one word to ask, a count of 1 to 10', () => {
  const c = leveling.cleanLevelChat({ rankWord: '  !nivel extra ', topWord: '', topCount: 99, rankText: '', youtube: false });
  assert.equal('youtube' in c, false, 'a setting for YouTube answers is still kept');
  assert.equal(c.rankWord, '!nivel');
  assert.equal(c.topWord, '!top');
  assert.equal(c.topCount, 10);
  assert.equal(c.rankText, leveling.DEFAULT_LEVEL_CHAT.rankText);
  assert.deepEqual(leveling.setConfig({ ignoredChannelIds: ['123', 'nope', '123', 4] }).ignoredChannelIds, ['123', '4']);
  assert.ok(read('../index.js').includes('initLevelChat();'));
});

leveling.setConfig(before);
