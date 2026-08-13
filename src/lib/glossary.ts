// Shared workplace glossary used by every translation endpoint. This used to be copy-pasted
// into src/app/page.tsx, src/app/api/translate/route.ts, and src/app/api/translate-audio/route.ts
// independently, which let the three copies drift out of sync (mismatched/garbled entries in
// the Myanmar and Tagalog translations). Keeping a single source of truth here prevents that.

export interface GlossaryItem {
  ja: string;
  zh: string;
  vi: string;
  en: string;
  tl: string;
  id: string;
  ne: string;
  my: string;
}

export const SITE_GLOSSARY: GlossaryItem[] = [
  {
    ja: "ヘルメット",
    zh: "安全帽",
    vi: "mũ bảo hộ",
    en: "safety helmet",
    tl: "hard hat / safety helmet",
    id: "helm keselamatan",
    ne: "सेफ्टी हेल्मेट",
    my: "ဘေးကင်းရေးဦးထုပ်"
  },
  {
    ja: "安全帯",
    zh: "安全带",
    vi: "dây đai an toàn",
    en: "safety harness",
    tl: "safety harness / safety belt",
    id: "safety harness",
    ne: "सेफ्टी हार्नेस",
    my: "ဘေးကင်းရေးကြိုး"
  },
  {
    ja: "免許証",
    zh: "驾照 / 资格证",
    vi: "bằng lái xe / chứng chỉ vận hành",
    en: "driver's license / qualification certificate",
    tl: "lisensya / sertipiko ng kwalipikasyon",
    id: "SIM / sertifikat kualifikasi",
    ne: "लाइसेन्स / योग्यता प्रमाणपत्र",
    my: "လိုင်စင် / အရည်အချင်းစစ်လက်မှတ်"
  },
  {
    ja: "足元注意",
    zh: "注意脚下 / 小心脚下",
    vi: "chú ý dưới chân / cẩn thận dưới chân",
    en: "watch your step",
    tl: "mag-ingat sa hakbang / mag-ingat sa nilalakaran",
    id: "awas kaki / perhatikan langkah",
    ne: "पाइला होसियार",
    my: "ခြေလှမ်းသတိပြုပါ"
  },
  {
    ja: "頭上注意",
    zh: "注意头部 / 小心碰头",
    vi: "chú ý đầu / cẩn thận đầu",
    en: "watch your head",
    tl: "mag-ingat sa ulo",
    id: "awas kepala",
    ne: "टाउको होसियार",
    my: "ခေါင်းသတိပြုပါ"
  },
  {
    ja: "朝礼",
    zh: "晨会",
    vi: "họp giao ban sáng",
    en: "morning meeting / morning assembly",
    tl: "pulong sa umaga",
    id: "briefing pagi",
    ne: "बिहानको बैठक",
    my: "မနက်ခင်းအစည်းအဝေး"
  },
  {
    ja: "整理整頓",
    zh: "整理整顿",
    vi: "dọn dẹp ngăn nắp",
    en: "housekeeping / sorting and organizing",
    tl: "pag-aayos at paglilinis",
    id: "5S / kerapihan dan penataan",
    ne: "सरसफाई र व्यवस्थापन",
    my: "သန့်ရှင်းသပ်ရပ်မှုရှိစေရန် သိမ်းဆည်းခြင်း"
  },
  {
    ja: "高所作業",
    zh: "高空作业",
    vi: "làm việc trên cao",
    en: "work at heights",
    tl: "trabaho sa mataas na lugar",
    id: "pekerjaan di ketinggian",
    ne: "उच्च स्थानको काम",
    my: "အမြင့်ပိုင်းအလုပ်"
  },
  {
    ja: "火気厳禁",
    zh: "严禁烟火",
    vi: "cấm lửa",
    en: "no open flames",
    tl: "bawal magsindi ng apoy",
    id: "dilarang menyalakan api",
    ne: "आगो निषेध",
    my: "မီးမပြုလုပ်ရ"
  },
  {
    ja: "立入禁止",
    zh: "禁止进入 / 闲人免进",
    vi: "cấm vào / khu vực cấm vào",
    en: "keep out / no entry",
    tl: "bawal pumasok",
    id: "dilarang masuk",
    ne: "भित्र जान निषेध",
    my: "ဝင်ခွင့်မပြု"
  }
];

export function getGlossaryText(fromLang: string, toLang: string): string {
  const supported = ['ja', 'zh', 'vi', 'en', 'tl', 'id', 'ne', 'my'];
  const hasFrom = supported.includes(fromLang);
  const hasTo = supported.includes(toLang);
  if (!hasFrom && !hasTo) return '';

  const lines: string[] = [];
  for (const item of SITE_GLOSSARY) {
    const fromVal = item[fromLang as keyof GlossaryItem] || item.ja;
    const toVal = item[toLang as keyof GlossaryItem] || item.ja;
    if (fromVal && toVal && fromVal !== toVal) {
      lines.push(`- "${fromVal}" (${fromLang}) must be translated to "${toVal}" (${toLang})`);
    }
  }

  if (lines.length === 0) return '';
  return `\nWorkplace Glossary (You must prioritize these terms for translation):\n${lines.join('\n')}`;
}
