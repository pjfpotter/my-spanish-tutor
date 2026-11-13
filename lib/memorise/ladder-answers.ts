import type { Chunk } from '../course/schema';
import { answerPieces } from '../practice/tasks';
import { splitSentences } from './sentences';
import type { LadderAnswer } from './ladder';
import type { MemoriseItem } from './store';

/**
 * Turns a student's own confirmed answer into the bits the memorise ladder teaches (task 27.4). The bits are the
 * answer's chunks from the course sentence builder, in the order the student wrote them, each with its English gloss
 * and its kind. Words that match no chunk become plain bits with no gloss, so any confirmed answer can be learned.
 * `s` is the sentence a bit belongs to, so a longer answer is taught one sentence at a time.
 */
export function ladderAnswerOf(item: Pick<MemoriseItem, 'id' | 'position' | 'question' | 'english' | 'answer'>, chunks: readonly Chunk[]): LadderAnswer {
  const pieces = answerPieces(item.answer, chunks);
  const sentenceWords = splitSentences(item.answer).map((s) => s.split(/\s+/).filter(Boolean).length);
  let used = 0;
  const bits = pieces.map((p) => {
    // The sentence that holds this bit's first word. A bit never spans a full stop in practice; if it did, it stays with the first.
    let s = 0;
    for (let seen = 0; s < sentenceWords.length - 1 && used >= seen + sentenceWords[s]; s++) seen += sentenceWords[s];
    used += p.text.split(/\s+/).filter(Boolean).length;
    return { t: p.text, en: p.english, k: p.kind, s };
  });
  // Sentence numbers must run 0, 1, 2 with none missing, or the lesson parts would have gaps.
  const order = [...new Set(bits.map((b) => b.s))].sort((a, b) => a - b);
  const chunksOut = bits.map((b) => ({ ...b, s: order.indexOf(b.s) }));
  const gloss = chunksOut.map((c) => c.en).filter(Boolean).join(' ');
  return { id: item.id, n: item.position, q: item.question, qen: item.english, en: gloss, chunks: chunksOut };
}

/** Whether a bit has an English gloss to ask about. Plain bits, matched to no chunk, have none. */
export const hasGloss = (c: { en: string }) => c.en.trim().length > 0;
