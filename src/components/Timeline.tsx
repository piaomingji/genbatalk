import React, { useEffect, useRef } from 'react';
import { Volume2, Languages, ArrowRight } from 'lucide-react';
import { Strings } from '@/lib/i18n';
import { languageFlag, languageName } from '@/lib/languages';

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
  t: Strings;
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

export default function Timeline({ t, messages, onSpeak }: TimelineProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll to bottom on new messages
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    // min-h-0 is what lets this actually scroll. A flex child defaults to min-height:auto, so
    // without it the timeline grows to fit every message instead of shrinking, and the controls
    // below get pushed off the bottom of the screen once a conversation runs long.
    <div className="flex-1 min-h-0 overflow-y-auto px-4 py-6 space-y-6 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
      {messages.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-emerald-500/10 ring-1 ring-white/10 flex items-center justify-center text-slate-400">
            <Languages className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-400">{t.emptyTitle}</h3>
            <p className="text-xs text-slate-600 mt-1 max-w-[260px] mx-auto leading-relaxed">
              {t.emptyBody}
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
              {/* Avatar: the speaker's own flag. The initials that used to sit here ("監" for
                  supervisor, "作" for worker) named roles this app no longer assumes, and only made
                  sense to a Japanese reader. A flag needs no translation. */}
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 text-lg leading-none shadow-lg relative ring-1 ${
                  isStaff
                    ? 'bg-indigo-500/10 ring-indigo-500/30 shadow-indigo-950/40'
                    : 'bg-emerald-500/10 ring-emerald-500/30 shadow-emerald-950/40'
                }`}
              >
                <span aria-hidden>{languageFlag(msg.fromLang)}</span>
              </div>

              <div className="space-y-1.5 min-w-0">
                {/* Direction, shown once and quietly. */}
                <div
                  className={`flex items-center gap-1.5 text-[10px] text-slate-500 font-bold ${
                    isStaff ? 'justify-start' : 'justify-end'
                  }`}
                >
                  <span>{languageName(msg.fromLang)}</span>
                  <ArrowRight className="w-3 h-3 text-slate-600" />
                  <span>{languageName(msg.toLang)}</span>
                </div>

                <div
                  className={`px-4 py-3.5 rounded-3xl border backdrop-blur-xl shadow-lg transition-colors ${
                    isStaff
                      ? 'bg-slate-900/70 border-slate-800/80 rounded-tl-md'
                      : 'bg-emerald-950/20 border-emerald-500/20 rounded-tr-md'
                  }`}
                >
                  {/* The translation is what the other person needs, so it leads. */}
                  <div
                    className="text-[15px] font-bold text-slate-50 tracking-wide break-words leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: sanitizeTranslatedHtml(msg.translatedText) }}
                  />

                  {/* What was actually said, kept available but out of the way. */}
                  <div className="mt-2.5 pt-2.5 border-t border-white/5 flex items-end justify-between gap-3">
                    <p className="text-[11px] text-slate-500 font-medium break-words leading-relaxed min-w-0">
                      {msg.originalText}
                    </p>
                    <button
                      onClick={() => onSpeak(msg.translatedText, msg.toLang)}
                      title={t.replay}
                      aria-label={t.replay}
                      className={`p-1.5 rounded-lg shrink-0 transition-all hover:scale-110 active:scale-95 cursor-pointer ${
                        isStaff
                          ? 'text-slate-500 hover:text-indigo-300 hover:bg-indigo-500/10'
                          : 'text-slate-500 hover:text-emerald-300 hover:bg-emerald-500/10'
                      }`}
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>
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
