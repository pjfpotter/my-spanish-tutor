'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { SPEEDS } from '../../lib/audio/speeds';
import { summariseBaseline, type BaselineRow, type BaselineStage } from '../../lib/diagnostics/baseline';
import { clipUrls, type BuiltClip } from '../../lib/tele/clips';
import { buildOptions, type Option } from '../../lib/understand/speed';
import { Status } from '../../lib/ui/Status';
import { Win } from '../components/Win';
import '../components/screens.css';

interface Q {
  id: string;
  position: number;
  spanish: string;
  english: string;
}

type Step = { kind: 'test'; stage: BaselineStage; index: number } | { kind: 'teach' } | { kind: 'summary' };

/** Where to pick up: skip a stage already finished, so closing the page does not lose the work. */
function startStep(done: BaselineRow[], total: number): Step {
  const has = (stage: BaselineStage) => done.filter((r) => r.stage === stage).length;
  if (has('post') >= total) return { kind: 'summary' };
  if (has('pre') >= total) return { kind: 'test', stage: 'post', index: has('post') };
  return { kind: 'test', stage: 'pre', index: has('pre') };
}

/**
 * The starting-point check (learning-diagnostics: Starting-point check): hear each question and pick what
 * it means, be shown the meanings, then hear and pick again. Nothing here is a mark. A wrong answer
 * is just where to start, and nothing is penalised or paid out.
 */
export function Baseline({ questions, done }: { questions: Q[]; done: BaselineRow[] }) {
  const [rows, setRows] = useState(done);
  const [step, setStep] = useState<Step>(() => {
    const s = startStep(done, questions.length);
    // Having finished the first test and not the second, the teach screen comes first on a return visit.
    return s.kind === 'test' && s.stage === 'post' && s.index === 0 ? { kind: 'teach' } : s;
  });
  const [heard, setHeard] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const index = useRef<readonly BuiltClip[]>([]);
  const [clipsReady, setClipsReady] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    fetch('/api/clips').then((r) => (r.ok ? r.json() : [])).catch(() => []).then((list: BuiltClip[]) => {
      index.current = list;
      setClipsReady(true);
    });
  }, []);

  const slotOf = (q: Q, speed: number) => index.current.find((c) => c.text === q.spanish && c.speed === speed)?.slot ?? null;
  function play(q: Q, speed: number) {
    const slot = slotOf(q, speed);
    if (!slot) return false;
    audio.current?.pause();
    audio.current = new Audio(clipUrls(slot).audio);
    void audio.current.play().catch(() => {});
    return true;
  }

  const q = step.kind === 'test' ? questions[step.index] : null;
  // The choices are shuffled, so they are made after the page loads: shuffling during the server render would not match the browser.
  const [options, setOptions] = useState<Option[]>([]);
  const qId = q?.id;
  useEffect(() => setOptions(qId ? buildOptions(questions, qId) : []), [qId, questions]);
  // With no clip for this question the text is shown instead, so the check can still be done.
  const textFallback = !!q && clipsReady && !slotOf(q, SPEEDS.normal);

  async function choose(id: string) {
    if (step.kind !== 'test' || !q || picked) return;
    setPicked(id);
    setMessage(null);
    const correct = id === q.id;
    try {
      const res = await fetch('/api/baseline', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ questionId: q.id, stage: step.stage, correct }) });
      if (!res.ok) throw new Error('save failed');
    } catch {
      setMessage('That did not save. Check your connection and try again.');
      setPicked(null);
      return;
    }
    setRows((r) => [...r.filter((x) => !(x.questionId === q.id && x.stage === step.stage)), { questionId: q.id, stage: step.stage, correct }]);
  }

  function next() {
    if (step.kind !== 'test') return;
    setPicked(null);
    setHeard(false);
    if (step.index + 1 < questions.length) setStep({ ...step, index: step.index + 1 });
    else setStep(step.stage === 'pre' ? { kind: 'teach' } : { kind: 'summary' });
  }

  const summary = summariseBaseline(rows, questions.length);

  return (
    <main className="screen">
      <h1>Punto de partida</h1>
      <Win title="inicio.exe" label="Starting point">
        <div className="stack">
          {step.kind === 'test' && q && (
            <>
              <p className="muted" data-testid="baseline-progress">
                {step.stage === 'pre' ? 'First look' : 'Second look'}: question {step.index + 1} of {questions.length}. This is not a mark.
              </p>
              <p><strong>What does the question mean?</strong></p>
              {textFallback ? (
                <p className="heard-text" lang="es" data-testid="baseline-text">{q.spanish}</p>
              ) : (
                <button type="button" className="btn btn-primary" onClick={() => { play(q, SPEEDS.normal); setHeard(true); }} disabled={!clipsReady}>
                  {heard ? 'Play again' : 'Listen'}
                </button>
              )}
              <ul className="options">
                {options.map((o) => (
                  <li key={o.id}>
                    <button type="button" className="option" disabled={!!picked || (!textFallback && !heard)} onClick={() => choose(o.id)}>
                      <span>{o.text}</span>
                    </button>
                  </li>
                ))}
              </ul>
              {message && <p className="error" role="alert">{message}</p>}
              {picked && (
                <button type="button" className="btn btn-primary" onClick={next}>
                  {step.index + 1 < questions.length ? 'Next' : step.stage === 'pre' ? 'Show me what they mean' : 'See how I did'}
                </button>
              )}
            </>
          )}

          {step.kind === 'teach' && (
            <>
              <p><strong>Here is what the five questions mean.</strong> Listen to each, then we try again.</p>
              <ul className="stack" data-testid="teach-list">
                {questions.map((x) => (
                  <li key={x.id}>
                    <p className="heard-text" lang="es">{x.spanish}</p>
                    <p className="heard-en">{x.english}</p>
                    {slotOf(x, SPEEDS.slow) && (
                      <button type="button" className="btn" onClick={() => play(x, SPEEDS.slow)}>Listen slowly</button>
                    )}
                  </li>
                ))}
              </ul>
              <button type="button" className="btn btn-primary" onClick={() => { setStep({ kind: 'test', stage: 'post', index: 0 }); setHeard(false); setPicked(null); }}>
                Try again
              </button>
            </>
          )}

          {step.kind === 'summary' && (
            <div className="stack" data-testid="baseline-summary">
              <Status kind="done" label="Starting point saved" />
              <p>
                First look: <strong>{summary.before}</strong> of {summary.total}. Second look: <strong>{summary.after}</strong> of {summary.total}.
              </p>
              <p>{summary.after > summary.before ? 'You learned some already. The app now knows where to begin.' : 'Now the app knows where to begin. Everything gets easier with practice.'}</p>
              <Link className="btn btn-primary" href="/">Back to the desktop</Link>
            </div>
          )}
        </div>
      </Win>
    </main>
  );
}
