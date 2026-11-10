'use client';

import Link from 'next/link';
import { useCallback, useMemo, useRef, useState } from 'react';
import { modelAnswersFor } from '../../../lib/coach/model-answers';
import { applySwap, insertGlue, slotsFor } from '../../../lib/coach/swaps';
import { startingAnswer, viewAnswer, viewWholeTest } from '../../../lib/coach/writing';
import type { SavedAnswer, WritingCourse } from '../../../lib/progress/writing-store';
import { SectionNav } from '../../components/SectionNav';
import { Win } from '../../components/Win';
import '../../components/screens.css';

type Texts = Record<string, string>;

/**
 * The write phase (tasks 7.4 and 7.6; rebuilt in 26.1). Interim version for 26.1a: no styles or levels,
 * only a starter answer, swaps, the answer's value and a confirm. 26.1b replaces it with the empty-slot
 * sentence builder. All judging is by the rubric in the browser; nothing here calls a model.
 */
export function Write({ course, saved }: { course: WritingCourse; saved: SavedAnswer[] }) {
  const [index, setIndex] = useState(0);
  const [texts, setTexts] = useState<Texts>(() => {
    const t: Texts = {};
    for (const q of course.questions) {
      const mine = saved.find((s) => s.questionId === q.id);
      t[q.id] = mine?.text ?? startingAnswer(course, q.position)?.text ?? '';
    }
    return t;
  });
  const [confirmed, setConfirmed] = useState(() => new Set(saved.filter((s) => s.confirmed).map((s) => s.questionId)));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const live = useRef<HTMLParagraphElement>(null);

  const q = course.questions[index];
  const text = texts[q.id] ?? '';
  const view = useMemo(() => viewAnswer(course, text), [course, text]);
  const slots = useMemo(() => slotsFor(text, course.chunks), [course, text]);
  const whole = useMemo(
    () => viewWholeTest(course, course.questions.map((x) => ({ questionPosition: x.position, text: texts[x.id] ?? '' }))),
    [course, texts],
  );
  const start = startingAnswer(course, q.position);
  const isConfirmed = confirmed.has(q.id);
  const glue = course.calibration.glueWords;

  const post = useCallback(async (questionId: string, body: string, confirm: boolean) => {
    const res = await fetch('/api/answers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ questionId, text: body, confirm }) }).catch(() => null);
    if (!res) return 'Could not save just now. Your answer is still here; try again in a moment.';
    if (!res.ok) return ((await res.json().catch(() => null)) as { error?: string } | null)?.error ?? 'Could not save that.';
    return null;
  }, []);

  const change = (next: string) => {
    setTexts((t) => ({ ...t, [q.id]: next }));
    setConfirmed((c) => {
      const n = new Set(c);
      n.delete(q.id); // changing a confirmed answer reopens it
      return n;
    });
    setError(null);
    void post(q.id, next, false).then((e) => e && setError(e));
  };

  const onSlot = (slotIndex: number, value: string) => {
    const slot = slots[slotIndex];
    if (value.startsWith('glue:')) change(insertGlue(text, slot, value.slice(5)));
    else if (value !== slot.current.spanish) change(applySwap(text, slot, value));
  };

  const confirm = async () => {
    setBusy(true);
    const e = await post(q.id, text, true);
    setBusy(false);
    if (e) return setError(e);
    setConfirmed((c) => new Set(c).add(q.id));
    if (live.current) live.current.textContent = 'Answer confirmed.';
  };

  const all = course.questions.every((x) => confirmed.has(x.id));
  const options = modelAnswersFor(course.modelAnswers, q.position, { chunks: course.chunks, cal: course.calibration });

  return (
    <main className="screen">
      <SectionNav onBack={index > 0 ? () => setIndex(index - 1) : undefined} backLabel="Previous question" />
      <h1>Write</h1>
      <Win title="write.exe">
        <div className="stack">
          <ol className="dots" aria-label="Your five questions">
            {course.questions.map((x, i) => (
              <li key={x.id}>
                <button type="button" className="btn" aria-current={i === index} onClick={() => setIndex(i)} data-confirmed={confirmed.has(x.id)}>
                  {i + 1}
                  <span className="sr-only">{confirmed.has(x.id) ? ' (confirmed)' : ''}</span>
                  {confirmed.has(x.id) ? ' ✓' : ''}
                </button>
              </li>
            ))}
          </ol>

          <div>
            <p className="heard-text" lang="es">{q.spanish}</p>
            <p className="heard-en">{q.english}</p>
          </div>

          {!start && <p className="error">No model answer yet for this question. Ask your teacher to add one.</p>}

          <section className="file" aria-label="Your answer">
            <p className="answer-text" lang="es">
              {slots.length ? <Segments text={text} slots={slots} /> : text || 'Pick a model answer to start.'}
            </p>
            <div className="swaps">
              {slots.map((s, i) => (
                <label key={`${s.start}-${s.current.spanish}`} className="swap">
                  <span>Swap “{s.current.spanish}”</span>
                  <select value={s.current.spanish} onChange={(e) => onSlot(i, e.target.value)}>
                    <option value={s.current.spanish}>{s.current.spanish}</option>
                    {s.options.length > 0 && (
                      <optgroup label="Swap for">
                        {s.options.map((o) => (
                          <option key={o.spanish} value={o.spanish}>{o.spanish} ({o.english})</option>
                        ))}
                      </optgroup>
                    )}
                    <optgroup label="Add a linking word after it">
                      {glue.map((g) => (
                        <option key={g} value={`glue:${g}`}>{g}</option>
                      ))}
                    </optgroup>
                  </select>
                </label>
              ))}
            </div>
            {options.length > 1 && (
              <div className="controls">
                {options.map((a, i) => (
                  <button key={a.text} type="button" className="btn" onClick={() => change(a.text)}>
                    Start again from example {i + 1}
                  </button>
                ))}
              </div>
            )}
          </section>

          {view.outOfBank.length > 0 && (
            <p className="error">
              These words are not in your sentence builder: {view.outOfBank.join(', ')}. Swap them out to confirm. They do not count against you.
            </p>
          )}

          <section aria-label="What your answer uses">
            <p className="heard-text">{view.assessment.value > 0 ? `Your answer is worth ${view.assessment.value}.` : 'Add a reason with “porque” and it is ready to go.'}</p>
            <ul className="features">
              {course.calibration.features.map((f) => {
                const on = view.assessment.features.some((x) => x.id === f.id);
                return (
                  <li key={f.id} data-on={on}>
                    <span aria-hidden="true">{on ? '✓' : '○'}</span> {f.label}
                    <span className="sr-only">{on ? ' (used)' : ' (not used)'}</span>
                  </li>
                );
              })}
            </ul>
            {view.loadNote && <p className="heard-en">A longer answer takes more learning. Taking chunks out is fine at any time.</p>}
            {view.suggestion && (
              <p className="heard-en">
                {view.suggestion.text} For example: <span lang="es">{view.suggestion.example}</span>
              </p>
            )}
          </section>

          {error && <p className="error" role="alert">{error}</p>}
          <div className="controls">
            <button type="button" className="btn btn-primary" onClick={confirm} disabled={busy || isConfirmed || !view.canConfirm || !text.trim()}>
              {isConfirmed ? 'Confirmed' : 'Confirm this answer'}
            </button>
            {isConfirmed && <span className="heard-en">Change anything above to reopen it.</span>}
          </div>
          <p ref={live} className="sr-only" role="status" aria-live="polite" />
        </div>
      </Win>

      <Win title="across your answers.exe">
        <ul className="features">
          {Object.values(whole.test.checklist).map((c) => (
            <li key={c.label} data-on={c.met}>
              <span aria-hidden="true">{c.met ? '✓' : '○'}</span> {c.met ? `${c.need} of ${c.need}` : `${c.have} of ${c.need}`} {c.label}
              <span className="sr-only">{c.met ? ' (done)' : ' (not yet)'}</span>
            </li>
          ))}
        </ul>
        <p className="heard-en">These are things to aim for. They never lower an answer.</p>
        {whole.tenseHint && (
          <p className="heard-en">
            If you like, question {whole.tenseHint.questionPosition} is the easiest place to add another tense, for example <span lang="es">{whole.tenseHint.example}</span>.
          </p>
        )}
      </Win>

      <div className="controls">
        {all ? (
          <Link className="btn btn-primary" href="/">All five confirmed. Back to the desktop</Link>
        ) : (
          <Link className="btn" href="/">Back to the desktop</Link>
        )}
      </div>
    </main>
  );
}

/** The answer as text, with each chunk marked so the student can see what the swap menus refer to. */
function Segments({ text, slots }: { text: string; slots: ReturnType<typeof slotsFor> }) {
  const parts: React.ReactNode[] = [];
  let at = 0;
  slots.forEach((s, i) => {
    if (s.start > at) parts.push(text.slice(at, s.start));
    parts.push(<mark key={i}>{text.slice(s.start, s.end)}</mark>);
    at = s.end;
  });
  if (at < text.length) parts.push(text.slice(at));
  return <>{parts}</>;
}
