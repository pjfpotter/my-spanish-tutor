import type { Interpretation } from './interpretation.ts';
import type { Sheet } from './types.ts';

/**
 * Content screening for uploaded sheets (task 4.7). A teacher's document is untrusted: it is screened
 * before a model sees it and again for what a model returns. Instruction-like text is NOT blocked here;
 * it is harmless because it is only ever passed as quoted data. What is blocked is content that must not
 * reach 12 and 13 year olds. The list is deliberately short and plain; the owner and a school safeguarding
 * lead own it and should extend it.
 */
export const BLOCKLIST: string[] = [
  'joder', 'mierda', 'puta', 'puto', 'cabron', 'cabrona', 'gilipollas', 'coño', 'follar', 'polla', 'pene', 'vagina',
  'fuck', 'shit', 'bitch', 'cunt', 'dick', 'porn', 'porno', 'sexo', 'sexual', 'desnudo', 'nude', 'kill yourself', 'suicidio', 'matar',
];

const strip = (s: string) => s.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
const WORDS = BLOCKLIST.map((w) => strip(w));

export interface Screening { ok: boolean; hits: { text: string; word: string }[] }

export function screenStrings(strings: string[]): Screening {
  const hits: Screening['hits'] = [];
  for (const t of strings) {
    const s = ` ${strip(t)} `;
    for (const w of WORDS) if (s.includes(` ${w} `)) hits.push({ text: t, word: w });
  }
  return { ok: hits.length === 0, hits };
}

export function screenSheet(sheet: Sheet): Screening {
  const all: string[] = sheet.titles.flatMap((t) => [t.es, t.en ?? '']);
  for (const t of sheet.tables) for (const c of t.cells) for (const i of c.items) all.push(i.es, i.en ?? '');
  for (const f of sheet.floats) for (const i of f.items) all.push(i.es, i.en ?? '');
  return screenStrings(all);
}

/** Everything a model wrote that a student or teacher might read. */
export function screenInterpretation(i: Interpretation): Screening {
  const all: string[] = [i.name, i.title, i.subtitle];
  i.columns.forEach((c) => all.push(c.title, c.hint ?? ''));
  i.slots.forEach((s) => all.push(s.label, s.noun, s.prompt, s.afterMsg ?? ''));
  i.questions.forEach((q) => all.push(q.es, q.en));
  i.corrections.forEach((c) => all.push(c.to));
  Object.values(i.props).forEach((p) => { all.push(p.denyMsg ?? ''); (p.choice ?? []).forEach((v) => all.push(v.es, v.en)); });
  i.frames.forEach((f) => f.parts.forEach((p) => { if ('fixed' in p) all.push(p.fixed.es, p.fixed.en); }));
  return screenStrings(all);
}
