'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { levelOf } from '../../lib/automate/onset';
import { freshStats, type LiveStats } from '../../lib/speech/latency';

export type LiveState =
  | 'idle'
  | 'starting'
  | 'listening'
  /** The browser wants a tap before it will listen again. */
  | 'needs-tap'
  /** The student said no, or the browser blocked the microphone. */
  | 'denied'
  /** The recogniser could not be reached. Nothing is scored. */
  | 'unavailable'
  /** This browser has no built-in recogniser. */
  | 'unsupported';

export interface LiveHandlers {
  /** Everything understood since `start()`, settled words then the current guess. Called on every change. */
  onTranscript: (text: string) => void;
  /** Microphone loudness, 0 to 1, about twenty times a second. Only with the level meter on. */
  onLevel?: (level: number) => void;
  /** The student's voice is being heard right now (from the meter, or from the recogniser's own events). */
  onVoice?: () => void;
  /** The browser's own voice detection says speech has begun (not the level meter). Used to time the recogniser. */
  onSpeechStart?: () => void;
  /** Listening came back after the screen locked or the app went to the background. */
  onResume?: () => void;
}

type Recogniser = {
  lang: string; continuous: boolean; interimResults: boolean; maxAlternatives: number;
  onresult: ((e: any) => void) | null; onerror: ((e: any) => void) | null; onend: (() => void) | null; onstart: (() => void) | null;
  onsoundstart: (() => void) | null; onspeechstart: (() => void) | null;
  start(): void; stop(): void; abort(): void;
};

const VOICE_LEVEL = 0.04;
/** An error this soon after the page was hidden is the lock or the background taking the microphone, not a fault. */
const HIDDEN_GRACE_MS = 3000;

/**
 * Listens and reports words while the student is still speaking, so the screen can show it is hearing them.
 * It uses the browser's built-in recogniser with interim results, restarted quietly whenever the browser ends
 * a session, so one `start()` listens until `stop()`. With `meter` on it also reads the microphone level, which
 * moves at once and never depends on the recogniser. Audio is never recorded or stored.
 *
 * Some phones cannot share the microphone between the recogniser and a level meter, so the meter is a switch.
 */
