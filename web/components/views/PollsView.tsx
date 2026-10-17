/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Polls: kept in the menu, empty for now. A poll maker built on Discord's own
 * native polls comes here next; the polls SimonSays ran in stream chat are gone.
 */
import { BarChart3 } from 'lucide-react';

export const PollsView = ({ t }: { t: any }) => (
  <div className="animate-fade-in space-y-6 pb-20" data-polls-placeholder>
    <section className="rounded-3xl border p-5 bg-zinc-900/50 border-zinc-800">
      <div className="flex items-center gap-3 mb-3">
        <BarChart3 className="text-current-accent" />
        <h3 className="text-xl font-extrabold uppercase tracking-tight">{t.pollsNav || 'Polls'}</h3>
      </div>
      <p className="text-xs text-zinc-500 leading-relaxed max-w-3xl">
        {t.pollsComing || 'Coming soon: polls made with Discord’s own polls, posted in your server.'}
      </p>
    </section>
  </div>
);
