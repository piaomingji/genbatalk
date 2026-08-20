'use client';

import React, { useState } from 'react';
import { ArrowLeft, Send, CheckCircle, Mail, User, MessageSquare, Tag, AlertCircle } from 'lucide-react';
import Link from 'next/link';

/**
 * Support enquiries.
 *
 * The form used to be a mock-up: it waited a second and a half and announced that the message had
 * been sent, having sent nothing. That mattered more than it looks, because the legal notice names
 * this form as the way to request the operator's address and phone number.
 *
 * The fields are the ones a person writing in actually has. The old form asked for a company name
 * and a "person in charge", with a construction firm as the example -- left over from when this was
 * a tool for building sites rather than a translator anyone can use.
 */

/** Must match the options in the Google Form the server posts to. */
const TYPES = ['製品について', '技術サポート', '料金・プラン', 'その他'] as const;

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    type: 'その他' as (typeof TYPES)[number],
    subject: '',
    message: '',
  });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim() || !formData.email.trim() || !formData.subject.trim() || !formData.message.trim()) {
      setError('すべての項目を入力してください。');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'お問い合わせの送信に失敗しました。');
      }
      setIsSubmitted(true);
    } catch (err) {
      // Never claim success on a failure -- the person needs to know to try again.
      setError(
        err instanceof Error && err.message
          ? err.message
          : '接続できませんでした。時間をおいて再度お試しください。'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const field =
    'w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all';

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
                プランのご契約・お支払いに関するご質問、使い方のご相談、不具合のご報告やご要望を承ります。
                ご記入いただいたメールアドレス宛にご返信します。
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-indigo-400" />
                  <span>お名前 <span className="text-red-400 font-bold">*</span></span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="例: 山田 太郎"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className={field}
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
                  placeholder="例: name@example.com"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className={field}
                />
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  ご返信先です。お間違いのないようご確認ください。
                </p>
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-indigo-400" />
                  <span>お問い合わせ種別</span>
                </label>
                <select
                  value={formData.type}
                  onChange={e => setFormData({ ...formData, type: e.target.value as (typeof TYPES)[number] })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-300 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                >
                  {TYPES.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {/* Subject */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                  <span>件名 <span className="text-red-400 font-bold">*</span></span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="例: 解約の方法について"
                  value={formData.subject}
                  onChange={e => setFormData({ ...formData, subject: e.target.value })}
                  className={field}
                />
              </div>

              {/* Message */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                  <span>お問い合わせ内容 <span className="text-red-400 font-bold">*</span></span>
                </label>
                <textarea
                  required
                  rows={5}
                  placeholder="ご相談内容をできるだけ具体的にご記入ください。不具合のご報告の場合は、お使いの端末（iPhone / Androidなど）と、どの操作で起きたかを書いていただけると助かります。"
                  value={formData.message}
                  onChange={e => setFormData({ ...formData, message: e.target.value })}
                  className={`${field} resize-none`}
                />
              </div>

              {error && (
                <div className="flex items-start gap-2 text-[11px] text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5 leading-relaxed">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-px" />
                  <span>{error}</span>
                </div>
              )}

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
                お問い合わせいただきありがとうございます。内容を確認のうえ、ご記入いただいたメールアドレス宛に、
                通常1〜2営業日以内にご返信いたします。
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
