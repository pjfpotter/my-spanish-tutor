import type { ChunkProps, Frame, Interpretation, InterpretedColumn, InterpretedQuestion, InterpretedSlot, PolarityRule } from './interpretation.ts';
import type { Sheet } from './types.ts';

/** A chunk ready for the engine: the printed text (corrected where the interpretation says so) plus its properties. */
export interface Item extends ChunkProps {
  es: string;
  en: string | null;
  hard: boolean;
  col: string;
  i: number;
  id: string;
  /** Present when a correction changed the text: what the sheet printed. */
  original?: { es?: string; en?: string | null };
  /** For a chosen variant: the chunk it came from, and which variant. */
  baseItem?: Item;
  vi?: number;
}

export const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

export interface Column extends InterpretedColumn { items: Item[]; w: number }
export interface Slot extends InterpretedSlot { line?: number }
export interface Pattern { it: Item; t: string[]; vi?: number; es: string }

export interface Builder {
  id: string;
  name: string;
  title: string;
  subtitle: string;
  columns: Column[];
  cols: Record<string, Column>;
  slots: Slot[];
  slotMap: Record<string, Slot>;
  frames: Frame[];
  questions: InterpretedQuestion[];
  required: string[];
  requiredAny?: string[][];
  together: string[][];
  auto: string[];
  ignore: string[];
  rules: { polarity: PolarityRule[] };
  patterns: Pattern[];
  /** `a|b` with the two chunk references in sorted order. */
  pairBlocks: Set<string>;
}

/**
 * Joins what the reader found with an interpretation. Corrections replace the printed text, and the
 * printed text is kept on the item (`original`) so a correction can be shown to the teacher or undone.
 */
export function buildBuilder(id: string, sheet: Sheet, interp: Interpretation): Builder {
  const cells = new Map<string, { es: string; en: string | null; hard: boolean }[]>();
  for (const t of sheet.tables) for (const c of t.cells) cells.set(c.id, c.items);
  const floatItems = sheet.floats.flatMap((f) => f.items.map((x) => ({ es: x.es, en: x.en, hard: false })));
  cells.set('float0', floatItems);

  const fixes = new Map<string, { field: 'es' | 'en'; to: string }[]>();
  for (const c of interp.corrections) fixes.set(c.chunk, [...(fixes.get(c.chunk) ?? []), { field: c.field, to: c.to }]);

  const columns: Column[] = interp.columns.map((ic) => {
    const src = cells.get(ic.cell) ?? [];
    const items: Item[] = src.map((chunk, i) => {
      const key = `${ic.key}:${i}`;
      const it: Item = { ...(interp.props[key] ?? {}), es: chunk.es, en: chunk.en, hard: chunk.hard, col: ic.key, i, id: `${id}:${key}` };
      for (const f of fixes.get(key) ?? []) {
        it.original = { ...it.original, [f.field]: f.field === 'es' ? it.es : it.en };
        if (f.field === 'es') it.es = f.to; else it.en = f.to;
      }
      return it;
    });
    return { ...ic, items, w: 0 };
  });
  const cols: Record<string, Column> = Object.fromEntries(columns.map((c) => [c.key, c]));
  const slots: Slot[] = interp.slots.map((s) => ({ ...s }));
  const slotMap: Record<string, Slot> = Object.fromEntries(slots.map((s) => [s.key, s]));
  interp.frames.forEach((f, i) => f.slots.forEach((k) => { const s = slotMap[k]; if (s) { s.line = i; if (f.block != null) s.block = f.block; } }));
  return {
    id, name: interp.name, title: interp.title, subtitle: interp.subtitle, columns, cols, slots, slotMap, frames: interp.frames, questions: interp.questions,
    required: interp.required, requiredAny: interp.requiredAny, together: interp.together, auto: interp.auto, ignore: interp.ignore, rules: interp.rules, patterns: [], pairBlocks: new Set((interp.pairBlocks ?? []).map((p) => pairKey(p.a, p.b))),
  };
}
