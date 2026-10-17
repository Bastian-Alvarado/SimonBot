/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Slash commands: what people type "!" for, as Discord's own commands, so
 * typing "/" lists them with what each does.
 *
 * Nothing here answers anything new. Each command goes down a path the bot
 * already has:
 *
 *   Buttons     /perfil, /sorteo and /avisame are the buttons the bot
 *               already answers ("Mi perfil", "Participar", …). The command
 *               is handed on as a press of that button, and the button's own
 *               code answers it, privately.
 *   Chat words  /rango, /top and /pregunta are the words typed in chat. The
 *               command is handed on as that message, said where the command
 *               was used; whatever answers the word answers it, and the
 *               answer (a reply to that message) becomes the command's reply
 *               instead (see `intercept`).
 *   Points      /puntos says your balance, only to you.
 *
 * Registered on the server the app is set to (guild commands show up at
 * once; global ones can take an hour), every time the bot connects, so a
 * changed list is current after a restart.
 */

import { bus, EVENTS, normaliseChat } from '../core/bus.js';
import { createLogger } from '../core/logger.js';
import * as discord from '../platforms/discord.js';
import * as leveling from '../leveling/index.js';
import * as profileCard from './profile-card.js';
import * as points from './points.js';
import * as giveaway from './giveaway.js';
import * as questions from './questions.js';

const log = createLogger('slash');

const EPHEMERAL = 64;
/** A command whose word gets no answer is told it went through, after this long. */
export const NO_ANSWER_MS = 6000;

const STRING = 3, USER = 6;

/** The commands, as Discord registers them. Spanish first, English for an English Discord. */
export const COMMANDS = [
  { name: 'perfil', description: 'Tu nivel, puntos, directos y racha',
    description_localizations: { 'en-US': 'Your level, points, streams and streak', 'en-GB': 'Your level, points, streams and streak' },
    options: [{ type: USER, name: 'persona', description: 'Ver el perfil de otra persona', required: false }] },
  { name: 'rango', description: 'En qué nivel y puesto vas',
    description_localizations: { 'en-US': 'Your level and place', 'en-GB': 'Your level and place' },
    options: [{ type: USER, name: 'persona', description: 'El rango de otra persona', required: false }] },
  { name: 'top', description: 'Quién va arriba en niveles',
    description_localizations: { 'en-US': 'Who leads the levels', 'en-GB': 'Who leads the levels' } },
  { name: 'puntos', description: 'Cuántos puntos tienes',
    description_localizations: { 'en-US': 'How many points you have', 'en-GB': 'How many points you have' } },
  { name: 'sorteo', description: 'Entra al sorteo abierto, desde aquí',
    description_localizations: { 'en-US': 'Enter the open giveaway from here', 'en-GB': 'Enter the open giveaway from here' } },
  { name: 'avisame', description: 'Un mensaje privado cuando Simon empiece',
    description_localizations: { 'en-US': 'A private message when Simon goes live', 'en-GB': 'A private message when Simon goes live' },
    options: [{ type: STRING, name: 'donde', description: 'Dónde lo ves (o "ya no")', required: true, choices: [
      { name: 'Twitch', value: 'twitch' }, { name: 'YouTube', value: 'youtube' },
      { name: 'Ya no, gracias', value: 'stop' }] }] },
  { name: 'pregunta', description: 'Manda una pregunta para el directo',
    description_localizations: { 'en-US': 'Send a question for the stream', 'en-GB': 'Send a question for the stream' },
    options: [{ type: STRING, name: 'texto', description: 'Tu pregunta', required: true, max_length: 300 }] },
];

let appId = '';
/** Commands handed on as chat, by the made-up message id their answer replies to. */
const pending = new Map();

const option = (i, name) => (i.data?.options || []).find((o) => o.name === name)?.value;
const who = (i) => i.member?.user || i.user || {};
const nameOf = (i, u = who(i)) => i.member?.nick || u.global_name || u.username || '';
const answer = (i, data, type = 4) => discord.request('POST', `/interactions/${i.id}/${i.token}/callback`, { body: { type, data } });

/** Registers the commands on the server the app is set to. */
export async function register(guildId = discord.getSettings?.()?.guildId) {
  if (!appId) appId = (await discord.request('GET', '/applications/@me'))?.id || '';
  if (!appId) throw new Error('no application id');
  const path = guildId ? `/applications/${appId}/guilds/${guildId}/commands` : `/applications/${appId}/commands`;
  const done = await discord.request('PUT', path, { body: COMMANDS });
  log.info(`registered ${done?.length ?? COMMANDS.length} slash commands${guildId ? '' : ' (global)'}`);
  return done;
}

/** A press of one of the bot's own buttons, for its own code to answer. */
const press = (i, customId) => bus.emit('discord:interaction', { ...i, type: 3, data: { component_type: 2, custom_id: customId } });

