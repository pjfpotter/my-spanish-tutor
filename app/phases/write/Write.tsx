'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import {
  addGlue, addSlot, clearBlock, emptyParts, fillBlock, fittingChunks, isEmpty, kindOfCategory, partsFromText, removePart, textFromParts, type Part,
} from '../../../lib/coach/builder';
import type { Simplification } from '../../../lib/coach/simplify';
import { analyse } from '../../../lib/coach/analysis';
import { startingAnswer, viewAnswer, viewWholeTest } from '../../../lib/coach/writing';
import { KIND_LABEL } from '../../../lib/practice/chunk-kind';
import type { SavedAnswer, WritingCourse } from '../../../lib/progress/writing-store';
import { Caption, useSubtitles } from '../../components/Caption';
import { Tele } from '../../components/Tele';
import { useSfx } from '../../components/useSfx';
import { AnalysisView } from './AnalysisView';
import { PracticeShell } from '../../components/practice/PracticeShell';
import '../../components/screens.css';
import './write.css';

type Rows = Record<string, Part[]>;
type Tray = { id: string; mode: 'chunks' | 'glue' } | { mode: 'add' } | null;

/**
 * The write phase (tasks 7.4, 7.6 and 26.1b). Every question opens on empty coloured slots laid out like the
 * sentence builder the student knows, filled from that question's own builder, with the same kind colours
 * as the automatise phase. Tapping a block opens only the chunks that fit it, in place. Joining words sit in
 * a cement tray. A starter answer is there if the student asks, never by default. All judging is by the rubric
 * in the browser; nothing here calls a model, and no level or target is asked for.
 */
