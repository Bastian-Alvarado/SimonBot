# Changelog

Newest first. Versions are **major.minor.patch**: patch for fixes, minor for something new, major for something you must redo (an old backup that won't load, a removed feature, signing in again). `npm run bump patch|minor|major` sets the number and adds a heading here. The app shows its version under Settings → About.

## [0.1.0] — 2026-10-19

SimonBot is a Discord bot first. Everything your community does happens in Discord; Twitch and YouTube are only watched, to say when somebody goes live.

- **Going live, with no sign-in.** The Go live screen has a watch list: add Twitch and YouTube channels, yours or anybody’s, and the bot posts in Discord when one goes live. Twitch is read with your Twitch app’s Client ID and Client Secret, YouTube with an API key; nobody signs in to either. Each channel has its own post — channel, ping, message, card, wait, what happens when it ends — and a setup can be copied from one channel to another, or to all of them.
- **Your own channels.** Mark your channels with the star: while one of them is live, you are live, and live DMs, points for coming, your pages and questions follow that. Upgrading keeps the go-live post you had: your Twitch channel goes on the list with it.
- **Sign in with Discord.** You and your server’s moderators sign in to the dashboard with Discord. The server’s owner is you (or the account you name in Settings → Sign-in), and moderators are the role you choose there, or anybody whose role can moderate. Twitch sign-ins from before are let go once; the owner key still works.
- **Points, levels, giveaways and questions come from Discord only.** Points are earned for talking and for coming to streams; giveaways are entered with the word or the button in Discord, and their winners told there.
- **The mod log** is Discord’s: bans and timeouts in your server, posted in the channel you choose on the Moderators screen.
- **Taken out:** TikTok; reading Twitch and YouTube chat, and the chat relay; signing in to Twitch or YouTube; Role Management (Twitch-based roles and linking accounts); the Twitch schedule as Discord events; highlights; and the old polls. The Polls screen stays, empty, for a poll maker built on Discord’s own polls.

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
