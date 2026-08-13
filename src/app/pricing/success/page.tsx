'use client';

import React from 'react';
import { CheckCircle, ArrowRight, Sparkles } from 'lucide-react';
import Link from 'next/link';

export default function PricingSuccessPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none">
      
      {/* Header */}
      <header className="border-b border-slate-900/80 px-6 py-4 flex items-center justify-center shrink-0 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
        <div className="font-black text-sm tracking-widest text-slate-300">
          GENBA<span className="text-emerald-400">TALK</span>
        </div>
      </header>

      {/* Main Content Card */}
      <main className="flex-1 flex items-center justify-center p-6 max-w-md mx-auto w-full">
        <div className="w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl text-center space-y-6 animate-in fade-in zoom-in duration-200">
          
          <div className="flex justify-center">
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-full text-emerald-400 relative">
              <CheckCircle className="w-12 h-12" />
              <Sparkles className="w-5 h-5 absolute -top-1 -right-1 text-indigo-400 animate-pulse" />
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full inline-block">
              決済シミュレーション
            </span>
            <h2 className="text-xl font-black text-slate-100">決済に成功しました！</h2>
            <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
              クレジットカードによるお支払いが完了し、Proプランのすべての機能制限（無制限の自動通訳、自社辞書の一括追加、AI用語抽出等）が正常に解除されました。
            </p>
          </div>

          <div className="pt-4 space-y-3">
            <Link 
              href="/"
              className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-bold rounded-2xl shadow-lg shadow-emerald-500/10 transition-all flex items-center justify-center gap-1.5 text-xs hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <span>ゲンバトークの利用を開始する</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900/60 px-6 py-6 text-center text-[10px] text-slate-500 shrink-0 select-none">
        <p>© 2026 GENBATALK. All rights reserved.</p>
      </footer>

    </div>
  );
}
