(() => {
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norm = (s) => s.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const low = (s) => s.charAt(0).toLowerCase() + s.slice(1);
const lowEn = (s) => s.replace(/^(?!I\b|I['’])([A-Z])/, (c) => c.toLowerCase());
const clampN = (v, a, b) => Math.min(b, Math.max(a, v));

/* =====================================================================
   1. READING A WORD DOCUMENT  (deterministic: no model, no network)
   A .docx is a zip. We unzip it, read the tables and turn each cell into a list of
   chunks: Spanish in bold, English in brackets. Merged cells and floating text boxes
   are kept, because on these sheets the layout carries meaning.
   ===================================================================== */
function inflateRaw(src) {
  let pos = 0, bitBuf = 0, bitCnt = 0, out = new Uint8Array(src.length * 4 + 1024), o = 0;
  const bits = (n) => { while (bitCnt < n) { bitBuf |= src[pos++] << bitCnt; bitCnt += 8; } const v = bitBuf & ((1 << n) - 1); bitBuf >>>= n; bitCnt -= n; return v; };
  const grow = (n) => { if (o + n > out.length) { const b = new Uint8Array(Math.max(out.length * 2, o + n)); b.set(out); out = b; } };
  const build = (lens) => { const count = new Uint16Array(16), symbol = new Uint16Array(lens.length); for (const l of lens) count[l]++; count[0] = 0; const offs = new Uint16Array(16); for (let i = 1; i < 15; i++) offs[i + 1] = offs[i] + count[i]; for (let s = 0; s < lens.length; s++) if (lens[s]) symbol[offs[lens[s]]++] = s; return { count, symbol }; };
  const decode = (h) => { let code = 0, first = 0, index = 0; for (let len = 1; len <= 15; len++) { code |= bits(1); const c = h.count[len]; if (code - c < first) return h.symbol[index + (code - first)]; index += c; first += c; first <<= 1; code <<= 1; } throw new Error('bad code'); };
  const LB = [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258], LE = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0];
  const DB = [1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577], DE = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13];
  let fixedL = null, fixedD = null;
  for (let last = 0; !last;) {
    last = bits(1); const type = bits(2);
    if (type === 0) { bitBuf = 0; bitCnt = 0; const len = src[pos] | (src[pos + 1] << 8); pos += 4; grow(len); out.set(src.subarray(pos, pos + len), o); o += len; pos += len; continue; }
    let lit, dist;
    if (type === 1) {
      if (!fixedL) { const l = new Uint8Array(288); l.fill(8, 0, 144); l.fill(9, 144, 256); l.fill(7, 256, 280); l.fill(8, 280, 288); fixedL = build(l); fixedD = build(new Uint8Array(30).fill(5)); }
      lit = fixedL; dist = fixedD;
    } else if (type === 2) {
      const nl = bits(5) + 257, nd = bits(5) + 1, nc = bits(4) + 4, ord = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15], cl = new Uint8Array(19);
      for (let i = 0; i < nc; i++) cl[ord[i]] = bits(3);
      const ch = build(cl), lens = new Uint8Array(nl + nd);
      for (let i = 0; i < nl + nd;) {
        const s = decode(ch);
        if (s < 16) lens[i++] = s;
        else { let prev = 0, rep; if (s === 16) { prev = lens[i - 1]; rep = 3 + bits(2); } else if (s === 17) rep = 3 + bits(3); else rep = 11 + bits(7); while (rep--) lens[i++] = prev; }
      }
      lit = build(lens.subarray(0, nl)); dist = build(lens.subarray(nl));
    } else throw new Error('bad block');
    for (;;) {
      const s = decode(lit);
      if (s < 256) { grow(1); out[o++] = s; }
      else if (s === 256) break;
      else { const k = s - 257, len = LB[k] + bits(LE[k]), d = decode(dist), dd = DB[d] + bits(DE[d]); grow(len); for (let i = 0; i < len; i++, o++) out[o] = out[o - dd]; }
    }
  }
  return out.subarray(0, o);
}
function unzip(buf) {
  const u = new Uint8Array(buf), dv = new DataView(buf);
  let e = u.length - 22; while (e >= 0 && dv.getUint32(e, true) !== 0x06054b50) e--;
  if (e < 0) throw new Error('This is not a Word file.');
  const n = dv.getUint16(e + 10, true); let p = dv.getUint32(e + 16, true); const files = {};
  for (let i = 0; i < n; i++) {
    const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true), nl = dv.getUint16(p + 28, true), xl = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), lo = dv.getUint32(p + 42, true);
    const name = new TextDecoder().decode(u.subarray(p + 46, p + 46 + nl));
    const ln = dv.getUint16(lo + 26, true), lx = dv.getUint16(lo + 28, true), start = lo + 30 + ln + lx, data = u.subarray(start, start + csize);
    files[name] = method === 0 ? data : inflateRaw(data);
    p += 46 + nl + xl + cl;
  }
  return files;
}
const WNS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const kids = (el, name) => [...el.childNodes].filter((n) => n.nodeType === 1 && n.localName === name);
const attr = (el, name) => (el ? el.getAttributeNS(WNS, name) : null);
function runsOf(p, boxes) {
  const runs = [];
  (function walk(n) {
    for (const c of n.childNodes) {
      if (c.nodeType !== 1) continue;
      const ln = c.localName;
      if (ln === 'Fallback') continue;
      if (ln === 'txbxContent') { if (boxes) boxes.push(c); continue; }
      if (ln === 'r') {
        const rp = kids(c, 'rPr')[0], b = rp ? kids(rp, 'b')[0] : null, bold = !!b && !['0', 'false'].includes(attr(b, 'val')), itl = rp ? kids(rp, 'i')[0] : null, italic = !!itl && !['0', 'false'].includes(attr(itl, 'val'));
        let t = ''; for (const x of c.childNodes) { if (x.localName === 't') t += x.textContent; else if (x.localName === 'tab' || x.localName === 'br') t += ' '; }
        walk(c); if (t) runs.push({ t, bold, italic });
      } else walk(c);
    }
  })(p);
  return runs;
}
const EN_WORDS = new Set('the a an i my we he she it was were to of in at with and is are for have has had did went because since however although given that would say think believe you your me on not often sometimes never always every day week year last next yesterday tomorrow'.split(' '));
const ES_WORDS = new Set('el la los las un una unos unas de del en con mi mis tu que es fue son me te se y por para al lo le no si pero muy mas'.split(' '));
function looksEnglish(t) { if (/[áéíóúñ¿¡]/i.test(t)) return false; const w = t.toLowerCase().match(/[a-z']+/g) || []; let e = 0, sp = 0; w.forEach((x) => { if (EN_WORDS.has(x)) e++; if (ES_WORDS.has(x)) sp++; }); return e > sp; }
/** Splits a paragraph into Spanish text and bracketed glosses. "(no)" stays in the Spanish; an unclosed bracket runs to the end. */
function splitBrackets(chars) {
  const out = []; let i = 0, cur = [];
  const flush = () => { if (cur.length) out.push({ type: 'es', chars: cur }); cur = []; };
  while (i < chars.length) {
    const c = chars[i].ch;
    if (c === '(' || c === '[') {
      const close = c === '(' ? ')' : ']'; let j = i + 1; while (j < chars.length && chars[j].ch !== close) j++;
      const inner = chars.slice(i + 1, j).map((x) => x.ch).join('').trim();
      if (/^no$/i.test(inner) && j < chars.length) { cur.push(...chars.slice(i, j + 1)); i = j + 1; continue; }
      flush(); out.push({ type: 'en', chars: chars.slice(i + 1, j) }); i = Math.min(j + 1, chars.length); continue;
    }
    cur.push(chars[i]); i++;
  }
  flush(); return out;
}
const SLASH = /(\p{L}+(?:\s*\/\s*\p{L}+)+)/u;
/** "(no) soy" gives two chunks; "más/menos" and "dos/ tres / cuatro personas" give one chunk per alternative. "alto/a" and "Skype/Zoom" stay whole. */
function expandAlternatives(it) {
  const NEG = /[\(\[]no[\)\]]/i;
  const stage1 = NEG.test(it.es) ? [Object.assign({}, it, { es: it.es.replace(/\s*[\(\[]no[\)\]]\s*/i, ' ').trim() }), Object.assign({}, it, { es: it.es.replace(NEG, 'no').replace(/\s+/g, ' ').trim(), en: null, negOf: it.en })] : [it];
  return stage1.flatMap((x) => {
    const m = SLASH.exec(x.es); if (!m) return [x];
    const alts = m[1].split(/\s*\/\s*/); if (alts.includes('a') || alts.every((w) => /^\p{Lu}/u.test(w))) return [x];
    const me = x.en && SLASH.exec(x.en), ea = me ? me[1].split(/\s*\/\s*/) : null;
    return alts.map((w, i) => Object.assign({}, x, { es: x.es.replace(m[1], w), en: ea && ea.length === alts.length ? x.en.replace(me[1], ea[i]) : x.en }));
  });
}
function chunksFromParagraphs(paras, warn, where, flags) {
  const items = [];
  let glossedHere = null;
  const attach = (g) => { g = g.replace(/[\[\]()]/g, '').replace(/\s+/g, ' ').trim(); if (!g) return; const last = items[items.length - 1]; if (last && glossedHere === last) last.en += ' ' + g; else if (last && !last.en) { last.en = g; glossedHere = last; } else warn(`${where}: English “${g}” has nothing to attach to`); };
  for (const runs of paras) {
    const chars = []; runs.forEach((r) => { for (const ch of r.t.replace(/\u00a0/g, ' ')) chars.push({ ch, bold: r.bold, italic: r.italic }); });
    if (!chars.some((c) => /\S/.test(c.ch))) continue;
    let last = null; glossedHere = null;
    for (const sg of splitBrackets(chars)) {
      const text = sg.chars.map((c) => c.ch).join('').replace(/\s+/g, ' ').trim(); if (!text) continue;
      if (sg.type === 'en') { attach(text); continue; }
      const letters = sg.chars.filter((c) => /\S/.test(c.ch)), share = (k) => letters.filter((c) => c[k]).length / Math.max(1, letters.length);
      const english = flags.hasItalic && share('italic') > 0.5 ? true : flags.hasBold ? share('bold') < 0.5 : looksEnglish(text);
      if (english) { attach(text); continue; }
      let es = text.replace(/\s+\/a\b/g, '/a'), hard = false; if (/\*\s*$/.test(es)) { hard = true; es = es.replace(/\*\s*$/, '').trim(); }
      last = { es, en: null, hard }; items.push(last);
    }
  }
  return items.flatMap(expandAlternatives);
}
function parseDocx(buf) {
  const files = unzip(buf), xml = new TextDecoder().decode(files['word/document.xml']);
  const doc = new DOMParser().parseFromString(xml, 'application/xml'), body = doc.getElementsByTagNameNS(WNS, 'body')[0];
  const sheet = { titles: [], tables: [], floats: [], warnings: [], stats: { items: 0, glossed: 0, hard: 0 } };
  const warn = (m) => sheet.warnings.push(m);
  const walkBody = (parent) => {
    for (const ch of parent.childNodes) {
      if (ch.nodeType !== 1) continue;
      if (ch.localName === 'sdt') { const c = kids(ch, 'sdtContent')[0]; if (c) walkBody(c); }
      else if (ch.localName === 'p') {
        const runs = runsOf(ch), text = runs.map((r) => r.t).join('').replace(/\s+/g, ' ').trim();
        if (text) {
          const bold = runs.filter((r) => r.bold).map((r) => r.t).join('').replace(/\s+/g, ' ').trim();
          let es = bold || text, en = null; const mb = /\(([^)]*)\)\s*$/.exec(text);
          if (mb) { en = mb[1]; es = text.slice(0, mb.index).trim(); } else if (bold && bold !== text) { en = text.replace(bold, '').trim() || null; }
          if (!mb && !en) { const q = text.indexOf('?'); if (q >= 0 && q < text.length - 1) { es = text.slice(0, q + 1).trim(); en = text.slice(q + 1).trim(); } }
          sheet.titles.push({ es, en, after: sheet.tables.length });
        }
      } else if (ch.localName === 'tbl') {
        const ti = sheet.tables.length, grid = kids(kids(ch, 'tblGrid')[0], 'gridCol').map((g) => +attr(g, 'w')), open = {}, cells = [], rows = kids(ch, 'tr');
        rows.forEach((tr, r) => {
          let gi = 0;
          kids(tr, 'tc').forEach((tc) => {
            const pr = kids(tc, 'tcPr')[0], gs = pr && kids(pr, 'gridSpan')[0], vm = pr && kids(pr, 'vMerge')[0], span = gs ? +attr(gs, 'val') : 1;
            if (vm && attr(vm, 'val') !== 'restart') { if (open[gi]) open[gi].rs++; gi += span; return; }
            const boxes = [], paras = kids(tc, 'p').map((p) => runsOf(p, boxes));
            const shd = pr && kids(pr, 'shd')[0], fill = shd ? attr(shd, 'fill') : null;
            const id = `t${ti}r${r}c${gi}`, cell = { id, r, c: gi, rs: 1, cs: span, items: [], _paras: paras, fill: fill && !/^(auto|FFFFFF)$/i.test(fill) ? fill : null };
            boxes.forEach((bx, bi) => {
              const fl = [], lines = kids(bx, 'p').map((p) => runsOf(p).map((x) => x.t).join('').replace(/\s+/g, ' ').trim()).filter(Boolean), merged = [];
              lines.forEach((l) => { if (merged.length && (/=\s*$/.test(merged[merged.length - 1]) || /^=/.test(l))) merged[merged.length - 1] += ' ' + l; else merged.push(l); });
              merged.forEach((t) => { const mm = /^(.*?)\s*=\s*(.*)$/.exec(t); if (mm) fl.push({ es: mm[1].trim(), en: mm[2].trim() || null }); else if (t) fl.push({ es: t, en: null }); });
              sheet.floats.push({ host: id, items: fl }); warn(`${id}: a floating text box holds ${fl.length} chunks, read separately`);
            });
            cells.push(cell); open[gi] = cell; gi += span;
          });
        });
        sheet.tables.push({ index: ti, grid, rows: rows.length, cells });
      }
    }
  };
  walkBody(body);
  const allRuns = sheet.tables.flatMap((t) => t.cells.flatMap((c) => c._paras.flat()));
  const flags = { hasBold: allRuns.some((r) => r.bold), hasItalic: allRuns.some((r) => r.italic) };
  sheet.tables.forEach((t) => t.cells.forEach((c) => { c.items = chunksFromParagraphs(c._paras, warn, c.id, flags); delete c._paras; }));
  sheet.flags = flags;
  const nImg = doc.getElementsByTagNameNS(WNS, 'drawing').length; if (nImg) warn(`${nImg} image${nImg > 1 ? 's' : ''} in the document, ignored`);
  sheet.tables.forEach((t) => t.cells.forEach((c) => c.items.forEach((it) => { sheet.stats.items++; if (it.en) sheet.stats.glossed++; if (it.hard) sheet.stats.hard++; })));
  sheet.floats.forEach((f) => f.items.forEach((it) => { sheet.stats.items++; if (it.en) sheet.stats.glossed++; }));
  const missing = []; sheet.tables.forEach((t) => t.cells.forEach((c) => c.items.forEach((it) => { if (!it.en) missing.push(it.es); })));
  if (missing.length) warn(`${missing.length} chunks have no English on the sheet (${missing.slice(0, 3).join(', ')}${missing.length > 3 ? '…' : ''})`);
  return sheet;
}

/* =====================================================================
   2. FROM A PARSED SHEET TO A SENTENCE BUILDER
   The parser gives structure. What the chunks MEAN (which are opinions, which are
   negative, what agrees with what) is interpretation. In the real product a model drafts
   that once at upload and a teacher reviews it. Here the four interpretations below are
   written by hand as a stand-in, and sheets without one get a plain layout-order draft.
   ===================================================================== */
const S = (key, cols, label, noun, p, o) => Object.assign({ key, col: cols, label, noun, p }, o || {});
function inflect(base, gen, num) {
  let w = base;
  if (gen === 'f' && /o$/.test(w)) w = w.slice(0, -1) + 'a';
  if (num === 'p') { if (/[aeiou]$/.test(w)) w += 's'; else if (/z$/.test(w)) w = w.slice(0, -1) + 'ces'; else if (/[áéíóú]n$/.test(w)) w = w.replace(/á/, 'a').replace(/é/, 'e').replace(/í/, 'i').replace(/ó/, 'o').replace(/ú/, 'u') + 'es'; else w += 'es'; }
  return w;
}
const articleGender = (es) => (/^(una|la|unas|las)\b/i.test(es) ? 'f' : 'm');
const articleNum = (es) => (/^(unos|unas|los|las)\b/i.test(es) ? 'p' : 's');
function slashChoice(it) {
  const m = /(\p{L}+)o\/a\b/u.exec(it.es); if (!m) return;
  const es1 = it.es.replace(/(\p{L}+)o\/a\b/u, '$1o'), es2 = it.es.replace(/(\p{L}+)o\/a\b/u, '$1a');
  const e = it.en && /(\w+)\/(\w+)/.exec(it.en); const en1 = e ? it.en.replace(/(\w+)\/(\w+)/, '$1') : it.en, en2 = e ? it.en.replace(/(\w+)\/(\w+)/, '$2') : it.en;
  it.choice = [{ es: es1, en: en1 }, { es: es2, en: en2 }];
}
const KINDWORDS = { link: /^(porque|ya que|dado que|aunque|sin embargo|pero|y)\b/i, time: /\b(lunes|martes|sábados?|domingos?|semana|año|verano|invierno|mes|días?|mañana|tarde|noche|siempre|nunca|a veces|a menudo|vez|cuando|hoy|ayer)\b/i, reason: /^(es|fue|son|me hace|me )/i };
function guessKind(items, idx) {
  const share = (re) => items.filter((i) => re.test(i.es)).length / Math.max(1, items.length);
  if (share(KINDWORDS.link) > 0.5) return 'link'; if (share(KINDWORDS.time) > 0.4) return 'time'; if (share(KINDWORDS.reason) > 0.5) return 'reason';
  return idx === 0 ? 'opinion' : ['detail', 'other', 'opinion'][idx % 3];
}
function assemble(sheet, ov) {
  const B = { id: ov.id, name: ov.name, title: ov.title, sub: ov.sub, tag: ov.tag, columns: [], tables: [], slots: ov.slots, lines: ov.lines, required: ov.required || [], requiredAny: ov.requiredAny, together: ov.together || [], auto: ov.auto, rules: ov.rules || {}, ignore: ov.ignore || [], drilled: ov.drilled || [], questions: ov.questions, reviewed: !!ov.reviewed, stickies: [] };
  const addCol = (key, title, kind, hint, items, o) => {
    const its = items.map((it) => { const base = { es: it.es, en: it.en, hard: it.hard }; const extra = ov.props ? ov.props(it, key, o && o.cell) || {} : {}; const r = Object.assign(base, extra); if (r.choiceSlash) { slashChoice(r); delete r.choiceSlash; } return r; });
    B.columns.push(Object.assign({ key, title, hint: hint || '', kind, items: its, w: 0 }, o && o.flags));
  };
  sheet.tables.forEach((t) => {
    const tb = { grid: t.grid, rows: t.rows, cells: [], title: ov.tableTitles ? ov.tableTitles[t.index] : null };
    t.cells.forEach((cell) => {
      const m = ov.cells[cell.id];
      if (cell.items.length && m) { const [key, title, kind, hint, flags] = m; addCol(key, title, kind, hint, cell.items, { cell, flags }); tb.cells.push({ key, r: cell.r, c: cell.c, rs: cell.rs, cs: cell.cs }); }
      else tb.cells.push({ key: null, r: cell.r, c: cell.c, rs: cell.rs, cs: cell.cs });
    });
    B.tables.push(tb);
  });
  (ov.floats || []).forEach(([key, title, kind, hint, flags]) => { const items = sheet.floats.flatMap((f) => f.items); if (items.length) { addCol(key, title, kind, hint, items, { flags: Object.assign({ sticky: true }, flags) }); B.stickies.push(key); } });
  B.cols = {}; B.columns.forEach((c) => { B.cols[c.key] = c; });
  if (ov.postprocess) ov.postprocess(B);
  B.reviewedGlosses = B.columns.reduce((n, c) => n + c.items.filter((it) => it.enFix != null && it.enFix !== it.en).length, 0);
  B.report = { sheet, reviewed: B.reviewed };
  return B;
}
function genericOverlay(sheet, name) {
  const cells = {}, slots = [], lineMap = new Map(), kindsUsed = [];
  let n = 0;
  sheet.tables.forEach((t) => t.cells.filter((c) => c.items.length).forEach((c) => {
    const key = 'p' + n++, kind = guessKind(c.items, n - 1); cells[c.id] = [key, kind === 'opinion' ? 'Part ' + n : cap(kind), kind];
    slots.push(S(key, key, 'part ' + n, 'a part', 'Pick a chunk'));
    const lk = t.index + ':' + c.r; if (!lineMap.has(lk)) lineMap.set(lk, []); lineMap.get(lk).push(key);
  }));
  const lines = [...lineMap.values()].map((keys, i) => ({ extra: i > 0, slots: keys, parts: keys.map((k) => ({ slot: k })) }));
  const q = sheet.titles.length ? { es: sheet.titles[0].es, en: sheet.titles[0].en || '' } : { es: name, en: 'Uploaded sheet' };
  return { id: 'custom', name, title: q.es, sub: q.en, tag: 'Your upload · draft only', cells, slots, lines, required: slots.slice(0, 1).map((s) => s.key), auto: slots.map((s) => s.key), questions: [q], floats: [] };
}

/* ---- the four reviewed interpretations ---- */
const pol = (re, pos, neg, other) => (es) => (re.neg.test(es) ? neg : re.pos.test(es) ? pos : other);
const OV = {};
OV.wear = (() => {
  const G = ['g0', 'g1', 'g3', 'g4', 'acc'], Cc = ['c0', 'c1', 'c3', 'c4'];
  return {
    id: 'wear', name: 'What to wear', title: '¿Qué vas a llevar?', sub: 'What are you going to wear?', tag: 'Uploaded sheet · reviewed', reviewed: true,
    cells: {
      t0r0c0: ['timeH', 'When (usual)', 'time'], t0r0c1: ['verbH', 'Verb (usual)', 'opinion'], t0r0c2: ['g0', 'Clothes', 'detail', 'un / un'], t0r0c3: ['c0', 'Colour', 'time', 'matches', { repeat: true }],
      t0r1c2: ['g1', 'Clothes', 'detail', 'una / una'], t0r1c3: ['c1', 'Colour', 'time', 'matches', { repeat: true }], t0r2c0: ['timeP', 'When (plans)', 'time'], t0r2c1: ['verbP', 'Verb (plans)', 'opinion'],
      t0r3c2: ['g3', 'Clothes', 'detail', 'plural'], t0r3c3: ['c3', 'Colour', 'time', 'matches', { repeat: true }], t0r4c2: ['g4', 'Clothes', 'detail', 'plural'], t0r4c3: ['c4', 'Colour', 'time', 'matches', { repeat: true }],
    },
    floats: [['acc', 'Extra things to wear', 'detail', 'text box on the sheet']],
    props: (it, key, cell) => { const p = {}; if (key === 'timeH' || key === 'verbH') p.qtag = 'habit'; if (key === 'timeP' || key === 'verbP') p.qtag = 'plan'; if (/^[gc]\d$/.test(key)) p.row = cell.r; return p; },
    slots: [
      S('time', ['timeH', 'timeP'], 'when', 'a time', 'When?'), S('verb', ['verbH', 'verbP'], 'I wear…', 'a verb', 'Start your sentence'),
      ...[1, 2, 3, 4].flatMap((n) => [
        S('garment' + n, G, n === 1 ? 'clothes' : 'and…', 'some clothes', n === 1 ? 'Pick something to wear' : 'Add something else', n > 1 ? { after: 'garment' + (n - 1) } : {}),
        S('colour' + n, Cc, 'colour', 'a colour', 'Pick its colour', { alignWith: 'garment' + n, after: 'garment' + n, afterMsg: 'Pick the clothes first.', enMerge: 'garment' + n }),
      ]),
    ],
    required: ['verb', 'garment1'], auto: ['verb', 'garment1', 'colour1', 'time', 'garment2', 'colour2', 'garment3', 'colour3', 'garment4', 'colour4'], ignore: ['y'],
    lines: [
      { core: ['verb', 'garment1'], slots: ['time', 'verb', 'garment1', 'colour1', 'garment2', 'colour2', 'garment3', 'colour3', 'garment4', 'colour4'], parts: [{ slot: 'time' }, { slot: 'verb' }, { list: [['garment1', 'colour1'], ['garment2', 'colour2'], ['garment3', 'colour3'], ['garment4', 'colour4']] }] },
    ],
    questions: [
      { es: '¿Qué ropa llevas normalmente?', en: 'What clothes do you normally wear?', req: { time: 'habit', verb: 'habit' } },
      { es: '¿Qué vas a llevar?', en: 'What are you going to wear?', req: { time: 'plan', verb: 'plan' } },
    ],
    drilled: [
      { time: 'Normalmente', verb: 'llevo', garment1: 'vaqueros', colour1: 'azules' }, { time: 'En el colegio', verb: 'suelo llevar', garment1: 'una camisa', colour1: 'blanca' },
      { verb: 'me gusta llevar', garment1: 'una sudadera', colour1: 'gris' }, { time: 'La semana próxima', verb: 'voy a llevar', garment1: 'un vestido', colour1: 'azul' },
      { time: 'Mañana', verb: 'voy a llevar', garment1: 'una falda', colour1: 'rosa', garment2: 'zapatillas de deporte', colour2: 'blancas' },
      { time: 'La semana próxima', verb: 'me gustaría llevar', garment1: 'un jersey', colour1: 'negro' }, { time: 'Cuando salgo con mis amigos', verb: 'prefiero llevar', garment1: 'pantalones', colour1: 'negros' },
    ],
  };
})();
OV.tech = {
  id: 'tech', name: 'Technology', title: '¿Cómo utilizas la tecnología a diario?', sub: 'How do you use technology every day?', tag: 'Uploaded sheet · reviewed', reviewed: true,
  cells: { t0r0c0: ['when', 'When or where', 'time'], t0r0c1: ['verb', 'What you do', 'detail'], t0r0c2: ['conn', 'Connector', 'link'], t0r0c3: ['why', 'Reason', 'reason'] },
  props: (it, key) => (key === 'when' && /^nunca$/i.test(it.es) ? { pol: '-' } : key === 'why' ? { pol: /distrae/.test(it.es) ? '*' : '+' } : {}),
  slots: [
    S('when', 'when', 'when', 'a time', 'When or how often?', { accept: (it) => !/^en /i.test(it.es) }), S('where', 'when', 'on what', 'a device', 'On what?', { accept: (it) => /^en /i.test(it.es) }),
    S('verb', 'verb', 'what you do', 'an activity', 'Pick what you do'), S('conn', 'conn', 'because…', 'a because word', 'Add a because word'), S('why', 'why', 'reason', 'a reason', 'Pick a reason'),
  ],
  required: ['verb'], together: [['conn', 'why']], auto: ['verb', 'when', 'where', 'conn', 'why'], rules: { pol: [{ s: 'when', c: 'conn', r: 'why' }] },
  lines: [{ core: ['verb'], slots: ['when', 'where', 'verb', 'conn', 'why'], parts: [{ slot: 'when' }, { slot: 'where' }, { slot: 'verb' }, { slot: 'conn' }, { slot: 'why' }] }],
  questions: [{ es: '¿Cómo utilizas la tecnología a diario?', en: 'How do you use technology every day?' }],
  drilled: [
    { verb: 'saco fotos', when: 'A menudo', where: 'En mi móvil', conn: 'porque', why: 'es guay' }, { verb: 'chateo con mis amigos', when: 'Todos los días', conn: 'ya que', why: 'es divertido' },
    { verb: 'veo vídeos o películas', when: 'Los sábados', where: 'En mi ordenador' }, { verb: 'Juego los videojuegos', when: 'El fin de semana', conn: 'porque', why: 'me relaja' },
    { verb: 'mando sms', when: 'Nunca', conn: 'porque', why: 'me distrae' }, { verb: 'leo mis sms', when: 'A veces', where: 'En mi móvil' },
  ],
};
OV.trip = {
  id: 'trip', name: 'Last year', title: '¿Dónde fuiste el año pasado?', sub: 'Where did you go last year? · How was it?', tag: 'Uploaded sheet · reviewed', reviewed: true,
  tableTitles: [{ es: '¿Dónde fuiste el año pasado?', en: 'Where did you go last year?' }, { es: '¿Cómo te fue?', en: 'How was it?' }],
  cells: {
    t0r0c0: ['when', 'When', 'time'], t0r0c1: ['went', 'Where you went', 'detail'], t0r0c2: ['with', 'With', 'other'], t0r0c3: ['dur', 'For how long', 'time'],
    t1r0c0: ['op', 'Opinion', 'opinion'], t1r0c1: ['verdict', 'How it was', 'detail'], t1r0c2: ['conn', 'Connector', 'link'], t1r0c3: ['why', 'Reason', 'reason'],
  },
  props: (it, key) => {
    if (key === 'went') return { enFix: it.en && it.en.replace(/^I go /, 'I went ') };
    if (key === 'conn') return it.en ? {} : { enFix: 'because' };
    if (key === 'verdict') return { pol: /desastre|aburrido|horrible|p[eé]rdida/.test(it.es) ? '-' : '+' };
    if (key === 'why') return { pol: /llovi|malo/.test(it.es) ? '-' : '+', tags: /muchas cosas/.test(it.es) ? ['busy'] : [] };
    return {};
  },
  slots: [
    S('when', 'when', 'when', 'a time', 'When was it?', { block: 0 }), S('went', 'went', 'where', 'a place', 'Where did you go?', { block: 0 }), S('with', 'with', 'with who', 'a person', 'Who with?', { block: 0 }), S('dur', 'dur', 'for how long', 'a length of time', 'For how long?', { block: 0 }),
    S('op', 'op', 'opinion', 'an opinion starter', 'Start with an opinion', { block: 1 }), S('verdict', 'verdict', 'how it was', 'a verdict', 'How was it?', { block: 1 }), S('conn', 'conn', 'because…', 'a because word', 'Add a because word', { block: 1 }), S('why', 'why', 'reason', 'a reason', 'Pick a reason', { block: 1 }),
  ],
  together: [['conn', 'why']], auto: ['went', 'when', 'with', 'dur', 'verdict', 'op', 'conn', 'why'], rules: { pol: [{ s: 'verdict', c: 'conn', r: 'why' }] },
  lines: [
    { block: 0, core: ['went'], slots: ['when', 'went', 'with', 'dur'], parts: [{ slot: 'when' }, { slot: 'went' }, { slot: 'with' }, { slot: 'dur' }] },
    { block: 1, core: ['verdict'], slots: ['op', 'verdict', 'conn', 'why'], parts: [{ slot: 'op' }, { slot: 'verdict' }, { slot: 'conn' }, { slot: 'why' }] },
  ],
  questions: [{ es: '¿Dónde fuiste el año pasado?', en: 'Where did you go last year?', blocks: [0], required: ['went'] }, { es: '¿Cómo te fue?', en: 'How was it?', blocks: [1], required: ['verdict'] }],
  drilled: [
    { when: 'El verano pasado', went: 'fui a España', with: 'con mi familia', dur: 'por dos semanas' }, { went: 'fui a la costa', with: 'con mis amigos' }, { when: 'La semana pasada', went: 'fui a un pueblo', dur: 'por tres días' },
    { op: 'Creo que', verdict: 'fue fenomenal', conn: 'porque', why: 'hizo buen tiempo' }, { op: 'En mi opinión', verdict: 'fue un desastre', conn: 'ya que', why: 'llovió' },
    { verdict: 'Lo pasé bomba', conn: 'porque', why: 'hice muchas cosas' }, { op: 'Pienso que', verdict: 'fue horrible', conn: 'dado que', why: 'comí algo malo y vomité' },
  ],
};
OV.bed = (() => {
  const NOUNS = { t0r0c1: 'furn', t0r2c0: 'subj' };
  return {
    id: 'bed', name: 'Bedroom', title: '¿Cómo es tu dormitorio?', sub: 'What is your bedroom like?', tag: 'Uploaded sheet · reviewed', reviewed: true,
    cells: {
      t0r0c0: ['there', 'Starter', 'opinion'], t0r0c1: ['furn', 'Furniture', 'detail'], t0r0c3: ['adj', 'Adjectives', 'time', 'agree with the furniture', { repeat: true }],
      t0r1c0: ['opin', 'Opinion', 'opinion'], t0r1c2: ['intens', 'How much', 'link'], t0r2c0: ['subj', 'Furniture', 'detail'], t0r2c1: ['esta', '', 'other', '', { static: true }],
      t0r2c2: ['prep', 'Where', 'link'], t0r2c3: ['targ', 'Of what', 'other'], t0r3c0: ['close', 'Finish with', 'other'],
    },
    props: (it, key, cell) => {
      if (key === 'furn' || key === 'subj') return { gen: articleGender(it.es), num: articleNum(it.es) };
      if (key === 'adj') { const base = it.es.replace(/\/a$/, ''); return { base, adj: true, pol: /^(bonito|c[oó]modo|moderno)$/.test(base) ? '+' : /^feo$/.test(base) ? '-' : '0' }; }
      if (key === 'opin') return { pol: /^no /i.test(it.es) ? '-' : '+' };
      if (key === 'close') return { choiceSlash: true };
      return {};
    },
    postprocess: (b) => { b.cols.targ.items.forEach((it) => { const m = b.cols.subj.items.find((x) => lemma(x.es) === lemma(it.es)); if (m && m.en) it.enFix = m.en; }); },
    slots: [
      S('there', 'there', 'there is…', 'a starter', 'Start your sentence'), S('furn', 'furn', 'furniture', 'some furniture', 'Pick something in your room'),
      S('adjA', 'adj', 'colour or size', 'an adjective', 'Describe it', { agree: 'furn', enMerge: 'furn', after: 'furn', afterMsg: 'Pick the furniture first.' }),
      S('opin', 'opin', 'opinion', 'an opinion', 'Say what you think of it'), S('intens', 'intens', 'how much', 'a degree', 'How much?', { after: 'opin', afterMsg: 'Pick an opinion first.' }), S('adjB', 'adj', 'adjective', 'an adjective', 'Pick a word', { agreeTo: { gen: 'm', num: 's' }, after: 'opin', afterMsg: 'Pick an opinion first.' }),
      S('subj', 'subj', 'what', 'a thing', 'Pick a thing'), S('prep', 'prep', 'where', 'a place', 'Where is it?'), S('targ', 'targ', 'next to what', 'another thing', 'Next to what?', { distinct: 'subj' }),
      S('close', 'close', 'closing line', 'a closing line', 'Finish with a closing line'),
    ],
    required: [], requiredAny: [['there', 'furn'], ['opin', 'adjB'], ['subj', 'prep', 'targ']], together: [['subj', 'prep', 'targ']],
    auto: ['there', 'furn', 'adjA', 'opin', 'intens', 'adjB', 'subj', 'prep', 'targ', 'close'],
    rules: { pol: [{ s: 'opin', c: null, r: 'adjB' }] }, ignore: ['esta'],
    lines: [
      { core: ['there', 'furn'], slots: ['there', 'furn', 'adjA'], parts: [{ slot: 'there' }, { slot: 'furn' }, { slot: 'adjA' }] },
      { core: ['opin', 'adjB'], slots: ['opin', 'intens', 'adjB'], parts: [{ slot: 'opin' }, { slot: 'intens' }, { slot: 'adjB' }] },
      { core: ['subj', 'prep', 'targ'], slots: ['subj', 'prep', 'targ'], parts: [{ slot: 'subj' }, { fixed: { es: 'está', en: 'is' }, if: 'prep' }, { slot: 'prep' }, { slot: 'targ' }] },
      { slots: ['close'], parts: [{ slot: 'close' }] },
    ],
    questions: [{ es: '¿Cómo es tu dormitorio?', en: 'What is your bedroom like?' }],
    drilled: [
      { there: 'En mi dormitorio hay', furn: 'una cama', adjA: 'azul' }, { there: 'Mi dormitorio tiene', furn: 'un ordenador', adjA: 'moderno/a' },
      { opin: 'Me gusta mi dormitorio porque es', intens: 'muy', adjB: 'cómodo/a' }, { opin: 'No me gusta mi dormitorio ya que es', intens: 'bastante', adjB: 'pequeño/a' },
      { subj: 'la mesa', prep: 'al lado', targ: 'de la cama' }, { there: 'Me gustaría tener', furn: 'una alfombra', adjA: 'blanco' },
      { opin: 'Me gusta mi dormitorio porque es', adjB: 'bonito/a', close: 'Comparto mi dormitorio con mi hermana. ¡Qué rollo!' },
    ],
  };
})();

/* ---- the hand-made free-time builder (from the repo's own sheet), now with roles ---- */
const I = (es, en, p) => Object.assign({ es, en }, p || {});
const C = (key, title, hint, kind, w, items, o) => Object.assign({ key, title, hint, kind, w, items }, o || {});
const choice2 = (a, b) => [a, b].map(([es, en]) => ({ es, en }));
const FREE = {
  id: 'free', name: 'Free time', title: '¿Qué haces en tu tiempo libre?', sub: 'What do you do in your free time?', tag: 'Year 8 · Sentence builder', reviewed: true,
  columns: [
    C('starter', 'Starter', 'verb + infinitive', 'opinion', 184, [
      I('Me gusta', 'I like to', { pol: '+' }), I('Me encanta', 'I love to', { pol: '+', tags: ['strong'] }), I('Me chifla', 'I really love to', { pol: '+', tags: ['strong'] }), I('Prefiero', 'I prefer to', { pol: '+' }),
      I('Suelo', 'I usually', { pol: '0' }), I('No me gusta', "I don't like to", { pol: '-' }), I('Odio', 'I hate to', { pol: '-' }),
      I('Me gustaría', 'I would like to', { pol: '+', plan: true }),
      I('Voy a', 'I am going to', { pol: '0', plan: true })]),
    C('activity', 'Activity', 'what you do', 'detail', 362, [
      I('jugar al fútbol', 'to play football', { tags: ['phys', 'sporty'] }), I('jugar al baloncesto', 'to play basketball', { tags: ['phys', 'sporty'] }),
      I('jugar a los videojuegos', 'to play video games', { tags: ['spend'] }), I('tocar la guitarra', 'to play the guitar', { tags: ['spend'] }),
      I('escuchar música', 'to listen to music'), I('chatear con mis amigos', 'to chat with my friends'),
      I('leer libros', 'to read books', { tags: ['quiet'] }), I('ver la tele', 'to watch TV', { tags: ['quiet'] }),
      I('salir con mis amigos', 'to go out with my friends', { tags: ['spend'] }), I('ir al cine', 'to go to the cinema', { tags: ['spend'] }),
      I('ir de compras', 'to go shopping', { tags: ['spend'] }), I('montar en bici', 'to ride a bike', { tags: ['phys'] }),
      I('hacer deporte', 'to do sport', { tags: ['phys', 'sporty'] }), I('bailar', 'to dance', { tags: ['phys'] }), I('cocinar', 'to cook', { tags: ['quiet'] })], { split: 2 }),
    C('connector', 'Connector', 'link', 'link', 142, [I('porque', 'because'), I('dado que', 'given that'), I('ya que', 'since'), I('aunque', 'although', { flip: true }), I('sin embargo', 'however', { flip: true, lead: true })]),
    C('reason', 'Reason', 'always masculine', 'reason', 196, [
      I('es divertido', 'it is fun', { pol: '+' }), I('es relajante', 'it is relaxing', { pol: '+' }),
      I('es emocionante', 'it is exciting', { pol: '+' }), I('es aburrido', 'it is boring', { pol: '-' }),
      I('es caro', 'it is expensive', { pol: '-', needs: { slot: 'activity', tag: 'spend' } }), I('es barato', 'it is cheap', { pol: '+' }),
      I('es bueno para la salud', 'it is good for your health', { pol: '+', needs: { slot: 'activity', tag: 'phys' } }), I('me hace reír', 'it makes me laugh', { pol: '+' }),
      I('me relaja', 'it relaxes me', { pol: '+' })]),
    C('lohago', 'Verb', '', 'other', 140, [I('Lo hago', 'I do it'), I('Lo hacemos', 'we do it')]),
    C('when', 'When', '', 'time', 212, [I('todos los días', 'every day'), I('los fines de semana', 'at the weekend'), I('los sábados', 'on Saturdays'), I('por la tarde', 'in the afternoon'), I('una vez a la semana', 'once a week'), I('a veces', 'sometimes'), I('de vez en cuando', 'from time to time')]),
    C('with', 'With', '', 'other', 62, [I('con', 'with')], { static: true }),
    C('who', 'Who', '', 'other', 196, [I('mis amigos', 'my friends'), I('mi mejor amigo/a', 'my best friend', { choice: choice2(['mi mejor amigo', 'my best friend (boy)'], ['mi mejor amiga', 'my best friend (girl)']) }), I('mi familia', 'my family'), I('mi hermano/a', 'my brother/sister', { choice: choice2(['mi hermano', 'my brother'], ['mi hermana', 'my sister']) }), I('mis primos', 'my cousins')]),
    C('closing', 'Finish with one', '', 'other', 330, [I('Tengo mucho tiempo libre. ¡Qué guay!', 'I have lots of free time. How cool!'), I('No tengo mucho tiempo libre por los deberes. ¡Qué rollo!', "I don't have much free time because of homework. What a drag!")], { rowMin: 64 }),
    C('glue', 'Joining words', 'Use between sentences', 'link', 232, [I('y', 'and'), I('pero', 'but', { allowIf: (a) => !!(a.starter2 || (a.reason && a.reason.pol === '-')), denyMsg: '“pero” needs something to contrast with.' }), I('también', 'also')], { sticky: true }),
  ],
  blocks: [
    { num: 'Block 1', name: 'Opinion sentences', formula: [['starter', 'opinion'], ['activity', 'detail'], ['connector', 'link'], ['reason', 'reason']], cols: ['starter', 'activity', 'connector', 'reason'] },
    { num: 'Block 2', name: 'Extension', formula: [['Lo hago', 'other'], ['when', 'time'], ['con + who', 'other']], cols: ['lohago', 'when', 'with', 'who'] },
    { num: 'Block 3', name: 'Closing lines', cols: ['closing', 'glue'] },
  ],
  slots: [
    S('starter', 'starter', 'opinion', 'an opinion', 'Pick how you feel about it', { accept: (it) => it.pol !== '-' && !it.plan }), S('activity', 'activity', 'what you do', 'an activity', 'Now pick what you do'),
    S('connector', 'connector', 'because…', 'a because word', 'Add a because word', { accept: (it) => !it.lead }), S('reason', 'reason', 'reason', 'a reason', 'Pick a reason'),
    S('contrast', 'connector', 'sin embargo…', '“sin embargo”', 'Contrast with another opinion', { accept: (it) => !!it.lead }),
    S('starter2', 'starter', 'contrast opinion', 'a contrast opinion', 'What do you not like?', { accept: (it) => it.pol === '-', after: 'contrast', afterMsg: 'A negative opinion works as a contrast. Pick “sin embargo” first.' }),
    S('activity2', 'activity', 'what', 'an activity', 'What do you not like?', { after: 'starter2' }), S('reason2', 'reason', 'reason', 'a reason', 'Why?', { link: { activity: 'activity2' }, after: 'activity2' }),
    S('planStarter', 'starter', 'plan or wish', 'a plan or wish', 'Add a plan or a wish', { accept: (it) => !!it.plan }), S('planActivity', 'activity', 'what', 'an activity', 'What would you like to do?', { after: 'planStarter' }),
    S('glue', 'glue', '+ joining word', 'a joining word', 'Pick a joining word'), S('lohago', 'lohago', 'lo hago…', 'a “lo hago”', 'Add more detail'),
    S('when', 'when', 'when', 'a time', 'How often, or when?', { after: 'lohago', afterMsg: 'Pick “lo hago” first.' }), S('who', 'who', 'who with', 'a person', 'Who with?', { after: 'lohago', afterMsg: 'Pick “lo hago” first.' }), S('closing', 'closing', 'closing line', 'a closing line', 'Finish with a closing line'),
  ],
  required: ['starter', 'activity'], together: [['connector', 'reason'], ['contrast', 'starter2', 'activity2'], ['planStarter', 'planActivity']], auto: ['starter', 'activity', 'connector', 'reason', 'lohago', 'when', 'who', 'closing'],
  rules: { pol: [{ s: 'starter', c: 'connector', r: 'reason', flip: 'flip' }, { s: 'starter2', c: null, r: 'reason2' }] }, ignore: ['con'],
  lines: [
    { core: ['starter', 'activity'], slots: ['starter', 'activity', 'connector', 'reason'], parts: [{ slot: 'starter' }, { slot: 'activity', stripTo: true }, { slot: 'connector' }, { slot: 'reason' }] },
    { extra: true, core: ['lohago'], slots: ['glue', 'lohago', 'when', 'who'], joinSlot: 'glue', parts: [{ slot: 'lohago' }, { slot: 'when' }, { slot: 'who', pre: { es: 'con ', en: 'with ' } }] },
    { extra: true, core: ['contrast', 'starter2', 'activity2'], slots: ['contrast', 'starter2', 'activity2', 'reason2'], parts: [{ slot: 'contrast' }, { slot: 'starter2' }, { slot: 'activity2', stripTo: true }, { fixed: { es: 'porque', en: 'because' }, if: 'reason2' }, { slot: 'reason2' }] },
    { extra: true, core: ['planStarter', 'planActivity'], slots: ['planStarter', 'planActivity'], parts: [{ slot: 'planStarter' }, { slot: 'planActivity', stripTo: true }] },
    { extra: true, slots: ['closing'], parts: [{ slot: 'closing' }] },
  ],
  questions: [{ es: '¿Qué haces en tu tiempo libre?', en: 'What do you do in your free time?' }],
  drilled: [
    { starter: 'Me gusta', activity: 'jugar al fútbol', connector: 'porque', reason: 'es divertido' }, { starter: 'Me encanta', activity: 'escuchar música', connector: 'porque', reason: 'me relaja' },
    { starter: 'Prefiero', activity: 'ver la tele', connector: 'porque', reason: 'es relajante' },
    { starter: 'Me gusta', activity: 'bailar', connector: 'porque', reason: 'es bueno para la salud', contrast: 'sin embargo', starter2: 'No me gusta', activity2: 'cocinar', reason2: 'es aburrido' },
    { starter: 'Me gusta', activity: 'ir de compras', connector: 'aunque', reason: 'es caro' }, { starter: 'Suelo', activity: 'montar en bici', lohago: 'Lo hago', when: 'los fines de semana', who: 'mi familia' },
    { starter: 'Me gusta', activity: 'leer libros', connector: 'aunque', reason: 'es aburrido' }, { starter: 'Me chifla', activity: 'jugar a los videojuegos', lohago: 'Lo hago', when: 'todos los días', who: 'mis amigos' },
    { starter: 'Me gusta', activity: 'escuchar música', planStarter: 'Me gustaría', planActivity: 'tocar la guitarra' }, { starter: 'Suelo', activity: 'ir al cine', lohago: 'Lo hacemos', when: 'los sábados', who: 'mis amigos' },
    { starter: 'Prefiero', activity: 'ver la tele', contrast: 'sin embargo', starter2: 'Odio', activity2: 'hacer deporte', reason2: 'es aburrido' },
    { starter: 'Me gusta', activity: 'cocinar', connector: 'porque', reason: 'es divertido', planStarter: 'Voy a', planActivity: 'jugar al baloncesto' },
  ],
};

/* =====================================================================
   3. THE ENGINE (knows nothing about any one sheet)
   ===================================================================== */
const BUILDERS = {};
let QS = [];
const baseOf = (x) => x.base || x;
const idOf = (x) => baseOf(x).id + (x.vi != null ? '#' + x.vi : '');
const derive = (it, vi) => Object.assign({}, it, { es: it.choice[vi].es, en: it.choice[vi].en, base: it, vi });
const hasTag = (it, t) => (it.tags || []).includes(t);
const lemma = (es) => norm(es).split(' ').pop();

function prepare(B) {
  B.cols = {}; B.columns.forEach((c) => { B.cols[c.key] = c; c.items.forEach((it, i) => { it.col = c.key; it.i = i; it.id = B.id + ':' + c.key + ':' + i; }); });
  B.slotMap = {}; B.slots.forEach((s) => { s.cols = Array.isArray(s.col) ? s.col : [s.col]; B.slotMap[s.key] = s; });
  B.lines.forEach((l, i) => l.slots.forEach((k) => { B.slotMap[k].line = i; if (l.block != null) B.slotMap[k].block = l.block; }));
  if (B.rules.pol && !Array.isArray(B.rules.pol)) B.rules.pol = [B.rules.pol];
  const P = [], seen = new Set();
  B.columns.filter((c) => !c.static).forEach((c) => c.items.forEach((it) => {
    let forms;
    if (it.choice) forms = it.choice.map((v, vi) => ({ es: v.es, vi }));
    else if (it.adj) forms = [...new Set(['m', 'f'].flatMap((g) => ['s', 'p'].map((n) => inflect(it.base, g, n))))].map((es) => ({ es }));
    else forms = [{ es: it.es }];
    forms.forEach((f) => { const t = norm(f.es).split(' '); const k = it.id + '|' + t.join(' '); if (!seen.has(k)) { seen.add(k); P.push({ it, t, vi: f.vi, es: f.es }); } });
  }));
  P.sort((x, y) => y.t.length - x.t.length);
  B.patterns = P;
  B.questions = (B.questions || [{ es: B.title, en: B.sub }]);
  B.drilledAns = B.drilled.map((sp) => mkAns(B, sp));
  B.presigned = new Set(B.drilledAns.map((a) => keyOf(B, a)));
  return B;
}
const slotItems = (B, sd) => sd.cols.flatMap((k) => B.cols[k].items).filter((it) => !sd.accept || sd.accept(it));
const resolveSlot = (B, from, ref) => ((B.slotMap[from].link || {})[ref]) || ref;
const reqOf = (B, Q) => (Q && Q.required) || B.required;
function isReady(B, a, Q) { if (B.requiredAny) return B.requiredAny.some((g) => g.every((k) => a[k])); return reqOf(B, Q).every((k) => a[k]); }
/** The first half-built part of an answer: a group or a sentence frame that has some pieces but not its core. */
function fragment(B, a, Q) {
  for (const g of B.together) { const f = g.filter((k) => a[k]); if (f.length && f.length < g.length) return { missing: g.find((k) => !a[k]), have: f[0] }; }
  for (const l of activeLines(B, Q)) { if (!l.core) continue; const have = l.slots.find((k) => a[k]); if (have && l.core.some((k) => !a[k])) { const missing = l.core.find((k) => !a[k]); return { missing, have: l.core.find((k) => a[k]) || have }; } }
  return null;
}
const isRequired = (B, k, Q) => (B.requiredAny ? false : reqOf(B, Q).includes(k));

function polOK(s, c, r) {
  if (!s.pol || s.pol === '0' || !r.pol || r.pol === '*' || r.pol === '0') return true;
  const need = c && c.flip ? (s.pol === '+' ? '-' : '+') : s.pol;
  return r.pol === need;
}
/** Returns null when `item` fits `slotKey` given the answer `a`, otherwise { msg, blockers }. */
function clash(B, a, slotKey, item, Q) {
  const sd = B.slotMap[slotKey];
  if (Q && Q.req && Q.req[slotKey] && item.qtag && item.qtag !== Q.req[slotKey]) return { msg: 'That one is for a different question.' };
  if (Q && Q.blocks && sd.block != null && !Q.blocks.includes(sd.block)) return { msg: 'That part is for another question.' };
  if (sd.after && !a[sd.after]) return { msg: sd.afterMsg || `Pick ${B.slotMap[sd.after].label} first.` };
  if (item.allowIf && !item.allowIf(a)) return { msg: item.denyMsg || 'That does not fit here.' };
  const alignsWith = (k) => B.slotMap[k].alignWith;
  if (sd.alignWith && a[sd.alignWith] && a[sd.alignWith].row != null && item.row != null && item.row !== a[sd.alignWith].row) return { msg: `“${item.es}” is for a different kind of clothes than “${a[sd.alignWith].es}”.` };
  if (sd.alignWith && a[sd.alignWith] && a[sd.alignWith].row == null && item.row != null) return { msg: `There is no colour list for “${a[sd.alignWith].es}”.` };
  for (const s of B.slots) if (alignsWith(s.key) === slotKey && a[s.key] && a[s.key].row != null && item.row !== a[s.key].row) return { msg: `“${item.es}” doesn't match the colour “${a[s.key].es}”.` };
  const repeat = sd.cols.some((k) => B.cols[k].repeat);
  if (!repeat) for (const s of B.slots) if (s.key !== slotKey && a[s.key] && s.cols.some((k) => sd.cols.includes(k)) && baseOf(a[s.key]) === baseOf(item)) return { msg: `“${item.es}” is already on your card.` };
  const dis = (k1, k2, it1, it2) => it1 && it2 && lemma(it1.es) === lemma(it2.es);
  if (sd.distinct && dis(slotKey, sd.distinct, item, a[sd.distinct])) return { msg: `“${item.es}” can't be next to itself.` };
  for (const s of B.slots) if (s.distinct === slotKey && dis(s.key, slotKey, a[s.key], item)) return { msg: `“${item.es}” can't be next to itself.` };
  const a2 = Object.assign({}, a, { [slotKey]: item }), blockers = [];
  for (const k of Object.keys(a2)) {
    const it = a2[k]; if (!it || !it.needs) continue;
    const tk = resolveSlot(B, k, it.needs.slot), t = a2[tk];
    if (t && !hasTag(t, it.needs.tag)) { if (k === slotKey) blockers.push(t); else if (tk === slotKey) blockers.push(it); }
  }
  for (const R of B.rules.pol || []) {
    if (![R.s, R.c, R.r].includes(slotKey)) continue;
    const s = a2[R.s], c = R.c ? a2[R.c] : null, r = a2[R.r];
    const canFlip = R.c && slotItems(B, B.slotMap[R.c]).some((i) => i.flip);
    if (s && r && (!R.c || c || !canFlip) && !polOK(s, c, r)) [R.s, R.c, R.r].filter((k) => k && k !== slotKey && a2[k]).forEach((k) => blockers.push(a2[k]));
  }
  if (item.branch) for (const k of Object.keys(a)) if (k !== slotKey && a[k] && a[k].branch && a[k].branch !== item.branch) blockers.push(a[k]);
  const u = [...new Set(blockers)];
  return u.length ? { blockers: u, msg: `“${item.es}” doesn't go with ${u.map((b) => '“' + b.es + '”').join(' and ')}. Take ${u.length > 1 ? 'one' : 'it'} out to use it.` } : null;
}
function oddCheck(B, a) {
  for (const sd of B.slots) {
    const it = a[sd.key]; if (!it || !it.odd) continue;
    for (const o of it.odd) {
      const targets = o.slot ? [resolveSlot(B, sd.key, o.slot)] : B.slots.filter((s) => s.cols.some((c) => c === o.col) && s.key !== sd.key).map((s) => s.key);
      for (const t of targets) { const x = a[t]; if (!x) continue; if (o.any || hasTag(x, o.tag)) return { code: 'odd', slot: o.blame === 'other' ? t : sd.key, a: it.es, b: x.es, kind: o.kind || 'pair' }; }
    }
  }
  return null;
}
const slotFits = (B, a, slotKey, Q) => slotItems(B, B.slotMap[slotKey]).filter((it) => !clash(B, a, slotKey, it, Q));

function slotText(B, a, key, lang) {
  const it = a[key]; if (!it) return null; const sd = B.slotMap[key];
  if (lang === 'es') {
    if (it.adj && (sd.agree || sd.agreeTo)) { const t = sd.agreeTo || a[sd.agree]; if (t) return inflect(it.base, t.gen || 'm', t.num || 's'); }
    return it.es;
  }
  const en = it.enFix != null ? it.enFix : it.en;
  if (en == null) return it.es;
  const adj = B.slots.find((s) => (s.enMerge === key) && a[s.key]);
  if (adj) { const c = a[adj.key].enFix != null ? a[adj.key].enFix : a[adj.key].en || a[adj.key].es, m = /^(a|an) (.*)$/.exec(en); return m ? `${/^[aeiou]/i.test(c) ? 'an' : 'a'} ${c} ${m[2]}` : `${c} ${en}`; }
  if (sd.enMerge && a[sd.enMerge]) return null;
  return en;
}
function activeLines(B, Q) { return B.lines.filter((l) => !(Q && Q.blocks && l.block != null && !Q.blocks.includes(l.block))); }
function sentences(B, a, lang, Q) {
  const out = [], lw = lang === 'en' ? lowEn : low;
  for (const line of activeLines(B, Q)) {
    const sents = []; let cur = [];
    for (const p of line.parts) {
      if (p.fixed) { if (p.if && !a[p.if]) continue; cur.push(cur.length ? lw(p.fixed[lang]) : p.fixed[lang]); continue; }
      if (p.list) {
        const its = p.list.map(([g, c]) => { const gt = slotText(B, a, g, lang); if (gt == null) return null; const ct = slotText(B, a, c, lang); return ct ? gt + ' ' + ct : gt; }).filter(Boolean);
        if (!its.length) continue;
        const j = lang === 'es' ? 'y' : 'and', lt = its.length === 1 ? its[0] : its.slice(0, -1).join(', ') + ' ' + j + ' ' + its[its.length - 1];
        cur.push(cur.length ? lw(lt) : lt); continue;
      }
      let t = slotText(B, a, p.slot, lang); if (t == null) continue;
      if (lang === 'en' && p.stripTo) t = t.replace(/^to /, '');
      if (p.pre) t = p.pre[lang] + t;
      if (a[p.slot].lead) { if (cur.length) { sents.push(cur.join(' ')); cur = []; } cur.push(cap(t) + ','); continue; }
      cur.push(cur.length ? lw(t) : t);
    }
    if (cur.length) sents.push(cur.join(' '));
    if (line.core && sents.length && line.core.some((k) => !a[k]) && line.slots.some((k) => a[k])) sents[sents.length - 1] += '…';
    if (!sents.length) continue;
    let j = null;
    if (line.joinSlot && a[line.joinSlot]) j = lang === 'es' ? a[line.joinSlot].es : (a[line.joinSlot].enFix || a[line.joinSlot].en); else if (line.join) j = line.join[lang];
    if (j !== null && out.length) { out[out.length - 1] += (j ? ' ' + j : '') + ' ' + lw(sents[0]); sents.shift(); }
    else if (j) sents[0] = cap(j) + ' ' + lw(sents[0]);
    out.push(...sents);
  }
  return out.map(cap).map((s) => s.replace(/,$/, '…')).map((s) => (/[.!?…]$/.test(s) ? s : s + '.'));
}
const compose = (B, a, lang, Q) => sentences(B, a, lang, Q).join(' ');
const keyOf = (B, a) => B.id + ':' + B.slots.map((s) => (a[s.key] ? idOf(a[s.key]) : '-')).join('|');

function parseText(B, text) {
  const orig = text.match(/[\p{L}\p{M}]+/gu) || [], t = orig.map(norm);
  const out = { ans: {}, off: [], extra: [], fixes: [] }, typed = {};
  const lineOf = (k) => B.slotMap[k].line;
  let i = 0, lastKey = null;
  const fixedAfter = () => {
    if (!lastKey) return 0;
    const line = B.lines[lineOf(lastKey)], idx = line.parts.findIndex((p) => p.slot === lastKey), nx = line.parts[idx + 1];
    if (idx < 0 || !nx || !nx.fixed) return 0;
    const ft = norm(nx.fixed.es).split(' ');
    return ft.every((x, j) => t[i + j] === x) ? ft.length : 0;
  };
  while (i < t.length) {
    const skip = fixedAfter(); if (skip) { i += skip; continue; }
    const first = B.patterns.find((p) => i + p.t.length <= t.length && p.t.every((x, j) => t[i + j] === x));
    if (first) {
      const hits = B.patterns.filter((p) => p.t.length === first.t.length && i + p.t.length <= t.length && p.t.every((x, j) => t[i + j] === x));
      let chosen = null, chosenSlot = null;
      for (const h of hits) {
        const free = B.slots.filter((s) => s.cols.includes(h.it.col) && (!s.accept || s.accept(h.it)) && !out.ans[s.key]); if (!free.length) continue;
        const sk = (free.find((s) => s.after && s.after === lastKey) || free.find((s) => lastKey && lineOf(s.key) === lineOf(lastKey) && (!s.after || out.ans[s.after])) || free.find((s) => !s.after || out.ans[s.after]) || free[0]).key;
        if (!clash(B, out.ans, sk, h.it, null)) { chosen = h; chosenSlot = sk; break; }
        if (!chosen) { chosen = h; chosenSlot = sk; }
      }
      const rep = orig.slice(i, i + first.t.length).join(' ');
      if (!chosen) out.extra.push(rep);
      else { out.ans[chosenSlot] = chosen.vi != null ? derive(chosen.it, chosen.vi) : chosen.it; typed[chosenSlot] = norm(rep); lastKey = chosenSlot; }
      i += first.t.length; continue;
    }
    if (B.ignore.includes(t[i])) { i++; continue; }
    out.off.push(orig[i]); i++;
  }
  for (const sd of B.slots) if (out.ans[sd.key] && out.ans[sd.key].adj && (sd.agree || sd.agreeTo) && typed[sd.key]) {
    const want = slotText(B, out.ans, sd.key, 'es'); if (norm(want) !== typed[sd.key]) out.fixes.push(`${typed[sd.key]} → ${want}`);
  }
  return out;
}
function mkAns(B, spec) {
  const a = {};
  for (const [k, es] of Object.entries(spec)) {
    const sd = B.slotMap[k]; if (!sd) throw new Error(`Builder ${B.id}: no slot ${k}`);
    const n = norm(es), cands = [];
    for (const it of slotItems(B, sd)) {
      if (it.choice) { const vi = it.choice.findIndex((v) => norm(v.es) === n); if (vi >= 0) cands.push(derive(it, vi)); }
      else if (norm(it.es) === n || (it.adj && ['m', 'f'].some((g) => ['s', 'p'].some((nn) => norm(inflect(it.base, g, nn)) === n)))) cands.push(it);
    }
    const found = cands.find((c) => !clash(B, a, k, c, null)) || cands[0];
    if (!found) throw new Error(`Builder ${B.id}: no chunk “${es}” for ${k}`);
    a[k] = found;
  }
  return a;
}

/* ---------------- safeguarding and injection screen (runs on the device first) ---------------- */
function screen(raw) {
  const t = raw.normalize('NFKC').trim();
  if (/(hurt|kill) myself|want to die|suicid|hacerme da[nñ]o|quiero morir|me quiero morir/i.test(t)) return { ok: false, code: 'worry', msg: 'That sounds heavy. If something is bothering you, talk to a trusted adult, like a teacher or someone at home. Childline is free on 0800 1111. Nothing you typed was saved or sent.' };
  if (/(ignore|disregard|forget|ignora|olvida).{0,30}(previous|above|instruction|prompt|anterior|instrucci)|system prompt|you are (now )?(an?|the) |act as |jailbreak|developer mode|\bprompt\b/i.test(t)) return { ok: false, code: 'inject', msg: 'That looks like an instruction, not part of your answer. Type only the Spanish you want to say. Nothing was sent.' };
  if (/https?:|www\.|@|\.com\b|\.co\.uk|\d{3,}|me llamo|mi nombre|my name is|vivo en/i.test(t)) return { ok: false, code: 'personal', msg: 'Leave out names, addresses, numbers and links. Type only your answer. Nothing was sent.' };
  if (/[<>{}\[\]`\\|]/.test(t)) return { ok: false, code: 'chars', msg: 'Use letters and normal punctuation only. Nothing was sent.' };
  if (t.length > 160 || t.split(/\s+/).length > 30) return { ok: false, code: 'long', msg: 'That is a bit long. Try one or two sentences.' };
  if (!t) return { ok: false, code: 'empty', msg: 'Type your answer first.' };
  return { ok: true, clean: t.replace(/[^\p{L}\p{M}\s,.¡!¿?'’-]/gu, ' ').replace(/\s+/g, ' ') };
}

/* =====================================================================
   4. THE APP
   ===================================================================== */
const STATE = [];
let qi = 0, B = FREE, Q = null, ans = {}, imported = null;
let active = null, mode = 'camera', modeChoice = 'camera', autoShort = false, online = true, sheetOpen = false, revealSet = null, incomingKey = null, lastOdd = null;
let calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
const CACHE = new Map();
const store = { get status() { return STATE[qi].status; }, set status(v) { STATE[qi].status = v; } };

const device = $('#device'), paper = $('#paper'), view = $('#sheetView'), mini = $('#mini'), miniPaper = $('#miniPaper'), finder = $('#finder');
const sleep = (ms) => new Promise((r) => setTimeout(r, calm ? Math.min(ms, 80) : ms));
const say = (t) => { $('#say').textContent = t; };
const teleSvg = `<svg class="tele-svg" viewBox="0 0 48 48" aria-hidden="true" focusable="false"><g class="ant"><path d="M17 11 L12 3 M31 11 L36 3" stroke="#0b2a4a" stroke-width="2.5" stroke-linecap="round" fill="none"/><circle cx="12" cy="3" r="2" fill="#ff5fa8"/><circle cx="36" cy="3" r="2" fill="#ff5fa8"/></g><rect x="5" y="10" width="38" height="28" rx="7" fill="#d9d4c7" stroke="#0b2a4a" stroke-width="2.5"/><rect x="10" y="15" width="28" height="18" rx="4" fill="#0b2a4a"/><ellipse cx="24" cy="24" rx="9" ry="7" fill="#fff"/><circle class="pupil" cx="24" cy="24" r="3.6" fill="#0b2a4a"/><rect class="lid" x="14" y="16" width="20" height="8" fill="#0b2a4a"/><path d="M9 38 h30 v4 a4 4 0 0 1 -4 4 H13 a4 4 0 0 1 -4 -4 z" fill="#ff5fa8" stroke="#0b2a4a" stroke-width="2"/></svg>`;
$('#tele').innerHTML = teleSvg;
const feel = (f) => { $('#tele').dataset.feel = f; const r = $('.rtele'); if (r) r.dataset.feel = f; };
function log(tag, msg) {
  const li = document.createElement('li'); li.dataset.t = tag;
  const b = document.createElement('b'); b.textContent = tag + ': ';
  li.append(b, document.createTextNode(msg));
  const ol = $('#log'); ol.prepend(li); while (ol.children.length > 30) ol.lastChild.remove();
}

/* ---------------- the sheet, re-typeset from the builder's data ---------------- */
const cellHTML = (c, n, stat) => stat ? `<div class="cell static"><span class="es" lang="es">${esc(c.es)}</span><span class="en">${esc(c.en || '')}</span></div>` : `<button class="cell" type="button" data-col="${c.col}" data-i="${c.i}" style="--n:${n}${c.rowMin ? `;min-height:${c.rowMin}px` : ''}"><span class="es" lang="es">${esc(c.es)}${c.hard ? '<sup aria-label="harder">*</sup>' : ''}</span><span class="en">${esc(c.en || '')}</span><i class="tick" aria-hidden="true">✓</i></button>`;
function colHTML(c) {
  if (c.sticky) return `<div class="sticky" data-col="${c.key}"><b>${esc(c.title)}</b><small>${esc(c.hint)}</small><div class="row">${c.items.map((it, n) => cellHTML(it, n)).join('')}</div></div>`;
  const rowMin = c.rowMin; const items = c.items.map((it) => Object.assign(it, { rowMin }));
  let inner;
  if (c.split === 2) { const h = Math.ceil(items.length / 2); inner = `<div class="split"><div>${items.slice(0, h).map((it, n) => cellHTML(it, n)).join('')}</div><div>${items.slice(h).map((it, n) => cellHTML(it, n)).join('')}</div></div>`; }
  else inner = items.map((it, n) => cellHTML(it, n, c.static)).join('');
  return `<div class="col k-${c.kind}${c.static ? ' static' : ''}" data-col="${c.key}" style="width:${c.w}px"><div class="chead">${esc(c.title)}${c.hint ? `<small>${esc(c.hint)}</small>` : ''}</div>${inner}</div>`;
}
function tdHTML(b, cell) {
  const span = `${cell.cs > 1 ? ` colspan="${cell.cs}"` : ''}${cell.rs > 1 ? ` rowspan="${cell.rs}"` : ''}`;
  if (!cell.key) return `<td class="blank"${span}></td>`;
  const c = b.cols[cell.key];
  const head = c.title || c.hint ? `<div class="chead">${esc(c.title)}${c.hint ? `<small>${esc(c.hint)}</small>` : ''}</div>` : '';
  return `<td class="col k-${c.kind}${c.static ? ' static' : ''}" data-col="${c.key}"${span}>${head}${c.items.map((it, n) => cellHTML(it, n, c.static)).join('')}</td>`;
}
function sheetHTML(b) {
  let h = `<div class="ptitle"><div><h2 lang="es">${esc(b.title)}</h2><p>${esc(b.sub)}</p></div><span class="ptag">${esc(b.tag)}</span></div>`;
  if (b.tables) {
    b.tables.forEach((t) => {
      const tot = t.grid.reduce((x, y) => x + y, 0);
      h += '<section class="block">';
      if (t.title) h += `<div class="bhead"><span class="bname" lang="es">${esc(t.title.es)}</span><span class="formula">${esc(t.title.en || '')}</span></div>`;
      h += `<table class="stable"><colgroup>${t.grid.map((g) => `<col style="width:${((g / tot) * 100).toFixed(2)}%">`).join('')}</colgroup>`;
      for (let r = 0; r < t.rows; r++) h += `<tr>${t.cells.filter((c) => c.r === r).sort((x, y) => x.c - y.c).map((c) => tdHTML(b, c)).join('')}</tr>`;
      h += '</table></section>';
    });
    if (b.stickies.length) h += `<div class="cols stickies">${b.stickies.map((k) => colHTML(Object.assign({}, b.cols[k], { sticky: true }))).join('')}</div>`;
    return h;
  }
  b.blocks.forEach((bl) => {
    h += `<section class="block"><div class="bhead"><span class="bnum">${esc(bl.num)}</span><span class="bname">${esc(bl.name)}</span>${bl.formula ? `<span class="formula">${bl.formula.map(([l, k]) => `<i class="k-${k}">${esc(l)}</i>`).join('+')}</span>` : ''}</div><div class="cols">${bl.cols.map((k) => colHTML(b.cols[k])).join('')}</div></section>`;
  });
  return h;
}
function buildSheet() { paper.innerHTML = sheetHTML(B); syncSheet(); }
const itemOf = (el) => B.cols[el.dataset.col].items[+el.dataset.i];
const colEl = (key) => paper.querySelector(`.col[data-col="${key}"], .sticky[data-col="${key}"]`);
const holder = (it) => B.slots.find((s) => ans[s.key] && baseOf(ans[s.key]) === it);
const optional = (k) => !isRequired(B, k, Q);
const slotFor = (it) => {
  const cand = B.slots.filter((s) => s.cols.includes(it.col) && (!s.accept || s.accept(it)));
  if (!cand.length) return null;
  const sat = (s) => !s.after || ans[s.after];
  if (active && cand.some((s) => s.key === active) && !ans[active]) return active;
  return (cand.find((s) => !ans[s.key] && sat(s)) || cand.find((s) => s.key === active) || cand.find(sat) || cand[0]).key;
};
const slotDead = (k) => !ans[k] && slotFits(B, ans, k, Q).length === 0;
const nextEmpty = () => B.auto.find((k) => !ans[k] && !slotDead(k) && !(Q && Q.blocks && B.slotMap[k].block != null && !Q.blocks.includes(B.slotMap[k].block))) || null;
const ready = () => isReady(B, ans, Q);

function syncSheet() {
  $$('.cell[data-col]', paper).forEach((el) => {
    const it = itemOf(el), h = holder(it), sk = slotFor(it);
    const chosen = !!h && (!revealSet || revealSet.has(h.key));
    let c = chosen || h ? null : (sk ? clash(B, ans, sk, it, Q) : { msg: 'Not used in this sentence builder.' });
    const asd = active ? B.slotMap[active] : null;
    if (!c && !h && asd && asd.accept && asd.cols.includes(it.col) && !asd.accept(it)) { const nat = B.slots.find((s) => s.cols.includes(it.col) && (!s.accept || s.accept(it))); c = { msg: `That one is for “${nat ? nat.label : 'another part'}”, not “${asd.label}”.` }; }
    el.classList.toggle('chosen', chosen);
    el.classList.toggle('clash', !!c);
    if (c) { el.setAttribute('aria-disabled', 'true'); el.dataset.why = c.msg; } else { el.removeAttribute('aria-disabled'); delete el.dataset.why; }
    el.setAttribute('aria-pressed', chosen ? 'true' : 'false');
  });
  syncMini();
}
function syncMini() {
  miniPaper.replaceChildren(...[...paper.childNodes].map((n) => n.cloneNode(true)));
  miniPaper.setAttribute('inert', '');
  updateFinder();
}

/* ---------------- the camera ---------------- */
const cam = { s: 1, x: 0, y: 0, mode: 'overview' };
let PW = 980, PH = 800, VW = 340, VH = 400, focusRectCache = null;
const MINIW = 84, SMIN = 0.86;
function measure() { PW = paper.offsetWidth; PH = paper.offsetHeight; VW = view.clientWidth; VH = view.clientHeight; const ms = MINIW / PW; mini.style.height = PH * ms + 'px'; miniPaper.style.transform = `scale(${ms})`; }
const ovScale = () => Math.min((VW - 16) / PW, (VH - 16) / PH);
function clampCam() {
  const cw = PW * cam.s, ch = PH * cam.s, pad = 8;
  cam.x = cw <= VW - 2 * pad ? (VW - cw) / 2 : clampN(cam.x, VW - cw - pad, pad);
  cam.y = ch <= VH - 2 * pad ? (VH - ch) / 2 : clampN(cam.y, VH - ch - pad, pad);
}
function setCam(s, x, y, glide, m) {
  cam.s = s; cam.x = x; cam.y = y; if (m) cam.mode = m;
  clampCam();
  paper.classList.toggle('glide', !!glide && !calm);
  paper.style.transform = `translate(${cam.x}px, ${cam.y}px) scale(${cam.s})`;
  updateFinder(); updateZoomBtn(); updateMore();
}
function updateFinder() {
  const ms = MINIW / PW;
  finder.style.left = (-cam.x / cam.s) * ms + 'px'; finder.style.top = (-cam.y / cam.s) * ms + 'px';
  finder.style.width = (VW / cam.s) * ms + 'px'; finder.style.height = (VH / cam.s) * ms + 'px';
}
function relRect(el) {
  const p = paper.getBoundingClientRect(), r = el.getBoundingClientRect(), k = p.width / PW;
  return { x: (r.left - p.left) / k, y: (r.top - p.top) / k, w: r.width / k, h: r.height / k };
}
function overview(glide = true) { focusRectCache = null; const s = ovScale(); setCam(s, (VW - PW * s) / 2, (VH - PH * s) / 2, glide, 'overview'); }
/** Which sheet columns the camera should show for a slot: all of its lists, or just the one that lines up with a chosen partner. */
function focusKeys(k) {
  const sd = B.slotMap[k]; let keys = sd.cols;
  const usable = keys.filter((c) => B.cols[c].items.some((it) => (!sd.accept || sd.accept(it)) && !clash(B, ans, k, it, Q)));
  if (usable.length) keys = usable;
  if (sd.alignWith && ans[sd.alignWith] && ans[sd.alignWith].row != null) { const r = ans[sd.alignWith].row, sub = keys.filter((c) => B.cols[c].items[0] && B.cols[c].items[0].row === r); if (sub.length) keys = sub; }
  return keys;
}
function focusCols(keys, glide = true) {
  const rs = keys.map(colEl).filter(Boolean).map(relRect); if (!rs.length) return overview(glide);
  const x0 = Math.min(...rs.map((r) => r.x)), y0 = Math.min(...rs.map((r) => r.y)), x1 = Math.max(...rs.map((r) => r.x + r.w)), y1 = Math.max(...rs.map((r) => r.y + r.h));
  const r = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }; focusRectCache = r;
  const s = Math.max(ovScale(), clampN((VW - 24) / r.w, SMIN, 1.15));
  setCam(s, 12 - r.x * s, 48 - r.y * s, glide, 'focus');
}
function updateZoomBtn() {
  const b = $('#zoomBtn');
  b.textContent = cam.mode === 'focus' ? 'Whole page' : (active ? 'Follow the guide' : 'Whole page');
  b.hidden = cam.mode !== 'focus' && !active;
}
function updateMore() {
  const m = $('#more'); if (!focusRectCache || cam.mode === 'overview') { m.hidden = true; view.classList.remove('has-more'); return; }
  m.hidden = (focusRectCache.y + focusRectCache.h) * cam.s + cam.y <= VH - 10; view.classList.toggle('has-more', !m.hidden);
}
$('#more').addEventListener('click', () => setCam(cam.s, cam.x, cam.y - VH * 0.6, true, 'manual'));
$('#zoomBtn').addEventListener('click', () => { if (cam.mode === 'focus') overview(); else if (active) focusCols(focusKeys(active)); });

const ptrs = new Map(); let drag = null, pinch = null, moved = false, lastTap = 0;
view.addEventListener('pointerdown', (e) => {
  if (e.target.closest('.vbar, .mini, .chooser, .more')) return;
  ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (ptrs.size === 1) { drag = { x: e.clientX, y: e.clientY, cx: cam.x, cy: cam.y }; moved = false; pinch = null; }
  else if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), s: cam.s }; drag = null; moved = true; }
});
view.addEventListener('pointermove', (e) => {
  if (!ptrs.has(e.pointerId)) return;
  ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (ptrs.size === 1 && drag) {
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!moved && Math.hypot(dx, dy) > 8) { moved = true; try { view.setPointerCapture(e.pointerId); } catch (_) {} }
    if (moved) setCam(cam.s, drag.cx + dx, drag.cy + dy, false, 'manual');
  } else if (ptrs.size === 2 && pinch) {
    const [a, b] = [...ptrs.values()];
    const d = Math.hypot(a.x - b.x, a.y - b.y), vr = view.getBoundingClientRect();
    zoomAbout((a.x + b.x) / 2 - vr.left, (a.y + b.y) / 2 - vr.top, clampN(pinch.s * d / pinch.d, ovScale() * .98, 2.6));
  }
});
const endPtr = (e) => {
  const was = ptrs.size; ptrs.delete(e.pointerId);
  if (e.type === 'pointerup' && was === 1 && !moved && !e.target.closest('.cell, .vbar, .mini, .chooser, .more')) {
    const now = Date.now(); if (now - lastTap < 320) { cam.mode === 'focus' ? overview() : (active ? focusCols(focusKeys(active)) : overview()); } lastTap = now;
  }
  if (ptrs.size < 2) pinch = null; if (ptrs.size === 0) drag = null;
};
view.addEventListener('pointerup', endPtr); view.addEventListener('pointercancel', endPtr);
function zoomAbout(px, py, s2) { const k = s2 / cam.s; setCam(s2, px - (px - cam.x) * k, py - (py - cam.y) * k, false, 'manual'); }
view.addEventListener('wheel', (e) => {
  e.preventDefault();
  if (e.ctrlKey) { const vr = view.getBoundingClientRect(); zoomAbout(e.clientX - vr.left, e.clientY - vr.top, clampN(cam.s * Math.exp(-e.deltaY * .01), ovScale() * .98, 2.6)); }
  else setCam(cam.s, cam.x - e.deltaX, cam.y - e.deltaY, false, 'manual');
}, { passive: false });
mini.addEventListener('click', (e) => {
  const r = mini.getBoundingClientRect(), ms = MINIW / PW;
  const px = (e.clientX - r.left) / ms, py = (e.clientY - r.top) / ms;
  const s = cam.mode === 'overview' ? Math.min(1.1, (VW - 24) / 300) : cam.s;
  setCam(s, VW / 2 - px * s, VH / 2 - py * s, true, 'manual');
});
paper.addEventListener('focusin', (e) => {
  const c = e.target.closest('.cell'); if (!c) return;
  const r = relRect(c), s = cam.s, L = r.x * s + cam.x, T = r.y * s + cam.y;
  let nx = cam.x, ny = cam.y;
  if (L < 8) nx += 8 - L; if (L + r.w * s > VW - 8) nx -= L + r.w * s - (VW - 8);
  if (T < 48) ny += 48 - T; if (T + r.h * s > VH - 8) ny -= T + r.h * s - (VH - 8);
  if (nx !== cam.x || ny !== cam.y) setCam(s, nx, ny, true, 'manual');
});
new ResizeObserver(() => { if ($('#buildScreen').hidden) return; measure(); if (VH < 40) return; if (cam.mode === 'overview' || !active) overview(false); else if (cam.mode === 'focus') focusCols(focusKeys(active), false); else setCam(cam.s, cam.x, cam.y, false); }).observe(view);
new ResizeObserver(() => applyMode()).observe(device);

/* ---------------- guiding ---------------- */
function setActive(k, { move = true } = {}) {
  active = k;
  const keys = k ? focusKeys(k) : [];
  $$('.col, .sticky', paper).forEach((c) => { c.classList.toggle('live', keys.includes(c.dataset.col)); c.classList.remove('arrive'); });
  paper.classList.toggle('guiding', !!k);
  if (k) {
    keys.map(colEl).filter(Boolean).forEach((c) => { void c.offsetWidth; c.classList.add('arrive'); });
    if (ans[k] && !calm) keys.map(colEl).filter(Boolean).forEach((c) => $$('.cell:not(.chosen):not(.clash)', c).forEach((x) => { x.classList.remove('pulse'); void x.offsetWidth; x.classList.add('pulse'); }));
  }
  updatePrompt(); renderCard(); syncSheet();
  if (move && (mode === 'camera' || sheetOpen)) { k ? focusCols(keys) : overview(); }
  updateZoomBtn();
}
function updatePrompt() {
  const p = $('#prompt');
  if (active) { const t = B.slotMap[active].p; p.innerHTML = (ready() && optional(active) ? '<span class="opt">Optional · </span>' : '') + esc(t); say(t); }
  else p.textContent = ready() ? 'All filled. Check your answer when you are ready.' : 'Pick from the sheet';
  $('#strip').textContent = compose(B, ans, 'es', Q) || 'Your answer will build here.';
}
function showWhy(t) { const el = $('#toast'); el.textContent = t; el.hidden = false; clearTimeout(showWhy.t); showWhy.t = setTimeout(() => (el.hidden = true), 3600); say(t); }

paper.addEventListener('click', (e) => {
  const b = e.target.closest('.cell[data-col]'); if (!b || moved) return;
  const it = itemOf(b);
  if (b.getAttribute('aria-disabled') === 'true') { showWhy(b.dataset.why); return; }
  const h = holder(it);
  if (h && active && h.key !== active && B.slotMap[active].cols.includes(it.col)) { showWhy(`That is already your “${h.label}”. Tap its chip to change it.`); return; }
  if (h) { delete ans[h.key]; resetCheck(); syncSheet(); setActive(h.key); return; }
  if (it.choice) { askChoice(it, b); return; }
  pick(it, b);
});
function askChoice(it, cellEl) {
  const ch = $('#chooser'); ch.replaceChildren();
  const lab = document.createElement('span'); lab.textContent = 'Which one?'; ch.append(lab);
  it.choice.forEach((v, vi) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'vbtn'; b.lang = 'es';
    b.textContent = v.es; b.addEventListener('click', () => { ch.hidden = true; pick(derive(it, vi), cellEl); });
    ch.append(b);
  });
  const x = document.createElement('button'); x.type = 'button'; x.className = 'vbtn'; x.textContent = 'Cancel'; x.addEventListener('click', () => (ch.hidden = true)); ch.append(x);
  ch.hidden = false; ch.querySelector('button').focus({ preventScroll: true });
}

/* ---------------- picking and the chunk flying to the card ---------------- */
function fly(fromEl, toEl, text, kind) {
  if (calm || !fromEl || !toEl) return Promise.resolve();
  const d = device.getBoundingClientRect(), a = fromEl.getBoundingClientRect(), b = toEl.getBoundingClientRect();
  const f = document.createElement('div'); f.className = 'fchip k-' + kind; f.textContent = text;
  f.style.cssText = `left:${a.left - d.left}px;top:${a.top - d.top}px;width:${a.width}px;height:${a.height}px`;
  $('#flight').append(f);
  const dx = b.left - a.left, dy = b.top - a.top, sx = b.width / a.width, sy = b.height / a.height;
  const an = f.animate([{ transform: 'translate(0,0) scale(1,1)' }, { transform: `translate(${dx * .5}px, ${dy * .5 - 26}px) scale(${(1 + sx) / 2 + .05},${(1 + sy) / 2 + .05})`, offset: .5 }, { transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})` }], { duration: 460, easing: 'cubic-bezier(.3,.7,.3,1)', fill: 'forwards' });
  return an.finished.then(() => f.remove(), () => f.remove());
}
async function pick(it, cellEl) {
  const k = slotFor(it); if (!k) return; ans[k] = it; resetCheck();
  imported = imported && (imported.off.length || imported.fixes.length) ? imported : null;
  incomingKey = k; renderCard(); syncSheet();
  const slot = $(`#lines [data-slot="${k}"]`);
  const fl = fly(cellEl, slot, slotText(B, ans, k, 'es'), B.cols[it.col].kind);
  if (mode === 'pickup') closeSheet(false);
  say(`${it.es} added.`);
  const nxt = nextEmpty();
  if (mode === 'camera') setTimeout(() => setActive(nxt), calm ? 0 : 260);
  else { active = nxt; updatePrompt(); renderCard(); }
  await fl; incomingKey = null;
  const s2 = $(`#lines [data-slot="${k}"]`); if (s2) s2.classList.remove('incoming');
}

/* ---------------- the answer flashcard ---------------- */
const partPre = (k) => { for (const l of B.lines) for (const p of l.parts) if (p.slot === k && p.pre) return p.pre.es.trim(); return ''; };
const chipText = (k) => { const t = slotText(B, ans, k, 'es'); const pre = partPre(k); return pre && t ? pre + ' ' + t : t; };
function slotEl(k) {
  const it = ans[k], sd = B.slotMap[k], cls = 'k-' + B.cols[sd.cols[0]].kind;
  if (it) {
    const odd = lastOdd && lastOdd.slot === k ? ' odd' : '';
    const t = chipText(k);
    return `<span class="slotw ${cls}"><button class="slot filled${odd}${incomingKey === k ? ' incoming' : ''}" type="button" data-slot="${k}" lang="es" aria-label="Change ${esc(sd.label)}: ${esc(t)}">${esc(t)}</button><button class="rm" type="button" data-rm="${k}" aria-label="Remove ${esc(t)}">×</button></span>`;
  }
  return `<span class="${cls}"><button class="slot empty${optional(k) ? ' opt' : ''}${active === k ? ' active' : ''}" type="button" data-slot="${k}"><span class="sl">${esc(sd.label)}</span><span class="sr-only">${optional(k) ? ' (optional)' : ''}</span></button></span>`;
}
const cardKeys = () => activeLines(B, Q).flatMap((l) => l.slots);
const moreKeys = () => cardKeys().filter((k) => !ans[k] && k !== active && optional(k) && !slotDead(k));
function renderCard() {
  const keys = cardKeys();
  const show = keys.filter((k) => ans[k] || k === active || (!optional(k) && !slotDead(k)));
  let h = show.map(slotEl).join('');
  if (moreKeys().length && (Object.keys(ans).length || active)) h += '<button class="slot more" type="button" data-more="1">+ Add more</button>';
  $('#lines').innerHTML = `<div class="lrow">${h}</div>`;
  $('#moreMenu').hidden = true;
  { const row = $('#lines .lrow'), ac = $('#lines .slot.active') || $('#lines .slot.incoming'); if (row && ac) row.scrollLeft = Math.max(0, ac.parentElement.offsetLeft - 24); }
  const ss = sentences(B, ans, 'es', Q), said = $('#said');
  said.innerHTML = ss.length ? ss.map((x) => `<span class="sn">${esc(x)}</span>`).join('') : 'Your sentence appears here.';
  said.classList.toggle('empty', !ss.length);
  const en = compose(B, ans, 'en', Q);
  const sub = $('#sub'); sub.textContent = en || "Your English subtitle builds here, using the sheet's own translations."; sub.classList.toggle('empty', !en);
  const notes = [];
  if (imported && imported.off.length) notes.push(['Not on your sheet: ', imported.off]);
  if (imported && imported.fixes.length) notes.push(['Fixed to agree: ', imported.fixes]);
  const offs = $('#offs'); offs.replaceChildren();
  offs.hidden = !notes.length;
  notes.forEach(([lead, words]) => { const d = document.createElement('div'); d.append(document.createTextNode(lead)); words.forEach((w, i) => { const s2 = document.createElement('span'); s2.textContent = w; d.append(s2, document.createTextNode(i < words.length - 1 ? ', ' : '')); }); offs.append(d); });
  $('#checkBtn').disabled = !Object.keys(ans).length;
  $('#trayBtn').hidden = $('#importBtn').hidden = Object.keys(ans).length > 0;
  const pb = $('#pickBtn'), ne = nextEmpty(); pb.hidden = mode !== 'pickup' || !ne;
  if (!pb.hidden) pb.textContent = 'Pick: ' + B.slotMap[ne].label.replace('…', '').replace('+ ', '');
  $('#acard').dataset.status = store.status === 'checked' || store.status === 'class' ? 'ok' : store.status === 'unchecked' ? 'none' : '';
  $('#acard').dataset.stamp = store.status === 'class' ? 'From class' : 'Checked';
}
function toggleMore() {
  const menu = $('#moreMenu'); if (!menu.hidden) { menu.hidden = true; return; }
  menu.innerHTML = moreKeys().map((k) => `<button class="slot empty opt k-${B.cols[B.slotMap[k].cols[0]].kind}" type="button" data-act="${k}"><span class="sl">${esc(B.slotMap[k].label)}</span></button>`).join('');
  menu.hidden = false; menu.scrollIntoView({ block: 'nearest' });
}
$('#moreMenu').addEventListener('click', (e) => { const b = e.target.closest('[data-act]'); if (!b) return; $('#moreMenu').hidden = true; const k = b.dataset.act; if (mode === 'pickup') openSheet(k); else setActive(k); });
$('#lines').addEventListener('click', (e) => {
  if (e.target.closest('[data-more]')) { toggleMore(); return; }
  const r = e.target.closest('[data-rm]');
  if (r) { const k = r.dataset.rm; delete ans[k]; lastOdd = null; resetCheck(); syncSheet(); if (mode === 'pickup') { active = k; renderCard(); openSheet(k); } else setActive(k); return; }
  const s = e.target.closest('[data-slot]'); if (!s) return;
  if (mode === 'pickup') openSheet(s.dataset.slot); else setActive(s.dataset.slot);
});
$('#pickBtn').addEventListener('click', () => openSheet(nextEmpty()));

/* ---------------- pick-up mode ---------------- */
function openSheet(k) {
  sheetOpen = true; $('#cardArea').inert = true;
  view.classList.add('open'); measure();
  active = k; setActive(k, { move: false });
  focusCols(focusKeys(k), false);
  setTimeout(() => $('#closeSheet').focus({ preventScroll: true }), 50);
}
function closeSheet(refocus = true) {
  if (!sheetOpen) return; sheetOpen = false; view.classList.remove('open'); $('#cardArea').inert = false; $('#chooser').hidden = true;
  if (refocus) setTimeout(() => ($('#pickBtn').hidden ? $('#checkBtn') : $('#pickBtn')).focus({ preventScroll: true }), 50);
}
$('#closeSheet').addEventListener('click', () => closeSheet());
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { if (sheetOpen) closeSheet(); else if (!$('#trayPanel').hidden) $('#trayClose').click(); else if (!$('#importPanel').hidden) $('#importCancel').click(); } });

