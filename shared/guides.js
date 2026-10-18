/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Guides tab: what somebody new to SimonBot reads to get from nothing
 * to a bot looking after their server, and comes back to when they want to
 * do something new.
 *
 *   - SETUP_CHECKS, setup steps that tick themselves from what the app can see
 *     (an account connected, the bot in your server, sign-in on…), each with
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
 *   {redirect:<kind>} the address a platform signs in back to: page or loopback
 *
 * Anything else in braces ({user}, {input}) is left as it is, to be read.
 * The smoke test (server/scripts/smoke/guides.js) holds every screen, key
 * and guide named here to one that exists, in both languages.
 */

const connected = (s, k) => s?.status?.[k] === 'connected';

/*
  Set up, whether or not it is connected right now: what the steps and the
  platform rows count as done. YouTube and TikTok are only connected while a
  stream is live, so a streamer who set both up saw them as not done between
  streams. The menu's row of platforms still lights only what is connected.
  Reads `connections`, as the web app holds them (useStreamSystem).
    YouTube  signed in
    TikTok   a username to watch
*/
export const setUp = (s, k) => {
  if (connected(s, k)) return true;
  const c = s?.connections || {};
  if (k === 'youtube') return Boolean(c.youtubeAuthorised);
  if (k === 'tiktok') return Boolean(String(c.tiktokUrl || '').trim()) || ['polling', 'waiting'].includes(s?.status?.tiktok);
  return false;
};
/** A platform row's state: connected now, set up and waiting for it, or neither. */
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
    id: 'platform', go: 'gallery', guide: 'connect', setup: 'twitch', sticky: true,
    done: (s) => ['twitch', 'youtube', 'tiktok'].some((k) => setUp(s, k)),
    en: { title: 'Connect where you stream', why: 'Twitch, YouTube or TikTok: going live, chat, follows and subs reach the bot from there.' },
    es: { title: 'Conecta donde transmites', why: 'Twitch, YouTube o TikTok: el directo, el chat, los follows y las subs le llegan al bot desde ahí.' },
  },
  {
    id: 'bot', go: 'gallery', guide: 'connect', setup: 'twitch-bot', sticky: true, optional: true,
    done: (s) => connected(s, 'twitchBot'),
    en: { title: 'Connect a Twitch bot account', why: 'So SimonBot’s answers in Twitch chat come from the bot rather than from you.' },
    es: { title: 'Conecta una cuenta de bot de Twitch', why: 'Para que las respuestas de SimonBot en el chat de Twitch salgan del bot y no de ti.' },
  },
  {
    id: 'discord', go: 'gallery', guide: 'discord', setup: 'discord', sticky: true, optional: true,
    done: (s) => connected(s, 'discord'),
    en: { title: 'Connect your Discord server', why: 'Welcomes, roles, go-live posts, and the slash commands.' },
    es: { title: 'Conecta tu servidor de Discord', why: 'Bienvenidas, roles, avisos de directo, y los comandos con barra.' },
  },
  {
    id: 'sign-in', go: 'settings', guide: 'sign-in', optional: true,
    done: (s) => Boolean(s?.auth?.me?.signIn),
    en: { title: 'Switch sign-in on', why: 'So only you, and your moderators if you want them, can open the app — needed before it is reachable from outside your home.' },
    es: { title: 'Activa el inicio de sesión', why: 'Para que solo tú, y tus moderadores si quieres, podáis abrir la app — necesario antes de que se pueda abrir desde fuera de casa.' },
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
 * comes back to this page (Twitch, Discord), and {redirect:loopback} the
 * same with 127.0.0.1 for localhost (Google takes only that) — both written
 * for the computer the app runs on.
 *
 * Checked against each site's rules on 2026-10-06: Twitch takes plain http
 * only for localhost and wants two-factor sign-in on to register an app;
 * Google takes no raw addresses but localhost ones, and signs a Testing app
 * out after 7 days.
 */
export const PLATFORM_SETUPS = [
  {
    id: 'twitch', color: '#9146FF', portal: 'https://dev.twitch.tv/console/apps', minutes: 5, localOnly: true,
    state: (s) => (connected(s, 'twitch') ? 'on' : 'off'),
    fields: [
      { t: 'twitchClientId', en: 'Your app on dev.twitch.tv → Manage → Client ID. Not a secret.', es: 'Tu app en dev.twitch.tv → Manage → Client ID. No es secreto.' },
    ],
    en: {
      name: 'Twitch',
      for: 'Going live, chat, follows, subs and bits, your schedule, and banning from the mod log.',
      worked: '{screen:gallery} shows your Twitch name and picture, and the Twitch mark at the bottom of the menu lights up.',
    },
    es: {
      name: 'Twitch',
      for: 'El directo, el chat, los follows, las subs y los bits, tu horario, y banear desde el registro de moderación.',
      worked: '{screen:gallery} muestra tu nombre y tu foto de Twitch, y la marca de Twitch al pie del menú se enciende.',
    },
    steps: [
      { en: 'Turn on two-factor authentication for your Twitch account: twitch.tv → Settings → Security and Privacy. Twitch won’t let you register an app without it.',
        es: 'Activa la verificación en dos pasos de tu cuenta de Twitch: twitch.tv → Configuración → Seguridad y privacidad. Twitch no te deja registrar una app sin ella.' },
      { en: 'Open dev.twitch.tv/console/apps, sign in with your streaming account, and press “Register Your Application”.',
        es: 'Abre dev.twitch.tv/console/apps, entra con tu cuenta de streaming y pulsa “Register Your Application”.' },
      { en: 'Name: anything nobody else has used, like “YourName Stream App”. OAuth Redirect URLs: paste {redirect:page} and press Add. Category: Chat Bot. Leave the rest as it is, and press Create.',
        es: 'Name: cualquier nombre que nadie más use, como “TuNombre Stream App”. OAuth Redirect URLs: pega {redirect:page} y pulsa Add. Category: Chat Bot. Deja lo demás como está y pulsa Create.' },
      { en: 'Press Manage on the app you made and copy its Client ID. That is all the app needs — not the client secret.',
        es: 'Pulsa Manage en la app que creaste y copia su Client ID. Es todo lo que necesita la app — no el client secret.' },
      { go: 'gallery',
        en: 'On {screen:gallery}, paste it into {t:twitchClientId} and press {t:twitchLogin}. Check that Twitch shows your streaming account, then Authorize.',
        es: 'En {screen:gallery}, pégalo en {t:twitchClientId} y pulsa {t:twitchLogin}. Comprueba que Twitch muestra tu cuenta de streaming y pulsa Autorizar.' },
    ],
    problems: [
      { en: '“redirect_mismatch” or “Invalid redirect URI”: the address in your Twitch app must be the one above exactly — http, localhost, the port, and the slash at the end.',
        es: '“redirect_mismatch” o “Invalid redirect URI”: la dirección de tu app de Twitch debe ser exactamente la de arriba — http, localhost, el puerto y la barra del final.' },
      { en: '“Redirect URIs must use HTTPS”: Twitch takes a plain http:// address only for localhost. Sign in on the computer the app runs on, as the note above says.',
        es: '“Redirect URIs must use HTTPS”: Twitch solo acepta una dirección http:// para localhost. Conéctate desde el ordenador donde corre la app, como dice la nota de arriba.' },
      { en: 'It signed in the wrong account: Twitch uses whoever is signed in on twitch.tv in that browser. Sign out there, or use a private window.',
        es: 'Se conectó la cuenta equivocada: Twitch usa la que tenga la sesión abierta en twitch.tv en ese navegador. Cierra la sesión ahí, o usa una ventana privada.' },
    ],
  },
  {
    id: 'twitch-bot', color: '#9146FF', portal: null, minutes: 5, optional: true,
    state: (s) => (connected(s, 'twitchBot') ? 'on' : 'off'),
    fields: [],
    en: {
      name: 'Twitch bot account',
      for: 'Optional: the app’s messages in chat come from a bot instead of from you.',
      worked: '{screen:gallery} shows the bot under {t:botAccount}.',
    },
    es: {
      name: 'Cuenta de bot de Twitch',
      for: 'Opcional: los mensajes de la app en el chat salen de un bot en vez de ti.',
      worked: '{screen:gallery} muestra el bot en {t:botAccount}.',
    },
    steps: [
      { en: 'Make a second Twitch account for the bot, with the name chat should see. Connect your main account first: the bot uses the same Client ID, so there is nothing new to register.',
        es: 'Crea una segunda cuenta de Twitch para el bot, con el nombre que debe ver el chat. Conecta antes tu cuenta principal: el bot usa el mismo Client ID, así que no hay que registrar nada nuevo.' },
      { en: 'On the computer the app runs on, open the app in a private (incognito) window, and sign in to twitch.tv there as the bot.',
        es: 'En el ordenador donde corre la app, ábrela en una ventana privada (incógnito) y entra en twitch.tv ahí con la cuenta del bot.' },
      { go: 'gallery',
        en: 'In that window, on {screen:gallery}, press {t:connectBotBtn} and Authorize as the bot. Then close the private window: nothing was kept in it.',
        es: 'En esa ventana, en {screen:gallery}, pulsa {t:connectBotBtn} y autoriza como el bot. Luego cierra la ventana privada: no se guardó nada en ella.' },
      { en: 'Make the bot a moderator of your channel: type /mod and its name in your chat. Then chat’s limits don’t slow it down.',
        es: 'Haz al bot moderador de tu canal: escribe /mod y su nombre en tu chat. Así los límites del chat no lo frenan.' },
    ],
    problems: [
      { en: 'It connected your main account as the bot: that window was still signed in as you. Sign out of twitch.tv in it, or start a fresh private window.',
        es: 'Conectó tu cuenta principal como bot: esa ventana seguía con tu sesión. Cierra la sesión de twitch.tv en ella, o abre otra ventana privada.' },
    ],
  },
  {
    id: 'youtube', color: '#FF0000', portal: 'https://console.cloud.google.com/', minutes: 15, localOnly: true,
    state: (s) => readyOr(s, 'youtube'),
    fields: [
      { t: 'youtubeClientId', en: 'Google Cloud → Clients → your web client → Client ID.', es: 'Google Cloud → Clientes → tu cliente web → ID de cliente.' },
      { t: 'youtubeClientSecret', secret: true, en: 'Shown when you make the client. Copy it then: Google may not show it again (you can add a new one).', es: 'Se muestra al crear el cliente. Cópialo en ese momento: puede que Google no lo vuelva a mostrar (puedes crear otro).' },
    ],
    en: {
      name: 'YouTube',
      for: 'YouTube chat, members, gifted memberships and Super Chats, and changing your title and description.',
      worked: '{screen:gallery} shows your channel. While you are not live it says it is waiting for a broadcast — that is normal.',
    },
    es: {
      name: 'YouTube',
      for: 'El chat de YouTube, miembros, membresías regaladas y Super Chats, y cambiar tu título y descripción.',
      worked: '{screen:gallery} muestra tu canal. Mientras no estás en directo dice que espera una emisión — es normal.',
    },
    steps: [
      { en: 'Open console.cloud.google.com with the Google account that owns your channel, and make a new project (the project picker at the top → New project). Any name.',
        es: 'Abre console.cloud.google.com con la cuenta de Google dueña de tu canal y crea un proyecto nuevo (el selector de proyectos de arriba → Proyecto nuevo). Cualquier nombre.' },
      { en: 'APIs & Services → Library: find “YouTube Data API v3” and press Enable.',
        es: 'APIs y servicios → Biblioteca: busca “YouTube Data API v3” y pulsa Habilitar.' },
      { en: 'Google Auth Platform (the OAuth consent screen): Get started. Give it a name and your email, choose External, and finish. Then, under Audience, press “Publish app” so it is In production — in Testing, Google signs you out every 7 days.',
        es: 'Google Auth Platform (la pantalla de consentimiento de OAuth): Comenzar. Dale un nombre y tu correo, elige Externo y termina. Después, en Público, pulsa “Publicar app” para que quede En producción — en Prueba, Google te desconecta cada 7 días.' },
      { en: 'Clients → Create client. Application type: Web application. Under “Authorised redirect URIs” — not JavaScript origins — add {redirect:loopback}, slash at the end included. Create, and copy the Client ID and the Client secret.',
        es: 'Clientes → Crear cliente. Tipo de aplicación: Aplicación web. En “URI de redireccionamiento autorizados” — no en orígenes de JavaScript — añade {redirect:loopback}, con la barra del final. Crea y copia el ID de cliente y el secreto de cliente.' },
      { go: 'gallery',
        en: 'On {screen:gallery}, paste them into the YouTube {t:youtubeClientId} and {t:youtubeClientSecret}, press {t:youtubeLogin} with your channel’s account, and allow it.',
        es: 'En {screen:gallery}, pégalos en {t:youtubeClientId} y {t:youtubeClientSecret} de YouTube, pulsa {t:youtubeLogin} con la cuenta de tu canal y permítelo.' },
    ],
    problems: [
      { en: '“Google hasn’t verified this app”: it is your own app, so that is expected. Press Advanced, then “Go to” your app’s name.',
        es: '“Google no ha verificado esta aplicación”: es tu propia app, así que es lo esperado. Pulsa Configuración avanzada y luego “Ir a” el nombre de tu app.' },
      { en: '“redirect_uri_mismatch”: the address must be under Authorised redirect URIs, character for character: 127.0.0.1, the port, the slash at the end.',
        es: '“redirect_uri_mismatch”: la dirección debe estar en URI de redireccionamiento autorizados, letra por letra: 127.0.0.1, el puerto y la barra del final.' },
      { en: '“Access blocked” or signed out after a week: the app is still in Testing. Publish it (Audience → Publish app) and sign in again.',
        es: '“Acceso bloqueado” o desconectado a la semana: la app sigue en Prueba. Publícala (Público → Publicar app) y vuelve a conectarte.' },
    ],
  },
  {
    id: 'tiktok', color: '#ff0050', portal: null, minutes: 2,
    state: (s) => readyOr(s, 'tiktok'),
    fields: [
      { t: 'tiktokUsername', en: 'Your TikTok username, without the @.', es: 'Tu usuario de TikTok, sin la @.' },
      { t: 'tiktokSignKey', secret: true, en: 'Optional: a free API key from eulerstream.com.', es: 'Opcional: una API key gratis de eulerstream.com.' },
    ],
    en: {
      name: 'TikTok LIVE',
      for: 'TikTok LIVE chat, gifts, likes and follows. No developer app to make.',
      worked: '{screen:gallery} shows TikTok online while you are live there.',
    },
    es: {
      name: 'TikTok LIVE',
      for: 'El chat, los regalos, los likes y los follows de TikTok LIVE. Sin app de desarrollador que crear.',
      worked: '{screen:gallery} muestra TikTok en línea mientras estás en directo ahí.',
    },
    steps: [
      { go: 'gallery',
        en: 'On {screen:gallery}, type your username into {t:tiktokUsername} and press {t:connect}.',
        es: 'En {screen:gallery}, escribe tu usuario en {t:tiktokUsername} y pulsa {t:connect}.' },
      { en: 'That’s it: from then on the app looks for your TikTok LIVE by itself once your stream starts — nothing to press each time.',
        es: 'Eso es todo: desde entonces la app busca tu TikTok LIVE sola cuando empieza tu directo — nada que pulsar cada vez.' },
      { go: 'gallery',
        en: 'Optional: a free key from eulerstream.com in {t:tiktokSignKey} makes connecting quicker and steadier; without one TikTok goes through a shared allowance.',
        es: 'Opcional: una clave gratis de eulerstream.com en {t:tiktokSignKey} hace que conecte más rápido y estable; sin ella TikTok pasa por una cuota compartida.' },
    ],
    problems: [
      { en: 'Not connecting while you are live: TikTok lets the app in only once the LIVE has started — give it a minute. Check the username has no @ and no spaces.',
        es: 'No conecta mientras estás en directo: TikTok deja entrar a la app solo cuando el LIVE ya empezó — dale un minuto. Comprueba que el usuario no lleva @ ni espacios.' },
    ],
  },
  {
    id: 'discord', color: '#5865F2', portal: 'https://discord.com/developers/applications', minutes: 10, optional: true,
    state: (s) => (connected(s, 'discord') ? 'on' : 'off'),
    fields: [
      { t: 'discordClientId', en: 'Developer portal → your application → OAuth2 → Client ID. Not a secret.', es: 'Portal de desarrolladores → tu aplicación → OAuth2 → Client ID. No es secreto.' },
      { t: 'discordBotToken', secret: true, en: 'Bot → Reset Token. Discord shows it once.', es: 'Bot → Reset Token. Discord lo muestra una sola vez.' },
      { t: 'discordClientSecret', secret: true, en: 'OAuth2 → Reset Secret.', es: 'OAuth2 → Reset Secret.' },
    ],
    en: {
      name: 'Discord',
      for: 'Welcome messages, role menus, go-live posts, levels, and the slash commands in your server.',
      worked: 'The bot shows as online in your server’s member list, and {screen:gallery} lists your server’s channels.',
    },
    es: {
      name: 'Discord',
      for: 'Opcional: mensajes de bienvenida, menús de roles, avisos de directo, niveles, y tus comandos funcionando en tu servidor.',
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
      { en: 'In Discord: Server Settings → Roles, drag the bot’s role above every role it should hand out (levels, subs, role menus). Discord won’t let it give a role above its own.',
        es: 'En Discord: Ajustes del servidor → Roles, arrastra el rol del bot por encima de cada rol que deba dar (niveles, subs, menús de roles). Discord no le deja dar un rol por encima del suyo.' },
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
      title: 'Connect your accounts',
      intro: 'SimonBot does its work on a server, so you sign in once and every device you open it on is already set up. Whatever you leave unconnected simply stays off. Start here, at the top of this screen, walks through each platform click by click.',
      worked: 'The marks at the bottom of the menu light up, one for each account that is connected.',
    },
    es: {
      title: 'Conecta tus cuentas',
      intro: 'SimonBot trabaja en un servidor: te conectas una vez y cualquier dispositivo donde lo abras ya está listo. Lo que no conectes simplemente queda apagado. Empieza aquí, arriba en esta pantalla, explica cada plataforma clic a clic.',
      worked: 'Las marcas al pie del menú se encienden, una por cada cuenta conectada.',
    },
    steps: [
      { go: 'gallery',
        en: 'Twitch: make a free app at dev.twitch.tv/console/apps and paste into it the redirect URL that {screen:gallery} shows. Copy its Client ID into the box on that screen, then connect.',
        es: 'Twitch: crea una app gratis en dev.twitch.tv/console/apps y pega en ella la URL de redirección que muestra {screen:gallery}. Copia su Client ID en la casilla de esa pantalla y conecta.' },
      { go: 'gallery',
        en: 'A Twitch bot account is optional, and keeps SimonBot’s answers from coming from you. Open the app in a private window, sign in to Twitch there as the bot, and press {t:connectBotBtn}.',
        es: 'Una cuenta de bot de Twitch es opcional, y hace que las respuestas de SimonBot no salgan a tu nombre. Abre la app en una ventana privada, entra en Twitch ahí con la cuenta del bot y pulsa {t:connectBotBtn}.' },
      { go: 'gallery',
        en: 'YouTube signs in the same way, with a Google app of your own; TikTok only needs your username.',
        es: 'YouTube se conecta igual, con una app de Google tuya; TikTok solo necesita tu nombre de usuario.' },
      { go: 'gallery',
        en: 'Discord: make an application at discord.com/developers/applications, give it a bot with the Server Members and Message Content intents on, paste the bot’s token on {screen:gallery}, invite it to your server and choose the server.',
        es: 'Discord: crea una aplicación en discord.com/developers/applications, dale un bot con los intents Server Members y Message Content activados, pega el token del bot en {screen:gallery}, invítalo a tu servidor y elige el servidor.' },
    ],
  },
  {
    id: 'discord', group: 'more', icon: 'discord', screens: ['welcome-goodbye', 'discord-pages', 'role-management', 'reaction-roles', 'discord-buttons', 'go-live', 'voice'],
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
      { go: 'go-live',
        en: '{screen:go-live}: a post when you go live, and messages to the people who asked for one.',
        es: '{screen:go-live}: una publicación cuando entras en directo, y mensajes a quien pidió uno.' },
      { go: 'role-management',
        en: '{screen:role-management}: viewers link their accounts, and roles follow subs, levels and loyalty.',
        es: '{screen:role-management}: los espectadores vinculan sus cuentas, y los roles siguen a las subs, los niveles y la fidelidad.' },
      { en: 'Try things in a private channel only you can see, then point them at the real ones.',
        es: 'Prueba las cosas en un canal privado que solo veas tú, y luego apúntalas a los de verdad.' },
    ],
  },
  {
    id: 'community', group: 'more', icon: 'trophy', screens: ['levels', 'points', 'polls', 'giveaway', 'questions', 'requests'],
    en: {
      title: 'Points, levels, polls and giveaways',
      intro: 'Things for your viewers to do, across every platform at once.',
      worked: 'The words at the bottom of this tab answer in your chat.',
    },
    es: {
      title: 'Puntos, niveles, encuestas y sorteos',
      intro: 'Cosas para que hagan tus espectadores, en todas las plataformas a la vez.',
      worked: 'Las palabras al final de esta pestaña responden en tu chat.',
    },
    steps: [
      { go: 'levels',
        en: '{screen:levels}: viewers earn XP for chatting and watching, and can ask for their rank.',
        es: '{screen:levels}: los espectadores ganan XP por chatear y mirar, y pueden preguntar su puesto.' },
      { go: 'points',
        en: '{screen:points}: a score viewers earn for chatting, coming to streams, following and subscribing.',
        es: '{screen:points}: una puntuación que ganan los espectadores por chatear, venir a los directos, seguir y suscribirse.' },
      { go: 'polls',
        en: '{screen:polls} and {screen:giveaway}: run one from its screen, or with a moderator’s chat word.',
        es: '{screen:polls} y {screen:giveaway}: lanza una desde su pantalla, o con la palabra de un moderador en el chat.' },
      { go: 'questions',
        en: '{screen:questions}: viewers ask with a word in chat or in a Discord channel, and you answer them one by one.',
        es: '{screen:questions}: los espectadores preguntan con una palabra en el chat o en un canal de Discord, y tú las respondes una a una.' },
      { en: 'The chat words SimonBot answers are listed in the Reference tab, as they are set now.',
        es: 'Las palabras del chat que responde SimonBot están en la pestaña Referencia, tal como están ahora.' },
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
      { en: 'Sign in to the platforms once, on the device the app runs on: the others use that same sign-in.',
        es: 'Conéctate a las plataformas una vez, en el dispositivo donde corre la app: los demás usan esa misma conexión.' },
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
      intro: 'With sign-in on, only you and the moderators of your Twitch channel can open the dashboard.',
      worked: 'A browser that is not signed in gets the sign-in page.',
    },
    es: {
      title: 'Que la app sea solo tuya: el inicio de sesión',
      intro: 'Con el inicio de sesión activado, solo tú y los moderadores de tu canal de Twitch podéis abrir el panel.',
      worked: 'Un navegador sin sesión ve la página de inicio de sesión.',
    },
    steps: [
      { go: 'gallery',
        en: 'Connect Twitch first on {screen:gallery}: the sign-in asks Twitch who you are, and whose moderator somebody is.',
        es: 'Conecta Twitch primero en {screen:gallery}: el inicio de sesión le pregunta a Twitch quién eres, y de quién es moderador alguien.' },
      { go: 'settings',
        en: 'On {screen:settings}, under {t:signInSection}, press {t:signInTwitch} (or {t:signInClaim}), then {t:signInTurnOn}.',
        es: 'En {screen:settings}, en {t:signInSection}, pulsa {t:signInTwitch} (o {t:signInClaim}) y luego {t:signInTurnOn}.' },
      { go: 'settings',
        en: 'Keep the {t:signInOwnerKey} somewhere safe: it signs you in when Twitch cannot. If a key gets out, make a new one there; the old one stops working.',
        es: 'Guarda la {t:signInOwnerKey} en un sitio seguro: te deja entrar cuando Twitch no puede. Si una llave se filtra, crea una nueva ahí; la antigua deja de funcionar.' },
    ],
  },
  {
    id: 'moderators', group: 'more', icon: 'shield', screens: ['moderators'],
    en: {
      title: 'Your moderators in the app',
      intro: 'Every moderator of your Twitch channel can sign in and help look after your community: questions, polls, giveaways, roles and the rest — without changing what is yours.',
      worked: 'They show on {screen:moderators}, and what they do is listed there.',
    },
    es: {
      title: 'Tus moderadores en la app',
      intro: 'Todos los moderadores de tu canal de Twitch pueden iniciar sesión y ayudar a cuidar tu comunidad: preguntas, encuestas, sorteos, roles y lo demás — sin cambiar lo que es tuyo.',
      worked: 'Aparecen en {screen:moderators}, y lo que hacen queda anotado ahí.',
    },
    steps: [
      { go: 'settings',
        en: 'Switch sign-in on first (the guide above), then send your moderators the app’s address — added to your Twitch app’s OAuth Redirect URLs on dev.twitch.tv first, as signing in with Twitch comes back to it. They press {t:signInTwitch} with their own account.',
        es: 'Activa primero el inicio de sesión (la guía de arriba) y luego manda a tus moderadores la dirección de la app — añadida antes a las OAuth Redirect URLs de tu app de Twitch en dev.twitch.tv, porque el inicio de sesión con Twitch vuelve a ella. Pulsan {t:signInTwitch} con su propia cuenta.' },
      { en: 'They never see or change your connections, backups, updates, sign-in or the Moderators screen.',
        es: 'Nunca ven ni cambian tus conexiones, copias, actualizaciones, el inicio de sesión ni la pantalla de Moderadores.' },
      { go: 'moderators',
        en: 'On {screen:moderators}: who is signed in and who is here now, what each did, and buttons to sign one out or turn one away.',
        es: 'En {screen:moderators}: quién tiene sesión y quién está ahora, qué hizo cada uno, y botones para cerrarle la sesión a uno o impedirle entrar.' },
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
      { en: 'Sign-ins and passwords are left out on purpose: connect the platforms again on the new computer. A backup from SimonSays loads too: what SimonBot has a place for comes in.',
        es: 'Las conexiones y contraseñas se dejan fuera a propósito: vuelve a conectar las plataformas en el ordenador nuevo. Una copia de SimonSays también se carga: entra lo que SimonBot tiene dónde guardar.' },
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
    en: { term: 'Owner key', means: 'Your way in when Twitch is not: typed on the sign-in page. Keep it to yourself.' },
    es: { term: 'Llave del dueño', means: 'Tu forma de entrar cuando Twitch no puede: se escribe en la página de inicio de sesión. No la compartas.' } },
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
  { id: 'poll', go: 'polls', who: 'mods',
    read: (d) => (d?.pollSettings?.command ? { on: d.pollSettings.command.enabled !== false, word: d.pollSettings.command.trigger } : null),
    en: { after: 'Question | answer | answer', does: 'Opens a poll; on its own, opens the one set up on the screen.' },
    es: { after: 'Pregunta | respuesta | respuesta', does: 'Abre una encuesta; sola, abre la preparada en la pantalla.' } },
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
    en: { does: 'Their profile card: level, points and support.' },
    es: { does: 'Su tarjeta de perfil: nivel, puntos y apoyo.' } },
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
