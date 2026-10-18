/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * SimonBot's home: is the bot up, what it is doing while you are live, and
 * every part of it at a glance, each opening its own screen. The look is the
 * bot's own (leaf, mint, grape and plum, taken from its avatar).
 */
import React, { useState } from 'react';
import { DoorOpen, Trophy, Coins, Gift, BarChart3, Megaphone, Shield, Headphones, Newspaper, MessageCircleQuestion,
  Sparkles, Bell, Terminal, Wand2, RefreshCw, ArrowRight, Radio } from 'lucide-react';
import type { AppView } from '../../types';
import face from '../../../art/simonbot/bot-avatar-mint-circle-512.png';

export const BOT_NAME = 'SimonBot';

/** The slash commands, as server/engine/slash-commands.js registers them. */
const COMMANDS: [string, string, string][] = [
  ['perfil', 'Your level, points, streak and accounts', 'Tu nivel, puntos, racha y cuentas'],
  ['rango', 'Your level and place', 'Tu nivel y puesto'],
  ['top', 'Who leads the levels', 'Quién va arriba'],
  ['puntos', 'Your points, only to you', 'Tus puntos, solo para ti'],
  ['sorteo', 'Enter the open giveaway', 'Entra al sorteo abierto'],
  ['avisame', 'A DM when the stream starts', 'Un DM cuando empiece el directo'],
  ['pregunta', 'A question for the stream', 'Una pregunta para el directo'],
];

type Props = { system: any; t: any; go: (v: AppView) => void; language?: string };

const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`rounded-3xl border border-[#2A1B30] bg-[#140B18] ${className}`}>{children}</div>
);
const Label = ({ children }: { children: React.ReactNode }) => (
  <div className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#7B6B83]">{children}</div>
);

