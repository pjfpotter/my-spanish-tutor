import type { Chunk } from '../course/schema';
import { matchChunks, tokens, type ChunkMatch } from './rubric';

/**
 * Swaps (task 7.3). A student adjusts a model answer by swapping one chunk for another from the
 * sentence builder, or by adding a glue word between chunks. Nothing here calls a model, and the
 * rubric re-counts after every change. Words are matched ignoring accents and capitals.
 */
export interface Slot {
  match: ChunkMatch;
  /** The chunk as it stands in the answer. */
  current: Chunk;
  /** Other chunks of the same kind that fit in its place, recycled ones first. */
  options: Chunk[];
  /** Character range of the chunk in the original text. */
  start: number;
  end: number;
}

/** Character spans of each word, in the same order as `tokens()` produces them. */
function spans(text: string): { start: number; end: number }[] {
  const out: { start: number; end: number }[] = [];
  for (const m of text.matchAll(/[\p{L}\p{M}\p{N}]+/gu)) {
    if (tokens(m[0]).length === 1) out.push({ start: m.index!, end: m.index! + m[0].length });
  }
  return out;
}

export function slotsFor(text: string, chunks: Chunk[]): Slot[] {
  const sp = spans(text);
  if (sp.length !== tokens(text).length) return []; // unusual punctuation inside a word: offer no swaps rather than risk a bad edit
  return matchChunks(text, chunks).map((match) => ({
    match,
    current: match.chunk,
    options: chunks
      .filter((c) => c.category === match.chunk.category && c.spanish !== match.chunk.spanish)
      .sort((a, b) => Number(b.recycled) - Number(a.recycled)),
    start: sp[match.from].start,
    end: sp[match.to - 1].end,
  }));
}

const SENTENCE_START = /(^|[.!?¡¿]\s*)$/;

/** Replaces one chunk with another, keeping a capital letter where a sentence begins. */
export function applySwap(text: string, slot: Pick<Slot, 'start' | 'end'>, replacement: string): string {
  let r = replacement;
  if (SENTENCE_START.test(text.slice(0, slot.start))) r = r.charAt(0).toUpperCase() + r.slice(1);
  else if (slot.start > 0) r = r.charAt(0).toLowerCase() + r.slice(1);
  return text.slice(0, slot.start) + r + text.slice(slot.end);
}

/** Adds a glue word after a chunk ("... fútbol y ..."). Glue words never count as features. */
export function insertGlue(text: string, slot: Pick<Slot, 'end'>, word: string): string {
  return text.slice(0, slot.end) + ' ' + word + text.slice(slot.end);
}
