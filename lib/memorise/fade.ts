/**
 * Scaffold fading (task 8.2). A prompt starts with the whole script and gives less of it as the student's
 * recent accuracy rises. Words dim out from the end, so what stays longest is the start of the answer,
 * the part that is hardest to begin without. Rules only, and every number is configurable.
 */
export interface MemoriseConfig {
  /** Accuracy (whole percent) that counts as a good attempt. Also the bar for mastery. */
  threshold: number;
  /** Good attempts in a row before the prompt gives less. */
  riseStreak: number;
  /** Accuracy below this is a hard attempt. */
  hardBelow: number;
  /** Hard attempts in a row before the prompt gives a little more back. Never a penalty, only help. */
  fallStreak: number;
}

export const DEFAULT_MEMORISE: MemoriseConfig = { threshold: 80, riseStreak: 2, hardBelow: 40, fallStreak: 3 };

/** 0 is the whole script. 4 is English only. */
export const LEVEL_NAMES = ['whole script', 'most of the script', 'some of the script', 'first words only', 'English only'] as const;
export const MAX_LEVEL = LEVEL_NAMES.length - 1;

export interface FadeState {
  level: number;
  /** Good attempts in a row at this level. */
  good: number;
  /** Hard attempts in a row at this level. */
  hard: number;
}

export const START_FADE: FadeState = { level: 0, good: 0, hard: 0 };

/** The state after one scored attempt. A middling attempt changes nothing except ending a streak. */
export function nextFade(s: FadeState, accuracy: number, cfg: MemoriseConfig = DEFAULT_MEMORISE): FadeState {
  if (accuracy >= cfg.threshold) {
    const good = s.good + 1;
    return good >= cfg.riseStreak && s.level < MAX_LEVEL ? { level: s.level + 1, good: 0, hard: 0 } : { level: s.level, good, hard: 0 };
  }
  if (accuracy < cfg.hardBelow) {
    const hard = s.hard + 1;
    return hard >= cfg.fallStreak && s.level > 0 ? { level: s.level - 1, good: 0, hard: 0 } : { level: s.level, good: 0, hard };
  }
  return { level: s.level, good: 0, hard: 0 };
}

/** Where a student stands, from their stored attempt accuracies in time order. This is how support carries across sessions. */
export function foldFade(accuracies: number[], cfg: MemoriseConfig = DEFAULT_MEMORISE): FadeState {
  return accuracies.reduce((s, a) => nextFade(s, a, cfg), START_FADE);
}

export interface PromptWord {
  word: string;
  shown: boolean;
}

/** How many of `n` words stay visible at a level. Never more than the level before it. */
export function wordsKept(n: number, level: number): number {
  const kept = [n, Math.ceil((n * 2) / 3), Math.ceil(n / 3), Math.min(2, n), 0];
  let k = n;
  for (let l = 1; l <= Math.min(level, MAX_LEVEL); l++) k = Math.min(k, kept[l]);
  return k;
}

/** The script as words, each marked shown or dimmed out at this support level. */
export function promptWords(script: string, level: number): PromptWord[] {
  const words = script.split(/\s+/).filter(Boolean);
  const kept = wordsKept(words.length, level);
  return words.map((word, i) => ({ word, shown: i < kept }));
}

/**
 * Attempts at the whole-script level are reading aloud, not remembering, so they earn effort coins and
 * help the prompt fade but do not count toward memorisation mastery.
 */
export const countsTowardMastery = (level: number) => level > 0;
