/**
 * Combo moments (task 20.5). Every `every` correct answers in a row (default five) a short combo moment
 * plays. A wrong answer ends the run. Skipped and assisted items neither count towards a run nor break it.
 */
export type Outcome = 'correct' | 'wrong' | 'skipped' | 'assisted';

export interface ComboState {
  run: number;
}

export const NO_COMBO: ComboState = { run: 0 };
export const DEFAULT_COMBO_EVERY = 5;

export function stepCombo(s: ComboState, outcome: Outcome, every: number = DEFAULT_COMBO_EVERY): { state: ComboState; combo: boolean } {
  if (outcome === 'skipped' || outcome === 'assisted') return { state: s, combo: false };
  if (outcome === 'wrong') return { state: NO_COMBO, combo: false };
  const run = s.run + 1;
  return run >= every ? { state: NO_COMBO, combo: true } : { state: { run }, combo: false };
}
