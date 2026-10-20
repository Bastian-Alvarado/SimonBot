/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Moderators screen, the streamer's only: who has signed in as a
 * moderator, who is here now, and what they did; signing one out, turning
 * one away from the dashboard (or letting them back in). And the Discord mod
 * log: which channel is told about bans and timeouts, and the latest ones.
 *
 * Every moderator of the Discord server can sign in (server/api/auth.js);
 * this is for the ones who should not, and for seeing what the ones who do
 * have changed. The list and the record are asked for again every few
 * seconds while the screen is open, so somebody arriving or a button pressed
 * shows up without reloading.
 */
import { useCallback, useEffect, useState } from 'react';
import { ShieldCheck, LogOut, Ban, Undo2, Users, ScrollText, Gavel } from 'lucide-react';
import { Button } from '../Button';
import { fill, refusalWords } from '../../words';
import { textChannels } from '../DiscordPicks';

interface Moderator {
  userId: string;
  login: string;
  name: string;
  sessions: number;
  since: number;
  seenAt: number;
  online: number;
}
interface Blocked { userId: string; login: string; at: number }
interface Entry { at: number; userId: string; login: string; type: string; op?: string; what: string; times?: number }

interface Props {
  /** Ask the server (C2S.MODERATORS): { op: 'list' | 'block' | 'unblock' | 'signout' | 'activity', … }. */
  ask: (payload: any) => Promise<any>;
  language: string;
  light: boolean;
  openSettings: () => void;
  /** The Discord mod log (server/engine/moderation.js): its settings, latest entries, the server's channels, and saving. */
  modLog?: { settings?: { logChannelId: string }; entries: any[]; channels: any[]; save: (op: string, payload?: any) => Promise<any> };
  t: any;
}

/** What a request was, in words: the ones a moderator does most, by name; anything else by its own name, readably. */
const DID: Record<string, string> = {
  moderation: 'modDidModerate',
};
const readable = (type: string) => type.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());