/** The words, said as a message in the channel the command was used in. */
async function say(i, words) {
  await answer(i, {}, 5); // "SimonBot is thinking…", in public, like the answer to a typed word
  const u = who(i);
  const id = `slash:${i.id}`;
  pending.set(id, { token: i.token, used: false, words, timer: setTimeout(() => quiet(id), NO_ANSWER_MS) });
  const cfg = discord.getSettings?.() || {};
  const chat = normaliseChat({
    platform: 'discord',
    user: nameOf(i, u),
    userId: u.id,
    msg: words,
    color: '#5865F2',
    avatar: u.avatar ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png` : undefined,
    isMod: discord.isModerator(i.guild_id, u.id, i.member),
    raw: { guildId: i.guild_id, channelId: i.channel_id, messageId: id, plain: words, roles: i.member?.roles || [], slash: true },
    names: {},
  });
  bus.emit(!cfg.channelId || i.channel_id === cfg.channelId ? EVENTS.CHAT : 'discord:message_elsewhere', chat);
}

/** Nothing answered the words: the reply says they went through, not "thinking…" forever. */
function quiet(id) {
  const p = pending.get(id);
  if (!p) return;
  pending.delete(id);
  if (p.used) return;
  discord.request('PATCH', `/webhooks/${appId}/${p.token}/messages/@original`, { body: { content: `✅ \`${p.words.slice(0, 120)}\`` } })
    .catch((err) => log.debug(`could not close a command: ${err.message}`));
}

/**
 * A message the bot is about to send. One that replies to a command's
 * made-up message is that command's answer: the first edits the "thinking"
 * reply, any more go as follow-ups. Returns the call to make instead, or null.
 */
export function intercept(method, endpoint, body, isMultipart) {
  if (method !== 'POST' || !/^\/channels\/\d+\/messages$/.test(endpoint)) return null;
  let json = body;
  if (isMultipart) {
    try { json = JSON.parse(body.get('payload_json')); } catch { return null; }
  }
  const ref = json?.message_reference?.message_id;
  if (typeof ref !== 'string' || !ref.startsWith('slash:')) return null;
  const p = pending.get(ref);
  const { message_reference: _ref, ...rest } = json;
  if (!p) return { method, endpoint, body: isMultipart ? body : rest }; // too late: a plain message, then
  const first = !p.used;
  p.used = true;
  const out = first ? { method: 'PATCH', endpoint: `/webhooks/${appId}/${p.token}/messages/@original` }
    : { method: 'POST', endpoint: `/webhooks/${appId}/${p.token}` };
  if (isMultipart) {
    body.set('payload_json', JSON.stringify(rest));
    return { ...out, body };
  }
  return { ...out, body: rest };
}

async function onCommand(i) {
  const u = who(i);
  switch (i.data?.name) {
    case 'perfil': {
      const other = option(i, 'persona');
      if (!other || other === u.id) return press(i, 'profile:me');
      const r = i.data?.resolved || {};
      const ou = r.users?.[other] || {};
      const uid = leveling.personFor('discord', other, r.members?.[other]?.nick || ou.global_name || ou.username || '');
      const form = new FormData();
      form.append('payload_json', JSON.stringify({ type: 4, data: { flags: EPHEMERAL, attachments: [{ id: 0, filename: 'perfil.png' }] } }));
      form.append('files[0]', new Blob([await profileCard.renderProfile(profileCard.profileOf(uid))], { type: 'image/png' }), 'perfil.png');
      return discord.request('POST', `/interactions/${i.id}/${i.token}/callback`, { body: form, isMultipart: true });
    }
    case 'rango': {
      const words = leveling.getConfig().chat;
      const other = option(i, 'persona');
      if (!other || other === u.id) return say(i, words.rankWord);
      const r = i.data?.resolved || {};
      const name = r.members?.[other]?.nick || r.users?.[other]?.global_name || r.users?.[other]?.username || '';
      return say(i, `${words.rankWord} ${name}`.trim());
    }
    case 'top': return say(i, leveling.getConfig().chat.topWord);
    case 'pregunta': return say(i, `${questions.getSettings().ask.trigger} ${option(i, 'texto') || ''}`.trim());
    case 'puntos': {
      const cfg = points.getPoints();
      const uid = leveling.personFor('discord', u.id, nameOf(i));
      const unit = `${cfg.emoji ? `${cfg.emoji} ` : ''}${cfg.name}`;
      return answer(i, { flags: EPHEMERAL, content: `Tienes ${points.balanceOf(uid).toLocaleString('es-MX')} ${unit}.` });
    }
    case 'sorteo': return press(i, `giveaway:enter:${giveaway.getState().openedAt}`);
    case 'avisame': {
      const where = option(i, 'donde');
      return press(i, where === 'stop' ? 'livedm:stop' : `livedm:on:${where}`);
    }
    default:
      return answer(i, { flags: EPHEMERAL, content: 'Ese comando ya no existe.' });
  }
}

export function initSlashCommands() {
  discord.setRequestRewrite(intercept);
  bus.on('discord:ready', () => { register().catch((err) => log.warn(`could not register slash commands: ${err.message}`)); });
  bus.on('discord:interaction', (i) => {
    if (i?.type !== 2) return;
    onCommand(i).catch((err) => {
      log.warn(`/${i.data?.name}: ${err.message}`);
      answer(i, { flags: EPHEMERAL, content: 'Algo salió mal. Inténtalo otra vez.' }).catch(() => {});
    });
  });
}

export const _test = { onCommand, pending, setAppId: (id) => { appId = id; } };
