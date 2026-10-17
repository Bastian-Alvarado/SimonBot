/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Going live, announced in Discord (server/engine/watch.js, announce.js).
 *
 * The watch list first: the Twitch and YouTube channels the bot keeps an eye
 * on, with no sign-in. Each has its own post — where, who to ping, what it
 * says, what happens when the stream ends — and a setup can be copied from
 * one channel to another, or to all of them. Channels marked "mine" are the
 * streamer's own: while one of them is live, the stream is on.
 *
 * Then live DMs: viewers who asked are told privately instead.
 * Settings save as they change; the tests post for real, now.
 */
import { useEffect, useState } from 'react';
import { Megaphone, Send, Loader2, BellRing, Plus, Trash2, Copy, ChevronDown, ChevronUp, Star, RefreshCw } from 'lucide-react';
import { Button } from '../Button';
import { textChannels, pingableRoles } from '../DiscordPicks';
import { refusalWords, fill as fillWords } from '../../words';

export interface AlertSettings {
  enabled: boolean;
  channelId: string;
  roleId: string;
  message: string;
  card: boolean;
  cardColor: string;
  delaySeconds: number;
  whenOver: 'edit' | 'delete' | 'keep';
  overMessage: string;
}

export interface WatchedChannel {
  id: string;
  platform: 'twitch' | 'youtube';
  handle: string;
  name: string;
  avatar: string;
  mine: boolean;
  alert: AlertSettings;
  live: { on: boolean; since: number; title: string; game: string; url: string } | null;
  last: { channelId: string; messageId: string; at: number; test?: boolean } | null;
}

interface Props {
  watch?: { channels: WatchedChannel[]; lastEdited: string };
  control: (op: string, payload?: Record<string, any>) => Promise<any>;
  channels: any[];
  roles: any[];
  botConnected: boolean;
  /** Whether the keys for each platform are in (the Connections screen). */
  keys: { twitch: boolean; youtube: boolean };
  openConnections: () => void;
  liveDms?: any;
  liveDmsControl?: (op: string, payload?: Record<string, any>) => Promise<any>;
  t: any;
}

const box = 'w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-xs text-white outline-none focus:border-current-accent';
const tag = 'text-[9px] font-black uppercase tracking-widest text-zinc-500';
const PLATFORM_NAME = { twitch: 'Twitch', youtube: 'YouTube' };
const PLATFORM_COLOUR = { twitch: 'bg-[#9146ff]/20 text-[#c4a4ff]', youtube: 'bg-red-500/15 text-red-300' };

