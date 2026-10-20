/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { useState, useEffect, useMemo, useRef, lazy, Suspense } from 'react';
import {
  Menu, X, Share2, Settings as SettingsIcon, ShieldCheck, Bot, Loader2, HelpCircle, Shield, MousePointerClick, DoorOpen,
  GripHorizontal, Trophy, Newspaper, Coins, BarChart3, Gift, Headphones, Megaphone, Inbox, BookOpen, MessageCircleQuestion, Youtube,
} from 'lucide-react';
import { NavSections, StatusRow, NavSearch, SearchButton, ScreenTabs, PhoneBar, type NavSection, type SearchEntry } from './components/NavMenu';
import { useReloadAfterUpdate } from './components/UpdatesPanel';
import { NotFoundPage } from './components/NotFoundPage';
import { SignInPage } from './components/SignInPage';
import { AppView } from './types';
import { THEMES, TRANSLATIONS } from './constants';
import { getRgbValues } from './utils';
import { fill } from './words';
import { useStreamSystem } from './hooks/useStreamSystem';
import type { GuidesTab } from './components/views/GuidesView';

/** The guides module, fetched by the dashboard when it opens (see `guides` below). */
type GuidesModule = typeof import('../shared/guides.js');

/** The streamer's own screens, which a moderator does not see: their connections, the moderators, and the Guides, which are for setting the bot up. */
const MOD_HIDDEN_VIEWS = new Set<AppView>(['gallery', 'guides', 'moderators']);

/** Back from Discord's sign-in page with a code for signing in (components/SignInPage.tsx), read once as the page loads. */
const FINISHING_SIGN_IN = typeof window !== 'undefined' && /(?:^|&)state=signin/.test(window.location.search.slice(1));

/*
  The dashboard's screens, loaded when the dashboard opens one rather than
  with the page, and fetched in the background once it is up (SCREENS), so
  moving between screens stays instant.
*/
const SCREENS: Array<() => Promise<unknown>> = [];

/** What a screen shows for the moment it takes to arrive. */
const ScreenLoading = ({ t }: { t: any }) => (
  <div className="flex items-center justify-center gap-2 py-24 text-xs text-zinc-500" data-screen-loading>
    <Loader2 size={16} className="animate-spin" /> {t.screenLoading || 'Loading…'}
  </div>
);
/** A screen loaded on first use, typed as the screen it is, so its props are checked as before. */
function screen<M, K extends keyof M>(load: () => Promise<M>, name: K): M[K] {
  SCREENS.push(load);
  return lazy(() => load().then((m) => ({ default: m[name] as any }))) as unknown as M[K];
}
const BotHomeView = screen(() => import('./components/views/BotHomeView'), 'BotHomeView');
const SettingsView = screen(() => import('./components/views/SettingsView'), 'SettingsView');
const ModeratorsView = screen(() => import('./components/views/ModeratorsView'), 'ModeratorsView');
const ConnectionsView = screen(() => import('./components/views/ConnectionsView'), 'ConnectionsView');
const QuestionsView = screen(() => import('./components/views/QuestionsView'), 'QuestionsView');
const GuidesView = screen(() => import('./components/views/GuidesView'), 'GuidesView');
const PollsView = screen(() => import('./components/views/PollsView'), 'PollsView');
const GiveawayView = screen(() => import('./components/views/GiveawayView'), 'GiveawayView');
const DiscordPagesView = screen(() => import('./components/views/DiscordPagesView'), 'DiscordPagesView');
const PointsView = screen(() => import('./components/views/PointsView'), 'PointsView');
const RequestsView = screen(() => import('./components/views/RequestsView'), 'RequestsView');
const VoiceView = screen(() => import('./components/views/VoiceView'), 'VoiceView');
const GoLiveView = screen(() => import('./components/views/GoLiveView'), 'GoLiveView');
const ReactionRolesView = screen(() => import('./components/views/ReactionRolesView'), 'ReactionRolesView');
const WelcomeGoodbyeView = screen(() => import('./components/views/WelcomeGoodbyeView'), 'WelcomeGoodbyeView');
const DiscordButtonsView = screen(() => import('./components/views/DiscordButtonsView'), 'DiscordButtonsView');
const LevelsView = screen(() => import('./components/views/LevelsView'), 'LevelsView');

