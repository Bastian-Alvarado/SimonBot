/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The single connection to the headless server.
 *
 * Exactly one socket, and it carries no authority: the server is the source
 * of truth, this hook is a replica plus a request channel. Closing the tab
 * has no effect on anything running.
 */

import { resolveServerUrl } from '../../shared/server-url.js';
import { useState, useEffect, useRef, useCallback } from 'react';
import { C2S, S2C } from '../../shared/protocol.js';

type Handler = (payload: any) => void;

/** Who this page is signed in as (S2C.ME). With sign-in off, everyone is the owner. */
export interface Me {
  role: 'owner' | 'mod';
  login: string;
  name: string;
  via: 'open' | 'session' | 'owner-key';
  /** Whether sign-in is switched on at all. */
  signIn: boolean;
}

export interface BackendSnapshot {
  relayConfig: any;
  xpConfig: any;
  leaderboard: any[];
  status: Record<string, any>;
  connections: Record<string, any>;
  // Discord membership automation, sent by the server alongside the rest.
  reactionRoleConfigs?: any[];
  discordButtonConfigs?: any[];
  welcomeGoodbyeConfig?: any;
  roleMappings?: any;
  roleActivityLog?: any[];
  xpData?: Record<string, any>;
  subscribers?: any[];
}

const EMPTY_SNAPSHOT: BackendSnapshot = {
  relayConfig: { twitchToDiscord: false, tiktokToDiscord: false, kickToDiscord: false },
  xpConfig: {},
  leaderboard: [],
  status: {},
  connections: {},
};

/**
 * Where the backend is. The rule itself lives in shared/server-url.js, with
 * the reasoning and the tests; this is the part that knows about a browser.
 */
const REMEMBERED = 'backend_url';

function serverUrl(): string {
  const read = (key: string) => { try { return localStorage.getItem(key); } catch { return null; } };
  const { url, remember } = resolveServerUrl(window.location, {
    remembered: read(REMEMBERED),
    apiPort: (import.meta as any).env?.VITE_API_PORT ?? undefined,
  });
  if (remember) { try { localStorage.setItem(REMEMBERED, remember); } catch { /* a browser may refuse */ } }
  return url;
}

/**
 * The same server, addressed over HTTP instead of WebSocket.
 *
 * Used for asset uploads, which send the file as the request body rather than
 * base64 down the socket that also carries live chat. Derived from the same
 * resolution as the socket so a client pointed elsewhere with ?server= uploads
 * to the server it is actually talking to.
 */
export function httpBase(): string {
  return serverUrl().replace(/^ws:/, 'http:').replace(/^wss:/, 'https:').replace(/\/$/, '');
}

/**
 * A request to the server's HTTP API, with this page's sign-in: the cookie,
 * sent along even to the development server's other port.
 */