const Toggle = ({ on, onClick, ...rest }: { on: boolean; onClick: () => void; [k: string]: any }) => (
  <div onClick={onClick} className={`w-12 h-7 rounded-full p-1 cursor-pointer transition-colors shrink-0 ${on ? 'bg-current-accent' : 'bg-zinc-700'}`} {...rest}>
    <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${on ? 'translate-x-5' : ''}`} />
  </div>
);

/** One channel's post: the old single go-live form, now per channel, with copying. */
const AlertEditor = ({ entry, all, control, channels, roles, botConnected, t }: {
  entry: WatchedChannel; all: WatchedChannel[]; control: Props['control']; channels: any[]; roles: any[]; botConnected: boolean; t: any;
}) => {
  const s = entry.alert;
  const [draft, setDraft] = useState({ message: s.message, overMessage: s.overMessage });
  useEffect(() => { setDraft({ message: s.message, overMessage: s.overMessage }); }, [entry.id, s.message, s.overMessage]);
  const [said, setSaid] = useState('');
  const [testing, setTesting] = useState(false);
  const fail = (err: any) => setSaid(refusalWords(t, err) || String(err?.message || err));
  const save = (patch: Partial<AlertSettings>) => control('update', { id: entry.id, alert: patch }).catch(fail);
  const commit = (key: keyof typeof draft) => { if (draft[key] !== s[key]) save({ [key]: draft[key] } as any); };
  const others = all.filter((c) => c.id !== entry.id);

  const copyFrom = async (from: string) => {
    if (!from) return;
    setSaid('');
    try { await control('copy', { from, to: [entry.id] }); setSaid(t.watchCopied || 'Copied.'); } catch (err) { fail(err); }
  };
  const applyToAll = async () => {
    if (!window.confirm(t.watchApplyAllConfirm || 'Give every other channel on the list this same post setup?')) return;
    setSaid('');
    try {
      const r = await control('copy', { from: entry.id, to: 'all' });
      setSaid(fillWords(t.watchAppliedAll || 'Copied to {count} channels.', { count: String(r?.copied ?? 0) }));
    } catch (err) { fail(err); }
  };
  const runTest = async () => {
    setTesting(true);
    setSaid('');
    try { await control('test', { id: entry.id }); setSaid(t.goLiveTestSent || 'Posted — have a look in Discord.'); } catch (err) { fail(err); }
    finally { setTesting(false); }
  };

  return (
    <div className="space-y-5 pt-4 mt-3 border-t border-zinc-800/60" data-watch-alert={entry.id}>
      <div className="flex flex-wrap items-center gap-2">
        <Copy size={12} className="text-zinc-500" />
        <select value="" onChange={(e) => copyFrom(e.target.value)} disabled={!others.length} className="bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1.5 text-[11px] text-zinc-300 max-w-[240px]" data-watch-copy-from>
          <option value="">{t.watchCopyFrom || 'Copy setup from…'}</option>
          {others.map((c) => <option key={c.id} value={c.id}>{c.name} · {PLATFORM_NAME[c.platform]}</option>)}
        </select>
        <button onClick={applyToAll} disabled={!others.length} className="px-2.5 py-1.5 rounded-lg border border-zinc-800 text-[10px] font-bold text-zinc-400 hover:text-white disabled:opacity-40" data-watch-apply-all>
          {t.watchApplyAll || 'Use this setup for all'}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="space-y-1 block">
          <span className={tag}>{t.goLiveChannel || 'Announce in'}</span>
          <select value={s.channelId} onChange={(e) => save({ channelId: e.target.value })} className={box} data-watch-field="channelId">
            <option value="">{t.discordSendPickChannel || 'Choose a channel'}</option>
            {textChannels(channels).map((c: any) => <option key={c.id} value={c.id}>#{c.name}</option>)}
          </select>
        </label>
        <label className="space-y-1 block">
          <span className={tag}>{t.goLivePing || 'Ping'}</span>
          <select value={s.roleId} onChange={(e) => save({ roleId: e.target.value })} className={box}>
            <option value="">{t.goLiveNoPing || 'Nobody'}</option>
            <option value="everyone">@everyone</option>
            {pingableRoles(roles).map((r: any) => <option key={r.id} value={r.id}>@{r.name}</option>)}
          </select>
        </label>
      </div>

      <label className="space-y-1 block">
        <span className={tag}>{t.goLiveMessage || 'Message'}</span>
        <textarea value={draft.message} onChange={(e) => setDraft({ ...draft, message: e.target.value })} onBlur={() => commit('message')} className={`${box} h-20 resize-none`} />
        <span className="block text-[10px] text-zinc-600">{t.goLiveVars || '{role} is the ping, {streamer} the channel\'s name, {title} and {game} what the stream says, {link} where to watch.'}</span>
      </label>

      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={s.card} onChange={(e) => save({ card: e.target.checked })} className="accent-current-accent" />
          <span className="text-[11px] text-zinc-300">{t.goLiveCard || 'Card with the title, game and live picture'}</span>
        </label>
        {s.card && (
          <label className="flex items-center gap-2">
            <input type="color" value={s.cardColor} onChange={(e) => save({ cardColor: e.target.value })} className="w-7 h-7 bg-transparent border border-zinc-800 rounded cursor-pointer" />
            <span className="text-[10px] text-zinc-500">{t.discordSendCardColour || 'Card colour'}</span>
          </label>
        )}
        <label className="flex items-center gap-2 ml-auto">
          <span className="text-[10px] text-zinc-500">{t.goLiveDelay || 'Wait after going live (s)'}</span>
          <input type="number" min={0} max={600} value={s.delaySeconds} onChange={(e) => save({ delaySeconds: Number(e.target.value) })} className="w-20 bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-[11px] text-zinc-200" />
        </label>
      </div>

      <div className="space-y-2">
        <span className={tag}>{t.goLiveWhenOver || 'When the stream ends'}</span>
        <div className="flex flex-wrap gap-2">
          {([
            ['edit', t.goLiveOverEdit || 'Mark the post as over'],
            ['delete', t.goLiveOverDelete || 'Delete the post'],
            ['keep', t.goLiveOverKeep || 'Leave it'],
          ] as const).map(([value, text]) => (
            <button key={value} onClick={() => save({ whenOver: value })} className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold ${s.whenOver === value ? 'border-current-accent text-current-accent' : 'border-zinc-800 text-zinc-400 hover:text-white'}`}>{text}</button>
          ))}
        </div>
        {s.whenOver === 'edit' && (
          <>
            <textarea value={draft.overMessage} onChange={(e) => setDraft({ ...draft, overMessage: e.target.value })} onBlur={() => commit('overMessage')} placeholder={t.goLiveOverPlaceholder || 'The stream is over — thanks for watching!'} className={`${box} resize-y min-h-[52px]`} data-random-lines="go-live-over" />
            <p className="text-[10px] text-zinc-600">{t.oneLinePerOption || 'One per line: a different one is picked at random each time.'}</p>
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-zinc-800/60">
        <Button size="sm" icon={testing ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} onClick={runTest} disabled={testing || !s.channelId || !botConnected} data-watch-test>
          {t.goLiveTest || 'Post a test now'}
        </Button>
        <span className="text-[10px] text-zinc-500">{said || (entry.last ? `${t.goLiveLast || 'Last post'}: ${new Date(entry.last.at).toLocaleString()}${entry.last.test ? ` (${t.goLiveTestWord || 'test'})` : ''}` : '')}</span>
      </div>
      <p className="text-[10px] text-zinc-600">{t.goLiveTestHint || 'The test posts for real, with a ping if one is chosen — pick a quiet channel or take the ping off while you try it.'}</p>
    </div>
  );
};

