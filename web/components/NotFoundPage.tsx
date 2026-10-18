/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * What an address with no page behind it shows: a path that is not the app,
 * or a ?mode= the app has no page for. The card says so and offers a way back
 * to the dashboard.
 */
import { SearchX } from 'lucide-react';
import { fill } from '../words';

export const NotFoundPage = ({ asked, t }: { asked: string; t: any }) => {
  // Back to the dashboard on this same server, keeping whatever says which server that is.
  const back = new URL(window.location.href);
  back.pathname = '/';
  back.searchParams.delete('mode');
  return (
    <div className="min-h-screen flex items-center justify-center p-6 font-sans" data-not-found>
      <div className="max-w-md w-full rounded-3xl border border-zinc-800 bg-zinc-950/95 p-8 space-y-4 text-center shadow-2xl">
        <SearchX size={28} className="mx-auto text-current-accent" />
        <h1 className="text-lg font-black text-white">{t.notFoundTitle || 'This page doesn’t exist'}</h1>
        <p className="text-xs text-zinc-400 leading-relaxed">
          {fill(t.notFoundHint || 'Nothing here answers to “{asked}”. The app is at the address without it.', { asked })}
        </p>
        <a href={back.toString()} className="inline-block px-4 py-2 rounded-xl bg-current-accent text-white text-xs font-black uppercase tracking-widest" data-not-found-back>
          {t.notFoundBack || 'Open the dashboard'}
        </a>
      </div>
    </div>
  );
};
