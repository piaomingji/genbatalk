import React from 'react';
import { X, Settings, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { Strings } from '@/lib/i18n';

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
  if (!isOpen) return null;

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

        {/* Pro Plan Promotion Card */}
        <div className="bg-gradient-to-r from-emerald-500/10 to-indigo-500/10 border border-emerald-500/30 rounded-2xl p-3.5 mb-4 flex items-center justify-between gap-4 shrink-0 select-none">
          <div className="space-y-0.5">
            <div className="text-xs font-black text-emerald-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Proプランで機能制限を解除</span>
            </div>
            <p className="text-[10px] text-slate-400 leading-normal">
              無制限の自動通訳、リアルタイム同期などが可能になります。
            </p>
          </div>
          <Link
            href="/pricing"
            onClick={onClose}
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black px-3.5 py-2 rounded-xl transition-all shrink-0 shadow-md shadow-emerald-600/10 hover:scale-[1.02] cursor-pointer"
          >
            プランを見る
          </Link>
        </div>

        {/* Scrollable Content Container */}
        <div className="flex-1 overflow-y-auto space-y-6 pr-1 scrollbar-thin">
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
