'use client';

import React from 'react';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function TokushohoPage() {
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
            特定商取引法に基づく表記
          </h1>
          <p className="text-xs text-slate-500 leading-normal">
            ゲンバトークのサービスに関する特定商取引法に基づく表記です。
          </p>
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-900 bg-slate-900/30 shadow-xl">
          <dl className="divide-y divide-slate-900 text-xs">
            {/* Operator */}
            <div className="grid grid-cols-1 p-5 sm:grid-cols-3 sm:gap-4">
              <dt className="font-black text-slate-300">事業者名</dt>
              <dd className="mt-1 text-slate-400 sm:col-span-2 sm:mt-0 leading-relaxed">
                ゲンバトーク運営事務局<br />
                <span className="text-[10px] text-slate-500 block mt-1">
                  ※その他事業者情報（所在地・電話番号等）については、以下のお問い合わせ窓口よりご請求いただいた場合、遅滞なく電子メール等で開示いたします。
                </span>
              </dd>
            </div>

            {/* Representative */}
            <div className="grid grid-cols-1 p-5 sm:grid-cols-3 sm:gap-4">
              <dt className="font-black text-slate-300">代表者名</dt>
              <dd className="mt-1 text-slate-400 sm:col-span-2 sm:mt-0">
                請求があった場合、遅滞なく電子メール等で開示します。
              </dd>
            </div>

            {/* Address & Tel */}
            <div className="grid grid-cols-1 p-5 sm:grid-cols-3 sm:gap-4">
              <dt className="font-black text-slate-300">所在地・電話番号</dt>
              <dd className="mt-1 text-slate-400 sm:col-span-2 sm:mt-0">
                請求があった場合、遅滞なく電子メール等で開示します。
              </dd>
            </div>

            {/* Contact */}
            <div className="grid grid-cols-1 p-5 sm:grid-cols-3 sm:gap-4">
              <dt className="font-black text-slate-300">お問い合わせ</dt>
              <dd className="mt-1 text-slate-400 sm:col-span-2 sm:mt-0 leading-relaxed">
                お問い合わせフォームよりご連絡ください。<br />
                <Link href="/contact" className="text-emerald-400 hover:underline font-bold inline-block mt-1">
                  お問い合わせフォームへ
                </Link>
              </dd>
            </div>

            {/* Selling Price */}
            <div className="grid grid-cols-1 p-5 sm:grid-cols-3 sm:gap-4">
              <dt className="font-black text-slate-300">販売価格</dt>
              <dd className="mt-1 text-slate-400 sm:col-span-2 sm:mt-0 leading-relaxed">
                <ul className="list-disc list-inside space-y-1">
                  <li>プロプラン：月額2,980円（税込）</li>
                  <li>プロプラン（年額一括）：月額換算2,380円（税込 / 年額一括支払い）</li>
                  <li>エンタープライズプラン：要相談</li>
                </ul>
              </dd>
            </div>

            {/* Additional Fees */}
            <div className="grid grid-cols-1 p-5 sm:grid-cols-3 sm:gap-4">
              <dt className="font-black text-slate-300">商品代金以外の必要料金</dt>
              <dd className="mt-1 text-slate-400 sm:col-span-2 sm:mt-0 leading-relaxed">
                インターネット接続料金その他の電気通信回線の通信に関する費用（購入者様のご負担となります）
              </dd>
            </div>

            {/* Payment Method */}
            <div className="grid grid-cols-1 p-5 sm:grid-cols-3 sm:gap-4">
              <dt className="font-black text-slate-300">お支払い方法</dt>
              <dd className="mt-1 text-slate-400 sm:col-span-2 sm:mt-0">
                クレジットカード決済（Stripe）
              </dd>
            </div>

            {/* Delivery Time */}
            <div className="grid grid-cols-1 p-5 sm:grid-cols-3 sm:gap-4">
              <dt className="font-black text-slate-300">役務の引き渡し時期</dt>
              <dd className="mt-1 text-slate-400 sm:col-span-2 sm:mt-0">
                お支払い手続き完了後、即時にご利用可能となります。
              </dd>
            </div>

            {/* Cancel / Refund */}
            <div className="grid grid-cols-1 p-5 sm:grid-cols-3 sm:gap-4">
              <dt className="font-black text-slate-300">返品・キャンセル</dt>
              <dd className="mt-1 text-slate-400 sm:col-span-2 sm:mt-0 leading-relaxed">
                デジタルコンテンツ及びサービスの性質上、決済完了後の返金・返品・キャンセルは受け付けておりません。<br />
                定期課金（プロプラン）の解約は、次回課金日の前日までいつでもマイページ/設定画面より解約手続きを行うことができ、次回以降の請求は発生いたしません。
              </dd>
            </div>
          </dl>
        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900/60 px-6 py-6 text-center text-[10px] text-slate-500 shrink-0 select-none">
        <p>© 2026 GENBATALK. All rights reserved.</p>
      </footer>

    </div>
  );
}
