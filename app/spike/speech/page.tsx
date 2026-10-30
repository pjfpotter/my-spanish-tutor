'use client';

// THROWAWAY spike for task 2.1. Delete once the device matrix (task 2.3) is written.
// Records a Spanish sentence with the browser recogniser and logs what each device does.
import { useEffect, useRef, useState } from 'react';

type Alt = { transcript: string; confidence: number };
type Run = {
  at: string;
  input: string;
  firstResultMs: number | null;
  totalMs: number;
  final: Alt[];
  error: string | null;
};

// The prefixed constructor is not in lib.dom.d.ts, so describe only what the spike uses.
type Recogniser = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: any) => void) | null;
  onerror: ((e: any) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
};

const SENTENCES = ['Me llamo Ana y tengo trece años.', 'Vivo en una casa grande con mi familia.', '¿Qué haces los fines de semana?'];

export default function SpeechSpike() {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [runs, setRuns] = useState<Run[]>([]);
  const [input, setInput] = useState('(not read yet)');
  const [ua, setUa] = useState('');
  const rec = useRef<Recogniser | null>(null);
  const t0 = useRef(0);
  const first = useRef<number | null>(null);
  const finals = useRef<Alt[]>([]);
  const err = useRef<string | null>(null);

  useEffect(() => {
    const w = window as any;
    setSupported(Boolean(w.SpeechRecognition ?? w.webkitSpeechRecognition));
    setUa(navigator.userAgent);
  }, []);

  // Labels are only filled in once the page has microphone permission.
  async function readInput() {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      const track = s.getAudioTracks()[0];
      setInput(track?.label || '(no label)');
      s.getTracks().forEach((t) => t.stop());
    } catch (e) {
      setInput(`blocked: ${(e as Error).name}`);
    }
  }

  function start() {
    const w = window as any;
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    const r: Recogniser = new Ctor();
    r.lang = 'es-ES';
    r.continuous = false;
    r.interimResults = true;
    r.maxAlternatives = 3;
    finals.current = [];
    first.current = null;
    err.current = null;
    setInterim('');
    r.onresult = (e) => {
      if (first.current === null) first.current = Math.round(performance.now() - t0.current);
      let live = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) {
          finals.current = Array.from(res as ArrayLike<Alt>).map((a) => ({ transcript: a.transcript, confidence: a.confidence }));
        } else {
          live += res[0].transcript;
        }
      }
      setInterim(live);
    };
    r.onerror = (e) => {
      err.current = e.error;
    };
    r.onend = () => {
      setListening(false);
      setInterim('');
      setRuns((prev) => [
        {
          at: new Date().toLocaleTimeString(),
          input,
          firstResultMs: first.current,
          totalMs: Math.round(performance.now() - t0.current),
          final: finals.current,
          error: err.current,
        },
        ...prev,
      ]);
    };
    rec.current = r;
    t0.current = performance.now();
    setListening(true);
    r.start();
  }

  const report = [
    ua,
    `input: ${input}`,
    ...runs.map((r) => `${r.at} first=${r.firstResultMs ?? '-'}ms total=${r.totalMs}ms err=${r.error ?? '-'} | ${r.final.map((a) => `${a.transcript} (${a.confidence.toFixed(2)})`).join(' / ') || 'no result'}`),
  ].join('\n');

  return (
    <main style={{ padding: '1rem', maxWidth: '36rem', margin: '0 auto', fontFamily: 'system-ui' }}>
      <h1>Speech spike (task 2.1)</h1>
      <p>Throwaway page. Chrome and Safari may send the audio to their speech service, so say the sample sentences, not anything personal.</p>
      <p>
        <strong>Browser recognition:</strong> {supported === null ? 'checking…' : supported ? 'available' : 'NOT available on this device'}
      </p>
      <p>
        <strong>Microphone in use:</strong> {input}{' '}
        <button onClick={readInput}>Read microphone</button>
      </p>
      <p>Say one of these, then wait for the result:</p>
      <ul>
        {SENTENCES.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>
      <button
        onClick={listening ? () => rec.current?.stop() : start}
        disabled={!supported}
        style={{ fontSize: '1.25rem', padding: '0.75rem 1.5rem' }}
      >
        {listening ? 'Stop' : 'Start speaking'}
      </button>
      <p aria-live="polite" style={{ minHeight: '2rem' }}>
        {listening ? `Listening… ${interim}` : ''}
      </p>
      <h2>Results</h2>
      <ol>
        {runs.map((r, i) => (
          <li key={i}>
            <div>
              {r.at} · first result {r.firstResultMs ?? '-'} ms · finished {r.totalMs} ms{r.error ? ` · error: ${r.error}` : ''}
            </div>
            {r.final.map((a, j) => (
              <div key={j}>
                {j === 0 ? '→' : '·'} {a.transcript} <small>({a.confidence.toFixed(2)})</small>
              </div>
            ))}
            {r.final.length === 0 && <div>no result</div>}
          </li>
        ))}
      </ol>
      <h2>Copy for the device matrix</h2>
      <pre style={{ whiteSpace: 'pre-wrap', userSelect: 'all' }}>{report}</pre>
    </main>
  );
}
