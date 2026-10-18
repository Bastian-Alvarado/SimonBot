/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The poll as the Polls screen gets it, and how long an open one has left.
 */

export interface PollState {
  mode: 'idle' | 'open' | 'closed';
  question: string;
  options: string[];
  counts?: number[];
  total?: number;
  leaders?: number[];
  byPlatform?: Record<string, number>;
  durationMs?: number;
  endsAt?: number | null;
  closedAt?: number | null;
  rules?: { numbers?: boolean; words?: boolean; change?: boolean };
  serverNow?: number;
  clientReceivedAt?: number;
}

/** How far this screen's clock is from the server's, measured from the frame. */
const skewOf = (poll?: PollState) => (poll?.serverNow && poll?.clientReceivedAt ? poll.serverNow - poll.clientReceivedAt : 0);

/** Milliseconds left in an open poll with a clock; null for one without. */
export function pollTimeLeft(poll?: PollState): number | null {
  if (!poll || poll.mode !== 'open' || !poll.endsAt) return null;
  return Math.max(0, poll.endsAt - (Date.now() + skewOf(poll)));
}

/** "4:05", or "1:02:03" past an hour. */
export function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}
