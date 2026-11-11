'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { Builder, Item } from '../../../lib/sheets/builder';
import { clampCam, focusCam, overviewCam, overviewScale, runsBelow, union, zoomAbout, type Cam, type Rect } from '../../../lib/sheets/camera';
import { accepts, activeLines, baseOf, clash, compose, derive, isRequired, sentences, slotFits, slotText, type Answer, type Question } from '../../../lib/sheets/engine';
import { signOff, TELE_LINES, type SignOff } from '../../../lib/sheets/signoff';
import type { Sheet } from '../../../lib/sheets/types';
import { Tele } from '../Tele';
import './write-sheet.css';

export interface WriteSheetProps {
  builder: Builder;
  sheet: Sheet;
  question?: Question;
  /** The pick-up view, where the sheet lifts over the card. A setting, off by default until approved. */
  pickup?: boolean;
  /** Called when the student has a sentence the check accepts and taps Done. */
  onSignedOff?: (text: string, english: string, answer: Answer) => void;
  onChange?: (a: Answer) => void;
  /** Choices to start from, for an answer saved earlier. */
  initial?: Answer;
  /** The question the student is answering, when it is not one of the sheet's own. */
  heading?: { es: string; en: string };
}

const SHEET_W = 980;

/**
 * The writing screen (task 5.1): the student's sentence builder above an answer flashcard. A guided
 * camera zooms the sheet to the list the student needs next; the card shows the real sentence with
 * its English subtitle, and the chosen chunks as handles. All rules come from the interpretation;
 * no model is called here.
 */
