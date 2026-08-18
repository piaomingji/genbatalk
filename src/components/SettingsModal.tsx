import React from 'react';
import { X, Settings } from 'lucide-react';
import Link from 'next/link';
import { Strings } from '@/lib/i18n';

interface AccountState {
  signedIn: boolean;
  isPaid: boolean;
  plan: 'free' | 'plus' | 'pro';
  allowanceSeconds: number;
  usedSeconds: number;
}

interface SettingsModalProps {
  t: Strings;
  isOpen: boolean;
  onClose: () => void;
  speechSpeed: number;
  setSpeechSpeed: (val: number) => void;
  autoPlayAudio: boolean;
  setAutoPlayAudio: (val: boolean) => void;
  useRuby: boolean;
  setUseRuby: (val: boolean) => void;
}

export default function SettingsModal({
  t,
  isOpen,
  onClose,
  speechSpeed,
  setSpeechSpeed,
  autoPlayAudio,
  setAutoPlayAudio,
  useRuby,
  setUseRuby,
}: SettingsModalProps) {
  const [account, setAccount] = React.useState<AccountState | null>(null);

  // Read the plan whenever the panel opens, so it reflects a subscription bought moments ago.
  React.useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    fetch('/api/me')
      .then(r => r.json())
      .then(d => {
        if (!cancelled) setAccount(d);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  /** Sends a subscriber to Stripe to change their card or cancel; everyone else to the plans. */
  const manageBilling = async () => {
    try {
      const res = await fetch('/api/billing-portal', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data?.url) {
        window.location.href = data.url;
        return;
      }
    } catch {}
    window.location.href = '/pricing';
  };

  if (!isOpen) return null;

  const minutesLeft = account
    ? Math.max(0, Math.ceil((account.allowanceSeconds - account.usedSeconds) / 60))
    : null;
  const minutesTotal = account ? Math.round(account.allowanceSeconds / 60) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl animate-in fade-in zoom-in duration-200 flex flex-col max-h-[85vh]">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4 shrink-0">
          <div className="flex items-center gap-2 text-slate-100 font-bold text-lg">
            <Settings className="w-5 h-5 text-indigo-400" />
            <span>{t.settings}</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-all p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Container */}
        <div className="flex-1 overflow-y-auto space-y-6 pr-1 scrollbar-thin">
          {/* Plan and what is left of it. */}
          {account && (
            <div className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-0.5 min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    {t.plan}
                  </p>
                  <p className="text-sm font-black text-slate-100 capitalize">{account.plan}</p>
                </div>
                <button
                  onClick={manageBilling}
                  className="shrink-0 text-[11px] font-bold px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  {account.isPaid ? t.managePlan : t.upgrade}
                </button>
              </div>
              {minutesLeft !== null && minutesTotal !== null && (
                <p className="text-[11px] text-slate-400">
                  {t.minutesLeft(minutesLeft, minutesTotal)}
                </p>
              )}
            </div>
          )}

          {/* Autoplay Audio toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <label className="text-sm font-bold text-slate-200">{t.autoPlay}</label>
              <p className="text-xs text-slate-400 leading-normal">
                {t.autoPlayHint}
              </p>
            </div>
            <button
              onClick={() => setAutoPlayAudio(!autoPlayAudio)}
              className={`w-11 h-6 rounded-full transition-all duration-300 relative shrink-0 ml-4 ${
                autoPlayAudio ? 'bg-emerald-500' : 'bg-slate-800'
              }`}
            >
              <div
                className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all duration-300 ${
                  autoPlayAudio ? 'left-6' : 'left-1'
                }`}
              />
            </button>
          </div>

          {/* Use Ruby text toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <label className="text-sm font-bold text-slate-200">{t.furigana}</label>
              <p className="text-xs text-slate-400 leading-normal">
                {t.furiganaHint}
              </p>
            </div>
            <button
              onClick={() => setUseRuby(!useRuby)}
              className={`w-11 h-6 rounded-full transition-all duration-300 relative shrink-0 ml-4 ${
                useRuby ? 'bg-emerald-500' : 'bg-slate-800'
              }`}
            >
              <div
                className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all duration-300 ${
                  useRuby ? 'left-6' : 'left-1'
                }`}
              />
            </button>
          </div>

          {/* Speech Speed */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-bold text-slate-200">{t.speed}</label>
              <span className="text-xs text-emerald-400 font-bold">{speechSpeed}x</span>
            </div>
            <input
              type="range"
              min="0.75"
              max="1.5"
              step="0.25"
              value={speechSpeed}
              onChange={(e) => setSpeechSpeed(parseFloat(e.target.value))}
              className="w-full accent-emerald-500 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-800 shrink-0 space-y-3">
          <div className="text-center">
            <Link
              href="/contact"
              onClick={onClose}
              className="text-[10px] text-slate-500 hover:text-slate-300 font-bold underline select-none"
            >
              {t.support}
            </Link>
          </div>
          <button
            onClick={onClose}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl shadow-lg transition-all cursor-pointer"
          >
            {t.save}
          </button>
        </div>
      </div>
    </div>
  );
}
