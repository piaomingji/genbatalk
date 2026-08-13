'use client';

import React, { useState } from 'react';
import { Check, ArrowLeft, Sparkles, Zap, Users, HelpCircle } from 'lucide-react';
import Link from 'next/link';

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const plans = [
    {
      name: 'フリープラン',
      desc: '基本的な機能をお試ししたい現場向け',
      price: '0',
      icon: Zap,
      accent: 'indigo',
      features: [
        '1日の翻訳上限 50回まで',
        '主要17言語の相互音声通訳',
        '標準通訳音声 (女性のみ)',
        'カスタム単語辞書の登録 (最大5語)',
        '1デバイスでのスタンドアロン利用'
      ],
      buttonText: '現在適用中',
      buttonClass: 'bg-slate-800 text-slate-400 border border-slate-700 cursor-not-allowed w-full block text-center py-3 rounded-2xl font-bold text-xs',
      popular: false,
      href: ''
    },
    {
      name: 'プロプラン',
      desc: '1対1の通訳機能を本格的に活用したい現場向け',
      price: billingCycle === 'monthly' ? '2,980' : '2,380',
      icon: Sparkles,
      accent: 'emerald',
      features: [
        '翻訳・通訳回数 無制限',
        '男性・女性音声の優先再生',
        '自社辞書の登録・CSVインポート無制限',
        'AIによる資料からの用語自動抽出',
        '2台のデバイス間（監督 ↔ 作業員）での同期',
        '定型文（プリセット）の自由な編集・保存',
        'メールサポート (通常3営業日以内)'
      ],
      buttonText: billingCycle === 'monthly' ? 'プロプランを始める (月額)' : 'プロプランを始める (年額)',
      buttonClass: 'bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white shadow-lg shadow-emerald-500/10 hover:scale-[1.02] active:scale-[0.98] w-full block text-center py-3 rounded-2xl font-bold text-xs select-none',
      popular: true,
      href: '/pricing/success?plan=pro'
    },
    {
      name: 'ビジネスプラン',
      desc: 'チーム内での専門用語の共有や一斉指示を行いたい現場向け',
      price: billingCycle === 'monthly' ? '9,800' : '7,800',
      icon: Users,
      accent: 'indigo',
      features: [
        '翻訳・通訳回数 無制限',
        '最大5台のデバイス間での同時共有・同期',
        'チーム内での専門用語辞書の自動一括共有',
        '男性・女性音声の優先再生',
        '自社辞書の登録・CSVインポート無制限',
        'AIによる資料からの用語自動抽出',
        '優先メールサポート (通常1営業日以内)'
      ],
      buttonText: billingCycle === 'monthly' ? 'ビジネスプランを始める (月額)' : 'ビジネスプランを始める (年額)',
      buttonClass: 'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 hover:scale-[1.02] active:scale-[0.98] w-full block text-center py-3 rounded-2xl font-bold text-xs select-none',
      popular: false,
      href: '/pricing/success?plan=business'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30">
      
      {/* Header Navigation */}
      <header className="border-b border-slate-900/80 px-6 py-4 flex items-center justify-between shrink-0 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
        <Link href="/" className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-slate-100 transition-all select-none">
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden xs:inline">ゲンバトークへ戻る</span>
        </Link>
        <div className="font-black text-sm tracking-widest text-slate-300">
          GENBA<span className="text-emerald-400">TALK</span>
        </div>
        <Link href="/contact" className="text-xs font-bold text-slate-400 hover:text-emerald-400 transition-all select-none">
          お問い合わせ
        </Link>
      </header>

      {/* Hero Section */}
      <main className="flex-1 overflow-y-auto px-6 py-12 space-y-12 max-w-5xl mx-auto w-full">
        
        {/* Hero Title */}
        <div className="text-center space-y-3">
          <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full inline-block">
            料金プラン
          </span>
          <h1 className="text-3xl font-black text-slate-100 tracking-tight leading-none break-keep">
            現場に最適なプランを
          </h1>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            小規模な現場検証から本格的な複数現場・チームでの導入まで、クレジットカード決済のみで即座に開始・解約が可能です。
          </p>
        </div>

        {/* Toggle Billing Cycle */}
        <div className="flex justify-center select-none">
          <div className="bg-slate-900 border border-slate-800 p-1 rounded-2xl flex items-center gap-1 shadow-inner">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-slate-800 text-slate-100 shadow-md border border-slate-700/60'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              月額払い
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
                billingCycle === 'yearly'
                  ? 'bg-slate-800 text-slate-100 shadow-md border border-slate-700/60'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <span>年額払い</span>
              <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded-md font-black">
                20% OFF
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {plans.map((plan) => {
            const Icon = plan.icon;
            return (
              <div
                key={plan.name}
                className={`relative bg-slate-900 border rounded-3xl p-6 flex flex-col justify-between transition-all duration-300 hover:scale-[1.03] ${
                  plan.popular
                    ? 'border-emerald-500 shadow-xl shadow-emerald-500/5 ring-1 ring-emerald-500/30'
                    : 'border-slate-800 hover:border-slate-700/80 shadow-md'
                }`}
              >
                {/* Popular Ribbon */}
                {plan.popular && (
                  <span className="absolute -top-3 right-6 bg-gradient-to-r from-emerald-500 to-indigo-600 text-white text-[10px] font-black px-3 py-1 rounded-full shadow-md select-none flex items-center gap-1">
                    <Sparkles className="w-3 h-3 animate-pulse" />
                    <span>おすすめ</span>
                  </span>
                )}

                {/* Plan Info */}
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

                  {/* Price */}
                  <div className="flex items-baseline gap-1 select-none border-b border-slate-800/60 pb-6">
                    <span className="text-sm font-bold text-slate-400">¥</span>
                    <span className="text-3xl font-black text-slate-100 tracking-tight">
                      {plan.price}
                    </span>
                    <span className="text-xs text-slate-500 ml-1">
                      / 月
                    </span>
                    {plan.price !== '0' && (
                      <span className="text-[9px] text-slate-500 ml-2 font-mono">
                        (年額一括 ¥{parseInt(plan.price.replace(/,/g, '')) * 12})
                      </span>
                    )}
                  </div>

                  {/* Features List */}
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

                {/* CTA Button */}
                <div className="pt-8">
                  {plan.href ? (
                    <Link href={plan.href} className={plan.buttonClass}>
                      {plan.buttonText}
                    </Link>
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

        {/* Pricing FAQs */}
        <div className="border-t border-slate-900/80 pt-12 space-y-6">
          <h2 className="text-center font-black text-lg text-slate-100 flex items-center justify-center gap-2">
            <HelpCircle className="w-5 h-5 text-indigo-400" />
            <span>よくある質問</span>
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs leading-relaxed">
            <div className="space-y-1 bg-slate-900/40 p-4 rounded-2xl border border-slate-900/60">
              <h4 className="font-bold text-slate-200">支払い方法は何が対応していますか？</h4>
              <p className="text-slate-400">クレジットカード決済（Visa、Mastercard、JCB、American Express等）およびApple Pay、Google Payに対応しています。</p>
            </div>
            <div className="space-y-1 bg-slate-900/40 p-4 rounded-2xl border border-slate-900/60">
              <h4 className="font-bold text-slate-200">最低利用期間はありますか？解除料は発生しますか？</h4>
              <p className="text-slate-400">月額プランには最低利用期間はなく、いつでも画面から解約できます。解約手数料や違約金も一切発生しません。年額プランの場合は年間一括でのお支払いとなり、期間途中での返金は致しかねます。</p>
            </div>
            <div className="space-y-1 bg-slate-900/40 p-4 rounded-2xl border border-slate-900/60">
              <h4 className="font-bold text-slate-200">現場ごとの専門用語辞書のカスタマイズは簡単ですか？</h4>
              <p className="text-slate-400">はい！プロプランおよびビジネスプランでは、設定画面からCSVファイルで一括インポートする機能や、AIが自社マニュアルをスキャンして自動で専門用語集を抽出・登録するセルフサービス機能が利用できます。</p>
            </div>
            <div className="space-y-1 bg-slate-900/40 p-4 rounded-2xl border border-slate-900/60">
              <h4 className="font-bold text-slate-200">領収書や請求書は発行されますか？</h4>
              <p className="text-slate-400">クレジットカード決済完了後、Stripeよりご登録いただいたメールアドレス宛てに領収書が自動発行・送付されます。</p>
            </div>
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900/60 px-6 py-6 text-center text-[10px] text-slate-500 shrink-0 select-none">
        <p>© 2026 GENBATALK. All rights reserved.</p>
        <p className="mt-1 flex items-center justify-center gap-2">
          <Link href="/tokushoho" className="hover:underline">特定商取引法に基づく表記</Link>
          <span className="text-slate-700">|</span>
          <Link href="/privacy" className="hover:underline">プライバシーポリシー</Link>
        </p>
      </footer>

    </div>
  );
}
