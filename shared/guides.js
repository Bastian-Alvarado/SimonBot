/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Guides tab: what somebody new to SimonBot reads to get from nothing
 * to a bot looking after their server, and comes back to when they want to
 * do something new.
 *
 *   - SETUP_CHECKS, setup steps that tick themselves from what the app can see
 *     (the bot in your server, a channel watched, sign-in on…), each with
 *     why it matters and a way there.
 *   - GUIDES, one per task, as steps with a way to the screen each is done
 *     on and a last line saying how to know it worked.
 *   - GLOSSARY, the app's own words.
 *   - BUILTIN_WORDS, the chat words SimonBot answers, read from the live
 *     settings so a word that was changed shows changed.
 *
 * Text, not pictures: a screenshot is out of date the day a screen changes,
 * and these name the screens and buttons through the app's own words, so a
 * renamed button is renamed here too. In a step:
 *
 *   {screen:<view>}  the screen's name in the menu, in the reader's language
 *   {t:<key>}        a button or field, by its word in web/constants.ts
 *   {redirect:<kind>} the address Discord signs in back to: page
 *
 * Anything else in braces ({user}, {input}) is left as it is, to be read.
 * The smoke test (server/scripts/smoke/guides.js) holds every screen, key
 * and guide named here to one that exists, in both languages.
 */

const connected = (s, k) => s?.status?.[k] === 'connected';

/*
  Set up, whether or not it answers right now: what the steps and the
  platform rows count as done. Twitch and YouTube are read with keys only,
  for going-live alerts: set up is the keys being in. The menu's row of
  platforms still lights only what is working. Reads `connections`, as the
  web app holds them (useStreamSystem).
*/
export const setUp = (s, k) => {
  if (connected(s, k)) return true;
  const c = s?.connections || {};
  if (k === 'twitch') return Boolean(c.twitchClientId && c.twitchHasSecret);
  if (k === 'youtube') return Boolean(c.youtubeHasKey);
  return false;
};
/** A platform row's state: working now, set up but not answering, or neither. */
const readyOr = (s, k) => (connected(s, k) ? 'on' : setUp(s, k) ? 'ready' : 'off');

/**
 * The setup steps, in the order they are best done. `done` reads what the
 * app knows: `{ status, data }`, as the web app holds them. `sticky` keeps a
 * tick once seen, for what is only true while something is up (an account is
 * connected only while it is up); `manual` is ticked by hand, for what the
 * app cannot see.
 * `optional` is not counted as left to do. `setup` is the platform
 * walkthrough (PLATFORM_SETUPS) its "Show me how" opens.
 *
 * Not the pre-stream checklist taken out on 2026-09-28: these are done once,
 * tick themselves, and keep nothing on the server.
 */
export const SETUP_CHECKS = [
  {
    id: 'discord', go: 'gallery', guide: 'connect', setup: 'discord', sticky: true,
    done: (s) => connected(s, 'discord'),
    en: { title: 'Put the bot in your Discord server', why: 'Everything SimonBot does happens there: welcomes, roles, levels, points, giveaways, questions and the slash commands.' },
    es: { title: 'Mete al bot en tu servidor de Discord', why: 'Todo lo que hace SimonBot pasa ahí: bienvenidas, roles, niveles, puntos, sorteos, preguntas y los comandos con barra.' },
  },
  {
    id: 'watch', go: 'go-live', guide: 'go-live', setup: 'twitch', optional: true,
    done: (s) => (s?.data?.watch?.channels || []).length > 0,
    en: { title: 'Watch your channel for going live', why: 'Add your Twitch or YouTube channel on the Go live screen, and the bot posts in Discord when you go live. No sign-in, just the platform’s keys.' },
    es: { title: 'Vigila tu canal para avisar del directo', why: 'Añade tu canal de Twitch o YouTube en la pantalla Aviso de directo, y el bot avisa en Discord cuando empiezas. Sin iniciar sesión, solo las claves de la plataforma.' },
  },
  {
    id: 'sign-in', go: 'settings', guide: 'sign-in', optional: true,
    done: (s) => Boolean(s?.auth?.me?.signIn),
    en: { title: 'Switch sign-in on', why: 'So only you, and your server’s moderators if you want them, can open the app — needed before it is reachable from outside your home.' },
    es: { title: 'Activa el inicio de sesión', why: 'Para que solo tú, y los moderadores de tu servidor si quieres, podáis abrir la app — necesario antes de que se pueda abrir desde fuera de casa.' },
  },
  {
    id: 'backup', go: 'settings', guide: 'backup', manual: true, optional: true,
    done: () => false,
    en: { title: 'Save a backup', why: 'Everything you set up, in one file, for a bad day or a new computer. Tick it when you have one.' },
    es: { title: 'Guarda una copia de seguridad', why: 'Todo lo que configuraste, en un archivo, para un mal día o un ordenador nuevo. Márcalo cuando la tengas.' },
  },
];

