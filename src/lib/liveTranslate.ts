/**
 * One-way live interpreter built on Gemini's purpose-built Live Translation model.
 *
 * The direction is fixed before the connection is opened: the caller says who is about to speak,
 * and the session is created with that person's listener as the target language. Nothing about the
 * direction is inferred at runtime.
 *
 * This replaces an earlier design that ran two sessions over the same microphone at once (one per
 * direction) and tried to work out afterwards which of them had really done the interpreting. Both
 * sessions answer every utterance -- the wrong-direction one echoes the speech back, transcribes it
 * in a mixture of both scripts, and reports its own target as the language it heard -- so every rule
 * for picking a winner (reported language code, script inspection, input/output divergence) worked
 * on recorded examples and then drifted in real conversations, with the whole exchange eventually
 * collapsing into a single language. Deciding up front removes that entire class of failure.
 *
 * The model streams continuously rather than in turns, so utterances are grouped here by a short
 * quiet period (see FLUSH_DELAY_MS).
 */

const MODEL = 'models/gemini-3.5-live-translate-preview';

// Ephemeral tokens with Live Translation are documented as requiring v1beta, but the constrained
// (token-authenticated) variant of the endpoint is not published under every API version. Try them
// in order and keep whichever accepts the connection.
const WS_ENDPOINTS = [
  'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained',
  'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained',
];

/**
 * Where the transcription and translation settings belong in the setup message.
 *
 * The published example nests them all under `generationConfig`, but the server rejects that with
 * `Unknown name "inputAudioTranscription" at 'setup.generation_config'`. The first shape below is
 * the one this endpoint actually accepts; the others remain as fallbacks in case that changes.
 */
type SetupShape = (model: string, targetLang: string) => Record<string, unknown>;

const SETUP_SHAPES: { name: string; build: SetupShape }[] = [
  {
    name: 'transcription top-level, translationConfig in generationConfig',
    build: (model, targetLang) => ({
      model,
      generationConfig: {
        responseModalities: ['AUDIO'],
        translationConfig: { targetLanguageCode: toBcp47(targetLang), echoTargetLanguage: true },
      },
      inputAudioTranscription: {},
      outputAudioTranscription: {},
    }),
  },
  {
    name: 'everything top-level',
    build: (model, targetLang) => ({
      model,
      generationConfig: { responseModalities: ['AUDIO'] },
      translationConfig: { targetLanguageCode: toBcp47(targetLang), echoTargetLanguage: true },
      inputAudioTranscription: {},
      outputAudioTranscription: {},
    }),
  },
  {
    name: 'snake_case top-level',
    build: (model, targetLang) => ({
      model,
      generationConfig: { response_modalities: ['AUDIO'] },
      translation_config: { target_language_code: toBcp47(targetLang), echo_target_language: true },
      input_audio_transcription: {},
      output_audio_transcription: {},
    }),
  },
];

/**
 * How long the stream must be quiet before the accumulated text counts as one finished sentence.
 *
 * People pause mid-sentence constantly -- to think, to say "えっと", to list things one at a time.
 * At 1.4s a single sentence like "日本には、えっと、お寿司とか麺類とか、ラーメン、あと豚カツ"
 * was being cut into nine separate messages, each translated with no idea of the others, so "豚"
 * alone became 猪 and "カツ" alone became 排.
 *
 * Every millisecond here is felt as lag, though, so the blunt "wait longer for everyone" approach
 * is kept modest and the real work is done by CONTINUATION_RE below: a transcript that stops on a
 * comma is unfinished no matter how long the silence, and one that stops on a full stop is finished
 * no matter how short it was. Waiting only in the ambiguous case keeps ordinary sentences quick.
 */
const FLUSH_DELAY_MS = 1600;

/**
 * How long the silence must run before we decide the speaker is finished and release the
 * microphone. Longer than the sentence break above, since cutting someone off mid-thought is worse
 * than releasing a moment late.
 *
 * This only matters when translations are not being read aloud; when they are, the turn closes as
 * soon as the app starts speaking, because the microphone is muted for the duration anyway.
 */
const TURN_END_MS = 3200;

/** Shorter window used once the speaker has pressed stop and is waiting on the result. */
const FINISH_FLUSH_MS = 450;

