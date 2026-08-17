'use client';

import React, { useState } from 'react';
import { ArrowLeft, Send, CheckCircle, Mail, Building, User, MessageSquare } from 'lucide-react';
import Link from 'next/link';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    company: '',
    name: '',
    email: '',
    subject: 'pro',
    message: ''
  });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const plan = params.get('plan');
      if (plan === 'pro') {
        setFormData(prev => ({ ...prev, subject: 'pro' }));
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) {
      alert('必須項目を入力してください。');
      return;
    }
    
    setIsSubmitting(true);
    // Simulate API request
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsSubmitting(false);
    setIsSubmitted(true);
  };

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

      {/* Main Content Area */}
      <main className="flex-1 flex items-center justify-center p-6 max-w-lg mx-auto w-full">
        
        {!isSubmitted ? (
          /* Contact Form Card */
          <div className="w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl animate-in fade-in zoom-in duration-200">
            
            <div className="space-y-2 mb-6">
              <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 rounded-full inline-block">
                お問い合わせ
              </span>
              <h1 className="text-2xl font-black text-slate-100 tracking-tight leading-none">
                サポート・お問い合わせ
              </h1>
              <p className="text-xs text-slate-400 leading-relaxed">
                プロプランのご契約内容や、サービスの利用方法に関するご質問、不具合の報告・ご要望等を承ります。
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Company Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-indigo-400" />
                  <span>会社名</span>
                </label>
                <input
                  type="text"
                  placeholder="例: 株式会社 ゲンバ建設"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                />
              </div>

              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-indigo-400" />
                  <span>担当者名 <span className="text-red-400 font-bold">*</span></span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="例: 山田 太郎"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                />
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-indigo-400" />
                  <span>メールアドレス <span className="text-red-400 font-bold">*</span></span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="例: name@company.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                />
              </div>

              {/* Subject */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">
                  お問い合わせ種別
                </label>
                <select
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-300 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                >
                  <option value="pro">プロプランのご契約・お支払いについて</option>
                  <option value="bug">不具合報告・機能改善のご要望</option>
                  <option value="other">その他のお問い合わせ</option>
                </select>
              </div>

              {/* Message */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                  <span>お問い合わせ内容 <span className="text-red-400 font-bold">*</span></span>
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="ご希望の導入規模（現場数、利用人数）や、ご相談内容を詳しくご記入ください。"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all resize-none"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-4 py-3.5 bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-bold rounded-2xl shadow-lg shadow-emerald-500/10 transition-all flex items-center justify-center gap-2 text-xs disabled:opacity-50 hover:scale-[1.01] active:scale-[0.99] cursor-pointer select-none"
              >
                {isSubmitting ? (
                  <span className="animate-pulse">送信中...</span>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>お問い合わせを送信する</span>
                  </>
                )}
              </button>
            </form>
          </div>
        ) : (
          /* Submission Success State */
          <div className="w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl text-center space-y-6 animate-in fade-in zoom-in duration-300 select-none">
            <div className="flex justify-center">
              <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-full text-emerald-400">
                <CheckCircle className="w-12 h-12" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-black text-slate-100">送信が完了しました</h2>
              <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
                お問い合わせいただきありがとうございます。内容を確認の上、担当者より1〜2営業日以内にご連絡させていただきます。
              </p>
            </div>
            <div className="pt-4">
              <Link 
                href="/"
                className="inline-block py-3 px-6 bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-bold rounded-2xl border border-slate-700 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                Talkieへ戻る
              </Link>
            </div>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900/60 px-6 py-6 text-center text-[10px] text-slate-500 shrink-0 select-none">
        <p>© 2026 Talkie. All rights reserved.</p>
      </footer>

    </div>
  );
}
