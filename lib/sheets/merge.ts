import type { ChunkProps, Condition, Frame, FramePart, Interpretation, InterpretedQuestion, OddRule } from './interpretation.ts';
import type { Sheet } from './types.ts';

/**
 * Joins several sentence builders into one sheet and one interpretation (testing-course-five-builders).
 * A course holds a single sheet and a single interpretation, and the engine already limits a question to
 * some of a sheet's parts through `block`/`blocks`, so five builders become five blocks of one sheet.
 *
 * Nothing is added to or removed from what the reader found. Tables are renumbered so cell ids stay unique,
 * every column and slot key gets a short prefix so keys cannot collide, every reference inside the
 * interpretation is rewritten to match, and each part's slots, frames and questions are tied to its own block.
 */
export interface MergePart {
  /** Short, lower-case, letters only. Becomes the key prefix and must be unique. */
  prefix: string;
  sheet: Sheet;
  interpretation: Interpretation;
}

export interface MergeNames { name: string; title: string; subtitle: string }

const mapKeys = <T>(o: Record<string, T> | undefined, f: (k: string) => string): Record<string, T> | undefined =>
  o ? Object.fromEntries(Object.entries(o).map(([k, v]) => [f(k), v])) : undefined;

/** Merges the parts in order; part n becomes block n. Throws on a prefix clash or on content that cannot be merged safely. */
export function mergeSheets(parts: MergePart[], names: MergeNames): { sheet: Sheet; interpretation: Interpretation } {
  const prefixes = new Set<string>();
  for (const p of parts) {
    if (!/^[a-z]+$/.test(p.prefix)) throw new Error(`Prefix "${p.prefix}" must be lower-case letters.`);
    if (prefixes.has(p.prefix)) throw new Error(`Prefix "${p.prefix}" is used twice.`);
    prefixes.add(p.prefix);
    if (p.interpretation.requiredAny) throw new Error(`"${p.prefix}" uses requiredAny, which applies to a whole sheet and cannot be merged. Give each question its own "required".`);
  }
  const floatUsers = parts.filter((p) => p.interpretation.columns.some((c) => c.cell === 'float0'));
  if (floatUsers.length > 1) throw new Error('More than one part uses its floating text box, which cannot be told apart once merged.');

  const sheet: Sheet = { titles: [], tables: [], floats: [], warnings: [], stats: { items: 0, glossed: 0, hard: 0 }, flags: { hasBold: false, hasItalic: false }, images: 0 };
  const out: Interpretation = {
    version: 1, name: names.name, title: names.title, subtitle: names.subtitle,
    columns: [], props: {}, slots: [], frames: [], questions: [], required: [], together: [], auto: [], ignore: [],
    rules: { polarity: [] }, corrections: [], pairBlocks: [],
  };

  parts.forEach((part, block) => {
    const offset = sheet.tables.length;
    const k = (key: string) => `${part.prefix}_${key}`;
    // A chunk reference is `column:index`; only the column part changes.
    const ref = (r: string) => { const [col, i] = r.split(':'); return `${k(col)}:${i}`; };
    const cell = (id: string) => (id === 'float0' ? id : id.replace(/^t(\d+)/, (_, n) => `t${Number(n) + offset}`));
    const s = part.sheet, ip = part.interpretation;

    sheet.titles.push(...s.titles.map((t) => ({ ...t, after: t.after + offset })));
    sheet.tables.push(...s.tables.map((t, i) => ({ ...t, index: offset + i, cells: t.cells.map((c) => ({ ...c, id: cell(c.id) })) })));
    sheet.floats.push(...s.floats.map((f) => ({ ...f, host: cell(f.host) })));
    sheet.warnings.push(...s.warnings.map((w) => `${part.prefix}: ${w}`));
    sheet.stats.items += s.stats.items; sheet.stats.glossed += s.stats.glossed; sheet.stats.hard += s.stats.hard;
    sheet.flags.hasBold ||= s.flags.hasBold; sheet.flags.hasItalic ||= s.flags.hasItalic;
    sheet.images += s.images;

    const cond = (c: Condition): Condition => ({ ...c, ...(c.filled ? { filled: k(c.filled) } : {}), ...(c.slot ? { slot: k(c.slot) } : {}) });
    const odd = (o: OddRule): OddRule => ({ ...o, ...(o.slot ? { slot: k(o.slot) } : {}), ...(o.col ? { col: k(o.col) } : {}) });
    const prop = (p: ChunkProps): ChunkProps => ({
      ...p,
      ...(p.needs ? { needs: { ...p.needs, slot: k(p.needs.slot) } } : {}),
      ...(p.odd ? { odd: p.odd.map(odd) } : {}),
      ...(p.allowIf ? { allowIf: { anyOf: p.allowIf.anyOf.map(cond) } } : {}),
    });
    const part2 = (x: FramePart): FramePart => ('slot' in x ? { ...x, slot: k(x.slot) } : 'list' in x ? { list: x.list.map((pair) => pair.map(k)) } : { ...x, ...(x.if ? { if: k(x.if) } : {}) });
    const frame = (f: Frame): Frame => ({ ...f, block, ...(f.core ? { core: f.core.map(k) } : {}), slots: f.slots.map(k), parts: f.parts.map(part2), ...(f.joinSlot ? { joinSlot: k(f.joinSlot) } : {}) });
    const question = (q: InterpretedQuestion): InterpretedQuestion => ({
      ...q, blocks: [block],
      ...(q.req ? { req: mapKeys(q.req, k) } : {}),
      required: (q.required ?? ip.required).map(k),
    });

    out.columns.push(...ip.columns.map((c) => ({ ...c, key: k(c.key), cell: cell(c.cell) })));
    for (const [key, p] of Object.entries(ip.props)) out.props[ref(key)] = prop(p);
    out.slots.push(...ip.slots.map((sl) => ({
      ...sl, key: k(sl.key), cols: sl.cols.map(k), block,
      ...(sl.only ? { only: sl.only.map(ref) } : {}),
      ...(sl.after ? { after: k(sl.after) } : {}), ...(sl.alignWith ? { alignWith: k(sl.alignWith) } : {}), ...(sl.agree ? { agree: k(sl.agree) } : {}),
      ...(sl.enMerge ? { enMerge: k(sl.enMerge) } : {}), ...(sl.distinct ? { distinct: k(sl.distinct) } : {}),
      ...(sl.link ? { link: Object.fromEntries(Object.entries(sl.link).map(([a, b]) => [k(a), k(b)])) } : {}),
    })));
    out.frames.push(...ip.frames.map(frame));
    out.questions.push(...ip.questions.map(question));
    out.together.push(...ip.together.map((g) => g.map(k)));
    out.auto.push(...ip.auto.map(k));
    out.ignore.push(...ip.ignore.filter((w) => !out.ignore.includes(w)));
    out.rules.polarity.push(...ip.rules.polarity.map((r) => ({ s: k(r.s), c: r.c ? k(r.c) : null, r: k(r.r) })));
    out.corrections.push(...ip.corrections.map((c) => ({ ...c, chunk: ref(c.chunk) })));
    (out.pairBlocks as { a: string; b: string }[]).push(...(ip.pairBlocks ?? []).map((p) => ({ a: ref(p.a), b: ref(p.b) })));
  });

  const seen = new Set<string>();
  for (const q of out.questions) {
    const n = q.es.toLowerCase();
    if (seen.has(n)) throw new Error(`Two parts answer the same question: ${q.es}`);
    seen.add(n);
  }
  return { sheet, interpretation: out };
}