/**
 * Punctuation that says the sentence is not over. When the transcript stops on one of these the
 * speaker is mid-thought, so cutting there produces a fragment -- and the translation faithfully
 * comes out as a fragment too: "我姓王," became "제 성은 왕이고," ("my surname is Wang, and...")
 * instead of a finished sentence. Waiting a little longer in that case costs nothing.
 */
const CONTINUATION_RE = /[,，、;；:：…‥·・\-–—]$/;

/** How much longer to wait when the transcript clearly stops mid-sentence. */
const CONTINUATION_EXTRA_MS = 2200;

/**
 * Punctuation that says the sentence is over.
 *
 * Waiting out a silence timer after a full stop achieves nothing -- the speaker has finished, and
 * every extra millisecond is felt as the app being slow to answer. So a completed sentence is
 * released almost at once, and the long wait is kept for the genuinely ambiguous case where the
 * transcript simply stops without punctuation either way.
 */
const SENTENCE_END_RE = /[。．.!！?？…]$/;

/**
 * How long to wait after a sentence that looks complete.
 *
 * Not as short as it could be. A full stop does not mean the speaker has finished -- when someone
 * explains something at length the model punctuates each sentence as it goes ("…でもあります。") while
 * they carry straight on into the next one. At 450ms every one of those gaps became a new message,
 * so a single explanation arrived as a stack of fragments. This is sized to bridge the pause
 * between sentences of continuous speech while still returning promptly once someone actually stops.
 */
const COMPLETE_FLUSH_MS = 1300;

/**
 * Wait for a transcript that carries no punctuation at all.
 *
 * Long enough to sit through a breath, short enough not to feel like a hang. There is deliberately
 * no exception for short text: "環境に配慮した" and "製品作りを" are both brief AND mid-sentence, so
 * length cannot tell a one-word reply from the middle of a clause. It does not need to -- the model
 * punctuates utterances it considers complete ("네.", "你好。"), so missing punctuation is itself the
 * signal that more is coming.
 */
const UNPUNCTUATED_FLUSH_MS = 2200;

/**
 * Absolute ceiling on one utterance -- a safety valve against unbounded growth, nothing more.
 *
 * This was 12 seconds, which is well within the length of an ordinary explanation: reading out a
 * paragraph got guillotined mid-clause and the remainder arrived as a series of meaningless
 * fragments. Someone still talking after this long is genuinely making a speech, and by then a
 * break is the lesser evil.
 */
const MAX_UTTERANCE_MS = 45000;

/** The rate the Live Translation model documents for its input audio. */
const TARGET_SAMPLE_RATE = 16000;
/** 100ms of 16kHz audio, the chunk size the docs ask for. */
const CHUNK_SAMPLES = TARGET_SAMPLE_RATE / 10;

/**
 * Language codes are already the BCP-47 tags the model expects (see lib/languages.ts), so they are
 * passed straight through. This used to translate 2-letter codes on the way out, which could not
 * express the distinctions the model actually makes -- zh-Hans vs zh-Hant, pt-BR vs pt-PT.
 */
export function toBcp47(code: string): string {
  return code;
}

/** Averaging downsampler: cheaper than a proper filter and adequate for speech. */
function downsampleTo16k(buffer: Float32Array, inputSampleRate: number): Int16Array {
  const clampToInt16 = (v: number) => Math.max(-1, Math.min(1, v)) * 0x7fff;

  if (inputSampleRate <= TARGET_SAMPLE_RATE) {
    const out = new Int16Array(buffer.length);
    for (let i = 0; i < buffer.length; i++) out[i] = clampToInt16(buffer[i]);
    return out;
  }

  const ratio = inputSampleRate / TARGET_SAMPLE_RATE;
  const outLength = Math.floor(buffer.length / ratio);
  const out = new Int16Array(outLength);
  let offset = 0;
  for (let i = 0; i < outLength; i++) {
    const next = Math.round((i + 1) * ratio);
    let sum = 0;
    let count = 0;
    for (let j = offset; j < next && j < buffer.length; j++) {
      sum += buffer[j];
      count++;
    }
    out[i] = clampToInt16(count ? sum / count : 0);
    offset = next;
  }
  return out;
}

