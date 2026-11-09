import { DEFAULT_AUTOMATE, type AutomateConfig, type Timed } from '../automate/window';

/**
 * The chunk ladder (task 22.1). Level 1 asks for only the first chunk, level 2 the first two, level 3 the
 * first three, and the last level the whole answer. A student moves up after meeting the accuracy and
 * response-time target at a level, and can start higher. A level never asks for more chunks than exist.
 */
export const LADDER_LEVELS = [1, 2, 3, 'all'] as const;
export type LadderLevel = (typeof LADDER_LEVELS)[number];

export interface LadderState {
  /** Index into LADDER_LEVELS. */
  at: number;
  /** Targets met in a row at this level. */
  met: number;
}

export const LADDER_UP_AFTER = 2;

export function startLadder(at = 0): LadderState {
  return { at: Math.max(0, Math.min(LADDER_LEVELS.length - 1, at)), met: 0 };
}

/** How many chunks the level asks for, given how many the answer has. */
export function chunksAsked(level: LadderLevel, chunkCount: number): number {
  return level === 'all' ? chunkCount : Math.min(level, chunkCount);
}

/** Levels that ask for more chunks than the answer has are skipped, so a two-chunk answer has two levels. */
export function levelsFor(chunkCount: number): LadderLevel[] {
  const out: LadderLevel[] = [];
  for (const l of LADDER_LEVELS) {
    if (l === 'all') out.push('all');
    else if (l < chunkCount) out.push(l);
  }
  return out;
}

/** Does this attempt meet the target? Blanks and assisted attempts never move a student up (and never push them down). */
export function meetsLadderTarget(a: Timed, assisted: boolean, cfg: AutomateConfig = DEFAULT_AUTOMATE): boolean {
  return !assisted && !a.blank && a.accuracy !== null && a.accuracy >= cfg.threshold && a.responseMs !== null && a.responseMs <= cfg.targetMs;
}

export function stepLadder(s: LadderState, a: Timed, assisted: boolean, levels: number, cfg: AutomateConfig = DEFAULT_AUTOMATE): LadderState {
  if (!meetsLadderTarget(a, assisted, cfg)) return { at: s.at, met: a.blank || assisted ? s.met : 0 };
  const met = s.met + 1;
  return met >= LADDER_UP_AFTER && s.at < levels - 1 ? { at: s.at + 1, met: 0 } : { at: s.at, met };
}
