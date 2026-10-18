# Architecture

## The one rule

**The server owns all state. Clients are replicas.**

Every design decision follows from that. If a client could own something, then
closing that client would lose it — and the bot has to keep running with no
browser open.

---

## Data flow

```
  Twitch IRC  ─┐
  EventSub    ─┤
  YouTube     ─┼─> platforms/ ──normalise──> core/bus ──┬─> engine/    ──> Discord posts, roles
  TikTok      ─┤                                        ├─> leveling/  ──> XP and levels
  Discord     ─┘                                        ├─> relay      ──> Discord
                                                        └─> api/ws     ──> dashboards
```

Platforms never call the engine. The engine's modules get what they need to
talk back (saying a line in chat, posting in Discord) as services at init, or
through the platform modules' own `service` objects. Everything meets on the
bus. That is what makes the smoke test possible: swap in stub services and the
whole pipeline runs with no network.

### Live, and not

Whether the stream is on comes from Twitch: `core/twitch-live.js` follows the
Twitch module's minute-by-minute live check and EventSub's stream online and
offline notices. `engine/stream-sessions.js` turns that into a stream with a
start and an end — one that drops and comes back within minutes is the same
stream — and says so on the bus (`stream:on`, `stream:off`). The go-live post,
live DMs, the schedule's Discord events, questions and role sync all listen to
those. TikTok and YouTube wait for Twitch to be live before they spend
anything looking for a stream of their own.

---

## Layers

### `core/`

- **`bus.js`** — the event bus. A listener that throws is isolated, so one bad
  subscriber cannot stop an event reaching the others. Also holds
  `normaliseChat` / `normaliseEvent`, which are why the engine can treat a
  TikTok gift and a Twitch cheer alike.
- **`store.js`** — durable JSON collections. Atomic writes (temp + rename),
  debounced to coalesce bursts, synchronous flush on shutdown. A corrupt file
  falls back to defaults *independently* and is preserved as `.corrupt.<ts>`
  rather than overwritten.
- **`queue.js`** — named, rate-limited serial queues (Discord's REST calls go
  through one).
- **`twitch-live.js`** — whether Twitch says the channel is live.
- **`logger.js`** — levelled logging with a ring buffer exposed at
  `/api/logs`.

### `engine/`

One module per feature, each with its own settings collection, an `init`
called from `server/index.js`, and a `snapshot()` for the dashboard:

- **Discord:** `welcome.js` and `welcome-card.js` (joins, leaves, boosts,
  bans, and the drawn card), `discord-roles.js` (reaction roles and button
  menus), `role-sync.js` (roles that follow Twitch and loyalty),
  `discord-pages.js` and `banner-text.js` (standing posts built from blocks),
  `slash-commands.js`, `moderation.js`, `relay.js` (chat into a Discord
  channel), `bot-face.js`.
- **Going live:** `stream-sessions.js`, `announce.js`, `live-dms.js`,
  `schedule-events.js` with `twitch-schedule.js`, `highlights.js`.
- **Community:** `giveaway.js`, `polls.js`, `questions.js` and
  `discord-questions.js`, `game-requests.js`, `points.js`, `profile-card.js`,
  `viewer-history.js`, `subscribers.js`.
- **The app itself:** `backup.js` (export and import, sign-ins left out),
  `updater.js`, `mod-activity.js`.

`engine/index.js` is small: it starts the polls, giveaway and questions with
the services they speak through, keeps the chat relay's settings, and builds
the snapshot a new dashboard is sent.

### `leveling/`

XP and levels for every platform, and the identity links that make several
accounts one person. `leveling/chat.js` answers `!rank` and `!top`.

### `platforms/`

Each module owns one integration and exports:

- `init*()` — load credentials, optionally auto-connect
- `getStatus()` — for the snapshot
- `connect()` / `disconnect()`
- `service` — the narrow surface the engine may call

Credentials live in the store, never in code, and `getCredentials()`
deliberately returns `hasToken: boolean` rather than the token itself. Secrets
do not travel to clients.

### `api/`

- **`ws.js`** — the hub. Sends a full snapshot on connect, then changes as
  they happen. Handles every client→server message, and checks each against
  who sent it (`mayAsk`): a moderator may do nearly everything but the
  streamer's accounts, backups, updates and sign-in. Dead connections are
  reaped by a 30s ping sweep.
- **`http.js`** — REST for monitoring and uploads, plus static hosting of the
  built UI, with a 404 for any address that is not the app.
- **`auth.js`** — sign-in: off until the streamer switches it on, then only
  the streamer and their Twitch channel's moderators.

---

## Client contract

`useStreamSystem` gives every screen one object:

```
{ data, settings, status, connections, actions, youtube }
```

- `data.*` is read from the server snapshot
- `actions.*` are requests to the server
- `settings.*` stay on the device (language, colours)

One WebSocket carries a typed protocol (`shared/protocol.js`), with
request/response correlation by message id and an exponential-backoff
reconnect.

OAuth *initiation* is browser-side, because it is a user-facing redirect —
but the resulting token is handed to the server at once and never used from
the client.

---

## Extending it

**A new platform:** add `platforms/foo.js` that emits `normaliseChat` /
`normaliseEvent` onto the bus. Leveling, points, viewer history, the relay and
every dashboard pick it up with no further changes.

**A new feature:** a module in `engine/` with its settings collection, an
`init` from `server/index.js`, its snapshot in the hello, a message in
`shared/protocol.js` and its case in `api/ws.js`, and — if its settings should
travel — an entry in `backup.js`'s `MANIFEST`. Then a screen in
`web/components/views/`, in the menu in `App.tsx`, and its words in both
languages in `web/constants.ts`.