function int16ToBase64(samples: Int16Array): string {
  const bytes = new Uint8Array(samples.buffer, samples.byteOffset, samples.byteLength);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

/**
 * Collects a short-lived token for talking to the translation service.
 *
 * Shared so both directions of a conversation can be opened from one request instead of two.
 */
export async function fetchSessionToken(): Promise<string> {
  const res = await fetch('/api/session-token', { method: 'POST' });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 429 && body?.error === 'daily_limit') {
      // The free allowance is spent. Reported as its own kind of failure so the app can explain it
      // rather than showing a generic connection error.
      const err = new Error('daily_limit');
      (err as Error & { code?: string }).code = 'daily_limit';
      throw err;
    }
    const detail = body?.error ? String(body.error).slice(0, 300) : `HTTP ${res.status}`;
    console.error('session-token failed:', detail);
    throw new Error(`トークン取得に失敗: ${detail}`);
  }
  if (!body?.token) throw new Error('トークンが空で返ってきました。');
  return body.token as string;
}

export interface Utterance {
  speaker: 'staff' | 'worker';
  originalText: string;
  translatedText: string;
  fromLang: string;
  toLang: string;
  /** True when the model spoke this translation, so no text-to-speech is needed. */
  hasModelAudio: boolean;
}

export interface LiveTranslateCallbacks {
  /** Partial text while the person is still speaking. */
  onInterim?: (info: { original: string; translated: string }) => void;
  /** BCP-47 code the model reported for the speech it just heard. */
  onDetectedLanguage?: (speaker: 'staff' | 'worker', bcp47: string) => void;
  /** A complete utterance, ready to be shown as a message. */
  onUtterance?: (u: Utterance) => void;
  /**
   * The speaker fell silent long enough that the turn ended by itself. Only ever concerns WHEN a
   * turn finished -- who was speaking is fixed by the button and never inferred -- so a misjudgement
   * here can end a turn early or late, but can never mix the two directions up.
   */
  onTurnEnded?: (speaker: 'staff' | 'worker') => void;
  onError?: (message: string) => void;
  onClose?: () => void;
}

export class LiveTranslateEngine {
  /** Who is speaking. Fixed for the lifetime of this engine. */
  readonly speaker: 'staff' | 'worker';
  private fromLang: string;
  private toLang: string;
  private callbacks: LiveTranslateCallbacks;

  private ws: WebSocket | null = null;
  private original = '';
  private translated = '';
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private utteranceStartedAt = 0;
  private lastTextAt = 0;
  private turnEndTimer: ReturnType<typeof setTimeout> | null = null;

  private pending = new Int16Array(0);
  private sentAudio = false;
  private chunksSent = 0;
  private starting = false;
  private stopped = false;

  constructor(
    speaker: 'staff' | 'worker',
    fromLang: string,
    toLang: string,
    callbacks: LiveTranslateCallbacks
  ) {
    this.speaker = speaker;
    this.fromLang = fromLang;
    this.toLang = toLang;
    this.callbacks = callbacks;
  }