export function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${httpBase()}${path}`, { credentials: 'include', ...init });
}

export function useBackend() {
  const [connected, setConnected] = useState(false);
  // Who the server says this is, and whether it wants a sign-in first (server/api/auth.js).
  const [me, setMe] = useState<Me | null>(null);
  const [signIn, setSignIn] = useState<'needed' | 'refused' | null>(null);
  const reconnectRef = useRef<() => void>(() => {});
  const [snapshot, setSnapshot] = useState<BackendSnapshot>(EMPTY_SNAPSHOT);

  const wsRef = useRef<WebSocket | null>(null);
  const pendingRef = useRef(new Map<string, { resolve: (v: any) => void; reject: (e: any) => void }>());
  const handlersRef = useRef(new Map<string, Set<Handler>>());
  const retryRef = useRef(0);

  // Messages produced before the socket finishes opening. Without this, work
  // that starts on mount — most importantly the OAuth token handoff, which
  // fires the instant the page loads back from Twitch — was silently dropped
  // and the credential lost.
  const outboxRef = useRef<string[]>([]);
  const OUTBOX_LIMIT = 50;

  const flushOutbox = useCallback(() => {
    const ws = wsRef.current;
    if (ws?.readyState !== WebSocket.OPEN) return;
    const queued = outboxRef.current;
    outboxRef.current = [];
    for (const frame of queued) ws.send(frame);
  }, []);

  /** Subscribe to a server push. Returns an unsubscribe function. */
  const on = useCallback((type: string, fn: Handler) => {
    if (!handlersRef.current.has(type)) handlersRef.current.set(type, new Set());
    handlersRef.current.get(type)!.add(fn);
    return () => handlersRef.current.get(type)?.delete(fn);
  }, []);

  /**
   * Fold a server push into the replicated snapshot.
   *
   * Only SNAPSHOT and CONFIG_PATCH were handled originally, so live pushes —
   * a platform coming online — reached subscribers but never updated the
   * state the views actually render. The visible symptom was a connected
   * platform still showing "Offline" until the page was reloaded.
   */
  const applyToSnapshot = useCallback((type: string, p: any) => {
    if (p === undefined || p === null) return;

    switch (type) {
      case S2C.SNAPSHOT:
      case S2C.CONFIG_PATCH:
        setSnapshot((prev) => ({
          ...prev,
          ...p,
          // `serverNow` is only "now" at the instant this frame arrives, so the
          // moment of arrival is recorded with it, for the poll's clock. Measuring
          // clock skew later — when a component happens to mount — reads a stale
          // timestamp as the current time and shifts the clock by the age of the frame.
          ...(p.poll?.serverNow ? { poll: { ...p.poll, clientReceivedAt: Date.now() } } : {}),
        }));
        return;

      case S2C.STATUS:
        if (!p.platform) return;
        setSnapshot((prev) => ({
          ...prev,
          status: {
            ...prev.status,
            // Twitch reports several sub-connections (main/bot/eventsub) in
            // `detail`; the others send a flat payload to merge in place.
            [p.platform]: p.detail ?? { ...(prev.status?.[p.platform] ?? {}), ...p },
          },
        }));
        return;

      case S2C.ME:
        setMe(p);
        setSignIn(null);
        return;

      case S2C.XP_DATA:
        setSnapshot((prev) => ({
          ...prev,
          xpData: p.users ?? (prev as any).xpData,
          xpConfig: p.config ?? prev.xpConfig,
          leaderboard: p.leaderboard ?? prev.leaderboard,
        }));
        return;

      default:
        // Anything else is for whoever subscribed to it.
    }
  }, []);

  const emit = useCallback((type: string, payload: any) => {
    handlersRef.current.get(type)?.forEach((fn) => {
      try {
        fn(payload);
      } catch (err) {
        console.error(`handler for "${type}" threw:`, err);
      }
    });
  }, []);

  /** Fire-and-forget. Queued if the socket is still opening or reconnecting. */
  const send = useCallback((type: string, payload: any = {}) => {
    const frame = JSON.stringify({ type, payload });
    const ws = wsRef.current;

    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(frame);
      return;
    }

    if (outboxRef.current.length >= OUTBOX_LIMIT) {
      console.warn(`outbox full — dropping "${type}"`);
      return;
    }
    outboxRef.current.push(frame);
  }, []);

  /** Request/response. Rejects after 15s so a lost reply can't leak the promise. */
  const request = useCallback(<T = any>(type: string, payload: any = {}): Promise<T> => {
    const ws = wsRef.current;
    if (ws?.readyState !== WebSocket.OPEN) return Promise.reject(new Error('not connected'));

    const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
    return new Promise<T>((resolve, reject) => {
      pendingRef.current.set(id, { resolve, reject });
      ws.send(JSON.stringify({ type, payload, id }));

      setTimeout(() => {
        if (pendingRef.current.delete(id)) reject(new Error(`"${type}" timed out`));
      }, 15_000);
    });
  }, []);

  useEffect(() => {
    // Cancellation must be scoped to THIS effect run, not shared in a ref.
    //
    // With a shared flag, React StrictMode's mount → cleanup → remount cycle
    // raced: the first socket's `onclose` fired *after* the second run had
    // reset the flag, so it treated its own teardown as an unexpected drop and
    // reconnected. That left two live sockets delivering every frame twice —
    // which is what made chat messages appear in duplicate.
    let cancelled = false;
    let socket: WebSocket | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    const connect = () => {
      if (cancelled) return;

      const ws = new WebSocket(serverUrl());
      socket = ws;
      wsRef.current = ws;

      ws.onopen = () => {
        if (cancelled || wsRef.current !== ws) return;
        retryRef.current = 0;
        setConnected(true);

        // Hello, and the server answers with everything as it is now.
        ws.send(JSON.stringify({ type: C2S.HELLO, payload: {} }));

        flushOutbox();
      };

      ws.onmessage = (event) => {
        // Ignore anything from a socket we have already replaced.
        if (cancelled || wsRef.current !== ws) return;

        let msg: any;
        try {
          msg = JSON.parse(event.data);
        } catch (err) {
          console.error('unparseable frame from server:', err, event.data);
          return;
        }

        // Correlated reply?
        if (msg.id && pendingRef.current.has(msg.id)) {
          const { resolve, reject } = pendingRef.current.get(msg.id)!;
          pendingRef.current.delete(msg.id);
          if (msg.type === S2C.ERROR) {
            // The code, when the server gave one, is what the screen turns into words.
            const err: any = new Error(msg.payload?.message || 'server error');
            if (msg.payload?.code) err.code = msg.payload.code;
            // And what fills in its sentence: a number, a name.
            if (msg.payload?.vars) err.vars = msg.payload.vars;
            reject(err);
          }
          else resolve(msg.payload);
          return;
        }

        applyToSnapshot(msg.type, msg.payload);
        emit(msg.type, msg.payload);
      };

      ws.onclose = (event) => {
        // Only the socket currently in use may clear the ref or reconnect; a
        // late close from a superseded socket must stay silent.
        if (cancelled || wsRef.current !== ws) return;

        wsRef.current = null;
        setConnected(false);

        /*
          The server's reasons (server/api/ws.js). 4401: nobody it knows —
          the dashboard asks to sign in and waits for it. 4403: opened
          from somewhere it does not take connections from, which trying
          again will not change. 4001: sign-in was switched on or off, so
          straight back, to be asked again who this is.
        */
        if (event.code === 4401) {
          setSignIn('needed');
          return;
        }
        if (event.code === 4403) { setSignIn('refused'); return; }
        if (event.code === 4001) retryRef.current = 0;

        // Exponential backoff, capped, so a server restart is picked up
        // quickly but a long outage doesn't hammer the socket.
        const delay = event.code === 4001 ? 300 : Math.min(1000 * 2 ** retryRef.current, 15_000);
        retryRef.current += 1;
        retryTimer = setTimeout(connect, delay);
      };

      ws.onerror = () => ws.close();
    };

    // Once signed in, at once rather than at the next try.
    reconnectRef.current = () => {
      clearTimeout(retryTimer);
      retryRef.current = 0;
      if (wsRef.current) return;
      connect();
    };

    connect();

    return () => {
      cancelled = true;
      clearTimeout(retryTimer);
      if (socket) {
        // Drop the handlers first so this close cannot re-enter the logic above.
        socket.onopen = null;
        socket.onmessage = null;
        socket.onclose = null;
        socket.onerror = null;
        try { socket.close(); } catch { /* already closing */ }
      }
      if (wsRef.current === socket) wsRef.current = null;
    };
  }, [emit, flushOutbox, applyToSnapshot]);

  const reconnect = useCallback(() => reconnectRef.current(), []);

  return { connected, snapshot, setSnapshot, send, request, on, me, signIn, reconnect };
}

export { C2S, S2C };