export function WriteSheet({ builder: B, sheet, question: Q, pickup = false, onSignedOff, onChange, initial, heading }: WriteSheetProps) {
  const [ans, setAns] = useState<Answer>(initial ?? {});
  const [active, setActive] = useState<string | null>(null);
  const [result, setResult] = useState<SignOff | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [choosing, setChoosing] = useState<Item | null>(null);
  const [menu, setMenu] = useState(false);
  const [open, setOpen] = useState(false);
  const [cam, setCam] = useState<Cam>({ s: 0.3, x: 0, y: 0 });
  const [mode, setMode] = useState<'overview' | 'focus' | 'manual'>('overview');
  const [glide, setGlide] = useState(false);
  const [focusRect, setFocusRect] = useState<Rect | null>(null);
  const [dims, setDims] = useState({ vw: 340, vh: 330, ph: 1000 });
  const [nonce, setNonce] = useState(0);
  const viewRef = useRef<HTMLDivElement>(null), paperRef = useRef<HTMLDivElement>(null), camRef = useRef(cam), dimsRef = useRef(dims);
  camRef.current = cam; dimsRef.current = dims;
  const optional = (k: string) => !isRequired(B, k, Q);

  /* ---------- rules ---------- */
  const holder = (it: Item) => B.slots.find((s) => ans[s.key] && baseOf(ans[s.key] as Item) === it);
  const slotFor = (it: Item, a: Answer = ans) => {
    const cand = B.slots.filter((s) => s.cols.includes(it.col) && accepts(s, it));
    if (!cand.length) return null;
    const sat = (s: (typeof cand)[number]) => !s.after || !!a[s.after];
    if (active && cand.some((s) => s.key === active) && !a[active]) return active;
    return (cand.find((s) => !a[s.key] && sat(s)) ?? cand.find((s) => s.key === active) ?? cand.find(sat) ?? cand[0]).key;
  };
  const slotDead = (k: string, a: Answer = ans) => !a[k] && slotFits(B, a, k, Q).length === 0;
  const nextEmpty = (a: Answer) => B.auto.find((k) => !a[k] && !slotDead(k, a) && !(Q?.blocks && B.slotMap[k].block != null && !Q.blocks.includes(B.slotMap[k].block as number))) ?? null;
  const ready = signOff(B, ans, Q).code !== 'incomplete' || Object.keys(ans).length > 0;

  const states = useMemo(() => {
    const m = new Map<Item, { chosen: boolean; why: string | null }>();
    const asd = active ? B.slotMap[active] : null;
    for (const c of B.columns) for (const it of c.items) {
      const h = holder(it);
      const sk = slotFor(it);
      let c1 = h ? null : sk ? clash(B, ans, sk, it, Q) : { msg: 'Not used in this sentence builder.' };
      let why: string | null = c1 ? c1.msg : null;
      if (!why && !h && asd && asd.cols.includes(it.col) && !accepts(asd, it)) {
        const nat = B.slots.find((s) => s.cols.includes(it.col) && accepts(s, it));
        why = `That one is for “${nat ? nat.label : 'another part'}”, not “${asd.label}”.`;
      }
      c1 = null;
      m.set(it, { chosen: !!h, why });
    }
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [B, ans, active, Q]);

  /* ---------- camera ---------- */
  const rectOf = useCallback((key: string): Rect | null => {
    const el = paperRef.current?.querySelector<HTMLElement>(`[data-col="${key}"]`), p = paperRef.current;
    if (!el || !p) return null;
    const pr = p.getBoundingClientRect(), r = el.getBoundingClientRect(), k = pr.width / SHEET_W;
    return { x: (r.left - pr.left) / k, y: (r.top - pr.top) / k, w: r.width / k, h: r.height / k };
  }, []);
  const focusKeys = useCallback((k: string): string[] => {
    const sd = B.slotMap[k];
    let keys = sd.cols.filter((c) => B.cols[c].items.some((it) => accepts(sd, it) && !clash(B, ans, k, it, Q)));
    if (!keys.length) keys = sd.cols;
    const partner = sd.alignWith ? ans[sd.alignWith] : undefined;
    if (partner?.row != null) { const sub = keys.filter((c) => B.cols[c].items[0]?.row === partner.row); if (sub.length) keys = sub; }
    return keys;
  }, [B, ans, Q]);
  const applyCam = (c: Cam, m: 'overview' | 'focus' | 'manual', g: boolean) => { setCam(c); setMode(m); setGlide(g); };
  const toOverview = (g = true) => { const d = dimsRef.current; setFocusRect(null); applyCam(overviewCam(d.vw, d.vh, SHEET_W, d.ph), 'overview', g); };
  const toKeys = (keys: string[], g = true) => {
    const d = dimsRef.current, rs = keys.map(rectOf).filter((r): r is Rect => !!r);
    if (!rs.length) return toOverview(g);
    const r = union(rs);
    setFocusRect(r);
    applyCam(focusCam(r, d.vw, d.vh, SHEET_W, d.ph), 'focus', g);
  };

  useLayoutEffect(() => {
    const view = viewRef.current, paper = paperRef.current;
    if (!view || !paper) return;
    const measure = () => { const d = { vw: view.clientWidth, vh: view.clientHeight, ph: paper.offsetHeight }; if (d.vw && d.vh > 40) setDims((o) => (o.vw === d.vw && o.vh === d.vh && o.ph === d.ph ? o : d)); };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(view); ro.observe(paper);
    return () => ro.disconnect();
  }, []);

  // Follow the guide: when the active slot (or the view size) changes, frame its list.
  useEffect(() => {
    if (pickup && !open) return;
    if (!active) { if (mode !== 'manual') toOverview(false); return; }
    toKeys(focusKeys(active), mode !== 'overview' || nonce > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, nonce, dims.vw, dims.vh, dims.ph, open]);

  // Pan, pinch, wheel and double-tap.
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const ptrs = new Map<number, { x: number; y: number }>();
    let drag: { x: number; y: number; cx: number; cy: number } | null = null, pinch: { d: number; s: number } | null = null, moved = false, lastTap = 0;
    const D = () => dimsRef.current;
    const manual = (c: Cam) => { const d = D(); applyCam(clampCam(c, d.vw, d.vh, SHEET_W, d.ph), 'manual', false); };
    const skip = (t: EventTarget | null) => !!(t as HTMLElement | null)?.closest?.('.ws-vbar, .ws-mini, .ws-chooser, .ws-more');
    const down = (e: PointerEvent) => {
      if (skip(e.target)) return;
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (ptrs.size === 1) { drag = { x: e.clientX, y: e.clientY, cx: camRef.current.x, cy: camRef.current.y }; moved = false; pinch = null; }
      else if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), s: camRef.current.s }; drag = null; moved = true; }
      (view as unknown as { __moved?: boolean }).__moved = false;
    };
    const move = (e: PointerEvent) => {
      if (!ptrs.has(e.pointerId)) return;
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (ptrs.size === 1 && drag) {
        const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
        if (!moved && Math.hypot(dx, dy) > 8) { moved = true; try { view.setPointerCapture(e.pointerId); } catch { /* not capturable */ } }
        if (moved) { (view as unknown as { __moved?: boolean }).__moved = true; manual({ ...camRef.current, x: drag.cx + dx, y: drag.cy + dy }); }
      } else if (ptrs.size === 2 && pinch) {
        const [a, b] = [...ptrs.values()], d = D(), vr = view.getBoundingClientRect();
        const s2 = Math.min(2.6, Math.max(overviewScale(d.vw, d.vh, SHEET_W, d.ph) * 0.98, (pinch.s * Math.hypot(a.x - b.x, a.y - b.y)) / pinch.d));
        const z = zoomAbout(camRef.current, (a.x + b.x) / 2 - vr.left, (a.y + b.y) / 2 - vr.top, s2, d.vw, d.vh, SHEET_W, d.ph);
        applyCam(z, 'manual', false);
      }
    };
    const up = (e: PointerEvent) => {
      const was = ptrs.size;
      ptrs.delete(e.pointerId);
      if (e.type === 'pointerup' && was === 1 && !moved && !(e.target as HTMLElement).closest('.ws-cell, .ws-vbar, .ws-mini, .ws-chooser, .ws-more')) {
        const now = Date.now();
        if (now - lastTap < 320) setNonce((n) => n + 1);
        lastTap = now;
      }
      if (ptrs.size < 2) pinch = null;
      if (ptrs.size === 0) drag = null;
    };
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      const d = D(), c = camRef.current;
      if (e.ctrlKey) { const vr = view.getBoundingClientRect(); applyCam(zoomAbout(c, e.clientX - vr.left, e.clientY - vr.top, Math.min(2.6, Math.max(overviewScale(d.vw, d.vh, SHEET_W, d.ph) * 0.98, c.s * Math.exp(-e.deltaY * 0.01))), d.vw, d.vh, SHEET_W, d.ph), 'manual', false); }
      else manual({ ...c, x: c.x - e.deltaX, y: c.y - e.deltaY });
    };
    view.addEventListener('pointerdown', down); view.addEventListener('pointermove', move); view.addEventListener('pointerup', up); view.addEventListener('pointercancel', up);
    view.addEventListener('wheel', wheel, { passive: false });
    return () => { view.removeEventListener('pointerdown', down); view.removeEventListener('pointermove', move); view.removeEventListener('pointerup', up); view.removeEventListener('pointercancel', up); view.removeEventListener('wheel', wheel); };
  }, []);

  /* ---------- actions ---------- */
  const say = (t: string) => { setToast(t); window.setTimeout(() => setToast((x) => (x === t ? null : x)), 3600); };
  const commit = (a: Answer, next: string | null) => { setAns(a); setResult(null); setMenu(false); setActive(next); setNonce((n) => n + 1); onChange?.(a); };
  const pick = (it: Item) => {
    const k = slotFor(it);
    if (!k) return;
    const a = { ...ans, [k]: it };
    commit(a, nextEmpty(a));
    if (pickup) setOpen(false);
  };
  const onCell = (it: Item) => {
    if ((it as Item & { static?: boolean }).col && B.cols[it.col].static) return;
    const st = states.get(it);
    if (st?.why) { say(st.why); return; }
    const h = holder(it);
    if (h && active && h.key !== active && B.slotMap[active].cols.includes(it.col)) { say(`That is already your “${h.label}”. Tap its chip to change it.`); return; }
    if (h) { const a = { ...ans }; delete a[h.key]; commit(a, h.key); return; }
    if (it.choice) { setChoosing(it); return; }
    pick(it);
  };
  const remove = (k: string) => { const a = { ...ans }; delete a[k]; commit(a, k); if (pickup) setOpen(true); };
  const activate = (k: string) => { setActive(k); setNonce((n) => n + 1); setMenu(false); if (pickup) setOpen(true); };
  const check = () => setResult(signOff(B, ans, Q));
  const fix = (slot: string) => { setResult(null); activate(slot); };

  // Start at the first slot.
  useEffect(() => { setActive(nextEmpty(initial ?? {})); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------- the card ---------- */
  const keys = activeLines(B, Q).flatMap((l) => l.slots);
  const shown = keys.filter((k) => ans[k] || k === active || (!optional(k) && !slotDead(k)));
  const more = keys.filter((k) => !ans[k] && k !== active && optional(k) && !slotDead(k));
  const es = sentences(B, ans, 'es', Q), en = compose(B, ans, 'en', Q);
  const kindOf = (k: string) => 'k-' + B.cols[B.slotMap[k].cols[0]].kind;
  const pre = (k: string) => { for (const l of B.frames) for (const p of l.parts) if ('slot' in p && p.slot === k && p.pre) return p.pre.es.trim(); return ''; };
  const chip = (k: string) => { const t = slotText(B, ans, k, 'es'); return pre(k) && t ? `${pre(k)} ${t}` : (t ?? ''); };
  const prompt = active ? B.slotMap[active].prompt : signOff(B, ans, Q).code === 'ok' ? 'All filled. Check your answer when you are ready.' : 'Pick from the sheet';
  const showOptional = !!active && optional(active) && Object.keys(ans).length > 0 && signOff(B, ans, Q).code !== 'incomplete';

  /* ---------- the sheet ---------- */
  const colByCell = useMemo(() => new Map(B.columns.map((c) => [c.cell, c])), [B]);
  const paper = (interactive: boolean) => (
    <>
      <div className="ws-title"><div><h2 lang="es">{B.title}</h2><p>{B.subtitle}</p></div></div>
      {sheet.tables.map((t) => {
        const total = t.grid.reduce((x, y) => x + y, 0) || 1;
        const title = t.index === 0 ? null : null;
        return (
          <section className="ws-block" key={t.index}>
            {title}
            <table className="ws-table" aria-label={`Sentence builder, part ${t.index + 1}`}>
              <colgroup>{t.grid.map((g, i) => <col key={i} style={{ width: `${(g / total) * 100}%` }} />)}</colgroup>
              <tbody>
                {Array.from({ length: t.rows }, (_, r) => (
                  <tr key={r}>
                    {t.cells.filter((c) => c.r === r).sort((a, b) => a.c - b.c).map((cell) => {
                      const col = colByCell.get(cell.id);
                      if (!col) return <td key={cell.id} className="ws-blank" colSpan={cell.cs} rowSpan={cell.rs} />;
                      const live = interactive && !!active && focusKeys(active).includes(col.key);
                      return (
                        <td key={cell.id} className={`ws-col k-${col.kind}${col.static ? ' ws-static' : ''}${live ? ' live' : ''}${live && nonce >= 0 ? ' arrive' : ''}`} data-col={col.key} colSpan={cell.cs} rowSpan={cell.rs}>
                          {(col.title || col.hint) && <div className="ws-head">{col.title}{col.hint && <small>{col.hint}</small>}</div>}
                          {col.items.map((it) => {
                            const st = states.get(it);
                            return col.static ? (
                              <div className="ws-cell static" key={it.i}><span className="ws-es" lang="es">{it.es}</span><span className="ws-en">{it.en}</span></div>
                            ) : (
                              <button type="button" key={it.i} data-col={col.key} data-i={it.i} className={`ws-cell${st?.chosen ? ' chosen' : ''}${st?.why ? ' clash' : ''}`} aria-pressed={!!st?.chosen} aria-disabled={st?.why ? true : undefined} tabIndex={interactive ? 0 : -1} onClick={interactive ? () => onCell(it) : undefined}>
                                <span className="ws-es" lang="es">{it.es}{it.hard && <sup aria-label="harder">*</sup>}</span><span className="ws-en">{it.en}</span><i className="ws-tick" aria-hidden="true">✓</i>
                              </button>
                            );
                          })}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        );
      })}
    </>
  );

  const ms = 84 / SHEET_W;
  const camStyle: CSSProperties = { transform: `translate(${cam.x}px, ${cam.y}px) scale(${cam.s})` };
  const noGlide = typeof window !== 'undefined' && (window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.calm === 'on');
  const below = !!focusRect && mode !== 'overview' && runsBelow(focusRect, cam, dims.vh);
  const miniClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect(), px = (e.clientX - r.left) / ms, py = (e.clientY - r.top) / ms;
    const s = mode === 'overview' ? Math.min(1.1, (dims.vw - 24) / 300) : cam.s;
    applyCam(clampCam({ s, x: dims.vw / 2 - px * s, y: dims.vh / 2 - py * s }, dims.vw, dims.vh, SHEET_W, dims.ph), 'manual', true);
  };
  const line = result ? TELE_LINES[result.code] : null;

  return (
    <div className={`ws${pickup ? ' ws--pickup' : ''}`} data-checking={!!result} data-testid="write-sheet">
      <div ref={viewRef} className={`ws-view${open ? ' open' : ''}${below ? ' has-more' : ''}`} data-testid="sheet-view">
        <div ref={paperRef} className={`ws-paper${glide && !noGlide ? ' glide' : ''}${active ? ' guiding' : ''}`} style={camStyle} data-testid="paper">{paper(true)}</div>
        <div className="ws-vbar">
          <button type="button" className="ws-vbtn ws-close" onClick={() => setOpen(false)}>‹ Card</button>
          <p className="ws-prompt" role="status" data-testid="prompt">{showOptional && <span className="opt">Optional · </span>}{prompt}</p>
          {(mode === 'focus' || active) && <button type="button" className="ws-vbtn" onClick={() => (mode === 'focus' ? toOverview() : setNonce((n) => n + 1))}>{mode === 'focus' ? 'Whole page' : 'Follow the guide'}</button>}
        </div>
        <div className="ws-mini" aria-hidden="true" onClick={miniClick} style={{ height: dims.ph * ms }}>
          <div className="ws-paper" style={{ transform: `scale(${ms})` }} {...({ inert: true } as object)}>{paper(false)}</div>
          <div className="ws-finder" style={{ left: (-cam.x / cam.s) * ms, top: (-cam.y / cam.s) * ms, width: (dims.vw / cam.s) * ms, height: (dims.vh / cam.s) * ms }} />
        </div>
        {below && <button type="button" className="ws-vbtn ws-more" onClick={() => applyCam(clampCam({ ...cam, y: cam.y - dims.vh * 0.6 }, dims.vw, dims.vh, SHEET_W, dims.ph), 'manual', true)}>More below ▾</button>}
        {toast && <p className="ws-toast" role="status">{toast}</p>}
        {choosing && (
          <div className="ws-chooser" role="group" aria-label="Which one?">
            <span>Which one?</span>
            {choosing.choice?.map((v, vi) => <button type="button" className="ws-vbtn" lang="es" key={vi} onClick={() => { const it = choosing; setChoosing(null); pick(derive(it, vi)); }}>{v.es}</button>)}
            <button type="button" className="ws-vbtn" onClick={() => setChoosing(null)}>Cancel</button>
          </div>
        )}
      </div>

      <div className="ws-card-area" inert={pickup && open ? true : undefined}>
        {(heading ?? Q) && <div className="ws-qtab"><span className="ws-qes" lang="es">{(heading ?? Q)!.es}</span><span className="ws-qen">{(heading ?? Q)!.en}</span></div>}
        <div className="ws-acard" data-testid="answer-card">
          <p className={`ws-said${es.length ? '' : ' empty'}`} lang="es" data-testid="sentence">{es.length ? es.map((x, i) => <span className="sn" key={i}>{x}</span>) : 'Your sentence appears here.'}</p>
          <p className="ws-sub" data-testid="subtitle">{en}</p>
          <div className="ws-lines" data-testid="chips">
            <div className="ws-lrow">
              {shown.map((k) => ans[k] ? (
                <span className={`ws-slotw ${kindOf(k)}`} key={k}>
                  <button type="button" className="ws-slot filled" data-slot={k} lang="es" aria-label={`Change ${B.slotMap[k].label}: ${chip(k)}`} onClick={() => activate(k)}>{chip(k)}</button>
                  <button type="button" className="ws-rm" aria-label={`Remove ${chip(k)}`} onClick={() => remove(k)}>×</button>
                </span>
              ) : (
                <span className={kindOf(k)} key={k}><button type="button" className={`ws-slot${optional(k) ? ' opt' : ''}${active === k ? ' active' : ''}`} data-slot={k} onClick={() => activate(k)}>{B.slotMap[k].label}</button></span>
              ))}
              {more.length > 0 && (Object.keys(ans).length > 0 || active) && <button type="button" className="ws-slot more" data-more="1" onClick={() => setMenu((m) => !m)}>+ Add more</button>}
            </div>
          </div>
          {menu && <div className="ws-moremenu" data-testid="more-menu">{more.map((k) => <button type="button" key={k} className={`ws-slot opt ${kindOf(k)}`} data-act={k} onClick={() => activate(k)}>{B.slotMap[k].label}</button>)}</div>}
          {!result && (
            <div className="ws-tools">
              {pickup && nextEmpty(ans) && <button type="button" className="ws-btn" onClick={() => activate(nextEmpty(ans) as string)}>Pick: {B.slotMap[nextEmpty(ans) as string].label.replace('…', '').replace('+ ', '')}</button>}
              <span className="sp" />
              <button type="button" className="ws-btn primary" disabled={!ready || Object.keys(ans).length === 0} onClick={check}>Check it</button>
            </div>
          )}
          {result && line && (
            <div className="ws-result" data-testid="result" data-code={result.code}>
              <div className="tele"><Tele feelings={result.code === 'ok' ? { joy: 0.8 } : { surprise: 0.3 }} /></div>
              <div>
                <p className="ws-rs" lang="es">{line.es}</p>
                <p className="ws-re">{line.en}</p>
                {result.code === 'incomplete' && <p className="ws-rd">Add {result.fix.noun}{result.fix.have ? ` to go with “${result.fix.have}”` : ''}.</p>}
                {result.code === 'clash' && <p className="ws-rd">{result.fix.message}</p>}
              </div>
              <div className="ws-rbtn">
                {result.code === 'ok' ? (
                  <button type="button" className="ws-btn primary" onClick={() => onSignedOff?.(es.join(' '), en, ans)}>Done</button>
                ) : (
                  <button type="button" className="ws-btn primary" onClick={() => fix(result.fix.slot)}>Fix it</button>
                )}
                <button type="button" className="ws-btn" onClick={() => setResult(null)}>Keep editing</button>
              </div>
            </div>
          )}
        </div>
      </div>
      {pickup && !open && <span hidden />}
    </div>
  );
}
