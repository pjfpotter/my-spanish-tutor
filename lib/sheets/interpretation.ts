/**
 * The interpretation of a sentence builder: what its chunks mean and how they combine, as DATA (task 2.1).
 * A model drafts it once at upload; it may only refer to chunks and cells the reader produced, and it
 * never adds or removes chunks. Nothing here is code, so it can be stored, validated and diffed.
 *
 * Chunks are addressed as `column:index`, where the column is one of this interpretation's columns and
 * the index is the chunk's position in the reader's list for that cell.
 */
export type Polarity = '+' | '-' | '0' | '*';

/** A condition on the answer so far, used by `allowIf`. */
export interface Condition {
  /** True when this slot is filled. */
  filled?: string;
  /** True when this slot's chunk has this polarity (and optional tag). */
  slot?: string;
  pol?: Polarity;
  tag?: string;
}

export interface OddRule {
  /** The slot whose chunk makes this one odd (or `col` for any slot of a column). */
  slot?: string;
  col?: string;
  tag?: string;
  any?: boolean;
  kind?: string;
  /** Blame the other chunk rather than this one. */
  blame?: 'other';
}

export interface ChunkProps {
  pol?: Polarity;
  tags?: string[];
  /** What kind of chunk it is, for slots that accept only some (for example "negative" or "plan"). */
  roles?: string[];
  /** The question variant this chunk belongs to (for example "habit" or "plan"). */
  qtag?: string;
  /** Row of the table the chunk sits in, so aligned lists can be matched. */
  row?: number;
  gen?: 'm' | 'f';
  num?: 's' | 'p';
  /** An adjective's masculine singular form, from which the other forms are made. */
  base?: string;
  adj?: boolean;
  /** Variants the student chooses between, such as "hermano" and "hermana". */
  choice?: { es: string; en: string }[];
  /** A connector that reverses polarity ("aunque"). */
  flip?: boolean;
  /** A connector that begins a new sentence ("sin embargo"). */
  lead?: boolean;
  branch?: string;
  needs?: { slot: string; tag: string };
  odd?: OddRule[];
  allowIf?: { anyOf: Condition[] };
  denyMsg?: string;
}

export interface InterpretedColumn {
  key: string;
  /** The reader's cell id (`t0r1c2`), or `float0` for the first floating box. */
  cell: string;
  title: string;
  hint?: string;
  /** Colour group: opinion, detail, link, reason, time or other. */
  kind: string;
  /** May be chosen more than once across slots (colours). */
  repeat?: boolean;
  /** Printed but never chosen (a fixed word such as "está"). */
  static?: boolean;
  /** A floating note on the sheet. */
  sticky?: boolean;
}

export interface InterpretedSlot {
  key: string;
  cols: string[];
  label: string;
  noun: string;
  prompt: string;
  /** Accepts chunks having any of these roles. */
  accepts?: string[];
  /** Rejects chunks having any of these roles. */
  rejects?: string[];
  /** Accepts only these chunks (`column:index`). */
  only?: string[];
  after?: string;
  afterMsg?: string;
  alignWith?: string;
  agree?: string;
  agreeTo?: { gen: 'm' | 'f'; num: 's' | 'p' };
  /** In English, this slot's word goes before the named slot's ("a red jumper"). */
  enMerge?: string;
  distinct?: string;
  /** Where a rule that names a slot should look instead, for a second copy of a frame. */
  link?: Record<string, string>;
  block?: number;
}

export type FramePart =
  | { slot: string; pre?: { es: string; en: string }; stripTo?: boolean }
  | { fixed: { es: string; en: string }; if?: string }
  | { list: string[][] };

export interface Frame {
  /** The parts that must all be present once any part of the frame is. */
  core?: string[];
  slots: string[];
  parts: FramePart[];
  /** A slot whose chunk joins this frame to the sentence before it. */
  joinSlot?: string;
  /** A fixed joining word (may be empty to just continue the sentence). */
  join?: { es: string; en: string };
  extra?: boolean;
  block?: number;
}

export interface InterpretedQuestion {
  es: string;
  en: string;
  /** Slot-to-variant filter, for example `{ verb: 'plan' }`. */
  req?: Record<string, string>;
  blocks?: number[];
  required?: string[];
}

export type CorrectionType = 'spelling' | 'agreement' | 'missing-english' | 'wrong-english';
export interface Correction {
  /** The chunk, as `column:index`. */
  chunk: string;
  field: 'es' | 'en';
  to: string;
  type: CorrectionType;
}

export interface PolarityRule { s: string; c: string | null; r: string }

export interface Interpretation {
  version: 1;
  name: string;
  title: string;
  subtitle: string;
  columns: InterpretedColumn[];
  props: Record<string, ChunkProps>;
  slots: InterpretedSlot[];
  frames: Frame[];
  questions: InterpretedQuestion[];
  /** Slots that must be filled for a question with no `required` of its own. */
  required: string[];
  /** Or: any one of these groups of slots, filled, is enough. */
  requiredAny?: string[][];
  /** Slots that go together: all or none. */
  together: string[][];
  /** The order the guide walks through empty slots. */
  auto: string[];
  /** Words printed on the sheet that are not chunks (for example "con" or "está"). */
  ignore: string[];
  rules: { polarity: PolarityRule[] };
  corrections: Correction[];
  /** Pairs of chunks that cannot be on one card, found by judging every pair at upload (`column:index` each). */
  pairBlocks?: { a: string; b: string }[];
}

export const CORRECTION_TYPES: CorrectionType[] = ['spelling', 'agreement', 'missing-english', 'wrong-english'];
