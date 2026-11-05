import { tokenise, type Score } from '../speech/score';

/**
 * Sentence-level practice (task 8.2). An answer is a few sentences. When a student keeps missing the
 * same one, it is pulled out for short repeated attempts, then the full answer comes back.
 */
export const DRILL = {
  /** Misses of the same sentence, in a row, that start a drill. */
  missesToIsolate: 3,
  /** Good attempts in a row that end a drill. */
  goodToReturn: 2,
} as const;

/** Splits after . ! or ? so a Spanish "¿Qué…?" stays with its own sentence. */
export function splitSentences(text: string): string[] {
  return text.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
}

export interface SentenceResult {
  index: number;
  text: string;
  /** Whole percent of this sentence's words matched. */
  accuracy: number;
}

/** Splits a scored attempt into per-sentence accuracy. The score lists the script's words in order, so each sentence is a slice. */
export function sentenceResults(script: string, score: Score): SentenceResult[] {
  let at = 0;
  return splitSentences(script).map((text, index) => {
    const n = tokenise(text).length;
    const slice = score.words.slice(at, at + n);
    at += n;
    const matched = slice.filter((w) => w.status === 'matched').length;
    return { index, text, accuracy: n ? Math.round((matched / n) * 100) : 100 };
  });
}

/**
 * The sentence to isolate, or null. `history` is each recent attempt's per-sentence accuracy, oldest
 * first. A sentence is stuck when it was below the threshold in each of the last N attempts. There is
 * nothing to isolate in a one-sentence answer.
 */
export function stuckSentence(history: number[][], threshold: number, misses: number = DRILL.missesToIsolate): number | null {
  const recent = history.slice(-misses);
  if (recent.length < misses || recent[0].length < 2) return null;
  let worst: { index: number; total: number } | null = null;
  for (let i = 0; i < recent[0].length; i++) {
    if (recent.every((a) => (a[i] ?? 100) < threshold)) {
      const total = recent.reduce((t, a) => t + a[i], 0);
      if (!worst || total < worst.total) worst = { index: i, total };
    }
  }
  return worst?.index ?? null;
}

export interface DrillState {
  sentence: number;
  /** Good attempts in a row. */
  good: number;
}

/** After one drill attempt: carry on, or `done` when the sentence has been said well enough times. */
export function drillStep(d: DrillState, accuracy: number, threshold: number, goodToReturn: number = DRILL.goodToReturn): { state: DrillState; done: boolean } {
  const good = accuracy >= threshold ? d.good + 1 : 0;
  return { state: { sentence: d.sentence, good }, done: good >= goodToReturn };
}
