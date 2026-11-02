'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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
  | { status: 'ok'; transcript: string; confidence: number | null; path: RecognitionPath; clipMs: number }
  /** Heard nothing clear. Never penalised: the caller offers a retry (task 5.5). */
  | { status: 'unclear'; path: RecognitionPath };

/** Longest a spoken answer is recorded for. Test answers are a sentence or two. */
export const MAX_RECORD_MS = 15_000;

type Recogniser = {
  lang: string; continuous: boolean; interimResults: boolean; maxAlternatives: number;
  onresult: ((e: any) => void) | null; onerror: ((e: any) => void) | null; onend: (() => void) | null;
  start(): void; stop(): void; abort(): void;
};

/**
 * Captures a spoken answer (task 5.1). Which recogniser it uses comes from the device matrix, and
 * the feedback shown is the same either way. Audio is held in memory, sent for a transcript and
 * dropped: it is never stored. Permission is only asked for when the student presses the button,
 * after the screen has explained why.
 */
export function useSpeechCapture(onResult: (r: CaptureResult) => void) {
  const [state, setState] = useState<CaptureState>('checking');
  const [path, setPath] = useState<RecognitionPath>('unsupported');
  const stopRef = useRef<() => void>(() => {});
  const cb = useRef(onResult);
  cb.current = onResult;

  useEffect(() => {
    const p = chooseRecognitionPath(detectCapabilities(), navigator.userAgent);
    setPath(p);
    setState(p === 'unsupported' ? 'unsupported' : 'idle');
  }, []);

  const finish = useCallback((r: CaptureResult) => {
    setState('idle');
    cb.current(r);
  }, []);

  const startServer = useCallback(async () => {
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      const name = (e as Error).name;
      setState(name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : name === 'NotFoundError' ? 'unsupported' : 'denied');
      return;
    }
    const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find((m) => MediaRecorder.isTypeSupported(m));
    const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    const chunks: Blob[] = [];
    const t0 = performance.now();
    let timer: ReturnType<typeof setTimeout> | undefined;
    recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    recorder.onstop = async () => {
      clearTimeout(timer);
      stream.getTracks().forEach((t) => t.stop()); // the microphone light goes off at once
      const clipMs = Math.round(performance.now() - t0);
      const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
      chunks.length = 0;
      setState('processing');
      try {
        const res = await fetch('/api/transcribe', { method: 'POST', headers: { 'content-type': blob.type, 'x-clip-ms': String(clipMs) }, body: blob });
        const data = await res.json();
        if (data.status === 'ok') {
          const transcript = String(data.transcript ?? data.text ?? '').trim();
          return transcript ? finish({ status: 'ok', transcript, confidence: data.confidence ?? null, path: 'server', clipMs }) : finish({ status: 'unclear', path: 'server' });
        }
        // Cap reached, rate limited, or the vendor failed: not the student's fault, so not scored.
        setState(data.status === 'rejected' ? 'idle' : 'unavailable');
        if (data.status === 'rejected') finish({ status: 'unclear', path: 'server' });
      } catch {
        setState('unavailable');
      }
    };
    stopRef.current = () => recorder.state !== 'inactive' && recorder.stop();
    recorder.start();
    setState('listening');
    timer = setTimeout(() => stopRef.current(), MAX_RECORD_MS);
  }, [finish]);

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
    r.onresult = (e) => {
      const res = e.results[e.results.length - 1];
      if (res?.isFinal) best = { transcript: res[0].transcript, confidence: res[0].confidence };
    };
    r.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') denied = true;
    };
    r.onend = () => {
      if (denied) return setState('denied');
      const clipMs = Math.round(performance.now() - t0);
      const b = best as { transcript: string; confidence: number } | null;
      finish(b?.transcript.trim() ? { status: 'ok', transcript: b.transcript.trim(), confidence: b.confidence ?? null, path: 'browser', clipMs } : { status: 'unclear', path: 'browser' });
    };
    stopRef.current = () => r.stop();
    setState('listening');
    r.start();
  }, [finish]);

  const start = useCallback(() => {
    if (path === 'unsupported') return setState('unsupported');
    if (path === 'server') void startServer();
    else startBrowser();
  }, [path, startServer, startBrowser]);

  const stop = useCallback(() => stopRef.current(), []);
  /** Clears a denied or unavailable state so the student can try again. */
  const retry = useCallback(() => setState(path === 'unsupported' ? 'unsupported' : 'idle'), [path]);

  return { state, path, start, stop, retry };
}
