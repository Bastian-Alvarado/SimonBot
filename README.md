<p align="center">
  <img src="art/simonbot/bot-avatar-mint-circle-512.png" alt="SimonBot, Pixel Simon on mint" width="160">
</p>

<h1 align="center">SimonBot</h1>

<p align="center">
  <b>Simon's community bot for Discord, running on your own machine.</b><br>
  Welcomes, levels, points, giveaways, go-live posts and slash commands,
  with chat from Twitch, YouTube and TikTok counted in.
</p>

SimonBot looks after a Discord server for a streamer. It welcomes people,
hands out roles, keeps levels and points for everybody who talks — in
Discord and in the stream's chat — runs giveaways, polls and questions, and
posts when the stream goes live. Its look is taken from the bot's avatar
(Pixel Simon holding a pixel heart, in leaf, mint, grape and plum).

Everything runs **without a browser open**. The server owns every connection;
the dashboard is only where you set it up, and closing it changes nothing.

```
┌──────────────────────────────────────────────────────┐
│  server/  —  always running, owns everything          │
│                                                       │
│  Discord gateway · slash commands · Twitch · YouTube  │
│  TikTok · levels · points · giveaways · persistence   │
└──────────────────────────────────────────────────────┘
                 ▲
                 │ one WebSocket
          ┌──────┴──────┐
          │  Dashboard  │  any number, on any device
          │ (closable)  │
          └─────────────┘
```

Every dashboard is a replica. None of them hold authority, so opening or
closing one changes nothing about what the bot is doing.

## What SimonBot does

| Module | What it does |
|---|---|
| Welcome & goodbye | A drawn card and a message when somebody joins, leaves, boosts or is banned |
| Levels & XP | XP for chatting anywhere (Discord, Twitch, YouTube, TikTok), one level per person across accounts |
| Points | A score apart from XP, earned the same way, with a board of its own |
| Giveaways | Open a giveaway; people enter from any chat, with a button or `/sorteo` |
| Go live | A post when you go live on Twitch, a DM to whoever asked, and the chat's best moments |
| Role sync | Twitch subs, VIPs and mods get their Discord roles; loyal viewers get theirs |
| Role menus | Reaction roles and button menus people press to take a role |
| Polls, questions & requests | Polls voted on from every chat, questions collected for the stream, game requests voted on in Discord |
| Discord pages | Rules, information and links as tidy channel posts, built from blocks |
| Voice | The bot joins a voice call and shows who is in it |

**Slash commands.** Typing `/` in your server lists them, in Spanish first
and in English on an English Discord. Each answers the same way its button
or `!` word does.

| Command | What it does |
|---|---|
| `/perfil` | Your level, points, streak and linked accounts |
| `/rango` | Your level and place |
| `/top` | Who leads the levels |
| `/puntos` | How many points you have, shown only to you |
| `/sorteo` | Enter the open giveaway |
| `/avisame` | A DM when the stream starts |
| `/pregunta` | A question for the stream |

**The bot's home** shows whether SimonBot is online and which server it is
looking after, what it will do when you go live, every module with its state,
and two buttons: one gives the bot account Pixel Simon's face (no trip to the
Developer Portal), the other registers the slash commands again.

**Going live** is read from Twitch: the moment Twitch says your channel is
live, the go-live post, the DMs and the role updates follow. That needs your
Twitch account connected on the Connections screen.

**Versions.** SimonBot numbers its own versions, from 0.0.1.
What each version changed is in [CHANGELOG.md](CHANGELOG.md), and how the
numbers move is explained at its top. The running server reports its version
at `/api/health`, and the app shows it under Settings → About.

**Privacy.** What it keeps about you and your viewers, where, and what reaches
which service is in [PRIVACY.md](PRIVACY.md). Nothing is ever sent to the
people who make it.

---

## Getting started

About half an hour from nothing to SimonBot answering in your server. The app
also walks you through all of this itself, on its home screen and in
**Guides**, in English and Spanish — this is the same path, written down.

### What you need

- **A computer to run it on**, on while the bot should be. Windows, macOS or
  Linux; a spare PC or an old Android phone on your network works too.
