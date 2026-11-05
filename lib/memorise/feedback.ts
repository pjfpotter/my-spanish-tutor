import { tipFor } from '../speech/confusions';
import type { Score } from '../speech/score';

/**
 * What the tutor says after an attempt (task 8.3). Start with what was right, then name at most one
 * thing to fix. Never says the student failed. Rules and fixed wording, no model.
 */
export interface Feedback {
  headline: string;
  /** The longest run of words they got right, from their own script. Null if nothing matched. */
  strongest: string | null;
  /** The one thing to fix, or null when nothing needs fixing. */
  fix: { word: string; heard: string | null; tip: string | null; text: string } | null;
}

/** The longest unbroken run of matched words. Ties go to the earlier run. */
export function strongestRun(score: Score): string | null {
  let best: string[] = [];
  let run: string[] = [];
  for (const w of score.words) {
    if (w.status === 'matched') {
      run.push(w.word);
      if (run.length > best.length) best = [...run];
    } else run = [];
  }
  return best.length ? best.join(' ') : null;
}

export function headlineFor(accuracy: number, threshold: number): string {
  if (accuracy === 100) return 'Word perfect.';
  if (accuracy >= threshold) return 'That works. You know this one.';
  if (accuracy >= 50) return 'Nearly there.';
  return 'A start. A start counts.';
}

export function feedbackFor(score: Score, threshold: number): Feedback {
  const first = score.words.find((w) => w.status !== 'matched');
  const strongest = strongestRun(score);
  if (!first) return { headline: headlineFor(score.accuracy, threshold), strongest, fix: null };
  const heard = first.status === 'different' ? first.heard ?? null : null;
  const tip = heard ? tipFor(first.word, heard) : null;
  const clean = first.word.replace(/[.,;:!?¡¿"“”]/g, '');
  return {
    headline: headlineFor(score.accuracy, threshold),
    strongest,
    fix: {
      word: first.word,
      heard,
      tip,
      text: tip ?? `Next time, “${clean}”. Tap it to hear it slowly.`,
    },
  };
}
