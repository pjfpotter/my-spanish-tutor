'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { SPEEDS } from '../../../../lib/audio/speeds';
import { summariseBaseline, type BaselineRow } from '../../../../lib/diagnostics/baseline';
import { clipUrls, type BuiltClip } from '../../../../lib/tele/clips';
import { buildOptions, type Option } from '../../../../lib/understand/speed';
import { Status } from '../../../../lib/ui/Status';
import { SectionNav } from '../../../components/SectionNav';
import { Win } from '../../../components/Win';
import '../../../components/screens.css';

interface Q {
  id: string;
  position: number;
  spanish: string;
  english: string;
}

/** Where to pick up: the first question not yet answered, so closing the page does not lose the work. */
function startIndex(done: BaselineRow[], questions: Q[]): number {
  const answered = new Set(done.filter((r) => r.stage === 'pre').map((r) => r.questionId));
  const first = questions.findIndex((q) => !answered.has(q.id));
  return first === -1 ? questions.length : first;
}

/**
 * The quick check inside Understand (learning-diagnostics: Understand quick check). One pass: hear each question and
 * pick what it means. Every answer gets a kind reply, and the check ends on a results screen with a next step.
 * Nothing here is a mark. Questions understood here are skipped in Understand only.
 */
export function QuickCheck({ questions, done }: { questions: Q[]; done: BaselineRow[] }) {
  const [rows, setRows] = useState(done);
  const [index, setIndex] = useState(() => startIndex(done, questions));
  const [heard, setHeard] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const clips = useRef<readonly BuiltClip[]>([]);
  const [clipsReady, setClipsReady] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    fetch('/api/clips').then((r) => (r.ok ? r.json() : [])).catch(() => []).then((list: BuiltClip[]) => {
      clips.current = list;
      setClipsReady(true);
    });
  }, []);

  const slotOf = (q: Q, speed: number) => clips.current.find((c) => c.text === q.spanish && c.speed === speed)?.slot ?? null;
  function play(q: Q, speed: number) {
    const slot = slotOf(q, speed);
    if (!slot) return false;
    audio.current?.pause();
    audio.current = new Audio(clipUrls(slot).audio);
    void audio.current.play().catch(() => {});
    return true;
  }

  const finished = index >= questions.length;
  const q = finished ? null : questions[index];
  // The choices are shuffled, so they are made after the page loads: shuffling during the server render would not match the browser.
  const [options, setOptions] = useState<Option[]>([]);
  const qId = q?.id;
  useEffect(() => setOptions(qId ? buildOptions(questions, qId) : []), [qId, questions]);
  // With no clip for this question the text is shown instead, so the check can still be done.
  const textFallback = !!q && clipsReady && !slotOf(q, SPEEDS.normal);

  async function choose(id: string) {
    if (!q || picked) return;
    setPicked(id);
    setMessage(null);
    const correct = id === q.id;
    try {
      const res = await fetch('/api/baseline', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ questionId: q.id, stage: 'pre', correct }) });
      if (!res.ok) throw new Error('save failed');
    } catch {
      setMessage('That did not save. Check your connection and try again.');
      setPicked(null);
      return;
    }
    setRows((r) => [...r.filter((x) => x.questionId !== q.id), { questionId: q.id, stage: 'pre', correct }]);
  }

  function next() {
    setPicked(null);
    setHeard(false);
    setIndex((i) => i + 1);
  }

  const correct = !!q && picked === q.id;
  const summary = summariseBaseline(rows, questions.map((x) => x.id));
  const toLearn = questions.filter((x) => summary.toLearn.includes(x.id));
  const allKnown = summary.known === summary.total;

  return (
    <main className="screen">
      <SectionNav />
      <h1>Quick check</h1>
      <Win title="Quick check" label="Quick check">
        <div className="stack">
          {q && (
            <>
              <p className="muted" data-testid="baseline-progress">
                Question {index + 1} of {questions.length}. This is not a mark.
              </p>
              <p><strong>What does the question mean?</strong></p>
              {textFallback ? (
                <p className="heard-text" lang="es" data-testid="baseline-text">{q.spanish}</p>
              ) : (
                <button type="button" className="btn btn-primary" onClick={() => { play(q, SPEEDS.normal); setHeard(true); }} disabled={!clipsReady || correct}>
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
                <p role="status" data-testid="baseline-feedback">
                  {correct ? (
                    <><Status kind="done" label="Correct" /> You know this one.</>
                  ) : (
                    <><Status kind="retry" label="Not yet" /> It means “{q.english}”. We will learn this one together.</>
                  )}
                </p>
              )}
              {picked && (
                <button type="button" className="btn btn-primary" onClick={next}>
                  {index + 1 < questions.length ? 'Next question' : 'See my results'}
                </button>
              )}
            </>
          )}

          {finished && (
            <div className="stack" data-testid="baseline-summary">
              <Status kind="done" label="Quick check done" />
              <p data-testid="baseline-score">
                {allKnown ? 'You understood all ' : 'You already understand '}
                <strong>{summary.known}</strong> of {summary.total} questions.
              </p>
              {allKnown ? (
                <p>Brilliant. You can skip learning what the questions mean and go straight to the next step.</p>
              ) : (
                <>
                  <p>These ones are worth a listen:</p>
                  <ul className="stack" data-testid="to-learn">
                    {toLearn.map((x) => (
                      <li key={x.id}>
                        <p className="heard-text" lang="es">{x.spanish}</p>
                        <p className="heard-en">{x.english}</p>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              <div className="controls">
                <Link className="btn btn-primary" href={allKnown ? '/phases/write' : '/phases/understand?start=1'} data-testid="baseline-next">
                  {allKnown ? 'Next: write your answers' : `Learn ${toLearn.length === 1 ? 'this question' : `these ${toLearn.length} questions`}`}
                </Link>
                <Link className="btn" href="/">Back to the desktop</Link>
              </div>
            </div>
          )}

        </div>
      </Win>
    </main>
  );
}
