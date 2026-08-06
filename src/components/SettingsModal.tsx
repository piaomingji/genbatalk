import React from 'react';
import { X, Settings, Volume2, Cpu, ShieldCheck } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  speechSpeed: number;
  setSpeechSpeed: (val: number) => void;
  voiceGender: 'male' | 'female';
  setVoiceGender: (val: 'male' | 'female') => void;
  autoPlayAudio: boolean;
  setAutoPlayAudio: (val: boolean) => void;
}

export default function SettingsModal({
  isOpen,
  onClose,
  speechSpeed,
  setSpeechSpeed,
  voiceGender,
  setVoiceGender,
  autoPlayAudio,
  setAutoPlayAudio,
}: SettingsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
          <div className="flex items-center gap-2 text-slate-100 font-bold text-lg">
            <Settings className="w-5 h-5 text-indigo-400" />
            <span>ゲンバトーク 設定</span>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          {/* API Info */}
          <div className="bg-slate-950/50 border border-slate-800/80 rounded-2xl p-4 flex items-start gap-3">
            <Cpu className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-bold text-slate-200">リアルタイム翻訳API</div>
              <div className="text-[11px] text-emerald-400 font-mono mt-0.5">gemini-3.5-live-translate-preview</div>
            </div>
          </div>

          {/* Auto Play Audio */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-bold text-slate-200 block">翻訳音声の自動再生 (インカム風)</label>
              <span className="text-xs text-slate-400 block max-w-[280px]">翻訳結果を受け取ったら、即座に大音量で読み上げます。</span>
            </div>
            <button
              onClick={() => setAutoPlayAudio(!autoPlayAudio)}
              className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-all duration-300 ${
                autoPlayAudio ? 'bg-emerald-500 justify-end' : 'bg-slate-700 justify-start'
              }`}
            >
              <div className="bg-white w-4 h-4 rounded-full shadow-md" />
            </button>
          </div>

          {/* Voice Gender Selection */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-200 block">通訳音声の性別</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setVoiceGender('female')}
                className={`py-2.5 px-4 rounded-xl border text-sm font-bold transition-all ${
                  voiceGender === 'female'
                    ? 'bg-emerald-500/10 border-emerald-500 text-emerald-300'
                    : 'bg-slate-800/40 border-slate-800 text-slate-400 hover:bg-slate-800'
                }`}
              >
                女性音声
              </button>
              <button
                onClick={() => setVoiceGender('male')}
                className={`py-2.5 px-4 rounded-xl border text-sm font-bold transition-all ${
                  voiceGender === 'male'
                    ? 'bg-emerald-500/10 border-emerald-500 text-emerald-300'
                    : 'bg-slate-800/40 border-slate-800 text-slate-400 hover:bg-slate-800'
                }`}
              >
                男性音声
              </button>
            </div>
          </div>

          {/* Speech Speed */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-bold text-slate-200">発話スピード</label>
              <span className="text-xs text-emerald-400 font-bold">{speechSpeed}x</span>
            </div>
            <input
              type="range"
              min="0.75"
              max="1.5"
              step="0.25"
              value={speechSpeed}
              onChange={(e) => setSpeechSpeed(parseFloat(e.target.value))}
              className="w-full accent-emerald-500 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl shadow-lg transition-all"
        >
          設定を保存
        </button>
      </div>
    </div>
  );
}
