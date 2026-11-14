import type { Builder, Item } from './builder.ts';
import { activeLines, clash, compose, derive, fragment, isReady, isRequired, parseText, slotFits, slotItems, type Answer, type Question } from './engine.ts';
import type { Sheet } from './types.ts';

/**
 * The verification gate (task 3.1). It runs on a drafted interpretation before any course uses it and
 * returns a list of failures. The same checks run in CI on fixture sheets. They find faults of form
 * (half-built sentences, Spanish left in English, repeated words, known teacher slips, typed text that
 * does not read back, required parts with nothing to pick). They cannot judge meaning; that is the pair
 * verdicts' job (spec: sheet-ingestion).
 */
export type CheckName = 'fragment' | 'spanish-in-english' | 'repeated-word' | 'article' | 'known-typo' | 'capital' | 'punctuation' | 'round-trip' | 'dead-end' | 'reading-size';
export interface Failure { check: CheckName; count: number; examples: string[] }
export interface Verification {
  ok: boolean;
  failures: Failure[];
  stats: { pairs: number; blocked: number; allowed: number; answers: number };
}
export interface VerifyOptions { walks?: number; seed?: number; sheet?: Sheet; phoneWidth?: number }

/** Teacher slips seen on real sheets. Extend as new ones turn up. */
export const KNOWN_TYPOS: RegExp[] = [/marrónes/i, /(?<![\p{L}])(el|un) pared(?![\p{L}])/iu, /(?<![\p{L}])i did(?![\p{L}])/u, /perdida de tiempo/i];

const PROPER = /(Skype|Zoom|España|Francia|Italia|Estados Unidos|SMS|Internet)/;
const DANGLING = /(?<![\p{L}])(es|era|hay|tiene|que|porque|de|del|con|a|por|y|pero|muy|bastante|extremamente|el|la|los|las|un|una)[.!?]$/iu;
const SPANISH_ONLY = /(?<![\p{L}'])(los|las|un|una|unos|unas|del|mis|tu|que|fue|por|para|y|en|es|pero|muy|el|la|de)(?![\p{L}'])/iu;

export function lintSpanish(text: string): CheckName[] {
  const out: CheckName[] = [];
  const sentences = text.split(/(?<=[.!?…])\s+/);
  if (sentences.some((s) => DANGLING.test(s.trim()))) out.push('fragment');
  if (/(?<![\p{L}])(\p{L}+) \1(?![\p{L}])/iu.test(text)) out.push('repeated-word');
  if (/(?<![\p{L}])(de|a) el(?![\p{L}])/iu.test(text)) out.push('article');
  if (KNOWN_TYPOS.some((r) => r.test(text))) out.push('known-typo');
  if (/[.!?] \p{Ll}/u.test(text) || /(?<=\p{Ll}) \p{Lu}\p{Ll}/u.test(text.replace(PROPER, 'X').replace(/[.!?¿¡] \p{Lu}/gu, '. x'))) out.push('capital');
  if (/…|,\.|\.\./.test(text)) out.push('punctuation');
  if (/\/a(?![\p{L}])/u.test(text)) out.push('punctuation');
  return out;
}
export function lintEnglish(text: string): CheckName[] {
  const out: CheckName[] = [];
  if (SPANISH_ONLY.test(text) || /[áéíóúñ¿¡]/i.test(text)) out.push('spanish-in-english');
  if (/(?<![\p{L}])(\p{L}+) \1(?![\p{L}])/iu.test(text)) out.push('repeated-word');
  if (/(?<![\p{L}])a [aeiou]/iu.test(text) || /(?<![\p{L}])an [^aeiou\s]/iu.test(text)) out.push('article');
  if (KNOWN_TYPOS.some((r) => r.test(text))) out.push('known-typo');
  if (/\s{2,}/.test(text) || /…/.test(text)) out.push('punctuation');
  return out;
}

function rng(seed: number) {
  let t = seed >>> 0;
  return (n: number) => { t = (t + 0x6d2b79f5) >>> 0; let r = Math.imul(t ^ (t >>> 15), 1 | t); r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r; return (((r ^ (r >>> 14)) >>> 0) % n); };
}

/** Fills the slots a slot depends on, then the slot, with the first thing that fits. */
function fillDeps(B: Builder, a: Answer, k: string, Q: Question) {
  const sd = B.slotMap[k];
  if (sd.after && !a[sd.after]) { fillDeps(B, a, sd.after, Q); const fit = slotFits(B, a, sd.after, Q); if (fit.length) a[sd.after] = fit[0].choice ? derive(fit[0], 0) : fit[0]; }
}
function complete(B: Builder, a: Answer, Q: Question) {
  for (const k of Q.required ?? B.required) if (!a[k]) { fillDeps(B, a, k, Q); const fit = slotFits(B, a, k, Q); if (fit.length) a[k] = fit[0].choice ? derive(fit[0], 0) : fit[0]; }
  if (B.requiredAny && !isReady(B, a, Q)) for (const k of B.requiredAny[0]) if (!a[k]) { fillDeps(B, a, k, Q); const fit = slotFits(B, a, k, Q); if (fit.length) a[k] = fit[0].choice ? derive(fit[0], 0) : fit[0]; }
}