  get isOpen(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  async start(prefetchedToken?: string): Promise<void> {
    if (this.starting || this.isOpen) return;
    this.starting = true;
    this.stopped = false;
    try {
      const token = prefetchedToken || (await fetchSessionToken());

      let lastErr: unknown = null;
      for (const endpoint of WS_ENDPOINTS) {
        for (const shape of SETUP_SHAPES) {
          try {
            await this.openSession(endpoint, shape, token);
            console.warn(
              `✅ 通訳を開始 (${this.speaker}: ${this.fromLang} → ${toBcp47(this.toLang)}) shape="${shape.name}"`
            );
            return;
          } catch (e) {
            lastErr = e;
            console.warn(`   ✗ ${shape.name}:`, e instanceof Error ? e.message : e);
            this.closeSocket();
          }
        }
      }
      throw lastErr instanceof Error ? lastErr : new Error('どの接続方法でも繋がりませんでした。');
    } catch (e: any) {
      console.error('LiveTranslate start failed:', e);
      this.callbacks.onError?.(e?.message || '接続に失敗しました。');
      throw e;
    } finally {
      this.starting = false;
    }
  }

  private openSession(
    endpoint: string,
    shape: { name: string; build: SetupShape },
    token: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`${endpoint}?access_token=${token}`);
      this.ws = ws;

      // A socket that opens is not a socket that works: an invalid setup is accepted at the TCP
      // level and rejected a moment later with a close frame. Settle on `setupComplete`, never on
      // `onopen`, or the fallbacks above would never be reached.
      let settled = false;
      const settle = (fn: () => void) => {
        if (settled) return;
        settled = true;
        clearTimeout(settleTimer);
        fn();
      };
      const settleTimer = setTimeout(
        () => settle(() => reject(new Error('接続がタイムアウトしました。'))),
        15000
      );

      ws.onopen = () => {
        ws.send(JSON.stringify({ setup: shape.build(MODEL, this.toLang) }));
      };

      ws.onmessage = async (event) => {
        try {
          let raw = '';
          if (event.data instanceof Blob) raw = await event.data.text();
          else if (typeof event.data === 'string') raw = event.data;
          else return;
          const msg = JSON.parse(raw);

          if (msg?.setupComplete) {
            settle(resolve);
            return;
          }
          this.handleMessage(msg);
        } catch (e) {
          console.error('message handling failed:', e);
        }
      };

      ws.onerror = () => settle(() => reject(new Error('WebSocket error')));

      ws.onclose = (ev) => {
        const detail = `code=${ev.code}${ev.reason ? ` reason=${ev.reason}` : ''}`;
        this.ws = null;
        if (!settled) {
          settle(() => reject(new Error(detail)));
          return;
        }
        console.warn('session closed', detail);
        if (!this.stopped) {
          this.stopped = true;
          this.callbacks.onClose?.();
        }
      };
    });
  }

  private handleMessage(msg: any) {
    const content = msg?.serverContent;
    if (!content) return;

    // The model also speaks its translation. That audio is deliberately not used -- see the note in
    // page.tsx -- so its presence is noted and nothing more.
    if (Array.isArray(content.modelTurn?.parts)) {
      for (const part of content.modelTurn.parts) {
        if (typeof part?.inlineData?.data === 'string') this.sentAudio = true;
      }
    }

    let sawText = false;
    if (content.inputTranscription?.text) {
      this.original += content.inputTranscription.text;
      sawText = true;
      const lang = content.inputTranscription.languageCode;
      console.warn('heard:', content.inputTranscription.text, lang ? `(${lang})` : '');
      // Purely informational now. It used to decide the translation direction, which it was not
      // reliable enough for; the button owns that. Reporting which language the worker actually
      // spoke is a job it can do safely, since being wrong only mislabels a dropdown.
      if (lang) this.callbacks.onDetectedLanguage?.(this.speaker, String(lang));
    }
    if (content.outputTranscription?.text) {
      this.translated += content.outputTranscription.text;
      sawText = true;
      console.warn('translated:', content.outputTranscription.text);
    }
    // Audio trails the transcript: the words "が鍵です。" were already on screen while the tail of
    // the spoken version was still arriving. Treating only text as activity meant the utterance was
    // finalised mid-audio and playback stopped short of the ending. Incoming audio counts as the
    // speaker not being finished, so a turn now settles only once both have gone quiet.
    if (!sawText) return;

    if (sawText && this.translated.trim()) {
      this.callbacks.onInterim?.({
        original: this.original.trim(),
        translated: this.translated.trim(),
      });
    }

    this.lastTextAt = Date.now();
    if (this.turnEndTimer) {
      clearTimeout(this.turnEndTimer);
      this.turnEndTimer = null;
    }

    if (!this.utteranceStartedAt) this.utteranceStartedAt = Date.now();
    if (this.flushTimer) clearTimeout(this.flushTimer);

    if (Date.now() - this.utteranceStartedAt > MAX_UTTERANCE_MS) {
      // Someone has been talking without a real pause for a long time; cut here rather than letting
      // one message grow unreadably long.
      this.flushUtterance();
      return;
    }

    // How long to wait is decided by how the transcript ends, not by the clock alone.
    //
    // The safe default is to assume the speaker has NOT finished. Text that simply stops, with no
    // punctuation of any kind, is mid-sentence far more often than not -- "環境に配慮した" is the
    // middle of a thought, not the end of one. Cutting there produced a truncated message followed
    // by fragments like "製品作りを". Only a closed sentence gets the quick path.
    const heard = this.original.trim();
    const said = this.translated.trim();
    const finished = said && SENTENCE_END_RE.test(said) && SENTENCE_END_RE.test(heard);
    const midClause = CONTINUATION_RE.test(heard) || CONTINUATION_RE.test(said);

    let delay: number;
    if (finished) {
      delay = COMPLETE_FLUSH_MS; // a closed sentence: nothing to wait for
    } else if (midClause) {
      delay = FLUSH_DELAY_MS + CONTINUATION_EXTRA_MS; // stopped on a comma: more is coming
    } else {
      delay = UNPUNCTUATED_FLUSH_MS; // no punctuation either way: assume unfinished
    }
    this.flushTimer = setTimeout(() => this.flushUtterance(), delay);
  }

  private flushUtterance() {
    this.flushTimer = null;
    this.utteranceStartedAt = 0;

    const translated = this.translated.trim();
    const original = this.original.trim();
    const hasModelAudio = this.sentAudio;
    this.original = '';
    this.translated = '';
    this.sentAudio = false;

    if (!translated) return;

    this.callbacks.onUtterance?.({
      speaker: this.speaker,
      originalText: original,
      translatedText: translated,
      fromLang: this.fromLang,
      toLang: this.toLang,
      hasModelAudio,
    });

    // Emitting a sentence does NOT mean the person has stopped talking -- they may simply have
    // drawn breath before the next clause. Only give the microphone back if the silence keeps
    // running well past that point.
    const emittedAt = this.lastTextAt;
    if (this.turnEndTimer) clearTimeout(this.turnEndTimer);
    this.turnEndTimer = setTimeout(() => {
      this.turnEndTimer = null;
      if (this.lastTextAt !== emittedAt) return; // they carried on; leave the mic open
      this.callbacks.onTurnEnded?.(this.speaker);
    }, Math.max(TURN_END_MS - FLUSH_DELAY_MS, 800));
  }

  /**
   * Feeds microphone audio to the session.
   *
   * The docs are specific about the input format -- raw 16-bit PCM, mono, 16kHz, in ~100ms chunks --
   * and unlike the general Live model they do not promise resampling. A browser mic typically runs
   * at 44.1/48kHz, so samples are downsampled and buffered to a full 100ms here. Feeding audio at
   * the wrong rate makes speech arrive garbled, which looks exactly like poor recognition.
   */
  sendAudio(samples: Float32Array, inputSampleRate: number) {
    const downsampled = downsampleTo16k(samples, inputSampleRate);
    if (downsampled.length === 0) return;

    const merged = new Int16Array(this.pending.length + downsampled.length);
    merged.set(this.pending, 0);
    merged.set(downsampled, this.pending.length);
    this.pending = merged;

    while (this.pending.length >= CHUNK_SAMPLES) {
      const chunk = this.pending.subarray(0, CHUNK_SAMPLES);
      this.pending = this.pending.slice(CHUNK_SAMPLES);
      this.sendChunk(int16ToBase64(chunk));
    }
  }

  private sendChunk(base64PCM: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.chunksSent++;
    if (this.chunksSent % 50 === 0) {
      console.warn(`sent ${this.chunksSent} audio chunks (${TARGET_SAMPLE_RATE}Hz)`);
    }
    this.ws.send(
      JSON.stringify({
        realtimeInput: {
          audio: { mimeType: `audio/pcm;rate=${TARGET_SAMPLE_RATE}`, data: base64PCM },
        },
      })
    );
  }

  /**
   * Tells the server the speech is over so it flushes without waiting out its own silence timer,
   * and shortens our own grouping window: once the speaker has explicitly finished there is no
   * reason to keep waiting to see whether more words arrive.
   */
  markAudioPause() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ realtimeInput: { audioStreamEnd: true } }));
    }
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = setTimeout(() => this.flushUtterance(), FINISH_FLUSH_MS);
    }
    // An explicit stop is unambiguous, so the long "are they really finished?" wait is pointless.
    if (this.turnEndTimer) {
      clearTimeout(this.turnEndTimer);
      this.turnEndTimer = null;
    }
  }

  private closeSocket() {
    const ws = this.ws;
    if (ws) {
      ws.onclose = null;
      ws.onerror = null;
      try {
        ws.close();
      } catch {}
      this.ws = null;
    }
    this.original = '';
    this.translated = '';
    this.sentAudio = false;
  }

  stop() {
    this.stopped = true;
    this.pending = new Int16Array(0);
    this.chunksSent = 0;

    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    if (this.turnEndTimer) {
      clearTimeout(this.turnEndTimer);
      this.turnEndTimer = null;
    }
    // Emit anything still buffered so a final utterance isn't silently lost.
    this.flushUtterance();
    this.closeSocket();
  }
}

