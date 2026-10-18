
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

export type AppView = 'bot-home' | 'questions' | 'polls' | 'giveaway' | 'points' | 'requests' | 'voice' | 'go-live' | 'gallery' | 'settings' | 'role-management' | 'reaction-roles' | 'discord-buttons' | 'welcome-goodbye' | 'discord-pages' | 'levels' | 'guides' | 'moderators';

export interface LoadingState {
  isLoading: boolean;
  message: string;
}

// --- Connection / Relay Types ---

export interface RelayConfig {
  twitchToDiscord: boolean;
  tiktokToDiscord: boolean;
  youtubeToDiscord?: boolean;
  /** Out of the Discord channel the app reads (engine/relay.js). */
  discordToTwitch?: boolean;
  discordToYoutube?: boolean;
}

// --- Reaction Roles Types ---

export interface ReactionMapping {
  emoji: string;
  roleId: string;
  roleName?: string; // Cache for display
}

export interface DiscordEmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

/** One block of a Discord page (shared/discord-pages.js): which fields it has depends on its type. */
export interface DiscordPageBlock {
  id: string;
  type: 'banner' | 'card' | 'text' | 'gap' | 'links';
  image?: string;
  author?: string;
  title?: string;
  url?: string;
  description?: string;
  color?: string;
  fields?: { name: string; value: string; inline: boolean }[];
  thumbnail?: string;
  footer?: string;
  text?: string;
  size?: 'small' | 'large';
  line?: boolean;
  buttons?: { label: string; url: string; emoji: string }[];
  reactions?: string[];
  /** A banner's words, drawn into its picture by the server. */
  caption?: BannerCaption;
  /** One picture inside a banner, under the words. */
  inset?: BannerInset;
}

export interface BannerCaption {
  text: string;
  font: string;
  weight: number;
  /** Height of the words, as a share of the banner's height. */
  size: number;
  color: string;
  at: 'top' | 'middle' | 'bottom';
  align: 'left' | 'center' | 'right';
  shadow: boolean;
  outline: boolean;
  /** Placed by hand: where their middle is, as a share of the banner's width and height. Null where `at` and `align` put them. */
  x?: number | null;
  y?: number | null;
}

export interface BannerInset {
  image: string;
  /** Where its middle is, as a share of the banner's width and height. */
  x: number;
  y: number;
  /** Its height, as a share of the banner's. */
  size: number;
}

export interface DiscordPagePost {
  channelId: string;
  style?: 'classic' | 'single';
  ids: string[];
  kinds?: string[];
  at: number;
  cut?: number;
}

/** A channel's standing post, built on the Discord pages screen. */
export interface DiscordPage {
  id: string;
  name: string;
  channelId: string;
  style: 'classic' | 'single';
  color: string;
  blocks: DiscordPageBlock[];
  /** Kept up to date: edited in place as its { } values change. */
  live?: boolean;
  posted: DiscordPagePost | null;
  tested: DiscordPagePost | null;
  source: DiscordPagePost | null;
  updatedAt: number;
}

export interface DiscordEmbed {
  title?: string;
  description?: string;
  color?: string; // Hex string
  footer?: string;
  thumbnail?: string; // URL
  image?: string; // URL
  fields?: DiscordEmbedField[];
}

export interface ReactionRoleMessage {
  id: string; // Internal UUID
  messageId: string; // Discord Message ID
  channelId: string;
  guildId: string;
  name: string; // Friendly label
  mode?: 'standard' | 'unique'; // Behavior mode
  content: string; // Message content (outside embed)
  embed?: DiscordEmbed; // Optional Rich Embed
  mappings: ReactionMapping[];
}

export interface RoleActivityLogEntry {
  id: string;
  timestamp: number;
  user: string; // Discord User ID or Name
  action: 'added' | 'removed';
  roleName: string;
  menuName: string;
}

// --- Discord Buttons Types ---

export interface DiscordButtonMapping {
  id: string; // Internal ID for React keys
  label: string;
  style: '1' | '2' | '3' | '4'; // 1: Blurple, 2: Gray, 3: Green, 4: Red
  emoji?: string;
  roleId: string;
  roleName?: string;
}

