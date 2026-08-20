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
          TALK<span className="text-emerald-400">IE</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto px-6 py-12 max-w-3xl mx-auto w-full space-y-8">
        
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-black text-slate-100 tracking-tight leading-none">
            Legal Notice (Japan)
          </h1>
          <p className="text-sm font-bold text-slate-300">特定商取引法に基づく表記</p>
          <p className="text-xs text-slate-500 leading-normal max-w-lg mx-auto">
            This disclosure is required of businesses selling to consumers in Japan. It is shown in
            Japanese because that is who it is written for, with an English rendering alongside each
            item.
          </p>
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-900 bg-slate-900/30 shadow-xl">
          <dl className="divide-y divide-slate-900 text-xs">
            {/* Operator */}
            <div className="grid grid-cols-1 p-5 sm:grid-cols-3 sm:gap-4">
              <dt className="font-black text-slate-300">
                事業者名
                <span className="block text-[10px] font-bold text-slate-500 mt-0.5">Business name</span>
              </dt>
              <dd className="mt-1 text-slate-400 sm:col-span-2 sm:mt-0 leading-relaxed">
                Talkie運営事務局<br />
                <span className="block text-[10px] text-slate-500 mt-2 leading-relaxed border-t border-slate-800/60 pt-2">Talkie (sole operator). Other details such as address and phone number are disclosed without delay by email on request via the contact form below.</span>
                <span className="text-[10px] text-slate-500 block mt-1">
                  ※その他事業者情報（所在地・電話番号等）については、以下のお問い合わせ窓口よりご請求いただいた場合、遅滞なく電子メール等で開示いたします。
                </span>
              </dd>
            </div>

            {/* Representative */}
            <div className="grid grid-cols-1 p-5 sm:grid-cols-3 sm:gap-4">
              <dt className="font-black text-slate-300">
                代表者名
                <span className="block text-[10px] font-bold text-slate-500 mt-0.5">Representative</span>
              </dt>
              <dd className="mt-1 text-slate-400 sm:col-span-2 sm:mt-0">
                請求があった場合、遅滞なく電子メール等で開示します。
                <span className="block text-[10px] text-slate-500 mt-2 leading-relaxed border-t border-slate-800/60 pt-2">Disclosed without delay by email on request.</span>
              </dd>
            </div>

            {/* Address & Tel */}
            <div className="grid grid-cols-1 p-5 sm:grid-cols-3 sm:gap-4">
              <dt className="font-black text-slate-300">
                所在地・電話番号
                <span className="block text-[10px] font-bold text-slate-500 mt-0.5">Address and phone number</span>
              </dt>
              <dd className="mt-1 text-slate-400 sm:col-span-2 sm:mt-0">
                請求があった場合、遅滞なく電子メール等で開示します。
                <span className="block text-[10px] text-slate-500 mt-2 leading-relaxed border-t border-slate-800/60 pt-2">Disclosed without delay by email on request.</span>
              </dd>
            </div>

            {/* Contact */}
            <div className="grid grid-cols-1 p-5 sm:grid-cols-3 sm:gap-4">
              <dt className="font-black text-slate-300">
                お問い合わせ
                <span className="block text-[10px] font-bold text-slate-500 mt-0.5">Contact</span>
              </dt>
              <dd className="mt-1 text-slate-400 sm:col-span-2 sm:mt-0 leading-relaxed">
                お問い合わせフォームよりご連絡ください。<br />
                <Link href="/contact" className="text-emerald-400 hover:underline font-bold inline-block mt-1">
                  お問い合わせフォームへ
                </Link>
              </dd>
            </div>

            {/* Selling Price */}
            <div className="grid grid-cols-1 p-5 sm:grid-cols-3 sm:gap-4">
              <dt className="font-black text-slate-300">
                販売価格
                <span className="block text-[10px] font-bold text-slate-500 mt-0.5">Price</span>
              </dt>
              <dd className="mt-1 text-slate-400 sm:col-span-2 sm:mt-0 leading-relaxed">
                <ul className="list-disc list-inside space-y-1">
                  <li>Plusプラン：月額 7.99 USD</li>
                  <li>Plusプラン（年額一括）：月額換算 6.39 USD（年額 76.68 USD）</li>
                  <li>Proプラン：月額 19.99 USD</li>
                  <li>Proプラン（年額一括）：月額換算 15.99 USD（年額 191.88 USD）</li>
                </ul>
                <span className="text-[10px] text-slate-500 block mt-2 leading-relaxed">
                  表示価格は米ドルです。消費税等の間接税は、お客様の所在国の税制に応じて決済時に加算される場合があります。日本円でのご請求額は、決済会社が適用する為替レートにより変動します。
                </span>
                <span className="block text-[10px] text-slate-500 mt-2 leading-relaxed border-t border-slate-800/60 pt-2">Prices are in US dollars. Sales tax or VAT may be added at checkout depending on where you are, and amounts billed in other currencies vary with the exchange rate applied by the payment provider.</span>
              </dd>
            </div>

            {/* Additional Fees */}
            <div className="grid grid-cols-1 p-5 sm:grid-cols-3 sm:gap-4">
              <dt className="font-black text-slate-300">
                商品代金以外の必要料金
                <span className="block text-[10px] font-bold text-slate-500 mt-0.5">Additional costs</span>
              </dt>
              <dd className="mt-1 text-slate-400 sm:col-span-2 sm:mt-0 leading-relaxed">
                インターネット接続料金その他の電気通信回線の通信に関する費用（購入者様のご負担となります）。<br />
                海外発行のクレジットカードをご利用の場合、カード会社が定める海外事務手数料が別途発生することがあります。
                <span className="block text-[10px] text-slate-500 mt-2 leading-relaxed border-t border-slate-800/60 pt-2">You are responsible for your own internet connection costs. Cards issued outside Japan may incur a foreign transaction fee set by your card issuer.</span>
              </dd>
            </div>

            {/* Payment Method */}
            <div className="grid grid-cols-1 p-5 sm:grid-cols-3 sm:gap-4">
              <dt className="font-black text-slate-300">
                お支払い方法
                <span className="block text-[10px] font-bold text-slate-500 mt-0.5">Payment methods</span>
              </dt>
              <dd className="mt-1 text-slate-400 sm:col-span-2 sm:mt-0">
                クレジットカード決済（Stripe）
                <span className="block text-[10px] text-slate-500 mt-2 leading-relaxed border-t border-slate-800/60 pt-2">Credit and debit cards, processed by Stripe.</span>
              </dd>
            </div>

            {/* Delivery Time */}
            <div className="grid grid-cols-1 p-5 sm:grid-cols-3 sm:gap-4">
              <dt className="font-black text-slate-300">
                役務の引き渡し時期
                <span className="block text-[10px] font-bold text-slate-500 mt-0.5">When the service starts</span>
              </dt>
              <dd className="mt-1 text-slate-400 sm:col-span-2 sm:mt-0">
                お支払い手続き完了後、即時にご利用可能となります。各プランに含まれる通訳時間は、ご契約と同時に満額付与され、以後は毎月1日（日本時間 午前9時）に満額へ更新されます。当月の未使用分は翌月に繰り越されません。
                <span className="block text-[10px] text-slate-500 mt-2 leading-relaxed border-t border-slate-800/60 pt-2">Access begins immediately after payment. Your plan&apos;s minutes are granted in full when you subscribe, and reset to full on the first of each month (09:00 Japan time). Unused minutes do not carry over.</span>
              </dd>
            </div>

            {/* Cancel / Refund */}
            <div className="grid grid-cols-1 p-5 sm:grid-cols-3 sm:gap-4">
              <dt className="font-black text-slate-300">
                返品・キャンセル
                <span className="block text-[10px] font-bold text-slate-500 mt-0.5">Cancellation and refunds</span>
              </dt>
              <dd className="mt-1 text-slate-400 sm:col-span-2 sm:mt-0 leading-relaxed">
                デジタルコンテンツ及びサービスの性質上、決済完了後の返金・返品・キャンセルは原則として受け付けておりません。<br />
                定期課金の解約は、次回課金日の前日までいつでも設定画面より手続きでき、次回以降の請求は発生いたしません。解約後も、お支払い済みの期間の終了までご利用いただけます。<br />
                <span className="block mt-2">
                  なお、欧州経済領域（EEA）および英国のお客様には、消費者保護法令に基づく14日間の解約権が適用されます。ただし、当該期間内にサービスの提供を開始することにご同意いただき、かつ通訳機能をご利用開始された場合、その解約権は失われます。
                </span>
                <span className="block text-[10px] text-slate-500 mt-2 leading-relaxed border-t border-slate-800/60 pt-2">Because this is a digital service, payments are generally non-refundable. You may cancel at any time before the next billing date and keep access until the paid period ends. Customers in the EEA and the UK have a 14-day right of withdrawal, which is lost once translation has been used within that period after agreeing the service may start immediately.</span>
              </dd>
            </div>
          </dl>
        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900/60 px-6 py-6 text-center text-[10px] text-slate-500 shrink-0 select-none">
        <p>© 2026 Talkie. All rights reserved.</p>
      </footer>

    </div>
  );
}