- **[Node.js](https://nodejs.org) 22 or newer.** Take the LTS installer and
  keep its defaults. To check, open a terminal and run `node -v`.
- **A Discord server** you manage, for the bot.
- **The accounts you stream from**, for go-live posts and chat: Twitch, and
  YouTube or TikTok if you use them.

### 1. Download it

On GitHub, press **Code → Download ZIP** and unzip it somewhere that stays
put, like `Documents\SimonBot`. Or, with git, copy the address under
**Code** and run `git clone` with it.

### 2. Install it

Open a terminal in that folder. On Windows: open the folder, right-click
an empty space, and choose **Open in Terminal**. Then:

```bash
npm install
```

It downloads what the app needs. A few minutes, once.

### 3. Start it

```bash
npm run serve
```

The first time it builds the app, then starts it. When it says
`listening on http://0.0.0.0:8081`, it's running. **Leave that window
open** — it is the bot. Closing it stops everything; closing the browser
doesn't.

Every time after that, `npm start` is enough.

### 4. Open it

Go to **http://localhost:8081** in your browser. SimonBot's home screen
says whether the bot is connected, and **Guides** lists the setup steps
still to do, each with a button to where it's done.

### 5. Connect SimonBot to Discord

1. At [discord.com/developers/applications](https://discord.com/developers/applications),
   press **New Application** and name it (SimonBot, or what your bot should
   be called).
2. Under **Bot**, turn on **Server Members Intent** and **Message Content
   Intent** (Privileged Gateway Intents). The bot won't connect without them.
3. Copy the **Client ID** (OAuth2), the **bot token** (Bot → Reset Token,
   shown once) and the **client secret** (OAuth2 → Reset Secret).
4. On the **Connections** screen, paste the three, press the Discord login,
   then pick your server and the channel the bot talks in.
5. In Discord, **Server Settings → Roles**: drag the bot's role above every
   role it should hand out (levels, subs, role menus).
6. Back on SimonBot's home, press **Use SimonBot's face** to give the bot its
   avatar, and **Register / commands** so `/` lists its commands.

### 6. Connect where you stream

On the **Connections** screen:

- **Twitch.** Twitch needs an app of your own, made once:
  1. Turn on two-factor authentication on your Twitch account (twitch.tv →
     Settings → Security and Privacy). Twitch won't let you make an app
     without it.
  2. At [dev.twitch.tv/console/apps](https://dev.twitch.tv/console/apps),
     press **Register Your Application**. Any name; **OAuth Redirect URLs**:
     `http://localhost:8081/`; category: Chat Bot.
  3. Press **Manage**, copy the **Client ID** (not the secret), paste it on
     the Connections screen and press **Login with Twitch**.

  Sign in on the computer the app runs on: Twitch accepts a plain `http://`
  address only for `localhost`. A second account for the bot is optional
  (see [Connecting a separate Twitch bot account](#connecting-a-separate-twitch-bot-account)).
- **YouTube** and **TikTok LIVE** each have a click-by-click walkthrough in
  **Guides → Start here**. Both wait for your Twitch stream to be live before
  they look for one of their own.

### 7. Make it yours

- **Welcome & Goodbye:** the card, the message and the buttons under it.
- **Role management** and **Role menus:** which roles follow Twitch, and
  which people take for themselves.
- **Go live:** the post, the DMs and the highlights.
- **Levels**, **Points**, **Giveaways**, **Polls**, **Questions** and
  **Game requests:** each has its own screen.

### 8. Before anyone else can reach it

On your home network nothing more is needed. If the app can be reached
from anywhere else — a public address in front of it, say — switch
**sign-in** on first (**Settings → Sign-in**): from then on only you and
your Twitch channel's moderators can open the dashboard. Every address you
sign in from must be added to your Twitch app's OAuth Redirect URLs, as in
step 6.

Moderators then sign in with their own Twitch account and help look after
the server. The **Moderators** screen shows who's in and what they did.

### If something goes wrong

- **"Port 8081 is already in use":** the app is already running, in another
  window. Use that one, or close it first.
- **`'&&' is not a valid statement separator`** (Windows PowerShell 5.1):
  run the commands on separate lines, or join them with `;`.
- **Twitch says "redirect_mismatch":** the address in your Twitch app must be
  exactly the one you opened, `http://localhost:8081/` — slash included.
- **A phone or another PC can't open it:** allow Node.js through the
  Windows firewall on private networks (Windows asks the first time).
- **Anything else:** **Guides** has a "when it doesn't work" list for every
  platform.

### Keys in a file, if you prefer

Everything above goes in through the app, and the server keeps it. To set
the port, the address it listens on, or platform keys in a file instead,
copy `.env.example` to `.env` and fill in what you need; anything left
blank is ignored.

---

## Closing the dashboard

Start the server, set it up, then **close every browser tab**. Welcomes,
roles, levels, giveaways, go-live posts and slash commands all keep working.

Check on it from anywhere:

```bash
curl localhost:8081/api/health
```

---

## Using it from another device

The server holds every credential, connection and setting, so any device
that can reach it gets the same fully set-up app.

**On the host machine**, build once and serve everything from a single port:

```bash
npm run serve
```

**On any other device** — laptop, phone, tablet — open:

```
http://<host-machine-ip>:8081
```

A few things worth knowing:

- **Log in to platforms once, on the host.** OAuth redirect URLs are registered
  per address, so signing in from `http://192.168.1.50:8081` would need that
  exact URL added to your Twitch app. Do the login once on the host machine and
  every other device uses it, because the tokens live on the server.
- **Prefer `npm run serve` over `npm run dev` for this.** In dev the UI is on
  port 5173 and the API on 8081 — two different addresses, which means two
  separate `localStorage` buckets and a second Twitch redirect URL to register.
- **Only per-device preferences stay on the device:** language and colours.
- **Firewall:** Windows will likely prompt the first time something connects
  from another machine. Allow it on private networks.
- **Switch sign-in on before it can be reached from outside your home**
  (Settings → Sign-in). Until then there is no authentication: anybody who can
  reach the port has all of it. Set `HOST=127.0.0.1` to restrict it to the
  host machine only.
- **Signing in with Twitch comes back to the address it was opened at**, so
  every address you or your moderators use has to be added to your Twitch
  app's OAuth Redirect URLs (dev.twitch.tv → Your Console → Applications).

To point a dev-mode UI at a server on another machine, append
`?server=ws://<host-ip>:8081` to the URL.

## Connecting a separate Twitch bot account

Twitch authorises whichever account your browser is already signed into, so
clicking "Connect Bot" in the same window tends to reconnect your main account.
The login always shows Twitch's consent screen (`force_verify`), and warns
if the returning account is the one already connected as main — but the browser
session is still the thing that decides.

The reliable way:

1. Open the app in a **private / incognito window** — a separate cookie jar, so
   it has no Twitch session.
2. Sign in to Twitch there as the **bot** account.
3. Go to Connections and click **Connect Bot**.

Because credentials live on the server, your normal window will show the bot as
connected straight away. Close the private window; nothing was stored in it.

---

## Layout

```
server/           headless service — the whole application
  core/           event bus, atomic store, queues, logging
  engine/         welcomes, roles, go-live, giveaways, polls, questions, points…
  platforms/      twitch, tiktok, youtube, discord, discord-voice
  leveling/       unified XP + identity linking
  api/            REST + WebSocket hub, sign-in
  scripts/smoke.js  end-to-end test, no network needed — runs scripts/smoke/,
                    a file per part of the app, on one engine, in order

shared/           code both sides run: wire protocol, guides, card styles

web/              the dashboard
  App.tsx         shell and navigation
  components/     screens (views/) and their parts
  hooks/          thin client over the one server socket
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for how the server is put
together.

---

## Testing

```bash
npm --prefix server run test
```

Boots the engine with stub platforms, pushes synthetic chat and events through
the bus, and asserts on the results. No network and no browser.

### Developing

```bash
npm run dev
```

Runs the server on `:8081` and the UI on `:5173`, reloading as you edit.
It has no updater; keep a development copy up to date with git.

---

## Where it came from

SimonBot started as a copy of SimonSays, Simon's stream app, with everything
about running and decorating the stream — overlays, alerts, OBS, the docks,
commands and actions, Spotify — taken out. What is left is the server that
SimonSays V3 made headless, and the community features that live in Discord.

---

## License

Source available under the Apache License 2.0 with the **Commons Clause**
(see [LICENSE](LICENSE)), the same as SimonSays. In plain words: use it for
your own server and streams — monetized ones included — change it and share
it, as long as the license and the [NOTICE](NOTICE) file go with it, crediting
Bastian Alvarado as its author; but do not sell it, or sell hosting, setup or
support whose value is mainly SimonBot itself.
