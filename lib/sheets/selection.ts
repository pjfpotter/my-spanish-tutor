import type { Builder, Item } from './builder.ts';
import { derive, type Answer } from './engine.ts';

/** A student's choices as plain data: for each slot, the chunk (column and index) and, for a chunk with a choice of forms, which form. */
export type Selection = Record<string, { col: string; i: number; vi?: number }>;

export function toSelection(a: Answer): Selection {
  const out: Selection = {};
  for (const [k, it] of Object.entries(a)) {
    if (!it) continue;
    const base = it.baseItem ?? it;
    out[k] = it.vi != null ? { col: base.col, i: base.i, vi: it.vi } : { col: base.col, i: base.i };
  }
  return out;
}

/** Rebuilds an answer from stored choices. Returns null if anything does not exist in this builder, so a stale or tampered record is never trusted. */
export function fromSelection(B: Builder, sel: unknown): Answer | null {
  if (!sel || typeof sel !== 'object' || Array.isArray(sel)) return null;
  const a: Answer = {};
  for (const [k, v] of Object.entries(sel as Record<string, unknown>)) {
    const slot = B.slotMap[k];
    const r = v as { col?: unknown; i?: unknown; vi?: unknown } | null;
    if (!slot || !r || typeof r.col !== 'string' || typeof r.i !== 'number') return null;
    const col = B.cols[r.col];
    const item: Item | undefined = col?.items.find((x) => x.i === r.i);
    if (!item || !slot.cols.includes(r.col)) return null;
    if (r.vi == null) a[k] = item;
    else if (typeof r.vi === 'number' && item.choice?.[r.vi]) a[k] = derive(item, r.vi);
    else return null;
  }
  return a;
}
