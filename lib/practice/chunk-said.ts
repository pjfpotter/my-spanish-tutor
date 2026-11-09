import type { Score } from '../speech/score';
import { tokenise } from '../speech/score';
import type { ChunkKind } from './chunk-kind';

/**
 * Which chunks the student said (task 22.2). A chunk counts as said when the recogniser understood every one of
 * its words, the same rule as everywhere else: a recognition failure is never held against the student. `pieces`
 * are the chunks that were asked for, in order, and `score` is the attempt scored against exactly their words.
 */
export interface SaidChunk {
  text: string;
  kind: ChunkKind;
  said: boolean;
}

export function saidChunks(pieces: readonly { text: string; kind: ChunkKind }[], score: Score): SaidChunk[] {
  let at = 0;
  return pieces.map((p) => {
    const n = tokenise(p.text).length;
    const words = score.words.slice(at, at + n);
    at += n;
    return { text: p.text, kind: p.kind, said: words.length === n && n > 0 && words.every((w) => w.status === 'matched') };
  });
}
