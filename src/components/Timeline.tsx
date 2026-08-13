import React, { useEffect, useRef } from 'react';
import { Volume2, User, HelpCircle } from 'lucide-react';

export interface ChatMessage {
  id: string;
  sender: 'staff' | 'worker';
  originalText: string;
  translatedText: string;
  fromLang: string;
  toLang: string;
  timestamp: Date;
}

interface TimelineProps {
  messages: ChatMessage[];
  onSpeak: (text: string, langCode: string) => void;
}

// Only <ruby> and <rt> (furigana) tags are ever legitimately produced by the translation
// prompts. Everything else is stripped before being rendered as HTML, since translatedText
// can originate from another device in a shared room (see /api/channel) and must never be
// trusted as safe markup.
function sanitizeTranslatedHtml(input: string): string {
  if (!input) return '';
  const allowedTags = new Set(['ruby', 'rt']);
  return input.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g, (match, tagName) => {
    const lower = tagName.toLowerCase();
    if (!allowedTags.has(lower)) return '';
    const isClosing = match.startsWith('</');
    return isClosing ? `</${lower}>` : `<${lower}>`;
  });
}

const FLAG_MAP: Record<string, string> = {
  ja: '🇯🇵',
  en: '🇺🇸',
  vi: '🇻🇳',
  ne: '🇳🇵',
  id: '🇮🇩',
  tl: '🇵🇭',
  zh: '🇨🇳',
  ko: '🇰🇷',
  pt: '🇵🇹',
  es: '🇪🇸',
  th: '🇹🇭',
  ru: '🇷🇺',
  fr: '🇫🇷',
  my: '🇲🇲',
  si: '🇱🇰',
  km: '🇰🇭',
  ur: '🇵🇰',
};

export default function Timeline({ messages, onSpeak }: TimelineProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll to bottom on new messages
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
      {messages.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500">
            <User className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-400">指示・会話履歴はありません</h3>
            <p className="text-xs text-slate-600 mt-1 max-w-[260px] mx-auto leading-relaxed">
              下のマイクボタンを押して、指示や返答を音声で入力してください。
            </p>
          </div>
        </div>
      ) : (
        messages.map((msg) => {
          const isStaff = msg.sender === 'staff';
          
          return (
            <div 
              key={msg.id}
              className={`flex items-start gap-3.5 max-w-[88%] animate-in fade-in slide-in-from-bottom-4 duration-300 ${
                isStaff ? 'mr-auto' : 'ml-auto flex-row-reverse'
              }`}
            >
              {/* User Avatar with Glowing Rings */}
              <div className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 text-xs font-black shadow-lg relative ${
                isStaff 
                  ? 'bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white shadow-indigo-600/30' 
                  : 'bg-gradient-to-tr from-emerald-600 to-emerald-500 text-white shadow-emerald-600/30'
              }`}>
                {isStaff ? '監' : '作'}
                <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-slate-950 flex items-center justify-center text-[7px] ${
                  isStaff ? 'bg-indigo-400' : 'bg-emerald-400'
                }`} />
              </div>

              {/* Message Bubble Container */}
              <div className="space-y-1">
                {/* Header (Sender and Lang info) */}
                <div className={`flex items-center gap-2 text-[10px] text-slate-400 font-bold ${
                  isStaff ? 'justify-start' : 'justify-end flex-row-reverse'
                }`}>
                  <span className="tracking-wide">{isStaff ? '日本人監督' : '外国人作業員'}</span>
                  <span className="text-slate-600">•</span>
                  <span className="px-1.5 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-slate-300 flex items-center gap-1 font-mono">
                    {FLAG_MAP[msg.fromLang] || '🌐'}
                    <span className="text-[8px] text-slate-500">➔</span>
                    {FLAG_MAP[msg.toLang] || '🌐'}
                  </span>
                </div>

                {/* Main bubble body with glassmorphic styles and custom shadows */}
                <div className={`p-4 rounded-3xl border backdrop-blur-xl shadow-xl transition-all hover:scale-[1.01] relative ${
                  isStaff 
                    ? 'bg-slate-900/70 border-slate-800/80 text-slate-100 rounded-tl-none shadow-indigo-950/10' 
                    : 'bg-emerald-950/15 border-emerald-500/20 text-slate-100 rounded-tr-none shadow-emerald-950/10'
                }`}>
                  {/* Original text (smaller) */}
                  <div className="text-xs text-slate-400 font-medium break-words leading-relaxed mb-1.5 select-all">
                    {msg.originalText}
                  </div>

                  {/* Translated text (larger, bold) */}
                  <div 
                    className="text-[15px] font-black tracking-wide break-words leading-relaxed pr-8 select-all"
                    dangerouslySetInnerHTML={{ __html: sanitizeTranslatedHtml(msg.translatedText) }}
                  />

                  {/* Speaker replay button inside bubble */}
                  <button
                    onClick={() => onSpeak(msg.translatedText, msg.toLang)}
                    title="音声を再再生"
                    className="absolute right-3.5 bottom-3.5 p-2 rounded-xl bg-slate-950/60 border border-slate-800/80 text-slate-400 hover:text-slate-100 hover:bg-slate-900 transition-all hover:scale-105 cursor-pointer"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })
      )}
      <div ref={bottomRef} />
    </div>
  );
}
