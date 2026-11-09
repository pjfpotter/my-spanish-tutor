import type { Chunk } from '../course/schema';

/**
 * The kind of a chunk, used for its colour and its text label (task 21.2, 22.2). A kind always has a
 * short word and a symbol as well as a colour, so meaning is never carried by colour alone. The colours
 * themselves live in app/tokens.css as --kind-<kind>.
 */
export const CHUNK_KINDS = ['opinion', 'reason', 'link', 'time', 'detail', 'other'] as const;
export type ChunkKind = (typeof CHUNK_KINDS)[number];

export const KIND_LABEL: Record<ChunkKind, { word: string; symbol: string }> = {
  opinion: { word: 'opinion', symbol: '●' },
  reason: { word: 'reason', symbol: '◆' },
  link: { word: 'link', symbol: '▲' },
  time: { word: 'when', symbol: '■' },
  detail: { word: 'detail', symbol: '✚' },
  other: { word: 'bit', symbol: '○' },
};

export function kindOf(chunk: Pick<Chunk, 'featureTags'>): ChunkKind {
  const t = chunk.featureTags;
  if (t.includes('justification')) return 'reason';
  if (t.includes('opinion')) return 'opinion';
  if (t.includes('connective')) return 'link';
  if (t.includes('sequencer') || t.includes('adverb_phrase') || t.includes('adverb')) return 'time';
  if (t.includes('adjective') || t.includes('adjective_phrase')) return 'detail';
  return 'other';
}