/**
 * Keeps one interpreter open per direction and decides which of them hears the microphone.
 *
 * The direction still comes from the button the user pressed -- nothing is inferred from the audio,
 * so a Japanese sentence can never be routed as if the worker had spoken it. What this adds over
 * creating an engine per turn is that both sessions stay connected: switching speakers no longer
 * tears a socket down and builds a new one, which was swallowing the first moment of speech and
 * resetting the model's context on every single turn.
 *
 * Only the active direction is fed audio. The idle one simply hears nothing, so it has nothing to
 * say -- which is what makes routing by button reliable where echo-suppression and language
 * detection were not.
 */
export class LiveTranslateSwitchboard {
  private engines: Record<'staff' | 'worker', LiveTranslateEngine>;
  private staffLang: string;
  private workerLang: string;
  private active: 'staff' | 'worker' | null = null;
  /** Who last held the microphone; keeps trailing results from being thrown away. */
  private lastActive: 'staff' | 'worker' | null = null;
  private starting = false;
  private disposed = false;
  private onFatal?: (message: string) => void;

  constructor(staffLang: string, workerLang: string, callbacks: LiveTranslateCallbacks) {
    this.staffLang = staffLang;
    this.workerLang = workerLang;
    this.onFatal = callbacks.onError;

    const build = (speaker: 'staff' | 'worker') =>
      new LiveTranslateEngine(
        speaker,
        speaker === 'staff' ? staffLang : workerLang,
        speaker === 'staff' ? workerLang : staffLang,
        {
          // Only surface partial text for whoever currently holds the microphone.
          onInterim: (info) => {
            if (this.active === speaker) callbacks.onInterim?.(info);
          },
          onUtterance: (u) => {
            // The translation for a turn lands a beat after the user has already let go of the
            // microphone, so accept it from whoever spoke most recently -- not only from whoever
            // holds the mic at this instant, which would discard the last utterance every time.
            if (speaker === this.active || speaker === this.lastActive) {
              callbacks.onUtterance?.(u);
            }
          },
          onTurnEnded: (who) => {
            if (who === this.active) callbacks.onTurnEnded?.(who);
          },
          onDetectedLanguage: callbacks.onDetectedLanguage,
          onError: callbacks.onError,
          onClose: () => {
            if (this.disposed) return;
            // Sessions expire on their own schedule. Rebuild quietly in the background; the user
            // only notices if the one they are currently speaking into is affected.
            console.warn(`[${speaker}] session closed; reopening in the background`);
            this.engines[speaker].start().catch(() => {
              if (this.active === speaker) callbacks.onClose?.();
            });
          },
        }
      );

    this.engines = { staff: build('staff'), worker: build('worker') };
  }

