
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { emoteImageUrl, splitEmotes } from '../shared/emotes.js';
import { withDiscordText, type DiscordNames } from './discordEmoji';

export function getRgbValues(hex: string) {
  hex = hex.replace('#', '');
  if (hex.length === 3) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}

export const safeJSONParse = (key: string, fallback: any) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch (e) {
    console.warn(`Failed to parse ${key} from localStorage`, e);
    return fallback;
  }
};

export const parseTwitchEmotes = (emotesStr: string) => {
  if (!emotesStr) return undefined;
  const emotes: { [id: string]: string[] } = {};
  emotesStr.split('/').forEach(part => {
    const [id, positions] = part.split(':');
    emotes[id] = positions.split(',');
  });
  return emotes;
};

// --- Message Parsing Helper for Emotes ---
/*
  Cut in whole characters, the way Twitch counts its emote positions, rather
  than in UTF-16 units — see shared/emotes.js. The emote's own word goes in as
  the picture's alt text, so it still reads if the picture does not load.
*/
export const parseMessageWithEmotes = (msg: string, emotes: { [id: string]: string[] } | undefined, size: number, names?: DiscordNames | null) => {
  // A Discord line's own server emojis, as pictures the size of an emote, and its mentions by name (they arrive as codes).
  if (!emotes || Object.keys(emotes).length === 0) return withDiscordText(msg, `${size}px`, names);

  return splitEmotes(msg, emotes).map((part: any, idx: number) => (part.emote
    ? React.createElement('img', {
      key: `${part.emote}-${idx}`,
      // The picture that suits the size it is drawn at, not always the smallest.
      src: emoteImageUrl(part.emote, size, typeof window === 'undefined' ? 1 : window.devicePixelRatio),
      alt: part.name,
      className: "inline-block align-middle mx-0.5",
      style: { height: `${size}px`, width: 'auto' }
    })
    : React.createElement(React.Fragment, { key: `t${idx}` }, withDiscordText(part.text, `${size}px`, names))));
};

/**
 * The redirect URI to register with Google, and to send on the YouTube login.
 *
 * Google takes no raw addresses for a desktop sign-in but loopback ones, and
 * returns to exactly the address registered, character for character — so
 * localhost is written as 127.0.0.1, and the screen shows the address and the
 * login sends it, both from here. Twitch and Discord accept localhost, so
 * they use the page's own address as it is.
 */
export const youtubeRedirectUri = () => {
  const url = new URL(window.location.origin + window.location.pathname);
  if (url.hostname === 'localhost') url.hostname = '127.0.0.1';
  return url.toString();
};

export const generateRandomString = (length: number) => {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let text = '';
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

export const sha256 = async (plain: string) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  const hash = await window.crypto.subtle.digest('SHA-256', data);
  return base64urlencode(hash);
};

export const base64urlencode = (a: ArrayBuffer) => {
  const bytes = new Uint8Array(a);
  let str = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    str += String.fromCharCode(bytes[i]);
  }
  return btoa(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};

/**
 * Put text on the clipboard, on http:// as well as https://.
 *
 * `navigator.clipboard` only exists in a secure context. This app is normally
 * reached at http://<lan-ip>:8081 — from another PC, or the phone server —
 * which is NOT secure, so the modern API is simply absent and every copy
 * button silently did nothing. The deprecated execCommand path still works
 * there, as long as it runs inside the click that triggered it.
 *
 * Synchronous on purpose: awaiting first would spend the user gesture and the
 * fallback would then be refused too. Returns whether the text actually landed,
 * so a caller can say so instead of flashing a tick over nothing.
 */
/**
 * Text put where the cursor is in a box, replacing whatever is selected —
 * an emoji picked in the middle of a message goes there, not on the end.
 * The box keeps where its cursor was after it loses focus to the picker, so
 * this can be asked once the pick is made. Gives the new text, and puts the
 * cursor back just after what went in.
 */
export const insertAtCursor = (box: HTMLInputElement | HTMLTextAreaElement | null, value: string, text: string): string => {
  const at = box?.selectionStart ?? value.length;
  const to = box?.selectionEnd ?? at;
  const next = value.slice(0, at) + text + value.slice(to);
  if (box) {
    requestAnimationFrame(() => {
      try { box.focus(); box.setSelectionRange(at + text.length, at + text.length); } catch { /* gone */ }
    });
  }
  return next;
};

export const copyText = (text: string): boolean => {
  const ta = document.createElement('textarea');
  ta.value = text;
  // Off-screen rather than hidden: execCommand ignores an unrendered element.
  ta.setAttribute('readonly', '');
  ta.style.position = 'fixed';
  ta.style.top = '-1000px';
  ta.style.opacity = '0';
  document.body.appendChild(ta);

  let ok = false;
  try {
    const prev = document.activeElement as HTMLElement | null;
    ta.select();
    ta.setSelectionRange(0, text.length);
    ok = document.execCommand('copy');
    prev?.focus?.();
  } catch {
    ok = false;
  }
  document.body.removeChild(ta);

  // On https:// (or localhost) prefer the real API, and let it correct a
  // false negative from the path above.
  if (window.isSecureContext && navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).catch(() => {});
    return true;
  }
  return ok;
};