export interface DiscordButtonMessage {
  id: string;
  messageId: string;
  channelId: string;
  guildId: string;
  name: string;
  content: string;
  embed?: DiscordEmbed;
  buttons: DiscordButtonMapping[];
}

// --- Welcome / Goodbye Types ---

export interface WelcomeGoodbyeEntry {
  enabled: boolean;
  channelId: string;
  messages: string[]; // Array of message variations
  // Card / Embed Properties
  sendCard: boolean;
  cardTitle?: string;
  cardDescription?: string;
  cardColor?: string;
  cardThumbnail?: boolean; // Use user avatar as thumbnail
  cardImage?: string; // Large Image URL
  cardFooter?: string;
  // NEW: Auto Role
  autoRoleId?: string;
  // A picture of them, drawn on the server: see WelcomeCardEditor and shared/card-css.js.
  image?: import('./components/WelcomeCardEditor').WelcomeCard;
  /** An emoji the bot reacts to its own post with, for everybody else to add theirs. '' is none. */
  react?: string;
  /** Buttons under the post: links, and roles anybody can pick up. See cleanButtons in server/engine/welcome.js. */
  buttons?: GreetingButton[];
  /** The welcome's direct message to the newcomer: its own lines, the card if wanted, the link buttons. */
  dm?: { enabled: boolean; messages: string[]; picture: boolean; links: boolean };
}

export interface GreetingButton {
  kind: 'link' | 'role';
  label: string;
  emoji?: string;
  url?: string;
  roleId?: string;
  /** A role button's colour, as Discord numbers them: 1 blurple, 2 grey, 3 green, 4 red. */
  style?: number;
}

export interface WelcomeGoodbyeConfig {
  welcome: WelcomeGoodbyeEntry;
  goodbye: WelcomeGoodbyeEntry;
  boost?: WelcomeGoodbyeEntry;
  ban?: WelcomeGoodbyeEntry;
  /** Where a test goes: a private channel, so trying one out is not a post everybody sees. '' is the real channel. */
  testChannelId?: string;
}

/** The kinds of greeting post, in the order the screen shows them. */
export type GreetingKind = 'welcome' | 'goodbye' | 'boost' | 'ban';

// --- Role Management Types ---

export interface RoleMappingConfig {
  subscriberTier1: string | null;
  subscriberTier2: string | null;
  subscriberTier3: string | null;
  vip: string | null;
  moderator: string | null;
  // New Expanded Types
  follower: string | null;
  founder: string | null;
  bits1k: string | null;
  bits5k: string | null;
  bits10k: string | null;
  bits25k: string | null;
  // TikTok Specific
  tiktokFollower: string | null;
  tiktokSubscriber: string | null;
  tiktokModerator: string | null;
  tiktokGifter: string | null;
}

export interface LinkedUserData {
  id: string;
  username: string;
  avatar?: string;
  linkedAt: number;
}

export interface SyncLogEntry {
  id: string;
  timestamp: number;
  twitchUser: string;
  platform?: 'twitch' | 'tiktok'; // Added platform field
  roleName: string;
  source: 'Auto' | 'Manual';
}

// --- Leveling System Types ---

export interface RoleReward {
  level: number;
  roleId: string;
  roleName?: string;
}

export interface LevelSystemConfig {
  enabled: boolean;
  xpRate: number; // Multiplier
  minXp: number;
  maxXp: number;
  cooldown: number; // Seconds
  levelUpMessage: string;
  announceChannelId?: string; // Null = Current Channel
  roleRewards: RoleReward[];
  ignoredChannelIds: string[];
  /** "!rank" and "!top" in chat (server/leveling/chat.js). */
  chat?: {
    enabled: boolean;
    rankWord: string;
    topWord: string;
    rankText: string;
    topText: string;
    topCount: number;
    youtube: boolean;
  };
}

export interface LevelProfile {
  userId: string;
  username: string;
  avatar?: string;
  xp: number;
  level: number;
  lastXpTime: number; // Timestamp
}

// --- Theme & Language Types ---

export type ThemeId = 'light' | 'simon-default' | 'midnight-purple' | 'emerald-drift' | 'cyberpunk-gold' | 'ocean-blue';

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  primary: string;
  accentClass: string;
  bgClass: string;
  panelClass: string;
  textClass: string;
  borderClass: string;
  isLight?: boolean;
}

export type Language = 'en' | 'es';