export function Write({ course, saved, suggestions = {}, focus = 0 }: { course: WritingCourse; saved: SavedAnswer[]; suggestions?: Record<string, Simplification>; focus?: number }) {
  const [index, setIndex] = useState(focus);
  const [rows, setRows] = useState<Rows>(() => {
    const r: Rows = {};
    for (const q of course.questions) {
      const mine = saved.find((s) => s.questionId === q.id)?.text ?? '';
      const parts = partsFromText(mine, course.chunks);
      r[q.id] = parts.length ? parts : emptyParts(q.template);
    }
    return r;
  });
  const [confirmed, setConfirmed] = useState(() => new Set(saved.filter((s) => s.confirmed).map((s) => s.questionId)));
  const [tray, setTray] = useState<Tray>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [analysing, setAnalysing] = useState(false);
  const [dismissed, setDismissed] = useState(() => new Set<string>());
  const [noted, setNoted] = useState(() => new Set<string>());
  const [used, setUsed] = useState(() => new Set<string>());
  const sfx = useSfx();
  const [showEnglish, toggleEnglish] = useSubtitles();
  const live = useRef<HTMLParagraphElement>(null);

  const q = course.questions[index];
  const parts = rows[q.id];
  const text = useMemo(() => textFromParts(parts), [parts]);
  const view = useMemo(() => viewAnswer(course, text), [course, text]);
  const whole = useMemo(
    () => viewWholeTest(course, course.questions.map((x) => ({ questionPosition: x.position, text: textFromParts(rows[x.id]) }))),
    [course, rows],
  );
  const starter = startingAnswer(course, q.position);
  const isConfirmed = confirmed.has(q.id);
  // A stalled answer is offered a shorter version, so it is not also nudged to grow.
  const offerShorter = !!suggestions[q.id] && !used.has(q.id);
  // One optional extra at a time, only once the answer works, and not again for this answer once dismissed.
  const nudge = view.canConfirm && !offerShorter && !dismissed.has(q.id) ? view.suggestion : null;
  // The memorising load note comes once per question and never blocks confirming.
  const noteDue = view.loadNote && !offerShorter && !noted.has(q.id);
  const glue = course.calibration.glueWords;
  const open = tray && 'id' in tray ? parts.find((p) => p.id === tray.id) ?? null : null;

  const post = useCallback(async (questionId: string, body: string, confirm: boolean): Promise<{ error: string | null; bonus: number; reset: boolean }> => {
    const res = await fetch('/api/answers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ questionId, text: body, confirm }) }).catch(() => null);
    if (!res) return { error: 'Could not save just now. Your answer is still here; try again in a moment.', bonus: 0, reset: false };
    const json = (await res.json().catch(() => null)) as { error?: string; bonus?: number; progressReset?: boolean } | null;
    if (!res.ok) return { error: json?.error ?? 'Could not save that.', bonus: 0, reset: false };
    return { error: null, bonus: json?.bonus ?? 0, reset: json?.progressReset === true };
  }, []);

  const change = (next: Part[]) => {
    setRows((r) => ({ ...r, [q.id]: next }));
    setConfirmed((c) => {
      const n = new Set(c);
      n.delete(q.id); // changing a confirmed answer reopens it
      return n;
    });
    setError(null);
    void post(q.id, textFromParts(next), false).then((r) => {
      if (r.error) setError(r.error);
      else if (r.reset) setNotice('Changing this answer starts its memorising again.');
    });
  };

  const goTo = (i: number) => {
    setIndex(i);
    setAnalysing(false);
    setTray(null);
    setError(null);
    setNotice(null);
  };

  const pick = (spanish: string) => {
    if (!open) return;
    const chunk = course.chunks.find((c) => c.spanish === spanish)!;
    change(fillBlock(parts, open.id, chunk));
    setTray(null);
  };

  const takeOut = () => {
    if (!open) return;
    const inTemplate = open.kind === 'block' && q.template.includes(open.category) && parts.filter((p) => p.kind === 'block' && p.category === open.category).length === 1;
    change(inTemplate ? clearBlock(parts, open.id) : removePart(parts, open.id));
    setTray(null);
  };

  const useGlue = (word: string) => {
    if (!tray || !('id' in tray)) return;
    if (open?.kind === 'glue') change(parts.map((p) => (p.id === open.id ? { ...p, text: word } : p)));
    else change(addGlue(parts, tray.id, word));
    setTray(null);
  };

  const addCategory = (category: string) => {
    const next = addSlot(parts, category);
    change(next);
    setTray({ id: next[next.length - 1].id, mode: 'chunks' });
  };

  const useShorter = () => {
    const s = suggestions[q.id];
    if (!s) return;
    change(partsFromText(s.text, course.chunks));
    setUsed((u) => new Set(u).add(q.id));
    setTray(null);
  };

  const useStarter = () => {
    if (!starter) return;
    const next = partsFromText(starter.text, course.chunks);
    change(next);
    setTray(null);
  };

  const confirm = async () => {
    setBusy(true);
    const r = await post(q.id, text, true);
    setBusy(false);
    if (r.error) return setError(r.error);
    setConfirmed((c) => new Set(c).add(q.id));
    setNotice(null);
    if (r.bonus > 0) {
      sfx('section-complete');
      setNotice(`All five confirmed. Bonus: +${r.bonus} coins.`);
    }
    if (live.current) live.current.textContent = r.bonus > 0 ? `Answer confirmed. All five done, bonus of ${r.bonus} coins.` : 'Answer confirmed.';
  };

  const all = course.questions.every((x) => confirmed.has(x.id));
  const fits = open?.kind === 'block' ? fittingChunks(parts, open.id, course.chunks, q.topics) : [];
  const words = useMemo(() => q.spanish.split(/\s+/), [q]);
  const meta = (
    <>
      <span data-testid="confirmed-count">{confirmed.size} of {course.questions.length} confirmed</span>
      <span data-testid="answer-value">
        Worth {view.assessment.value}
        <span className="sr-only"> (grows as you add detail)</span>
      </span>
    </>
  );

  return (
    <PracticeShell
      onBack={index > 0 ? () => goTo(index - 1) : undefined}
      backLabel="Back"
      tele={<Tele question />}
      caption={<Caption compact words={words} activeIndex={null} english={q.english} showEnglish={showEnglish} onToggleEnglish={toggleEnglish} />}
      meta={meta}
      footer={
        <p className="write-checklist" data-testid="checklist">
          {Object.values(whole.test.checklist).map((c) => (
            <span key={c.label} data-on={c.met}>
              <span aria-hidden="true">{c.met ? '✓' : '○'}</span> {Math.min(c.have, c.need)} of {c.need} {c.label.replace(' across your answers', '')}
              <span className="sr-only">{c.met ? ' (done)' : ' (not yet, and it never lowers an answer)'}</span>
            </span>
          ))}
        </p>
      }
    >
      <h1 className="sr-only">Write your answer to question {index + 1}</h1>
      <ol className="dots" aria-label="Your five questions">
        {course.questions.map((x, i) => (
          <li key={x.id}>
            <button type="button" className="btn" aria-current={i === index} onClick={() => goTo(i)} data-confirmed={confirmed.has(x.id)}>
              {i + 1}
              {confirmed.has(x.id) ? <span aria-hidden="true"> ✓</span> : null}
              <span className="sr-only">{confirmed.has(x.id) ? ' (confirmed)' : ''}</span>
            </button>
          </li>
        ))}
      </ol>

      {analysing ? (
        <AnalysisView text={text} analysis={analyse(course.calibration, text)} onClose={() => setAnalysing(false)} />
      ) : (
      <section className="builder" aria-label="Your answer" data-testid="builder">
        <ul className="blocks">
          {parts.map((p) => {
            if (p.kind === 'glue') {
              const on = tray && 'id' in tray && tray.id === p.id;
              return (
                <li key={p.id}>
                  <button type="button" className="tile block block-glue" lang="es" aria-pressed={!!on} onClick={() => setTray(on ? null : { id: p.id, mode: 'glue' })} data-testid="block-glue">
                    {p.text}
                    <span className="sr-only"> (joining word)</span>
                  </button>
                </li>
              );
            }
            const kind = kindOfCategory(p.category, course.chunks);
            const k = KIND_LABEL[kind];
            const on = tray && 'id' in tray && tray.id === p.id;
            return (
              <li key={p.id}>
                <button
                  type="button"
                  className={`tile block${p.text === null ? ' block-empty' : ''}`}
                  data-kind={kind}
                  data-empty={p.text === null}
                  lang={p.text === null ? undefined : 'es'}
                  aria-pressed={!!on}
                  onClick={() => setTray(on ? null : { id: p.id, mode: 'chunks' })}
                  data-testid="block"
                >
                  <span className="tile-kind" aria-hidden="true">{k.symbol}</span>
                  <span>{p.text ?? p.category}</span>
                  <span className="sr-only">{p.text === null ? ` (empty block, ${k.word})` : ` (${k.word})`}</span>
                </button>
              </li>
            );
          })}
          <li>
            <button type="button" className="tile block block-add" aria-pressed={tray?.mode === 'add'} onClick={() => setTray(tray?.mode === 'add' ? null : { mode: 'add' })} data-testid="add-block">
              <span aria-hidden="true">+</span> Add a block
            </button>
          </li>
        </ul>

        {(tray || isEmpty(parts)) && (
        <div className="tray" data-testid="tray" aria-live="polite">
          {tray?.mode === 'add' && (
            <>
              <p className="tray-head">Add a block of…</p>
              <ul className="tray-list">
                {q.topics.map((cat) => {
                  const kind = kindOfCategory(cat, course.chunks);
                  return (
                    <li key={cat}>
                      <button type="button" className="tile" data-kind={kind} onClick={() => addCategory(cat)}>
                        <span className="tile-kind" aria-hidden="true">{KIND_LABEL[kind].symbol}</span> {cat}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
          {open && tray?.mode === 'chunks' && open.kind === 'block' && (
            <>
              <p className="tray-head">{open.text ? `Swap “${open.text}” for…` : 'Pick one…'}</p>
              {fits.length ? (
                <ul className="tray-list">
                  {fits.map((c) => (
                    <li key={c.spanish}>
                      <button type="button" className="tile" data-kind={kindOfCategory(c.category, course.chunks)} lang="es" onClick={() => pick(c.spanish)} data-testid="fit">
                        <span>{c.spanish}</span>
                        <small lang="en">{c.english}</small>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="heard-en">Nothing else fits here.</p>
              )}
              <div className="tray-actions">
                <button type="button" className="btn" onClick={() => setTray({ id: open.id, mode: 'glue' })}>Add a joining word after</button>
                {open.text && <button type="button" className="btn" onClick={takeOut}>Take out</button>}
              </div>
            </>
          )}
          {open && tray?.mode === 'glue' && (
            <>
              <p className="tray-head">{open.kind === 'glue' ? `Swap “${open.text}” for…` : 'Pick a joining word…'}</p>
              <ul className="tray-list">
                {glue.map((g) => (
                  <li key={g}>
                    <button type="button" className="tile" lang="es" onClick={() => useGlue(g)} data-testid="glue">{g}</button>
                  </li>
                ))}
              </ul>
              {open.kind === 'glue' && (
                <div className="tray-actions">
                  <button type="button" className="btn" onClick={takeOut}>Take out</button>
                </div>
              )}
            </>
          )}
          {!tray && isEmpty(parts) && (
            <div className="starter">
              <p className="heard-en">Tap a block to fill it in.</p>
              {starter ? (
                <button type="button" className="btn" onClick={useStarter} data-testid="starter">Give me a starter answer</button>
              ) : (
                <p className="heard-en" data-testid="no-starter">There is no starter answer for this question. Build it from the blocks.</p>
              )}
            </div>
          )}
        </div>
        )}
        {!tray && !isEmpty(parts) && (
          <>
            <p className="answer-text sr-only" lang="es" data-testid="answer-text">{text}</p>
            {noteDue && (
              <p className="heard-en" data-testid="load-note">
                A longer answer takes more learning. Taking blocks out is fine at any time.{' '}
                <button type="button" className="btn" onClick={() => setNoted((n) => new Set(n).add(q.id))}>Got it</button>
              </p>
            )}
            {nudge && !noteDue && (
              <p className="heard-en" data-testid="nudge">
                {nudge.text} For example: <span lang="es">{nudge.example}</span>{' '}
                <button type="button" className="btn" onClick={() => setDismissed((d) => new Set(d).add(q.id))}>No thanks</button>
              </p>
            )}
          </>
        )}
      </section>
      )}

      {offerShorter && (
        <p className="heard-en shorter" data-testid="shorter">
          Hard to remember? A shorter version is ready.{' '}
          <button type="button" className="btn" onClick={useShorter} data-testid="use-shorter">Use it</button>
        </p>
      )}
      {notice && <p className="heard-en" role="status" data-testid="notice">{notice}</p>}
      {view.outOfBank.length > 0 && (
        <p className="error">These words are not in your sentence builder: {view.outOfBank.join(', ')}. Take them out to confirm.</p>
      )}
      {error && <p className="error" role="alert">{error}</p>}
      <div className="write-actions">
        <button type="button" className="btn btn-primary" onClick={confirm} disabled={busy || isConfirmed || !view.canConfirm || !text.trim()} data-testid="confirm">
          {isConfirmed ? 'Confirmed' : 'Confirm this answer'}
        </button>
        {view.assessment.value > 0 && !analysing && (
          <button type="button" className="btn" onClick={() => setAnalysing(true)} data-testid="analyse">Why this value?</button>
        )}
        {all && <span className="heard-en" data-testid="all-confirmed">All five confirmed.</span>}
      </div>
      <p ref={live} className="sr-only" role="status" aria-live="polite" />
    </PracticeShell>
  );
}
