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

- **Your sign-ins:** the keys for the platforms you connect: the Discord bot
  token and client secret, the Twitch Client Secret, the YouTube API key. The
  server keeps them; they are never sent to a browser, and backups leave
  them out.
- **Your setup:** welcome messages, Discord pages, role menus, the watch list
  and every other setting.
- **About the people in your Discord server**, from what the bot sees there:
  - their names and ids on Discord;
  - levels, XP and points;
  - counts of what they did — when they were first and last seen, messages,
    streams they took part in, giveaways won. Counts, not the messages
    themselves;
  - questions, game requests and giveaway entries;
  - who asked to be told privately when you go live, and whether they watch
    on Twitch or YouTube;
  - members' ids, names and roles, where role menus or welcome messages need
    them.
- **Your streams:** when each one ran, what it was called and played, who
  took part, and the recording it became, if Twitch or YouTube kept one.
- **Who signs in to the dashboard**, once you switch sign-in on: you and your
  moderators — their Discord name and id, and when each was last seen. Sign-ins
  are kept on the server and never in a backup, and the token Discord gives
  for a sign-in is used once and not kept. Also kept on the server, never in a
  backup: the owner key, the moderators you turned away, and a record of what
  each moderator changed from the dashboard (the last 1000 changes).

## What leaves your computer

Only what a feature you turn on needs, sent straight to that service:

- **Discord**, once connected: reading the messages and events of your
  server, and doing what you set up — posting, giving a role. Signing in to
  the dashboard asks Discord only who the account is.
- **Twitch and YouTube (Google)**, for the channels on your watch list: only
  their public live status is asked for — whether a channel is live, its
  title, game, thumbnail and start time, and the link to its latest
  recording. Twitch is asked with your app's Client ID and Client Secret,
  YouTube with your API key. Nobody's chat is read, and nobody signs in to
  either.
- **jsDelivr**, for the emoji pictures on welcome cards, asked for by the
  emoji's code.
- **Pictures** from the addresses you give (Discord pages, welcome cards),
  and avatars and thumbnails from the platforms' own image servers.

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
  It still holds everything above about your community, so keep it as
  privately as the app.

## Deleting

- **Levels & XP** can forget people after 3, 6 or 12 months away — those with
  no points to spend. It is off unless you choose it.
- To delete everything, stop the server and delete `data/` (and `assets/`).
- To end the bot's access to your server, remove the bot from it on Discord.
  Nothing has access to your Twitch or YouTube account, since nobody signs in
  to them; to stop the keys working, revoke them in the Twitch and Google
  consoles.
