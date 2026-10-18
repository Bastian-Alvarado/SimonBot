/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Discord voice: which call the bot follows, and who is in it right now.
 *
 * Which call is a channel, or a person — follow yourself and the bot goes
 * wherever you are. Seeing who is in it, muted or deafened, needs nothing
 * more: the bot hears that anyway. Seeing who is talking needs the bot to
 * join the call, muted, which everyone in it will see; it watches whose
 * voice is arriving and never records or decodes any of it, and it only sits
 * in a call with somebody in it.
 *
 * Groundwork for the bot's own voice features: the list here is what they
 * will read. Pinned people come first in it.
 */
import { useState } from 'react';
import { useDragOrder, DragGrip } from '../../hooks/useDragOrder';
import { moveToGap } from '../../../shared/list-order.js';
import { Headphones, MicOff, HeadphoneOff, Radio, Video, Pin, PinOff, ArrowUp, ArrowDown, UserRound, Hash } from 'lucide-react';
import { refusalWords } from '../../words';

export interface VoiceMember {
  id: string;
  name: string;
  avatar: string;
  speaking: boolean;
  muted: boolean;
  deafened: boolean;
  streaming: boolean;
  video: boolean;
  pinned?: boolean;
}

export interface VoiceState {
  channelId: string;
  /** The channel chosen, while following nobody; channelId is where the call is now. */
  chosenChannelId?: string;
  follow?: { id: string; name: string } | null;
  listen: boolean;
  status: 'off' | 'waiting' | 'joining' | 'listening' | 'error';
  error?: string | null;
  errorCode?: string | null;
  members: VoiceMember[];
  /** People who always come first, in order. */
  pinned?: { id: string; name: string }[];
  /** Who is in any call on the server, to choose somebody to follow. */
  inVoice?: { id: string; name: string; channelId: string }[];
}

interface Props {
  voice?: VoiceState;
  channels: { id: string; name: string; type: number }[];
  setVoice: (patch: Record<string, any>) => void;
  botConnected: boolean;
  t: any;
}

/** Discord's voice and stage channel types. */
const VOICE_TYPES = [2, 13];

const select = 'w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-xs text-white outline-none focus:border-current-accent';
const smallLabel = 'block text-[9px] font-black uppercase tracking-widest text-zinc-500';

