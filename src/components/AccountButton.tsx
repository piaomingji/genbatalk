'use client';

import React from 'react';
import { signIn, signOut, useSession } from 'next-auth/react';
import { LogIn, LogOut } from 'lucide-react';
import { Strings } from '@/lib/i18n';

/**
 * Sign in with Google, from the app header.
 *
 * Signing in is optional: everything works without it, and the free allowance is metered against
 * the device instead. It matters for anyone who wants their allowance to follow them between phone
 * and laptop, and it is what a paid plan will eventually be attached to -- a subscription cannot
 * belong to a browser cookie that clearing site data throws away.
 */
export default function AccountButton({ t }: { t: Strings }) {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return <div className="w-8 h-8 rounded-full bg-slate-900/60 animate-pulse" aria-hidden />;
  }

  if (session?.user) {
    const label = session.user.name || session.user.email || '';
    return (
      <button
        onClick={() => signOut()}
        title={`${label} — ${t.signOut}`}
        aria-label={t.signOut}
        className="group relative w-8 h-8 rounded-full overflow-hidden border border-slate-800 bg-slate-900 flex items-center justify-center text-[10px] font-black text-slate-300 hover:border-slate-600 transition-colors cursor-pointer"
      >
        {session.user.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={session.user.image} alt="" className="w-full h-full object-cover" />
        ) : (
          <span>{label.slice(0, 1).toUpperCase()}</span>
        )}
        <span className="absolute inset-0 bg-slate-950/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <LogOut className="w-3.5 h-3.5 text-slate-200" />
        </span>
      </button>
    );
  }

  return (
    <button
      onClick={() => signIn('google')}
      title={t.signIn}
      className="px-2.5 h-8 rounded-xl bg-slate-900/80 border border-slate-800/80 text-slate-300 hover:text-slate-100 hover:bg-slate-800/80 transition-all cursor-pointer flex items-center gap-1.5 text-[10px] font-black"
    >
      <LogIn className="w-3.5 h-3.5" />
      {/* Says what signing in is for, rather than just naming the action. */}
      <span className="hidden sm:inline">{t.signInPerk}</span>
      <span className="sm:hidden">{t.signIn}</span>
    </button>
  );
}
