/**
 * Every language the translation model supports, in one place.
 *
 * Previously the app kept three separate lists -- the picker, the flags shown on each message, and
 * the codes handed to speech synthesis -- which drifted apart as soon as anything was added. They
 * are all derived from this single table now.
 *
 * `code` is the BCP-47 tag the translation model expects, so it is passed through untouched. That
 * matters for the pairs it distinguishes and a 2-letter code cannot: zh-Hans vs zh-Hant, pt-BR vs
 * pt-PT.
 *
 * `name` is each language written in itself, since the person choosing it is usually the one who
 * speaks it. Flags are a rough visual aid, not a claim about where a language belongs -- many are
 * spoken across dozens of countries, and a few (Arabic, Swahili, Kurdish) get a globe rather than
 * any one nation's flag.
 */
export interface Language {
  code: string;
  name: string;
  flag: string;
  /** Locale for the browser's speech synthesis, when it differs from `code`. */
  speech?: string;
}

/** Languages people are most likely to reach for, kept at the top of the list. */
const COMMON: Language[] = [
  { code: 'en', name: 'English', flag: '🇺🇸', speech: 'en-US' },
  { code: 'ja', name: '日本語', flag: '🇯🇵', speech: 'ja-JP' },
  { code: 'zh-Hans', name: '中文（简体）', flag: '🇨🇳', speech: 'zh-CN' },
  { code: 'zh-Hant', name: '中文（繁體）', flag: '🇹🇼', speech: 'zh-TW' },
  { code: 'ko', name: '한국어', flag: '🇰🇷', speech: 'ko-KR' },
  { code: 'es', name: 'Español', flag: '🇪🇸', speech: 'es-ES' },
  { code: 'pt-BR', name: 'Português (Brasil)', flag: '🇧🇷', speech: 'pt-BR' },
  { code: 'fr', name: 'Français', flag: '🇫🇷', speech: 'fr-FR' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪', speech: 'de-DE' },
  { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳', speech: 'vi-VN' },
  { code: 'id', name: 'Bahasa Indonesia', flag: '🇮🇩', speech: 'id-ID' },
  { code: 'hi', name: 'हिन्दी', flag: '🇮🇳', speech: 'hi-IN' },
  { code: 'ar', name: 'العربية', flag: '🌐', speech: 'ar-SA' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺', speech: 'ru-RU' },
  { code: 'th', name: 'ไทย', flag: '🇹🇭', speech: 'th-TH' },
  { code: 'fil', name: 'Filipino', flag: '🇵🇭', speech: 'fil-PH' },
];

/** Everything else, alphabetical by English name. */
const REST: Language[] = [
  { code: 'af', name: 'Afrikaans', flag: '🇿🇦' },
  { code: 'ak', name: 'Akan', flag: '🇬🇭' },
  { code: 'sq', name: 'Shqip', flag: '🇦🇱' },
  { code: 'am', name: 'አማርኛ', flag: '🇪🇹' },
  { code: 'hy', name: 'Հայերեն', flag: '🇦🇲' },
  { code: 'az', name: 'Azərbaycan', flag: '🇦🇿' },
  { code: 'eu', name: 'Euskara', flag: '🌐' },
  { code: 'be', name: 'Беларуская', flag: '🇧🇾' },
  { code: 'bn', name: 'বাংলা', flag: '🇧🇩' },
  { code: 'bg', name: 'Български', flag: '🇧🇬' },
  { code: 'my', name: 'မြန်မာ', flag: '🇲🇲' },
  { code: 'ca', name: 'Català', flag: '🌐' },
  { code: 'hr', name: 'Hrvatski', flag: '🇭🇷' },
  { code: 'cs', name: 'Čeština', flag: '🇨🇿' },
  { code: 'da', name: 'Dansk', flag: '🇩🇰' },
  { code: 'nl', name: 'Nederlands', flag: '🇳🇱' },
  { code: 'et', name: 'Eesti', flag: '🇪🇪' },
  { code: 'fi', name: 'Suomi', flag: '🇫🇮' },
  { code: 'gl', name: 'Galego', flag: '🌐' },
  { code: 'ka', name: 'ქართული', flag: '🇬🇪' },
  { code: 'el', name: 'Ελληνικά', flag: '🇬🇷' },
  { code: 'gu', name: 'ગુજરાતી', flag: '🇮🇳' },
  { code: 'ha', name: 'Hausa', flag: '🇳🇬' },
  { code: 'he', name: 'עברית', flag: '🇮🇱' },
  { code: 'hu', name: 'Magyar', flag: '🇭🇺' },
  { code: 'is', name: 'Íslenska', flag: '🇮🇸' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'jv', name: 'Basa Jawa', flag: '🇮🇩' },
  { code: 'kn', name: 'ಕನ್ನಡ', flag: '🇮🇳' },
  { code: 'kk', name: 'Қазақша', flag: '🇰🇿' },
  { code: 'km', name: 'ភាសាខ្មែរ', flag: '🇰🇭' },
  { code: 'rw', name: 'Kinyarwanda', flag: '🇷🇼' },
  { code: 'lo', name: 'ລາວ', flag: '🇱🇦' },
  { code: 'lv', name: 'Latviešu', flag: '🇱🇻' },
  { code: 'lt', name: 'Lietuvių', flag: '🇱🇹' },
  { code: 'mk', name: 'Македонски', flag: '🇲🇰' },
  { code: 'ms', name: 'Bahasa Melayu', flag: '🇲🇾' },
  { code: 'ml', name: 'മലയാളം', flag: '🇮🇳' },
  { code: 'mr', name: 'मराठी', flag: '🇮🇳' },
  { code: 'mn', name: 'Монгол', flag: '🇲🇳' },
  { code: 'ne', name: 'नेपाली', flag: '🇳🇵' },
  { code: 'no', name: 'Norsk', flag: '🇳🇴', speech: 'nb-NO' },
  { code: 'fa', name: 'فارسی', flag: '🇮🇷' },
  { code: 'pl', name: 'Polski', flag: '🇵🇱' },
  { code: 'pt-PT', name: 'Português (Portugal)', flag: '🇵🇹', speech: 'pt-PT' },
  { code: 'pa', name: 'ਪੰਜਾਬੀ', flag: '🇮🇳' },
  { code: 'ro', name: 'Română', flag: '🇷🇴' },
  { code: 'sr', name: 'Српски', flag: '🇷🇸' },
  { code: 'sd', name: 'سنڌي', flag: '🇵🇰' },
  { code: 'si', name: 'සිංහල', flag: '🇱🇰' },
  { code: 'sk', name: 'Slovenčina', flag: '🇸🇰' },
  { code: 'sl', name: 'Slovenščina', flag: '🇸🇮' },
  { code: 'su', name: 'Basa Sunda', flag: '🇮🇩' },
  { code: 'sw', name: 'Kiswahili', flag: '🌐' },
  { code: 'sv', name: 'Svenska', flag: '🇸🇪' },
  { code: 'ta', name: 'தமிழ்', flag: '🇮🇳' },
  { code: 'te', name: 'తెలుగు', flag: '🇮🇳' },
  { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
  { code: 'uk', name: 'Українська', flag: '🇺🇦' },
  { code: 'ur', name: 'اردو', flag: '🇵🇰' },
  { code: 'uz', name: 'Oʻzbekcha', flag: '🇺🇿' },
  { code: 'zu', name: 'isiZulu', flag: '🇿🇦' },
];

export const LANGUAGES: Language[] = [...COMMON, ...REST];

const BY_CODE = new Map(LANGUAGES.map(l => [l.code.toLowerCase(), l]));

export function findLanguage(code: string): Language | undefined {
  if (!code) return undefined;
  const exact = BY_CODE.get(code.toLowerCase());
  if (exact) return exact;
  // Fall back to the base tag, so "zh-CN" finds Simplified Chinese and "en-GB" finds English.
  const base = code.toLowerCase().split('-')[0];
  return LANGUAGES.find(l => l.code.toLowerCase().split('-')[0] === base);
}

export function languageName(code: string): string {
  return findLanguage(code)?.name ?? code.toUpperCase();
}

export function languageFlag(code: string): string {
  return findLanguage(code)?.flag ?? '🌐';
}

/** The locale to hand the browser's speech synthesis. */
export function speechLocale(code: string): string {
  const lang = findLanguage(code);
  return lang?.speech ?? lang?.code ?? code;
}

/**
 * Maps a code the model reported back onto one of ours.
 *
 * The model may answer with a fuller tag than we asked for ("ja-JP" for "ja"), so this resolves to
 * whichever entry in the table it belongs to, or nothing if we do not offer it.
 */
export function normalizeLanguage(tag: string): string | undefined {
  return findLanguage(tag)?.code;
}
