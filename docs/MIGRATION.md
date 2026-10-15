# V2 → V3 migration notes

## The core change

V2's `useStreamSystem` hook was the application. It held the platform sockets,
the command engine, the cooldown maps, the alert queue and the config — all in
React state, all inside one browser tab.

V3 moves all of it into `server/`. The hook kept its **exact** public shape,
so at the moment of the move `App.tsx` and every file under `components/`
were byte-identical copies and the refactor was invisible above the hook
boundary. The UI has been developed well past V2 since; that held for the
move, not for the code as it is now.

```
V2:  Browser  ──owns──> platforms, engine, config, state
     Server   ──relays──> TikTok + Discord only

V3:  Server   ──owns──> everything
     Browser  ──renders──> a replica
```

---

## Moving your data

V2 kept commands, actions and alerts in **browser localStorage** — the server
never even implemented `get_app_config`, despite the client asking for it. So
there is no server-side database to copy.

To bring your V2 config across, open your V2 dashboard, run this in the
browser console, and save the output:

```js
copy(JSON.stringify({
  commands:     JSON.parse(localStorage.getItem('commands')      || '[]'),
  actions:      JSON.parse(localStorage.getItem('stream_actions')|| '[]'),
  alerts:       JSON.parse(localStorage.getItem('alert_configs') || '[]'),
  tagOutputs:   JSON.parse(localStorage.getItem('tag_outputs')   || '{}'),
}, null, 2))
```

Then drop those arrays into the matching files in `data/`:

| Paste into | From the key |
|---|---|
| `data/commands.json` | `commands` |
| `data/actions.json` | `actions` |
| `data/alerts.json` | `alerts` |
| `data/tag_outputs.json` | `tagOutputs` |

Restart the server. Exact key names varied across V2 builds — check your own
`localStorage` if one comes back empty.

**XP data** carries over automatically: drop your V2 `data/xp_data.json` into
`data/` and the server migrates it into the unified identity store on boot.

---

## Bugs fixed during the move

These were real defects in V2, not just restructuring:

| Bug | Where | Fix |
|---|---|---|
| Gemini API key inlined into the browser bundle | `vite.config.ts` `define` | Gemini now runs server-side only; the key never reaches a client |
| Corrupt JSON crashed server boot | `server.js` load block | Each collection falls back independently; the bad file is preserved as `.corrupt.<ts>` |
| Non-atomic writes truncated the database on crash | `fs.writeFileSync` | Write-to-temp + atomic rename |
| Username injected raw into Discord messages | level-up announce | `sanitise()` escapes markdown and neutralises `@everyone`/`@here` |
| An action triggering itself blew the stack | `trigger_action` | Depth limit + cycle detection |
| One shared queue serialised all Discord calls | global `requestQueue` | Named queues; roles and messages drain independently |
| 429 handling used a fixed delay | `discordRequest` | Honours Discord's `retry_after` |
| Gateway always re-identified after a drop | reconnect path | Resumes with the session id |
| Rapid connect calls opened duplicate sockets | `useTikTok` | Guarded with a connecting flag |
| Empty `catch {}` swallowed WebSocket errors | `useStreamSystem` | Logged with the offending payload |
| `JSON.parse` on localStorage crashed the hook | `useDiscord` | Wrapped with a fallback |
| Malformed emote ranges threw `TypeError` | `utils.ts` | Validated before use |
| Hardcoded absolute build path | `vite.config.ts` `outDir` | Builds to `./dist` |
| Secrets hardcoded as `YOUR_..._HERE` | `server.js` | Environment-driven config |

Three more surfaced while testing V3 itself:

- **`/assets/` route collision** — user uploads were served from `/assets/`,
  which shadowed Vite's own bundle output. Uploads moved to `/media/`.
- **Bind failure was non-fatal** — `EADDRINUSE` left a process running with no
  listener while a stale instance quietly answered requests. Now exits with a
  clear message.
- **`ws` swallowed the bind error first.** `WebSocketServer({ server })`
  attaches its own listener to the HTTP server's `error` event and re-emits it
  on itself. With no handler on the `WebSocketServer`, `EventEmitter` threw on
  the re-emit *before* the HTTP server's own handler ran — which is why the
  first attempt at the fix above appeared not to work. Both handlers now exist.

---

## Capabilities gained

- **Twitch EventSub over WebSocket.** V2 had no real follow events. Follows,
  subs, cheers, raids and channel-point redemptions now arrive properly, with
  no public callback URL needed.
- **OBS from the server.** V2's browser could not open `ws://localhost` from an
  HTTPS page — hence its "insecure context" modal. That constraint is gone.
- **Tags as text files.** `data/tags/*.txt` for OBS Text sources, no browser
  source required.
- **REST API.** `/api/health`, `/api/snapshot`, `/api/leaderboard`, `/api/logs`
  for monitoring from a phone or a script.
- **Multiple simultaneous surfaces.** Config UI, dock and overlay can all be
  open at once and stay in sync, because none of them own state.
- **Welcome messages and reaction roles actually fire** when nobody has the
  dashboard open — previously they simply did not.

---

## Needs your attention

Being straight about what is **not** finished:

1. **Kick is not ported.** V2 had partial Kick OAuth plumbing (a hardcoded
   client id and a token exchange). It was incomplete there and I did not carry
   it over. `relayConfig.kickToDiscord` is accepted but no Kick connector
   exists.

2. **Welcome-card canvas rendering is not server-side.** V2 composited join
   cards on a browser `<canvas>`. The server sends a Discord embed instead
   (title, description, colour, avatar thumbnail). Full canvas parity needs an
   image library such as `@napi-rs/canvas`. `utils.ts` still contains the
   original `renderCanvas` for the in-UI preview.

3. **`fetchTwitchTags` is a stub** returning `[]`. Twitch removed the stream
   tags API that V2 targeted; the modern equivalent is a different endpoint.
   Wire it up if the Tags view needs it.

4. **`data.linkedUsers` and `pendingLinks`** are surfaced from the server's
   accounts map in aggregate. If the Role Management view depends on the exact
   V2 per-user structure, that mapping may need adjusting once you see it
   against real data.

5. **No authentication on the server.** It binds `0.0.0.0` so OBS on another
   machine can reach it. On a trusted LAN that is fine; do not port-forward it
   to the internet as-is. Set `HOST=127.0.0.1` to restrict it to this machine.

6. **The UI has not been driven against live platforms.** The engine is covered
   by `npm --prefix server run test` and the build compiles, but I have not
   connected a real Twitch or Discord account. Expect to shake out small
   field-mapping issues on first run — the server log is verbose and will tell
   you what it received.
