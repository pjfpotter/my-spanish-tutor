import type { Calibration } from '../course/schema';
import { wordSpans } from './builder';
import { assessAnswer, findPhrase, tokens } from './rubric';

/**
 * The analysis (task 26.1d, answer-writing-coach: Analysis on request). It explains why an answer is worth what
 * it is, as a short list of steps the screen can animate: each step names a feature in plain English, says what it
 * adds, and points at the words in the answer that earn it. Pure rules from the same calibration data as the
 * value, so the steps always add up to the number the student saw.
 */
export interface AnalysisStep {
  id: string;
  /** What the student sees, for example "a contrast!". */
  label: string;
  /** What this step adds to the value. */
  value: number;
  /** Where the words are in the answer text, or null when they cannot be pointed at. */
  from: number | null;
  to: number | null;
}

export interface Analysis {
  /** Up to `MAX_STEPS`, richest first. */
  steps: AnalysisStep[];
  /** Whatever did not fit in the steps, so the total is still honest. */
  rest: { count: number; value: number };
  /** The whole value of the answer. */
  total: number;
}

/** A quick praise session, not a lecture: at most this many highlights. */
export const MAX_STEPS = 5;
/** How long each highlight stays, in milliseconds. */
export const STEP_MS = 1000;

/** Where the first match of any of these phrases is, as word positions. */
function firstMatch(words: string[], phrases: string[]): { from: number; to: number } | null {
  let best: { from: number; to: number } | null = null;
  for (const p of phrases) {
    const at = findPhrase(words, p)[0];
    if (at === undefined) continue;
    if (!best || at < best.from) best = { from: at, to: at + tokens(p).length };
  }
  return best;
}

/** The first starter followed by a justifier: where the opinion with a reason sits. */
function frameRange(words: string[], cal: Calibration): { from: number; to: number } | null {
  const starters = cal.frame.starters.flatMap((s) => findPhrase(words, s).map((at) => ({ at, len: tokens(s).length })));
  for (const j of cal.frame.justifiers) {
    for (const at of findPhrase(words, j).sort((a, b) => a - b)) {
      const s = starters.filter((x) => x.at < at).sort((a, b) => b.at - a.at)[0];
      if (s) return { from: s.at, to: at + tokens(j).length };
    }
  }
  return null;
}

export function analyse(cal: Calibration, text: string): Analysis {
  const a = assessAnswer(cal, text);
  const words = tokens(text);
  const spans = wordSpans(text);
  const spanOk = spans.length === words.length;
  const chars = (r: { from: number; to: number } | null) => (r && spanOk ? { from: spans[r.from].start, to: spans[r.to - 1].end } : { from: null, to: null });

  const all: AnalysisStep[] = [];
  if (a.justifiedOpinions > 0) {
    all.push({ id: 'frame', label: 'an opinion with a reason!', value: cal.frame.value, ...chars(frameRange(words, cal)) });
  }
  for (const f of a.features) {
    const def = cal.features.find((x) => x.id === f.id)!;
    all.push({ id: f.id, label: `${f.label}!`, value: f.value, ...chars(firstMatch(words, def.phrases)) });
  }
  const ordered = all.map((s, i) => ({ s, i })).sort((x, y) => y.s.value - x.s.value || x.i - y.i).map(({ s }) => s);
  const steps = ordered.slice(0, MAX_STEPS);
  const rest = ordered.slice(MAX_STEPS);
  return { steps, rest: { count: rest.length, value: rest.reduce((n, s) => n + s.value, 0) }, total: a.value };
}
