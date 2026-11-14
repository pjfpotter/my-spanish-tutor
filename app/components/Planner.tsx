'use client';

import Link from 'next/link';
import { useState } from 'react';
import { readiness, type ReadinessInput } from '../../lib/planner/readiness';
import { WINDOW_TITLES } from '../../lib/ui/window-titles';
import { Win } from './Win';

/** The test countdown and readiness meter. After the test date it becomes a short reflection. */
export function ExamWindow({ daysToTest, progress }: { daysToTest: number; progress: ReadinessInput }) {
  const [reflection, setReflection] = useState<'open' | 'done'>('open');
  const r = readiness(progress);
  if (daysToTest < 0) {
    return (
      <Win title={WINDOW_TITLES.speakingTest}>
        <p><strong>How did it go?</strong></p>
        {reflection === 'open' ? (
          <>
            <p>Think of one thing you did well in the test. Nothing is saved or marked.</p>
            <button type="button" className="btn" onClick={() => setReflection('done')}>I thought of one</button>
          </>
        ) : (
          <p data-testid="reflection-done">Good. Hold on to that one.</p>
        )}
        <Link className="btn" href="/phases/understand" data-testid="light-review">Light review</Link>
      </Win>
    );
  }
  return (
    <Win title={WINDOW_TITLES.speakingTest}>
      {daysToTest === 0 ? (
        <>
          <p className="days" data-testid="days-to-test"><strong>Today</strong></p>
          <p className="days-en">Your speaking test is today</p>
        </>
      ) : (
        <>
          <p className="days" data-testid="days-to-test"><strong>{daysToTest}</strong> {daysToTest === 1 ? 'day' : 'days'}</p>
          <p className="days-en">{daysToTest === 1 ? '1 day' : `${daysToTest} days`} until your speaking test</p>
        </>
      )}
      <p data-testid="readiness">Readiness: <strong>{r.percent}%</strong></p>
      <div className="meter" role="progressbar" aria-label="Readiness" aria-valuemin={0} aria-valuemax={100} aria-valuenow={r.percent}>
        <span style={{ width: `${r.percent}%` }} />
      </div>
    </Win>
  );
}