function ago(at: number, language: string, t: any) {
  if (!at) return t.modsNever || '—';
  const s = Math.round((at - Date.now()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(language === 'es' ? 'es' : 'en', { numeric: 'auto' });
  const abs = Math.abs(s);
  if (abs < 60) return rtf.format(Math.round(s), 'second');
  if (abs < 3600) return rtf.format(Math.round(s / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(s / 3600), 'hour');
  return rtf.format(Math.round(s / 86400), 'day');
}

export const ModeratorsView = ({ ask, language, light, openSettings, modLog, t }: Props) => {
  const [state, setState] = useState<{ enabled: boolean; moderators: Moderator[]; blocked: Blocked[] } | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [who, setWho] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    try {
      const [list, activity] = await Promise.all([ask({ op: 'list' }), ask({ op: 'activity', userId: who, limit: 200 })]);
      setState(list);
      setEntries(activity?.entries || []);
    } catch (err: any) {
      setNote(refusalWords(t, err) || String(err?.message || err));
    }
  }, [ask, who, t]);

  useEffect(() => {
    load();
    const timer = setInterval(load, 10_000);
    return () => clearInterval(timer);
  }, [load]);

  const act = async (payload: any, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(`${payload.op}:${payload.userId}`);
    setNote('');
    try {
      const next = await ask(payload);
      if (next?.moderators) setState(next);
      await load();
    } catch (err: any) {
      setNote(refusalWords(t, err) || String(err?.message || err));
    } finally {
      setBusy('');
    }
  };

  const card = `rounded-3xl border p-5 ${light ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-900/50 border-zinc-800'}`;
  const heading = `text-sm font-black uppercase tracking-widest ${light ? 'text-zinc-800' : 'text-zinc-200'}`;
  const names = new Map((state?.moderators || []).map((m) => [m.userId, m.name || m.login]));

  return (
    <div className="animate-fade-in space-y-6 pb-20" data-moderators>
      <section className={card}>
        <div className="flex items-center gap-3 mb-3">
          <ShieldCheck className="text-current-accent" />
          <h3 className="text-xl font-extrabold uppercase tracking-tight">{t.moderatorsNav || 'Moderators'}</h3>
        </div>
        <p className="text-xs text-zinc-500 leading-relaxed max-w-3xl">
          {t.modsIntro || 'Every moderator of your Discord server can sign in to the dashboard with Discord. Here you see who has, who is here now and what they did — and you can sign one out or turn one away.'}
        </p>
        {state && !state.enabled && (
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/5 px-4 py-3" data-mods-signin-off>
            <p className="text-xs text-amber-200 flex-1 min-w-[12rem]">{t.modsSignInOff || 'Sign-in is off, so moderators cannot sign in yet — and anybody reaching the app has all of it. Switch it on in Settings → Sign-in.'}</p>
            <Button size="sm" onClick={openSettings}>{t.modsOpenSettings || 'Open Settings'}</Button>
          </div>
        )}
      </section>

      {/* ------------------------------------------------ who has signed in */}
      <section className={card}>
        <div className="flex items-center gap-2 mb-4">
          <Users size={16} className="text-current-accent" />
          <h4 className={heading}>{t.modsSignedIn || 'Signed in'}</h4>
        </div>
        {!state ? (
          <p className="text-xs text-zinc-500">{t.modsLoading || 'Loading…'}</p>
        ) : !state.moderators.length ? (
          <p className="text-xs text-zinc-500" data-mods-none>{t.modsNone || 'No moderator has signed in yet.'}</p>
        ) : (
          <ul className="space-y-3">
            {state.moderators.map((m) => (
              <li key={m.userId} className={`flex flex-wrap items-center gap-3 rounded-2xl border px-4 py-3 ${light ? 'border-zinc-200 bg-white' : 'border-zinc-800 bg-zinc-950/60'}`} data-mod={m.login}>
                <span className={`w-2 h-2 rounded-full shrink-0 ${m.online ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
                <div className="flex-1 min-w-[10rem]">
                  <p className={`text-sm font-bold ${light ? 'text-zinc-900' : 'text-white'}`}>{m.name || m.login}</p>
                  <p className="text-[11px] text-zinc-500">
                    {m.online ? (t.modsHereNow || 'Here now') : fill(t.modsLastSeen || 'Last seen {when}', { when: ago(m.seenAt, language, t) })}
                    {' · '}
                    {fill(m.sessions === 1 ? (t.modsOneBrowser || 'signed in on 1 browser') : (t.modsBrowsers || 'signed in on {count} browsers'), { count: m.sessions })}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="secondary" icon={<LogOut size={12} />} disabled={Boolean(busy)} data-mod-signout
                    onClick={() => act({ op: 'signout', userId: m.userId })}>
                    {t.modsSignOut || 'Sign out'}
                  </Button>
                  <Button size="sm" variant="danger" icon={<Ban size={12} />} disabled={Boolean(busy)} data-mod-block
                    onClick={() => act({ op: 'block', userId: m.userId, login: m.login }, fill(t.modsBlockConfirm || 'Turn {name} away from the dashboard? They are signed out now and cannot sign in again until you let them back in. They stay a moderator in Discord.', { name: m.name || m.login }))}>
                    {t.modsBlock || 'Turn away'}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {Boolean(state?.blocked.length) && (
          <div className="mt-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">{t.modsBlocked || 'Turned away'}</p>
            <ul className="space-y-2">
              {state!.blocked.map((b) => (
                <li key={b.userId} className="flex flex-wrap items-center gap-3 text-xs" data-mod-blocked={b.login}>
                  <span className={`flex-1 ${light ? 'text-zinc-700' : 'text-zinc-300'}`}>{b.login || b.userId} <span className="text-zinc-500">· {ago(b.at, language, t)}</span></span>
                  <Button size="sm" variant="secondary" icon={<Undo2 size={12} />} disabled={Boolean(busy)} data-mod-unblock
                    onClick={() => act({ op: 'unblock', userId: b.userId })}>
                    {t.modsUnblock || 'Let back in'}
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}
        {note && <p className="mt-4 text-xs font-bold text-zinc-400 bg-zinc-900/60 border border-zinc-800 rounded-2xl px-4 py-3" data-mods-note>{note}</p>}
      </section>

      {/* ------------------------------------------------- what they did */}
      <section className={card}>
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <ScrollText size={16} className="text-current-accent" />
          <h4 className={`${heading} flex-1`}>{t.modsActivity || 'What they did'}</h4>
          <select value={who} onChange={(e) => setWho(e.target.value)} className="bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-[11px] text-zinc-300" data-mods-filter>
            <option value="">{t.modsEveryone || 'Every moderator'}</option>
            {(state?.moderators || []).map((m) => <option key={m.userId} value={m.userId}>{m.name || m.login}</option>)}
          </select>
        </div>
        {!entries.length ? (
          <p className="text-xs text-zinc-500" data-mods-activity-none>{t.modsActivityNone || 'Nothing yet. When a moderator changes something from the dashboard, it shows here.'}</p>
        ) : (
          <ul className="divide-y divide-zinc-800/60" data-mods-activity>
            {entries.map((e, i) => (
              <li key={`${e.at}-${i}`} className="py-2 flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-xs">
                <span className="text-[10px] font-mono text-zinc-500 w-24 shrink-0">{ago(e.at, language, t)}</span>
                <span className={`font-bold ${light ? 'text-zinc-800' : 'text-zinc-200'}`}>{names.get(e.userId) || e.login}</span>
                <span className="text-zinc-400">{(DID[e.type] && t[DID[e.type]]) || readable(e.type)}{e.op && !DID[e.type] ? ` · ${e.op}` : ''}</span>
                {e.what && <span className="text-zinc-500 truncate max-w-full">“{e.what}”</span>}
                {(e.times || 1) > 1 && <span className="text-[10px] font-mono text-zinc-500">×{e.times}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ------------------------------------------------- the Discord mod log */}
      {modLog && (
        <section className={card} data-mod-log>
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <Gavel size={16} className="text-current-accent" />
            <h4 className={`${heading} flex-1`}>{t.modLogTitle || 'Mod log'}</h4>
            <select value={modLog.settings?.logChannelId || ''} onChange={(e) => modLog.save('settings', { settings: { logChannelId: e.target.value } }).catch((err: any) => setNote(refusalWords(t, err) || String(err?.message || err)))}
              className="bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-[11px] text-zinc-300 max-w-[220px]" data-mod-log-channel>
              <option value="">{t.modLogNowhere || 'Nowhere'}</option>
              {textChannels(modLog.channels).map((c: any) => <option key={c.id} value={c.id}>#{c.name}</option>)}
            </select>
          </div>
          <p className="text-xs text-zinc-500 leading-relaxed max-w-3xl mb-4">
            {t.modLogHint || 'When somebody is banned or timed out in your Discord server, this channel is told who, how long and why. Pick a channel only moderators can see.'}
          </p>
          {!modLog.entries.length ? (
            <p className="text-xs text-zinc-500">{t.modLogNone || 'No bans or timeouts yet.'}</p>
          ) : (
            <ul className="divide-y divide-zinc-800/60">
              {modLog.entries.slice(0, 20).map((e: any, i: number) => (
                <li key={`${e.at}-${i}`} className="py-2 flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-xs">
                  <span className="text-[10px] font-mono text-zinc-500 w-24 shrink-0">{ago(e.at, language, t)}</span>
                  <span className={`font-bold ${light ? 'text-zinc-800' : 'text-zinc-200'}`}>{e.user || e.userId}</span>
                  <span className="text-zinc-400">{e.kind === 'ban' ? (t.modLogBan || 'Banned') : (t.modLogTimeout || 'Timed out')}</span>
                  {e.reason && <span className="text-zinc-500 truncate max-w-full">“{e.reason}”</span>}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
};