/**
 * Each platform, step by step, for somebody who has never made a developer
 * app: what it is for, what goes in the app and where each piece comes
 * from, the steps on the platform's own site, how to know it worked, and
 * what to do when it does not. On the Start here tab, where the first
 * setup steps send people.
 *
 * `state(s)` is 'on' (connected now), 'ready' (set up: see setUp) or 'off'.
 * `fields` are the boxes on the Connections screen, by the app's own word
 * for each, with where the value is found; `secret` ones are passwords.
 * In a step, {redirect:page} is the address to register for a sign-in that
 * comes back to this page (Discord's), written for the computer the app runs
 * on. Twitch and YouTube are keys only: nothing signs in to them.
 *
 * Checked against each site's rules on 2026-10-18: Twitch wants two-factor
 * sign-in on to register an app, and a redirect address even for an app
 * that never signs anybody in; Google's API key needs only the YouTube Data
 * API enabled in its project.
 */
export const PLATFORM_SETUPS = [
  {
    id: 'discord', color: '#5865F2', portal: 'https://discord.com/developers/applications', minutes: 10,
    state: (s) => (connected(s, 'discord') ? 'on' : 'off'),
    fields: [
      { t: 'discordClientId', en: 'Developer portal → your application → OAuth2 → Client ID. Not a secret.', es: 'Portal de desarrolladores → tu aplicación → OAuth2 → Client ID. No es secreto.' },
      { t: 'discordBotToken', secret: true, en: 'Bot → Reset Token. Discord shows it once.', es: 'Bot → Reset Token. Discord lo muestra una sola vez.' },
      { t: 'discordClientSecret', secret: true, en: 'OAuth2 → Reset Secret.', es: 'OAuth2 → Reset Secret.' },
    ],
    en: {
      name: 'Discord',
      for: 'Welcome messages, role menus, go-live posts, levels, and the slash commands in your server — and how you and your moderators sign in to this app.',
      worked: 'The bot shows as online in your server’s member list, and {screen:gallery} lists your server’s channels.',
    },
    es: {
      name: 'Discord',
      for: 'Mensajes de bienvenida, menús de roles, avisos de directo, niveles, y los comandos con barra en tu servidor — y cómo entráis tú y tus moderadores a esta app.',
      worked: 'El bot aparece en línea en la lista de miembros de tu servidor, y {screen:gallery} lista los canales de tu servidor.',
    },
    steps: [
      { en: 'Open discord.com/developers/applications, press “New Application”, give it the name your bot should have, and accept the terms.',
        es: 'Abre discord.com/developers/applications, pulsa “New Application”, ponle el nombre que debe tener tu bot y acepta las condiciones.' },
      { en: 'Bot page: press “Reset Token” and copy the token. Further down, under Privileged Gateway Intents, turn on “Server Members Intent” and “Message Content Intent”, and save.',
        es: 'Página Bot: pulsa “Reset Token” y copia el token. Más abajo, en Privileged Gateway Intents, activa “Server Members Intent” y “Message Content Intent”, y guarda.' },
      { en: 'OAuth2 page: copy the Client ID, press “Reset Secret” and copy the Client Secret. Under Redirects, add {redirect:page}, and save.',
        es: 'Página OAuth2: copia el Client ID, pulsa “Reset Secret” y copia el Client Secret. En Redirects, añade {redirect:page} y guarda.' },
      { en: 'Invite the bot: OAuth2 → URL Generator, tick “bot”, then the permissions Manage Roles, Manage Events, View Channels, Send Messages, Embed Links, Attach Files, Read Message History, Mention Everyone, Add Reactions, Use External Emojis, Manage Messages and Connect. Open the link it makes, choose your server, and Authorize.',
        es: 'Invita al bot: OAuth2 → URL Generator, marca “bot” y luego los permisos Manage Roles, Manage Events, View Channels, Send Messages, Embed Links, Attach Files, Read Message History, Mention Everyone, Add Reactions, Use External Emojis, Manage Messages y Connect. Abre el enlace que genera, elige tu servidor y autoriza.' },
      { go: 'gallery',
        en: 'On {screen:gallery}, paste the {t:discordClientId}, {t:discordBotToken} and {t:discordClientSecret}, press {t:discordLogin}, then choose your server and the channel the bot talks in.',
        es: 'En {screen:gallery}, pega el {t:discordClientId}, el {t:discordBotToken} y el {t:discordClientSecret}, pulsa {t:discordLogin}, y elige tu servidor y el canal donde habla el bot.' },
      { en: 'In Discord: Server Settings → Roles, drag the bot’s role above every role it should hand out (levels, role menus). Discord won’t let it give a role above its own.',
        es: 'En Discord: Ajustes del servidor → Roles, arrastra el rol del bot por encima de cada rol que deba dar (niveles, menús de roles). Discord no le deja dar un rol por encima del suyo.' },
    ],
    problems: [
      { en: 'The bot never comes online, or the app says “disallowed intents”: the two intents in step 2 are off. Turn them on and connect again.',
        es: 'El bot nunca se conecta, o la app dice “disallowed intents”: los dos intents del paso 2 están apagados. Actívalos y vuelve a conectar.' },
      { en: 'No channels to choose: the bot isn’t in that server yet. Do step 4 again.',
        es: 'No hay canales para elegir: el bot aún no está en ese servidor. Repite el paso 4.' },
      { en: '“Invalid OAuth2 redirect_uri”: the address under Redirects must be the one above exactly.',
        es: '“Invalid OAuth2 redirect_uri”: la dirección en Redirects debe ser exactamente la de arriba.' },
      { en: '“Missing Permissions” when it gives a role: move the bot’s role higher, as in step 6.',
        es: '“Missing Permissions” al dar un rol: sube el rol del bot, como en el paso 6.' },
    ],
  },
  {
    id: 'twitch', color: '#9146FF', portal: 'https://dev.twitch.tv/console/apps', minutes: 5, optional: true,
    state: (s) => readyOr(s, 'twitch'),
    fields: [
      { t: 'twitchClientId', en: 'Your app on dev.twitch.tv → Manage → Client ID. Not a secret.', es: 'Tu app en dev.twitch.tv → Manage → Client ID. No es secreto.' },
      { t: 'twitchClientSecret', secret: true, en: 'Same page → New Secret. Twitch shows it once.', es: 'La misma página → New Secret. Twitch lo muestra una sola vez.' },
    ],
    en: {
      name: 'Twitch',
      for: 'Optional: a Discord post when a Twitch channel on your watch list goes live — yours or anybody’s. Nobody signs in to Twitch.',
      worked: '{screen:gallery} says the keys work, and the Twitch mark at the bottom of the menu lights up.',
    },
    es: {
      name: 'Twitch',
      for: 'Opcional: un aviso en Discord cuando un canal de Twitch de tu lista entra en directo — el tuyo o el de quien sea. Nadie inicia sesión en Twitch.',
      worked: '{screen:gallery} dice que las claves funcionan, y la marca de Twitch al pie del menú se enciende.',
    },
    steps: [
      { en: 'Turn on two-factor authentication for your Twitch account: twitch.tv → Settings → Security and Privacy. Twitch won’t let you register an app without it.',
        es: 'Activa la verificación en dos pasos de tu cuenta de Twitch: twitch.tv → Configuración → Seguridad y privacidad. Twitch no te deja registrar una app sin ella.' },
      { en: 'Open dev.twitch.tv/console/apps and press “Register Your Application”. Name: anything nobody else has used. OAuth Redirect URLs: http://localhost (Twitch asks for one; nothing signs in with it). Category: Application Integration. Client Type: Confidential. Press Create.',
        es: 'Abre dev.twitch.tv/console/apps y pulsa “Register Your Application”. Name: cualquier nombre que nadie más use. OAuth Redirect URLs: http://localhost (Twitch pide una; nada inicia sesión con ella). Category: Application Integration. Client Type: Confidential. Pulsa Create.' },
      { en: 'Press Manage on the app you made: copy its Client ID, then press “New Secret” and copy the Client Secret.',
        es: 'Pulsa Manage en la app que creaste: copia su Client ID, luego pulsa “New Secret” y copia el Client Secret.' },
      { go: 'gallery',
        en: 'On {screen:gallery}, paste them into {t:twitchClientId} and {t:twitchClientSecret}.',
        es: 'En {screen:gallery}, pégalos en {t:twitchClientId} y {t:twitchClientSecret}.' },
      { go: 'go-live',
        en: 'On {screen:go-live}, add your channel and press {t:watchAdd}.',
        es: 'En {screen:go-live}, añade tu canal y pulsa {t:watchAdd}.' },
    ],
    problems: [
      { en: 'The keys did not work: the secret was copied wrong, or a new one was made since. Press “New Secret” again and paste the new one.',
        es: 'Las claves no funcionaron: el secreto se copió mal, o se creó otro después. Pulsa “New Secret” otra vez y pega el nuevo.' },
      { en: 'Your channel does not show as live: Twitch is asked once a minute, so give it a minute after you start.',
        es: 'Tu canal no sale en directo: a Twitch se le pregunta una vez por minuto, así que dale un minuto después de empezar.' },
    ],
  },
  {
    id: 'youtube', color: '#FF0000', portal: 'https://console.cloud.google.com/', minutes: 10, optional: true,
    state: (s) => readyOr(s, 'youtube'),
    fields: [
      { t: 'youtubeApiKey', secret: true, en: 'Google Cloud → APIs & Services → Credentials → your API key.', es: 'Google Cloud → APIs y servicios → Credenciales → tu clave de API.' },
    ],
    en: {
      name: 'YouTube',
      for: 'Optional: a Discord post when a YouTube channel on your watch list goes live. Nobody signs in to Google.',
      worked: '{screen:gallery} says the key works, and shows how much of today’s allowance is left.',
    },
    es: {
      name: 'YouTube',
      for: 'Opcional: un aviso en Discord cuando un canal de YouTube de tu lista entra en directo. Nadie inicia sesión en Google.',
      worked: '{screen:gallery} dice que la clave funciona, y muestra cuánto queda de la cuota de hoy.',
    },
    steps: [
      { en: 'Open console.cloud.google.com and make a new project (the project picker at the top → New project). Any name.',
        es: 'Abre console.cloud.google.com y crea un proyecto nuevo (el selector de proyectos de arriba → Proyecto nuevo). Cualquier nombre.' },
      { en: 'APIs & Services → Library: find “YouTube Data API v3” and press Enable.',
        es: 'APIs y servicios → Biblioteca: busca “YouTube Data API v3” y pulsa Habilitar.' },
      { en: 'APIs & Services → Credentials → Create credentials → API key. Then edit it: under API restrictions, choose “Restrict key” and tick only YouTube Data API v3, and save.',
        es: 'APIs y servicios → Credenciales → Crear credenciales → Clave de API. Luego edítala: en Restricciones de API, elige “Restringir clave”, marca solo YouTube Data API v3 y guarda.' },
      { go: 'gallery',
        en: 'On {screen:gallery}, paste it into {t:youtubeApiKey}.',
        es: 'En {screen:gallery}, pégala en {t:youtubeApiKey}.' },
      { go: 'go-live',
        en: 'On {screen:go-live}, choose YouTube, type the channel’s @handle or link, and press {t:watchAdd}.',
        es: 'En {screen:go-live}, elige YouTube, escribe el @usuario o el enlace del canal y pulsa {t:watchAdd}.' },
    ],
    problems: [
      { en: '“API key not valid”: copy the key again, and check the YouTube Data API v3 is enabled in the same project.',
        es: '“API key not valid”: vuelve a copiar la clave, y comprueba que la YouTube Data API v3 está habilitada en el mismo proyecto.' },
      { en: 'Allowance used up: YouTube gives each project 10,000 units a day; watching costs about 600 for a few channels. It comes back at midnight in California.',
        es: 'Cuota agotada: YouTube da a cada proyecto 10.000 unidades al día; vigilar cuesta unas 600 para unos pocos canales. Vuelve a medianoche en California.' },
    ],
  },
];