/* ---------------- drilled sentences and typed answers ---------------- */
function drilledFor() {
  return B.drilledAns.filter((a) => Object.keys(a).every((k) => { const sd = B.slotMap[k]; return !(Q && Q.blocks && sd.block != null && !Q.blocks.includes(sd.block)) && !(Q && Q.req && Q.req[k] && a[k].qtag && a[k].qtag !== Q.req[k]); }));
}
function buildTiles() {
  $('#tiles').innerHTML = drilledFor().map((d) => `<li><button class="tile" type="button" data-k="${esc(keyOf(B, d))}"><span class="tes" lang="es">${esc(compose(B, d, 'es', Q))}</span><span class="ten">${esc(compose(B, d, 'en', Q))}</span></button></li>`).join('');
}
$('#trayBtn').addEventListener('click', () => { $('#trayPanel').hidden = false; const f = $('#tiles button'); if (f) f.focus(); });
$('#trayClose').addEventListener('click', () => { $('#trayPanel').hidden = true; $('#trayBtn').focus(); });
$('#tiles').addEventListener('click', (e) => {
  const t = e.target.closest('[data-k]'); if (!t) return;
  $('#trayPanel').hidden = true;
  const a = B.drilledAns.find((d) => keyOf(B, d) === t.dataset.k);
  applyAnswer(Object.assign({}, a), null);
  log('Cache', 'Drilled sentence picked. It is pre-signed, so checking it needs no model call.');
});
async function applyAnswer(next, imp) {
  ans = next; imported = imp; lastOdd = null; resetCheck();
  feel('wonder');
  if (mode === 'pickup') { syncSheet(); active = nextEmpty(); updatePrompt(); renderCard(); say('Answer filled in.'); setTimeout(() => feel('idle'), 1200); return; }
  revealSet = new Set(); syncSheet(); setActive(null, { move: false }); renderCard();
  overview();
  await sleep(500);
  for (const sd of B.slots.filter((s) => ans[s.key])) { revealSet.add(sd.key); syncSheet(); await sleep(190); }
  revealSet = null; syncSheet();
  feel('idle'); say('The sheet found your sentence.');
  setTimeout(() => setActive(nextEmpty()), calm ? 0 : 500);
}
$('#importBtn').addEventListener('click', () => { $('#importPanel').hidden = false; $('#importWarn').hidden = true; $('#importText').focus(); });
$('#importCancel').addEventListener('click', () => { $('#importPanel').hidden = true; $('#importBtn').focus(); });
$('#importGo').addEventListener('click', () => {
  const raw = $('#importText').value, warn = $('#importWarn');
  const sc = screen(raw);
  if (!sc.ok) { warn.textContent = sc.msg; warn.hidden = false; log('Screen', `Blocked on the device (${sc.code}). Nothing left the device.`); feel('wonder'); setTimeout(() => feel('idle'), 1000); return; }
  warn.hidden = true;
  log('Screen', `Passed on the device: letters only, ${sc.clean.length} characters, no instructions or personal details found.`);
  const p = parseText(B, sc.clean), placed = Object.keys(p.ans).length;
  log('Screen', `Read onto the sheet: ${placed} chunk${placed === 1 ? '' : 's'} matched, ${p.off.length} word${p.off.length === 1 ? '' : 's'} not on the sheet${p.fixes.length ? ', ' + p.fixes.length + ' agreement fix' : ''}.`);
  $('#importPanel').hidden = true; $('#importText').value = '';
  if (!placed) showWhy('Nothing matched the sheet yet. Try one of its starters.');
  applyAnswer(p.ans, { off: p.off, extra: p.extra, fixes: p.fixes });
});

