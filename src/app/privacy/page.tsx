'use client';

import React from 'react';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30">
      
      {/* Header Navigation */}
      <header className="border-b border-slate-900/80 px-6 py-4 flex items-center justify-between shrink-0 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
        <Link href="/" className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-slate-100 transition-all select-none">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Talkie</span>
        </Link>
        <div className="font-black text-sm tracking-widest text-slate-300">
          TALK<span className="text-emerald-400">IE</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto px-6 py-12 max-w-3xl mx-auto w-full space-y-8">
        
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-black text-slate-100 tracking-tight leading-none">
            Privacy Policy
          </h1>
          <p className="text-xs text-slate-500 leading-normal">
            How Talkie handles your voice and your data.
          </p>
        </div>

        <div className="bg-slate-900/30 border border-slate-900 rounded-3xl p-6 md:p-8 space-y-6 text-xs text-slate-400 leading-relaxed">

          <section className="space-y-2">
            <h2 className="font-black text-slate-200 text-sm">1. What Talkie does with your voice</h2>
            <p>
              To translate speech, your audio has to be understood by a machine translation service.
              While the microphone is on, audio is streamed from your browser to Google&apos;s Gemini
              API, which returns the translation. Google processes this audio on our behalf as part
              of providing the service; we cannot translate without it.
            </p>
            <p>
              Talkie does not record your audio. It is not written to our servers, and we keep no
              copy of it once a translation has been produced. Google&apos;s own handling of API
              data is governed by their terms; we use the paid tier, under which submitted data is
              not used to train their models.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-black text-slate-200 text-sm">2. Your conversation</h2>
            <p>
              The transcript you see on screen is held in your browser only. It is not uploaded and
              not stored by us, and it disappears when you clear the conversation or close the page.
            </p>
            <p>
              Short pieces of translated text are sent to Google to add furigana readings and to
              check the wording. This is text only, never audio, and it is not retained by us.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-black text-slate-200 text-sm">3. Usage measurement</h2>
            <p>
              Plans include a set number of minutes, so we have to count them. For that purpose we
              store, for each user:
            </p>
            <ul className="list-disc list-inside space-y-1.5 pl-1">
              <li>a random identifier kept in a cookie on your device;</li>
              <li>your IP address, so the allowance cannot simply be reset by clearing the cookie;</li>
              <li>the number of seconds translated and sessions started.</li>
            </ul>
            <p>
              These records contain no audio and no conversation content. They are deleted
              automatically: session counts after about a day and a half, minute counts after about
              two months.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-black text-slate-200 text-sm">4. Payment</h2>
            <p>
              Paid plans are processed by Stripe. Card details are entered on Stripe&apos;s systems
              and are never seen or stored by Talkie. We receive only what is needed to know that a
              subscription is active.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-black text-slate-200 text-sm">5. Who else sees your data</h2>
            <p>
              Beyond the providers named above — Google for translation, Stripe for payment, and our
              hosting provider — we do not share your data with anyone, and we do not sell it. We
              disclose data only where the law requires it.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-black text-slate-200 text-sm">6. Your rights</h2>
            <p>
              You may ask what we hold about you, ask for it to be corrected or deleted, or object to
              its processing. Because usage records are tied to a cookie and an IP address rather
              than to your name, please contact us from the device concerned so we can identify the
              right records. Depending on where you live, you may also have the right to complain to
              a data protection authority.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-black text-slate-200 text-sm">7. Changes</h2>
            <p>
              We may update this policy as the service changes. Significant changes will be
              announced on the site before they take effect.
            </p>
            <p className="text-slate-500">
              Questions about this policy?{' '}
              <Link href="/contact" className="text-emerald-400 hover:underline font-bold">
                Contact us
              </Link>
              .
            </p>
          </section>

        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900/60 px-6 py-6 text-center text-[10px] text-slate-500 shrink-0 select-none">
        <p>© 2026 Talkie. All rights reserved.</p>
      </footer>

    </div>
  );
}
