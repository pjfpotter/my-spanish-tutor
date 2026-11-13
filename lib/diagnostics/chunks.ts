import { normaliseWord, tokenise } from '../speech/score.ts';

export interface ChunkRef {
  id: string;
  spanish: string;
}

export interface LocatedChunk {
  chunkId: string;
  /** Word positions in the answer, start inclusive and end exclusive. They line up with the scored words. */
  start: number;
  end: number;
}

const words = (text: string) => tokenise(text).map(normaliseWord);

/**
 * Finds where the course's chunks appear in a student's answer. Longer chunks win, and a word belongs
 * to at most one chunk, so "Me gustaría ir" is not also counted as a shorter chunk inside it.
 */
export function locateChunks(answer: string, chunks: ChunkRef[]): LocatedChunk[] {
  const target = words(answer);
  const candidates = chunks
    .map((c) => ({ id: c.id, w: words(c.spanish) }))
    .filter((c) => c.w.length > 0)
    .sort((a, b) => b.w.length - a.w.length);
  const taken = new Array<boolean>(target.length).fill(false);
  const found: LocatedChunk[] = [];
  for (const c of candidates) {
    for (let i = 0; i + c.w.length <= target.length; i++) {
      if (taken.slice(i, i + c.w.length).some(Boolean)) continue;
      if (c.w.every((w, k) => target[i + k] === w)) {
        found.push({ chunkId: c.id, start: i, end: i + c.w.length });
        taken.fill(true, i, i + c.w.length);
      }
    }
  }
  return found.sort((a, b) => a.start - b.start);
}

/** A chunk counts as missed if any of its words was not matched by the recogniser. */
export function missedChunks(located: LocatedChunk[], missedWords: ReadonlySet<number>): { chunkId: string; missed: boolean }[] {
  return located.map((l) => {
    let missed = false;
    for (let i = l.start; i < l.end; i++) if (missedWords.has(i)) missed = true;
    return { chunkId: l.chunkId, missed };
  });
}

export const HOTSPOT = { misses: 3, recoveredAfter: 3 } as const;

/**
 * A chunk is a hotspot once it has been missed three times, until the student gets it right three
 * times running. `outcomes` is the chunk's history, oldest first, true for a miss.
 */
export function isHotspot(outcomes: readonly boolean[]): boolean {
  if (outcomes.filter(Boolean).length < HOTSPOT.misses) return false;
  const recent = outcomes.slice(-HOTSPOT.recoveredAfter);
  return !(recent.length === HOTSPOT.recoveredAfter && recent.every((m) => !m));
}
