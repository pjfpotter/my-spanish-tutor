import type { Score } from '../speech/score';
import { normaliseWord, tokenise } from '../speech/score';
import { chunkIsSaid, understood } from '../speech/live-match';
import type { ChunkKind } from './chunk-kind';

/**
 * Which chunks the student said (task 22.2). A chunk counts as said by the one rule used everywhere, including
 * live listening in the memorise lab (task 27.13): most of its words understood, and a long word one letter out
 * counts as understood. A recognition failure is never held against the student. `pieces` are the chunks that
 * were asked for, in order, and `score` is the attempt scored against exactly their words.
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
    const got = words.filter((w) => w.status === 'matched' || (w.status === 'different' && !!w.heard && understood(normaliseWord(w.word), normaliseWord(w.heard)))).length;
    return { text: p.text, kind: p.kind, said: words.length === n && chunkIsSaid(got, n) };
  });
}
