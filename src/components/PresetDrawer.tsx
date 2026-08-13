import React from 'react';
import { X, ShieldAlert, Construction, Sparkles, Volume2 } from 'lucide-react';

interface PresetItem {
  ja: string;
  en: string;
  vi: string;
}

interface PresetDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPreset: (text: string) => void;
  presets: PresetItem[];
}

const POLICE_PRESETS: PresetItem[] = [
  {
    ja: "止まりなさい！動くな！",
    en: "Stop! Don't move!",
    vi: "Dừng lại! Không được di chuyển!"
  },
  {
    ja: "パスポートか在留カードを見せてください。",
    en: "Please show me your passport or residence card.",
    vi: "Hãy cho tôi xem hộ chiếu hoặc thẻ lưu trú của bạn."
  },
  {
    ja: "ここに座ってください。",
    en: "Please sit down here.",
    vi: "Hãy ngồi xuống đây."
  },
  {
    ja: "何か武器や危険なものは持っていますか？",
    en: "Do you have any weapons or dangerous items?",
    vi: "Bạn có mang theo vũ khí hay vật gì nguy hiểm không?"
  },
  {
    ja: "警察署まで同行してください。",
    en: "Please come with us to the police station.",
    vi: "Hãy đi cùng chúng tôi về đồn cảnh sát."
  }
];

const SITE_PRESETS: PresetItem[] = [
  {
    ja: "危ない！避難してください！",
    en: "Danger! Please evacuate immediately!",
    vi: "Nguy hiểm! Hãy sơ tán ngay lập tức!"
  },
  {
    ja: "ヘルメットと安全帯を着用してください。",
    en: "Please wear your safety helmet and safety harness.",
    vi: "Hãy đội mũ bảo hiểm và đeo dây đai an toàn."
  },
  {
    ja: "作業を一時中止してください。",
    en: "Please temporarily stop your work.",
    vi: "Hãy tạm dừng công việc."
  },
  {
    ja: "体調は大丈夫ですか？無理しないでください。",
    en: "Are you feeling okay? Don't overdo it.",
    vi: "Sức khỏe của bạn vẫn tốt chứ? Đừng quá sức."
  },
  {
    ja: "本日の作業は終了です。片付けをしてください。",
    en: "Today's work is finished. Please tidy up.",
    vi: "Công việc hôm nay kết thúc rồi. Hãy dọn dẹp đi."
  }
];

export default function PresetDrawer({ isOpen, onClose, onSelectPreset, presets }: PresetDrawerProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-sm bg-slate-900 border-l border-slate-800 h-full flex flex-col p-6 shadow-2xl animate-in slide-in-from-right duration-300"
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            <span className="font-black text-slate-100">定型文クイック拡声</span>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Preset list content */}
        <div className="flex-1 overflow-y-auto space-y-6 pr-1 scrollbar-thin">
          
          {/* Section: Police & Security */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-red-400 uppercase tracking-wider">
              <ShieldAlert className="w-4 h-4" />
              <span>警察・治安維持向け</span>
            </div>
            
            <div className="space-y-2">
              {POLICE_PRESETS.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    onSelectPreset(item.ja);
                    onClose();
                  }}
                  className="w-full text-left p-3.5 rounded-2xl bg-slate-950/40 hover:bg-red-500/10 border border-slate-800 hover:border-red-500/30 transition-all group flex flex-col gap-1 cursor-pointer"
                >
                  <div className="text-xs font-black text-slate-200 group-hover:text-red-400 flex items-center justify-between">
                    <span>{item.ja}</span>
                    <Volume2 className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium">
                    {item.vi} ({item.en})
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Section: Construction & Factory */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-wider">
              <Construction className="w-4 h-4" />
              <span>現場・工場・建築向け</span>
            </div>
            
            <div className="space-y-2">
              {presets.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    onSelectPreset(item.ja);
                    onClose();
                  }}
                  className="w-full text-left p-3.5 rounded-2xl bg-slate-950/40 hover:bg-indigo-500/10 border border-slate-800 hover:border-indigo-500/30 transition-all group flex flex-col gap-1 cursor-pointer"
                >
                  <div className="text-xs font-black text-slate-200 group-hover:text-indigo-400 flex items-center justify-between">
                    <span>{item.ja}</span>
                    <Volume2 className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium">
                    {item.vi} ({item.en})
                  </div>
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
