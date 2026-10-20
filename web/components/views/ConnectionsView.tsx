/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Connections: the Discord bot, and the keys the go-live alerts read Twitch
 * and YouTube with. Nothing here signs in to Twitch or YouTube: the watch
 * list (Go live) asks both only whether a channel is live, which needs an
 * app of your own on each, not an account.
 */
import React, { useEffect } from 'react';
import { Button } from '../Button';
import { ThemeConfig } from '../../types';
import { ExternalLink, LogOut, Wifi, WifiOff, ToggleRight, ToggleLeft } from 'lucide-react';
import { copyText } from '../../utils';

const TwitchIcon = ({ size = 24, className = "" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} width={size} height={size}><path d="M21 2H3v16h5v4l4-4h5l4-4V2zm-10 9V7m5 4V7" /></svg>
);
const DiscordIcon = ({ size = 24, className = "" }: { size?: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6034.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.419-2.1569 2.419zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.419-2.1568 2.419z"/>
  </svg>
);


/**
 * What a platform needs registering before its login will work.
 *
 * Every one of these asks you to register a redirect URL on its developer
 * portal, and the value is not something to guess: it is the address this page
 * was opened at. Getting it wrong produces a rejection at the end of the login
 * flow rather than at the start, which is a miserable way to find out. It was
 * only ever written to the browser console, where nobody was looking.
 */
const DevPortalSetup = ({ href, redirectUri, accent, t }: {
  href: string;
  redirectUri: string;
  accent: string;
  t: any;
}) => {
  const [copied, setCopied] = React.useState(false);

  const copy = () => {
    copyText(redirectUri);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="mt-3 bg-black/30 rounded-xl p-3 border border-white/5 text-left">
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">{t.redirectToRegister}</span>
        <button
          onClick={copy}
          className="text-[9px] font-bold px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors shrink-0"
        >
          {copied ? t.copied : t.copyIt}
        </button>
      </div>
      <code className="text-[10px] font-mono break-all block" style={{ color: accent }}>{redirectUri}</code>
      <p className="text-[9px] text-zinc-600 leading-relaxed mt-2">{t.redirectExactHint}</p>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[10px] font-bold mt-2 inline-flex items-center gap-1 hover:underline"
        style={{ color: accent }}
      >
        {t.openDevPortal} <ExternalLink size={10} />
      </a>
    </div>
  );
};

/** A key typed in, kept on the server and never shown again. */
const SecretField = ({ label, value, onChange, stored, placeholder, accent, t, field }: {
  label: string; value: string; onChange: (v: string) => void; stored: boolean; placeholder: string; accent: string; t: any; field: string;
}) => (
  <div>
    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2 block text-left">{label}</label>
    <input
      type="password"
      autoComplete="off"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={stored && !value ? '••••••••••••' : placeholder}
      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-xs font-mono text-white outline-none"
      style={{ borderColor: value ? accent : undefined }}
      data-secret-field={field}
    />
    <p className="text-[10px] text-zinc-600 mt-1 text-left">{stored && !value ? t.secretStored : t.secretNeverShown}</p>
  </div>
);

/** Where an app's keys come from: the site, in a sentence and a link. */
const WhereFrom = ({ href, text, accent, t }: { href: string; text: string; accent: string; t: any }) => (
  <div className="bg-black/30 rounded-xl p-3 border border-white/5 text-left">
    <p className="text-[10px] text-zinc-400 leading-relaxed">{text}</p>
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold mt-2 inline-flex items-center gap-1 hover:underline" style={{ color: accent }}>
      {t.openDevPortal} <ExternalLink size={10} />
    </a>
  </div>
);

/** Whether the alerts can read a platform: working, not set up, or failing — and why. */
const KeyStatus = ({ state, message, t }: { state: string; message?: string | null; t: any }) => {
  const [tone, title] = state === 'connected'
    ? ['border-green-500/30 bg-green-500/5 text-green-300', t.keysWork || 'The keys work: go-live alerts can read it']
    : state === 'quota'
      ? ['border-amber-500/30 bg-amber-500/5 text-amber-200', t.youtubeQuota || 'Daily YouTube allowance used up']
      : state === 'error'
        ? ['border-amber-500/30 bg-amber-500/5 text-amber-200', t.keysFail || 'The keys did not work']
        : ['border-zinc-700 bg-zinc-900/60 text-zinc-400', t.keysMissing || 'Not set up: its channels are not checked'];
  return (
    <div className={`rounded-2xl border p-4 text-left ${tone}`} data-key-status={state}>
      <div className="text-[11px] font-black uppercase tracking-widest">{title}</div>
      {message ? <div className="text-[11px] opacity-80 mt-1 break-words">{message}</div> : null}
    </div>
  );
};

const Status = ({ on, t }: { on: boolean; t: any }) => (
  <span className="text-xs font-bold text-zinc-500 flex items-center gap-2">
    {on ? <span className="text-green-500 flex items-center gap-1"><Wifi size={12} /> {t.online}</span> : <span className="text-zinc-500 flex items-center gap-1"><WifiOff size={12} /> {t.offline}</span>}
  </span>
);

interface ConnectionsViewProps {
  // Discord: the bot, and the server it looks after.
  discordToken: string | null;
  setDiscordToken: (token: string | null) => void;
  discordChannelId: string | null;
  setDiscordChannelId: (id: string | null) => void;
  discordStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  connectDiscord: (clientId: string) => void;
  disconnectDiscord: () => void;
  discordUser: any;
  guilds: any[];
  channels: any[];
  fetchChannels: (guildId: string) => void;
  handleDiscordConnect: (channelId: string) => void;
  /** Whether chat words answer in every channel of the server, or only the one picked. */
  discordCommandsEverywhere?: boolean;
  setDiscordCommandsEverywhere?: (on: boolean) => void;
  discordGuildId: string | null;
  setDiscordGuildId: (id: string | null) => void;
  discordBotToken?: string;
  setDiscordBotToken?: (v: string) => void;
  discordHasBotToken?: boolean;
  discordClientSecret?: string;
  setDiscordClientSecret?: (v: string) => void;
  discordHasClientSecret?: boolean;

  // Twitch: an app's Client ID and secret, for asking who is live.
  twitchClientId?: string;
  setTwitchClientId?: (id: string) => void;
  twitchClientSecret?: string;
  setTwitchClientSecret?: (v: string) => void;
  twitchHasSecret?: boolean;
  twitchStatus?: string;
  twitchError?: string | null;

  // YouTube: an API key.
  youtubeApiKey?: string;
  setYoutubeApiKey?: (v: string) => void;
  youtubeHasKey?: boolean;
  youtubeStatus?: string;
  youtubeError?: string | null;

  activeTheme: ThemeConfig;
  t: any;
}

export const ConnectionsView: React.FC<ConnectionsViewProps> = ({
  discordToken, setDiscordToken, discordChannelId, setDiscordChannelId, discordStatus, connectDiscord, disconnectDiscord, discordUser, guilds, channels, fetchChannels, handleDiscordConnect, discordGuildId, setDiscordGuildId, discordCommandsEverywhere = true, setDiscordCommandsEverywhere,
  discordBotToken, setDiscordBotToken, discordHasBotToken,
  discordClientSecret, setDiscordClientSecret, discordHasClientSecret,
  twitchClientId, setTwitchClientId, twitchClientSecret, setTwitchClientSecret, twitchHasSecret, twitchStatus = 'disconnected', twitchError,
  youtubeApiKey, setYoutubeApiKey, youtubeHasKey, youtubeStatus = 'disconnected', youtubeError,
  activeTheme, t
}) => {

  // Auto-fetch channels if we have a persisted guild ID on reload
  useEffect(() => {
      if (discordStatus === 'connected' && discordGuildId && channels.length === 0) {
          fetchChannels(discordGuildId);
      }
  }, [discordStatus, discordGuildId, channels.length, fetchChannels]);

  const panel = `glass-panel p-8 rounded-[40px] border ${activeTheme.borderClass} ${activeTheme.panelClass} relative overflow-hidden`;

  return (
    <div className="animate-fade-in space-y-12 pb-20">
       <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* DISCORD */}
          <div className={`glass-panel p-8 rounded-[40px] border ${activeTheme.borderClass} ${activeTheme.panelClass} relative overflow-hidden`}>
             <div className="flex items-center justify-between mb-6 relative z-10">
                 <div className="flex items-center gap-4">
                    <div className="p-3 bg-[#5865F2] rounded-2xl text-white shadow-lg shadow-[#5865F2]/20"><DiscordIcon size={24} /></div>
                    <div> <h3 className="text-xl font-black uppercase tracking-tight text-[#5865F2]">Discord</h3> <span className="text-xs font-bold text-zinc-500 flex items-center gap-2"> {discordStatus === 'connected' ? <span className="text-green-500 flex items-center gap-1"><Wifi size={12} /> {t.online}</span> : <span className="text-zinc-500 flex items-center gap-1"><WifiOff size={12} /> {t.offline}</span>} </span> </div>
                 </div>
             </div>
             
             <div className="space-y-6 relative z-10">
                 {!discordUser ? (
                    <div className="bg-zinc-900/50 rounded-2xl p-6 border border-zinc-800 text-center">
                        <div className="mb-4">
                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2 block text-left">{t.discordClientId}</label>
                            <input type="text" value={discordToken || ''} onChange={(e) => setDiscordToken(e.target.value)} placeholder="123456789..." className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-xs font-mono text-white focus:border-[#5865F2] outline-none" />
                        <div className="mb-4">
                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2 block text-left">{t.discordBotToken}</label>
                            <input
                                type="password"
                                autoComplete="off"
                                value={discordBotToken || ''}
                                onChange={(e) => setDiscordBotToken && setDiscordBotToken(e.target.value)}
                                placeholder={t.discordBotTokenPlaceholder}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-xs font-mono text-white focus:border-[#5865F2] outline-none"
                            />
                            <p className="text-[10px] text-zinc-600 mt-1 text-left">
                                {discordHasBotToken && !discordBotToken ? t.secretStored : t.secretNeverShown}
                            </p>
                        </div>
                        <div className="mb-4">
                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2 block text-left">{t.discordClientSecret}</label>
                            <input
                                type="password"
                                autoComplete="off"
                                value={discordClientSecret || ''}
                                onChange={(e) => setDiscordClientSecret && setDiscordClientSecret(e.target.value)}
                                placeholder={t.discordClientSecretPlaceholder}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-xs font-mono text-white focus:border-[#5865F2] outline-none"
                            />
                            <p className="text-[10px] text-zinc-600 mt-1 text-left">
                                {discordHasClientSecret && !discordClientSecret ? t.secretStored : t.secretNeverShown}
                            </p>
                        </div>
                            <DevPortalSetup
                              href="https://discord.com/developers/applications"
                              redirectUri={typeof window !== 'undefined' ? window.location.origin + window.location.pathname : ''}
                              accent="#5865F2"
                              t={t}
                            />
                        </div>
                        <Button className="w-full bg-[#5865F2] hover:bg-[#4752c4] text-white" onClick={() => connectDiscord(discordToken || '')} disabled={!discordToken}>
                            {t.discordLogin || 'Login with Discord'}
                        </Button>
                    </div>
                 ) : (
                    <div className="space-y-4">
                        <div className="bg-zinc-900/50 rounded-2xl p-4 border border-zinc-800 flex items-center justify-between">
                             <div className="flex items-center gap-3">
                                {discordUser.avatar && <img src={`https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`} className="w-10 h-10 rounded-full border-2 border-[#5865F2]" alt="" />}
                                <div> <div className="font-bold text-white">{discordUser.global_name || discordUser.username}</div> <div className="text-[10px] text-zinc-500 uppercase font-mono">{t.connected}</div> </div>
                             </div>
                             <Button size="sm" variant="secondary" onClick={disconnectDiscord} icon={<LogOut size={14} />}>{t.twitchLogout}</Button>
                        </div>

                        {/* Channel Selector */}
                        <div className="space-y-2">
                             <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{t.activeChannelBot}</label>
                             <div className="flex gap-2">
                                 <select 
                                     value={discordGuildId || ''} 
                                     onChange={(e) => { setDiscordGuildId(e.target.value); fetchChannels(e.target.value); }} 
                                     className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-medium text-white outline-none"
                                 >
                                     <option value="">{t.discordPickServer || 'Select Server...'}</option>
                                     {guilds.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                                 </select>
                                 <select 
                                     value={discordChannelId || ''} 
                                     onChange={(e) => { setDiscordChannelId(e.target.value); handleDiscordConnect(e.target.value); }} 
                                     className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-medium text-white outline-none"
                                     disabled={!discordGuildId}
                                 >
                                     <option value="">Select Channel...</option>
                                     {channels.map(c => <option key={c.id} value={c.id}>#{c.name}</option>)}
                                 </select>
                             </div>
                             <p className="text-[10px] text-zinc-600">{t.botMustBeInServer}</p>
                             <button data-discord-commands-everywhere onClick={() => setDiscordCommandsEverywhere?.(!discordCommandsEverywhere)} className={`w-full p-3 rounded-xl border flex items-center justify-between gap-3 text-left ${discordCommandsEverywhere ? 'bg-[#5865F2]/10 border-[#5865F2] text-[#5865F2]' : 'bg-zinc-900 border-zinc-800 text-zinc-500'}`}>
                                 <span className="flex flex-col"><span className="text-xs font-bold">{t.discordCommandsEverywhere || 'Commands work in every channel'}</span><span className="text-[10px] font-medium opacity-80">{t.discordCommandsEverywhereHint || 'Off: the chat words — !pregunta, !rank and the rest — work only in the channel above. Either way they answer in the channel they were typed in.'}</span></span>
                                 {discordCommandsEverywhere ? <ToggleRight size={18} className="shrink-0" /> : <ToggleLeft size={18} className="shrink-0" />}
                             </button>
                        </div>
                        
                    </div>
                 )}
             </div>
          </div>


          {/* TWITCH: an app's keys, for the go-live alerts */}
          <div className={panel} data-connection="twitch">
             <div className="flex items-center gap-4 mb-6 relative z-10">
                <div className="p-3 bg-[#9146FF] rounded-2xl text-white shadow-lg shadow-[#9146FF]/20"><TwitchIcon size={24} /></div>
                <div> <h3 className="text-xl font-black uppercase tracking-tight text-[#9146FF]">Twitch</h3> <Status on={twitchStatus === 'connected'} t={t} /> </div>
             </div>
             <div className="space-y-4 relative z-10">
                <p className="text-xs text-zinc-400 leading-relaxed">{t.twitchAlertsOnly || 'Only for go-live alerts: Twitch is asked whether the channels on your watch list are live. Nobody signs in.'}</p>
                <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2 block text-left">{t.twitchClientId}</label>
                    <input
                        type="text"
                        value={twitchClientId || ''}
                        onChange={(e) => setTwitchClientId && setTwitchClientId(e.target.value)}
                        placeholder={t.twitchClientIdPlaceholder}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-xs font-mono text-white focus:border-[#9146FF] outline-none"
                    />
                </div>
                <SecretField field="twitch" label={t.twitchClientSecret || 'Client secret'} value={twitchClientSecret || ''} onChange={(v) => setTwitchClientSecret?.(v)} stored={Boolean(twitchHasSecret)} placeholder={t.twitchClientSecretPlaceholder || 'From "New Secret" on your app'} accent="#9146FF" t={t} />
                <WhereFrom href="https://dev.twitch.tv/console/apps" accent="#9146FF" t={t} text={t.twitchAppHint || 'At dev.twitch.tv: Register Your Application (any name; OAuth Redirect URL http://localhost; category Application Integration; client type Confidential), then Manage → copy the Client ID and press New Secret.'} />
                <KeyStatus state={twitchStatus} message={twitchError} t={t} />
             </div>
          </div>

          {/* YOUTUBE: an API key, for the go-live alerts */}
          <div className={panel} data-connection="youtube">
            <div className="flex items-center gap-4 mb-6 relative z-10">
              <div className="p-3 bg-[#FF0000] rounded-2xl text-white shadow-lg shadow-[#FF0000]/20">
                <svg width={24} height={24} viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" /></svg>
              </div>
              <div> <h3 className="text-xl font-black uppercase tracking-tight text-[#FF0000]">YouTube</h3> <Status on={youtubeStatus === 'connected'} t={t} /> </div>
            </div>
            <div className="space-y-4 relative z-10">
              <p className="text-xs text-zinc-400 leading-relaxed">{t.youtubeAlertsOnly || 'Only for go-live alerts: each watched channel\'s public feed is read, and YouTube is asked whether its newest videos are live. Nobody signs in.'}</p>
              <SecretField field="youtube" label={t.youtubeApiKey || 'API key'} value={youtubeApiKey || ''} onChange={(v) => setYoutubeApiKey?.(v)} stored={Boolean(youtubeHasKey)} placeholder="AIza…" accent="#FF0000" t={t} />
              <WhereFrom href="https://console.cloud.google.com/apis/credentials" accent="#FF0000" t={t} text={t.youtubeKeyHint || 'In the Google Cloud console: enable the YouTube Data API v3, then Credentials → Create credentials → API key.'} />
              <KeyStatus state={youtubeStatus} message={youtubeError} t={t} />
            </div>
          </div>

       </div>
    </div>
  );
};