/* ---------------- Tele's check ---------------- */
const LINES = {
  ok: { es: 'Vale, esto tiene sentido. ¡Buen trabajo!', en: 'OK, this makes sense. Good work!', feel: 'happy' },
  class: { es: 'Esta es de tu clase. ¡Perfecta!', en: 'This one is from your class. Perfect!', feel: 'happy' },
  odd: { es: 'Mmm… ¿seguro? Suena un poco raro.', en: 'Hmm… sure? That sounds a bit odd.', feel: 'wonder' },
  extra: { es: 'Tiene sentido. Hay palabras que no están en tu hoja.', en: "This makes sense. Some words aren't on your sheet.", feel: 'wonder' },
  incomplete: { es: 'Casi. Falta una cosa.', en: 'Nearly. One thing is missing.', feel: 'wonder' },
  offline: { es: 'Ahora no puedo comprobarlo. Puedes seguir.', en: "I can't check this right now. You can carry on.", feel: 'sleep' },
  thinking: { es: 'Leyendo tu tarjeta…', en: 'Reading your card…', feel: 'thinking' },
};
function resetCheck() { store.status = null; lastOdd = null; $('#result').hidden = true; $('#tools').hidden = false; $('#buildScreen').classList.remove('checking'); }
function showResult(code, detailHTML, buttons) {
  const L = LINES[code], r = $('#result');
  $('#tools').hidden = true; r.hidden = false; $('#buildScreen').classList.add('checking');
  r.innerHTML = `<div class="rtele" data-feel="${L.feel}">${teleSvg}</div><div><p class="rs" lang="es">${esc(L.es)}</p><p class="re">${esc(L.en)}</p>${detailHTML ? `<p class="rd">${detailHTML}</p>` : ''}</div><div class="rbtn"></div>`;
  const row = $('.rbtn', r);
  (buttons || []).forEach(([label, fn, cls]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn' + (cls ? ' ' + cls : ''); b.textContent = label; b.addEventListener('click', fn); row.append(b); });
  feel(L.feel); say(L.en);
  const f = $('.rbtn .btn', r); if (f) f.focus({ preventScroll: true });
  if (mode === 'camera') overview();
}
function backToBuild(slot) { $('#result').hidden = true; $('#tools').hidden = false; $('#buildScreen').classList.remove('checking'); feel('idle'); renderCard(); setTimeout(() => { measure(); setActive(slot || nextEmpty()); if (mode === 'pickup' && slot) openSheet(slot); }, 60); }
function finish(status) { store.status = status; STATE[qi].ans = ans; STATE[qi].imported = imported; renderCard(); goList(); }
async function check() {
  const a = ans, key = keyOf(B, a);
  showResult('thinking', '', []);
  log('Check', 'Key for this answer: ' + key.replace(/\|/g, ' '));
  const fr = fragment(B, a, Q);
  if (fr) {
    await sleep(350);
    const missing = fr.missing, have = a[fr.have];
    log('Matrix', `Frame incomplete: ${B.slotMap[missing].noun} missing. Rules answered, no model call.`);
    return showResult('incomplete', `Add ${esc(B.slotMap[missing].noun)} to go with “${esc(have.es)}”.`, [['Fix it', () => backToBuild(missing), 'primary']]);
  }
  if (!ready()) {
    await sleep(300); const nx = nextEmpty();
    log('Matrix', 'No complete sentence yet. Rules answered, no model call.');
    return showResult('incomplete', nx ? `Add ${esc(B.slotMap[nx].noun)}.` : 'Finish at least one sentence.', [['Fix it', () => backToBuild(nx), 'primary']]);
  }
  const clean = !imported || (!imported.off.length && !imported.extra.length);
  if (clean && B.presigned.has(key)) {
    await sleep(450);
    log('Cache', 'Hit: this is one of the sentences drilled in class, signed off in advance. No model call.');
    return showResult('class', imported && imported.fixes.length ? `I fixed agreement: ${imported.fixes.map(esc).join(', ')}.` : '', [['Next question', () => finish('class'), 'primary']]);
  }
  if (imported) {
    const ck = key + '|' + imported.off.map(norm).sort().join(',');
    let v = CACHE.get(ck);
    if (v) { await sleep(450); log('Cache', 'Hit: same answer, same verdict, no model call.'); }
    else {
      if (!online) { await sleep(500); log('Offline', 'The check service is unreachable. Rules passed, so the student can carry on unchecked.'); return showResult('offline', '', [['Carry on anyway', () => finish('unchecked'), 'primary'], ['Try again', () => check()]]); }
      log('Model', `Called (simulated). Sent: chunk ids${imported.off.length ? ' + ' + imported.off.length + ' off-sheet word(s) as quoted data' : ''}. Asked for a code only.`);
      await sleep(1200);
      const odd = oddCheck(B, a);
      v = odd || (imported.off.length ? { code: 'extra', words: imported.off } : { code: 'ok' });
      CACHE.set(ck, v); log('Model', `Returned code “${v.code}”. Stored for the whole course.`);
    }
    return renderVerdict(v);
  }
  await sleep(450);
  const odd = oddCheck(B, a), n = Object.keys(a).length;
  log('Matrix', `${(n * (n - 1)) / 2} pairs looked up${odd ? ', 1 flagged odd' : ', none flagged'}. Built from the sheet, so no model call.`);
  renderVerdict(odd || { code: 'ok' });
}
function renderVerdict(v) {
  const fixNote = imported && imported.fixes.length ? ` I fixed agreement: ${imported.fixes.map(esc).join(', ')}.` : '';
  if (v.code === 'ok') return showResult('ok', fixNote.trim(), [['Next question', () => finish('checked'), 'primary']]);
  if (v.code === 'odd') {
    lastOdd = v; renderCard();
    const d = v.kind === 'tense' ? `“${esc(v.a)}” is a wish or plan, but “${esc(v.b)}” says you already do it.` : `“${esc(v.a)}” and “${esc(v.b)}” are an unusual pair. You can keep it if you mean it.`;
    return showResult('odd', d, [['Swap it', () => backToBuild(v.slot), 'primary'], ['Keep it', () => finish('checked')]]);
  }
  if (v.code === 'extra') {
    const w = v.words.map((x) => '“' + esc(x) + '”').join(', ');
    return showResult('extra', `Not on your sheet: ${w}. That is fine if your teacher taught them.${fixNote}`, [['Keep them', () => finish('checked'), 'primary'], ['Take them out', () => { imported = null; backToBuild(null); }]]);
  }
}
$('#checkBtn').addEventListener('click', check);

/* ---------------- page 1: the flashcards ---------------- */
function renderList() {
  $('#cards').innerHTML = QS.map((q, i) => {
    const s = STATE[i], started = Object.keys(s.ans).length;
    const st = s.status === 'checked' || s.status === 'class' ? `<span class="stamp ok">✓ ${s.status === 'class' ? 'From class' : 'Checked'}</span>` : s.status === 'unchecked' ? '<span class="stamp none">Not checked yet</span>' : started ? '<span class="stamp new">In progress</span>' : '';
    return `<li><button class="fcard" type="button" data-q="${i}"><span class="fes" lang="es">${esc(q.es)}</span><span class="fen">${esc(q.en)}</span>${st}</button></li>`;
  }).join('');
  const n = STATE.filter((s) => s.status === 'checked' || s.status === 'class').length;
  $('#prog').textContent = `${n} of ${QS.length} checked`;
}
$('#cards').addEventListener('click', (e) => { const b = e.target.closest('[data-q]'); if (b) goBuild(+b.dataset.q); });
function loadQuestion(i) {
  if (STATE[qi]) { STATE[qi].ans = ans; STATE[qi].imported = imported; }
  qi = i; Q = QS[i]; B = BUILDERS[Q.builder]; ans = STATE[i].ans; imported = STATE[i].imported; lastOdd = null; revealSet = null; incomingKey = null; active = null; focusRectCache = null;
}
function goBuild(i) {
  loadQuestion(i);
  $('#listScreen').hidden = true; $('#buildScreen').hidden = false;
  $('#backBtn').hidden = false; $('#bandTitle').textContent = 'Your answer';
  $('#qes').textContent = Q.es; $('#qen').textContent = Q.en;
  sheetOpen = false; view.classList.remove('open'); $('#cardArea').inert = false; $('#chooser').hidden = true;
  $('#result').hidden = true; $('#tools').hidden = false; $('#buildScreen').classList.remove('checking');
  $('#toast').hidden = true;
  buildSheet(); buildTiles();
  requestAnimationFrame(() => {
    measure(); overview(false);
    renderCard();
    if (store.status) { active = null; updatePrompt(); return; }
    if (mode === 'camera') { active = null; setTimeout(() => setActive(nextEmpty()), 350); }
    else { active = nextEmpty(); updatePrompt(); renderCard(); }
  });
}
function goList() {
  closeSheet(false); $('#importPanel').hidden = true; $('#trayPanel').hidden = true;
  if (STATE[qi]) { STATE[qi].ans = ans; STATE[qi].imported = imported; }
  $('#buildScreen').hidden = true; $('#listScreen').hidden = false; $('#backBtn').hidden = true; $('#bandTitle').textContent = 'Write my answers';
  $('#result').hidden = true; feel(store.status === 'checked' || store.status === 'class' ? 'happy' : 'idle');
  renderList(); setTimeout(() => { const f = $('#cards .fcard'); if (f) f.focus({ preventScroll: true }); }, 30);
}
$('#backBtn').addEventListener('click', () => { if (sheetOpen) closeSheet(); else goList(); });

/* ---------------- controls ---------------- */
function effectiveMode() { return autoShort && device.clientHeight < 700 ? 'pickup' : modeChoice; }
function setMode(m) {
  mode = m; device.dataset.mode = m; closeSheet(false);
  if (!$('#buildScreen').hidden) { measure(); if (m === 'camera') { setActive(nextEmpty()); } else { active = nextEmpty(); updatePrompt(); renderCard(); } }
  log('Mode', m === 'camera' ? 'Guided camera: the sheet stays above the card.' : 'Pick-up: the sheet lifts over the card when you tap a slot.');
}
function applyMode() { const m = effectiveMode(); if (m !== mode) setMode(m); }
$$('input[name="mode"]').forEach((r) => r.addEventListener('change', () => { if (r.checked) { modeChoice = r.value; applyMode(); } }));
$('#autoShort').addEventListener('change', (e) => { autoShort = e.target.checked; log('Mode', autoShort ? 'Pick-up will be used automatically when the screen is shorter than 700px.' : 'Automatic pick-up on short screens is off.'); applyMode(); });
$('#phoneSize').addEventListener('change', (e) => { $('#stage').dataset.phone = e.target.value; });
$$('input[name="net"]').forEach((r) => r.addEventListener('change', () => { if (r.checked) { online = r.value === 'on'; log('Net', online ? 'Check service online.' : 'Check service offline. Only rules and cached verdicts work.'); } }));
const calmBox = $('#calm'); calmBox.checked = calm;
calmBox.addEventListener('change', () => { calm = calmBox.checked || matchMedia('(prefers-reduced-motion: reduce)').matches; device.classList.toggle('calm', calm); });
device.classList.toggle('calm', calm);
$('#resetBtn').addEventListener('click', () => { STATE.forEach((s) => { s.ans = {}; s.imported = null; s.status = null; }); ans = {}; imported = null; lastOdd = null; revealSet = null; CACHE.clear(); $('#log').innerHTML = ''; goList(); });
$('#gearBtn').addEventListener('click', () => $('#panel').classList.add('show'));
$('#panelClose').addEventListener('click', () => $('#panel').classList.remove('show'));

/* =====================================================================
   5. CHECKS: does the engine cope with each sheet?
   ===================================================================== */
const rnd = (n) => Math.floor(Math.random() * n);
function measureSheet(b) {
  const m = document.createElement('div'); m.className = 'paper'; m.style.cssText = 'position:absolute;left:-99999px;top:0;visibility:hidden;transform:none';
  m.innerHTML = sheetHTML(b); document.body.append(m);
  const out = { H: m.offsetHeight, cols: [] };
  $$('.col:not(.static), .sticky', m).forEach((c) => { const cells = $$('.cell', c); out.cols.push({ key: c.dataset.col, w: c.offsetWidth, h: c.offsetHeight, minCell: Math.min(...cells.map((x) => x.offsetHeight)) }); });
  m.remove(); return out;
}
function explore(b, q, N) {
  const R = { walks: N, deadReq: 0, deadReqEx: null, optDead: 0, complete: 0, odd: 0, rtFail: 0, rtEx: null, rtN: 0 };
  for (let w = 0; w < N; w++) {
    const a = {}; let dead = null; const path = [];
    for (let step = 0; step < 30 && !dead; step++) {
      const opts = [];
      for (const s of b.slots) {
        if (a[s.key]) continue;
        if (q.blocks && s.block != null && !q.blocks.includes(s.block)) continue;
        const fit = slotFits(b, a, s.key, q); if (fit.length) opts.push([s, fit]);
        else if (isRequired(b, s.key, q)) dead = s.key;
      }
      if (dead || !opts.length) break;
      const [s, fit] = opts[rnd(opts.length)]; let it = fit[rnd(fit.length)]; if (it.choice) it = derive(it, rnd(it.choice.length));
      a[s.key] = it; path.push(s.key + '=' + it.es);
      if (isReady(b, a, q) && Math.random() < 0.1) break;
    }
    if (dead) { R.deadReq++; if (!R.deadReqEx) R.deadReqEx = `${b.slotMap[dead].label} has nothing that fits after ${path.join(', ')}`; continue; }
    if (!isReady(b, a, q)) continue;
    R.complete++;
    if (b.slots.some((s) => !a[s.key] && !isRequired(b, s.key, q) && !(q.blocks && s.block != null && !q.blocks.includes(s.block)) && slotFits(b, a, s.key, q).length === 0)) R.optDead++;
    if (oddCheck(b, a)) R.odd++;
    const partial = !!fragment(b, a, q);
    if (!partial) {
      R.rtN++; const es = compose(b, a, 'es', q), p = parseText(b, es), again = compose(b, p.ans, 'es', q);
      if (again !== es || p.off.length || p.fixes.length) { R.rtFail++; if (!R.rtEx) R.rtEx = `“${es}” read back as “${again}”${p.off.length ? ' + off-sheet: ' + p.off.join(',') : ''}`; }
    }
  }
  return R;
}
function drilledReport(b) {
  const bad = [];
  b.drilledAns.forEach((a, n) => {
    const part = {}; let why = null;
    for (const s of b.slots) { if (!a[s.key]) continue; const c = clash(b, part, s.key, a[s.key], null); if (c) { why = c.msg; break; } part[s.key] = a[s.key]; }
    if (!why && oddCheck(b, a)) why = 'flagged odd';
    if (!why) { const es = compose(b, a, 'es'), p = parseText(b, es); if (compose(b, p.ans, 'es') !== es || p.off.length) why = 'does not read back'; }
    if (why) bad.push(`#${n + 1}: ${why}`);
  });
  return { n: b.drilledAns.length, bad };
}
function analyse(b, vw) {
  const M = measureSheet(b), D = drilledReport(b), warns = [], notes = [];
  const Rs = b.questions.map((q) => explore(b, q, 300));
  const R = Rs.reduce((t, r) => ({ walks: t.walks + r.walks, deadReq: t.deadReq + r.deadReq, deadReqEx: t.deadReqEx || r.deadReqEx, optDead: t.optDead + r.optDead, complete: t.complete + r.complete, odd: t.odd + r.odd, rtFail: t.rtFail + r.rtFail, rtEx: t.rtEx || r.rtEx, rtN: t.rtN + r.rtN }));
  let minEs = 99, minEn = 99, minTap = 99, worst = ''; const tall = [];
  M.cols.forEach((c) => { const s = clampN((vw - 24) / c.w, 0.86, 1.15), es = 17 * s, en = 12.5 * s, tap = c.minCell * s; if (es < minEs) { minEs = es; worst = c.key; } minEn = Math.min(minEn, en); minTap = Math.min(minTap, tap); if (c.h * s > 300) tall.push(c.key); });
  if (minEs < 14) warns.push(`Spanish text is only ${minEs.toFixed(1)}px in “${worst}”`);
  if (minEn < 10) warns.push(`English text drops to ${minEn.toFixed(1)}px`);
  if (minTap < 36) warns.push(`tap targets drop to ${minTap.toFixed(0)}px`);
  if (R.deadReq) warns.push(`dead end on a required slot (${R.deadReq}/${R.walks} builds): ${R.deadReqEx}`);
  if (R.rtFail) warns.push(`${R.rtFail}/${R.rtN} typed round-trips fail, e.g. ${R.rtEx}`);
  if (D.bad.length) warns.push(`drilled sentences with problems: ${D.bad.join('; ')}`);
  if (tall.length) notes.push(`needs a pan to see the whole column: ${tall.join(', ')}`);
  if (R.optDead) notes.push(`${Math.round((100 * R.optDead) / Math.max(1, R.complete))}% of builds close off an optional slot`);
  return { b, M, R, D, warns, notes, minEs, minEn, minTap, vw, pageH: M.H };
}
function parseReportHTML(b) {
  const sh = b.report && b.report.sheet; if (!sh) return null;
  const items = sh.stats.items, tcells = sh.tables.reduce((n, t) => n + t.cells.filter((c) => c.items.length).length, 0);
  const lines = [`Read ${sh.tables.length} table${sh.tables.length === 1 ? '' : 's'}, ${tcells} lists, ${items} chunks. English found for ${sh.stats.glossed} of ${items}${sh.stats.hard ? `; ${sh.stats.hard} marked harder (*)` : ''}${sh.floats.length ? `; ${sh.floats.length} floating box` : ''}.`];
  lines.push(b.reviewed ? `Interpretation: reviewed (stand-in). ${b.reviewedGlosses ? b.reviewedGlosses + ' English glosses filled or corrected, shown only in the subtitle. ' : ''}Rules, tags and agreement come from this layer.` : 'Interpretation: draft only. Chunks are chained in sheet order and no fit rules are known yet.');
  return { lines, warnings: sh.warnings };
}
function renderReport(vw) {
  const root = $('#report'); root.replaceChildren();
  let total = 0;
  Object.values(BUILDERS).forEach((b) => {
    const r = analyse(b, vw); total += r.warns.length;
    const d = document.createElement('details'); d.open = r.warns.length > 0;
    const chunks = b.columns.filter((c) => !c.static).reduce((n, c) => n + c.items.length, 0);
    const sum = document.createElement('summary');
    sum.innerHTML = `<b>${esc(b.name)}</b> · ${chunks} chunks · ${b.slots.length} slots · <span class="${r.warns.length ? 'bad' : 'good'}">${r.warns.length ? r.warns.length + ' to look at' : 'all clear'}</span>`;
    d.append(sum);
    const ul = document.createElement('ul');
    const li = (t, cls) => { const x = document.createElement('li'); x.textContent = t; if (cls) x.className = cls; ul.append(x); };
    const pr = parseReportHTML(b); if (pr) { pr.lines.forEach((l) => li(l)); pr.warnings.forEach((w) => li('Parser: ' + w, 'note')); }
    li(`At ${vw}px wide: Spanish ${r.minEs.toFixed(1)}px, English ${r.minEn.toFixed(1)}px, taps ${r.minTap.toFixed(0)}px at their smallest.`);
    li(`Page height ${r.pageH}px at 980px wide (A4 portrait is about 1386px).`);
    li(`${r.R.complete} random complete answers: ${r.R.deadReq} dead ends, ${Math.round((100 * r.R.odd) / Math.max(1, r.R.complete))}% flagged odd (random fill, so this runs high), ${r.R.rtN - r.R.rtFail}/${r.R.rtN} read back from typed text.`);
    li(`Drilled sentences: ${r.D.n - r.D.bad.length}/${r.D.n} clean.`);
    r.notes.forEach((n) => li(n, 'note'));
    r.warns.forEach((w) => li(w, 'warnli'));
    d.append(ul); root.append(d);
  });
  $('#reportSum').textContent = total ? `${total} thing${total === 1 ? '' : 's'} to look at` : 'All clear';
  window.__report = { total };
}
$('#runBtn').addEventListener('click', () => { $('#reportSum').textContent = 'Running…'; setTimeout(() => renderReport(+$('#vw').value), 20); });
$('#vw').addEventListener('change', () => $('#runBtn').click());

/* ---------------- loading the sheets ---------------- */
function b64(s) { const bin = atob(s), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u.buffer; }
function addBuilder(b) {
  prepare(b); BUILDERS[b.id] = b;
  b.questions.forEach((q) => QS.push(Object.assign({ builder: b.id }, q)));
}
function rebuildState() { while (STATE.length < QS.length) STATE.push({ ans: {}, imported: null, status: null }); STATE.length = QS.length; }
const SOURCES = [['wear', 'DOCX_WEAR', '4_3_4_Que_vas_a_llevar_SB.docx'], ['tech', 'DOCX_TECH', '1_1_2_C_mo_utilizas_la_tecnolog_a_a_diario_SB.docx'], ['trip', 'DOCX_TRIP', '2_3_4_D_nde_fuiste_el_a_o_pasado_SB.docx'], ['bed', 'DOCX_BED', '5_3_Como_es_tu_dormitorio_SB.docx']];
const DOCX = window.__DOCX || {};
function loadSheets() {
  addBuilder(FREE);
  const order = ['tech', 'trip', 'wear', 'bed'];
  order.forEach((id) => {
    const src = SOURCES.find((s) => s[0] === id);
    try { const sheet = parseDocx(b64(DOCX[id])); const b = assemble(sheet, OV[id]); b.file = src[2]; addBuilder(b); }
    catch (e) { log('Parser', `Could not read ${src[2]}: ${e.message}`); }
  });
  rebuildState();
}
function loadUpload(file) {
  const rd = new FileReader();
  rd.onload = () => {
    try {
      const sheet = parseDocx(rd.result), nm = file.name.replace(/\.docx$/i, '').replace(/[_-]+/g, ' ');
      const b = assemble(sheet, genericOverlay(sheet, nm)); b.file = file.name;
      QS = QS.filter((q) => q.builder !== 'custom'); delete BUILDERS.custom;
      addBuilder(b); rebuildState(); renderList(); renderReport(+$('#vw').value);
      $('#uploadMsg').textContent = `Read “${file.name}”: ${sheet.stats.items} chunks in ${sheet.tables.length} table(s). It is the last card on page 1, as a draft with no fit rules.`;
      log('Parser', `Uploaded ${file.name}: ${sheet.stats.items} chunks, ${sheet.warnings.length} note(s).`);
    } catch (e) { $('#uploadMsg').textContent = 'That file could not be read as a Word document: ' + e.message; }
  };
  rd.readAsArrayBuffer(file);
}
$('#upload').addEventListener('change', (e) => { const f = e.target.files[0]; if (f) loadUpload(f); });

window.__proto = { fragment, oddCheck, slotFits, slotItems, derive, isReady, keyOf, activeLines, BUILDERS, QS: () => QS, STATE, analyse, explore, drilledReport, compose, parseText, parseDocx, unzip, clash, goBuild, goList, assemble, genericOverlay, OV, FREE, b64 };
loadSheets();
Q = QS[0]; B = BUILDERS[Q.builder];
buildSheet(); renderList(); renderCard();
log('Ready', `${Object.keys(BUILDERS).length} sentence builders loaded: ${Object.values(BUILDERS).map((b) => b.name).join(', ')}.`);
(document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(() => renderReport(+$('#vw').value));
})();
