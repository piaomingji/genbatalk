'use client';

import React, { Suspense } from 'react';
import { CheckCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

const MINUTES: Record<string, number> = { plus: 60, pro: 200 };

function SuccessContent() {
  const params = useSearchParams();
  const plan = params.get('plan') || '';
  const name = plan === 'pro' ? 'Pro' : plan === 'plus' ? 'Plus' : '';
  const minutes = MINUTES[plan];

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl text-center space-y-6 animate-in fade-in zoom-in duration-200">
      <div className="flex justify-center">
        <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-full text-emerald-400">
          <CheckCircle className="w-12 h-12" />
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-xl font-black text-slate-100">
          {name ? `Welcome to ${name}` : 'Payment complete'}
        </h2>
        <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
          {minutes
            ? `Your plan is active. You now have ${minutes} minutes of live translation each month, and your allowance follows your account across devices.`
            : 'Your plan is active. Your allowance follows your account across devices.'}
        </p>
        {/* The plan is granted by Stripe's notification, not by arriving on this page, so it can
            take a moment to appear. Saying so is better than leaving someone wondering. */}
        <p className="text-[10px] text-slate-500 leading-relaxed max-w-xs mx-auto pt-1">
          If your new allowance is not showing yet, give it a moment and reload — confirmation from
          the payment provider can take a few seconds.
        </p>
      </div>

      <div className="pt-4 space-y-3">
        <Link
          href="/"
          className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-bold rounded-2xl shadow-lg shadow-emerald-500/10 transition-all flex items-center justify-center gap-1.5 text-xs hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
        >
          <span>Start translating</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
        <Link href="/pricing" className="block text-[10px] text-slate-500 hover:text-slate-300 underline">
          Back to plans
        </Link>
      </div>
    </div>
  );
}

export default function PricingSuccessPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <header className="border-b border-slate-900/80 px-6 py-4 flex items-center justify-center shrink-0 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
        <div className="font-black text-sm tracking-widest text-slate-300">
          TALK<span className="text-emerald-400">IE</span>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6 max-w-md mx-auto w-full">
        <Suspense fallback={<div className="text-xs text-slate-500">Loading…</div>}>
          <SuccessContent />
        </Suspense>
      </main>

      <footer className="border-t border-slate-900/60 px-6 py-6 text-center text-[10px] text-slate-500 shrink-0">
        <p>© 2026 Talkie. All rights reserved.</p>
      </footer>
    </div>
  );
}
