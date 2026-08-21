/**
 * Interface text, picked from the browser's language.
 *
 * The app used to be written for Japanese supervisors talking to foreign workers, so every label
 * was Japanese and the two sides were named by their roles. Now that either side can be any
 * language, roles are gone: each side is identified by the language it speaks, which needs no
 * translation and no assumption about who the two people are to each other.
 */

export type UiLang = 'en' | 'ja';

const STRINGS = {
  en: {
    sideA: 'Side A',
    sideB: 'Side B',
    speakIn: (lang: string) => `Speak ${lang}`,
    speakNow: 'Go ahead',
    speaking: 'Speaking',
    connecting: 'Connecting...',
    listening: 'Listening...',
    translating: 'Translating...',
    reconnecting: 'Reconnecting...',
    emptyTitle: 'No conversation yet',
    emptyBody: 'Tap the language you are about to speak, then just talk.',
    settings: 'Settings',
    autoPlay: 'Read translations aloud',
    autoPlayHint: 'Plays the translation through the speaker automatically',
    furigana: 'Furigana for Japanese',
    furiganaHint: 'Shows kana readings above kanji',
    speed: 'Speaking speed',
    save: 'Save',
    support: 'Report a problem',
    clearHistory: 'Clear conversation',
    micDenied:
      'Microphone access is blocked. Allow the microphone from the lock icon in your browser address bar.',
    close: 'Close',
    noResponse: 'No response. Please try again.',
    connectFailed: 'Could not start the microphone or connect.',
    micInterrupted: 'The microphone was interrupted. Tap a language button to start again.',
    langAsk: (lang: string) => `Did you speak ${lang}?`,
    langYes: 'Yes, switch',
    langNo: 'No',
    retranslateFailed: 'Could not redo that translation. The language has still been switched.',
    limitReached: "You've used up this month's free translation time.",
    limitReachedSignIn: "You've used up this month's free time. Sign in to get 30 minutes a month.",
    signInPerk: 'Sign in for 30 min/month',
    plan: 'Plan',
    minutesLeft: (left: number, total: number) => `${left} of ${total} minutes left this month`,
    managePlan: 'Manage plan',
    upgrade: 'See plans',
    replay: 'Play again',
    signIn: 'Sign in',
    signOut: 'Sign out',
  },
  ja: {
    sideA: 'A',
    sideB: 'B',
    speakIn: (lang: string) => `${lang}で話す`,
    speakNow: 'どうぞ',
    speaking: '発話中',
    connecting: '接続しています...',
    listening: '聞き取り中...',
    translating: '翻訳しています...',
    reconnecting: '再接続しています...',
    emptyTitle: '会話はまだありません',
    emptyBody: 'これから話す言語を選んで、そのまま話してください。',
    settings: '設定',
    autoPlay: '翻訳を音声で読み上げる',
    autoPlayHint: '翻訳をスピーカーから自動で再生します',
    furigana: '日本語にふりがなを表示',
    furiganaHint: '漢字の上にかなを表示します',
    speed: '読み上げの速さ',
    save: '保存',
    support: '不具合を報告',
    clearHistory: '会話を消す',
    micDenied:
      'マイクへのアクセスが拒否されています。ブラウザのアドレスバーの鍵マークから許可してください。',
    close: '閉じる',
    noResponse: '応答がありませんでした。もう一度お試しください。',
    connectFailed: 'マイクの初期化、または接続に失敗しました。',
    micInterrupted: 'マイクが中断されました。もう一度ボタンを押してください。',
    langAsk: (lang: string) => `${lang}で話しましたか?`,
    langYes: 'はい、切り替える',
    langNo: 'いいえ',
    retranslateFailed: '訳し直しに失敗しました。言語の切り替えは反映されています。',
    limitReached: '今月の無料利用分を使い切りました。',
    limitReachedSignIn: '今月の無料分を使い切りました。ログインすると月30分になります。',
    signInPerk: 'ログインで月30分',
    plan: 'プラン',
    minutesLeft: (left: number, total: number) => `今月の残り ${left} 分 / ${total} 分`,
    managePlan: 'プランを管理',
    upgrade: 'プランを見る',
    replay: 'もう一度再生',
    signIn: 'ログイン',
    signOut: 'ログアウト',
  },
};

export type Strings = (typeof STRINGS)['en'];

/** Reads the browser's preferred language; falls back to English for anything unsupported. */
export function detectUiLang(): UiLang {
  if (typeof navigator === 'undefined') return 'en';
  const tags = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const tag of tags) {
    if (!tag) continue;
    if (tag.toLowerCase().startsWith('ja')) return 'ja';
    if (tag.toLowerCase().startsWith('en')) return 'en';
  }
  return 'en';
}

export function getStrings(lang: UiLang): Strings {
  return STRINGS[lang];
}
