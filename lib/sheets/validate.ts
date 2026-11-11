import { CORRECTION_TYPES, type Interpretation } from './interpretation.ts';
import type { Sheet } from './types.ts';

/**
 * Checks a drafted interpretation before anything else uses it (task 2.2). The rule is that a draft
 * may only annotate what the reader found: every reference must resolve, no chunk may be added or
 * removed, and a correction may only be a small, allowed kind of edit.
 */
export interface Problem { path: string; message: string }

/** Letters that differ between two words, ignoring accents. */
export function editDistance(a: string, b: string): number {
  const x = a.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase(), y = b.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
  const prev = Array.from({ length: y.length + 1 }, (_, j) => j);
  for (let i = 1; i <= x.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= y.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (x[i - 1] === y[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[y.length];
}

/** A Spanish correction keeps the same words and changes each by at most two letters (accents count as one change). */
export function smallSpanishEdit(from: string, to: string): boolean {
  const f = from.split(/\s+/), t = to.split(/\s+/);
  if (f.length !== t.length) return false;
  return f.every((w, i) => {
    if (w === t[i]) return true;
    const plain = editDistance(w, t[i]);
    const accents = w.toLowerCase() === t[i].toLowerCase() ? 0 : w.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase() === t[i].normalize('NFD').replace(/\p{M}/gu, '').toLowerCase() ? 1 : 0;
    return Math.max(plain, accents) <= 2;
  });
}

export function validateInterpretation(sheet: Sheet, interp: Interpretation): Problem[] {
  const out: Problem[] = [];
  const bad = (path: string, message: string) => out.push({ path, message });
  if (interp.version !== 1) bad('version', 'Unknown version.');
  for (const k of ['name', 'title', 'subtitle'] as const) if (typeof interp[k] !== 'string' || !interp[k]) bad(k, 'Missing text.');

  const cells = new Map<string, number>();
  for (const t of sheet.tables) for (const c of t.cells) cells.set(c.id, c.items.length);
  cells.set('float0', sheet.floats.reduce((n, f) => n + f.items.length, 0));

  const cols = new Map<string, number>(), usedCells = new Set<string>();
  interp.columns.forEach((c, i) => {
    const p = `columns[${i}]`;
    if (!c.key || cols.has(c.key)) bad(p, `Column key “${c.key}” is missing or repeated.`);
    if (!cells.has(c.cell)) bad(p, `The sheet has no cell “${c.cell}”.`);
    else if (usedCells.has(c.cell)) bad(p, `Cell “${c.cell}” is used by two columns.`);
    usedCells.add(c.cell);
    cols.set(c.key, cells.get(c.cell) ?? 0);
  });
  // No chunk may be dropped: every chunk of a used cell stays in its column, and nothing is added.
  for (const k of Object.keys(interp.props)) {
    const [col, idx] = k.split(':');
    if (!cols.has(col)) bad(`props.${k}`, `No column “${col}”.`);
    else if (!(Number(idx) >= 0 && Number(idx) < (cols.get(col) as number))) bad(`props.${k}`, `The sheet has no chunk number ${idx} in “${col}”: a draft cannot add chunks.`);
  }
  const chunkOk = (ref: string) => { const [col, idx] = ref.split(':'); return cols.has(col) && Number(idx) >= 0 && Number(idx) < (cols.get(col) as number); };

  const slots = new Set(interp.slots.map((s) => s.key));
  if (slots.size !== interp.slots.length) bad('slots', 'A slot key is repeated.');
  const slot = (path: string, k: string | undefined | null) => { if (k && !slots.has(k)) bad(path, `No slot “${k}”.`); };
  interp.slots.forEach((s, i) => {
    const p = `slots[${i}]`;
    if (!s.cols.length) bad(p, 'A slot needs at least one column.');
    s.cols.forEach((c) => { if (!cols.has(c)) bad(p, `No column “${c}”.`); });
    for (const k of ['after', 'alignWith', 'agree', 'enMerge', 'distinct'] as const) slot(`${p}.${k}`, s[k]);
    for (const [from, to] of Object.entries(s.link ?? {})) { slot(`${p}.link`, from); slot(`${p}.link`, to); }
    for (const r of s.only ?? []) if (!chunkOk(r)) bad(`${p}.only`, `No chunk “${r}”.`);
    if (!s.label || !s.noun || !s.prompt) bad(p, 'A slot needs a label, a noun and a prompt.');
  });

  const inFrame = new Map<string, number>();
  interp.frames.forEach((f, i) => {
    const p = `frames[${i}]`;
    f.slots.forEach((k) => { slot(p, k); if (inFrame.has(k)) bad(p, `Slot “${k}” is in two frames.`); inFrame.set(k, i); });
    (f.core ?? []).forEach((k) => { if (!f.slots.includes(k)) bad(`${p}.core`, `“${k}” is not in the frame.`); });
    slot(`${p}.joinSlot`, f.joinSlot);
    f.parts.forEach((part, j) => {
      if ('slot' in part) slot(`${p}.parts[${j}]`, part.slot);
      else if ('list' in part) part.list.forEach((pair) => pair.forEach((k) => slot(`${p}.parts[${j}]`, k)));
      else if (part.if) slot(`${p}.parts[${j}]`, part.if);
    });
  });

  interp.questions.forEach((q, i) => {
    if (!q.es || !q.en) bad(`questions[${i}]`, 'A question needs Spanish and English.');
    Object.keys(q.req ?? {}).forEach((k) => slot(`questions[${i}].req`, k));
    (q.required ?? []).forEach((k) => slot(`questions[${i}].required`, k));
  });
  if (!interp.questions.length) bad('questions', 'The sheet answers no question.');
  interp.required.forEach((k) => slot('required', k));
  (interp.requiredAny ?? []).flat().forEach((k) => slot('requiredAny', k));
  interp.together.flat().forEach((k) => slot('together', k));
  interp.auto.forEach((k) => slot('auto', k));
  for (const r of interp.rules.polarity) { slot('rules', r.s); slot('rules', r.c); slot('rules', r.r); }

  interp.corrections.forEach((c, i) => {
    const p = `corrections[${i}]`;
    if (!chunkOk(c.chunk)) { bad(p, `No chunk “${c.chunk}”: a correction cannot add chunks.`); return; }
    if (!CORRECTION_TYPES.includes(c.type)) bad(p, `“${c.type}” is not an allowed kind of correction.`);
    if (!c.to.trim()) { bad(p, 'A correction cannot empty a chunk.'); return; }
    const [col, idx] = c.chunk.split(':');
    const cell = interp.columns.find((x) => x.key === col)?.cell as string;
    const src = cell === 'float0' ? sheet.floats.flatMap((f) => f.items)[Number(idx)] : sheet.tables.flatMap((t) => t.cells).find((x) => x.id === cell)?.items[Number(idx)];
    if (c.field === 'es') {
      if (c.type === 'missing-english' || c.type === 'wrong-english') bad(p, 'That kind of correction is for English.');
      else if (src && !smallSpanishEdit(src.es, c.to)) bad(p, `“${src.es}” to “${c.to}” changes more than spelling or agreement.`);
    } else {
      if (c.type === 'spelling' || c.type === 'agreement') bad(p, 'That kind of correction is for Spanish.');
      else if (/[áéíóúñ¿¡]/i.test(c.to) || c.to.length > 80) bad(p, 'English must be plain English and short.');
    }
  });
  return out;
}
