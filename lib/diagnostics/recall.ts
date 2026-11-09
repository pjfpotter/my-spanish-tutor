import type { CauseTag } from '../events/attempts';

export interface RecallFailure {
  /** True for a timed attempt (hear and answer), false for the untimed memorise phase. */
  timed: boolean;
  /** The student has said this answer correctly, untimed and unassisted, before. */
  untimedPassed: boolean;
  /** A chunk in this answer is a hotspot. */
  hotspot: boolean;
}

/**
 * Why a recall attempt failed, by rule (learning-diagnostics: Recall cause tags). Only called for a
 * failed attempt. A blank answer is a failure here, but it is never marked wrong.
 *  - a hotspot chunk in the answer: chunk hotspot
 *  - never passed untimed, or an untimed failure: not known well enough
 * Returns null when nothing in the closed list fits, rather than guessing.
 */
export function tagRecall(f: RecallFailure): CauseTag | null {
  if (f.hotspot) return 'chunk_hotspot';
  if (!f.timed || !f.untimedPassed) return 'not_known_well_enough';
  return null;
}