// --- Custom Components ---
const Logo = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} width="24" height="24">
    <path d="M12 2l9 5v10l-9 5-9-5V7l9-5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    {/* the pixel heart SimonBot holds, 7 x 6 */}
    <path fill="currentColor" shapeRendering="crispEdges" d="M8.5 9h2v1h-2zM13.5 9h2v1h-2zM7.5 10h9v2h-9zM8.5 12h7v1h-7zM9.5 13h5v1h-5zM10.5 14h3v1h-3zM11.5 15h1v1h-1z" />
  </svg>
);
const TwitchIcon = ({ size = 24, className = "" }: { size?: number, className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} width={size} height={size}><path d="M21 2H3v16h5v4l4-4h5l4-4V2zm-10 9V7m5 4V7" /></svg>
);
const DiscordIcon = ({ size = 24, className = "" }: { size?: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6034.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.419-2.1569 2.419zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.419-2.1568 2.419z"/>
  </svg>
);

/*
  The one page there is: the dashboard, at /. Any ?mode= or other path is a
  page that does not exist (NotFoundPage) — never the dashboard in its place.
*/
const PAGE_MODES = ['dashboard'];
const APP_PATHS = ['/', '/index.html'];

/** This browser's own memory of the guides and the requests board. */
const GUIDES_SEEN = 'simonbot.guides-seen';
const GUIDES_TICKED = 'simonbot.guides-ticked';
const REQUESTS_SEEN = 'simonbot.requests-seen';

export default function App() {
  // --- Initialize "The Brain" ---
  const system = useStreamSystem();
  // After an update started here, the page reloads into the new version once the server is back as it.
  useReloadAfterUpdate((system.data as any).serverVersion || '', (system.data as any).updates || null);

  const [showIntro, setShowIntro] = useState(true);
  const [view, setView] = useState<AppView>('bot-home');
  // A moderator never lands on a screen that is the streamer's (MOD_HIDDEN_VIEWS), however it was asked for.
  useEffect(() => { if (system.auth.isMod && MOD_HIDDEN_VIEWS.has(view)) setView('bot-home'); }, [system.auth.isMod, view]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const searchParams = new URLSearchParams(window.location.search);
  const mode = searchParams.get('mode');
  const unknownPath = !APP_PATHS.includes(window.location.pathname);
  const notFound = unknownPath || (mode !== null && !PAGE_MODES.includes(mode));
  const activeTheme = useMemo(() => THEMES.find(t => t.id === system.settings.activeThemeId) || THEMES[0], [system.settings.activeThemeId]);
  // The dashboard, once up, fetches every screen in the background so moving between them is instant.
  useEffect(() => {
    if (notFound) return undefined;
    const later = setTimeout(() => { for (const load of SCREENS) load().catch(() => {}); }, 1500);
    return () => clearTimeout(later);
  }, []);

  /** Accent colour classes, from the theme chosen in Settings. */
  const accentStyles = <style>{` :root { --current-accent: ${activeTheme.primary}; } .text-current-accent { color: var(--current-accent); } .bg-current-accent { background-color: var(--current-accent); } .border-current-accent { border-color: var(--current-accent); } .bg-current-accent\\/10 { background-color: rgba(${getRgbValues(activeTheme.primary)}, 0.1); } `}</style>;
  const t = useMemo(() => TRANSLATIONS[system.settings.language], [system.settings.language]);
  const viewNames: Record<AppView, string> = {
    'bot-home': 'SimonBot',
    questions: t.questionsNav || 'Questions',
    polls: t.pollsNav || 'Polls',
    giveaway: t.giveawayNav || 'Giveaways',
    points: t.pointsNav || 'Points',
    requests: t.requestsNav || 'Game requests',
    gallery: t.connections,
    settings: t.settings,
    voice: t.voiceNav || 'Voice call',
    'go-live': t.goLiveNav || 'Go live',
    'reaction-roles': t.reactionRoles,
    'discord-buttons': t.discordButtons || 'Discord Buttons',
    'welcome-goodbye': t.welcomeGoodbye || 'Welcome & Goodbye',
    'discord-pages': t.discordPagesNav || 'Discord pages',
    levels: t.levels || 'Levels & XP',
    guides: t.guidesNav || 'Guides',
    moderators: t.moderatorsNav || 'Moderators',
  };

  // The browser tab says which screen it is.
  const screenTitle = notFound ? (t.notFoundTab || 'Page not found') : viewNames[view];
  useEffect(() => {
    document.title = screenTitle && screenTitle !== 'SimonBot' ? `${screenTitle} · SimonBot` : 'SimonBot';
  }, [screenTitle]);

  useEffect(() => { const timer = setTimeout(() => setShowIntro(false), 9000); return () => clearTimeout(timer); }, []);

  const waitingQuestions = (((system.data as any).questions?.items || []) as any[]).filter((q) => q.status === 'pending').length;

  /*
    Guides (shared/guides.js): which tab and guide are open, and the setup
    steps — worked out here, since the menu counts what is left of them. What
    is only true while something is open (an account connected) stays ticked
    once seen; what the app cannot see is ticked by hand. Both are this
    browser's.
  */
  const [guidesTab, setGuidesTab] = useState<GuidesTab>('start');
  const [openGuide, setOpenGuide] = useState<string | null>(null);
  const readIds = (key: string): string[] => {
    try { const v = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(v) ? v.map(String) : []; } catch { return []; }
  };
  const [guidesSeen, setGuidesSeen] = useState<string[]>(() => readIds(GUIDES_SEEN));
  const [guidesTicked, setGuidesTicked] = useState<string[]>(() => readIds(GUIDES_TICKED));
  const tickGuide = (id: string, done: boolean) => {
    const next = done ? [...new Set([...guidesTicked, id])] : guidesTicked.filter((x) => x !== id);
    setGuidesTicked(next);
    try { localStorage.setItem(GUIDES_TICKED, JSON.stringify(next)); } catch { /* this visit only */ }
  };
  // The guides and their setup steps, fetched once the dashboard is up.
  const [guides, setGuides] = useState<GuidesModule | null>(null);
  useEffect(() => {
    if (notFound) return undefined;
    let alive = true;
    import('../shared/guides.js').then((m) => { if (alive) setGuides(m); }).catch(() => {});
    return () => { alive = false; };
  }, []);
  // Not before the server has said what it has: until then everything would read as not done.
  const guidesReady = Boolean((system.data as any).serverVersion) && Boolean(guides);
  const setupProgress = guides
    ? guides.setupState({ status: system.status, data: system.data, connections: system.connections, auth: system.auth }, { seen: guidesSeen, ticked: guidesTicked })
    : { items: [] as ReturnType<GuidesModule['setupState']>['items'], left: 0, needed: 0 };
  const newlySeen = setupProgress.items.filter((i) => i.done && i.check.sticky && !guidesSeen.includes(i.check.id)).map((i) => i.check.id).join(',');
  useEffect(() => {
    if (!newlySeen) return;
    const next = [...new Set([...guidesSeen, ...newlySeen.split(',')])];
    setGuidesSeen(next);
    try { localStorage.setItem(GUIDES_SEEN, JSON.stringify(next)); } catch { /* this visit only */ }
  }, [newlySeen]);
  const openGuideAt = (id: string) => { setOpenGuide(id); setGuidesTab('guides'); setView('guides'); setIsMobileMenuOpen(false); };
  /*
    A screen gone to opens at its top. The screens share one scrolling area,
    so without this a "Go to" from far down the Guides landed halfway down
    the next screen, past its heading.
  */
  const mainRef = useRef<HTMLElement | null>(null);
  useEffect(() => { mainRef.current?.scrollTo({ top: 0 }); }, [view]);
  // The guide a screen's "?" opens.
  const screenGuide = view === 'guides' || !guides || system.auth.isMod ? null : guides.guideForScreen(view);

  // --- The menu (components/NavMenu.tsx) ---
  const [searchOpen, setSearchOpen] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'k') { e.preventDefault(); setSearchOpen((o) => !o); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  // Two screens that are one thing, as tabs: the menu goes back to whichever of them was last open.
  const PAIRS: Record<string, AppView[]> = { roleMenus: ['reaction-roles', 'discord-buttons'] };
  const [lastOfPair, setLastOfPair] = useState<Record<string, AppView>>({});
  useEffect(() => {
    for (const [pair, views] of Object.entries(PAIRS)) if (views.includes(view)) setLastOfPair((p) => (p[pair] === view ? p : { ...p, [pair]: view }));
  }, [view]);
  // Requests posted since the board was last looked at.
  const [requestsSeen, setRequestsSeen] = useState<number>(() => {
    try {
      const known = Number(localStorage.getItem(REQUESTS_SEEN));
      if (known) return known;
      localStorage.setItem(REQUESTS_SEEN, String(Date.now()));
    } catch { /* counted from now, this visit */ }
    return Date.now();
  });
  const gameRequestList: any[] = (system.data as any).gameRequests?.requests || [];
  useEffect(() => {
    if (view !== 'requests') return;
    const now = Date.now();
    setRequestsSeen(now);
    try { localStorage.setItem(REQUESTS_SEEN, String(now)); } catch { /* this visit only */ }
    // On the server's copy, not the list taken from it: that is a new empty list on every draw before one arrives.
  }, [view, (system.data as any).gameRequests]);
  const newRequests = view === 'requests' ? 0 : gameRequestList.filter((r) => r.status === 'open' && Number(r.at) > requestsSeen).length;
  /*
    A connection that dropped: on earlier in this visit, off now. Seen on the
    Connections screen, what is off is taken as meant.
  */
  const WATCHED: [keyof typeof system.status, string][] = [['discord', 'Discord'], ['twitch', 'Twitch'], ['youtube', 'YouTube']];
  const wasOn = useRef<Set<string>>(new Set());
  const [dropped, setDropped] = useState<string[]>([]);
  const statusKey = WATCHED.map(([k]) => system.status[k]).join('|');
  useEffect(() => {
    for (const [k] of WATCHED) if (system.status[k] === 'connected') wasOn.current.add(String(k));
    if (view === 'gallery') wasOn.current = new Set(WATCHED.filter(([k]) => system.status[k] === 'connected').map(([k]) => String(k)));
    const lost = WATCHED.filter(([k]) => wasOn.current.has(String(k)) && system.status[k] !== 'connected' && system.status[k] !== 'connecting').map(([, name]) => name);
    setDropped((prev) => (prev.join() === lost.join() ? prev : lost));
  }, [statusKey, view]);

  // An address with no page behind it.
  if (notFound) return <>{accentStyles}<NotFoundPage asked={unknownPath ? window.location.pathname : `?mode=${mode}`} t={t} /></>;

  // Signing in (server/api/auth.js): back from Discord with a sign-in to finish, or a server that wants to know who this is first.
  if (FINISHING_SIGN_IN || system.auth.signIn) {
    return <>{accentStyles}<SignInPage t={t} refused={!FINISHING_SIGN_IN && system.auth.signIn === 'refused'} optional={!system.auth.signIn} /></>;
  }

  const goTo = (next: AppView) => { setView(next); setIsMobileMenuOpen(false); };
  const giveawayOpen = (system.data as any).giveaway?.mode === 'open';
  // A newer version out (server/engine/updater.js), unless it is the one that would not start.
  const updates = (system.data as any).updates;
  const updateOut = updates?.enabled && updates.available && updates.latest && !(updates.failed || []).includes(updates.latest.version) ? updates.latest.version : '';
  const I = 18;
  /*
    The bot first, then its community, then setting it up. Each is the
    screen's own name and icon; the role menus, which are one thing, are one
    entry, opened on whichever of the two was last used, with tabs between them.
  */
  const navSections: NavSection[] = [
    { id: 'bot', label: 'SimonBot', items: [
      { view: 'bot-home', label: system.settings.language === 'es' ? 'Inicio' : 'Home', icon: <Bot size={I} />, keywords: 'simonbot bot home inicio slash commands comandos' },
      { view: 'welcome-goodbye', label: t.welcomeGoodbye || 'Welcome & Goodbye', icon: <DoorOpen size={I} /> },
      { view: 'discord-pages', label: t.discordPagesNav || 'Discord pages', icon: <Newspaper size={I} /> },
      { view: lastOfPair.roleMenus || 'reaction-roles', also: ['reaction-roles', 'discord-buttons'], label: t.navRoleMenus || 'Role menus', icon: <MousePointerClick size={I} />, keywords: `${t.reactionRoles || 'Reaction Roles'} ${t.discordButtons || 'Discord Buttons'}` },
      { view: 'voice', label: t.voiceNav || 'Voice call', icon: <Headphones size={I} /> },
      { view: 'go-live', label: t.goLiveNav || 'Go live', icon: <Megaphone size={I} />, keywords: 'announce alerts dms anuncio' },
    ] },
    { id: 'community', label: t.navCommunity || 'Community', items: [
      { view: 'levels', label: t.levels || 'Levels & XP', icon: <Trophy size={I} />, keywords: 'xp ranks niveles' },
      { view: 'points', label: t.pointsNav || 'Points', icon: <Coins size={I} />, keywords: 'puntos' },
      { view: 'giveaway', label: t.giveawayNav || 'Giveaways', icon: <Gift size={I} />, dot: giveawayOpen ? 'on' : undefined, hint: giveawayOpen ? (t.navRunning || 'Running now') : undefined },
      { view: 'polls', label: t.pollsNav || 'Polls', icon: <BarChart3 size={I} /> },
      { view: 'questions', label: t.questionsNav || 'Questions', icon: <MessageCircleQuestion size={I} />, number: waitingQuestions || undefined },
      { view: 'requests', label: t.requestsNav || 'Game requests', icon: <Inbox size={I} />, number: newRequests || undefined, hint: newRequests ? fill(t.navNewRequests || '{count} new since you last looked', { count: newRequests }) : undefined },
    ] },
    { id: 'setup', label: t.navSetup || 'Setup', items: [
      { view: 'gallery', label: t.connections, icon: <Share2 size={I} />, dot: dropped.length ? 'alert' : undefined, hint: dropped.length ? fill(t.navDropped || '{names} dropped since it was on', { names: dropped.join(', ') }) : undefined },
      // Who has signed in as a moderator, and what they did: the streamer's own (server/api/ws.js MODERATORS).
      { view: 'moderators', label: t.moderatorsNav || 'Moderators', icon: <ShieldCheck size={I} />, keywords: 'mods moderadores sign in access sesión acceso log' },
      { view: 'settings', label: t.settings, icon: <SettingsIcon size={I} />, keywords: 'language theme idioma version versión about acerca backup update actualizar', dot: updateOut ? 'news' : undefined, hint: updateOut ? fill(t.updatesAvailable || 'Version {version} is out', { version: updateOut }) : undefined },
      // Last in the menu: where somebody new starts, counting the setup steps still to do.
      { view: 'guides', label: t.guidesNav || 'Guides', icon: <BookOpen size={I} />, keywords: 'help ayuda tutorial start empezar setup configurar how como glossary glosario',
        number: guidesReady && setupProgress.left ? setupProgress.left : undefined,
        hint: guidesReady && setupProgress.left ? fill(t.guidesNavLeft || '{count} setup steps left', { count: setupProgress.left }) : undefined },
    ] },
  ];
  // A moderator's menu: without the streamer's own screens.
  const shownSections = system.auth.isMod
    ? navSections.map((sec) => ({ ...sec, items: sec.items.filter((item) => !MOD_HIDDEN_VIEWS.has(item.view)) })).filter((sec) => sec.items.length)
    : navSections;
  // Every screen for the search, the role menus each under its own name too.
  const searchEntries: SearchEntry[] = [
    ...shownSections.flatMap((sec) => sec.items.map((item) => ({ view: item.view, label: item.label, section: sec.label, icon: item.icon, keywords: item.keywords }))),
    { view: 'reaction-roles', label: t.reactionRoles, section: 'SimonBot', icon: <MousePointerClick size={I} /> },
    { view: 'discord-buttons', label: t.discordButtons || 'Discord Buttons', section: 'SimonBot', icon: <GripHorizontal size={I} /> },
    // Each guide by its title, opened where it is.
    ...(system.auth.isMod ? [] : guides?.GUIDES || []).map((g: any) => ({
      view: 'guides' as AppView,
      label: (system.settings.language === 'es' ? g.es : g.en).title,
      section: t.guidesNav || 'Guides',
      icon: <BookOpen size={I} />,
      // Found by its name in either language, and the screens it is about.
      keywords: `${g.id.split('-').join(' ')} ${g.en.title} ${g.es.title} ${g.screens.map((s: string) => viewNames[s as AppView] || '').join(' ')}`,
      onChoose: () => openGuideAt(g.id),
    })),
  ];
  const statusMarks = [
    { id: 'discord', name: 'Discord', icon: <DiscordIcon size={13} />, ok: system.status.discord === 'connected' },
    { id: 'twitch', name: 'Twitch', icon: <TwitchIcon size={13} />, ok: system.status.twitch === 'connected' },
    { id: 'youtube', name: 'YouTube', icon: <Youtube size={13} />, ok: system.status.youtube === 'connected' },
  ];
  // The phone's bar: the bot's home, going live, and what wants answering.
  const menuItems = navSections.flatMap((sec) => sec.items);
  const phoneItems = (['bot-home', 'go-live', 'giveaway', 'questions'] as AppView[])
    .map((v) => menuItems.find((item) => item.view === v))
    .filter((item): item is NavSection['items'][number] => Boolean(item));

  /**
   * The sidebar's markup — a plain function that is called, rather than a
   * component rendered as an element: declared inside App, a component would
   * be a new type on every render, and the whole sidebar (and its scroll
   * position) would be built again each time the server sends a frame. It
   * must stay hook-free for that reason: hooks here would belong to App.
   */
  const renderSidebar = (isMobile?: boolean) => (
    <>
      <div className={`shrink-0 p-6 flex items-center gap-3 ${isMobile ? 'justify-between' : ''}`}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-tr from-[#66AD4F] to-[#3C7B5A] rounded-lg flex items-center justify-center text-white shadow-lg shadow-[#66AD4F]/20">
            <Logo className="w-5 h-5" />
          </div>
          <span className={`font-black tracking-tight text-lg ${activeTheme.id === 'light' ? 'text-zinc-900' : 'text-white'}`}>SIMON<span className="text-[#66AD4F]">BOT</span></span>
        </div>
        {isMobile && ( <button onClick={() => setIsMobileMenuOpen(false)} className="text-zinc-500 hover:text-white transition-colors"> <X size={24} /> </button> )}
      </div>
      <div className="shrink-0 px-4 pb-2">
        <SearchButton onOpen={() => { setSearchOpen(true); }} t={t} light={activeTheme.id === 'light'} />
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-2 scrollbar-thin scrollbar-thumb-zinc-800" data-nav>
        <NavSections sections={shownSections} view={view} go={goTo} />
      </div>
      <div className="shrink-0 p-4 border-t border-zinc-800/50">
        <StatusRow marks={statusMarks} onOpen={() => { if (!system.auth.isMod) goTo('gallery'); }} label={t.connections} light={activeTheme.id === 'light'} />
      </div>
    </>
  );

  return (
    <div className={`h-dvh ${activeTheme.bgClass} ${activeTheme.textClass} font-sans flex overflow-hidden relative transition-colors duration-500`}>
      {accentStyles}

      {showIntro && ( <div className="fixed inset-0 z-50 bg-[#0F0913] flex items-center justify-center font-sans overflow-hidden"> <div className="relative flex items-center justify-center"> <div className="absolute inset-0 bg-[#66AD4F]/20 blur-[100px] rounded-full animate-pulse"></div> <div className="relative z-10 flex flex-col items-center"> <div className="relative w-32 h-32 mb-8"> <div className="absolute inset-0 border-4 border-[#66AD4F]/30 rounded-full animate-[spin_3s_linear_infinite]"></div> <div className="absolute inset-2 border-4 border-[#66AD4F]/50 rounded-full border-t-transparent animate-[spin_2s_linear_infinite_reverse]"></div> <div className="absolute inset-0 flex items-center justify-center"> <Logo className="w-16 h-16 text-[#66AD4F] animate-[pulse_2s_ease-in-out_infinite]" /> </div> </div> <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-white mb-4 animate-[slide-up_0.8s_ease-out]"> SIMON<span className="text-[#66AD4F]">BOT</span> </h1> <div className="h-1 w-24 bg-gradient-to-r from-transparent via-[#66AD4F] to-transparent rounded-full animate-[width_1s_ease-out]"></div> </div> </div> </div> )}
      {isMobileMenuOpen && ( <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm md:hidden animate-fade-in" onClick={() => setIsMobileMenuOpen(false)} /> )}

      <aside className={`fixed inset-y-0 left-0 z-[70] w-72 ${activeTheme.bgClass} border-r ${activeTheme.borderClass} md:hidden transform transition-transform duration-300 ease-out flex flex-col ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full shadow-none'}`}> {renderSidebar(true)} </aside>
      <aside className={`w-64 shrink-0 h-full min-h-0 border-r ${activeTheme.borderClass} ${activeTheme.id === 'light' ? 'bg-white' : 'bg-zinc-950/50'} hidden md:flex flex-col transition-colors duration-300`}> {renderSidebar()} </aside>

      <main ref={mainRef} className="flex-1 overflow-y-auto relative pt-0">
        {/*
          The bar is for phones only: the menu button and the name of the
          screen you are on. On a desktop the sidebar is already open beside
          you with that screen lit up.
        */}
        <div className={`md:hidden sticky top-0 z-40 h-16 ${activeTheme.bgClass}/80 backdrop-blur-md border-b ${activeTheme.borderClass} flex items-center justify-between px-4 md:px-8 transition-colors duration-300`}>
           <div className="flex items-center gap-4">
              <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden p-2 -ml-2 text-zinc-400 hover:text-white transition-colors" aria-label="Open Menu"> <Menu size={24} /> </button>
              <div className={`text-sm ${activeTheme.id === 'light' ? 'text-zinc-500' : 'text-zinc-400'} breadcrumbs truncate`}> <span className={`${activeTheme.id === 'light' ? 'text-zinc-900' : 'text-white'} font-extrabold uppercase tracking-tight`}>{viewNames[view]}</span> </div>
           </div>
           {screenGuide && (
             <button type="button" onClick={() => openGuideAt(screenGuide.id)} className="p-2 -mr-2 text-zinc-500 hover:text-white" title={fill(t.guidesForScreen || 'Guide: {title}', { title: (system.settings.language === 'es' ? screenGuide.es : screenGuide.en).title })} data-screen-guide-phone={screenGuide.id}>
               <HelpCircle size={20} />
             </button>
           )}
        </div>

        {/* The 4rem is the bar above, which only a phone still has. */}
        <div className="max-w-7xl relative mx-auto p-4 sm:p-6 md:p-10 h-[calc(100dvh-4rem)] md:h-dvh">
          {/* The screen's guide, a press away: in the margin above it, where no screen puts anything. */}
          {screenGuide && (
            <button
              type="button"
              onClick={() => openGuideAt(screenGuide.id)}
              className="hidden md:flex absolute top-2 right-10 h-7 items-center gap-1.5 px-2.5 rounded-full text-[10px] font-bold text-zinc-500 hover:text-white hover:bg-zinc-900/60 transition-colors z-10"
              title={t.guidesHelpHint || 'How this screen works'}
              data-screen-guide={screenGuide.id}
            >
              <HelpCircle size={13} />
              {fill(t.guidesForScreen || 'Guide: {title}', { title: (system.settings.language === 'es' ? screenGuide.es : screenGuide.en).title })}
            </button>
          )}
          {/* The role menus, two screens that are one thing: tabs between them, at the top of each. */}
          {(view === 'reaction-roles' || view === 'discord-buttons') && (
            <ScreenTabs view={view} go={goTo} tabs={[{ view: 'reaction-roles', label: t.reactionRoles }, { view: 'discord-buttons', label: t.discordButtons || 'Discord Buttons' }]} />
          )}
          <Suspense fallback={<ScreenLoading t={t} />}>
           {view === 'bot-home' && <BotHomeView system={system} t={t} go={goTo} language={system.settings.language} />}
           {view === 'settings' && (
             <SettingsView
               activeTheme={activeTheme}
               activeThemeId={system.settings.activeThemeId}
               setActiveThemeId={system.settings.setActiveThemeId}
               language={system.settings.language}
               setLanguage={system.settings.setLanguage}
               exportConfig={system.actions.exportConfig}
               importConfig={system.actions.importConfig}
               serverVersion={(system.data as any).serverVersion}
               updates={(system.data as any).updates}
               updatesAct={system.actions.updates}
               auth={system.auth}
               discordRoles={(system.data as any).discordRoles}
               t={t}
             />
           )}
           {view === 'moderators' && (
             <ModeratorsView
               ask={system.auth.moderators}
               language={system.settings.language}
               light={activeTheme.id === 'light'}
               openSettings={() => goTo('settings')}
               modLog={{
                 settings: (system.data as any).moderation,
                 entries: (system.data as any).moderationLog || [],
                 channels: system.connections.discordChannels,
                 save: (system.actions as any).moderation,
               }}
               t={t}
             />
           )}
           {view === 'guides' && (
             <GuidesView
               t={t}
               system={system}
               go={goTo}
               screens={viewNames}
               progress={setupProgress}
               ticked={guidesTicked}
               setTicked={tickGuide}
               tab={guidesTab}
               setTab={setGuidesTab}
               openGuide={openGuide}
               setOpenGuide={setOpenGuide}
             />
           )}

           {view === 'go-live' && (
             <GoLiveView
               watch={(system.data as any).watch}
               control={system.actions.watch}
               channels={system.connections.discordChannels}
               roles={(system.data as any).discordRoles}
               keys={{ twitch: Boolean(system.connections.twitchClientId && system.connections.twitchHasSecret), youtube: system.connections.youtubeHasKey }}
               openConnections={() => goTo('gallery')}
               botConnected={system.status.discord === 'connected'}
               liveDms={(system.data as any).liveDms}
               liveDmsControl={(system.actions as any).liveDms}
               t={t}
             />
           )}

           {view === 'voice' && (
             <VoiceView
               voice={(system.data as any).voice}
               channels={system.connections.discordChannels}
               setVoice={(system.actions as any).setVoice}
               botConnected={system.status.discord === 'connected'}
               t={t}
             />
           )}

           {view === 'reaction-roles' && <ReactionRolesView activeTheme={activeTheme} t={t} system={system} />}
           {view === 'discord-buttons' && <DiscordButtonsView activeTheme={activeTheme} t={t} system={system} />}
           {view === 'welcome-goodbye' && <WelcomeGoodbyeView activeTheme={activeTheme} t={t} system={system} />}

           {view === 'discord-pages' && (
             <DiscordPagesView
               pages={(system.data as any).discordPages || []}
               control={(system.actions as any).discordPages}
               channels={system.connections.discordChannels || []}
               roles={(system.data as any).discordRoles || []}
               emojis={system.connections.discordEmojis || []}
               testChannelId={(system.data as any).welcomeGoodbyeConfig?.testChannelId}
               listAssets={system.actions.listAssets}
               uploadAsset={system.actions.uploadAsset}
               botConnected={system.status.discord === 'connected'}
               botName={(() => { const m: any = system.connections.botMember; return m?.nick || m?.user?.global_name || m?.user?.username; })()}
               botAvatar={(() => { const u: any = (system.connections.botMember as any)?.user; return u?.avatar ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png?size=80` : undefined; })()}
               t={t}
             />
           )}

           {view === 'levels' && <LevelsView activeTheme={activeTheme} t={t} system={system} />}

           {view === 'gallery' && (
              <ConnectionsView
                discordToken={system.connections.discordToken}
                setDiscordToken={system.actions.setDiscordToken}
                discordChannelId={system.connections.discordChannelId}
                setDiscordChannelId={system.actions.setDiscordChannelId}
                discordStatus={system.status.discord}
                connectDiscord={system.actions.connectDiscord}
                disconnectDiscord={system.actions.disconnectDiscord}
                discordUser={system.connections.discordUser}
                guilds={system.connections.discordGuilds}
                channels={system.connections.discordChannels}
                fetchChannels={system.actions.fetchDiscordChannels}
                handleDiscordConnect={system.actions.connectDiscordChannel}
                discordCommandsEverywhere={(system.connections as any).discordCommandsEverywhere !== false}
                setDiscordCommandsEverywhere={(system.actions as any).setDiscordCommandsEverywhere}
                discordGuildId={system.connections.discordGuildId}
                setDiscordGuildId={system.actions.setDiscordGuildId}
                discordBotToken={system.connections.discordBotToken} setDiscordBotToken={system.actions.setDiscordBotToken}
                discordHasBotToken={system.connections.discordHasBotToken}
                discordClientSecret={system.connections.discordClientSecret} setDiscordClientSecret={system.actions.setDiscordClientSecret}
                discordHasClientSecret={system.connections.discordHasClientSecret}
                twitchClientId={system.connections.twitchClientId}
                setTwitchClientId={system.actions.setTwitchClientId}
                twitchClientSecret={system.connections.twitchClientSecret}
                setTwitchClientSecret={system.actions.setTwitchClientSecret}
                twitchHasSecret={system.connections.twitchHasSecret}
                twitchStatus={system.status.twitch}
                twitchError={system.status.twitchError}
                youtubeApiKey={system.connections.youtubeApiKey}
                setYoutubeApiKey={system.actions.setYoutubeApiKey}
                youtubeHasKey={system.connections.youtubeHasKey}
                youtubeStatus={system.status.youtube}
                youtubeError={system.status.youtubeError}
                activeTheme={activeTheme}
                t={t}
              />
           )}

           {view === 'questions' && (
              <QuestionsView
                questions={(system.data as any).questions || { items: [], showingId: '' }}
                settings={(system.data as any).questionSettings}
                setStatus={system.actions.setQuestionStatus}
                clear={system.actions.clearQuestions}
                control={system.actions.questions}
                fromDiscord={(system.data as any).discordQuestions}
                setFromDiscord={(system.actions as any).setDiscordQuestions}
                channels={system.connections.discordChannels || []}
                language={system.settings.language}
                t={t}
              />
            )}

           {view === 'polls' && (
              <PollsView t={t} />
            )}

           {view === 'requests' && (
              <RequestsView state={(system.data as any).gameRequests} control={(system.actions as any).gameRequests} channels={system.connections.discordChannels || []} botConnected={system.status.discord === 'connected'} t={t} />
           )}

           {view === 'points' && (
              <PointsView
                settings={(system.data as any).pointsSettings}
                control={(system.actions as any).points}
                emojis={system.connections.discordEmojis || []}
                t={t}
              />
           )}

           {view === 'giveaway' && (
              <GiveawayView
                giveaway={(system.data as any).giveaway}
                settings={(system.data as any).giveawaySettings}
                control={(system.actions as any).giveaway}
                channels={system.connections.discordChannels}
                roles={(system.data as any).discordRoles}
                botConnected={system.status.discord === 'connected'}
                t={t}
              />
            )}
          </Suspense>
          {/* Room at the end of every screen for the phone's bar, so it never covers the last of it. */}
          <div className="h-20 md:hidden" aria-hidden data-phone-bar-room />
        </div>
      </main>
      <PhoneBar items={phoneItems} view={view} go={goTo} onMenu={() => setIsMobileMenuOpen(true)} t={t} />
      {searchOpen && <NavSearch entries={searchEntries} go={goTo} onClose={() => setSearchOpen(false)} t={t} />}
    </div>
  );
}
