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

const FLAG_MAP: Record<string, string> = {
  ja: '🇯🇵',
  en: '🇺🇸',
  vi: '🇻🇳',
  ne: '🇳🇵',
  id: '🇮🇩',
  tl: '🇵🇭',
  zh: '🇨🇳',
  ko: '🇰🇷',
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
              className={`flex items-start gap-3 max-w-[85%] animate-in fade-in slide-in-from-bottom-3 duration-300 ${
                isStaff ? 'mr-auto' : 'ml-auto flex-row-reverse'
              }`}
            >
              {/* User Avatar */}
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold shadow-md ${
                isStaff 
                  ? 'bg-indigo-600 text-white' 
                  : 'bg-emerald-600 text-white'
              }`}>
                {isStaff ? '監' : '作'}
              </div>

              {/* Message Bubble */}
              <div className="space-y-1">
                {/* Header (Sender and Lang info) */}
                <div className={`flex items-center gap-1.5 text-[10px] text-slate-500 font-bold ${
                  isStaff ? 'justify-start' : 'justify-end flex-row-reverse'
                }`}>
                  <span>{isStaff ? '日本人監督' : '外国人作業員'}</span>
                  <span>•</span>
                  <span>
                    {FLAG_MAP[msg.fromLang] || '🌐'} ➔ {FLAG_MAP[msg.toLang] || '🌐'}
                  </span>
                </div>

                {/* Main bubble body */}
                <div className={`p-4 rounded-2xl border backdrop-blur-md shadow-sm relative ${
                  isStaff 
                    ? 'bg-slate-900/60 border-slate-800 text-slate-100 rounded-tl-none' 
                    : 'bg-emerald-950/20 border-emerald-900/50 text-slate-100 rounded-tr-none'
                }`}>
                  {/* Original text (smaller) */}
                  <div className="text-xs text-slate-400/90 font-medium break-keep leading-relaxed mb-1">
                    {msg.originalText}
                  </div>

                  {/* Translated text (larger, bold) */}
                  <div className="text-base font-extrabold break-keep leading-relaxed pr-8">
                    {msg.translatedText}
                  </div>

                  {/* Speaker replay button inside bubble */}
                  <button
                    onClick={() => onSpeak(msg.translatedText, msg.toLang)}
                    title="音声を再再生"
                    className="absolute right-3 bottom-3 p-1.5 rounded-lg bg-slate-950/40 border border-slate-800 text-slate-400 hover:text-slate-200 hover:scale-105 transition-all cursor-pointer"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
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
