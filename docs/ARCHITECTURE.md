# Architecture

## The one rule

**The server owns all state. Clients are replicas.**

Every design decision follows from that. If a client could own something, then
closing that client would lose it — and the bot has to keep running with no
browser open.

---

## Data flow

```
  Discord gateway ──> platforms/discord ──normalise──> core/bus ──┬─> leveling/ ──> XP, levels, points
                                                                  ├─> engine/   ──> Discord posts, roles
                                                                  └─> api/ws    ──> dashboards

  Twitch, YouTube ──> engine/watch.js (live status, polled) ──> core/bus ──> stream-sessions,
                                                                             announce, live-dms
```

Platforms never call the engine. The engine's modules get what they need to
talk back (saying a line in chat, posting in Discord) as services at init, or
through the platform modules' own `service` objects. Everything meets on the
bus. That is what makes the smoke test possible: swap in stub services and the
whole pipeline runs with no network.

### Live, and not

Whether a stream is on comes from the watch list (`engine/watch.js`). It reads
the public live status of the Twitch and YouTube channels on it, with the app's
keys and no sign-in: Twitch every 60 seconds, YouTube every 150. A channel goes
live the first time it is seen live, and is over only after two offline answers
in a row; a check that got no answer changes nothing. A channel marked "mine"
says when the streamer is live. `engine/stream-sessions.js` turns that into a
stream with a start and an end — one that drops and comes back within minutes
is the same stream — and says so on the bus (`stream:on`, `stream:off`). The
go-live posts (`announce.js`), live DMs (`live-dms.js`), points for coming, and
the stream's pages and questions all listen to those.

---

## Layers

### `core/`

- **`bus.js`** — the event bus. A listener that throws is isolated, so one bad
  subscriber cannot stop an event reaching the others. Also holds
  `normaliseChat` / `normaliseEvent`, the one shape every chat message and
  event is put into before the engine sees it.
- **`store.js`** — durable JSON collections. Atomic writes (temp + rename),
  debounced to coalesce bursts, synchronous flush on shutdown. A corrupt file
  falls back to defaults *independently* and is preserved as `.corrupt.<ts>`
  rather than overwritten.
- **`queue.js`** — named, rate-limited serial queues (Discord's REST calls go
  through one).
- **`logger.js`** — levelled logging with a ring buffer exposed at
  `/api/logs`.

### `engine/`

One module per feature, each with its own settings collection, an `init`
called from `server/index.js`, and a `snapshot()` for the dashboard:

- **Discord:** `welcome.js` and `welcome-card.js` (joins, leaves, and the
  drawn card), `discord-roles.js` (reaction roles and button menus),
  `discord-pages.js` and `banner-text.js` (standing posts built from blocks),
  `slash-commands.js`, `moderation.js` (the mod log), `discord-questions.js`
  (questions asked in a channel), `game-requests.js`, `profile-card.js`,
  `bot-face.js`.
- **Going live:** `watch.js` (the watch list), `stream-sessions.js`,
  `announce.js`, `live-dms.js`.
- **Community:** `giveaway.js`, `questions.js`, `points.js`,
  `viewer-history.js`.
- **The app itself:** `backup.js` (export and import, sign-ins left out),
  `updater.js`, `mod-activity.js` (what moderators did).

`engine/index.js` is small: it starts the giveaway and the questions queue with
the Discord service they answer through, and gives every page its part of the
snapshot and every backup its contents.

### `leveling/`

XP and levels for people who talk in Discord. Each person is one `user`
record, and an `accounts` map points each `discord:<id>` at it.
`leveling/chat.js` answers `!rank` and `!top`.

### `platforms/`

Each module owns one integration and exports:

- `init*()` — load credentials, optionally auto-connect
- `getStatus()` — for the snapshot
- `connect()` / `disconnect()` — where there is a connection to hold (Discord)
- `service` — the narrow surface the engine may call (Discord)

Twitch and YouTube hold no connection. With the app's keys they answer the
lookups `engine/watch.js` makes (`liveStreams`, `videos`, `latestVod`), and
`checkKeys()` / `checkKey()` say whether the keys work.

Credentials live in the store, never in code, and `getCredentials()`
deliberately returns only whether a secret is set (`hasBotToken`,
`hasClientSecret`, `hasApiKey`) rather than the secret itself. Secrets do not
travel to clients.

### `api/`

- **`ws.js`** — the hub. Sends a full snapshot on connect, then changes as
  they happen. Handles every client→server message, and checks each against
  who sent it (`mayAsk`): a moderator may do nearly everything but the
  Connections keys and accounts, backups, updates, the Moderators screen and
  the sign-in settings. Dead connections are reaped by a 30s ping sweep.
- **`http.js`** — REST for monitoring and uploads, the sign-in routes
  (`GET /auth/config`, `POST /auth/discord`), plus static hosting of the built
  UI, with a 404 for any address that is not the app.
- **`auth.js`** — sign-in with Discord: off until the streamer switches it on,
  then only the owner (the Discord server's owner, or the account named in
  Settings) and the server's moderators. Moderators are asked of Discord again
  every six hours.

---

## Client contract

`useStreamSystem` gives every screen one object:

```
{ data, settings, status, connections, actions, auth }
```

- `data.*` is read from the server snapshot
- `actions.*` are requests to the server
- `settings.*` stay on the device (language, colours)

One WebSocket carries a typed protocol (`shared/protocol.js`), with
request/response correlation by message id and an exponential-backoff
reconnect.

Sign-in with Discord starts in the browser, because it is a user-facing
redirect. The code Discord hands back goes to the server, which trades it with
the app's secret; the token is used once and never kept.

---

## Extending it

**A new platform:** add `platforms/foo.js` that publishes its chat and events
as `normaliseChat` / `normaliseEvent` onto the bus. Leveling, viewer history and
every dashboard pick them up with no further changes. A service that only
says when somebody is live is a watch in `engine/watch.js` instead.

**A new feature:** a module in `engine/` with its settings collection, an
`init` from `server/index.js`, its snapshot in the hello, a message in
`shared/protocol.js` and its case in `api/ws.js`, and — if its settings should
travel — an entry in `backup.js`'s `MANIFEST`. Then a screen in
`web/components/views/`, in the menu in `App.tsx`, and its words in both
languages in `web/constants.ts`.
