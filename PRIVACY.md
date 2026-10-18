# Privacy

SimonBot is software you run yourself, on your own computer or on a spare
PC or phone on your network. It has no website and no accounts, and it sends
nothing to the people who make it: no analytics, no crash reports, no
tracking of any kind.

## Who is responsible for the data

Whoever runs it. Each copy keeps its data on the machine it runs on, and the
streamer running it decides what it connects to. That makes the streamer
responsible for their viewers' data under the rules where they stream (the
GDPR in the EU, for example). The authors never see any of it.

## What it keeps, and where

Everything is in two folders beside the server — `data/` (settings and
records) and `assets/` (the pictures and fonts you upload) — and in
`.env`, if you put sign-ins there.

- **Your sign-ins:** the keys and tokens for the platforms you connect. The
  server keeps them; they are never sent to a browser, and backups leave
  them out.
- **Your setup:** welcome messages, Discord pages, role menus and every
  other setting.
- **About your viewers**, from the chats and events of the platforms you
  connect:
  - their names and account ids on each platform, and which accounts are one
    person, when they or you link them;
  - levels, XP and points;
  - counts of what they did — when they were first and last seen, messages
    per platform, streams they took part in, bits, subs, gifts and Super
    Chats, giveaways won. Counts, not the messages themselves;
  - questions, game requests and giveaway entries;
  - from Discord, members' ids, names and roles, where role menus, role
    sync, welcome messages or the voice call need them.
- **Your streams:** when each one ran, who took part, and its highlights.
- **Who signs in to the dashboard**, once you switch sign-in on: you and your
  moderators — their Twitch name and id, when each was last seen, and the
  token Twitch gave them, kept on the server and never in a backup — and a
  record of what each moderator changed from the dashboard (the last 1000
  changes, also never in a backup).

## What leaves your computer

Only what a feature you turn on needs, sent straight to that service:

- **Twitch, YouTube (Google) and Discord**, once connected: reading chat and
  events, and doing what you set up — posting, answering in chat, giving a
  role.
- **TikTok LIVE**, through Euler Stream (eulerstream.com), the signing
  service the TikTok connection relies on. It sees which TikTok LIVE is being
  connected to.
- **jsDelivr**, for the emoji pictures on welcome cards, asked for by the
  emoji's code.
- **Pictures** from the addresses you give (Discord pages, welcome cards),
  and avatars and emotes from the platforms' own image servers.

Each service handles what it receives under its own privacy policy.

## Cookies

One, and only once somebody signs in: `ss_session`, which says which
sign-in a browser is. No script can read it, and it goes only to your own
copy of the app. Otherwise the dashboard keeps a few preferences in the
browser — the colour theme, which server to talk to — and they stay on that
device. There are no
ads, no analytics and no outside scripts, and the fonts ship with the app.

## Keeping it private

- Until you switch sign-in on (Settings → Sign-in), anybody who can reach the
  dashboard has all of it. Keep it on your own network until then, and switch
  sign-in on before it can be reached from anywhere else. It also asks search
  engines not to index it, but that is a request, not a lock.
- A backup is a file you download, with the sign-ins left out on purpose.
  It still holds your viewers' data, so keep it as privately as the app.

## Deleting

- **Levels & XP** can forget people after 3, 6 or 12 months away — those with
  a single account and no points to spend. It is off unless you choose it.
- To delete everything, stop the server and delete `data/` (and `assets/`).
- To end the app's access to an account, remove it on that platform: the bot
  from your Discord server, and the app from your connected apps on Twitch
  and Google.
