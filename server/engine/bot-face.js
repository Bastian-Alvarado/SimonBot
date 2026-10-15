/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The bot's own face on Discord: Pixel Simon on mint (art/simonbot), set as
 * the bot account's avatar from the dashboard instead of by hand in the
 * Developer Portal. Discord allows only a couple of avatar changes an hour,
 * so this happens when asked, never on its own.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as discord from '../platforms/discord.js';

const ART = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'art', 'simonbot');
export const FACES = { mint: 'bot-avatar-mint-1024.png', clear: 'bot-avatar-1024.png' };

export async function setBotFace(which = 'mint') {
  const file = path.join(ART, FACES[which] || FACES.mint);
  const avatar = `data:image/png;base64,${fs.readFileSync(file).toString('base64')}`;
  const me = await discord.request('PATCH', '/users/@me', { body: { avatar } });
  return { ok: true, id: me?.id, avatar: me?.avatar };
}
