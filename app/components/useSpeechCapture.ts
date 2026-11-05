'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createVoiceDetector, DEFAULT_VOICE, levelOf } from '../../lib/automate/onset';
import { chooseRecognitionPath, detectCapabilities, type RecognitionPath } from '../../lib/speech/path';

export type CaptureState =
  | 'checking'
  | 'idle'
  | 'listening'
  | 'processing'
  /** The student said no, or the browser blocked the microphone. */
  | 'denied'
  /** This browser cannot capture speech at all. */
  | 'unsupported'
  /** The recogniser could not be reached (cap reached, network). The attempt is not scored. */
  | 'unavailable';

export type CaptureResult =
  /** `onsetAt` is performance.now() when the student started speaking (round mode), or null if it could not be told. */
  | { status: 'ok'; transcript: string; confidence: number | null; path: RecognitionPath; clipMs: number; onsetAt: number | null }
  /** Heard nothing clear. Never penalised: the caller offers a retry (task 5.5). */
  | { status: 'unclear'; path: RecognitionPath; onsetAt: number | null };

/** Longest a spoken answer is recorded for. Test answers are a sentence or two. */
export const MAX_RECORD_MS = 15_000;

export interface CaptureOptions {
  /**
   * A timed round (task 9.2). The microphone stays open between questions once `prepare()` has been called,
   * so speech that starts straight after a question is not missed. The hook reports when speech started and
   * stops by itself after a pause. The microphone is closed by `release()`.
   */
  round?: boolean;
  /** Called the moment speech starts, with performance.now(). The timed round uses it to stop the window clock. */
  onOnset?: (at: number) => void;
}

type Recogniser = {
  lang: string; continuous: boolean; interimResults: boolean; maxAlternatives: number;
  onresult: ((e: any) => void) | null; onerror: ((e: any) => void) | null; onend: (() => void) | null; onspeechstart: (() => void) | null;
  start(): void; stop(): void; abort(): void;
};

/**
 * Captures a spoken answer (task 5.1). Which recogniser it uses comes from the device matrix, and
 * the feedback shown is the same either way. Audio is held in memory, sent for a transcript and
 * dropped: it is never stored. Permission is only asked for when the student presses the button,
 * after the screen has explained why.
 */