export const VoiceView = ({ voice, channels, setVoice, botConnected, t }: Props) => {
  const voiceChannels = (channels || []).filter((c) => VOICE_TYPES.includes(c.type));
  const channelName = (id: string) => voiceChannels.find((c) => c.id === id)?.name || '';
  const state: VoiceState = voice || { channelId: '', listen: false, status: 'off', members: [] };
  const members = state.members || [];
  const [mode, setMode] = useState<'channel' | 'person'>(state.follow?.id ? 'person' : 'channel');

  const pinned = state.pinned || [];
  const isPinned = (id: string) => pinned.some((p) => p.id === id);
  const togglePin = (who: { id: string; name: string }) => setVoice({
    pinned: isPinned(who.id) ? pinned.filter((p) => p.id !== who.id) : [...pinned, { id: who.id, name: who.name }],
  });
  const movePin = (i: number, by: number) => {
    const j = i + by;
    if (j < 0 || j >= pinned.length) return;
    const next = [...pinned];
    [next[i], next[j]] = [next[j], next[i]];
    setVoice({ pinned: next });
  };
  const pinOrder = useDragOrder(({ from, gap }) => setVoice({ pinned: moveToGap(pinned, from, gap) }));

  // Somebody to follow: whoever is in a call now, and whoever is followed already.
  const followable = [...(state.inVoice || [])];
  if (state.follow?.id && !followable.some((p) => p.id === state.follow!.id)) followable.push({ id: state.follow.id, name: state.follow.name, channelId: '' });

  const statusText = !state.listen ? (t.voiceNotListening || 'Not listening — who is talking is not shown')
    : state.status === 'listening' ? (t.voiceListening || 'Listening — the bot is in the call, muted')
      : state.status === 'joining' && !state.errorCode ? (t.voiceJoining || 'Joining the call…')
        : state.errorCode === 'voice_error' ? `${t.refuseVoiceError || 'The voice connection failed:'} ${state.error || ''}`
          : String(refusalWords(t, { code: state.errorCode, message: state.error }) || t.voiceError || 'Could not join the call')
            .split('{name}').join(state.follow?.name || '');

  const card = (m: VoiceMember) => (
    <div key={m.id} className="flex flex-col items-center gap-2 p-3 rounded-2xl border bg-zinc-950/60 border-zinc-800" data-voice-member={m.speaking ? 'speaking' : 'quiet'}>
      <div className="relative">
        <img
          src={m.avatar} alt=""
          className="w-16 h-16 rounded-full object-cover"
          style={{
            boxShadow: m.speaking ? '0 0 0 3px #23a55a, 0 0 16px #23a55a88' : '0 0 0 3px transparent',
            // On at once with the word; off with a short fade, so a pause between words is not a blink.
            transition: m.speaking ? 'box-shadow 30ms linear' : 'box-shadow 180ms ease-out',
            opacity: m.deafened ? 0.5 : 1,
          }}
        />
        {(m.muted || m.deafened) && (
          <span className="absolute -bottom-1 -right-1 p-1 rounded-full bg-zinc-900 border border-zinc-700 text-rose-400">
            {m.deafened ? <HeadphoneOff size={11} /> : <MicOff size={11} />}
          </span>
        )}
        {(m.streaming || m.video) && (
          <span className="absolute -top-1 -right-1 p-1 rounded-full bg-zinc-900 border border-zinc-700 text-zinc-300"><Video size={11} /></span>
        )}
      </div>
      <span className={`block max-w-full text-center text-xs font-bold truncate ${m.speaking ? 'text-white' : 'text-zinc-400'}`}>{m.name}</span>
      <button
        onClick={() => togglePin(m)}
        title={m.pinned ? (t.voiceUnpin || 'Unpin') : (t.voicePin || 'Pin — always first')}
        className={`p-1 rounded-md border ${m.pinned ? 'border-current-accent text-current-accent' : 'border-zinc-800 text-zinc-500 hover:text-zinc-200'}`}
      >
        {m.pinned ? <PinOff size={10} /> : <Pin size={10} />}
      </button>
    </div>
  );

  return (
    <div className="animate-fade-in space-y-6 pb-20">
      <div className="glass-panel rounded-3xl border border-zinc-800 p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Headphones size={16} className="text-current-accent" />
          <span className="text-[11px] font-black uppercase tracking-widest text-zinc-300">{t.voiceNav || 'Voice call'}</span>
        </div>

        {!botConnected && (
          <p className="text-[11px] text-amber-400">{t.voiceNoBot || 'The Discord bot is not connected. Connect it on the Connections screen first.'}</p>
        )}

        {/* Which call: always one channel, or wherever one person is. */}
        <div className="space-y-2">
          <div className="flex gap-1 bg-zinc-900/60 p-0.5 rounded-lg border border-zinc-800 w-fit" data-voice-mode={mode}>
            {([['channel', Hash, t.voiceWhichChannel || 'A channel'], ['person', UserRound, t.voiceWhichPerson || 'Follow a person']] as const).map(([id, Icon, text]) => (
              <button
                key={id}
                onClick={() => { setMode(id); if (id === 'channel' && state.follow) setVoice({ follow: null }); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest ${mode === id ? 'bg-current-accent text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                <Icon size={12} /> {text}
              </button>
            ))}
          </div>
          {mode === 'channel' ? (
            <label className="block space-y-1">
              <span className={smallLabel}>{t.voiceChannel || 'Voice channel'}</span>
              <select value={state.chosenChannelId ?? state.channelId} onChange={(e) => setVoice({ channelId: e.target.value, follow: null })} className={select}>
                <option value="">{t.voiceChooseChannel || 'Choose a voice channel'}</option>
                {voiceChannels.map((c) => <option key={c.id} value={c.id}>🔊 {c.name}</option>)}
              </select>
            </label>
          ) : (
            <label className="block space-y-1">
              <span className={smallLabel}>{t.voiceFollowWho || 'Whose call to follow'}</span>
              <select
                value={state.follow?.id || ''}
                onChange={(e) => {
                  const who = followable.find((p) => p.id === e.target.value);
                  setVoice({ follow: who ? { id: who.id, name: who.name } : null });
                }}
                className={select} data-voice-follow
              >
                <option value="">{t.voiceFollowChoose || 'Choose somebody — yourself, usually'}</option>
                {followable.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}{p.channelId ? ` · 🔊 ${channelName(p.channelId) || '…'}` : ` · ${t.voicePinnedAway || 'not in a call'}`}
                  </option>
                ))}
              </select>
              <span className="block text-[10px] text-zinc-600 leading-relaxed">
                {t.voiceFollowHint || 'The bot follows whichever voice channel they are in, and moves with them. Only people in a call right now are listed — join one to choose yourself.'}
              </span>
            </label>
          )}
        </div>

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox" className="mt-0.5 accent-current-accent"
            checked={state.listen} disabled={!state.chosenChannelId && !state.follow?.id && !state.channelId}
            onChange={(e) => setVoice({ listen: e.target.checked })}
          />
          <span className="space-y-1">
            <span className="block text-xs font-bold text-zinc-200">{t.voiceListen || 'Join the call and see who is talking'}</span>
            <span className="block text-[10px] text-zinc-500 leading-relaxed">
              {t.voiceListenHint || 'The bot joins the call, muted, so it can tell who is talking. Everyone in the call will see it there. It only watches whose voice is arriving — nothing is recorded, decoded or kept.'}
            </span>
            <span className="block text-[10px] text-zinc-500 leading-relaxed">
              {t.voiceLeaveHint || 'It only stays while somebody is in the call: once everybody has been gone for two minutes it leaves, and it joins again when somebody comes back.'}
            </span>
          </span>
        </label>

        <div className="flex items-center gap-2 text-[10px]" data-voice-status={state.status}>
          <Radio size={12} className={state.status === 'listening' ? 'text-emerald-400' : state.status === 'error' ? 'text-rose-400' : 'text-zinc-500'} />
          <span className={state.status === 'error' ? 'text-rose-400' : 'text-zinc-400'}>{statusText}</span>
        </div>
      </div>

      <div className="glass-panel rounded-3xl border border-zinc-800 p-6">
        {!state.channelId ? (
          <p className="text-[10px] text-zinc-600 uppercase tracking-widest">
            {state.follow?.id
              ? String(t.voiceFollowNotInCall || '{name} is not in a call right now.').split('{name}').join(state.follow.name)
              : (t.voiceNoChannel || 'Choose a channel to see who is in it.')}
          </p>
        ) : members.length === 0 ? (
          <p className="text-[10px] text-zinc-600 uppercase tracking-widest">{t.voiceEmpty || 'Nobody is in that channel right now.'}</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4" data-voice-members>
            {members.map(card)}
          </div>
        )}

        {pinned.length > 0 && (
          <div className="mt-5 space-y-2" data-voice-pinned>
            <span className={smallLabel}>{t.voicePinnedTitle || 'Always first, in this order'}</span>
            <div ref={pinOrder.listRef} className="relative space-y-1.5 max-w-md">
              {pinOrder.line}
              {pinned.map((p, i) => {
                const here = members.some((m) => m.id === p.id);
                return (
                  <div key={p.id} {...pinOrder.row(p.id)} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-zinc-800 bg-zinc-950/60 ${pinOrder.held === p.id ? 'opacity-40' : ''}`}>
                    {pinned.length > 1 && <DragGrip grip={pinOrder.grip(p.id)} title={t.voicePinnedDrag || 'Drag to change who comes first'} size={12} className="-ml-1.5 -my-1" />}
                    <span className="w-4 text-[10px] font-black text-zinc-500 tabular-nums">{i + 1}</span>
                    <span className={`flex-1 min-w-0 truncate text-[11px] font-bold ${here ? 'text-zinc-200' : 'text-zinc-500'}`}>{p.name || p.id}</span>
                    {!here && <span className="text-[9px] text-zinc-600">{t.voicePinnedAway || 'not in a call'}</span>}
                    <button onClick={() => movePin(i, -1)} disabled={i === 0} className="p-1 text-zinc-500 hover:text-zinc-200 disabled:opacity-30"><ArrowUp size={11} /></button>
                    <button onClick={() => movePin(i, 1)} disabled={i === pinned.length - 1} className="p-1 text-zinc-500 hover:text-zinc-200 disabled:opacity-30"><ArrowDown size={11} /></button>
                    <button onClick={() => togglePin(p)} title={t.voiceUnpin || 'Unpin'} className="p-1 text-zinc-500 hover:text-rose-400"><PinOff size={11} /></button>
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] text-zinc-600">{t.voicePinnedHint || 'Pinned people come first in the list, in this order. Everybody else follows in the order they joined.'}</p>
          </div>
        )}
      </div>
    </div>
  );
};
