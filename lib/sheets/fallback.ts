import type { Answer, Question } from './engine.ts';
import { fragment, isReady } from './engine.ts';
import type { Builder } from './builder.ts';
import type { Frame, Interpretation, InterpretedColumn, InterpretedSlot } from './interpretation.ts';
import type { Sheet } from './types.ts';

/**
 * The safe fallback (task 3.2). When drafting or repair fails, a sheet still goes live as a layout-order
 * draft: every list is a part, parts follow the table's reading order, and no fit rules are known. It
 * is less guided but never broken, and a finished answer gets a codes-only check.
 */
const LINK = /^(porque|ya que|dado que|aunque|sin embargo|pero|y)(?![\p{L}])/iu;
const TIME = /(?<![\p{L}])(lunes|martes|sábados?|domingos?|semana|año|verano|invierno|mes|días?|mañana|tarde|noche|siempre|nunca|a veces|a menudo|vez|cuando|hoy|ayer)(?![\p{L}])/iu;
const REASON = /^(es|fue|son|me hace|me )/i;

function guessKind(items: { es: string }[], idx: number): string {
  const share = (re: RegExp) => items.filter((i) => re.test(i.es)).length / Math.max(1, items.length);
  if (share(LINK) > 0.5) return 'link';
  if (share(TIME) > 0.4) return 'time';
  if (share(REASON) > 0.5) return 'reason';
  return idx === 0 ? 'opinion' : (['detail', 'other', 'opinion'] as const)[idx % 3];
}

export function fallbackInterpretation(sheet: Sheet, name: string): Interpretation {
  const columns: InterpretedColumn[] = [], slots: InterpretedSlot[] = [], rows = new Map<string, string[]>();
  let n = 0;
  for (const t of sheet.tables) for (const c of t.cells.filter((x) => x.items.length)) {
    const key = `p${n}`;
    columns.push({ key, cell: c.id, title: `Part ${n + 1}`, kind: guessKind(c.items, n) });
    slots.push({ key, cols: [key], label: `part ${n + 1}`, noun: 'a part', prompt: 'Pick a chunk' });
    const rk = `${t.index}:${c.r}`;
    rows.set(rk, [...(rows.get(rk) ?? []), key]);
    n++;
  }
  const frames: Frame[] = [...rows.values()].map((keys, i) => ({ extra: i > 0, slots: keys, parts: keys.map((k) => ({ slot: k })) }));
  const title = sheet.titles[0];
  const q = { es: title?.es ?? name, en: title?.en ?? 'Uploaded sheet' };
  return {
    version: 1, name, title: q.es, subtitle: q.en, columns, props: {}, slots, frames, questions: [q],
    required: slots.slice(0, 1).map((s) => s.key), together: [], auto: slots.map((s) => s.key), ignore: [], rules: { polarity: [] }, corrections: [],
  };
}

export type AnswerCode = 'ok' | 'incomplete' | 'unchecked';
/** A codes-only check of a finished answer. With no model it can say whether the answer is whole; it does not judge meaning. */
export function checkAnswerCodes(B: Builder, a: Answer, Q?: Question, model?: (a: Answer) => 'ok' | 'clash'): { code: AnswerCode; missing?: string } {
  const f = fragment(B, a, Q);
  if (f) return { code: 'incomplete', missing: f.missing };
  if (!isReady(B, a, Q)) return { code: 'incomplete' };
  if (!model) return { code: 'unchecked' };
  return { code: model(a) === 'ok' ? 'ok' : 'unchecked' };
}
