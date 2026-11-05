/**
 * Response-time rank (tasks 13.2 and 9.5): a ladder of named steps from a rolling average, never a
 * comparison with other students. Only answers that were mostly right count, so speed is measured on real answers.
 */
export const RANKS = ['Caracol', 'Tortuga', 'Pájaro', 'Conejo', 'Zorro', 'Gato'] as const;
export type RankName = (typeof RANKS)[number];

export interface RankConfig {
  /** Average response time (ms) at or under which each step above Caracol is reached. Fastest step last. */
  upTo: readonly number[];
  /** How many recent answers make the rolling average. */
  window: number;
  /** An answer counts for rank only at or above this accuracy. */
  minAccuracy: number;
  /** Answers needed before a rank is shown at all. */
  minAnswers: number;
}

/** Descending times: slower than 5.5 s is Caracol, and 1.8 s or quicker is Gato. A first guess, tuned from user testing. */
export const DEFAULT_RANK: RankConfig = { upTo: [5500, 4200, 3200, 2500, 1800], window: 10, minAccuracy: 50, minAnswers: 3 };

export interface RankedAttempt {
  accuracy: number | null;
  responseMs: number | null;
  blank: boolean;
}

export interface RankInfo {
  /** Null until enough answers. */
  rank: RankName | null;
  /** Index into RANKS, or -1 when unranked. */
  step: number;
  averageMs: number | null;
  /** How many more answers before a rank appears, or how far to the next step in ms (null at the top). */
  answersNeeded: number;
  nextStepMs: number | null;
}

/** The rolling average over the latest qualifying answers, oldest first in, newest last. */
export function rollingAverage(history: RankedAttempt[], cfg: RankConfig = DEFAULT_RANK): { averageMs: number | null; count: number } {
  const used = history
    .filter((a) => !a.blank && a.responseMs !== null && a.accuracy !== null && a.accuracy >= cfg.minAccuracy)
    .slice(-cfg.window);
  if (!used.length) return { averageMs: null, count: 0 };
  return { averageMs: Math.round(used.reduce((t, a) => t + (a.responseMs as number), 0) / used.length), count: used.length };
}

/** The step for an average time: the number of limits it beats. */
export const stepFor = (averageMs: number, cfg: RankConfig = DEFAULT_RANK): number => cfg.upTo.filter((limit) => averageMs <= limit).length;

export function rankFor(history: RankedAttempt[], cfg: RankConfig = DEFAULT_RANK): RankInfo {
  const { averageMs, count } = rollingAverage(history, cfg);
  if (averageMs === null || count < cfg.minAnswers) {
    return { rank: null, step: -1, averageMs, answersNeeded: Math.max(0, cfg.minAnswers - count), nextStepMs: null };
  }
  const step = stepFor(averageMs, cfg);
  return { rank: RANKS[step], step, averageMs, answersNeeded: 0, nextStepMs: step < cfg.upTo.length ? averageMs - cfg.upTo[step] : null };
}
