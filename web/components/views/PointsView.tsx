/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Points: a score apart from XP. What they are called, how they are earned,
 * the words chat asks with, and who has the most — with giving or taking by
 * hand.
 *
 * Settings are a draft here until saved, as on Levels & XP: a typed number
 * is not a change until it is meant.
 */
import { useEffect, useState } from 'react';
import { Coins, Plus, Save, Undo2, Loader2, RefreshCw, AlertTriangle, CheckCircle2, Minus } from 'lucide-react';
import { EmojiField } from '../EmojiField';
import { refusalWords, fill } from '../../words';

interface Settings {
  enabled: boolean; name: string; emoji: string;
  earn: Record<string, number>;
  words: { balance: string; give: string };
}
interface Props {
  settings?: Settings;
  control: (op: string, payload?: Record<string, any>) => Promise<any>;
  /** The server's own emoji, for the points' emoji. */
  emojis?: any[];
  t: any;
}

const box = 'w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-current-accent';
const tag = 'text-[9px] font-black uppercase tracking-widest text-zinc-500';
const smallButton = 'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-[10px] font-bold text-zinc-300 hover:text-white hover:border-zinc-600 disabled:opacity-40';
const EARN_FIELDS: [string, string, string][] = [
  ['message', 'pointsEarnMessage', 'Talking'],
  ['messageEverySec', 'pointsEarnEvery', '…at most every (s)'],
  ['stream', 'pointsEarnStream', 'Coming to a stream'],
  ['streakStep', 'pointsEarnStreak', '+ per stream in a row'],
  ['streakMax', 'pointsEarnStreakMax', 'Streak bonus at most'],
];
export const PointsView = ({ settings, control, emojis = [], t }: Props) => {
  const [draft, setDraft] = useState<Settings | null>(settings || null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState('');
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [board, setBoard] = useState<{ richest: any[]; log: any[] }>({ richest: [], log: [] });
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  useEffect(() => { if (!dirty && settings) setDraft(settings); }, [settings, dirty]);
  const loadBoard = () => control('board', { limit: 50 }).then((b) => setBoard(b || { richest: [], log: [] })).catch(() => {});
  useEffect(() => { loadBoard(); }, []);

  const change = (patch: Partial<Settings>) => { if (draft) { setDraft({ ...draft, ...patch }); setDirty(true); } };
  const say = (ok: boolean, text: string) => setResult({ ok, text });

  const save = async () => {
    if (!draft) return;
    setBusy('save');
    try {
      await control('settings', { settings: draft });
      setDirty(false);
      say(true, t.pointsSaved || 'Saved.');
    } catch (err: any) { say(false, refusalWords(t, err) || String(err?.message || err)); }
    finally { setBusy(''); }
  };
  const give = async (uid: string, sign: 1 | -1) => {
    const n = Math.abs(Math.round(Number(amounts[uid] || 0)));
    if (!n) return;
    try {
      await control('give', { uid, amount: sign * n });
      setAmounts((a) => ({ ...a, [uid]: '' }));
      loadBoard();
    } catch (err: any) { say(false, refusalWords(t, err) || String(err?.message || err)); }
  };

  if (!draft) return <div className="text-xs text-zinc-500 p-8">{t.pointsLoading || 'Loading…'}</div>;
  const unit = `${draft.emoji ? `${draft.emoji} ` : ''}${draft.name}`;

  return (
    <div className="animate-fade-in space-y-6 pb-20" data-points>
      <div className="glass-panel rounded-3xl border border-zinc-800 p-6 space-y-5">
        <div className="flex items-center gap-3">
          <Coins size={16} className="text-current-accent" />
          <span className="text-[11px] font-black uppercase tracking-widest text-zinc-300 flex-1">{t.pointsNav || 'Points'}</span>
          <div onClick={() => change({ enabled: !draft.enabled })} className={`w-12 h-7 rounded-full p-1 cursor-pointer transition-colors ${draft.enabled ? 'bg-current-accent' : 'bg-zinc-700'}`} data-points-toggle>
            <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${draft.enabled ? 'translate-x-5' : ''}`} />
          </div>
        </div>
        <p className="text-[11px] text-zinc-500 leading-relaxed">{t.pointsHint || 'A score apart from XP: XP makes levels and only goes up; points are earned the same way, can be given or taken by hand, and have a board of their own. Earned by talking in Discord and coming to your streams.'}</p>

        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-end">
          <label className="space-y-1 block"><span className={tag}>{t.pointsName || 'What they are called'}</span>
            <input value={draft.name} onChange={(e) => change({ name: e.target.value.slice(0, 24) })} className={box} data-points-name /></label>
          <div className="space-y-1"><span className={tag}>{t.pointsEmoji || 'Emoji'}</span>
            <div><EmojiField value={draft.emoji} onChange={(emoji) => change({ emoji })} customEmojis={emojis} t={t} /></div></div>
        </div>

        <div className="space-y-2">
          <span className={tag}>{t.pointsEarning || 'Earned for'}</span>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2" data-points-earn>
            {EARN_FIELDS.map(([key, word, fallback]) => (
              <label key={key} className="bg-zinc-950/50 border border-zinc-800 rounded-xl px-3 py-2 flex items-center gap-2">
                <span className="text-[10px] text-zinc-400 flex-1 leading-tight">{t[word] || fallback}</span>
                <input type="number" min={0} value={draft.earn[key] ?? 0} onChange={(e) => change({ earn: { ...draft.earn, [key]: Number(e.target.value) } })} className="w-16 bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1 text-[11px] text-white text-right" />
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <span className={tag}>{t.pointsWords || 'In chat'}</span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(['balance', 'give'] as const).map((k) => (
              <label key={k} className="space-y-1 block">
                <span className="text-[10px] text-zinc-500">{{ balance: t.pointsWordBalance || 'Balance', give: t.pointsWordGive || 'Give (mods)' }[k]}</span>
                <input value={draft.words[k]} onChange={(e) => change({ words: { ...draft.words, [k]: e.target.value } })} className={`${box} font-mono`} />
              </label>
            ))}
          </div>
          <p className="text-[10px] text-zinc-600">{fill(t.pointsChatHow || 'In Discord: {balance} for a balance. Moderators: {give} @name 100.', { balance: draft.words.balance, give: draft.words.give })}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 justify-end sticky bottom-4 z-10">
        {result && <span className={`text-[11px] flex items-center gap-1 mr-auto ${result.ok ? 'text-emerald-400' : 'text-rose-400'}`} data-points-result>{result.ok ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />} {result.text}</span>}
        {dirty && <button onClick={() => { setDraft(settings || null); setDirty(false); }} className={smallButton}><Undo2 size={11} /> {t.pointsDiscard || 'Undo changes'}</button>}
        <button onClick={save} disabled={!dirty || !!busy} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-current-accent text-white text-[11px] font-black disabled:opacity-40" data-points-save>
          {busy === 'save' ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} {t.pointsSave || 'Save'}
        </button>
      </div>

      {/* Who has the most, and giving or taking by hand. */}
      <div className="glass-panel rounded-3xl border border-zinc-800 p-6 space-y-3" data-points-board>
        <div className="flex items-center gap-3">
          <Coins size={16} className="text-current-accent" />
          <span className="text-[11px] font-black uppercase tracking-widest text-zinc-300 flex-1">{t.pointsRichest || 'Who has the most'}</span>
          <button onClick={loadBoard} className={smallButton}><RefreshCw size={11} /></button>
        </div>
        {board.richest.length === 0 && <p className="text-[11px] text-zinc-600 italic">{t.pointsNobody || 'Nobody has points yet.'}</p>}
        <div className="divide-y divide-zinc-800/60">
          {board.richest.map((p, i) => (
            <div key={p.uid} className="flex items-center gap-3 py-2" data-points-person={p.uid}>
              <span className="text-[10px] font-mono text-zinc-600 w-6">#{i + 1}</span>
              {p.avatar ? <img src={p.avatar} alt="" className="w-6 h-6 rounded-full" /> : <div className="w-6 h-6 rounded-full bg-zinc-800" />}
              <span className="text-xs font-bold text-white flex-1 truncate">{p.name}</span>
              <span className="text-xs font-mono text-amber-300">{Number(p.points).toLocaleString()} {unit}</span>
              <input value={amounts[p.uid] || ''} onChange={(e) => setAmounts((a) => ({ ...a, [p.uid]: e.target.value.replace(/[^\d]/g, '') }))} placeholder="100" className="w-16 bg-zinc-900 border border-zinc-800 rounded px-1.5 py-1 text-[10px] text-white text-right" />
              <button onClick={() => give(p.uid, 1)} className="p-1 text-zinc-500 hover:text-emerald-400" title={t.pointsGive || 'Give'}><Plus size={12} /></button>
              <button onClick={() => give(p.uid, -1)} className="p-1 text-zinc-500 hover:text-rose-400" title={t.pointsTake || 'Take'}><Minus size={12} /></button>
            </div>
          ))}
        </div>
        {board.log.length > 0 && (
          <details className="pt-2">
            <summary className="text-[10px] text-zinc-500 cursor-pointer">{t.pointsLog || 'Recent changes'}</summary>
            <div className="mt-2 space-y-1 max-h-64 overflow-y-auto">
              {board.log.map((l, i) => (
                <div key={i} className="flex items-center gap-2 text-[10px]">
                  <span className="text-zinc-600 font-mono w-28 shrink-0">{new Date(l.at).toLocaleString()}</span>
                  <span className="text-zinc-300 truncate flex-1">{l.name}</span>
                  <span className={l.delta > 0 ? 'text-emerald-400' : 'text-rose-400'}>{l.delta > 0 ? '+' : ''}{l.delta}</span>
                  <span className="text-zinc-500 truncate w-32">{l.why}</span>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
    </div>
  );
};
