'use client';

import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';
import type { SavedAnswer, WritingCourse } from '../../../lib/progress/writing-store';
import { builderFor } from '../../../lib/progress/writing-store';
import type { Answer } from '../../../lib/sheets/engine';
import { fromSelection, toSelection } from '../../../lib/sheets/selection';
import { SectionNav } from '../../components/SectionNav';
import { WriteSheet } from '../../components/sheets/WriteSheet';
import '../../components/screens.css';

/**
 * The write phase for a course that has a teacher's sentence builder. The student builds each of the
 * five answers on the sheet; an answer is confirmed when it passes the exam-rule check, and the server
 * re-checks it from the chosen chunks. No model is called here. Pick-up view is off unless a student
 * turns it on (task 5.3).
 */
export function SheetWrite({ course, saved, pickup = false, focus = 0 }: { course: WritingCourse; saved: SavedAnswer[]; pickup?: boolean; focus?: number }) {
  const B = useMemo(() => builderFor(course)!, [course]);
  const [index, setIndex] = useState(focus);
  const [confirmed, setConfirmed] = useState(() => new Set(saved.filter((s) => s.confirmed).map((s) => s.questionId)));
  const [error, setError] = useState<string | null>(null);
  const q = course.questions[index];
  const initial = useMemo(() => {
    const mine = saved.find((s) => s.questionId === q.id);
    return mine?.selection ? (fromSelection(B, mine.selection) ?? {}) : {};
  }, [B, saved, q.id]);

  const post = useCallback(async (questionId: string, a: Answer, confirm: boolean) => {
    const res = await fetch('/api/answers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ questionId, selection: toSelection(a), confirm }) }).catch(() => null);
    if (!res) return 'Could not save just now. Your answer is still here; try again in a moment.';
    if (!res.ok) return ((await res.json().catch(() => null)) as { error?: string } | null)?.error ?? 'Could not save that.';
    return null;
  }, []);

  const onChange = (a: Answer) => {
    setConfirmed((c) => { const n = new Set(c); n.delete(q.id); return n; });
    setError(null);
    void post(q.id, a, false).then((e) => e && setError(e));
  };
  const onSignedOff = async (a: Answer) => {
    const e = await post(q.id, a, true);
    if (e) return setError(e);
    setConfirmed((c) => new Set(c).add(q.id));
    if (index < course.questions.length - 1) setIndex(index + 1);
  };
  const all = course.questions.every((x) => confirmed.has(x.id));

  return (
    <main className="screen" style={{ paddingBottom: 0 }}>
      <SectionNav onBack={index > 0 ? () => setIndex(index - 1) : undefined} backLabel="Previous question" />
      <h1 className="sr-only">Write</h1>
      <ol className="dots" aria-label="Your five questions">
        {course.questions.map((x, i) => (
          <li key={x.id}>
            <button type="button" className="btn" aria-current={i === index} onClick={() => setIndex(i)} data-confirmed={confirmed.has(x.id)}>
              {i + 1}<span className="sr-only">{confirmed.has(x.id) ? ' (confirmed)' : ''}</span>{confirmed.has(x.id) ? ' ✓' : ''}
            </button>
          </li>
        ))}
      </ol>
      {error && <p className="error" role="alert">{error}</p>}
      <div style={{ height: 'min(78dvh, 720px)', minHeight: 520 }}>
        <WriteSheet
          key={q.id}
          builder={B}
          sheet={course.sheet!.sheet}
          heading={{ es: q.spanish, en: q.english }}
          initial={initial}
          pickup={pickup}
          onChange={onChange}
          onSignedOff={(_t, _e, a) => void onSignedOff(a)}
        />
      </div>
      <div className="controls">
        {all ? <Link className="btn btn-primary" href="/">All five confirmed. Back to the desktop</Link> : <Link className="btn" href="/">Back to the desktop</Link>}
      </div>
    </main>
  );
}