/** Everything a platform's walkthrough says, in one language, for the test that checks it. */
export function platformTexts(p, lang) {
  const words = p[lang] || {};
  return [words.name, words.for, words.worked, ...p.steps.map((s) => s[lang]), ...p.problems.map((x) => x[lang]), ...p.fields.map((f) => f[lang])]
    .filter((x) => typeof x === 'string');
}

/** Where the guides sit on the tab, in this order. */
export const GUIDE_GROUPS = [
  { id: 'start', en: 'Getting set up', es: 'Para empezar' },
  { id: 'more', en: 'Going further', es: 'Para ir más allá' },
];

/**
 * One guide per task. `screens` are the screens whose "?" opens it — the
 * first guide naming a screen is the one its "?" opens. Each step may carry
 * `go`, a screen to go to.
 */
export const GUIDES = [
  {
    id: 'connect', group: 'start', icon: 'plug', screens: ['gallery'],
    en: {
      title: 'Connect Discord, and the keys for alerts',
      intro: 'SimonBot is a Discord bot: everything it does happens in your server. Twitch and YouTube are only watched, to post when somebody goes live — with keys, not by signing in. It runs on a server, so every device you open it on is already set up. Start here, at the top of this screen, walks through each one click by click.',
      worked: 'The marks at the bottom of the menu light up: Discord, and Twitch and YouTube once their keys work.',
    },
    es: {
      title: 'Conecta Discord, y las claves para los avisos',
      intro: 'SimonBot es un bot de Discord: todo lo que hace pasa en tu servidor. Twitch y YouTube solo se vigilan, para avisar cuando alguien entra en directo — con claves, sin iniciar sesión. Corre en un servidor, así que cualquier dispositivo donde lo abras ya está listo. Empieza aquí, arriba en esta pantalla, explica cada una clic a clic.',
      worked: 'Las marcas al pie del menú se encienden: Discord, y Twitch y YouTube cuando sus claves funcionan.',
    },
    steps: [
      { go: 'gallery',
        en: 'Discord: make an application at discord.com/developers/applications, give it a bot with the Server Members and Message Content intents on, paste its {t:discordClientId}, {t:discordBotToken} and {t:discordClientSecret} on {screen:gallery}, invite it to your server and choose the server.',
        es: 'Discord: crea una aplicación en discord.com/developers/applications, dale un bot con los intents Server Members y Message Content activados, pega su {t:discordClientId}, {t:discordBotToken} y {t:discordClientSecret} en {screen:gallery}, invítalo a tu servidor y elige el servidor.' },
      { go: 'gallery',
        en: 'Twitch, for alerts: make an app at dev.twitch.tv/console/apps and paste its {t:twitchClientId} and {t:twitchClientSecret}.',
        es: 'Twitch, para avisos: crea una app en dev.twitch.tv/console/apps y pega su {t:twitchClientId} y su {t:twitchClientSecret}.' },
      { go: 'gallery',
        en: 'YouTube, for alerts: make an API key in Google Cloud with the YouTube Data API on, and paste it into {t:youtubeApiKey}.',
        es: 'YouTube, para avisos: crea una clave de API en Google Cloud con la YouTube Data API activada, y pégala en {t:youtubeApiKey}.' },
    ],
  },
  {
    id: 'go-live', group: 'start', icon: 'bell', screens: ['go-live'],
    en: {
      title: 'Going-live posts',
      intro: 'The bot watches the Twitch and YouTube channels on your list, and posts in Discord when one goes live — each channel with a post of its own.',
      worked: 'Each channel’s {t:goLiveTest} posts a sample where you told it to.',
    },
    es: {
      title: 'Avisos de directo',
      intro: 'El bot vigila los canales de Twitch y YouTube de tu lista, y avisa en Discord cuando uno entra en directo — cada canal con su propio aviso.',
      worked: 'La {t:goLiveTest} de cada canal publica un ejemplo donde le dijiste.',
    },
    steps: [
      { go: 'go-live',
        en: 'On {screen:go-live}, choose Twitch or YouTube, type the channel, tick {t:watchMine} if it is yours, and press {t:watchAdd}.',
        es: 'En {screen:go-live}, elige Twitch o YouTube, escribe el canal, marca {t:watchMine} si es tuyo y pulsa {t:watchAdd}.' },
      { go: 'go-live',
        en: 'Open its {t:watchPost}: the Discord channel to post in, who to ping, the message, the card, and what happens when the stream ends.',
        es: 'Abre su {t:watchPost}: el canal de Discord donde avisar, a quién mencionar, el mensaje, la tarjeta, y qué pasa cuando termina el directo.' },
      { go: 'go-live',
        en: 'For another channel set up the same way, use {t:watchCopyFrom} on it, or {t:watchApplyAll} on the one you like.',
        es: 'Para otro canal igual, usa {t:watchCopyFrom} en él, o {t:watchApplyAll} en el que te guste.' },
      { en: 'Your own channels (the star) say when you are live: live DMs, points for coming, and your pages follow them.',
        es: 'Tus propios canales (la estrella) dicen cuándo estás en directo: los DMs de directo, los puntos por venir y tus páginas los siguen.' },
    ],
  },
  {
    id: 'discord', group: 'more', icon: 'discord', screens: ['welcome-goodbye', 'discord-pages', 'reaction-roles', 'discord-buttons', 'voice'],
    en: {
      title: 'Your Discord server',
      intro: 'With the bot in your server, SimonBot looks after it while you stream and while you don’t.',
      worked: 'Each screen’s test posts a sample where you told it to, before anything reaches a real channel.',
    },
    es: {
      title: 'Tu servidor de Discord',
      intro: 'Con el bot en tu servidor, SimonBot lo cuida mientras transmites y mientras no.',
      worked: 'La prueba de cada pantalla publica un ejemplo donde le dijiste, antes de que nada llegue a un canal de verdad.',
    },
    steps: [
      { go: 'welcome-goodbye',
        en: '{screen:welcome-goodbye}: a message and a drawn card when somebody joins, and one when they leave.',
        es: '{screen:welcome-goodbye}: un mensaje y una tarjeta dibujada cuando alguien entra, y otro cuando se va.' },
      { go: 'reaction-roles',
        en: '{screen:reaction-roles} and {screen:discord-buttons}: menus people press to take a role.',
        es: '{screen:reaction-roles} y {screen:discord-buttons}: menús que la gente pulsa para tomar un rol.' },
      { go: 'discord-pages',
        en: '{screen:discord-pages}: rules, information and links as tidy channel posts, built from blocks.',
        es: '{screen:discord-pages}: normas, información y enlaces como publicaciones ordenadas del canal, hechas con bloques.' },
      { go: 'voice',
        en: '{screen:voice}: who is in your voice call and who is talking.',
        es: '{screen:voice}: quién está en tu llamada de voz y quién habla.' },
      { en: 'Try things in a private channel only you can see, then point them at the real ones.',
        es: 'Prueba las cosas en un canal privado que solo veas tú, y luego apúntalas a los de verdad.' },
    ],
  },
  {
    id: 'community', group: 'more', icon: 'trophy', screens: ['levels', 'points', 'polls', 'giveaway', 'questions', 'requests'],
    en: {
      title: 'Points, levels and giveaways',
      intro: 'Things for your community to do, all in Discord.',
      worked: 'The words at the bottom of this tab answer in your Discord.',
    },
    es: {
      title: 'Puntos, niveles y sorteos',
      intro: 'Cosas para que haga tu comunidad, todo en Discord.',
      worked: 'Las palabras al final de esta pestaña responden en tu Discord.',
    },
    steps: [
      { go: 'levels',
        en: '{screen:levels}: people earn XP for talking in your server, and can ask for their rank.',
        es: '{screen:levels}: la gente gana XP por hablar en tu servidor, y puede preguntar su puesto.' },
      { go: 'points',
        en: '{screen:points}: a score people earn for talking and for coming to your streams.',
        es: '{screen:points}: una puntuación que la gente gana por hablar y por venir a tus directos.' },
      { go: 'giveaway',
        en: '{screen:giveaway}: run one from its screen; people enter with a word or a button in Discord.',
        es: '{screen:giveaway}: lanza uno desde su pantalla; la gente entra con una palabra o un botón en Discord.' },
      { go: 'questions',
        en: '{screen:questions}: people ask with a word or in a Discord channel, and you answer them one by one.',
        es: '{screen:questions}: la gente pregunta con una palabra o en un canal de Discord, y tú las respondes una a una.' },
      { en: 'The words SimonBot answers are listed in the Reference tab, as they are set now.',
        es: 'Las palabras que responde SimonBot están en la pestaña Referencia, tal como están ahora.' },
    ],
  },
  {
    id: 'devices', group: 'more', icon: 'phone', screens: [],
    en: {
      title: 'Use it from your phone or another computer',
      intro: 'Everything lives on the server, so any device on your home network opens the same app, already set up.',
      worked: 'The phone shows the same screens, with the ones used mid-stream in a bar along the bottom.',
    },
    es: {
      title: 'Úsala desde tu móvil u otro ordenador',
      intro: 'Todo vive en el servidor, así que cualquier dispositivo de tu red de casa abre la misma app, ya configurada.',
      worked: 'El móvil muestra las mismas pantallas, con las que se usan en directo en una barra abajo.',
    },
    steps: [
      { en: 'Find the address of the computer that runs the app on your network, like 192.168.1.50, and open http://that-address:8081 on the other device.',
        es: 'Busca la dirección en tu red del ordenador que corre la app, como 192.168.1.50, y abre http://esa-dirección:8081 en el otro dispositivo.' },
      { en: 'Set up Discord and the keys once, on the device the app runs on: the others use the same.',
        es: 'Configura Discord y las claves una vez, en el dispositivo donde corre la app: los demás usan lo mismo.' },
      { go: 'settings',
        en: 'Until you switch sign-in on ({screen:settings}, {t:signInSection}), anybody on your network who opens that address has all of it. Switch it on before the app is reachable from anywhere else.',
        es: 'Hasta que actives el inicio de sesión ({screen:settings}, {t:signInSection}), cualquiera en tu red que abra esa dirección lo tiene todo. Actívalo antes de que la app se pueda abrir desde cualquier otro sitio.' },
      { go: 'settings',
        en: 'Each device keeps its own language and colours for this app, on {screen:settings}.',
        es: 'Cada dispositivo guarda su propio idioma y colores de la app, en {screen:settings}.' },
    ],
  },
  {
    id: 'sign-in', group: 'more', icon: 'shield', screens: [],
    en: {
      title: 'Keep the app yours: sign-in',
      intro: 'With sign-in on, only you and your Discord server’s moderators can open the dashboard, each signing in with their own Discord account.',
      worked: 'A browser that is not signed in gets the sign-in page.',
    },
    es: {
      title: 'Que la app sea solo tuya: el inicio de sesión',
      intro: 'Con el inicio de sesión activado, solo tú y los moderadores de tu servidor de Discord podéis abrir el panel, cada uno con su propia cuenta de Discord.',
      worked: 'Un navegador sin sesión ve la página de inicio de sesión.',
    },
    steps: [
      { go: 'gallery',
        en: 'Set up Discord first on {screen:gallery}: the sign-in asks Discord who you are, and the bot whether somebody moderates your server.',
        es: 'Configura Discord primero en {screen:gallery}: el inicio de sesión le pregunta a Discord quién eres, y al bot si alguien modera tu servidor.' },
      { go: 'settings',
        en: 'On {screen:settings}, under {t:signInSection}, press {t:signInDiscord} (or {t:signInClaim}), then {t:signInTurnOn}. The owner of the server signs in as you; if that is another account, put yours in {t:signInOwnerId}.',
        es: 'En {screen:settings}, en {t:signInSection}, pulsa {t:signInDiscord} (o {t:signInClaim}) y luego {t:signInTurnOn}. El dueño del servidor entra como tú; si es otra cuenta, pon la tuya en {t:signInOwnerId}.' },
      { go: 'settings',
        en: 'Keep the {t:signInOwnerKey} somewhere safe: it signs you in when Discord cannot. If a key gets out, make a new one there; the old one stops working.',
        es: 'Guarda la {t:signInOwnerKey} en un sitio seguro: te deja entrar cuando Discord no puede. Si una llave se filtra, crea una nueva ahí; la antigua deja de funcionar.' },
    ],
  },
  {
    id: 'moderators', group: 'more', icon: 'shield', screens: ['moderators'],
    en: {
      title: 'Your moderators in the app',
      intro: 'Your Discord server’s moderators can sign in with Discord and help look after your community: questions, giveaways, roles and the rest — without changing what is yours.',
      worked: 'They show on {screen:moderators}, and what they do is listed there.',
    },
    es: {
      title: 'Tus moderadores en la app',
      intro: 'Los moderadores de tu servidor de Discord pueden entrar con Discord y ayudar a cuidar tu comunidad: preguntas, sorteos, roles y lo demás — sin cambiar lo que es tuyo.',
      worked: 'Aparecen en {screen:moderators}, y lo que hacen queda anotado ahí.',
    },
    steps: [
      { go: 'settings',
        en: 'Switch sign-in on first (the guide above), and choose in {t:signInModRole} which role your moderators have. Anybody whose role can time out or manage messages counts too.',
        es: 'Activa primero el inicio de sesión (la guía de arriba), y elige en {t:signInModRole} qué rol tienen tus moderadores. Cuenta también quien tenga un rol que pueda aislar o gestionar mensajes.' },
      { en: 'Send them the app’s address — the same one registered under Redirects in your Discord application, as signing in comes back to it. They press {t:signInDiscord} with their own account.',
        es: 'Mándales la dirección de la app — la misma registrada en Redirects de tu aplicación de Discord, porque el inicio de sesión vuelve a ella. Pulsan {t:signInDiscord} con su propia cuenta.' },
      { en: 'They never see or change your connections, backups, updates, sign-in or the Moderators screen.',
        es: 'Nunca ven ni cambian tus conexiones, copias, actualizaciones, el inicio de sesión ni la pantalla de Moderadores.' },
      { go: 'moderators',
        en: 'On {screen:moderators}: who is signed in and who is here now, what each did, the Discord mod log, and buttons to sign one out or turn one away.',
        es: 'En {screen:moderators}: quién tiene sesión y quién está ahora, qué hizo cada uno, el registro de moderación de Discord, y botones para cerrarle la sesión a uno o impedirle entrar.' },
    ],
  },
  {
    id: 'backup', group: 'more', icon: 'save', screens: ['settings'],
    en: {
      title: 'Back up, or move to a new computer',
      intro: 'One file holds what you set up, to bring back after a bad day or to stand the app up somewhere new.',
      worked: 'Importing says {t:importDone}, and the page reloads with everything in place.',
    },
    es: {
      title: 'Copia de seguridad, o cambio de ordenador',
      intro: 'Un archivo guarda lo que configuraste, para recuperarlo tras un mal día o montar la app en otro sitio.',
      worked: 'Al importar dice {t:importDone}, y la página se recarga con todo en su sitio.',
    },
    steps: [
      { go: 'settings',
        en: 'On {screen:settings}, {t:exportConfig} saves your Discord setup, levels, points, viewers’ history and the rest to one file.',
        es: 'En {screen:settings}, pulsa {t:exportConfig} para guardar tu configuración de Discord, los niveles, los puntos, el historial de los espectadores y lo demás en un archivo.' },
      { en: 'Tokens, secrets and keys are left out on purpose: paste them again on the new computer. A backup from SimonSays loads too: what SimonBot has a place for comes in.',
        es: 'Los tokens, secretos y claves se dejan fuera a propósito: vuelve a pegarlos en el ordenador nuevo. Una copia de SimonSays también se carga: entra lo que SimonBot tiene dónde guardar.' },
      { en: 'Pictures and fonts you uploaded are in the app’s assets folder, not in the file: copy that folder across too.',
        es: 'Las imágenes y fuentes que subiste están en la carpeta assets de la app, no en el archivo: cópiala también.' },
      { go: 'settings',
        en: 'On the new install, {t:importConfig} replaces what is there with the file.',
        es: 'En la instalación nueva, pulsa {t:importConfig}: reemplaza lo que haya con el archivo.' },
    ],
  },
];

