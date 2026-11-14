import type { Chunk, Sheet, SheetCell } from './types.ts';
import { attr, first, kids, parseXml, textOf, type XmlNode } from './xml.ts';
import { unzip } from './zip.ts';

/**
 * Reads a Word sentence builder with no model (task 1.x). Spanish and English are told apart with
 * brackets, italics, bold and a language check together, because teachers' sheets use all of them.
 * Merged cells, floating text boxes, optional words and alternatives are kept or expanded.
 */
interface Run { t: string; bold: boolean; italic: boolean }
interface Ch { ch: string; bold: boolean; italic: boolean }
interface RawCell extends SheetCell { paras: Run[][] }

const isOn = (e: XmlNode | undefined) => !!e && !['0', 'false'].includes(attr(e, 'val') ?? '');

function runsOf(p: XmlNode, boxes?: XmlNode[]): Run[] {
  const runs: Run[] = [];
  const walk = (n: XmlNode) => {
    for (const c of n.children) {
      if (c.name === '#text' || c.name === 'Fallback') continue;
      if (c.name === 'txbxContent') { boxes?.push(c); continue; }
      if (c.name === 'r') {
        const rp = first(c, 'rPr');
        let t = '';
        for (const x of c.children) { if (x.name === 't') t += textOf(x); else if (x.name === 'tab' || x.name === 'br') t += ' '; }
        walk(c);
        if (t) runs.push({ t, bold: isOn(first(rp, 'b')), italic: isOn(first(rp, 'i')) });
      } else walk(c);
    }
  };
  walk(p);
  return runs;
}

