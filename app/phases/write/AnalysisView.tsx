'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { STEP_MS, type Analysis } from '../../../lib/coach/analysis';
import { Reward } from '../../components/practice/Reward';
import { useSfx } from '../../components/useSfx';

/** Reduced motion or calm mode: the analysis shows all at once, with no animation and no timer. */
function calmNow() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true || document.documentElement.dataset.calm === 'on';
}

/**
 * The animated analysis (task 26.1d). It highlights the parts of the answer that earn value, one at a time,
 * names each feature in English with a short reward sound and a burst, and keeps a running total. It is quick, can
 * be cancelled at any moment (the button or Escape), and respects reduced motion, calm mode and the sound switch.
 */
export function AnalysisView({ text, analysis, onClose }: { text: string; analysis: Analysis; onClose: () => void }) {
  const calm = useMemo(calmNow, []);
  const [shown, setShown] = useState(calm ? analysis.steps.length : Math.min(1, analysis.steps.length));
  const [run, setRun] = useState(0);
  const sfx = useSfx();
  const live = useRef<HTMLParagraphElement>(null);
  const total = analysis.steps.length;
  const finished = shown >= total;

  // Each step lands after the last: a sound, a burst and a spoken line for assistive technology.
  useEffect(() => {
    if (!shown) return;
    const step = analysis.steps[shown - 1];
    if (!calm) sfx('correct');
    if (live.current) live.current.textContent = `${step.label} Adds ${step.value}.`;
  }, [shown, run, analysis, calm, sfx]);

  useEffect(() => {
    if (calm || finished) return;
    const t = setTimeout(() => setShown((n) => n + 1), STEP_MS);
    return () => clearTimeout(t);
  }, [shown, finished, calm, run]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const sofar = analysis.steps.slice(0, shown).reduce((n, s) => n + s.value, 0) + (finished ? analysis.rest.value : 0);
  const current = shown ? analysis.steps[shown - 1] : null;

  // The answer with the words that earned value marked, the newest one strongest.
  const marks = analysis.steps.slice(0, shown).flatMap((s, i) => (s.from === null ? [] : [{ s, i }])).sort((a, b) => a.s.from! - b.s.from!);
  const parts: React.ReactNode[] = [];
  let at = 0;
  for (const { s, i } of marks) {
    if (s.from! < at) continue; // overlapping highlight: the earlier one keeps the words
    if (s.from! > at) parts.push(text.slice(at, s.from!));
    parts.push(<mark key={s.id} data-now={i === shown - 1 && !finished} data-testid="analysis-mark">{text.slice(s.from!, s.to!)}</mark>);
    at = s.to!;
  }
  if (at < text.length) parts.push(text.slice(at));

  return (
    <section className="analysis" aria-label="Why your answer is worth what it is" data-testid="analysis">
      {!calm && <Reward burstKey={`${run}-${shown}`} />}
      <p className="analysis-text" lang="es">{parts}</p>
      <p className="analysis-step" data-testid="analysis-step">
        {current ? (
          <>
            <strong>{current.label}</strong> <span>+{current.value}</span>
          </>
        ) : (
          <span>Nothing to praise yet. Add a reason with “porque”.</span>
        )}
      </p>
      <p className="analysis-total" data-testid="analysis-total">
        Worth {finished ? 'in all' : 'so far'}: {sofar}
        {finished && analysis.rest.count > 0 && <span className="muted"> (including {analysis.rest.count} more, worth {analysis.rest.value})</span>}
      </p>
      <div className="tray-actions">
        <button type="button" className="btn" onClick={onClose} data-testid="analysis-close">
          {finished ? 'Done' : 'Cancel'}
        </button>
        {!finished && !calm && (
          <button type="button" className="btn" onClick={() => setShown(total)} data-testid="analysis-skip">Skip to the end</button>
        )}
        {finished && !calm && (
          <button type="button" className="btn" onClick={() => { setShown(1); setRun((n) => n + 1); }} data-testid="analysis-replay">Play again</button>
        )}
      </div>
      <p ref={live} className="sr-only" role="status" aria-live="polite" />
    </section>
  );
}
