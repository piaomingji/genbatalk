'use client';

import React from 'react';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30">
      
      {/* Header Navigation */}
      <header className="border-b border-slate-900/80 px-6 py-4 flex items-center justify-between shrink-0 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
        <Link href="/pricing" className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-slate-100 transition-all select-none">
          <ArrowLeft className="w-4 h-4" />
          <span>料金プランへ戻る</span>
        </Link>
        <div className="font-black text-sm tracking-widest text-slate-300">
          GENBA<span className="text-emerald-400">TALK</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto px-6 py-12 max-w-3xl mx-auto w-full space-y-8">
        
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-black text-slate-100 tracking-tight leading-none">
            プライバシーポリシー
          </h1>
          <p className="text-xs text-slate-500 leading-normal">
            ゲンバトークの個人情報および音声データの保護に関する方針です。
          </p>
        </div>

        <div className="bg-slate-900/30 border border-slate-900 rounded-3xl p-6 md:p-8 space-y-6 text-xs text-slate-400 leading-relaxed">
          
          <section className="space-y-2">
            <h2 className="font-black text-slate-200 text-sm">1. 個人情報の収集目的</h2>
            <p>
              当サービスは、決済手続き（Stripe経由での決済認証）、お問い合わせへの対応、およびサービスの利用状況分析のために必要最小限の個人情報を収集します。
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-black text-slate-200 text-sm">2. 音声・通訳データのプライバシー保護</h2>
            <ul className="list-decimal list-inside space-y-1.5 pl-1">
              <li>利用者が本アプリのマイクを通して入力した音声データは、リアルタイムの翻訳・通訳処理のみに使用されます。</li>
              <li>アップロードされた音声データおよび翻訳されたテキストを、利用者の事前の明示的な同意なくAIの追加学習やシステム開発のためのデータセットとして流用・二次利用することは一切ありません。</li>
              <li>音声データおよびテキストデータは安全な暗号化通信（SSL/TLS）により保護されます。</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="font-black text-slate-200 text-sm">3. 音声データの保存および安全な削除</h2>
            <p>
              プライバシー保護の観点から、通訳処理に使用された一時的な音声ファイルは、翻訳処理が完了した時点で当サービスのサーバー上から即座に自動破棄され、蓄積または保存されることはありません。
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-black text-slate-200 text-sm">4. 第三者への開示・提供の制限</h2>
            <p>
              当サービスは、収集した個人情報および音声データを、法令に基づく要請がある場合を除き、利用者の承諾なしに第三者へ開示または提供することはありません。
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-black text-slate-200 text-sm">5. プライバシーポリシーの改定</h2>
            <p>
              当サービスは、個人情報保護法の改正やサービスの変更に伴い、本プライバシーポリシーを随時更新することがあります。重要な変更がある場合は、サービスサイト上で事前にお知らせいたします。
            </p>
          </section>

        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900/60 px-6 py-6 text-center text-[10px] text-slate-500 shrink-0 select-none">
        <p>© 2026 GENBATALK. All rights reserved.</p>
      </footer>

    </div>
  );
}