export function useSpeechCapture(onResult: (r: CaptureResult) => void, options: CaptureOptions = {}) {
  const round = options.round === true;
  const onOnset = useRef(options.onOnset);
  onOnset.current = options.onOnset;
  const [state, setState] = useState<CaptureState>('checking');
  const [path, setPath] = useState<RecognitionPath>('unsupported');
  const stopRef = useRef<() => void>(() => {});
  const cancelRef = useRef<() => void>(() => {});
  const cb = useRef(onResult);
  cb.current = onResult;

  // Round mode: the open microphone and the voice detector reading it.
  const warm = useRef<{ stream: MediaStream; ctx: AudioContext; timer: ReturnType<typeof setInterval> } | null>(null);
  const detector = useRef(createVoiceDetector(DEFAULT_VOICE));
  const onsetAt = useRef<number | null>(null);
  const onEvent = useRef<((type: 'onset' | 'end') => void) | null>(null);

  useEffect(() => {
    const p = chooseRecognitionPath(detectCapabilities(), navigator.userAgent);
    setPath(p);
    setState(p === 'unsupported' ? 'unsupported' : 'idle');
  }, []);

  const closeWarm = useCallback(() => {
    const w = warm.current;
    if (!w) return;
    clearInterval(w.timer);
    w.stream.getTracks().forEach((t) => t.stop()); // the microphone light goes off at once
    void w.ctx.close().catch(() => {});
    warm.current = null;
  }, []);
  useEffect(() => closeWarm, [closeWarm]);

  const finish = useCallback((r: CaptureResult) => {
    setState('idle');
    cb.current(r);
  }, []);

  /** Opens the microphone and starts reading its level. Returns false if the student said no or there is none. */
  const openStream = useCallback(async (): Promise<MediaStream | null> => {
    if (warm.current) return warm.current.stream;
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      const name = (e as Error).name;
      setState(name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : name === 'NotFoundError' ? 'unsupported' : 'denied');
      return null;
    }
    if (round) {
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const buf = new Uint8Array(analyser.fftSize);
      detector.current = createVoiceDetector(DEFAULT_VOICE);
      const timer = setInterval(() => {
        analyser.getByteTimeDomainData(buf);
        const now = performance.now();
        const e = detector.current.feed(levelOf(buf), now);
        if (e?.type === 'onset') {
          onsetAt.current = e.at;
          onOnset.current?.(e.at);
        }
        if (e) onEvent.current?.(e.type);
      }, 20);
      warm.current = { stream, ctx, timer };
    }
    return stream;
  }, [round]);

  const startServer = useCallback(async () => {
    const stream = await openStream();
    if (!stream) return;
    const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find((m) => MediaRecorder.isTypeSupported(m));
    const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    const chunks: Blob[] = [];
    const t0 = performance.now();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;
    onsetAt.current = null;
    recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    recorder.onstop = async () => {
      clearTimeout(timer);
      onEvent.current = null;
      if (!round) stream.getTracks().forEach((t) => t.stop()); // the microphone light goes off at once
      if (cancelled) {
        chunks.length = 0;
        return setState('idle');
      }
      const clipMs = Math.round(performance.now() - t0);
      const onset = onsetAt.current;
      const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
      chunks.length = 0;
      setState('processing');
      try {
        const res = await fetch('/api/transcribe', { method: 'POST', headers: { 'content-type': blob.type, 'x-clip-ms': String(clipMs) }, body: blob });
        const data = await res.json();
        if (data.status === 'ok') {
          const transcript = String(data.transcript ?? data.text ?? '').trim();
          return transcript ? finish({ status: 'ok', transcript, confidence: data.confidence ?? null, path: 'server', clipMs, onsetAt: onset }) : finish({ status: 'unclear', path: 'server', onsetAt: onset });
        }
        // Cap reached, rate limited, or the vendor failed: not the student's fault, so not scored.
        setState(data.status === 'rejected' ? 'idle' : 'unavailable');
        if (data.status === 'rejected') finish({ status: 'unclear', path: 'server', onsetAt: onset });
      } catch {
        setState('unavailable');
      }
    };
    stopRef.current = () => recorder.state !== 'inactive' && recorder.stop();
    cancelRef.current = () => {
      cancelled = true;
      if (recorder.state !== 'inactive') recorder.stop();
      else setState('idle');
    };
    if (round) {
      detector.current.arm();
      onEvent.current = (type) => type === 'end' && stopRef.current(); // a pause after speaking ends the answer
    }
    try {
      recorder.start();
    } catch {
      // A microphone that will not record is not the student's fault: say so and let them try again.
      onEvent.current = null;
      closeWarm();
      return setState('unavailable');
    }
    setState('listening');
    timer = setTimeout(() => stopRef.current(), MAX_RECORD_MS);
  }, [closeWarm, finish, openStream, round]);

  const startBrowser = useCallback(() => {
    const w = window as any;
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    const r: Recogniser = new Ctor();
    r.lang = 'es-ES';
    r.continuous = false;
    r.interimResults = false;
    r.maxAlternatives = 1;
    const t0 = performance.now();
    let best: { transcript: string; confidence: number } | null = null;
    let denied = false;
    let cancelled = false;
    let onset: number | null = null;
    r.onspeechstart = () => {
      onset = performance.now();
      onOnset.current?.(onset);
    };
    r.onresult = (e) => {
      const res = e.results[e.results.length - 1];
      if (res?.isFinal) best = { transcript: res[0].transcript, confidence: res[0].confidence };
    };
    r.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') denied = true;
    };
    r.onend = () => {
      if (denied) return setState('denied');
      if (cancelled) return setState('idle');
      const clipMs = Math.round(performance.now() - t0);
      const b = best as { transcript: string; confidence: number } | null;
      finish(b?.transcript.trim() ? { status: 'ok', transcript: b.transcript.trim(), confidence: b.confidence ?? null, path: 'browser', clipMs, onsetAt: onset } : { status: 'unclear', path: 'browser', onsetAt: onset });
    };
    stopRef.current = () => r.stop();
    cancelRef.current = () => {
      cancelled = true;
      r.abort();
    };
    setState('listening');
    r.start();
  }, [finish]);

  const start = useCallback(() => {
    if (path === 'unsupported') return setState('unsupported');
    if (path === 'server') void startServer();
    else startBrowser();
  }, [path, startServer, startBrowser]);

  /** Round mode: asks for the microphone now, from a tap, so every question after it can start listening at once. */
  const prepare = useCallback(async (): Promise<boolean> => {
    if (path === 'unsupported') return false;
    if (path === 'browser') return true; // the browser asks the first time it listens
    return (await openStream()) !== null;
  }, [path, openStream]);

  const stop = useCallback(() => stopRef.current(), []);
  /** Stops listening and throws the recording away without scoring it: used when the window ends in silence. */
  const cancel = useCallback(() => cancelRef.current(), []);
  /** Closes the microphone at the end of a round. */
  const release = useCallback(() => closeWarm(), [closeWarm]);
  /** Clears a denied or unavailable state so the student can try again. */
  const retry = useCallback(() => setState(path === 'unsupported' ? 'unsupported' : 'idle'), [path]);

  return { state, path, start, stop, cancel, prepare, release, retry };
}
