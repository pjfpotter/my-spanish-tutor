'use client';

import { useEffect, useRef } from 'react';
import './practice.css';

export interface FeedbackPanelProps {
  state: 'correct' | 'wrong';
  /** A line from the praise pool, for a correct answer. */
  praise?: string;
  /** The right answer, shown on a miss. */
  answer?: string;
  /** At most one thing to fix. */
  fix?: string | null;
  /** Overrides the head words, for a state that is neither right nor wrong (for example, no answer in time). */
  headline?: string;
  /** The label on the Continue control. */
  continueLabel?: string;
  onContinue: () => void;
  /** Extra controls beside Continue (for example, say it again). */
  extra?: React.ReactNode;
  children?: React.ReactNode;
}

/**
 * The instant feedback panel (task 20.3). It appears in the same place at once, says correct or not yet in words
 * with a symbol as well as colour, shows the correct answer on a miss, and offers Continue. It never waits for a
 * tutor line, and Continue is focused so Enter carries on.
 */
export function FeedbackPanel({ state, praise, answer, fix, headline, continueLabel = 'Continue', onContinue, extra, children }: FeedbackPanelProps) {
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => button.current?.focus({ preventScroll: true }), []);
  const right = state === 'correct';
  return (
    <div className="fb" role="status" data-state={state} data-testid="feedback-panel">
      <div className="fb-top">
        <p className="fb-head">
          <span className="fb-symbol" aria-hidden="true">{headline ? '…' : right ? '✓' : '✗'}</span>
          <span>{headline ?? (right ? 'Correct' : 'Not yet')}</span>
        </p>
        <div className="fb-actions">
          {extra}
          <button ref={button} type="button" className="btn btn-primary" onClick={onContinue} data-testid="continue">
            {continueLabel}
          </button>
        </div>
      </div>
      {right && praise && <p data-testid="praise">{praise}</p>}
      {!right && answer && (
        <p data-testid="fb-answer">
          The answer: <strong lang="es">{answer}</strong>
        </p>
      )}
      {fix && <p data-testid="fb-fix"><strong>One thing to fix:</strong> {fix}</p>}
      {children}
    </div>
  );
}