/*
  Going live, told privately: viewers ask with a button on a sign-up post,
  choosing where they watch, and get a direct message with that link when
  the stream starts — instead of the whole server being pinged.
*/
const LiveDmsPanel = ({ state, control, channels, botConnected, t }: { state?: any; control: (op: string, payload?: any) => Promise<any>; channels: any[]; botConnected: boolean; t: any }) => {
  const s = { enabled: false, delaySec: 60, message: '', post: { channelId: '', messageId: '' }, count: 0, last: null, ...(state || {}) };
  const [message, setMessage] = useState(s.message);
  const [channelId, setChannelId] = useState(s.post.channelId);
  const [said, setSaid] = useState('');
  useEffect(() => { setMessage(s.message); }, [s.message]);
  useEffect(() => { setChannelId(s.post.channelId); }, [s.post.channelId]);
  const save = (patch: any) => control('settings', { settings: patch }).catch((err: any) => setSaid(refusalWords(t, err) || String(err)));
  const run = async (op: string, payload?: any) => {
    setSaid('');
    try {
      const r = await control(op, payload);
      setSaid(op === 'post' ? (r?.done === 'updated' ? (t.liveDmsUpdated || 'The sign-up post was updated.') : (t.liveDmsPosted || 'The sign-up post is up.')) : (t.goLiveTestSent || 'Posted — have a look in Discord.'));
    } catch (err: any) { setSaid(refusalWords(t, err) || String(err)); }
  };
  return (
    <div className="glass-panel rounded-3xl border border-zinc-800 p-6 space-y-4" data-live-dms>
      <div className="flex items-center gap-3">
        <BellRing size={16} className="text-current-accent" />
        <span className="text-[11px] font-black uppercase tracking-widest text-zinc-300 flex-1">{t.liveDmsTitle || 'Told privately'}</span>
        <span className="text-[10px] text-zinc-500" data-live-dms-count>{fillWords(t.liveDmsCount || '{count} signed up', { count: String(s.count || 0) })}</span>
        <Toggle on={s.enabled} onClick={() => save({ enabled: !s.enabled })} data-live-dms-toggle />
      </div>
      <p className="text-[11px] text-zinc-500 leading-relaxed">{t.liveDmsHint || 'Viewers press a button on a sign-up post in Discord, choosing where they watch, and get a direct message with that link when you go live — no ping for the whole server. Each message has a button to stop. The links are your own channels on the watch list.'}</p>
      <label className="space-y-1 block"><span className={tag}>{t.liveDmsMessage || 'The message'}</span>
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} onBlur={() => message !== s.message && save({ message })} className={`${box} resize-y min-h-[52px]`} data-random-lines="live-dm" />
        <span className="block text-[10px] text-zinc-600">{t.liveDmsVars || '{streamer}, {title}, {game} and {platform} — the link is a button under it.'} {t.oneLinePerOption || 'One per line: a different one is picked at random each time.'}</span></label>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2"><span className="text-[10px] text-zinc-500">{t.liveDmsDelay || 'Wait after going live (s)'}</span>
          <input type="number" min={0} max={600} value={s.delaySec} onChange={(e) => save({ delaySec: Number(e.target.value) })} className="w-20 bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-[11px] text-zinc-200" /></label>
        <select value={channelId} onChange={(e) => setChannelId(e.target.value)} className="bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1.5 text-[11px] text-zinc-200 max-w-[200px]" data-live-dms-channel>
          <option value="">{t.discordSendPickChannel || 'Choose a channel'}</option>
          {textChannels(channels).map((c: any) => <option key={c.id} value={c.id}>#{c.name}</option>)}
        </select>
        <Button size="sm" icon={<Send size={14} />} onClick={() => run('post', { channelId })} disabled={!botConnected || !channelId} data-live-dms-post>
          {s.post.messageId && s.post.channelId === channelId ? (t.liveDmsUpdate || 'Update the sign-up post') : (t.liveDmsPost || 'Post the sign-up post')}
        </Button>
        <Button size="sm" variant="secondary" onClick={() => run('test')} disabled={!botConnected} data-live-dms-test>{t.liveDmsTest || 'Test message'}</Button>
      </div>
      {s.last && <p className="text-[10px] text-zinc-600">{fillWords(t.liveDmsLast || 'Last stream: {sent} told, {failed} could not be reached.', { sent: String(s.last.sent), failed: String(s.last.failed) })}</p>}
      {said && <p className="text-[11px] text-zinc-400">{said}</p>}
    </div>
  );
};

export const GoLiveView = ({ watch, control, channels, roles, botConnected, keys, openConnections, liveDms, liveDmsControl, t }: Props) => {
  const list = watch?.channels || [];
  const [platform, setPlatform] = useState<'twitch' | 'youtube'>('twitch');
  const [input, setInput] = useState('');
  const [mine, setMine] = useState(list.length === 0);
  const [adding, setAdding] = useState(false);
  const [checking, setChecking] = useState(false);
  const [said, setSaid] = useState('');
  const [open, setOpen] = useState<string>('');
  const fail = (err: any) => setSaid(refusalWords(t, err) || String(err?.message || err));

  const add = async () => {
    if (!input.trim()) return;
    setAdding(true);
    setSaid('');
    try {
      const entry = await control('add', { platform, input: input.trim(), mine });
      setInput('');
      setMine(false);
      if (entry?.id) setOpen(entry.id);
    } catch (err) { fail(err); }
    finally { setAdding(false); }
  };
  const checkNow = async () => {
    setChecking(true);
    try { await control('check'); } catch (err) { fail(err); } finally { setChecking(false); }
  };
  const remove = (c: WatchedChannel) => {
    if (!window.confirm(fillWords(t.watchRemoveConfirm || 'Stop watching {name}? Its post setup goes too.', { name: c.name }))) return;
    control('remove', { id: c.id }).catch(fail);
  };

  return (
    <div className="animate-fade-in space-y-6 pb-20">
      <div className="glass-panel rounded-3xl border border-zinc-800 p-6 space-y-5" data-watch>
        <div className="flex items-center gap-3">
          <Megaphone size={16} className="text-current-accent" />
          <span className="text-[11px] font-black uppercase tracking-widest text-zinc-300 flex-1">{t.goLiveNav || 'Go live'}</span>
          <button onClick={checkNow} disabled={checking || !list.length} className="p-1.5 rounded-lg border border-zinc-800 text-zinc-400 hover:text-white disabled:opacity-40" title={t.watchCheckNow || 'Check now'} data-watch-check>
            {checking ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
          </button>
        </div>
        <p className="text-[11px] text-zinc-500 leading-relaxed">
          {t.watchHint || 'The Twitch and YouTube channels the bot watches. When one goes live, the bot posts in Discord — every channel with its own post. Mark your own channels with the star: while one of them is live, you are live (live DMs, points for coming, your pages).'}
        </p>
        {!botConnected && <p className="text-[11px] text-amber-400">{t.voiceNoBot || 'The Discord bot is not connected. Connect it on the Connections screen first.'}</p>}

        <div className="flex flex-wrap items-center gap-2" data-watch-add>
          <select value={platform} onChange={(e) => setPlatform(e.target.value as any)} className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white" data-watch-platform>
            <option value="twitch">Twitch</option>
            <option value="youtube">YouTube</option>
          </select>
          <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') add(); }}
            placeholder={platform === 'twitch' ? (t.watchTwitchPlaceholder || 'Twitch name or link') : (t.watchYoutubePlaceholder || '@handle, channel link or channel id')}
            className="flex-1 min-w-[12rem] bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-xs text-white outline-none focus:border-current-accent" data-watch-input />
          <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-zinc-300">
            <input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} className="accent-current-accent" data-watch-mine-new />
            {t.watchMine || 'Mine'}
          </label>
          <Button size="sm" icon={adding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} onClick={add} disabled={adding || !input.trim() || !keys[platform]} data-watch-add-button>
            {t.watchAdd || 'Watch'}
          </Button>
        </div>
        {!keys[platform] && (
          <p className="text-[11px] text-amber-400">
            {platform === 'twitch' ? (t.watchNeedsTwitchKeys || 'Add your Twitch Client ID and Client Secret on the Connections screen first.') : (t.watchNeedsYoutubeKey || 'Add a YouTube API key on the Connections screen first.')}
            {' '}<button onClick={openConnections} className="underline hover:text-white">{t.watchOpenConnections || 'Open Connections'}</button>
          </p>
        )}
        {said && <p className="text-[11px] text-rose-400" data-watch-said>{said}</p>}

        {!list.length ? (
          <p className="text-xs text-zinc-500" data-watch-empty>{t.watchEmpty || 'Nothing watched yet. Add your own channel first, then any others you want posts for.'}</p>
        ) : (
          <ul className="space-y-2" data-watch-list>
            {list.map((c) => (
              <li key={c.id} className="rounded-2xl border border-zinc-800 bg-zinc-950/50 px-4 py-3" data-watch-entry={c.id}>
                <div className="flex flex-wrap items-center gap-3">
                  {c.avatar ? <img src={c.avatar} alt="" className="w-8 h-8 rounded-full" /> : <div className="w-8 h-8 rounded-full bg-zinc-800" />}
                  <div className="flex-1 min-w-[8rem]">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{c.name}</span>
                      <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${PLATFORM_COLOUR[c.platform]}`}>{PLATFORM_NAME[c.platform]}</span>
                    </div>
                    <p className="text-[10px] text-zinc-500 truncate">
                      {c.live?.on
                        ? <><span className="text-rose-400 font-black">● LIVE</span>{c.live.title ? ` · ${c.live.title}` : ''}</>
                        : (t.watchOffline || 'Offline')}
                    </p>
                  </div>
                  <button onClick={() => control('update', { id: c.id, mine: !c.mine }).catch(fail)} title={t.watchMineHint || 'Your own channel'}
                    className={`p-1.5 rounded-lg border ${c.mine ? 'border-amber-400/50 text-amber-300' : 'border-zinc-800 text-zinc-600 hover:text-zinc-300'}`} data-watch-mine={c.id}>
                    <Star size={13} fill={c.mine ? 'currentColor' : 'none'} />
                  </button>
                  <Toggle on={c.alert.enabled} onClick={() => control('update', { id: c.id, alert: { enabled: !c.alert.enabled } }).catch(fail)} data-watch-enabled={c.id} />
                  <button onClick={() => setOpen(open === c.id ? '' : c.id)} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-zinc-800 text-[10px] font-bold text-zinc-300 hover:text-white" data-watch-open={c.id}>
                    {t.watchPost || 'Post'} {open === c.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                  <button onClick={() => remove(c)} className="p-1.5 rounded-lg border border-zinc-800 text-zinc-500 hover:text-rose-400" title={t.watchRemove || 'Stop watching'} data-watch-remove={c.id}><Trash2 size={13} /></button>
                </div>
                {!c.alert.channelId && c.alert.enabled && <p className="mt-2 text-[10px] text-amber-400">{t.watchNoChannel || 'No Discord channel chosen yet: open its post to pick one.'}</p>}
                {open === c.id && <AlertEditor entry={c} all={list} control={control} channels={channels} roles={roles} botConnected={botConnected} t={t} />}
              </li>
            ))}
          </ul>
        )}
      </div>

      {liveDmsControl && <LiveDmsPanel state={liveDms} control={liveDmsControl} channels={channels} botConnected={botConnected} t={t} />}
    </div>
  );
};