export function verifyBuilder(B: Builder, opts: VerifyOptions = {}): Verification {
  const found = new Map<CheckName, Failure>();
  const stats = { pairs: 0, blocked: 0, allowed: 0, answers: 0 };
  const flag = (check: CheckName, example: string) => {
    const f = found.get(check) ?? { check, count: 0, examples: [] };
    f.count++;
    if (f.examples.length < 3) f.examples.push(example);
    found.set(check, f);
  };
  const judge = (a: Answer, Q: Question) => {
    if (fragment(B, a, Q) || !isReady(B, a, Q)) return;
    stats.answers++;
    const es = compose(B, a, 'es', Q), en = compose(B, a, 'en', Q);
    for (const k of Object.keys(a)) { const x = a[k]; if (x && x.en == null && !B.cols[x.col]?.static) flag('spanish-in-english', `“${x.es}” has no English on the sheet, so the subtitle shows Spanish: ${en}`); }
    for (const c of new Set(lintSpanish(es))) flag(c, es);
    for (const c of new Set(lintEnglish(en))) flag(c, `${en}   ⇐   ${es}`);
    const r = parseText(B, es), again = compose(B, r.ans, 'es', Q);
    if (again !== es || r.off.length || r.fixes.length) flag('round-trip', `“${es}” read back as “${again}”${r.off.length ? ' with words not on the sheet: ' + r.off.join(', ') : ''}`);
  };
  const expand = (it: Item): Item[] => (it.choice ? it.choice.map((_, vi) => derive(it, vi)) : [it]);

  for (const Q of B.questions) {
    const slots = B.slots.filter((s) => !(Q.blocks && s.block != null && !Q.blocks.includes(s.block)));
    for (let i = 0; i < slots.length; i++) for (let j = i + 1; j < slots.length; j++) {
      const A = slots[i], C = slots[j];
      for (const ia of slotItems(B, A).flatMap(expand)) for (const ib of slotItems(B, C).flatMap(expand)) {
        stats.pairs++;
        const a: Answer = {};
        fillDeps(B, a, A.key, Q);
        if (clash(B, a, A.key, ia, Q)) { stats.blocked++; continue; }
        a[A.key] = ia;
        fillDeps(B, a, C.key, Q);
        if (clash(B, a, C.key, ib, Q)) { stats.blocked++; continue; }
        a[C.key] = ib;
        stats.allowed++;
        complete(B, a, Q);
        judge(a, Q);
      }
    }
    // Random complete answers: dead ends on required parts, and whole-answer lints.
    const rand = rng((opts.seed ?? 1) + B.questions.indexOf(Q) * 101);
    for (let w = 0; w < (opts.walks ?? 300); w++) {
      const a: Answer = {};
      let dead: string | null = null;
      const path: string[] = [];
      for (let step = 0; step < 30 && !dead; step++) {
        const open: [string, Item[]][] = [];
        for (const s of slots) {
          if (a[s.key]) continue;
          const fit = slotFits(B, a, s.key, Q);
          if (fit.length) open.push([s.key, fit]); else if (isRequired(B, s.key, Q) || (Q.required ?? []).includes(s.key)) dead = s.key;
        }
        if (dead || !open.length) break;
        const [k, fit] = open[rand(open.length)];
        let it = fit[rand(fit.length)];
        if (it.choice) it = derive(it, rand(it.choice.length));
        a[k] = it; path.push(`${k}=${it.es}`);
        if (isReady(B, a, Q) && rand(10) === 0) break;
      }
      if (dead) { flag('dead-end', `${B.slotMap[dead].label} has nothing that fits after ${path.join(', ')}`); continue; }
      judge(a, Q);
    }
  }

  if (opts.sheet) readingSize(B, opts.sheet, opts.phoneWidth ?? 340).forEach((m) => flag('reading-size', m));
  void activeLines;
  const failures = [...found.values()];
  return { ok: failures.length === 0, failures, stats };
}

/** Text size on a phone for each column, from the table's own column widths (the sheet is drawn 940 px wide and zoomed to a column). */
export function readingSize(B: Builder, sheet: Sheet, phoneWidth: number, minScale = 0.86): string[] {
  const SMIN = minScale, MAX = 1.15, SHEET = 940, out: string[] = [];
  const cellOf = new Map(sheet.tables.flatMap((t) => t.cells.map((c) => [c.id, { c, t }] as const)));
  for (const col of B.columns) {
    const hit = cellOf.get(col.cell);
    if (!hit) continue;
    const total = hit.t.grid.reduce((x, y) => x + y, 0) || 1;
    const w = (hit.t.grid.slice(hit.c.c, hit.c.c + hit.c.cs).reduce((x, y) => x + y, 0) / total) * SHEET;
    const s = Math.min(MAX, Math.max(SMIN, (phoneWidth - 24) / w));
    if (17 * s < 14) out.push(`Spanish text is ${(17 * s).toFixed(1)}px in “${col.key}” at ${phoneWidth}px`);
    if (12.5 * s < 10) out.push(`English text is ${(12.5 * s).toFixed(1)}px in “${col.key}” at ${phoneWidth}px`);
    if (42 * s < 36) out.push(`Tap targets are ${(42 * s).toFixed(0)}px in “${col.key}” at ${phoneWidth}px`);
  }
  return out;
}
