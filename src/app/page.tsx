'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Settings, RefreshCw, Volume2, Sparkles, Mic, MicOff, Info, UserCheck, Languages } from 'lucide-react';
import Timeline, { ChatMessage } from '@/components/Timeline';
import SettingsModal from '@/components/SettingsModal';
import AudioWave from '@/components/AudioWave';

const LANGUAGES = [
  { code: 'ja', label: '日本語 🇯🇵' },
  { code: 'vi', label: 'Tiếng Việt 🇻🇳' },
  { code: 'en', label: 'English 🇺🇸' },
  { code: 'ne', label: 'नेपाली 🇳🇵' },
  { code: 'id', label: 'Bahasa Indonesia 🇮🇩' },
  { code: 'tl', label: 'Tagalog 🇵🇭' },
  { code: 'zh', label: '中文 🇨🇳' },
  { code: 'ko', label: '한국어 🇰🇷' },
];

export default function Home() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Custom Settings
  const [speechSpeed, setSpeechSpeed] = useState(1.0);
  const [voiceGender, setVoiceGender] = useState<'male' | 'female'>('female');
  const [autoPlayAudio, setAutoPlayAudio] = useState(true);

  // Active Languages
  const [staffLang, setStaffLang] = useState('ja');
  const [workerLang, setWorkerLang] = useState('vi');

  // Speaker Roles & Listening Status
  const [activeSpeaker, setActiveSpeaker] = useState<'staff' | 'worker'>('staff');
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');

  // Conversation Timeline
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Speech Recognition Refs
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = false;
        rec.interimResults = true;
        
        rec.onstart = () => {
          console.log('GenbaTalk Recognition Started');
        };

        rec.onresult = async (event: any) => {
          const result = event.results[event.results.length - 1];
          const transcript = result[0].transcript;
          const isFinal = result.isFinal;

          setInterimTranscript(transcript);

          if (isFinal) {
            const from = activeSpeaker === 'staff' ? staffLang : workerLang;
            const to = activeSpeaker === 'staff' ? workerLang : staffLang;

            try {
              const res = await fetch('/api/translate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: transcript, fromLang: from, toLang: to }),
              });
              const data = await res.json();
              
              if (data.success) {
                const newMsg: ChatMessage = {
                  id: Math.random().toString(36).substring(7),
                  sender: activeSpeaker,
                  originalText: transcript,
                  translatedText: data.translatedText,
                  fromLang: from,
                  toLang: to,
                  timestamp: new Date(),
                };

                setMessages(prev => [...prev, newMsg]);
                setInterimTranscript('');
                setIsListening(false);

                if (autoPlayAudio) {
                  playSpeech(data.translatedText, to);
                }
              }
            } catch (err) {
              console.error('Translation error:', err);
              setIsListening(false);
            }
          }
        };

        rec.onerror = (e: any) => {
          console.error('Speech recognition error:', e);
          setIsListening(false);
        };

        rec.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = rec;
      }
    }
  }, [activeSpeaker, staffLang, workerLang, autoPlayAudio]);

  const handleStartListen = () => {
    if (recognitionRef.current) {
      const currentLang = activeSpeaker === 'staff' ? staffLang : workerLang;
      // Map simplified codes for browser Speech Recognition
      let browserLang = currentLang;
      if (currentLang === 'ja') browserLang = 'ja-JP';
      else if (currentLang === 'vi') browserLang = 'vi-VN';
      else if (currentLang === 'en') browserLang = 'en-US';
      else if (currentLang === 'ko') browserLang = 'ko-KR';
      else if (currentLang === 'zh') browserLang = 'zh-CN';

      recognitionRef.current.lang = browserLang;
      setInterimTranscript('');
      setIsListening(true);
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleStopListen = () => {
    setIsListening(false);
    try {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    } catch (e) {}
  };

  const playSpeech = (text: string, langCode: string) => {
    try {
      // Use high-quality Google Translation TTS URL for direct audio streaming
      // to ensure Vietnamese and other languages work perfectly on all platforms.
      const cleanText = text.replace(/\[Dịch\]\s*/g, '').replace(/\[Translate\]\s*/g, '').replace(/\[翻訳\]\s*/g, '');
      const utteranceText = encodeURIComponent(cleanText);
      const audioUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${langCode}&client=tw-ob&q=${utteranceText}`;
      
      const audio = new Audio(audioUrl);
      audio.playbackRate = speechSpeed;
      audio.play().catch(err => {
        console.warn('Audio play failed, falling back to SpeechSynthesis:', err);
        fallbackSpeechSynthesis(cleanText, langCode);
      });
    } catch (e) {
      fallbackSpeechSynthesis(text, langCode);
    }
  };

  const fallbackSpeechSynthesis = (text: string, langCode: string) => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      
      let browserLang = langCode;
      if (langCode === 'ja') browserLang = 'ja-JP';
      else if (langCode === 'vi') browserLang = 'vi-VN';
      else if (langCode === 'en') browserLang = 'en-US';
      else if (langCode === 'ko') browserLang = 'ko-KR';

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = browserLang;
      utterance.rate = speechSpeed;

      const voices = window.speechSynthesis.getVoices();
      const matchedVoice = voices.find(voice => {
        const name = voice.name.toLowerCase();
        const matchesLang = voice.lang.startsWith(langCode);
        if (voiceGender === 'female') {
          return matchesLang && (name.includes('female') || name.includes('google') || name.includes('natural') || name.includes('kyoko'));
        } else {
          return matchesLang && (name.includes('male') || name.includes('otoya') || name.includes('koutarou'));
        }
      });

      if (matchedVoice) {
        utterance.voice = matchedVoice;
      }
      
      window.speechSynthesis.speak(utterance);
    }
  };

  const clearHistory = () => {
    handleStopListen();
    setMessages([]);
    setInterimTranscript('');
  };

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-slate-950 text-slate-100 border-x border-slate-900 shadow-2xl relative">
      {/* Top Header */}
      <header className="h-16 shrink-0 flex items-center justify-between px-5 bg-slate-950/80 border-b border-slate-900/60 backdrop-blur-md z-20">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-wider text-slate-100">ゲンバトーク</h1>
            <p className="text-[10px] text-emerald-400 font-bold tracking-tight">現場向けAI音声インカム</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={clearHistory}
            title="会話履歴クリア"
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => setIsSettingsOpen(true)}
            title="設定"
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all cursor-pointer"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Language Selector Ribbon */}
      <div className="bg-slate-900/40 border-b border-slate-900/80 px-4 py-2 flex items-center justify-between text-xs z-10 shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-indigo-400">監督</span>
          <select 
            value={staffLang} 
            onChange={(e) => setStaffLang(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-md py-1 px-1.5 font-bold text-slate-300 outline-none"
          >
            {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
          </select>
        </div>
        <Languages className="w-4 h-4 text-slate-600" />
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-emerald-400">作業員</span>
          <select 
            value={workerLang} 
            onChange={(e) => setWorkerLang(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-md py-1 px-1.5 font-bold text-slate-300 outline-none"
          >
            {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
          </select>
        </div>
      </div>

      {/* Chat Conversation Timeline */}
      <Timeline messages={messages} onSpeak={playSpeech} />

      {/* Interim transcription card (shows text while talking) */}
      {interimTranscript && (
        <div className="absolute left-4 right-4 bottom-32 bg-slate-900/90 border border-slate-800 p-3.5 rounded-2xl shadow-xl z-20 backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider mb-1">
            {activeSpeaker === 'staff' ? '監督が発話中...' : '作業員が発話中...'}
          </div>
          <p className="text-sm font-bold text-slate-100 leading-relaxed italic">
            "{interimTranscript}"
          </p>
        </div>
      )}

      {/* Speech Control Dock */}
      <div className="bg-slate-950/90 border-t border-slate-900/60 p-4 shrink-0 space-y-4 backdrop-blur-md z-10">
        
        {/* Toggle active speaker roles */}
        <div className="grid grid-cols-2 gap-2 bg-slate-900 p-1 rounded-2xl border border-slate-800/80">
          <button
            onClick={() => {
              handleStopListen();
              setActiveSpeaker('staff');
            }}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeSpeaker === 'staff'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>監督 (日本人)</span>
          </button>
          <button
            onClick={() => {
              handleStopListen();
              setActiveSpeaker('worker');
            }}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeSpeaker === 'worker'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>作業員 (外国人)</span>
          </button>
        </div>

        {/* Big Mic Button Section */}
        <div className="flex items-center justify-between gap-4">
          <div className="w-16">
            {isListening && (
              <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest animate-pulse">
                Recording
              </span>
            )}
          </div>
          
          <button
            onClick={isListening ? handleStopListen : handleStartListen}
            className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl cursor-pointer ${
              isListening
                ? 'bg-red-500 text-white hover:bg-red-600 scale-105 shadow-red-500/20'
                : activeSpeaker === 'staff'
                  ? 'bg-indigo-600 text-white hover:bg-indigo-500 hover:scale-105 shadow-indigo-600/30'
                  : 'bg-emerald-600 text-white hover:bg-emerald-500 hover:scale-105 shadow-emerald-600/30'
            }`}
          >
            {isListening ? (
              <MicOff className="w-8 h-8 animate-pulse" />
            ) : (
              <Mic className="w-8 h-8" />
            )}
          </button>

          <div className="w-16 flex justify-end">
            {isListening && (
              <AudioWave isActive={true} colorClass={activeSpeaker === 'staff' ? 'bg-indigo-400' : 'bg-emerald-400'} />
            )}
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        speechSpeed={speechSpeed}
        setSpeechSpeed={setSpeechSpeed}
        voiceGender={voiceGender}
        setVoiceGender={setVoiceGender}
        autoPlayAudio={autoPlayAudio}
        setAutoPlayAudio={setAutoPlayAudio}
      />
    </div>
  );
}
