import { pairKey, type Builder, type Item, type Pattern, type Slot } from './builder.ts';
import type { Condition, Frame, InterpretedQuestion } from './interpretation.ts';

/**
 * The writing engine (task 2.3). It knows nothing about any one sheet: every rule comes from the
 * interpretation's data. It decides what fits where (`clash`), reads a sentence from the answer so
 * far (`compose`), reads typed text back onto the sheet (`parseText`) and finds half-built parts
 * (`fragment`). No model is called here.
 */
export type Answer = Record<string, Item | undefined>;
export type Question = InterpretedQuestion;
export interface Clash { msg: string; blockers?: Item[] }

export const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const low = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
const lowEn = (s: string) => s.replace(/^(?!I\b|I['’])([A-Z])/, (c) => c.toLowerCase());
export const baseOf = (x: Item): Item => x.baseItem ?? x;
export const idOf = (x: Item) => baseOf(x).id + (x.vi != null ? '#' + x.vi : '');
export const hasTag = (it: Item, t: string) => (it.tags ?? []).includes(t);
const lemma = (es: string) => norm(es).split(' ').pop() ?? '';

/** A chunk with one of its variants chosen (for example "hermano" or "hermana"). */
export function derive(it: Item, vi: number): Item {
  const v = it.choice?.[vi];
  if (!v) return it;
  return { ...it, es: v.es, en: v.en, baseItem: it, vi };
}

/** An adjective made to agree: its masculine singular form in, the form for the gender and number out. */
export function inflect(base: string, gen: 'm' | 'f', num: 's' | 'p'): string {
  let w = base;
  if (gen === 'f' && /o$/.test(w)) w = w.slice(0, -1) + 'a';
  if (num === 'p') {
    if (/[aeiou]$/.test(w)) w += 's';
    else if (/z$/.test(w)) w = w.slice(0, -1) + 'ces';
    else if (/[áéíóú]n$/.test(w)) w = w.replace(/á/, 'a').replace(/é/, 'e').replace(/í/, 'i').replace(/ó/, 'o').replace(/ú/, 'u') + 'es';
    else w += 'es';
  }
  return w;
}

/** Builds what the engine needs to read typed text: every spelling of every chunk, longest first. */
export function prepare(B: Builder): Builder {
  const P: Pattern[] = [], seen = new Set<string>();
  for (const c of B.columns.filter((x) => !x.static)) for (const it of c.items) {
    let forms: { es: string; vi?: number }[];
    if (it.choice) forms = it.choice.map((v, vi) => ({ es: v.es, vi }));
    else if (it.adj && it.base) forms = [...new Set((['m', 'f'] as const).flatMap((g) => (['s', 'p'] as const).map((n) => inflect(it.base as string, g, n))))].map((es) => ({ es }));
    else forms = [{ es: it.es }];
    for (const f of forms) {
      const t = norm(f.es).split(' '), k = it.id + '|' + t.join(' ');
      if (!seen.has(k)) { seen.add(k); P.push({ it, t, vi: f.vi, es: f.es }); }
    }
  }
  P.sort((x, y) => y.t.length - x.t.length);
  B.patterns = P;
  return B;
}

/** Whether a slot takes a chunk, by its roles or an explicit list. */
export function accepts(sd: Slot, it: Item): boolean {
  if (sd.only) return sd.only.includes(`${it.col}:${it.i}`);
  if (sd.accepts && !sd.accepts.some((r) => it.roles?.includes(r))) return false;
  if (sd.rejects && sd.rejects.some((r) => it.roles?.includes(r))) return false;
  return true;
}
export const slotItems = (B: Builder, sd: Slot): Item[] => sd.cols.flatMap((k) => B.cols[k]?.items ?? []).filter((it) => accepts(sd, it));
const resolveSlot = (B: Builder, from: string, ref: string) => B.slotMap[from].link?.[ref] ?? ref;
const reqOf = (B: Builder, Q?: Question) => Q?.required ?? B.required;
export function isReady(B: Builder, a: Answer, Q?: Question): boolean {
  if (B.requiredAny) return B.requiredAny.some((g) => g.every((k) => a[k]));
  return reqOf(B, Q).every((k) => a[k]);
}
export const isRequired = (B: Builder, k: string, Q?: Question) => (B.requiredAny ? false : reqOf(B, Q).includes(k));
export const activeLines = (B: Builder, Q?: Question): Frame[] => B.frames.filter((l) => !(Q?.blocks && l.block != null && !Q.blocks.includes(l.block)));

function polOK(s: Item, c: Item | null, r: Item): boolean {
  if (!s.pol || s.pol === '0' || !r.pol || r.pol === '*' || r.pol === '0') return true;
  const need = c?.flip ? (s.pol === '+' ? '-' : '+') : s.pol;
  // A contrast can bring in a practical cost or benefit, not a feeling that contradicts the opinion.
  if (c?.flip && r.affect) return false;
  return r.pol === need;
}
function holds(c: Condition, a: Answer): boolean {
  if (c.filled) return !!a[c.filled];
  if (c.slot) { const x = a[c.slot]; return !!x && (!c.pol || x.pol === c.pol) && (!c.tag || hasTag(x, c.tag)); }
  return false;
}

/** Returns null when `item` fits `slotKey` given the answer `a`, otherwise why not. */
export function clash(B: Builder, a: Answer, slotKey: string, item: Item, Q?: Question): Clash | null {
  const sd = B.slotMap[slotKey];
  if (Q?.req?.[slotKey] && item.qtag && item.qtag !== Q.req[slotKey]) return { msg: 'That one is for a different question.' };
  if (Q?.blocks && sd.block != null && !Q.blocks.includes(sd.block)) return { msg: 'That part is for another question.' };
  if (sd.after && !a[sd.after]) return { msg: sd.afterMsg ?? `Pick ${B.slotMap[sd.after].label} first.` };
  if (item.allowIf && !item.allowIf.anyOf.some((c) => holds(c, a))) return { msg: item.denyMsg ?? 'That does not fit here.' };
  const partner = sd.alignWith ? a[sd.alignWith] : undefined;
  if (partner && partner.row != null && item.row != null && item.row !== partner.row) return { msg: `“${item.es}” is for a different kind of clothes than “${partner.es}”.` };
  if (partner && partner.row == null && item.row != null) return { msg: `There is no colour list for “${partner.es}”.` };
  for (const s of B.slots) if (s.alignWith === slotKey && a[s.key]?.row != null && item.row !== a[s.key]?.row) return { msg: `“${item.es}” doesn't match the colour “${a[s.key]?.es}”.` };
  const repeat = sd.cols.some((k) => B.cols[k]?.repeat);
  if (!repeat) for (const s of B.slots) { const x = a[s.key]; if (s.key !== slotKey && x && s.cols.some((k) => sd.cols.includes(k)) && baseOf(x) === baseOf(item)) return { msg: `“${item.es}” is already on your card.` }; }
  if (sd.distinct) { const o = a[sd.distinct]; if (o && lemma(o.es) === lemma(item.es)) return { msg: `“${item.es}” can't be next to itself.` }; }
  for (const s of B.slots) if (s.distinct === slotKey) { const o = a[s.key]; if (o && lemma(o.es) === lemma(item.es)) return { msg: `“${item.es}” can't be next to itself.` }; }
  const a2: Answer = { ...a, [slotKey]: item };
  const blockers: Item[] = [];
  for (const k of Object.keys(a2)) {
    const it = a2[k];
    if (!it?.needs) continue;
    const tk = resolveSlot(B, k, it.needs.slot), t = a2[tk];
    if (t && !hasTag(t, it.needs.tag)) { if (k === slotKey) blockers.push(t); else if (tk === slotKey) blockers.push(it); }
  }
  for (const R of B.rules.polarity) {
    if (![R.s, R.c, R.r].includes(slotKey)) continue;
    const s = a2[R.s], c = R.c ? a2[R.c] : null, r = a2[R.r];
    const canFlip = !!R.c && slotItems(B, B.slotMap[R.c]).some((i) => i.flip);
    if (s && r && (!R.c || c || !canFlip) && !polOK(s, c ?? null, r)) for (const k of [R.s, R.c, R.r]) if (k && k !== slotKey && a2[k]) blockers.push(a2[k] as Item);
  }
  if (item.branch) for (const k of Object.keys(a)) { const x = a[k]; if (k !== slotKey && x?.branch && x.branch !== item.branch) blockers.push(x); }
  if (B.pairBlocks.size) for (const k of Object.keys(a)) { const x = a[k]; if (k !== slotKey && x && B.pairBlocks.has(pairKey(`${baseOf(x).col}:${baseOf(x).i}`, `${baseOf(item).col}:${baseOf(item).i}`))) blockers.push(x); }
  const u = [...new Set(blockers)];
  return u.length ? { blockers: u, msg: `“${item.es}” doesn't go with ${u.map((b) => '“' + b.es + '”').join(' and ')}. Take ${u.length > 1 ? 'one' : 'it'} out to use it.` } : null;
}

export interface Odd { code: 'odd'; slot: string; a: string; b: string; kind: string }
/** Pairs the interpretation marks as unusual. The sign-off allows them; a model-drafted interpretation may leave this empty. */
export function oddCheck(B: Builder, a: Answer): Odd | null {
  for (const sd of B.slots) {
    const it = a[sd.key];
    if (!it?.odd) continue;
    for (const o of it.odd) {
      const targets = o.slot ? [resolveSlot(B, sd.key, o.slot)] : B.slots.filter((s) => o.col && s.cols.includes(o.col) && s.key !== sd.key).map((s) => s.key);
      for (const t of targets) { const x = a[t]; if (x && (o.any || (o.tag && hasTag(x, o.tag)))) return { code: 'odd', slot: o.blame === 'other' ? t : sd.key, a: it.es, b: x.es, kind: o.kind ?? 'pair' }; }
    }
  }
  return null;
}
export const slotFits = (B: Builder, a: Answer, slotKey: string, Q?: Question): Item[] => slotItems(B, B.slotMap[slotKey]).filter((it) => !clash(B, a, slotKey, it, Q));

export function slotText(B: Builder, a: Answer, key: string, lang: 'es' | 'en'): string | null {
  const it = a[key];
  if (!it) return null;
  const sd = B.slotMap[key];
  if (lang === 'es') {
    if (it.adj && it.base && (sd.agree || sd.agreeTo)) { const t = sd.agreeTo ?? (sd.agree ? a[sd.agree] : undefined); if (t) return inflect(it.base, t.gen ?? 'm', t.num ?? 's'); }
    return it.es;
  }
  const en = it.en;
  if (en == null) return it.es;
  const adj = B.slots.find((s) => s.enMerge === key && a[s.key]);
  if (adj) {
    const x = a[adj.key] as Item, c = x.en ?? x.es, m = /^(a|an) (.*)$/.exec(en);
    return m ? `${/^[aeiou]/i.test(c) ? 'an' : 'a'} ${c} ${m[2]}` : `${c} ${en}`;
  }
  if (sd.enMerge && a[sd.enMerge]) return null;
  return en;
}

/** The sentences of an answer, frame by frame. A half-built frame ends in an ellipsis. */
export function sentences(B: Builder, a: Answer, lang: 'es' | 'en', Q?: Question): string[] {
  const out: string[] = [], lw = lang === 'en' ? lowEn : low;
  for (const line of activeLines(B, Q)) {
    if (!line.slots.some((k) => a[k])) continue; // a frame with nothing chosen says nothing, even if it has fixed words
    const sents: string[] = [];
    let cur: string[] = [];
    for (const p of line.parts) {
      if ('fixed' in p) { if (p.if && !a[p.if]) continue; cur.push(cur.length ? lw(p.fixed[lang]) : p.fixed[lang]); continue; }
      if ('list' in p) {
        const its = p.list.map(([g, c]) => { const gt = slotText(B, a, g, lang); if (gt == null) return null; const ct = slotText(B, a, c, lang); return ct ? gt + ' ' + ct : gt; }).filter((x): x is string => !!x);
        if (!its.length) continue;
        const j = lang === 'es' ? 'y' : 'and', lt = its.length === 1 ? its[0] : its.slice(0, -1).join(', ') + ' ' + j + ' ' + its[its.length - 1];
        cur.push(cur.length ? lw(lt) : lt);
        continue;
      }
      let t = slotText(B, a, p.slot, lang);
      if (t == null) continue;
      if (lang === 'en' && p.stripTo) t = t.replace(/^to /, '');
      if (p.pre) t = p.pre[lang] + t;
      if ((a[p.slot] as Item).lead) { if (cur.length) { sents.push(cur.join(' ')); cur = []; } cur.push(cap(t) + ','); continue; }
      cur.push(cur.length ? lw(t) : t);
    }
    if (cur.length) sents.push(cur.join(' '));
    if (line.core && sents.length && line.core.some((k) => !a[k]) && line.slots.some((k) => a[k])) sents[sents.length - 1] = sents[sents.length - 1].replace(/,$/, '') + '…';
    if (!sents.length) continue;
    let j: string | null = null;
    if (line.joinSlot && a[line.joinSlot]) { const x = a[line.joinSlot] as Item; j = lang === 'es' ? x.es : (x.en ?? x.es); } else if (line.join) j = line.join[lang];
    if (j !== null && out.length) { out[out.length - 1] += (j ? ' ' + j : '') + ' ' + lw(sents[0]); sents.shift(); }
    else if (j) sents[0] = cap(j) + ' ' + lw(sents[0]);
    out.push(...sents);
  }
  return out.map(cap).map((s) => s.replace(/,$/, '…')).map((s) => (/[.!?…]$/.test(s) ? s : s + '.'));
}
export const compose = (B: Builder, a: Answer, lang: 'es' | 'en', Q?: Question) => sentences(B, a, lang, Q).join(' ');
export const keyOf = (B: Builder, a: Answer) => B.id + ':' + B.slots.map((s) => (a[s.key] ? idOf(a[s.key] as Item) : '-')).join('|');

/** The first half-built part: a group that goes together, or a frame that has some parts but not its core. */
export function fragment(B: Builder, a: Answer, Q?: Question): { missing: string; have: string } | null {
  for (const g of B.together) { const f = g.filter((k) => a[k]); if (f.length && f.length < g.length) return { missing: g.find((k) => !a[k]) as string, have: f[0] }; }
  for (const l of activeLines(B, Q)) {
    if (!l.core) continue;
    const have = l.slots.find((k) => a[k]);
    if (have && l.core.some((k) => !a[k])) return { missing: l.core.find((k) => !a[k]) as string, have: l.core.find((k) => a[k]) ?? have };
  }
  return null;
}

export interface Reading { ans: Answer; off: string[]; extra: string[]; fixes: string[] }
/** Reads typed text back onto the sheet: which chunks it used, which words are not on the sheet, which agreements were fixed. */
export function parseText(B: Builder, text: string): Reading {
  const orig = text.match(/[\p{L}\p{M}]+/gu) ?? [], t = orig.map(norm);
  const out: Reading = { ans: {}, off: [], extra: [], fixes: [] };
  const typed: Record<string, string> = {};
  const lineOf = (k: string) => B.slotMap[k].line;
  let i = 0, lastKey: string | null = null;
  const fixedAfter = () => {
    if (!lastKey) return 0;
    const line = B.frames[lineOf(lastKey) as number], idx = line.parts.findIndex((p) => 'slot' in p && p.slot === lastKey), nx = line.parts[idx + 1];
    if (idx < 0 || !nx || !('fixed' in nx)) return 0;
    const ft = norm(nx.fixed.es).split(' ');
    return ft.every((x, j) => t[i + j] === x) ? ft.length : 0;
  };
  while (i < t.length) {
    const skip = fixedAfter();
    if (skip) { i += skip; continue; }
    const first = B.patterns.find((p) => i + p.t.length <= t.length && p.t.every((x, j) => t[i + j] === x));
    if (first) {
      const hits = B.patterns.filter((p) => p.t.length === first.t.length && i + p.t.length <= t.length && p.t.every((x, j) => t[i + j] === x));
      let chosen: Pattern | null = null, chosenSlot: string | null = null;
      for (const h of hits) {
        const free = B.slots.filter((s) => s.cols.includes(h.it.col) && accepts(s, h.it) && !out.ans[s.key]);
        if (!free.length) continue;
        const sk = (free.find((s) => s.after && s.after === lastKey) ?? free.find((s) => lastKey && lineOf(s.key) === lineOf(lastKey) && (!s.after || out.ans[s.after])) ?? free.find((s) => !s.after || out.ans[s.after]) ?? free[0]).key;
        if (!clash(B, out.ans, sk, h.it)) { chosen = h; chosenSlot = sk; break; }
        if (!chosen) { chosen = h; chosenSlot = sk; }
      }
      const rep = orig.slice(i, i + first.t.length).join(' ');
      if (!chosen || !chosenSlot) out.extra.push(rep);
      else { out.ans[chosenSlot] = chosen.vi != null ? derive(chosen.it, chosen.vi) : chosen.it; typed[chosenSlot] = norm(rep); lastKey = chosenSlot; }
      i += first.t.length;
      continue;
    }
    if (B.ignore.includes(t[i])) { i++; continue; }
    out.off.push(orig[i]);
    i++;
  }
  for (const sd of B.slots) {
    const x = out.ans[sd.key];
    if (x?.adj && (sd.agree || sd.agreeTo) && typed[sd.key]) { const want = slotText(B, out.ans, sd.key, 'es') as string; if (norm(want) !== typed[sd.key]) out.fixes.push(`${typed[sd.key]} → ${want}`); }
  }
  return out;
}

/** Builds an answer from a slot-to-text spec, taking the first chunk that fits. For tests and for examples. */
export function mkAns(B: Builder, spec: Record<string, string>): Answer {
  const a: Answer = {};
  for (const [k, es] of Object.entries(spec)) {
    const sd = B.slotMap[k];
    if (!sd) throw new Error(`No slot ${k}`);
    const n = norm(es), cands: Item[] = [];
    for (const it of slotItems(B, sd)) {
      if (it.choice) { const vi = it.choice.findIndex((v) => norm(v.es) === n); if (vi >= 0) cands.push(derive(it, vi)); }
      else if (norm(it.es) === n || (it.adj && it.base && (['m', 'f'] as const).some((g) => (['s', 'p'] as const).some((nn) => norm(inflect(it.base as string, g, nn)) === n)))) cands.push(it);
    }
    const found = cands.find((c) => !clash(B, a, k, c)) ?? cands[0];
    if (!found) throw new Error(`No chunk “${es}” for ${k}`);
    a[k] = found;
  }
  return a;
}
