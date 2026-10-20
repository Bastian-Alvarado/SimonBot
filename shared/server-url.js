/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Where the backend is, worked out from where the page came from.
 *
 * Three ways, in order:
 *
 *   1. ?server= in the address. Explicit, and remembered, because it has to
 *      survive a round trip that drops it — an OAuth sign-in leaves for the
 *      provider and comes back to a registered redirect carrying the
 *      provider's own query and nothing else, so a page opened with ?server=
 *      returns without it and would otherwise have to guess again.
 *
 *   2. What was remembered.
 *
 *   3. The page's own address.
 *
 * The built dashboard is always served by the server it belongs to, so its
 * own address — host and port — is where the server is, whatever port that
 * server was started on: 192.168.1.201:8082 on a phone that already runs
 * something else on 8081, or a plain https://example.com behind a proxy that
 * carries the socket too. Guessing a fixed port instead sent a dashboard
 * served from 8082 to whatever answered on 8081.
 *
 * Only while developing is the page somewhere else: Vite serves it on its own
 * port, and the server is on the API port of the same host.
 */

/** The server's port while developing, when Vite serves the page on another. */
export const DEFAULT_API_PORT = '8081';

/**
 * @param {{protocol: string, hostname: string, port: string, search: string}} where
 *        The page's address — window.location, or anything shaped like it.
 * @param {{remembered?: string|null, apiPort?: string, dev?: boolean}} known
 *        What was stored last time; whether the page is Vite's development
 *        one, and which port the server is on then.
 *
 * Deliberately no second stored key. This used to fall back to `server_url`,
 * which a proxy setting once wrote — so setting a proxy pointed the whole app
 * at it and the next load reached nothing at all.
 */
export function resolveServerUrl(where, known = {}) {
  const asked = new URLSearchParams(where.search || '').get('server');
  if (asked) return { url: asked, remember: asked };

  if (known.remembered) return { url: known.remembered, remember: null };

  const wss = where.protocol === 'https:' ? 'wss:' : 'ws:';
  const port = known.dev && where.port ? known.apiPort || DEFAULT_API_PORT : where.port;
  return { url: `${wss}//${where.hostname}${port ? `:${port}` : ''}`, remember: null };
}
