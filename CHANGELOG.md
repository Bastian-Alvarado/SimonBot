# Changelog

Newest first. Versions are **major.minor.patch**: patch for fixes, minor for something new, major for something you must redo (an old backup that won't load, a removed feature, signing in again). `npm run bump patch|minor|major` sets the number and adds a heading here. The app shows its version under Settings → About.

## [0.0.2] — 2026-10-18

- The dashboard talks to the server that served it, on whatever port that is. It used to look for the server on port 8081, so a SimonBot started on another port — beside SimonSays on the same phone, say — reached the wrong server and showed “Not from this address”.
- The loading screen shows SimonBot’s pixel-heart icon, with the spinning rings and glow SimonSays has. The bot’s face stays on the Home screen.
- SimonBot has a license, the same as SimonSays: Apache 2.0 with the Commons Clause — use it, change it and share it, but never sell it — and a NOTICE that keeps the credit to its author with every copy passed on.

## [0.0.1] — 2026-10-18

- SimonBot’s first version: a Discord bot you run yourself, for your own server. It was made from SimonSays 2.2.1 and keeps its Discord and community features; the stream app around them (overlays, alerts, OBS, the docks, Commands & Actions and Spotify) is not part of it.
- In Discord: slash commands; welcome and goodbye messages with welcome cards; Discord pages; role menus and buttons; roles for linked and loyal viewers; go-live posts, live DMs and highlights; moderation, and moderators who sign in to the dashboard.
- For the community: levels and XP, points, giveaways, polls, questions and game requests.
- Going live is read from Twitch, so go-live posts and the rest need your Twitch account connected.
- Everything in English and Spanish, with backups you can save and load from Settings. A SimonSays backup loads too: its Discord and community settings come across, and the rest is left out.
