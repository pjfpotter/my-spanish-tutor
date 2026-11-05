import type { CauseTag } from '../events/attempts';

/**
 * What the student managed in the short probe that follows a missed question (learning-diagnostics:
 * Comprehension cause tags). Each field is true if they picked the right meaning, false if not, and
 * null if that step was not run.
 *
 *  - heardSlow: the key word on its own, slowly
 *  - heardNormal: the key word on its own, at normal speed
 *  - written: the key word shown as text (only asked when the slow word was missed)
 *
 * The step "inside the sentence" is the question they already missed, so it is not repeated.
 */
export interface ComprehensionProbe {
  heardSlow: boolean;
  heardNormal: boolean | null;
  written: boolean | null;
}

/**
 * One tag per failed question, by rule (never a model):
 *  - missed the word slowly, but knows it written: sound-spelling gap
 *  - missed the word slowly and written: word not known
 *  - got it slowly, missed it at normal speed: too fast
 *  - got it alone at both speeds, yet missed the sentence: thrown by context
 * Returns null when the probe cannot tell (a step is missing), so nobody gets a guessed label.
 */
export function tagComprehension(p: ComprehensionProbe): CauseTag | null {
  if (!p.heardSlow) {
    if (p.written === null) return null;
    return p.written ? 'sound_spelling_gap' : 'word_not_known';
  }
  if (p.heardNormal === null) return null;
  return p.heardNormal ? 'thrown_by_context' : 'too_fast';
}

/** The probe steps in order, given what has happened so far. Null means the probe is finished. */
export function nextProbeStep(done: Partial<ComprehensionProbe>): 'heardSlow' | 'heardNormal' | 'written' | null {
  if (done.heardSlow === undefined) return 'heardSlow';
  if (done.heardSlow) return done.heardNormal === undefined || done.heardNormal === null ? 'heardNormal' : null;
  return done.written === undefined || done.written === null ? 'written' : null;
}