export function useLiveSpeech(handlers: LiveHandlers, opts: { lang?: string; meter?: boolean } = {}) {
  const h = useRef(handlers);
  h.current = handlers;
  const lang = opts.lang ?? 'es-ES';
  const wantMeter = opts.meter === true;
  const [state, setState] = useState<LiveState>('idle');
  const [supported, setSupported] = useState(true);
  const [meterOn, setMeterOn] = useState(false);
  const rec = useRef<Recogniser | null>(null);
  const run = useRef(0);
  const active = useRef(false);
  const granted = useRef(false);
  const mic = useRef<{ stream: MediaStream; ctx: AudioContext; timer: ReturnType<typeof setInterval> } | null>(null);
  const stats = useRef<LiveStats>(freshStats());
  /** Listening was paused because the page was hidden, and should carry on when it is back. */
  const suspended = useRef(false);
  const hiddenAt = useRef(-Infinity);
  /** Opens a fresh recogniser session for the current `start()`, keeping the words heard so far. */
  const reopen = useRef<(() => void) | null>(null);

  useEffect(() => {
    const w = window as any;
    const ok = Boolean(w.SpeechRecognition ?? w.webkitSpeechRecognition);
    setSupported(ok);
    if (!ok) setState('unsupported');
  }, []);

  const closeMeter = useCallback(() => {
    const m = mic.current;
    if (!m) return;
    clearInterval(m.timer);
    m.stream.getTracks().forEach((t) => t.stop());
    void m.ctx.close().catch(() => {});
    mic.current = null;
    setMeterOn(false);
  }, []);

  const openMeter = useCallback(async () => {
    if (mic.current || !navigator.mediaDevices?.getUserMedia) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const buf = new Uint8Array(analyser.fftSize);
      const timer = setInterval(() => {
        analyser.getByteTimeDomainData(buf);
        const level = levelOf(buf);
        h.current.onLevel?.(level);
        if (active.current && level > VOICE_LEVEL) h.current.onVoice?.();
      }, 50);
      mic.current = { stream, ctx, timer };
      setMeterOn(true);
    } catch {
      // No meter: the recogniser's own events still show that it is hearing.
    }
  }, []);

  const stop = useCallback(() => {
    active.current = false;
    suspended.current = false;
    reopen.current = null;
    run.current++;
    const r = rec.current;
    rec.current = null;
    if (r) {
      r.onresult = r.onerror = r.onend = r.onstart = r.onsoundstart = r.onspeechstart = null;
      try { r.abort(); } catch { /* already stopped */ }
    }
    setState((s) => (s === 'listening' || s === 'starting' || s === 'needs-tap' ? 'idle' : s));
  }, []);

  const start = useCallback(() => {
    const w = window as any;
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) return setState('unsupported');
    stop();
    active.current = true;
    const first = ++run.current;
    stats.current = freshStats();
    const startedAt = performance.now();
    if (wantMeter) void openMeter();
    else closeMeter();
    let settled = ''; // final words from sessions the browser has already ended

    /** The page is hidden, or an error came just after it was: wait for the student to come back. */
    const hiddenNow = () => document.visibilityState === 'hidden' || performance.now() - hiddenAt.current < HIDDEN_GRACE_MS;

    const open = (mine: number) => {
      if (mine !== run.current || !active.current) return;
      stats.current.sessions++;
      const r: Recogniser = new Ctor();
      r.lang = lang;
      r.continuous = true;
      r.interimResults = true;
      r.maxAlternatives = 1;
      let finals = '';
      r.onstart = () => {
        if (mine !== run.current) return;
        granted.current = true;
        setState('listening');
      };
      r.onsoundstart = r.onspeechstart = () => {
        if (mine !== run.current) return;
        h.current.onVoice?.();
        h.current.onSpeechStart?.();
      };
      r.onresult = (e) => {
        if (mine !== run.current) return;
        let fin = '';
        let interim = '';
        for (let i = 0; i < e.results.length; i++) {
          const res = e.results[i];
          if (res.isFinal) fin += ` ${res[0].transcript}`;
          else interim += ` ${res[0].transcript}`;
        }
        if (stats.current.firstResultMs === null) stats.current.firstResultMs = Math.round(performance.now() - startedAt);
        if (interim.trim()) stats.current.interims++;
        else stats.current.finals++;
        finals = fin;
        h.current.onVoice?.();
        h.current.onTranscript(`${settled}${fin}${interim}`.trim());
      };
      r.onerror = (e) => {
        if (mine !== run.current) return;
        if (!stats.current.errors.includes(e.error)) stats.current.errors.push(e.error);
        // A lock or the background takes the microphone away and the browser reports it as an error. Not a fault.
        if (hiddenNow() && e.error !== 'no-speech') {
          suspended.current = true;
          return;
        }
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
          active.current = false;
          setState(granted.current ? 'needs-tap' : 'denied');
        } else if (e.error === 'network' || e.error === 'audio-capture') {
          active.current = false;
          setState('unavailable');
        }
        // 'no-speech' and 'aborted' are not problems: onend opens the next session.
      };
      r.onend = () => {
        if (mine !== run.current || !active.current) return;
        settled += finals;
        if (hiddenNow()) {
          suspended.current = true;
          return;
        }
        open(mine);
      };
      rec.current = r;
      try {
        r.start();
      } catch {
        active.current = false;
        setState('needs-tap');
      }
    };
    reopen.current = () => {
      if (!active.current) return;
      const mine = ++run.current;
      if (rec.current) {
        const old = rec.current;
        old.onresult = old.onerror = old.onend = old.onstart = old.onsoundstart = old.onspeechstart = null;
        try { old.abort(); } catch { /* already stopped */ }
        rec.current = null;
      }
      if (wantMeter) {
        closeMeter();
        void openMeter();
      }
      open(mine);
    };
    setState('starting');
    open(first);
  }, [closeMeter, lang, openMeter, stop, wantMeter]);

  // A phone that locks or goes to the background takes the microphone. Come back to the same screen listening.
  useEffect(() => {
    const change = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAt.current = performance.now();
        if (active.current) suspended.current = true;
        return;
      }
      if (!suspended.current || !active.current) return;
      suspended.current = false;
      stats.current.resumes++;
      reopen.current?.();
      h.current.onResume?.();
    };
    document.addEventListener('visibilitychange', change);
    return () => document.removeEventListener('visibilitychange', change);
  }, []);

  /** Clears a denied or unavailable state so the student can try again. */
  const retry = useCallback(() => setState(supported ? 'idle' : 'unsupported'), [supported]);

  useEffect(() => () => { stop(); closeMeter(); }, [stop, closeMeter]);

  return { state, supported, meterOn, start, stop, retry, release: closeMeter, stats };
}
