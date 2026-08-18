'use client';

import React, { useState } from 'react';
import { Check, ArrowLeft, Sparkles, Zap, Users, HelpCircle } from 'lucide-react';
import Link from 'next/link';
import { signIn, useSession } from 'next-auth/react';

/**
 * Plans are priced by minutes of live translation, because that is what the service actually costs
 * to run: audio is billed by the second. The previous page sold feature tiers (custom dictionaries,
 * device sync, preset phrases, voice選択) that no longer exist, and offered "unlimited" translation,
 * which for a metered audio service has no floor on what a single heavy user can cost.
 *
 * The included minutes are set so each paid plan keeps a healthy margin over its own usage, and the
 * free tier is capped per month rather than per day -- ten minutes a day would be five hours a
 * month, which costs more per free user than a subscription brings in.
 */
export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const yearly = billingCycle === 'yearly';
  const { data: session } = useSession();
  const [busyPlan, setBusyPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Sends the customer to Stripe.
   *
   * Signing in comes first, because a subscription has to belong to an account: attached to a
   * browser it would vanish the moment site data was cleared, and would not follow the customer to
   * their phone.
   */
  const startCheckout = async (plan: 'plus' | 'pro') => {
    setError(null);

    if (!session?.user) {
      await signIn('google', { callbackUrl: '/pricing' });
      return;
    }

    setBusyPlan(plan);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, cycle: billingCycle }),
      });
      const data = await res.json();
      if (!res.ok || !data?.url) {
        setError(
          data?.error === 'plan_unavailable'
            ? 'This plan is not available yet. Please try again later.'
            : 'Could not start checkout. Please try again.'
        );
        setBusyPlan(null);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError('Could not reach the payment service. Please try again.');
      setBusyPlan(null);
    }
  };

  const plans = [
    {
      name: 'Free',
      desc: 'Try it out, no account needed',
      price: '0',
      yearlyPrice: '0',
      icon: Zap,
      features: [
        '10 minutes of live translation per month',
        'All 17 languages, both directions',
        'Automatic language detection',
        'Spoken translations',
        'Furigana for Japanese',
      ],
      buttonText: 'Current plan',
      buttonClass:
        'bg-slate-800 text-slate-400 border border-slate-700 cursor-not-allowed w-full block text-center py-3 rounded-2xl font-bold text-xs',
      popular: false,
      planId: null,
    },
    {
      name: 'Plus',
      desc: 'For travel and occasional conversations',
      price: '7.99',
      yearlyPrice: '6.39',
      icon: Sparkles,
      features: [
        '60 minutes of live translation per month',
        'Everything in Free',
        'Faster, higher-quality translation',
        'Conversation history',
        'Email support',
      ],
      buttonText: 'Choose Plus',
      buttonClass:
        'bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white shadow-lg shadow-emerald-500/10 hover:scale-[1.02] active:scale-[0.98] w-full block text-center py-3 rounded-2xl font-bold text-xs select-none',
      popular: true,
      planId: 'plus' as const,
    },
    {
      name: 'Pro',
      desc: 'For work, study and daily use',
      price: '19.99',
      yearlyPrice: '15.99',
      icon: Users,
      features: [
        '200 minutes of live translation per month',
        'Everything in Plus',
        'Priority email support',
        'Extra minutes available when you need them',
      ],
      buttonText: 'Choose Pro',
      buttonClass:
        'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 hover:scale-[1.02] active:scale-[0.98] w-full block text-center py-3 rounded-2xl font-bold text-xs select-none',
      popular: false,
      planId: 'pro' as const,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30">

      {/* Header Navigation */}
      <header className="border-b border-slate-900/80 px-6 py-4 flex items-center justify-between shrink-0 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
        <Link href="/" className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-slate-100 transition-all select-none">
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden xs:inline">Back to Talkie</span>
        </Link>
        <div className="font-black text-sm tracking-widest text-slate-300">
          TALK<span className="text-emerald-400">IE</span>
        </div>
        <Link href="/contact" className="text-xs font-bold text-slate-400 hover:text-emerald-400 transition-all select-none">
          Contact
        </Link>
      </header>

      <main className="flex-1 overflow-y-auto px-6 py-12 space-y-12 max-w-5xl mx-auto w-full">

        {/* Hero */}
        <div className="text-center space-y-3">
          <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full inline-block">
            Pricing
          </span>
          <h1 className="text-3xl font-black text-slate-100 tracking-tight leading-none">
            Pay for the minutes you talk
          </h1>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            Every plan includes all 17 languages and both directions of translation. Plans differ
            only in how much you speak. Cancel any time.
          </p>
        </div>

        {/* Billing cycle */}
        <div className="flex justify-center select-none">
          <div className="bg-slate-900 border border-slate-800 p-1 rounded-2xl flex items-center gap-1 shadow-inner">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                !yearly
                  ? 'bg-slate-800 text-slate-100 shadow-md border border-slate-700/60'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
                yearly
                  ? 'bg-slate-800 text-slate-100 shadow-md border border-slate-700/60'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <span>Yearly</span>
              <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded-md font-black">
                SAVE 20%
              </span>
            </button>
          </div>
        </div>

        {error && (
          <p className="text-center text-xs text-red-300 bg-red-950/40 border border-red-900/50 rounded-2xl py-3 px-4">
            {error}
          </p>
        )}

        {/* Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {plans.map((plan) => {
            const Icon = plan.icon;
            const shown = yearly ? plan.yearlyPrice : plan.price;
            const isFree = plan.price === '0';
            return (
              <div
                key={plan.name}
                className={`relative bg-slate-900 border rounded-3xl p-6 flex flex-col justify-between transition-all duration-300 hover:scale-[1.03] ${
                  plan.popular
                    ? 'border-emerald-500 shadow-xl shadow-emerald-500/5 ring-1 ring-emerald-500/30'
                    : 'border-slate-800 hover:border-slate-700/80 shadow-md'
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-3 right-6 bg-gradient-to-r from-emerald-500 to-indigo-600 text-white text-[10px] font-black px-3 py-1 rounded-full shadow-md select-none flex items-center gap-1">
                    <Sparkles className="w-3 h-3 animate-pulse" />
                    <span>Most popular</span>
                  </span>
                )}

                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl bg-slate-950/40 border border-slate-800/80 ${
                      plan.popular ? 'text-emerald-400' : 'text-indigo-400'
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-black text-slate-100 text-base">{plan.name}</h3>
                      <p className="text-[10px] text-slate-500 leading-tight mt-0.5">{plan.desc}</p>
                    </div>
                  </div>

                  <div className="flex items-baseline gap-1 select-none border-b border-slate-800/60 pb-6">
                    <span className="text-sm font-bold text-slate-400">$</span>
                    <span className="text-3xl font-black text-slate-100 tracking-tight">{shown}</span>
                    <span className="text-xs text-slate-500 ml-1">/ month</span>
                    {!isFree && yearly && (
                      <span className="text-[9px] text-slate-500 ml-2 font-mono">
                        (${(Number(plan.yearlyPrice) * 12).toFixed(2)} billed yearly)
                      </span>
                    )}
                  </div>

                  <ul className="space-y-3.5 text-xs text-slate-300">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 leading-relaxed">
                        <Check className={`w-4 h-4 shrink-0 mt-0.5 ${
                          plan.popular ? 'text-emerald-400' : 'text-slate-500'
                        }`} />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-8">
                  {plan.planId ? (
                    <button
                      onClick={() => startCheckout(plan.planId)}
                      disabled={busyPlan !== null}
                      className={`${plan.buttonClass} disabled:opacity-60 disabled:cursor-wait`}
                    >
                      {busyPlan === plan.planId ? 'Redirecting…' : plan.buttonText}
                    </button>
                  ) : (
                    <button disabled className={plan.buttonClass}>
                      {plan.buttonText}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* FAQ */}
        <div className="border-t border-slate-900/80 pt-12 space-y-6">
          <h2 className="text-center font-black text-lg text-slate-100 flex items-center justify-center gap-2">
            <HelpCircle className="w-5 h-5 text-indigo-400" />
            <span>Questions</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs leading-relaxed">
            <div className="space-y-1 bg-slate-900/40 p-4 rounded-2xl border border-slate-900/60">
              <h4 className="font-bold text-slate-200">What counts as a minute?</h4>
              <p className="text-slate-400">
                Only the time the microphone is actually listening. Reading the conversation,
                changing languages and replaying a translation cost nothing.
              </p>
            </div>
            <div className="space-y-1 bg-slate-900/40 p-4 rounded-2xl border border-slate-900/60">
              <h4 className="font-bold text-slate-200">What happens when I run out?</h4>
              <p className="text-slate-400">
                Translation pauses until your next monthly reset, or until you move to a larger plan.
                Nothing is charged automatically without you choosing it.
              </p>
            </div>
            <div className="space-y-1 bg-slate-900/40 p-4 rounded-2xl border border-slate-900/60">
              <h4 className="font-bold text-slate-200">Can I cancel any time?</h4>
              <p className="text-slate-400">
                Yes. Monthly plans can be cancelled whenever you like with no fee, and you keep
                access until the end of the period you have paid for.
              </p>
            </div>
            <div className="space-y-1 bg-slate-900/40 p-4 rounded-2xl border border-slate-900/60">
              <h4 className="font-bold text-slate-200">Is my conversation stored?</h4>
              <p className="text-slate-400">
                Conversations stay on your device and are cleared when you close the app. See the
                privacy policy for how audio is processed.
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-900/60 px-6 py-6 text-center text-[10px] text-slate-500 shrink-0 select-none">
        <p>© 2026 Talkie. All rights reserved.</p>
        <p className="mt-1 flex items-center justify-center gap-2">
          <Link href="/terms" className="hover:underline">Terms</Link>
          <span className="text-slate-700">|</span>
          <Link href="/privacy" className="hover:underline">Privacy</Link>
          <span className="text-slate-700">|</span>
          <Link href="/tokushoho" className="hover:underline">Legal notice (Japan)</Link>
        </p>
      </footer>
    </div>
  );
}
