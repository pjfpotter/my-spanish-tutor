import type { CauseTag } from '../events/attempts';

/**
 * Scaffolding kinds (task 21.5). Support is not only words fading out. From the most help to the least:
 * listen then repeat (the whole script, played first), a gapped script, the answer revealed chunk by chunk,
 * the first word of each chunk, and the English meaning alone. The kind is chosen from recent results and cause tags, and it steps down
 * one kind at a time as the student does well. Pictures are deliberately not a kind.
 */
export const SCAFFOLDS = ['listen_repeat', 'gaps', 'chunk_reveal', 'first_words', 'english'] as const;
export type Scaffold = (typeof SCAFFOLDS)[number];

export interface ScaffoldConfig {
  threshold: number;
  /** Good attempts in a row before support steps down one kind. */
  stepDownAfter: number;
  /** Struggling attempts in a row before support steps back up one kind. */
  stepUpAfter: number;
  hardBelow: number;
}

export const DEFAULT_SCAFFOLD: ScaffoldConfig = { threshold: 80, stepDownAfter: 2, stepUpAfter: 2, hardBelow: 40 };

export interface ScaffoldState {
  /** Index into SCAFFOLDS. */
  at: number;
  good: number;
  hard: number;
}

export const START_SCAFFOLD: ScaffoldState = { at: 0, good: 0, hard: 0 };

export function nextScaffold(s: ScaffoldState, accuracy: number, cfg: ScaffoldConfig = DEFAULT_SCAFFOLD): ScaffoldState {
  const last = SCAFFOLDS.length - 1;
  if (accuracy >= cfg.threshold) {
    const good = s.good + 1;
    return good >= cfg.stepDownAfter && s.at < last ? { at: s.at + 1, good: 0, hard: 0 } : { at: s.at, good, hard: 0 };
  }
  if (accuracy < cfg.hardBelow) {
    const hard = s.hard + 1;
    return hard >= cfg.stepUpAfter && s.at > 0 ? { at: s.at - 1, good: 0, hard: 0 } : { at: s.at, good: 0, hard };
  }
  return { at: s.at, good: 0, hard: 0 };
}

/** Where a new student with a known cause starts, instead of always at the most help. */
export function startFromCauses(causes: readonly CauseTag[]): ScaffoldState {
  // A sound problem starts with listening; a stubborn chunk starts chunk by chunk; not known well enough starts with a gapped script.
  const at = causes.includes('sound_spelling_gap') ? 0 : causes.includes('chunk_hotspot') || causes.includes('stress_related') ? 2 : causes.includes('not_known_well_enough') ? 1 : 0;
  return { at, good: 0, hard: 0 };
}

/** Where a student stands from their accuracies in time order, so support carries across sessions. */
export const foldScaffold = (accuracies: readonly number[], start: ScaffoldState = START_SCAFFOLD, cfg: ScaffoldConfig = DEFAULT_SCAFFOLD): ScaffoldState =>
  accuracies.reduce((s, a) => nextScaffold(s, a, cfg), start);

export interface ScaffoldView {
  kind: Scaffold;
  /** Each word is shown (true) or hidden (false). */
  shown: boolean[];
  /** The English meaning is on screen. */
  english: boolean;
  /** The answer is played before the student speaks. */
  listenFirst: boolean;
  /** How many chunks are visible, for chunk reveal. */
  chunksShown: number;
  /** The words of the chunk the student is on, so a gapped script can leave the right ones. */
  note: string;
}

/**
 * What the prompt shows for one scaffold kind. `chunks` is the answer split into chunks, each a list of words.
 * `revealed` is how many chunks the student has said correctly so far.
 */
export function viewFor(kind: Scaffold, chunks: readonly (readonly string[])[], revealed = 0): ScaffoldView {
  const total = chunks.flat().length;
  const base = { kind, english: true, listenFirst: false, chunksShown: chunks.length, note: '' };
  switch (kind) {
    case 'listen_repeat':
      return { ...base, shown: new Array(total).fill(true), listenFirst: true, note: 'Listen, then say it.' };
    case 'chunk_reveal': {
      const shown = chunks.flatMap((c, i) => c.map(() => i <= revealed));
      return { ...base, shown, chunksShown: Math.min(chunks.length, revealed + 1), note: 'One chunk at a time.' };
    }
    case 'first_words':
      return { ...base, shown: chunks.flatMap((c) => c.map((_, i) => i === 0)), note: 'The first word of each chunk.' };
    case 'gaps':
      return { ...base, shown: chunks.flatMap((c, ci) => c.map((_, i) => (ci + i) % 2 === 0)), note: 'Fill the gaps.' };
    case 'english':
      return { ...base, shown: new Array(total).fill(false), note: 'Just the English.' };
  }
}

/** Chunk-by-chunk build-up (task 21.5): each chunk alone, then pairs, then the whole answer. */
export function buildUpSteps(chunkCount: number): number[][] {
  const steps: number[][] = [];
  for (let i = 0; i < chunkCount; i++) steps.push([i]);
  for (let i = 0; i + 1 < chunkCount; i++) steps.push([i, i + 1]);
  if (chunkCount > 2) steps.push(Array.from({ length: chunkCount }, (_, i) => i));
  return steps;
}

/**
 * The weakest support a live cause tag allows, as an index into SCAFFOLDS (task 21.5). The kind shown is the
 * one the student's results ask for, but never weaker than this: a chunk the student keeps missing, or an answer
 * with stress trouble, is never practised from the first words or the English alone, and an answer not known well
 * enough keeps at least its gaps. Null means no tag asks for more help.
 */
export function supportCap(causes: readonly CauseTag[]): number | null {
  const caps: number[] = [];
  if (causes.includes('sound_spelling_gap')) caps.push(0);
  if (causes.includes('not_known_well_enough')) caps.push(1);
  if (causes.includes('chunk_hotspot') || causes.includes('stress_related')) caps.push(2);
  // When several tags apply, the one asking for the most help wins.
  return caps.length ? Math.min(...caps) : null;
}

/** The support level to show: the level from results, capped by what the cause tags allow. */
export function capLevel(level: number, causes: readonly CauseTag[]): number {
  const cap = supportCap(causes);
  return cap === null ? level : Math.min(level, cap);
}

/**
 * The chunk-by-chunk build-up for a stumbling chunk (task 21.5): the chunk alone, then with its neighbour, and then
 * the whole answer, which is the normal attempt that follows. Each step is a list of chunk positions. An answer with
 * fewer than three chunks has nothing to build up, and a position outside the answer gives no plan.
 */
export function buildUpFor(chunkCount: number, missed: number): number[][] {
  if (chunkCount < 3 || missed < 0 || missed >= chunkCount) return [];
  const pair = missed + 1 < chunkCount ? [missed, missed + 1] : [missed - 1, missed];
  return [[missed], pair];
}
