/**
 * Spotting an answer that will not stick. When a student keeps failing to recall an answer, the memorise phase
 * offers help with it. All rules, no model.
 */
export const STALL = {
  /** Whole-answer attempts before an answer can count as stalled. */
  minAttempts: 6,
  /** How many of the latest attempts all have to fall short. */
  window: 5,
  /** Accuracy under this is a miss. */
  ceiling: 70,
} as const;

/** Whole-answer accuracies, oldest first. Stalled means repeated failures to recall and no mastery yet. */
export function isStalled(accuracies: number[], mastered: boolean): boolean {
  if (mastered || accuracies.length < STALL.minAttempts) return false;
  return accuracies.slice(-STALL.window).every((a) => a < STALL.ceiling);
}
