import { pairKey, type Builder, type Item } from './builder.ts';
import { activeLines, clash, slotItems, type Answer } from './engine.ts';

/**
 * Pair verdicts (task 4.5). Every pair of chunks that share a sentence frame and that the rules still
 * allow is judged by the exam rule: grammatical and could be true. Two independent passes are made. A pair
 * is blocked only when every pass says "clash"; a disagreement leaves it allowed, and "odd" is allowed and
 * never shown to a student, because odd is not wrong.
 */
export type Verdict = 'fits' | 'odd' | 'clash';
export interface PairSide { chunk: string; slot: string; es: string; en: string | null }
export interface PairQuestion { id: number; a: PairSide; b: PairSide }

const ref = (it: Item) => `${it.col}:${it.i}`;
const side = (slot: string, it: Item): PairSide => ({ chunk: ref(it), slot, es: it.es, en: it.en });

/** The allowed pairs of chunks that share a frame, each pair once, in a fixed order. */
export function enumeratePairs(B: Builder, max = 12000): { pairs: PairQuestion[]; truncated: boolean } {
  const seen = new Set<string>(), pairs: PairQuestion[] = [];
  let truncated = false;
  for (const Q of B.questions) {
    for (const f of activeLines(B, Q)) {
      for (let i = 0; i < f.slots.length; i++) for (let j = i + 1; j < f.slots.length; j++) {
        const A = B.slotMap[f.slots[i]], C = B.slotMap[f.slots[j]];
        for (const ia of slotItems(B, A)) for (const ib of slotItems(B, C)) {
          const k = pairKey(ref(ia), ref(ib));
          if (seen.has(k) || ia === ib) continue;
          const a: Answer = {};
          if (A.after || C.after) continue; // dependent slots are judged through the pair they depend on
          if (clash(B, a, A.key, ia, Q)) continue;
          a[A.key] = ia;
          if (clash(B, a, C.key, ib, Q)) continue;
          seen.add(k);
          if (pairs.length >= max) { truncated = true; continue; }
          pairs.push({ id: pairs.length, a: side(A.key, ia), b: side(C.key, ib) });
        }
      }
    }
  }
  return { pairs, truncated };
}

export function parseVerdicts(output: unknown): Map<number, Verdict> {
  const m = new Map<number, Verdict>();
  const list = typeof output === 'object' && output !== null ? (output as { verdicts?: unknown }).verdicts : null;
  if (!Array.isArray(list)) return m;
  for (const v of list) {
    if (typeof v !== 'object' || v === null) continue;
    const { id, verdict } = v as { id?: unknown; verdict?: unknown };
    if (typeof id === 'number' && (verdict === 'fits' || verdict === 'odd' || verdict === 'clash')) m.set(id, verdict);
  }
  return m;
}

export interface PairOutcome { blocks: { a: string; b: string }[]; asked: number; agreedClash: number; disagreed: number; odd: number }
/** `ask` returns one verdict map for a batch and a pass number; a failed batch returns null and counts as "fits". */
export async function judgePairs(pairs: PairQuestion[], ask: (batch: PairQuestion[], pass: number) => Promise<Map<number, Verdict> | null>, opts: { batch?: number; passes?: number } = {}): Promise<PairOutcome> {
  const size = opts.batch ?? 60, passes = opts.passes ?? 2;
  const votes = new Map<number, Verdict[]>();
  for (let p = 0; p < passes; p++) {
    for (let i = 0; i < pairs.length; i += size) {
      const batch = pairs.slice(i, i + size);
      const got = (await ask(p % 2 === 0 ? batch : [...batch].reverse(), p)) ?? new Map<number, Verdict>();
      for (const q of batch) votes.set(q.id, [...(votes.get(q.id) ?? []), got.get(q.id) ?? 'fits']);
    }
  }
  const out: PairOutcome = { blocks: [], asked: pairs.length, agreedClash: 0, disagreed: 0, odd: 0 };
  for (const q of pairs) {
    const v = votes.get(q.id) ?? [];
    if (v.length === passes && v.every((x) => x === 'clash')) { out.blocks.push({ a: q.a.chunk, b: q.b.chunk }); out.agreedClash++; }
    else if (v.some((x) => x === 'clash')) out.disagreed++;
    else if (v.some((x) => x === 'odd')) out.odd++;
  }
  return out;
}
