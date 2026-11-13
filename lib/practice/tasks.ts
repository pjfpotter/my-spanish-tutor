import type { Chunk } from '../course/schema';
import { locateChunks } from '../diagnostics/chunks.ts';
import { tokenise } from '../speech/score.ts';
import { kindOf, type ChunkKind } from './chunk-kind.ts';
import { pickDistractors, shuffleOptions, type Option } from './distractors.ts';
import type { Pair } from './safe-input';
import type { TaskType } from './mixer';

/**
 * Builds the small warm-up tasks for one answer (tasks 21.1 to 21.3). The pieces are the answer's own chunks, found
 * in the course's sentence builder, so every task practises exactly what the student will say. Text only: no
 * pictures. Words that match no chunk become plain pieces, so any confirmed answer can be split. Pure given `random`.
 */
export interface Piece {
  /** Position in the answer. */
  id: string;
  text: string;
  /** Empty for a plain piece with no gloss. */
  english: string;
  kind: ChunkKind;
  /** The sentence-builder category of the matched chunk, if any. */
  category?: string;
}

/** Punctuation at the edges of a piece is not part of the thing being learned. */
const trim = (t: string) => t.replace(/^[.,;:!?¡¿"“”]+|[.,;:!?¡¿"“”]+$/g, '');

export function answerPieces(answer: string, courseChunks: readonly Chunk[]): Piece[] {
  const words = tokenise(answer);
  const located = locateChunks(answer, courseChunks.map((c, i) => ({ id: String(i), spanish: c.spanish })));
  const pieces: Omit<Piece, 'id'>[] = [];
  let at = 0;
  const plain = (to: number) => {
    if (to > at) pieces.push({ text: trim(words.slice(at, to).join(' ')), english: '', kind: 'other' });
  };
  for (const l of located) {
    plain(l.start);
    const c = courseChunks[Number(l.chunkId)];
    pieces.push({ text: trim(words.slice(l.start, l.end).join(' ')), english: c.english, kind: kindOf(c), category: c.category });
    at = l.end;
  }
  plain(words.length);
  return pieces.map((p, i) => ({ ...p, id: String(i) }));
}

function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export interface ChoiceTask {
  type: 'hear_choose' | 'tap_hear' | 'fill_gap';
  /** What to say aloud for the audio button, or null when nothing is played. */
  audio: string | null;
  /** The sentence with a gap, for fill the gap. */
  before: string;
  after: string;
  options: string[];
  correctIndex: number;
  /** Shown after an answer: the right option in full. */
  answer: string;
}
export interface ScrambleTask {
  type: 'scramble';
  tiles: Piece[];
  /** Tile ids in the right order. */
  answer: string[];
  english: string;
}
export interface MatchTask {
  type: 'match_pairs';
  pairs: Pair[];
  /** The English tiles, shuffled apart from the Spanish ones. */
  englishOrder: string[];
  spanishOrder: string[];
}
export type Task = ChoiceTask | ScrambleTask | MatchTask;

const asOption = (c: Chunk): Option => ({ spanish: c.spanish, english: c.english, category: c.category });

/** The task types that can be built for this answer. Saying it aloud is always possible. */
export function availableTypes(pieces: readonly Piece[], pool: readonly Chunk[]): TaskType[] {
  const glossed = pieces.filter((p) => p.english);
  const out: TaskType[] = [];
  if (glossed.length >= 1 && pool.length >= 3) out.push('hear_choose', 'tap_hear');
  if (glossed.length >= 3) out.push('match_pairs');
  if (pieces.length >= 2 && pool.length >= 3) out.push('fill_gap');
  if (pieces.length >= 3) out.push('scramble');
  out.push('say_aloud');
  return (['hear_choose', 'match_pairs', 'tap_hear', 'fill_gap', 'scramble', 'say_aloud'] as TaskType[]).filter((t) => out.includes(t));
}

export function buildTask(type: Exclude<TaskType, 'say_aloud'>, pieces: readonly Piece[], pool: readonly Chunk[], english: string, random: () => number = Math.random): Task | null {
  const glossed = pieces.filter((p) => p.english);
  const pick = <T,>(list: readonly T[]) => list[Math.min(list.length - 1, Math.floor(random() * list.length))];
  switch (type) {
    case 'hear_choose': {
      if (!glossed.length || pool.length < 3) return null;
      const target = pick(glossed);
      const wrong = pickDistractors({ spanish: target.text, english: target.english, category: target.category }, pool.map(asOption), 2, random);
      const { options, correctIndex } = shuffleOptions(target.english, wrong.map((w) => w.english), random);
      return { type, audio: target.text, before: '', after: '', options, correctIndex, answer: `${target.text} means ${target.english}` };
    }
    case 'tap_hear': {
      if (!glossed.length || pool.length < 3) return null;
      const target = pick(glossed);
      const wrong = pickDistractors({ spanish: target.text, english: target.english, category: target.category }, pool.map(asOption), 2, random);
      const { options, correctIndex } = shuffleOptions(target.text, wrong.map((w) => w.spanish), random);
      return { type, audio: target.text, before: '', after: '', options, correctIndex, answer: target.text };
    }
    case 'fill_gap': {
      if (pieces.length < 2 || pool.length < 3) return null;
      const at = Math.floor(random() * pieces.length);
      const target = pieces[at];
      const wrong = pickDistractors({ spanish: target.text, english: target.english, category: target.category }, pool.map(asOption), 2, random);
      const { options, correctIndex } = shuffleOptions(target.text, wrong.map((w) => w.spanish), random);
      return {
        type,
        audio: null,
        before: pieces.slice(0, at).map((p) => p.text).join(' '),
        after: pieces.slice(at + 1).map((p) => p.text).join(' '),
        options,
        correctIndex,
        answer: pieces.map((p) => p.text).join(' '),
      };
    }
    case 'scramble': {
      if (pieces.length < 3) return null;
      let tiles = shuffled(pieces, random);
      // Never hand over the answer already in order.
      for (let tries = 0; tries < 5 && tiles.every((t, i) => t.id === pieces[i].id); tries++) tiles = shuffled(pieces, random);
      if (tiles.every((t, i) => t.id === pieces[i].id)) tiles = [...tiles.slice(1), tiles[0]];
      return { type, tiles, answer: pieces.map((p) => p.id), english };
    }
    case 'match_pairs': {
      const chosen = shuffled(glossed.filter((p, i, all) => all.findIndex((q) => q.text === p.text || q.english === p.english) === i), random).slice(0, 4);
      if (chosen.length < 3) return null;
      const pairs = chosen.map((p) => ({ id: p.id, spanish: p.text, english: p.english }));
      return { type, pairs, spanishOrder: shuffled(pairs.map((p) => p.id), random), englishOrder: shuffled(pairs.map((p) => p.id), random) };
    }
  }
}
