import React from 'react';
import { X, Settings, Volume2, Cpu, ShieldCheck, Sparkles } from 'lucide-react';
import Link from 'next/link';

import { CustomGlossaryItem, PresetItem } from '@/app/page';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  speechSpeed: number;
  setSpeechSpeed: (val: number) => void;
  voiceGender: 'male' | 'female';
  setVoiceGender: (val: 'male' | 'female') => void;
  autoPlayAudio: boolean;
  setAutoPlayAudio: (val: boolean) => void;
  useRuby: boolean;
  setUseRuby: (val: boolean) => void;
  customGlossary: CustomGlossaryItem[];
  setCustomGlossary: React.Dispatch<React.SetStateAction<CustomGlossaryItem[]>>;
  presets: PresetItem[];
  setPresets: React.Dispatch<React.SetStateAction<PresetItem[]>>;
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
  useRuby,
  setUseRuby,
  customGlossary,
  setCustomGlossary,
  presets,
  setPresets,
}: SettingsModalProps) {
  const [newJa, setNewJa] = React.useState('');
  const [newTranslation, setNewTranslation] = React.useState('');
  const [newLang, setNewLang] = React.useState('zh');
  const [glossaryMode, setGlossaryMode] = React.useState<'manual' | 'ai'>('manual');
  const [aiText, setAiText] = React.useState('');
  const [aiLang, setAiLang] = React.useState('zh');
  const [isExtracting, setIsExtracting] = React.useState(false);

  const [newPresetJa, setNewPresetJa] = React.useState('');
  const [newPresetEn, setNewPresetEn] = React.useState('');
  const [newPresetVi, setNewPresetVi] = React.useState('');

  if (!isOpen) return null;

  const handleAddPreset = () => {
    if (!newPresetJa.trim() || !newPresetEn.trim() || !newPresetVi.trim()) return;
    const newItem: PresetItem = {
      id: Math.random().toString(36).substring(7),
      ja: newPresetJa.trim(),
      en: newPresetEn.trim(),
      vi: newPresetVi.trim(),
    };
    setPresets(prev => [...prev, newItem]);
    setNewPresetJa('');
    setNewPresetEn('');
    setNewPresetVi('');
  };

  const handleDeletePreset = (id: string) => {
    setPresets(prev => prev.filter(item => item.id !== id));
  };

  const handleAddTerm = () => {
    if (!newJa.trim() || !newTranslation.trim()) return;
    const newItem: CustomGlossaryItem = {
      id: Math.random().toString(36).substring(7),
      ja: newJa.trim(),
      translation: newTranslation.trim(),
      lang: newLang,
    };
    setCustomGlossary(prev => [...prev, newItem]);
    setNewJa('');
    setNewTranslation('');
  };

  const handleDeleteTerm = (id: string) => {
    setCustomGlossary(prev => prev.filter(item => item.id !== id));
  };

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r?\n/);
      const newItems: CustomGlossaryItem[] = [];

      for (const line of lines) {
        if (!line.trim()) continue;
        const columns = line.split(',');
        if (columns.length < 3) continue;

        const ja = columns[0].trim();
        const translation = columns[1].trim();
        const lang = columns[2].trim().toLowerCase();

        if (ja.includes('日本語') || ja.toLowerCase().includes('original') || ja.toLowerCase().includes('japanese')) {
          continue;
        }

        if (ja && translation && lang) {
          newItems.push({
            id: Math.random().toString(36).substring(7),
            ja,
            translation,
            lang,
          });
        }
      }

      if (newItems.length > 0) {
        setCustomGlossary(prev => [...prev, ...newItems]);
      }
    };
    reader.readAsText(file);
  };

  const handleAIExtract = async () => {
    if (!aiText.trim()) return;
    setIsExtracting(true);
    try {
      const res = await fetch('/api/extract-terms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: aiText, targetLang: aiLang }),
      });
      const data = await res.json();
      if (data.success && data.terms) {
        const newItems: CustomGlossaryItem[] = data.terms.map((item: any) => ({
          id: Math.random().toString(36).substring(7),
          ja: item.ja,
          translation: item.translation,
          lang: item.lang,
        }));
        setCustomGlossary(prev => [...prev, ...newItems]);
        setAiText('');
      } else {
        alert('AI抽出に失敗しました。');
      }
    } catch (e) {
      console.error(e);
      alert('通信エラーが発生しました。');
    } finally {
      setIsExtracting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl animate-in fade-in zoom-in duration-200 flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4 shrink-0">
          <div className="flex items-center gap-2 text-slate-100 font-bold text-lg">
            <Settings className="w-5 h-5 text-indigo-400" />
            <span>ゲンバトーク 設定</span>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-all p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pro Plan Promotion Card */}
        <div className="bg-gradient-to-r from-emerald-500/10 to-indigo-500/10 border border-emerald-500/30 rounded-2xl p-3.5 mb-4 flex items-center justify-between gap-4 shrink-0 select-none">
          <div className="space-y-0.5">
            <div className="text-xs font-black text-emerald-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Proプランで機能制限を解除</span>
            </div>
            <p className="text-[10px] text-slate-400 leading-normal">
              無制限の自動通訳、リアルタイム同期、資料からの辞書自動抽出などが可能になります。
            </p>
          </div>
          <Link
            href="/pricing"
            onClick={onClose}
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black px-3.5 py-2 rounded-xl transition-all shrink-0 shadow-md shadow-emerald-600/10 hover:scale-[1.02] cursor-pointer"
          >
            プランを見る
          </Link>
        </div>

        {/* Scrollable Content Container */}
        <div className="flex-1 overflow-y-auto space-y-6 pr-1 scrollbar-thin">
          {/* Autoplay Audio toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <label className="text-sm font-bold text-slate-200">通訳音声の自動再生（インカム風）</label>
              <p className="text-xs text-slate-400 leading-normal">
                翻訳された音声を自動でスピーカーから再生します
              </p>
            </div>
            <button
              onClick={() => setAutoPlayAudio(!autoPlayAudio)}
              className={`w-11 h-6 rounded-full transition-all duration-300 relative ${
                autoPlayAudio ? 'bg-emerald-500' : 'bg-slate-800'
              }`}
            >
              <div
                className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all duration-300 ${
                  autoPlayAudio ? 'left-6' : 'left-1'
                }`}
              />
            </button>
          </div>

          {/* Use Ruby text toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <label className="text-sm font-bold text-slate-200">ふりがな（ルビ）表示</label>
              <p className="text-xs text-slate-400 leading-normal">
                日本語の漢字の上にひらがなのルビを表示します
              </p>
            </div>
            <button
              onClick={() => setUseRuby(!useRuby)}
              className={`w-11 h-6 rounded-full transition-all duration-300 relative ${
                useRuby ? 'bg-emerald-500' : 'bg-slate-800'
              }`}
            >
              <div
                className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all duration-300 ${
                  useRuby ? 'left-6' : 'left-1'
                }`}
              />
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
            {voiceGender === 'male' && (
              <p className="text-[10px] text-slate-400 leading-normal mt-1.5">
                ※男性音声は端末の内蔵音声を使用します。女性音声が流れる場合は、お使いの端末（Mac/iOS等）の「システム設定 ＞ アクセシビリティ ＞ 読み上げコンテンツ ＞ システムの声」にて該当言語の男性音声（日本語のOtoya、韓国語のMinsuなど）が追加・ダウンロードされているかご確認ください。
              </p>
            )}
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

          {/* Preset Customizer Section */}
          <div className="border-t border-slate-800 pt-5 space-y-4">
            <div className="space-y-0.5">
              <label className="text-sm font-bold text-slate-200 block">定型文（プリセット）の編集</label>
              <p className="text-[11px] text-slate-400 leading-normal">
                定型警告ボタンに表示される対訳文を登録・管理します
              </p>
            </div>
            
            {/* Input Form */}
            <div className="space-y-2 bg-slate-950/20 p-3 rounded-2xl border border-slate-800/60">
              <input
                type="text"
                placeholder="日本語 (例: 近づかないで！)"
                value={newPresetJa}
                onChange={(e) => setNewPresetJa(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50 mb-1"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="英語 (例: Stay back!)"
                  value={newPresetEn}
                  onChange={(e) => setNewPresetEn(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50"
                />
                <input
                  type="text"
                  placeholder="ベトナム語 (例: Tránh ra!)"
                  value={newPresetVi}
                  onChange={(e) => setNewPresetVi(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50"
                />
              </div>
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={handleAddPreset}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all"
                >
                  定型文を追加
                </button>
              </div>
            </div>

            {/* List of custom presets */}
            {presets.length > 0 && (
              <div className="max-h-36 overflow-y-auto border border-slate-800/80 rounded-2xl bg-slate-950/40 p-2 space-y-1.5 scrollbar-thin">
                {presets.map((item) => (
                  <div key={item.id} className="flex items-start justify-between bg-slate-900/60 px-3 py-2 rounded-xl border border-slate-800/50 text-xs gap-2">
                    <div className="text-slate-300 space-y-0.5">
                      <div className="font-bold text-slate-100">{item.ja}</div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        EN: {item.en} | VI: {item.vi}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeletePreset(item.id)}
                      className="text-red-400 hover:text-red-300 font-bold px-1 shrink-0 mt-0.5"
                    >
                      削除
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Custom Glossary Section */}
          <div className="border-t border-slate-800 pt-5 space-y-4">
            <div className="space-y-0.5">
              <label className="text-sm font-bold text-slate-200 block">自社専用の用語登録 (Custom Glossary)</label>
              <p className="text-[11px] text-slate-400 leading-normal">
                登録した言葉は最優先で指定の訳語に翻訳されます
              </p>
            </div>

            {/* Segmented Control Mode Tabs */}
            <div className="grid grid-cols-2 p-1 bg-slate-950/60 border border-slate-800/80 rounded-2xl shrink-0">
              <button
                type="button"
                onClick={() => setGlossaryMode('manual')}
                className={`py-1.5 text-xs font-bold rounded-xl transition-all ${
                  glossaryMode === 'manual'
                    ? 'bg-slate-800 text-slate-100 shadow-md'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                手動・CSV登録
              </button>
              <button
                type="button"
                onClick={() => setGlossaryMode('ai')}
                className={`py-1.5 text-xs font-bold rounded-xl transition-all ${
                  glossaryMode === 'ai'
                    ? 'bg-slate-800 text-slate-100 shadow-md'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                資料からAI抽出
              </button>
            </div>
            
            {glossaryMode === 'manual' ? (
              /* Manual Input Form & CSV Upload */
              <div className="space-y-3">
                <div className="space-y-2 bg-slate-950/20 p-3 rounded-2xl border border-slate-800/60">
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="日本語 (例: ヘルメット)"
                      value={newJa}
                      onChange={(e) => setNewJa(e.target.value)}
                      className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50"
                    />
                    <input
                      type="text"
                      placeholder="翻訳後 (例: 安全帽)"
                      value={newTranslation}
                      onChange={(e) => setNewTranslation(e.target.value)}
                      className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50"
                    />
                  </div>
                  <div className="flex gap-2">
                    <select
                      value={newLang}
                      onChange={(e) => setNewLang(e.target.value)}
                      className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500/50"
                    >
                      <option value="zh">中国語 (zh)</option>
                      <option value="vi">ベトナム語 (vi)</option>
                      <option value="en">英語 (en)</option>
                      <option value="ko">韓国語 (ko)</option>
                      <option value="tl">タガログ語 (tl)</option>
                      <option value="id">インドネシア語 (id)</option>
                      <option value="ne">ネパール語 (ne)</option>
                      <option value="my">ミャンマー語 (my)</option>
                      <option value="pt">ポルトガル語 (pt)</option>
                      <option value="es">スペイン語 (es)</option>
                      <option value="th">タイ語 (th)</option>
                      <option value="ru">ロシア語 (ru)</option>
                      <option value="fr">フランス語 (fr)</option>
                      <option value="si">シンハラ語 (si)</option>
                      <option value="km">クメール語 (km)</option>
                      <option value="ur">ウルドゥー語 (ur)</option>
                    </select>
                    <button
                      type="button"
                      onClick={handleAddTerm}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all"
                    >
                      追加
                    </button>
                  </div>
                </div>

                {/* CSV File Upload Section */}
                <div className="flex items-center justify-between bg-slate-950/20 p-3 rounded-2xl border border-slate-800/60 text-xs">
                  <div className="text-slate-400">
                    <span className="font-bold text-slate-300 block">CSVファイルから一括登録</span>
                    形式: 日本語,翻訳語,言語コード
                  </div>
                  <label className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold px-3 py-2 rounded-xl cursor-pointer transition-all border border-slate-700 select-none">
                    ファイルを選択
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleCSVUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            ) : (
              /* AI Extraction Form */
              <div className="space-y-2 bg-slate-950/20 p-3 rounded-2xl border border-slate-800/60">
                <textarea
                  placeholder="会社マニュアル、取扱説明書、連絡事項などの資料テキストをここに貼り付けてください..."
                  value={aiText}
                  onChange={(e) => setAiText(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50 resize-none"
                />
                <div className="flex gap-2 items-center">
                  <span className="text-xs text-slate-400 shrink-0">翻訳先:</span>
                  <select
                    value={aiLang}
                    onChange={(e) => setAiLang(e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500/50"
                  >
                    <option value="zh">中国語 (zh)</option>
                    <option value="vi">ベトナム語 (vi)</option>
                    <option value="en">英語 (en)</option>
                    <option value="ko">韓国語 (ko)</option>
                    <option value="tl">タガログ語 (tl)</option>
                    <option value="id">インドネシア語 (id)</option>
                    <option value="ne">ネパール語 (ne)</option>
                    <option value="my">ミャンマー語 (my)</option>
                    <option value="pt">ポルトガル語 (pt)</option>
                    <option value="es">スペイン語 (es)</option>
                    <option value="th">タイ語 (th)</option>
                    <option value="ru">ロシア語 (ru)</option>
                    <option value="fr">フランス語 (fr)</option>
                    <option value="si">シンハラ語 (si)</option>
                    <option value="km">クメール語 (km)</option>
                    <option value="ur">ウルドゥー語 (ur)</option>
                  </select>
                  <button
                    type="button"
                    disabled={isExtracting || !aiText.trim()}
                    onClick={handleAIExtract}
                    className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shrink-0 flex items-center gap-1.5"
                  >
                    {isExtracting ? (
                      <span className="animate-pulse">解析中...</span>
                    ) : (
                      'AIで用語抽出'
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* List of custom glossary items */}
            {customGlossary.length > 0 && (
              <div className="max-h-36 overflow-y-auto border border-slate-800/80 rounded-2xl bg-slate-950/40 p-2 space-y-1.5 scrollbar-thin">
                {customGlossary.map((item) => (
                  <div key={item.id} className="flex items-center justify-between bg-slate-900/60 px-3 py-1.5 rounded-xl border border-slate-800/50 text-xs">
                    <div className="text-slate-300">
                      <span className="font-bold text-slate-100">{item.ja}</span>
                      <span className="mx-1.5 text-slate-500">→</span>
                      <span className="text-emerald-400 font-bold">{item.translation}</span>
                      <span className="ml-1.5 text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded-md font-mono">{item.lang.toUpperCase()}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteTerm(item.id)}
                      className="text-red-400 hover:text-red-300 font-bold px-1"
                    >
                      削除
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-800 shrink-0 space-y-3">
          <div className="text-center">
            <Link
              href="/contact"
              onClick={onClose}
              className="text-[10px] text-slate-500 hover:text-slate-300 font-bold underline select-none"
            >
              不具合報告・サポート窓口はこちら
            </Link>
          </div>
          <button
            onClick={onClose}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl shadow-lg transition-all cursor-pointer"
          >
            設定を保存
          </button>
        </div>
      </div>
    </div>
  );
}