  get isOpen(): boolean {
    return this.engines.staff.isOpen && this.engines.worker.isOpen;
  }

  async start(): Promise<void> {
    if (this.starting) return;
    this.starting = true;
    this.disposed = false;
    try {
      if (toBcp47(this.staffLang) === toBcp47(this.workerLang)) {
        // Translating a language into itself produces nothing usable, and the app would sit there
        // looking connected while doing nothing. Fail loudly instead.
        throw new Error(
          `両方の言語が同じ (${this.staffLang}) です。片方を別の言語にしてください。`
        );
      }
      // Opened at the same time, sharing a single token. Doing this one after the other meant two
      // token requests and two connection handshakes in series before the first word could be
      // spoken -- the whole of it felt like lag on the very first press.
      const token = await fetchSessionToken();
      await Promise.all([this.engines.staff.start(token), this.engines.worker.start(token)]);
    } catch (e: any) {
      this.onFatal?.(e?.message || '接続に失敗しました。');
      throw e;
    } finally {
      this.starting = false;
    }
  }

  /** Hands the microphone to one side. Audio is only ever delivered to this direction. */
  setActiveSpeaker(speaker: 'staff' | 'worker') {
    if (this.active === speaker) return;
    this.active = speaker;
    this.lastActive = speaker;
    console.warn(`microphone -> ${speaker}`);
  }

  releaseMicrophone() {
    this.active = null;
  }

  sendAudio(samples: Float32Array, inputSampleRate: number) {
    if (!this.active) return;
    this.engines[this.active].sendAudio(samples, inputSampleRate);
  }

  /** Tells the active session the speech is over, without disturbing the idle one. */
  markAudioPause() {
    if (this.active) this.engines[this.active].markAudioPause();
  }

  stop() {
    this.disposed = true;
    this.active = null;
    this.engines.staff.stop();
    this.engines.worker.stop();
  }
}
