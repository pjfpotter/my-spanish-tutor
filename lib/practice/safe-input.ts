/**
 * Input that cannot be confused by speed (tasks 21.1, 21.2). Controls ignore input while a transition is
 * running, so rapid presses cannot register an unintended pair or place a tile twice.
 */
export interface Pair {
  id: string;
  spanish: string;
  english: string;
}

export interface MatchState {
  /** Id of the Spanish tile waiting for a partner, or null. */
  pickedSpanish: string | null;
  pickedEnglish: string | null;
  matched: string[];
  /** True while a pair result is being shown; all input is ignored. */
  locked: boolean;
  /** Pairs that were tried wrongly, for the one-thing-to-fix hint. Never a penalty. */
  wrongTries: number;
}

export const newMatch = (): MatchState => ({ pickedSpanish: null, pickedEnglish: null, matched: [], locked: false, wrongTries: 0 });

export type Side = 'spanish' | 'english';

/** A tap on a tile. Returns the new state and, once both sides are picked, whether they match. */
export function tapTile(s: MatchState, side: Side, id: string): { state: MatchState; result: 'match' | 'mismatch' | null } {
  // Ignore input during a result animation, and ignore tiles that are already matched.
  if (s.locked || s.matched.includes(id)) return { state: s, result: null };
  const next = { ...s, [side === 'spanish' ? 'pickedSpanish' : 'pickedEnglish']: id };
  if (next.pickedSpanish === null || next.pickedEnglish === null) return { state: next, result: null };
  const ok = next.pickedSpanish === next.pickedEnglish;
  return {
    state: { ...next, locked: true, matched: ok ? [...s.matched, next.pickedSpanish] : s.matched, wrongTries: s.wrongTries + (ok ? 0 : 1) },
    result: ok ? 'match' : 'mismatch',
  };
}

/** Call when the pair animation ends, to accept input again. */
export const unlockMatch = (s: MatchState): MatchState => ({ ...s, pickedSpanish: null, pickedEnglish: null, locked: false });
export const matchDone = (s: MatchState, pairs: readonly Pair[]) => s.matched.length >= pairs.length;

export interface ScrambleState {
  /** Tile ids placed in the answer, in order. */
  placed: string[];
  locked: boolean;
}

export const newScramble = (): ScrambleState => ({ placed: [], locked: false });

/** Place a tile, or take it back out if it is already placed. A tile can only be placed once. */
export function toggleTile(s: ScrambleState, id: string): ScrambleState {
  if (s.locked) return s;
  return s.placed.includes(id) ? { ...s, placed: s.placed.filter((p) => p !== id) } : { ...s, placed: [...s.placed, id] };
}

/** Move a placed tile to a new position (drag). */
export function moveTile(s: ScrambleState, id: string, to: number): ScrambleState {
  if (s.locked || !s.placed.includes(id)) return s;
  const rest = s.placed.filter((p) => p !== id);
  rest.splice(Math.max(0, Math.min(rest.length, to)), 0, id);
  return { ...s, placed: rest };
}

/** The scramble is checked only when every tile is placed. Correct means the order matches. */
export function checkScramble(s: ScrambleState, answer: readonly string[]): 'incomplete' | 'correct' | 'wrong' {
  if (s.placed.length < answer.length) return 'incomplete';
  return s.placed.every((id, i) => id === answer[i]) ? 'correct' : 'wrong';
}
