import type { Chunk } from '../course/schema';
import { kindOf, type ChunkKind } from '../practice/chunk-kind';
import { matchChunks, tokens } from './rubric';

/**
 * The sentence-builder model of an answer (task 26.1b, answer-writing-coach: Build from empty spaces).
 * An answer is a row of parts. A part is either a block (a chunk from the question's own sentence
 * builder, or an empty slot waiting for one) or a joining word from the cement tray. The answer text is
 * worked out from the parts, and the parts are worked out from saved text, so the stored answer stays
 * plain text and every other phase reads it unchanged. All rules, no model.
 */
export interface BlockPart {
  id: string;
  kind: 'block';
  /** The sentence-builder category this slot takes. */
  category: string;
  /** The chunk's Spanish, or null while the slot is empty. */
  text: string | null;
  /** Punctuation that follows the block, kept from a starter answer so the sentences still read well. */
  after: string;
}

export interface GluePart {
  id: string;
  kind: 'glue';
  text: string;
  after: string;
}

export type Part = BlockPart | GluePart;

let counter = 0;
const nextId = () => `p${++counter}`;

/** The colour kind for a category: the kind of its first chunk, so it always matches the automatise phase. */
export function kindOfCategory(category: string, chunks: Chunk[]): ChunkKind {
  const first = chunks.find((c) => c.category === category);
  return first ? kindOf(first) : 'other';
}

/** The chunks a question's slots can offer: only the categories its own sentence builder lists. */
export function questionChunks(chunks: Chunk[], topics: string[]): Chunk[] {
  const wanted = new Set(topics);
  return chunks.filter((c) => wanted.has(c.category));
}

/** One empty slot for each category the question lists, in the sentence builder's order. Nothing is filled in. */
export function emptyParts(topics: string[]): Part[] {
  return topics.map((category) => ({ id: nextId(), kind: 'block', category, text: null, after: '' }));
}

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
const upperFirst = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** The answer text for a row of parts. Empty slots are skipped; a capital starts each sentence. */
export function textFromParts(parts: Part[]): string {
  let out = '';
  let start = true;
  for (const p of parts) {
    if (p.kind === 'block' && p.text === null) continue;
    const word = p.text!;
    out += (out ? ' ' : '') + (start ? upperFirst(word) : lowerFirst(word)) + p.after;
    start = /[.!?]$/.test(p.after);
  }
  if (out && !/[.!?]$/.test(out)) out += '.';
  return out;
}

/** Whether any block is filled, so the starter option can step aside once the student is building. */
export const isEmpty = (parts: Part[]) => !parts.some((p) => p.kind !== 'block' || p.text !== null);

/** Character spans of each word, in the same order as `tokens()` produces them. */
function wordSpans(text: string): { start: number; end: number }[] {
  const out: { start: number; end: number }[] = [];
  for (const m of text.matchAll(/[\p{L}\p{M}\p{N}]+/gu)) {
    if (tokens(m[0]).length === 1) out.push({ start: m.index!, end: m.index! + m[0].length });
  }
  return out;
}

/** Rebuilds the row of parts from an answer's text: chunks become blocks, other words become joining words. */
export function partsFromText(text: string, chunks: Chunk[]): Part[] {
  if (!text.trim()) return [];
  const sp = wordSpans(text);
  if (sp.length !== tokens(text).length) return [];
  const matches = matchChunks(text, chunks);
  const parts: Part[] = [];
  const push = (from: number, to: number, chunk: Chunk | null) => {
    const start = sp[from].start;
    const end = sp[to - 1].end;
    const nextStart = to < sp.length ? sp[to].start : text.length;
    const after = (text.slice(end, nextStart).match(/[,.;:!?]+/)?.[0] ?? '').replace(/[;:]/g, ',');
    if (chunk) parts.push({ id: nextId(), kind: 'block', category: chunk.category, text: chunk.spanish, after });
    else parts.push({ id: nextId(), kind: 'glue', text: lowerFirst(text.slice(start, end)), after });
  };
  let at = 0;
  for (const m of matches) {
    if (m.from > at) pushLoose(at, m.from, push);
    push(m.from, m.to, m.chunk);
    at = m.to;
  }
  if (at < sp.length) pushLoose(at, sp.length, push);
  return parts;
}

/** Words that are not part of any chunk are kept one by one as joining words, so each can be taken out. */
function pushLoose(from: number, to: number, push: (from: number, to: number, chunk: Chunk | null) => void) {
  for (let i = from; i < to; i++) push(i, i + 1, null);
}

/**
 * The chunks that fit one block: the same kind of chunk (same category) from the question's own sentence
 * builder, none already used elsewhere in the answer, recycled ones first. The current chunk is left out.
 */
export function fittingChunks(parts: Part[], partId: string, chunks: Chunk[], topics: string[]): Chunk[] {
  const part = parts.find((p) => p.id === partId);
  if (!part || part.kind !== 'block') return [];
  const used = new Set(parts.filter((p) => p.id !== partId && p.kind === 'block' && p.text).map((p) => tokens(p.text!).join(' ')));
  // A block that came from outside the question's topics still swaps within its own category.
  const pool = topics.includes(part.category) ? questionChunks(chunks, topics) : chunks;
  return pool
    .filter((c) => c.category === part.category && !used.has(tokens(c.spanish).join(' ')))
    .sort((a, b) => Number(b.recycled) - Number(a.recycled));
}

/** Fills a slot with a chunk. */
export const fillBlock = (parts: Part[], partId: string, chunk: Chunk): Part[] =>
  parts.map((p) => (p.id === partId && p.kind === 'block' ? { ...p, text: chunk.spanish, category: chunk.category } : p));

/** Empties a slot, or drops it when it was added by the student rather than part of the starting row. */
export const clearBlock = (parts: Part[], partId: string): Part[] => parts.map((p) => (p.id === partId && p.kind === 'block' ? { ...p, text: null, after: '' } : p));

/** Takes a part out of the row altogether. */
export const removePart = (parts: Part[], partId: string): Part[] => parts.filter((p) => p.id !== partId);

/** Adds an empty slot of a category at the end of the row. */
export const addSlot = (parts: Part[], category: string): Part[] => [...parts, { id: nextId(), kind: 'block', category, text: null, after: '' }];

/** Puts a joining word from the cement tray after a part. Joining words carry no value. */
export function addGlue(parts: Part[], afterPartId: string, word: string): Part[] {
  const i = parts.findIndex((p) => p.id === afterPartId);
  const at = i < 0 ? parts.length : i + 1;
  return [...parts.slice(0, at), { id: nextId(), kind: 'glue', text: word, after: '' }, ...parts.slice(at)];
}

/** Chunks of one category that are not already used in an answer, recycled first. For suggesting easier swaps. */
export function addableUnused(chunks: Chunk[], category: string, used: Set<string | null>): Chunk[] {
  return chunks.filter((c) => c.category === category && !used.has(c.spanish)).sort((a, b) => Number(b.recycled) - Number(a.recycled));
}