/** The app's own words, each with where it is used. */
export const GLOSSARY = [
  { id: 'owner-key', go: 'settings',
    en: { term: 'Owner key', means: 'Your way in when Discord is not: typed on the sign-in page. Keep it to yourself.' },
    es: { term: 'Llave del dueño', means: 'Tu forma de entrar cuando Discord no puede: se escribe en la página de inicio de sesión. No la compartas.' } },
  { id: 'mine', go: 'go-live',
    en: { term: 'Your own channel', means: 'A channel on the watch list marked with the star: while one of them is live, you are live.' },
    es: { term: 'Tu propio canal', means: 'Un canal de la lista marcado con la estrella: mientras uno de ellos está en directo, tú estás en directo.' } },
];

/**
 * The chat words SimonBot answers, as they are set
 * now: `read(data)` gives `{ on, word }` from the live settings, or null
 * while they have not arrived. `who` is who may use it; `after` is what
 * goes after the word.
 */
export const BUILTIN_WORDS = [
  { id: 'question', go: 'questions', who: 'anyone',
    read: (d) => (d?.questionSettings?.ask ? { on: d.questionSettings.ask.enabled !== false, word: d.questionSettings.ask.trigger } : null),
    en: { after: 'a question', does: 'Puts the question in your queue.' },
    es: { after: 'una pregunta', does: 'Pone la pregunta en tu cola.' } },
  // The word is the giveaway's own: the open one's while it runs, the one set up for the next otherwise.
  { id: 'giveaway', go: 'giveaway', who: 'anyone',
    read: (d) => {
      const s = d?.giveaway;
      const word = s ? (s.mode === 'open' ? s.keyword : (s.draft?.keyword || s.keyword)) : '';
      return word ? { on: true, word } : null;
    },
    en: { does: 'Enters the giveaway while one is open.' },
    es: { does: 'Entra al sorteo mientras haya uno abierto.' } },
  { id: 'rank', go: 'levels', who: 'anyone',
    read: (d) => (d?.xpConfig?.chat ? { on: d.xpConfig.chat.enabled !== false, word: d.xpConfig.chat.rankWord } : null),
    en: { does: 'Their level, XP and place.' },
    es: { does: 'Su nivel, su XP y su puesto.' } },
  { id: 'top', go: 'levels', who: 'anyone',
    read: (d) => (d?.xpConfig?.chat ? { on: d.xpConfig.chat.enabled !== false, word: d.xpConfig.chat.topWord } : null),
    en: { does: 'The top of the leaderboard.' },
    es: { does: 'Lo más alto de la clasificación.' } },
  { id: 'profile', go: 'levels', who: 'anyone',
    read: (d) => (d?.profileCard?.word ? { on: d.profileCard.enabled !== false, word: d.profileCard.word } : null),
    en: { does: 'Their profile card: level, points and streams.' },
    es: { does: 'Su tarjeta de perfil: nivel, puntos y directos.' } },
  { id: 'balance', go: 'points', who: 'anyone',
    read: (d) => (d?.pointsSettings?.words ? { on: d.pointsSettings.enabled !== false, word: d.pointsSettings.words.balance } : null),
    en: { does: 'How many points they have.' },
    es: { does: 'Cuántos puntos tienen.' } },
  { id: 'give', go: 'points', who: 'mods',
    read: (d) => (d?.pointsSettings?.words ? { on: d.pointsSettings.enabled !== false, word: d.pointsSettings.words.give } : null),
    en: { after: '@name 100', does: 'Gives somebody points.' },
    es: { after: '@nombre 100', does: 'Da puntos a alguien.' } },
];

/** The first guide each screen's "?" opens, or null. */
export function guideForScreen(view) {
  return GUIDES.find((g) => g.screens.includes(view)) || null;
}

/** The setup steps as they stand: each with whether it is done, and the count of what is left. */
export function setupState(state, { seen = [], ticked = [] } = {}) {
  const items = SETUP_CHECKS.map((c) => {
    let done = false;
    try { done = Boolean(c.done(state)); } catch { done = false; }
    if (!done && c.sticky && seen.includes(c.id)) done = true;
    if (!done && c.manual && ticked.includes(c.id)) done = true;
    return { check: c, done };
  });
  const needed = items.filter((i) => !i.check.optional);
  return { items, left: needed.filter((i) => !i.done).length, needed: needed.length };
}

/** The tokens a guide's text holds, for the screen that draws it and the test that checks it. */
export const GUIDE_TOKEN = /\{(screen|t|redirect):([a-zA-Z0-9_-]+)\}/g;

/** Every piece of text a guide holds, in one language: its title, intro, steps and last line. */
export function guideTexts(guide, lang) {
  const words = guide[lang] || {};
  return [words.title, words.intro, words.worked, ...guide.steps.map((s) => s[lang])].filter((x) => typeof x === 'string');
}
