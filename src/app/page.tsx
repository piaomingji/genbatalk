'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Settings, RefreshCw, Volume2, Mic, MicOff, Info, UserCheck, Languages } from 'lucide-react';
import Mark from '@/components/Mark';
import Timeline, { ChatMessage } from '@/components/Timeline';
import SettingsModal from '@/components/SettingsModal';
import AudioWave from '@/components/AudioWave';
import { LiveTranslateSwitchboard, Utterance, fetchSessionToken } from '@/lib/liveTranslate';
import { detectUiLang, getStrings, UiLang } from '@/lib/i18n';
import { LANGUAGES, languageName, normalizeLanguage, speechLocale } from '@/lib/languages';
import AccountButton from '@/components/AccountButton';
import { signIn, useSession } from 'next-auth/react';

export default function Home() {
  const [uiLang, setUiLang] = useState<UiLang>('en');
  const t = getStrings(uiLang);
  const { data: session } = useSession();
  const signedIn = !!session?.user;

  useEffect(() => {
    setUiLang(detectUiLang());
  }, []);

  /** Each side is named by the language it speaks -- no roles, no assumed relationship. */
  const langLabel = (code: string) => languageName(code);

  /**
   * Sets one side's language, swapping the other side away if it already held that language.
   *
   * Both sides ending up on the same language is not a cosmetic glitch: the sessions are then asked
   * to translate a language into itself, and the app stops working entirely while looking like it
   * is running. It happened by way of the auto-detect suggestion, so the rule is enforced here --
   * in the one place that changes a language -- rather than relying on every caller to remember.
   */
  const setSideLanguage = (side: 'staff' | 'worker', code: string) => {
    const currentThis = side === 'staff' ? staffLangRef.current : workerLangRef.current;
    const currentOther = side === 'staff' ? workerLangRef.current : staffLangRef.current;
    if (code === currentThis) return;

    if (side === 'staff') {
      staffLangRef.current = code;
      setStaffLang(code);
      if (currentOther === code) {
        workerLangRef.current = currentThis;
        setWorkerLang(currentThis);
      }
    } else {
      workerLangRef.current = code;
      setWorkerLang(code);
      if (currentOther === code) {
        staffLangRef.current = currentThis;
        setStaffLang(currentThis);
      }
    }
  };

  /**
   * "Did you speak X?" prompt.
   *
   * The button fixes the translation direction, which is what finally made the app reliable -- so
   * a detected language must never quietly redirect the conversation on its own. A short
   * recognition can easily be misread, and silently repointing a side would resurrect exactly the
   * class of bug that took days to remove. Instead the detection is offered as a suggestion: it
   * only ever writes to the language dropdown, which the user can change back by hand at any time.
   */
  const [langSuggestion, setLangSuggestion] = useState<{ side: 'staff' | 'worker'; code: string } | null>(null);
  const dismissedSuggestionsRef = useRef<Set<string>>(new Set());
  const suggestionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const statusWatchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const usageTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [limitReached, setLimitReached] = useState(false);

  /**
   * Reports translation time to the server every few seconds while the microphone is live.
   *
   * Reporting continuously rather than at the end means closing the tab mid-conversation still
   * leaves the time accounted for -- otherwise the simplest way to use the service for free would
   * be to never finish a session.
   */
  const startUsageReporting = () => {
    if (usageTimerRef.current) return;
    const REPORT_EVERY_MS = 10000;
    usageTimerRef.current = setInterval(async () => {
      if (!isListeningRef.current) return;
      try {
        const res = await fetch('/api/usage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ seconds: REPORT_EVERY_MS / 1000 }),
        });
        const data = await res.json();
        if (data?.exhausted) {
          console.warn('Daily free allowance used up; stopping.');
          setLimitReached(true);
          shutdownSessions();
        }
      } catch {
        // A failed report must never interrupt a conversation in progress.
      }
    }, REPORT_EVERY_MS);
  };

  const stopUsageReporting = () => {
    if (usageTimerRef.current) {
      clearInterval(usageTimerRef.current);
      usageTimerRef.current = null;
    }
  };
  const lastUtteranceRef = useRef<{
    msgId: string;
    originalText: string;
    speaker: 'staff' | 'worker';
  } | null>(null);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [useRuby, setUseRuby] = useState(true);
  
  // Custom Settings
  const [speechSpeed, setSpeechSpeed] = useState(1.0);
  const [autoPlayAudio, setAutoPlayAudio] = useState(true);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  // Active Languages
  const [staffLang, setStaffLang] = useState('en');
  const [workerLang, setWorkerLang] = useState('es');

  // Speaker Roles & Listening Status
  const [activeSpeaker, setActiveSpeaker] = useState<'staff' | 'worker'>('staff');
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [micPermissionError, setMicPermissionError] = useState<boolean>(false);

  // Conversation Timeline
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Speech Recognition / Audio Recording Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const activeSpeakerRef = useRef<'staff' | 'worker'>('staff');
  const workerLangRef = useRef<string>('es');
  const staffLangRef = useRef<string>('en');
  const availableVoicesRef = useRef<SpeechSynthesisVoice[]>([]);
  /**
   * Live mirror of the user's settings.
   *
   * The translation sessions now stay open across a whole conversation, so the callbacks handed to
   * them are created once and keep whatever values were in scope at that moment. Reading settings
   * directly from that closure meant toggling furigana or switching the voice had no effect until
   * the conversation was restarted. Everything that runs inside those long-lived callbacks reads
   * from here instead.
   */
  const settingsRef = useRef({
    useRuby: true,
    speechSpeed: 1.0,
    autoPlayAudio: true,
  });



  // Live Translation engine (a pair of one-way translation sessions; see lib/liveTranslate.ts)
  const engineRef = useRef<LiveTranslateSwitchboard | null>(null);
  const reconnectCountRef = useRef<number>(0);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const mediaSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const isListeningRef = useRef<boolean>(false);
  const isSpeechPlayingRef = useRef<boolean>(false);
  const speechWatchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastMicClickRef = useRef<number>(0);
  /** Counts audio callbacks. Proof that the capture graph is alive, not merely that it exists. */
  const audioFramesRef = useRef<number>(0);
  const captureWatchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rebuiltThisTurnRef = useRef<boolean>(false);

  const setListeningState = (val: boolean) => {
    setIsListening(val);
    isListeningRef.current = val;
  };

  /**
   * Whether the microphone we are holding can still hear anything.
   *
   * `MediaStream.active` is not enough, and trusting it made declining a phone call deafen the app
   * until the page was reloaded. An interruption leaves iOS handing back a track that still belongs
   * to an active stream and still reports itself as live -- but permanently muted. No samples ever
   * arrive again, while everything the app checked said the microphone was fine, so it went on
   * capturing silence and pressing the button again changed nothing.
   */
  const microphoneIsLive = (): boolean => {
    const track = audioStreamRef.current?.getAudioTracks()[0];
    return !!track && track.readyState === 'live' && !track.muted;
  };

  /** Whether audio is actually reaching us: a live microphone, a graph, and a running context. */
  const audioPathIsHealthy = (): boolean =>
    microphoneIsLive() &&
    !!scriptProcessorRef.current &&
    audioContextRef.current?.state === 'running';

  /**
   * Throws away the whole capture path -- microphone, graph and AudioContext alike.
   *
   * The context goes too, deliberately. Answering a phone call and hanging up leaves Safari's
   * context in a state that `resume()` reports as handled and that never actually produces another
   * audio callback; releasing only the microphone rebuilt a fresh graph on top of a dead context
   * and stayed silent. Building a new context costs a few milliseconds and only happens on recovery.
   */
  const discardAudioPipeline = () => {
    audioStreamRef.current?.getTracks().forEach(track => track.stop());
    audioStreamRef.current = null;
    if (mediaSourceRef.current) {
      try { mediaSourceRef.current.disconnect(); } catch {}
      mediaSourceRef.current = null;
    }
    if (scriptProcessorRef.current) {
      try { scriptProcessorRef.current.disconnect(); } catch {}
      scriptProcessorRef.current = null;
    }
    if (audioContextRef.current) {
      if (audioContextRef.current.state !== 'closed') {
        try { audioContextRef.current.close(); } catch {}
      }
      audioContextRef.current = null;
    }
  };

  /**
   * An on-screen log, for problems that only happen on a real phone.
   *
   * Three attempts at the microphone-after-a-call fault were made from inference alone and all three
   * missed, because every state the app can see reports itself healthy while nothing works. Add
   * `?debug=1` to the address to show what actually happened, in order, on the device where it
   * happened. Nothing renders without that parameter.
   */
  const debugOnRef = useRef<boolean>(false);
  const [debugLines, setDebugLines] = useState<string[]>([]);

  const dbg = (message: string) => {
    console.warn(`[talkie] ${message}`);
    if (!debugOnRef.current) return;
    const at = new Date().toTimeString().slice(0, 8);
    setDebugLines(prev => [...prev.slice(-150), `${at}  ${message}`]);
  };

  useEffect(() => {
    debugOnRef.current = new URLSearchParams(window.location.search).get('debug') === '1';
    if (debugOnRef.current) setDebugLines([`${new Date().toTimeString().slice(0, 8)}  debug on`]);
  }, []);

  /**
   * Returns a usable AudioContext, creating one if we don't have a live one.
   *
   * Two things made the old version fail with "AudioContext not initialized":
   * a context that had already been closed was still held in the ref (so it was never replaced but
   * could not be used), and start-up reads the ref again after several seconds of awaiting, by
   * which point a stop may have cleared it. Always resolving through this function fixes both.
   */
  const ensureAudioContext = (): AudioContext | null => {
    if (typeof window === 'undefined') return null;
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return null;

    const existing = audioContextRef.current;
    if (existing && existing.state !== 'closed') {
      // Anything that is not running gets resumed, rather than only 'suspended'. Safari has a
      // non-standard 'interrupted' state that a phone call puts the context into, and it stays
      // there until something asks it to resume.
      if (existing.state !== 'running') existing.resume().catch(() => {});
      return existing;
    }
    const ctx: AudioContext = new AudioContextClass();
    // A new context does not always start running. On iOS after an interruption it can arrive
    // suspended, and a suspended context never fires an audio callback -- the graph builds cleanly
    // and then simply never produces a sample.
    if (ctx.state !== 'running') ctx.resume().catch(() => {});
    ctx.addEventListener('statechange', () => {
      dbg(`audio context -> ${ctx.state}`);
    });
    audioContextRef.current = ctx;
    return ctx;
  };

  // Load browser speechSynthesis voices asynchronously and store them in state
  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        availableVoicesRef.current = voices;
        setAvailableVoices(voices);
      };
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  // Persist settings (speed, autoplay, ruby) in localStorage across reloads
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedSpeed = localStorage.getItem('genbatalk:speechSpeed');
      if (savedSpeed) {
        const parsed = parseFloat(savedSpeed);
        if (!isNaN(parsed)) setSpeechSpeed(parsed);
      }
      const savedPlay = localStorage.getItem('genbatalk:autoPlayAudio');
      if (savedPlay !== null) {
        setAutoPlayAudio(savedPlay === 'true');
      }
      const savedRuby = localStorage.getItem('genbatalk:useRuby');
      if (savedRuby !== null) {
        setUseRuby(savedRuby === 'true');
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('genbatalk:speechSpeed', speechSpeed.toString());
    }
  }, [speechSpeed]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('genbatalk:autoPlayAudio', autoPlayAudio ? 'true' : 'false');
    }
  }, [autoPlayAudio]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('genbatalk:useRuby', useRuby ? 'true' : 'false');
    }
  }, [useRuby]);

  useEffect(() => {
    workerLangRef.current = workerLang;
  }, [workerLang]);

  useEffect(() => {
    staffLangRef.current = staffLang;
  }, [staffLang]);

  // The prompt disappears on its own; ignoring it must never block the conversation.
  useEffect(() => {
    if (!langSuggestion) return;
    if (suggestionTimerRef.current) clearTimeout(suggestionTimerRef.current);
    suggestionTimerRef.current = setTimeout(() => setLangSuggestion(null), 12000);
    return () => {
      if (suggestionTimerRef.current) clearTimeout(suggestionTimerRef.current);
    };
  }, [langSuggestion]);

  useEffect(() => {
    settingsRef.current = {
      useRuby,
      speechSpeed,
      autoPlayAudio,
    };
  }, [useRuby, speechSpeed, autoPlayAudio]);

  // The worker's language is baked into each translation session at connect time, so changing it
  // mid-conversation means rebuilding the pair. Tear down and start again only if we were live.
  useEffect(() => {
    if (!engineRef.current) return;
    // Both target languages are baked into the sessions when they connect, so a change on EITHER
    // side means rebuilding the pair. Watching only the worker's language left the sessions still
    // translating into the old language after the other side was switched.
    console.warn('Language changed. Rebuilding translation sessions...');
    const wasListening = isListeningRef.current;
    const speaker = activeSpeakerRef.current;
    shutdownSessions();
    if (wasListening) {
      handleStartListen(speaker);
    }
  }, [workerLang, staffLang]);

  // NOTE: there is no voice-activity detection on this side any more, and no turn handling either.
  // Translation runs as a continuous stream (see lib/liveTranslate.ts); utterances are grouped by a
  // short quiet period inside the engine. The old client-side volume detector and turn bookkeeping
  // were the source of the duplicate bubbles, empty turns and stuck-listening freezes.

  // Applies furigana to a Japanese translation. Best-effort: on any failure we keep the plain text
  // rather than delaying or dropping the message.
  const withFurigana = async (text: string, langCode: string): Promise<string> => {
    if (!settingsRef.current.useRuby || langCode !== 'ja' || !text) return text;
    try {
      const res = await fetch('/api/furigana', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) return text;
      const data = await res.json();
      return data?.text || text;
    } catch {
      return text;
    }
  };

  /**
   * Applies site terminology to a finished translation.
   *
   * The Live Translation model accepts no instructions, so terminology rules ("免許証" -> 驾照,
   * "ヘルメット" -> 安全帽) never reach it. This pass adds them back.
   *
   * Note what it does NOT do: re-translate. An earlier version translated the transcript again from
   * scratch, and because the transcript is less accurate than the audio the live model works from,
   * it could invert the meaning outright -- a spoken "元気を感じない" was transcribed as
   * "元気を感じてる", and the re-translation confidently said the worker still had energy while the
   * original translation had correctly said they had none. The existing translation is now treated
   * as authoritative and only its wording is adjusted.
   *
   * Strictly best-effort: any failure or suspicious-looking answer leaves the translation alone.
   */
  const refineTranslation = async (u: Utterance): Promise<string | null> => {
    const draft = u.translatedText.trim();
    if (!draft) return null;
    try {
      const res = await fetch('/api/polish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: u.originalText.trim(),
          draft,
          fromLang: u.fromLang,
          toLang: u.toLang,
          useRuby: settingsRef.current.useRuby,
        }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      const polished: string | undefined = data?.text;
      if (!polished) return null;

      const cleaned = polished.trim();
      if (!cleaned || cleaned === draft) return null;

      // A terminology pass should not change the length much. A wild swing means it rewrote or
      // re-translated rather than corrected, so keep the original.
      const strip = (t: string) => t.replace(/<[^>]*>/g, '');
      const a = strip(draft).length;
      const b = strip(cleaned).length;
      if (a > 0 && (b > a * 1.8 || b < a * 0.55)) {
        console.warn('polish rejected (length changed too much):', draft, '=>', cleaned);
        return null;
      }
      return cleaned;
    } catch {
      return null;
    }
  };

  /**
   * Puts a finished utterance on screen, then improves it in place.
   *
   * The translation itself is already in hand the moment this is called, so it goes up immediately.
   * The two follow-up passes -- furigana and proofreading -- used to run one after the other BEFORE
   * anything was displayed, which put two network round trips between the end of a sentence and any
   * visible response. They now run at the same time as each other, and behind the message rather
   * than in front of it.
   */
  const appendUtterance = async (u: Utterance) => {
    const msgId = Math.random().toString(36).substring(7);
    lastUtteranceRef.current = { msgId, originalText: u.originalText.trim(), speaker: u.speaker };

    // Straight to the screen -- nothing is awaited before this point.
    setMessages(prev => [
      ...prev,
      {
        id: msgId,
        sender: u.speaker,
        originalText: u.originalText || langLabel(u.fromLang),
        translatedText: u.translatedText,
        fromLang: u.fromLang,
        toLang: u.toLang,
        timestamp: new Date(),
      },
    ]);

    // Speak straight away, from exactly the text that is on screen.
    //
    // Waiting for the refinements first meant the voice started two or three network round trips
    // after the words appeared, which is a long silence in the middle of a conversation. The
    // refinements only ever adjust wording, so starting from the translation as spoken by the model
    // is faithful; if a refinement lands later it quietly updates the text, and the audio the
    // listener already heard still matched what was shown at the time.
    if (settingsRef.current.autoPlayAudio) {
      playSpeech(u.translatedText, u.toLang);
      // The turn is over the moment the app starts speaking.
      //
      // The microphone is muted while a translation is read out, so leaving the turn open looked
      // active without being able to hear anything -- the button stayed lit for a few seconds after
      // the translation appeared, doing nothing. Closing it here makes the button match reality.
      if (isListeningRef.current) {
        handleStopListen();
      }
    }

    // Both refinements at once, behind the message rather than in front of it.
    const [refined, ruby] = await Promise.all([
      refineTranslation(u),
      withFurigana(u.translatedText, u.toLang),
    ]);

    const settled = refined && refined !== u.translatedText ? refined : u.translatedText;
    // Furigana was computed from the unrefined wording, so it only applies if proofreading left the
    // wording alone.
    const finalText = settled === u.translatedText ? ruby : await withFurigana(settled, u.toLang);

    if (finalText !== u.translatedText) {
      setMessages(prev => {
        const idx = prev.findIndex(m => m.id === msgId);
        if (idx === -1) return prev;
        const updated = [...prev];
        updated[idx] = { ...updated[idx], translatedText: finalText };
        return updated;
      });
    }
  };

  /**
   * Notices a turn that believes it is listening but is not receiving any audio.
   *
   * Every check the app can make about the microphone can pass while no samples arrive -- which is
   * exactly what a phone call leaves behind, and what made the app go quietly deaf twice. Counting
   * the audio callbacks is the one test that cannot be fooled: either the graph is producing frames
   * or it is not. If none arrive shortly after a turn starts, the path is rebuilt once, and if that
   * still yields nothing the turn ends with a message rather than pretending to listen.
   */
  const armCaptureWatchdog = (speaker: 'staff' | 'worker') => {
    if (captureWatchdogRef.current) clearTimeout(captureWatchdogRef.current);
    const framesAtStart = audioFramesRef.current;
    captureWatchdogRef.current = setTimeout(() => {
      captureWatchdogRef.current = null;
      if (!isListeningRef.current) return;
      if (audioFramesRef.current !== framesAtStart) return; // audio is flowing; nothing to do

      if (rebuiltThisTurnRef.current) {
        dbg('watchdog: still no audio after a rebuild; giving up on this turn');
        handleStopListen();
        setNetworkError(`⚠️ ${t.micInterrupted}`);
        setTimeout(() => setNetworkError(null), 6000);
        return;
      }
      dbg('watchdog: no audio arrived; rebuilding the capture path');
      rebuiltThisTurnRef.current = true;
      discardAudioPipeline();
      handleStartListen(speaker);
    }, 2500);
  };

  const handleStartListen = async (speaker: 'staff' | 'worker') => {
    setMicPermissionError(false);
    setActiveSpeaker(speaker);
    activeSpeakerRef.current = speaker;
    setListeningState(true);

    // Anything an interruption may have broken goes before a context is created or resumed, so the
    // rest of this runs against a path that is either healthy or absent -- never half-dead.
    if (!audioPathIsHealthy()) discardAudioPipeline();

    // Created up front so it happens inside the click handler, which is what browsers require.
    ensureAudioContext();

    // If the microphone, the audio graph and both sessions are all still up from the last turn --
    // which is the normal case now that nothing is torn down between turns -- start capturing
    // immediately. Waiting for the async path below is what made the first second of speech go
    // missing unless the user waited for the status text to change.
    const warm = engineRef.current?.isOpen && audioPathIsHealthy();

    const track = audioStreamRef.current?.getAudioTracks()[0];
    dbg(
      `press ${speaker}: warm=${!!warm} ws=${engineRef.current?.isOpen ?? 'none'} ` +
        `ctx=${audioContextRef.current?.state ?? 'none'} ` +
        `track=${track ? `${track.readyState}${track.muted ? '/muted' : ''}` : 'none'} ` +
        `frames=${audioFramesRef.current}`
    );

    if (warm) {
      engineRef.current!.setActiveSpeaker(speaker);
      setInterimTranscript(t.listening);
      reconnectCountRef.current = 0;
      startUsageReporting();
      armCaptureWatchdog(speaker);
      return;
    }

    setInterimTranscript(t.connecting);

    try {
      // The microphone and the translation sessions do not depend on each other, and on a phone
      // each takes seconds: measured on an iPhone, three for the microphone and four more for the
      // sessions, one after the other. Asked for together they overlap, and only the slower of the
      // two is felt.
      const needsSessions = !engineRef.current || !engineRef.current.isOpen;
      const tokenPromise = needsSessions ? fetchSessionToken() : null;
      // Claimed now so a token that fails while the microphone is still being granted does not
      // surface as an unhandled rejection; the real error is raised where it is awaited below.
      tokenPromise?.catch(() => {});

      let stream = audioStreamRef.current;
      if (!stream) {
        dbg('requesting a microphone');
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioStreamRef.current = stream;
        dbg(`microphone granted: ${stream.getAudioTracks()[0]?.readyState}`);

        // Nothing reaches the app as an error when a call takes the microphone away, so watch the
        // track itself. A turn that has gone deaf then ends visibly, instead of sitting there
        // looking like it is still listening.
        const track = stream.getAudioTracks()[0];
        const onMicrophoneLost = () => {
          if (!isListeningRef.current) return;
          handleStopListen();
          setNetworkError(`⚠️ ${t.micInterrupted}`);
          setTimeout(() => setNetworkError(null), 6000);
        };
        track?.addEventListener('ended', onMicrophoneLost);
        track?.addEventListener('mute', onMicrophoneLost);
      }

      // Both directions stay connected for the whole conversation; the button only decides which of
      // them the microphone is handed to. Rebuilding a session per turn is what was eating the
      // first moment of each utterance and resetting context every time the speaker changed.
      if (needsSessions) {
        dbg('building new translation sessions');
        engineRef.current?.stop();
        const board = new LiveTranslateSwitchboard(staffLang, workerLang, {
          onInterim: ({ original, translated }) => {
            // Once the user has pressed stop we are showing "翻訳しています..."; late partial
            // results arriving after that should not flash the listening view back up.
            if (!isListeningRef.current) return;
            setInterimTranscript(translated || original);
          },
          onUtterance: (u) => {
            if (statusWatchdogRef.current) {
              clearTimeout(statusWatchdogRef.current);
              statusWatchdogRef.current = null;
            }
            setInterimTranscript('');
            appendUtterance(u);
          },
          onTurnEnded: () => {
            // The speaker stopped talking, so end their turn for them -- no second tap needed.
            // Only the timing is automatic here; the direction was fixed when the button was
            // pressed, so an early or late cut costs a moment, never a scrambled conversation.
            if (isListeningRef.current) {
              console.warn('turn ended automatically');
              handleStopListen();
            }
          },
          onDetectedLanguage: (who, bcp47) => {
            const code = normalizeLanguage(bcp47);
            if (!code) return;

            const expected = who === 'staff' ? staffLangRef.current : workerLangRef.current;
            if (code === expected) return;

            // Note: the detected language matching the OTHER side is NOT skipped. Only the side
            // holding the microphone is fed any audio, so this is not "the other person replying" --
            // it means the wrong button was pressed, which is exactly when help is wanted.
            const key = `${who}:${code}`;
            if (dismissedSuggestionsRef.current.has(key)) return;

            console.warn(`detected ${bcp47} on the ${who} side (set to ${expected})`);
            setLangSuggestion({ side: who, code });
          },
          onError: (message) => {
            setNetworkError(`⚠️ ${message}`);
            setTimeout(() => setNetworkError(null), 6000);
          },
          onClose: () => {
            setListeningState(false);
            setInterimTranscript('');
          },
        });
        engineRef.current = board;
        await board.start(await tokenPromise!);
        dbg(`sessions open: ${board.isOpen}`);
      }

      // Hand the microphone to whichever side pressed the button. The sessions were either already
      // open or were just built above, so this is only reachable with an engine in place -- but say
      // so out loud rather than assuming it, because a silent skip here would look like the
      // microphone failing again.
      if (!engineRef.current) throw new Error('翻訳セッションを開始できませんでした。');
      engineRef.current.setActiveSpeaker(speaker);

      // Opening the sessions takes a moment. If the user hit stop in the meantime, don't go on to
      // wire up a microphone for a session nobody asked for any more.
      if (!isListeningRef.current) {
        dbg('start cancelled while connecting; microphone not attached');
        return;
      }

      setInterimTranscript(t.listening);
      reconnectCountRef.current = 0;
      startUsageReporting();

      const actx = ensureAudioContext();
      if (!actx) throw new Error('この端末では音声機能を利用できません。');

      if (mediaSourceRef.current) {
        try { mediaSourceRef.current.disconnect(); } catch (e) {}
        mediaSourceRef.current = null;
      }
      if (scriptProcessorRef.current) {
        try { scriptProcessorRef.current.disconnect(); } catch (e) {}
        scriptProcessorRef.current = null;
      }

      const source = actx.createMediaStreamSource(stream);
      mediaSourceRef.current = source;

      const processor = actx.createScriptProcessor(2048, 1, 1);
      scriptProcessorRef.current = processor;
      source.connect(processor);
      processor.connect(actx.destination);

      processor.onaudioprocess = (e) => {
        // Counted before anything can return early: this is the proof that the graph is alive.
        audioFramesRef.current++;
        if (audioFramesRef.current === 1 || audioFramesRef.current % 500 === 0) {
          dbg(`audio frames: ${audioFramesRef.current}`);
        }
        rebuiltThisTurnRef.current = false;

        if (!isListeningRef.current) return;
        // Never feed our own spoken translation back into the microphone.
        if (isSpeechPlayingRef.current) return;

        // Hand over raw float samples; the engine owns resampling to the 16kHz the translation
        // model expects and pacing them into 100ms chunks.
        engineRef.current?.sendAudio(e.inputBuffer.getChannelData(0), actx.sampleRate);
      };

      dbg('capture graph attached');
      armCaptureWatchdog(speaker);
    } catch (err: any) {
      dbg(`start failed: ${err?.code || err?.name || err?.message || 'unknown'}`);
      console.error('Failed to start live translation:', err);
      if (err?.code === 'daily_limit' || err?.message === 'daily_limit') {
        dbg('the monthly allowance is spent');
        setLimitReached(true);
        setListeningState(false);
        setInterimTranscript('');
        return;
      }
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError' || err?.name === 'SecurityError') {
        setMicPermissionError(true);
      } else {
        setNetworkError(`⚠️ ${t.connectFailed}`);
        setTimeout(() => setNetworkError(null), 6000);
      }
      setListeningState(false);
      setInterimTranscript('');
    }
  };

  /**
   * Ends a turn: stops capturing and hands the microphone back, but leaves both translation
   * sessions connected so the next turn starts instantly.
   */
  /**
   * Ends a turn. The microphone, the audio graph and both translation sessions all stay alive --
   * `isListeningRef` alone decides whether samples are forwarded.
   *
   * Releasing the microphone track and closing the AudioContext after every turn meant the next
   * turn had to call getUserMedia and rebuild the graph again, so speech in the first moment after
   * pressing the button was simply not being captured. Keeping it warm makes a turn start instant.
   */
  const handleStopListen = (opts?: { keepStatus?: boolean }) => {
    setListeningState(false);
    reconnectCountRef.current = 0;
    stopUsageReporting();

    if (captureWatchdogRef.current) {
      clearTimeout(captureWatchdogRef.current);
      captureWatchdogRef.current = null;
    }
    rebuiltThisTurnRef.current = false;

    engineRef.current?.releaseMicrophone();
    // When the user has just finished speaking, leave "翻訳しています..." up until the result
    // actually lands instead of blanking it for the moment in between.
    if (!opts?.keepStatus) setInterimTranscript('');
  };

  /** Ends the whole conversation: releases the microphone and closes both sessions. */
  const shutdownSessions = () => {
    handleStopListen();

    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
      audioStreamRef.current = null;
    }
    if (scriptProcessorRef.current) {
      try { scriptProcessorRef.current.disconnect(); } catch (e) {}
      scriptProcessorRef.current = null;
    }
    if (mediaSourceRef.current) {
      try { mediaSourceRef.current.disconnect(); } catch (e) {}
      mediaSourceRef.current = null;
    }
    if (audioContextRef.current) {
      if (audioContextRef.current.state !== 'closed') {
        try { audioContextRef.current.close(); } catch (e) {}
      }
      // Clear unconditionally: keeping a closed context here used to block a new one from ever
      // being created, permanently breaking the mic until a page reload.
      audioContextRef.current = null;
    }

    engineRef.current?.stop();
    engineRef.current = null;
    setInterimTranscript('');
  };

  /**
   * A long interruption invalidates the translation sessions, whatever they claim about themselves.
   *
   * `isOpen` asks the WebSocket for its readyState, and a socket whose network vanished underneath
   * it keeps answering OPEN until the browser finally gives up -- which can take minutes. So after a
   * phone call the app believed both sessions were connected, took the fast path, and fed audio into
   * sockets that would never answer. Neither button produced a translation and nothing anywhere
   * looked wrong: the microphone was live, the audio graph was producing frames, the sessions
   * reported themselves open.
   *
   * Hiding the page for more than a moment is the one reliable signal that this may have happened.
   * Calling stop() is the part that matters -- the reconnect path only rebuilds a session it can see
   * is closed, and this is exactly the case where it cannot see that.
   */
  useEffect(() => {
    let hiddenAt = 0;

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAt = Date.now();
        dbg('page hidden');
        return;
      }
      const awayMs = hiddenAt ? Date.now() - hiddenAt : 0;
      hiddenAt = 0;
      // A glance at another app does not break a socket; a call, or a locked screen, can.
      if (awayMs < 1000) return;

      dbg(`away ${Math.round(awayMs / 1000)}s -> dropping sessions and audio path`);
      if (isListeningRef.current) handleStopListen();
      engineRef.current?.stop();
      engineRef.current = null;
      discardAudioPipeline();
    };

    // iOS does not always report a call as a visibility change, particularly from a home-screen
    // launch, so the same recovery hangs off every signal that a return-to-foreground produces.
    const onReturn = () => {
      if (document.visibilityState !== 'visible') return;
      if (!hiddenAt) return;
      onVisibilityChange();
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pageshow', onReturn);
    window.addEventListener('focus', onReturn);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pageshow', onReturn);
      window.removeEventListener('focus', onReturn);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // NOTE: for a while this played the audio the translation model itself produces, instead of
  // synthesising speech from the text. It saves a round trip and the model pays for that audio
  // whether it is used or not -- but it does not work on a single shared device. The model interprets
  // SIMULTANEOUSLY: it starts speaking while the person is still talking. The microphone has to be
  // muted while the app speaks, or the translation is picked up and translated back, so playing that
  // audio cut the speaker off mid-sentence and their words arrived in fragments. Holding the audio
  // back until the words settled did not fix it either, since the model keeps talking into the next
  // utterance. Speaking from the finished text avoids the conflict entirely: nothing is played until
  // the person has stopped.

  const beginSpeechPlayback = () => {
    isSpeechPlayingRef.current = true;
  };

  const endSpeechPlayback = () => {
    isSpeechPlayingRef.current = false;
    if (speechWatchdogRef.current) {
      clearTimeout(speechWatchdogRef.current);
      speechWatchdogRef.current = null;
    }
  };

  const armSpeechWatchdog = (ms: number) => {
    if (speechWatchdogRef.current) clearTimeout(speechWatchdogRef.current);
    speechWatchdogRef.current = setTimeout(() => {
      if (isSpeechPlayingRef.current) {
        console.warn('Speech playback watchdog fired; re-enabling the microphone.');
      }
      isSpeechPlayingRef.current = false;
      speechWatchdogRef.current = null;
    }, Math.min(Math.max(ms, 1500), 30000));
  };

  const cleanSpeechText = (text: string, langCode: string) => {
    let clean = text;
    // Strip rt reading tags completely to preserve kanji so TTS reads with correct intonation
    clean = clean.replace(/<rt>[^<]*<\/rt>/g, '');
    clean = clean.replace(/<\/?[a-z]+>/g, ''); // Remove all HTML tags like <ruby>, </ruby>
    if (langCode === 'ja') {
      // Disambiguate homograph "空いている" (suiteiru) so TTS reads it as "すいている" instead of "あいている"
      clean = clean.replace(/お腹(が)?空(い|き)/g, 'お腹$1す$2');
      // "明日" (tomorrow) is also a real given name read "あきら" -- the TTS engine sometimes
      // picks that reading instead of "あした" since the <rt> furigana hint gets stripped above.
      // In this app's context it's always "tomorrow", never the name, so force the reading.
      clean = clean.replace(/明日/g, 'あした');
    }
    return clean
      .replace(/<[^>]*>/g, '') // strip HTML tags
      .replace(/\[Dịch\]\s*/g, '')
      .replace(/\[Translate\]\s*/g, '')
      .replace(/\[\w+\]\s*/g, '');
  };

  /**
   * Breaks text into pieces the speech proxy will accept.
   *
   * The proxy refuses anything much over 200 characters, and a refusal meant falling back to the
   * browser's built-in synthesis -- which is why a long translation suddenly switched from a natural
   * voice to a robotic one of a different gender. Splitting keeps every translation, however long,
   * in the same voice. Sentence boundaries are preferred, then clause boundaries, so the seams fall
   * where a speaker would pause anyway.
   */
  const splitForSpeech = (text: string, max = 180): string[] => {
    if (text.length <= max) return [text];

    const pieces: string[] = [];
    // Keep the delimiter with the piece it ends.
    const sentences = text.split(/(?<=[。．.!？?！\n])/);
    let current = '';

    const pushCurrent = () => {
      const trimmed = current.trim();
      if (trimmed) pieces.push(trimmed);
      current = '';
    };

    for (const sentence of sentences) {
      if (sentence.length > max) {
        pushCurrent();
        // Still too long: fall back to clause boundaries, then to a hard cut.
        let rest = sentence;
        while (rest.length > max) {
          const window = rest.slice(0, max);
          const comma = Math.max(window.lastIndexOf('、'), window.lastIndexOf('，'), window.lastIndexOf(','));
          const space = window.lastIndexOf(' ');
          const cut = comma > max * 0.4 ? comma + 1 : space > max * 0.4 ? space + 1 : max;
          pieces.push(rest.slice(0, cut).trim());
          rest = rest.slice(cut);
        }
        current = rest;
        continue;
      }
      if (current.length + sentence.length > max) pushCurrent();
      current += sentence;
    }
    pushCurrent();
    return pieces.filter(Boolean);
  };

  const playSpeech = async (text: string, langCode: string) => {
    const cleanText = cleanSpeechText(text, langCode);
    if (!cleanText.trim()) return;

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx: AudioContext | null = AudioContextClass ? new AudioContextClass() : null;
      if (!ctx) {
        fallbackSpeechSynthesis(cleanText, langCode);
        return;
      }

      const segments = splitForSpeech(cleanText);

      // Requested together, then played in order: the voice is consistent and there is no gap
      // between pieces while a later one is still being fetched.
      const buffers = await Promise.all(
        segments.map(async (segment) => {
          const res = await fetch(`/api/tts?lang=${langCode}&text=${encodeURIComponent(segment)}`);
          if (!res.ok) throw new Error(`TTS proxy responded ${res.status}`);
          return ctx.decodeAudioData(await res.arrayBuffer());
        })
      );

      const rate = settingsRef.current.speechSpeed || 1;
      let startAt = ctx.currentTime + 0.05;
      let totalMs = 0;

      // The microphone stays muted until the last piece has played, so the app never translates its
      // own voice. The watchdog is sized from the real durations rather than a guess, because
      // `onended` does not fire if playback is blocked.
      beginSpeechPlayback();
      buffers.forEach((buffer, i) => {
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.playbackRate.value = rate;
        source.connect(ctx.destination);
        source.start(startAt);
        if (i === buffers.length - 1) {
          source.onended = () => {
            endSpeechPlayback();
            try { ctx.close(); } catch {}
          };
        }
        const seconds = buffer.duration / rate;
        startAt += seconds;
        totalMs += seconds * 1000;
      });
      armSpeechWatchdog(totalMs + 1000);
    } catch (e) {
      console.warn('Falling back to the browser voice:', e);
      endSpeechPlayback();
      fallbackSpeechSynthesis(cleanText, langCode);
    }
  };

  const fallbackSpeechSynthesis = (text: string, langCode: string) => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      
      const cleanText = cleanSpeechText(text, langCode);

      const browserLang = speechLocale(langCode);

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = browserLang;
      utterance.rate = settingsRef.current.speechSpeed;

      utterance.onstart = () => {
        beginSpeechPlayback();
        // Rough estimate: speech synthesis has no duration up front.
        armSpeechWatchdog((cleanText.length / 5) * 1000 + 4000);
      };
      utterance.onend = () => endSpeechPlayback();
      utterance.onerror = () => endSpeechPlayback();

      const voices =
        availableVoicesRef.current.length > 0
          ? availableVoicesRef.current
          : typeof window !== 'undefined' && window.speechSynthesis
            ? window.speechSynthesis.getVoices()
            : [];
      // Pick an ordinary voice for this language. Leaving the choice to the browser is how a
      // novelty voice (macOS ships robotic ones like "Fred") or a voice for an entirely different
      // language ended up reading the translation aloud.
      const forLang = voices.filter(v => v.lang.toLowerCase().startsWith(langCode.toLowerCase()));
      const isNovelty = (name: string) =>
        ['fred', 'albert', 'bad news', 'good news', 'bells', 'bubbles', 'jester', 'organ',
         'trinoids', 'whisper', 'wobble', 'zarvox', 'boing', 'bahh', 'cellos', 'superstar',
         'junior', 'ralph', 'kathy', 'princess', 'deranged', 'hysterical'].some(n => name.includes(n));

      const usable = forLang.filter(v => !isNovelty(v.name.toLowerCase()));
      const matchedVoice = usable[0] || forLang[0];
      if (matchedVoice) {
        utterance.voice = matchedVoice;
        utterance.lang = matchedVoice.lang;
      } else {
        console.warn(`No voice installed for "${langCode}"; the browser default will be used.`);
      }

      window.speechSynthesis.speak(utterance);
    }
  };

  const handleMicButtonClick = (speaker: 'staff' | 'worker') => {
    // Debounce rapid duplicate click/tap events (e.g. mobile "ghost clicks"), which could otherwise
    // fire handleStartListen twice for a single physical tap.
    const now = Date.now();
    if (now - lastMicClickRef.current < 600) {
      console.warn('Ignoring rapid duplicate mic button click.');
      return;
    }
    lastMicClickRef.current = now;

    if (isListening) {
      if (activeSpeaker !== speaker) return; // the other button is disabled anyway
      // Ask the server to finalize immediately, then stop capturing right away. There is no delay
      // to wait out: the sessions stay connected between turns, so the tail of the translation
      // still arrives afterwards. The previous version paused ~1.6s here before tearing the socket
      // down, which both made every turn feel sluggish and cut off translations that were still
      // in flight.
      engineRef.current?.markAudioPause();
      setInterimTranscript(t.translating);
      handleStopListen({ keepStatus: true });
      // "Translating..." is normally cleared by the arriving translation, but nothing arrives when
      // the microphone picked up no speech at all -- and the message then sat there forever.
      if (statusWatchdogRef.current) clearTimeout(statusWatchdogRef.current);
      statusWatchdogRef.current = setTimeout(() => {
        statusWatchdogRef.current = null;
        setInterimTranscript(prev => (prev === t.translating ? '' : prev));
      }, 6000);
      return;
    }
    handleStartListen(speaker);
  };

  /**
   * Accepts a language suggestion: repoints that side, and re-translates the utterance that
   * triggered it so the wrong-direction message on screen is corrected rather than left behind.
   */
  const acceptLangSuggestion = async () => {
    const suggestion = langSuggestion;
    if (!suggestion) return;
    setLangSuggestion(null);

    const { side, code } = suggestion;
    const otherSide: 'staff' | 'worker' = side === 'staff' ? 'worker' : 'staff';
    const otherLang = side === 'staff' ? workerLangRef.current : staffLangRef.current;

    // Two different mistakes lead here, and they need opposite corrections.
    const pressedWrongButton = code === otherLang;

    let speaker: 'staff' | 'worker';
    let toLang: string;

    if (pressedWrongButton) {
      // The language spoken is the one the other side is already set to: the person simply tapped
      // the wrong button. Nothing about the languages is wrong, so leave both dropdowns alone and
      // just attribute this turn to the side it actually came from.
      speaker = otherSide;
      toLang = side === 'staff' ? staffLangRef.current : workerLangRef.current;
    } else {
      // A third language: this side really is set to the wrong one.
      speaker = side;
      toLang = otherLang;
      setSideLanguage(side, code);
    }

    const last = lastUtteranceRef.current;
    if (!last || last.speaker !== side || !last.originalText) {
      console.warn('No matching utterance to re-translate.', last, side);
      return;
    }
    console.warn(`re-translating "${last.originalText}" as ${code} -> ${toLang}`);
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: last.originalText,
          fromLang: code,
          toLang,
          useRuby: settingsRef.current.useRuby,
        }),
      });
      if (!res.ok) {
        // 429 is the daily cap on this endpoint; anything else is a server error.
        console.error(`re-translation failed: HTTP ${res.status}`);
        setNetworkError(`⚠️ ${t.retranslateFailed}`);
        setTimeout(() => setNetworkError(null), 6000);
        return;
      }
      const data = await res.json();
      const corrected: string | undefined = data?.translatedText;
      if (!data?.success || !corrected || /^\[[a-z]{2}\]\s/i.test(corrected)) {
        console.error('re-translation returned nothing usable:', data);
        return;
      }
      console.warn('re-translated:', corrected);

      setMessages(prev => {
        const idx = prev.findIndex(m => m.id === last.msgId);
        if (idx === -1) return prev;
        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          sender: speaker,
          translatedText: corrected.trim(),
          fromLang: code,
          toLang,
        };
        return updated;
      });
    } catch (e) {
      console.error('Could not re-translate after language switch:', e);
    }
  };

  const dismissLangSuggestion = () => {
    if (langSuggestion) {
      // Remember the refusal so the same question isn't asked again and again.
      dismissedSuggestionsRef.current.add(`${langSuggestion.side}:${langSuggestion.code}`);
    }
    setLangSuggestion(null);
  };

  const clearHistory = () => {
    shutdownSessions();
    setMessages([]);
    setInterimTranscript('');
  };

  return (
    <div className="flex flex-col h-viewport max-w-md mx-auto bg-slate-950 text-slate-100 border-x border-slate-900/80 shadow-[0_0_50px_-12px_rgba(99,102,241,0.15)] relative overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950/15 via-slate-950 to-slate-950">
      {/* Top Header */}
      <header className="h-16 shrink-0 flex items-center justify-between px-5 bg-slate-950/80 border-b border-slate-900/60 backdrop-blur-md z-20">
        <div className="flex items-center gap-2.5">
          {/* The app's own mark, the same one on the home screen and the browser tab. This used to
              be a stock sparkle in a purple gradient tile -- a generic "this is AI" badge that said
              nothing about what Talkie does and matched none of the icons. */}
          <Mark className="w-9 h-9 shrink-0" />
          <div>
            <h1 className="text-sm font-black tracking-wider text-slate-100 uppercase">Talkie</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">AI Live Active</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <AccountButton t={t} />

          <button
            onClick={clearHistory}
            title={t.clearHistory}
            className="p-2 rounded-xl bg-slate-900/80 border border-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition-all cursor-pointer hover:scale-105 active:scale-95"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => setIsSettingsOpen(true)}
            title={t.settings}
            className="p-2 rounded-xl bg-slate-900/80 border border-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition-all cursor-pointer hover:scale-105 active:scale-95"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Language Selector Ribbon */}
      {/* A grid rather than a flex row: with 78 languages the options include names as long as
          "Português (Brasil)", and a select sizes itself to its widest option. Laid out with flex it
          pushed the second one off the right edge of the screen. Two equal columns that are allowed
          to shrink (min-w-0) keep both on screen whatever is chosen. */}
      <div className="bg-slate-900/30 border-b border-slate-900/60 px-3 py-2.5 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 text-xs z-10 shrink-0 backdrop-blur-md">
        <div className="flex flex-col gap-1 min-w-0">
          <span className="font-black text-[9px] text-indigo-400 uppercase tracking-wider px-0.5">
            {t.sideA}
          </span>
          <select
            value={staffLang}
            onChange={(e) => setSideLanguage('staff', e.target.value)}
            className="w-full min-w-0 bg-slate-950 border border-slate-800 rounded-xl py-1.5 pl-2 pr-1 font-bold text-slate-200 outline-none cursor-pointer hover:border-indigo-500/50 focus:border-indigo-500/60 transition-colors truncate"
          >
            {LANGUAGES.map(l => (
              <option key={l.code} value={l.code}>{`${l.flag} ${l.name}`}</option>
            ))}
          </select>
        </div>

        <div className="w-8 h-8 mt-4 rounded-full bg-slate-950 border border-slate-900 flex items-center justify-center shrink-0">
          <Languages className="w-3.5 h-3.5 text-slate-500" />
        </div>

        <div className="flex flex-col gap-1 min-w-0">
          <span className="font-black text-[9px] text-emerald-400 uppercase tracking-wider px-0.5">
            {t.sideB}
          </span>
          <select
            value={workerLang}
            onChange={(e) => setSideLanguage('worker', e.target.value)}
            className="w-full min-w-0 bg-slate-950 border border-slate-800 rounded-xl py-1.5 pl-2 pr-1 font-bold text-slate-200 outline-none cursor-pointer hover:border-emerald-500/50 focus:border-emerald-500/60 transition-colors truncate"
          >
            {LANGUAGES.map(l => (
              <option key={l.code} value={l.code}>{`${l.flag} ${l.name}`}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Free allowance used up. Someone who has not signed in is told what that would give them --
          it is the only place the larger allowance is worth mentioning, since it is exactly the
          moment it becomes useful. */}
      {limitReached && (
        <div className="bg-amber-950/80 border-b border-amber-900/50 px-5 py-3 text-xs text-amber-200 font-medium flex items-center justify-between gap-3 shrink-0 z-10">
          <span>⚠️ {signedIn ? t.limitReached : t.limitReachedSignIn}</span>
          <span className="flex items-center gap-2 shrink-0">
            {!signedIn && (
              <button
                onClick={() => signIn('google')}
                className="bg-amber-500 hover:bg-amber-400 text-amber-950 font-black px-3 py-1.5 rounded-xl transition-all cursor-pointer"
              >
                {t.signIn}
              </button>
            )}
            <button
              onClick={() => setLimitReached(false)}
              className="text-amber-400 hover:text-amber-300 font-bold cursor-pointer"
            >
              {t.close}
            </button>
          </span>
        </div>
      )}

      {/* Language suggestion -- offered, never applied automatically */}
      {langSuggestion && (
        <div className="bg-indigo-950/70 border-b border-indigo-800/50 px-5 py-3 text-xs text-indigo-100 font-medium flex items-center justify-between gap-3 animate-in fade-in duration-200 shrink-0 z-10">
          <span className="flex items-center gap-2">
            <Languages className="w-4 h-4 shrink-0 text-indigo-300" />
            {t.langAsk(langLabel(langSuggestion.code))}
          </span>
          <span className="flex items-center gap-2 shrink-0">
            <button
              onClick={acceptLangSuggestion}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer"
            >
              {t.langYes}
            </button>
            <button
              onClick={dismissLangSuggestion}
              className="text-indigo-300 hover:text-indigo-100 font-bold px-2 cursor-pointer"
            >
              {t.langNo}
            </button>
          </span>
        </div>
      )}

      {/* Chat Conversation Timeline */}
      <Timeline t={t} messages={messages} onSpeak={playSpeech} />

      {/* Interim transcription card (shows text while talking) */}
      {interimTranscript && (
        <div className="absolute left-4 right-4 bottom-32 bg-slate-900/90 border border-slate-800 p-3.5 rounded-2xl shadow-xl z-20 backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider mb-1">
            {`${langLabel(activeSpeaker === 'staff' ? staffLang : workerLang)} · ${t.speaking}`}
          </div>
          <p className="text-sm font-bold text-slate-100 leading-relaxed italic">
            "{interimTranscript}"
          </p>
        </div>
      )}

      {/* Speech Control Dock */}
      <div className="bg-slate-950/95 border-t border-slate-900/80 p-5 shrink-0 space-y-4 backdrop-blur-md z-10">
        <div className="flex items-center justify-between gap-4">

          {/* Staff (Japanese) */}
          <div className="flex-1 flex flex-col items-center gap-2">
            <button
              disabled={isListening && activeSpeaker !== 'staff'}
              onClick={() => handleMicButtonClick('staff')}
              className={`w-full py-4 px-4 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all duration-300 shadow-md ${
                isListening && activeSpeaker === 'staff'
                  ? 'bg-red-500 hover:bg-red-400 text-white animate-pulse shadow-red-500/10 cursor-pointer'
                  : isListening
                    ? 'bg-slate-950/20 border border-slate-900 text-slate-700 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white hover:scale-[1.02] shadow-indigo-600/10 cursor-pointer'
              }`}
            >
              {isListening && activeSpeaker === 'staff' ? (
                <MicOff className="w-5 h-5" />
              ) : (
                <Mic className="w-5 h-5" />
              )}
              <span className="text-xs font-black tracking-wide">
                {isListening && activeSpeaker === 'staff' ? t.speakNow : t.speakIn(langLabel(staffLang))}
              </span>
            </button>
            {isListening && activeSpeaker === 'staff' && (
              <div className="w-24">
                <AudioWave isActive={true} colorClass="bg-indigo-400" />
              </div>
            )}
          </div>

          {/* Worker (foreign language) */}
          <div className="flex-1 flex flex-col items-center gap-2">
            <button
              disabled={isListening && activeSpeaker !== 'worker'}
              onClick={() => handleMicButtonClick('worker')}
              className={`w-full py-4 px-4 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all duration-300 shadow-md ${
                isListening && activeSpeaker === 'worker'
                  ? 'bg-red-500 hover:bg-red-400 text-white animate-pulse shadow-red-500/10 cursor-pointer'
                  : isListening
                    ? 'bg-slate-950/20 border border-slate-900 text-slate-700 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white hover:scale-[1.02] shadow-emerald-600/10 cursor-pointer'
              }`}
            >
              {isListening && activeSpeaker === 'worker' ? (
                <MicOff className="w-5 h-5" />
              ) : (
                <Mic className="w-5 h-5" />
              )}
              <span className="text-xs font-black tracking-wide">
                {isListening && activeSpeaker === 'worker' ? t.speakNow : t.speakIn(langLabel(workerLang))}
              </span>
            </button>
            {isListening && activeSpeaker === 'worker' && (
              <div className="w-24">
                <AudioWave isActive={true} colorClass="bg-emerald-400" />
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Diagnostics, only with ?debug=1 in the address. */}
      {debugOnRef.current && debugLines.length > 0 && (
        <div className="absolute inset-x-2 bottom-2 z-50 max-h-[45%] flex flex-col rounded-2xl border border-amber-500/40 bg-slate-950/95 backdrop-blur-md shadow-2xl">
          <div className="flex items-center justify-between px-3 py-2 border-b border-amber-500/20 shrink-0">
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">
              diagnostics
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigator.clipboard?.writeText(debugLines.join('\n'))}
                className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-200"
              >
                コピー
              </button>
              <button
                onClick={() => setDebugLines([])}
                className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300"
              >
                消去
              </button>
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2 space-y-0.5">
            {debugLines.map((line, i) => (
              <p key={i} className="text-[10px] leading-relaxed font-mono text-slate-300 break-all">
                {line}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Settings Modal */}
      <SettingsModal
        t={t}
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        speechSpeed={speechSpeed}
        setSpeechSpeed={setSpeechSpeed}
        autoPlayAudio={autoPlayAudio}
        setAutoPlayAudio={setAutoPlayAudio}
        useRuby={useRuby}
        setUseRuby={setUseRuby}
      />

    </div>
  );
}