const EN_WORDS = new Set('the a an i my we he she it was were to of in at with and is are for have has had did went because since however although given that would say think believe you your me on not often sometimes never always every day week year last next yesterday tomorrow'.split(' '));
const ES_WORDS = new Set('el la los las un una unos unas de del en con mi mis tu que es fue son me te se y por para al lo le no si pero muy mas'.split(' '));
export function looksEnglish(t: string): boolean {
  if (/[áéíóúñ¿¡]/i.test(t)) return false;
  let e = 0, s = 0;
  for (const x of t.toLowerCase().match(/[a-z']+/g) ?? []) { if (EN_WORDS.has(x)) e++; if (ES_WORDS.has(x)) s++; }
  return e > s;
}

interface Seg { type: 'es' | 'en'; chars: Ch[] }
/** Splits a paragraph into Spanish text and bracketed glosses. "(no)" stays in the Spanish; an unclosed bracket runs to the end. */
function splitBrackets(chars: Ch[]): Seg[] {
  const out: Seg[] = [];
  let i = 0, cur: Ch[] = [];
  const flush = () => { if (cur.length) out.push({ type: 'es', chars: cur }); cur = []; };
  while (i < chars.length) {
    const c = chars[i].ch;
    if (c === '(' || c === '[') {
      const close = c === '(' ? ')' : ']';
      let j = i + 1;
      while (j < chars.length && chars[j].ch !== close) j++;
      const inner = chars.slice(i + 1, j).map((x) => x.ch).join('').trim();
      if (/^no$/i.test(inner) && j < chars.length) { cur.push(...chars.slice(i, j + 1)); i = j + 1; continue; }
      flush();
      out.push({ type: 'en', chars: chars.slice(i + 1, j) });
      i = Math.min(j + 1, chars.length);
      continue;
    }
    cur.push(chars[i]); i++;
  }
  flush();
  return out;
}

const SLASH = /(\p{L}+(?:\s*\/\s*\p{L}+)+)/u;
/** "(no) soy" gives two chunks; "más/menos" and "dos/ tres / cuatro personas" give one chunk per alternative. "alto/a" and "Skype/Zoom" stay whole. */
export function expandAlternatives(it: Chunk): Chunk[] {
  const NEG = /[([]no[)\]]/i;
  const stage1: Chunk[] = NEG.test(it.es)
    ? [
        { ...it, es: it.es.replace(/\s*[([]no[)\]]\s*/i, ' ').trim() },
        { ...it, es: it.es.replace(NEG, 'no').replace(/\s+/g, ' ').trim(), en: null, negOf: it.en },
      ]
    : [it];
  return stage1.flatMap((x) => {
    const m = SLASH.exec(x.es);
    if (!m) return [x];
    const alts = m[1].split(/\s*\/\s*/);
    if (alts.includes('a') || alts.every((w) => /^\p{Lu}/u.test(w))) return [x];
    const me = x.en ? SLASH.exec(x.en) : null, ea = me ? me[1].split(/\s*\/\s*/) : null;
    return alts.map((w, i) => ({ ...x, es: x.es.replace(m[1], w), en: ea && me && x.en && ea.length === alts.length ? x.en.replace(me[1], ea[i]) : x.en }));
  });
}

function chunksFromParagraphs(paras: Run[][], warn: (m: string) => void, where: string, flags: { hasBold: boolean; hasItalic: boolean }): Chunk[] {
  const items: Chunk[] = [];
  let glossedHere: Chunk | null = null;
  const attach = (g0: string) => {
    const g = g0.replace(/[[\]()]/g, '').replace(/\s+/g, ' ').trim();
    if (!g) return;
    const last = items[items.length - 1];
    if (last && glossedHere === last) last.en += ' ' + g;
    else if (last && !last.en) { last.en = g; glossedHere = last; }
    else warn(`${where}: English “${g}” has nothing to attach to`);
  };
  for (const runs of paras) {
    const chars: Ch[] = [];
    for (const r of runs) for (const ch of r.t.replace(/ /g, ' ')) chars.push({ ch, bold: r.bold, italic: r.italic });
    if (!chars.some((c) => /\S/.test(c.ch))) continue;
    glossedHere = null;
    for (const sg of splitBrackets(chars)) {
      const text = sg.chars.map((c) => c.ch).join('').replace(/\s+/g, ' ').trim();
      if (!text) continue;
      if (sg.type === 'en') { attach(text); continue; }
      const letters = sg.chars.filter((c) => /\S/.test(c.ch));
      const share = (k: 'bold' | 'italic') => letters.filter((c) => c[k]).length / Math.max(1, letters.length);
      const english = flags.hasItalic && share('italic') > 0.5 ? true : flags.hasBold ? share('bold') < 0.5 : looksEnglish(text);
      if (english) { attach(text); continue; }
      let es = text.replace(/\s+\/a\b/g, '/a'), hard = false;
      if (/\*\s*$/.test(es)) { hard = true; es = es.replace(/\*\s*$/, '').trim(); }
      items.push({ es, en: null, hard });
    }
  }
  return items.flatMap(expandAlternatives);
}

/** A floating box lists "es = en" pairs; a pair may be split over two lines. */
function readFloat(box: XmlNode): { es: string; en: string | null }[] {
  const lines = kids(box, 'p').map((p) => runsOf(p).map((x) => x.t).join('').replace(/\s+/g, ' ').trim()).filter(Boolean);
  const merged: string[] = [];
  for (const l of lines) {
    if (merged.length && (/=\s*$/.test(merged[merged.length - 1]) || /^=/.test(l))) merged[merged.length - 1] += ' ' + l;
    else merged.push(l);
  }
  const out: { es: string; en: string | null }[] = [];
  for (const t of merged) {
    const mm = /^(.*?)\s*=\s*(.*)$/.exec(t);
    if (mm) out.push({ es: mm[1].trim(), en: mm[2].trim() || null });
    else out.push({ es: t, en: null });
  }
  return out;
}

function countImages(n: XmlNode): number {
  let k = 0;
  const walk = (x: XmlNode) => {
    for (const c of x.children) {
      if (c.name === 'Fallback' || c.name === '#text') continue;
      if (c.name === 'drawing') { if (!JSON.stringify(c).includes('"txbxContent"')) k++; continue; }
      walk(c);
    }
  };
  walk(n);
  return k;
}

export function readDocx(input: ArrayBuffer | Uint8Array): Sheet {
  const files = unzip(input);
  const doc = files['word/document.xml'];
  if (!doc) throw new Error('This is not a Word document.');
  return readDocumentXml(new TextDecoder().decode(doc));
}

export function readDocumentXml(xml: string): Sheet {
  const root = parseXml(xml);
  const body = first(first(root, 'document'), 'body');
  if (!body) throw new Error('This is not a Word document.');
  const sheet: Sheet = { titles: [], tables: [], floats: [], warnings: [], stats: { items: 0, glossed: 0, hard: 0 }, flags: { hasBold: false, hasItalic: false }, images: 0 };
  const warn = (m: string) => sheet.warnings.push(m);
  const raw = new Map<string, RawCell>();

  const walkBody = (parent: XmlNode) => {
    for (const ch of parent.children) {
      if (ch.name === 'sdt') { const c = first(ch, 'sdtContent'); if (c) walkBody(c); }
      else if (ch.name === 'p') {
        const runs = runsOf(ch), text = runs.map((r) => r.t).join('').replace(/\s+/g, ' ').trim();
        if (!text) continue;
        const bold = runs.filter((r) => r.bold).map((r) => r.t).join('').replace(/\s+/g, ' ').trim();
        let es = bold || text, en: string | null = null;
        const mb = /\(([^)]*)\)\s*$/.exec(text);
        if (mb) { en = mb[1]; es = text.slice(0, mb.index).trim(); }
        else if (bold && bold !== text) en = text.replace(bold, '').trim() || null;
        if (!mb && !en) { const q = text.indexOf('?'); if (q >= 0 && q < text.length - 1) { es = text.slice(0, q + 1).trim(); en = text.slice(q + 1).trim(); } }
        sheet.titles.push({ es, en, after: sheet.tables.length });
      } else if (ch.name === 'tbl') {
        const ti = sheet.tables.length;
        const grid = kids(first(ch, 'tblGrid'), 'gridCol').map((g) => Number(attr(g, 'w')));
        const open: Record<number, RawCell> = {};
        const cells: SheetCell[] = [];
        const rows = kids(ch, 'tr');
        rows.forEach((tr, r) => {
          let gi = 0;
          for (const tc of kids(tr, 'tc')) {
            const pr = first(tc, 'tcPr'), gs = first(pr, 'gridSpan'), vm = first(pr, 'vMerge');
            const span = gs ? Number(attr(gs, 'val')) : 1;
            if (vm && attr(vm, 'val') !== 'restart') { if (open[gi]) open[gi].rs++; gi += span; continue; }
            const boxes: XmlNode[] = [];
            const paras = kids(tc, 'p').map((p) => runsOf(p, boxes));
            const shd = first(pr, 'shd'), fill = attr(shd, 'fill') ?? null;
            const id = `t${ti}r${r}c${gi}`;
            const cell: RawCell = { id, r, c: gi, rs: 1, cs: span, items: [], fill: fill && !/^(auto|FFFFFF)$/i.test(fill) ? fill : null, paras };
            for (const bx of boxes) {
              const fl = readFloat(bx);
              sheet.floats.push({ host: id, items: fl });
              warn(`${id}: a floating text box holds ${fl.length} chunks, read separately`);
            }
            raw.set(id, cell);
            cells.push(cell);
            open[gi] = cell;
            gi += span;
          }
        });
        sheet.tables.push({ index: ti, grid, rows: rows.length, cells });
      }
    }
  };
  walkBody(body);

  const allRuns = [...raw.values()].flatMap((c) => c.paras.flat());
  sheet.flags = { hasBold: allRuns.some((r) => r.bold), hasItalic: allRuns.some((r) => r.italic) };
  for (const t of sheet.tables) for (const c of t.cells) {
    const rc = raw.get(c.id) as RawCell;
    c.items = chunksFromParagraphs(rc.paras, warn, c.id, sheet.flags);
    delete (rc as Partial<RawCell>).paras;
  }
  sheet.images = countImages(body);
  if (sheet.images) warn(`${sheet.images} image${sheet.images > 1 ? 's' : ''} in the document, ignored`);

  for (const t of sheet.tables) for (const c of t.cells) for (const it of c.items) { sheet.stats.items++; if (it.en) sheet.stats.glossed++; if (it.hard) sheet.stats.hard++; }
  for (const f of sheet.floats) for (const it of f.items) { sheet.stats.items++; if (it.en) sheet.stats.glossed++; }
  const missing: string[] = [];
  for (const t of sheet.tables) for (const c of t.cells) for (const it of c.items) if (!it.en) missing.push(it.es);
  if (missing.length) warn(`${missing.length} chunks have no English on the sheet (${missing.slice(0, 3).join(', ')}${missing.length > 3 ? '…' : ''})`);
  return sheet;
}