export const BotHomeView = ({ system, t, go, language }: Props) => {
  const es = language === 'es';
  const d = system.data || {};
  const c = system.connections || {};
  const online = system.status?.discord === 'connected';
  const hasToken = Boolean(c.discordHasBotToken || online);
  const bot = c.botMember?.user;
  const botFace = bot?.avatar ? `https://cdn.discordapp.com/avatars/${bot.id}/${bot.avatar}.png?size=256` : face;
  const guild = (c.discordGuilds || []).find((g: any) => g.id === c.discordGuildId);
  // Live as Twitch says it (server/engine/stream-sessions.js).
  const live = Boolean(d.streamNow);
  const [busy, setBusy] = useState('');
  const [note, setNote] = useState('');

  const run = async (key: string, fn: () => Promise<any>, ok: (r: any) => string) => {
    setBusy(key); setNote('');
    try { setNote(ok(await fn())); } catch (err: any) { setNote(err?.message || String(err)); }
    setBusy('');
  };

  const on = (v: any) => v?.enabled === true;
  const modules: { view: AppView; icon: React.ReactNode; name: string; line: string; state: boolean | null; tone?: 'grape' }[] = [
    { view: 'welcome-goodbye', icon: <DoorOpen size={18} />, name: es ? 'Bienvenidas' : 'Welcome & goodbye',
      line: es ? 'Tarjeta y reacción para saludar' : 'Card and a reaction to say hi', state: on(d.welcomeGoodbyeConfig?.welcome) },
    { view: 'levels', icon: <Trophy size={18} />, name: es ? 'Niveles' : 'Levels & XP',
      line: es ? 'XP por hablar en cualquier chat' : 'XP for chatting anywhere', state: null },
    { view: 'points', icon: <Coins size={18} />, name: es ? 'Puntos' : 'Points',
      line: es ? 'Una puntuación aparte, con su tabla' : 'A score of their own, with a board', state: d.pointsSettings ? d.pointsSettings.enabled !== false : null },
    { view: 'giveaway', icon: <Gift size={18} />, name: es ? 'Sorteos' : 'Giveaways', tone: 'grape',
      line: d.giveaway?.mode === 'open' ? `${es ? 'Abierto' : 'Open'} · ${d.giveaway?.count || 0} ${es ? 'dentro' : 'in'}` : (es ? 'Ninguno abierto' : 'None open'),
      state: d.giveaway?.mode === 'open' },
    { view: 'go-live', icon: <Megaphone size={18} />, name: es ? 'Aviso de directo' : 'Go live', tone: 'grape',
      line: d.liveDms?.enabled ? `${d.liveDms?.count || 0} ${es ? 'piden DM' : 'want a DM'}` : (es ? 'Post al empezar' : 'Post when you start'), state: on(d.announce) },
    { view: 'role-management', icon: <Shield size={18} />, name: es ? 'Roles' : 'Role sync',
      line: es ? 'Subs, VIPs y mods de Twitch' : 'Subs, VIPs, mods from Twitch', state: null },
    { view: 'polls', icon: <BarChart3 size={18} />, name: es ? 'Encuestas' : 'Polls',
      line: d.poll?.mode === 'open' ? (es ? 'Una abierta' : 'One open') : (es ? 'Ninguna abierta' : 'None open'), state: d.poll?.mode === 'open' },
    { view: 'questions', icon: <MessageCircleQuestion size={18} />, name: es ? 'Preguntas' : 'Questions',
      line: `${(d.questions?.items || []).filter((q: any) => q.status === 'pending').length} ${es ? 'esperando' : 'waiting'}`, state: null },
    { view: 'discord-pages', icon: <Newspaper size={18} />, name: es ? 'Páginas' : 'Discord pages',
      line: `${(d.discordPages || []).length} ${es ? 'páginas' : 'pages'}`, state: null },
    { view: 'voice', icon: <Headphones size={18} />, name: es ? 'Llamada de voz' : 'Voice call', tone: 'grape',
      line: es ? 'Quién está en la llamada y quién habla' : 'Who is in the call, and who is talking', state: d.voice ? d.voice.listen === true : null },
  ];

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* the bot */}
      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="relative overflow-hidden rounded-3xl border border-[#3A2742] bg-gradient-to-br from-[#38133E] to-[#160B1A] p-6 md:p-8 flex flex-col sm:flex-row gap-6 items-start sm:items-center">
          <div className="absolute -left-10 top-0 w-72 h-72 rounded-full bg-[#66AD4F]/25 blur-3xl pointer-events-none" />
          <div className="relative shrink-0">
            <img src={botFace} alt="" className="w-32 h-32 md:w-40 md:h-40 rounded-full [image-rendering:pixelated]" />
            <span className={`absolute bottom-2 right-2 w-6 h-6 rounded-full border-[5px] border-[#38133E] ${online ? 'bg-emerald-500' : 'bg-[#7B6B83]'}`} />
          </div>
          <div className="relative min-w-0">
            <div className={`text-[10px] font-extrabold uppercase tracking-[0.2em] ${online ? 'text-[#B8E99C]' : 'text-[#A394AA]'}`}>
              {online ? (es ? 'En línea' : 'Online') : hasToken ? (es ? 'Conectando…' : 'Connecting…') : (es ? 'Sin conectar' : 'Not connected')}
            </div>
            <h1 className="mt-2 text-2xl md:text-3xl font-black tracking-tight text-white leading-tight">
              {online
                ? <>{bot?.global_name || bot?.username || BOT_NAME} {es ? 'cuida' : 'is looking after'}<br />{guild?.name || (es ? 'tu servidor' : 'your server')}</>
                : <>{es ? 'Conecta a ' : 'Connect '}{BOT_NAME}{es ? ' a tu Discord' : ' to your Discord'}</>}
            </h1>
            {!online && (
              <button onClick={() => go('gallery')} className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#66AD4F] hover:bg-[#5A9D45] text-[#0F0913] font-extrabold text-xs uppercase tracking-widest">
                {es ? 'Poner el token del bot' : 'Add the bot token'} <ArrowRight size={14} />
              </button>
            )}
            {online && (
              <div className="mt-5 flex flex-wrap gap-2">
                <button disabled={!!busy} onClick={() => run('face', () => system.actions.setBotFace('mint'),
                  () => (es ? 'Listo: el bot ya tiene la cara de Pixel Simon.' : 'Done: the bot now has Pixel Simon\'s face.'))}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold disabled:opacity-50">
                  <Wand2 size={14} /> {busy === 'face' ? '…' : (es ? 'Usar la cara de SimonBot' : 'Use SimonBot\'s face')}
                </button>
                <button disabled={!!busy} onClick={() => run('slash', () => system.actions.syncSlashCommands(),
                  (r) => (es ? `${r?.count ?? COMMANDS.length} comandos / listos en el servidor.` : `${r?.count ?? COMMANDS.length} slash commands ready on the server.`))}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold disabled:opacity-50">
                  <RefreshCw size={14} className={busy === 'slash' ? 'animate-spin' : ''} /> {es ? 'Registrar comandos /' : 'Register / commands'}
                </button>
              </div>
            )}
            {note && <p className="mt-3 text-xs text-[#CBBFD1]">{note}</p>}
          </div>
        </div>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            {live
              ? <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/15 text-[#FB7185] text-[10px] font-black tracking-[0.15em]"><span className="w-2 h-2 rounded-full bg-[#F43F5E]" /> LIVE</span>
              : <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 text-[#A394AA] text-[10px] font-black tracking-[0.15em]"><span className="w-2 h-2 rounded-full bg-[#7B6B83]" /> OFFLINE</span>}
            <Radio size={16} className="text-[#7B6B83]" />
          </div>
          <div className="mt-4 text-white font-bold">{live ? (es ? 'Estás en directo' : 'You are live') : (es ? 'Cuando empieces' : 'When you go live')}</div>
          <ul className="mt-3 space-y-3 text-sm">
            {[
              [<Megaphone size={14} />, es ? 'Post de directo' : 'Go-live post', on(d.announce) ? (es ? 'activo' : 'on') : (es ? 'apagado' : 'off')],
              [<Bell size={14} />, es ? 'DMs de directo' : 'Live DMs', d.liveDms?.enabled ? `${d.liveDms?.count || 0} ${es ? 'personas' : 'people'}` : (es ? 'apagado' : 'off')],
              [<Sparkles size={14} />, es ? 'Momentos a Discord' : 'Highlights to Discord', on(d.highlights) ? (es ? 'activo' : 'on') : (es ? 'apagado' : 'off')],
            ].map(([ic, a, b], i) => (
              <li key={i} className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-lg bg-[#66AD4F]/15 text-[#B8E99C] flex items-center justify-center">{ic}</span>
                <span className="text-[#CBBFD1] font-semibold flex-1">{a}</span>
                <span className="font-mono text-xs text-[#7B6B83]">{b}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* modules */}
      <div>
        <div className="flex items-end justify-between mb-3"><Label>{es ? 'Módulos' : 'Modules'}</Label></div>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-5">
          {modules.map((m) => (
            <button key={m.view} onClick={() => go(m.view)}
              className="text-left rounded-2xl border border-[#2A1B30] bg-[#140B18] hover:border-[#4F9140] hover:bg-[#1C1121] transition-colors p-4">
              <div className="flex items-start justify-between">
                <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${m.tone === 'grape' ? 'bg-[#9756A0]/20 text-[#C79BD0]' : 'bg-[#66AD4F]/15 text-[#B8E99C]'}`}>{m.icon}</span>
                {m.state !== null && <span className={`mt-1 w-2.5 h-2.5 rounded-full ${m.state ? 'bg-[#66AD4F]' : 'bg-[#42344A]'}`} title={m.state ? 'on' : 'off'} />}
              </div>
              <div className="mt-4 font-bold text-white text-sm">{m.name}</div>
              <div className="mt-1 text-xs text-[#7B6B83] truncate">{m.line}</div>
            </button>
          ))}
        </div>
      </div>

      {/* slash commands */}
      <Card className="p-6">
        <div className="flex items-center gap-2"><Terminal size={15} className="text-[#B8E99C]" /><Label>{es ? 'Comandos / en Discord' : 'Slash commands in Discord'}</Label></div>
        <p className="mt-2 text-sm text-[#A394AA] max-w-3xl">
          {es ? 'Al escribir / en tu servidor aparecen estos, con lo que hace cada uno. Responden igual que sus palabras con ! en el chat.'
            : 'Typing / in your server lists these, with what each does. They answer exactly like their ! words in chat.'}
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {COMMANDS.map(([n, en, sp]) => (
            <div key={n} className="rounded-xl bg-[#1C1121] border border-[#2A1B30] px-3 py-2">
              <div className="font-mono font-bold text-sm text-[#B8E99C]">/{n}</div>
              <div className="text-xs text-[#A394AA]">{es ? sp : en}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
