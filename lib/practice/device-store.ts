import type { LadderState } from './ladder';

/**
 * Ladder level and response-time personal bests live on the student's device only (task 22.1, 22.4): nothing
 * about them is sent anywhere or tied to a person. Every read and write is guarded, because storage can be
 * blocked, and the screen works the same without it.
 */
const ladderKey = (itemId: string) => `ladder:${itemId}`;
const bestKey = (itemId: string) => `best-ms:${itemId}`;

export function parseLadder(raw: string | null, levels: number): LadderState {
  try {
    const v = JSON.parse(raw ?? 'null') as Partial<LadderState> | null;
    const at = Number.isInteger(v?.at) ? Math.max(0, Math.min(levels - 1, v!.at as number)) : 0;
    const met = Number.isInteger(v?.met) && (v!.met as number) >= 0 ? (v!.met as number) : 0;
    return { at, met };
  } catch {
    return { at: 0, met: 0 };
  }
}

export function readLadder(itemId: string, levels: number): LadderState {
  try {
    return parseLadder(localStorage.getItem(ladderKey(itemId)), levels);
  } catch {
    return { at: 0, met: 0 };
  }
}

export function writeLadder(itemId: string, state: LadderState): void {
  try {
    localStorage.setItem(ladderKey(itemId), JSON.stringify(state));
  } catch {
    /* the level still holds for this visit */
  }
}

export function readBestMs(itemId: string): number | null {
  try {
    const n = Number(localStorage.getItem(bestKey(itemId)));
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

export function writeBestMs(itemId: string, ms: number): void {
  try {
    localStorage.setItem(bestKey(itemId), String(Math.round(ms)));
  } catch {
    /* ignore */
  }
}

/** A new personal best needs an earlier one to beat. The first time is a start, not a record. */
export const isNewBestMs = (previous: number | null, ms: number) => previous !== null && ms < previous;
