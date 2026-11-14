'use client';

// Design lab for the upload screen and the correction notice (tasks 4.8 and 4.9). Not linked from the app.
// It replays a scripted upload so the screen can be seen and tested without a model. ?scenario= one of
// success, repair, fallback, blocked, unreadable, fail-then-ok. ?ms= the length of each stage. ?corrections=0 shows the notice with nothing corrected.
import { useCallback, useEffect, useRef, useState } from 'react';
import { CorrectionNotice } from '../../components/sheets/CorrectionNotice';
import { UploadProgress } from '../../components/sheets/UploadProgress';
import type { CorrectionNotice as Correction, Stage } from '../../../lib/sheets/ingest';
import { describeResult, FAILURE_MESSAGE } from '../../../lib/sheets/progress';

const SAMPLE: Correction[] = [
  { chunk: 'a:1', field: 'es', original: 'marrónes', corrected: 'marrones', type: 'spelling' },
  { chunk: 'b:0', field: 'en', original: null, corrected: 'normally', type: 'missing-english' },
  { chunk: 'c:2', field: 'es', original: 'un pared', corrected: 'una pared', type: 'agreement' },
];
const SCRIPTS: Record<string, Stage[]> = {
  success: ['read', 'draft', 'check', 'pairs', 'done'],
  repair: ['read', 'draft', 'check', 'repair', 'check', 'pairs', 'done'],
  fallback: ['read', 'draft', 'check', 'repair', 'check', 'repair', 'done'],
  blocked: ['read'],
  unreadable: ['read'],
  'fail-then-ok': ['read', 'draft'],
};

export default function SheetUploadLab() {
  const [stage, setStage] = useState<Stage>('read');
  const [problem, setProblem] = useState<{ message: string; canRetry: boolean } | null>(null);
  const [note, setNote] = useState<string | undefined>();
  const [finished, setFinished] = useState(false);
  const retries = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const run = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setProblem(null); setNote(undefined); setFinished(false); setStage('read');
    const q = new URLSearchParams(window.location.search);
    const scenario = q.get('scenario') ?? 'success', ms = Number(q.get('ms') ?? 600), steps = scenario === 'fail-then-ok' && retries.current > 0 ? SCRIPTS.success : (SCRIPTS[scenario] ?? SCRIPTS.success);
    steps.forEach((s, i) => timers.current.push(setTimeout(() => setStage(s), i * ms)));
    timers.current.push(setTimeout(() => {
      const outcome = scenario === 'blocked' ? describeResult({ status: 'blocked' }) : scenario === 'unreadable' ? describeResult({ status: 'unreadable' }) : null;
      if (outcome?.kind === 'problem') setProblem({ message: outcome.message, canRetry: outcome.canRetry });
      else if (scenario === 'fail-then-ok' && retries.current === 0) setProblem({ message: FAILURE_MESSAGE, canRetry: true });
      else {
        const fb = scenario === 'fallback' ? describeResult({ status: 'fallback' }) : null;
        if (fb?.kind === 'fallback') setNote(fb.note);
        setFinished(true);
      }
    }, steps.length * ms));
  }, []);

  const retry = useCallback(() => { retries.current++; run(); }, [run]);
  useEffect(() => { run(); return () => timers.current.forEach(clearTimeout); }, [run]);

  return (
    <main className="screen">
      <h1>Sheet upload (lab)</h1>
      <UploadProgress stage={stage} problem={problem?.message} canRetry={problem?.canRetry} note={note} onRetry={retry} messageMs={400} />
      {finished && <CorrectionNotice corrections={typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('corrections') === '0' ? [] : SAMPLE} />}
    </main>
  );
}
