'use client';

import React from 'react';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30">

      <header className="border-b border-slate-900/80 px-6 py-4 flex items-center justify-between shrink-0 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
        <Link href="/" className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-slate-100 transition-all select-none">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Talkie</span>
        </Link>
        <div className="font-black text-sm tracking-widest text-slate-300">
          TALK<span className="text-emerald-400">IE</span>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-6 py-12 max-w-3xl mx-auto w-full space-y-8">

        <div className="text-center space-y-2">
          <h1 className="text-2xl font-black text-slate-100 tracking-tight leading-none">
            Terms of Service
          </h1>
          <p className="text-xs text-slate-500 leading-normal">
            The agreement between you and Talkie.
          </p>
        </div>

        <div className="bg-slate-900/30 border border-slate-900 rounded-3xl p-6 md:p-8 space-y-6 text-xs text-slate-400 leading-relaxed">

          <section className="space-y-2">
            <h2 className="font-black text-slate-200 text-sm">1. What Talkie is</h2>
            <p>
              Talkie translates spoken conversation between two languages in real time. Using the
              service means you accept these terms. If you do not accept them, please do not use it.
            </p>
          </section>

          {/* The single most important clause for this kind of product. */}
          <section className="space-y-2">
            <h2 className="font-black text-slate-200 text-sm">2. Translation is not guaranteed to be correct</h2>
            <p>
              Talkie produces translations automatically. It will sometimes mishear a word, miss a
              nuance, or render a sentence in a way that changes its meaning — particularly with
              background noise, accents, technical vocabulary, or speech that is unclear or
              interrupted.
            </p>
            <p className="text-slate-300">
              Do not rely on Talkie alone where a misunderstanding could cause harm or loss. This
              includes medical, legal, financial, safety-critical and emergency situations, and any
              agreement of legal or commercial consequence. For those, use a qualified human
              interpreter.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-black text-slate-200 text-sm">3. How you may use it</h2>
            <p>Please do not:</p>
            <ul className="list-disc list-inside space-y-1.5 pl-1">
              <li>record or translate anyone without their knowledge, where consent is required by the law that applies to you;</li>
              <li>use the service for anything unlawful, or to harass, deceive or harm another person;</li>
              <li>attempt to bypass usage limits, resell access, or automate the service against these terms;</li>
              <li>attempt to disrupt or reverse-engineer the service.</li>
            </ul>
            <p>
              You are responsible for having whatever permission the people around you require before
              their speech is translated. Recording laws differ from country to country.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-black text-slate-200 text-sm">4. Plans, minutes and payment</h2>
            <p>
              Each plan includes a set number of minutes of live translation per month, and only the
              time the microphone is actually listening is counted. When the included minutes run
              out, translation pauses until the next monthly reset or until you choose a larger plan.
            </p>
            <p>
              Paid plans renew automatically until cancelled. You may cancel at any time before the
              next billing date and keep access for the period already paid for. Prices may change,
              but never for a period you have already paid for, and we will give notice before a
              change takes effect.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-black text-slate-200 text-sm">5. Availability</h2>
            <p>
              Talkie depends on services we do not control, including a third-party translation
              provider and an internet connection. It may be unavailable, interrupted or slower than
              usual, and we may change or discontinue features. We will give reasonable notice before
              withdrawing the service altogether.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-black text-slate-200 text-sm">6. Your content</h2>
            <p>
              What you say remains yours. We claim no rights over your conversations and do not use
              them to train models. How audio is processed is described in the{' '}
              <Link href="/privacy" className="text-emerald-400 hover:underline font-bold">
                privacy policy
              </Link>
              .
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-black text-slate-200 text-sm">7. Limits of responsibility</h2>
            <p>
              The service is provided as it is. To the extent the law allows, we are not liable for
              indirect or consequential loss, and our total liability for any claim is limited to
              the amount you paid in the twelve months before it arose.
            </p>
            <p>
              Nothing here removes rights you have under consumer protection law where you live, and
              nothing excludes liability that cannot lawfully be excluded.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-black text-slate-200 text-sm">8. Ending access</h2>
            <p>
              You may stop using Talkie at any time. We may suspend or end access where these terms
              are broken, or where use threatens the service or other people, and will explain why
              unless prevented from doing so.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-black text-slate-200 text-sm">9. Changes to these terms</h2>
            <p>
              These terms may be updated as the service changes. Significant changes will be
              announced on the site before taking effect, and continuing to use Talkie afterwards
              means accepting them.
            </p>
            <p className="text-slate-500">
              Questions?{' '}
              <Link href="/contact" className="text-emerald-400 hover:underline font-bold">
                Contact us
              </Link>
              .
            </p>
          </section>

        </div>
      </main>

      <footer className="border-t border-slate-900/60 px-6 py-6 text-center text-[10px] text-slate-500 shrink-0 select-none">
        <p>© 2026 Talkie. All rights reserved.</p>
      </footer>
    </div>
  );
}
