'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { automateStateFrom, type AttemptRow } from '../../../lib/automate/state';
import { FAKE_STUDENTS, isStudentKey, LAB_CHUNKS, STUDENT_KEYS, type StudentKey } from '../../../lib/lab/fake-students';
import { formatReport, LOG_KEY, NOTES_KEY, readJson, resetRound, rowsKey, TAGS, writeJson, type LogRow, type Note, type Stamp, type Tag } from '../../../lib/lab/notes';
import { Automate, type LabAttempt, type LabStage } from '../../phases/automate/Automate';
import '../../components/screens.css';

const SMALL = { fontSize: 14, padding: '4px 8px', minHeight: 0 } as const;

type Outcome = Pick<Stamp, 'responseMs' | 'accuracy' | 'assisted' | 'blank'>;
const NO_OUTCOME: Outcome = { responseMs: null, accuracy: null, assisted: null, blank: null };

const deviceLine = () => {
  const recogniser = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
  return `${navigator.userAgent} | browser listening: ${recogniser ? 'yes' : 'no'}`;
};

/**
 * The automate lab: the real timed round on a pre-written fake student, repeatable, with notes. Nothing is sent to the
 * server (no profile, no attempts, no coins, no audio); everything is kept on this device under `lab:` keys.
 * Real transcription is used, and it is paid for through the cost router.
 */
export function LabAutomate() {
  const [ready, setReady] = useState(false);
  const [student, setStudent] = useState<StudentKey>('short');
  const [run, setRun] = useState(0);
  const [setup, setSetup] = useState<{ startAt: number; expert: boolean }>({ startAt: 0, expert: false });
  const [stage, setStage] = useState<Omit<Stamp, 'student' | keyof Outcome>>({ stage: 'intro', position: null, level: null, windowMs: null });
  const [outcome, setOutcome] = useState<Outcome>(NO_OUTCOME);
  const [notes, setNotes] = useState<Note[]>([]);
  const [log, setLog] = useState<LogRow[]>([]);
  const [open, setOpen] = useState(false);
  const [frozen, setFrozen] = useState<Stamp | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [text, setText] = useState('');
  const [copied, setCopied] = useState<'no' | 'yes' | 'failed'>('no');
  const [report, setReport] = useState('');

  // The address only chooses setup; anything unknown is ignored.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const s = q.get('student');
    if (isStudentKey(s)) setStudent(s);
    const at = Number(q.get('startAt'));
    setSetup({ startAt: Number.isInteger(at) && at >= 0 && at <= 3 ? at : 0, expert: q.get('expert') === '1' });
    setNotes(readJson<Note[]>(NOTES_KEY, []));
    setLog(readJson<LogRow[]>(LOG_KEY, []));
    setReady(true);
  }, []);

  const fake = FAKE_STUDENTS[student];
  const ids = useMemo(() => fake.items.map((i) => i.id), [fake]);
  // Worked out from the lab's own attempts when the round is (re)started, never while it is running.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const initial = useMemo(() => automateStateFrom(ready ? readJson<AttemptRow[]>(rowsKey(student), []) : [], ids), [ready, student, run, ids]);

  const stamp = useCallback((): Stamp => ({ student, ...stage, ...outcome }), [student, stage, outcome]);

  const onStage = useCallback((s: LabStage) => {
    setStage({ stage: s.stage, position: s.position, level: s.level, windowMs: s.windowMs });
    if (s.stage === 'asking' || s.stage === 'intro') setOutcome(NO_OUTCOME);
  }, []);

  const onAttempt = useCallback((a: LabAttempt) => {
    setOutcome({ responseMs: a.responseMs, accuracy: a.accuracy, assisted: a.assisted, blank: a.blank });
    setLog((l) => {
      const next = [...l, { at: new Date().toISOString(), student, position: a.position, level: a.level, windowMs: a.windowMs, responseMs: a.responseMs, accuracy: a.accuracy, assisted: a.assisted, blank: a.blank }];
      writeJson(LOG_KEY, next);
      return next;
    });
  }, [student]);

  const lab = useMemo(() => ({ student, onAttempt, onStage, startAt: setup.startAt, expert: setup.expert }), [student, onAttempt, onStage, setup]);

  const pick = (key: StudentKey) => {
    setStudent(key);
    setRun((r) => r + 1);
    setStage({ stage: 'intro', position: null, level: null, windowMs: null });
    setOutcome(NO_OUTCOME);
  };

  const startAgain = () => {
    resetRound(student, ids);
    setRun((r) => r + 1);
    setStage({ stage: 'intro', position: null, level: null, windowMs: null });
    setOutcome(NO_OUTCOME);
  };

  const openNotes = () => {
    setFrozen(stamp());
    setCopied('no');
    setOpen(true);
  };

  const addNote = () => {
    if (!frozen || (!text.trim() && !tags.length)) return;
    const next = [...notes, { at: new Date().toISOString(), tags, text: text.trim(), stamp: frozen }];
    setNotes(next);
    writeJson(NOTES_KEY, next);
    setText('');
    setTags([]);
    setFrozen(stamp());
  };

  const makeReport = () => formatReport({ device: deviceLine(), student: fake.label, notes, log });
  const copy = async () => {
    const out = makeReport();
    setReport(out);
    try {
      await navigator.clipboard.writeText(out);
      setCopied('yes');
    } catch {
      setCopied('failed');
    }
  };
  const clearNotes = () => { setNotes([]); writeJson(NOTES_KEY, []); setReport(''); };
  const clearLog = () => { setLog([]); writeJson(LOG_KEY, []); setReport(''); };

  if (!ready) return <main className="screen" />;

  return (
    <>
      <header style={{ padding: '56px 10px 6px', borderBottom: '1px solid currentColor', display: 'grid', gap: 6 }} data-testid="lab-bar">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <strong>Automate lab</strong>
          <button type="button" className="btn btn-primary" onClick={openNotes} data-testid="notes-open" style={SMALL}>Notes ({notes.length})</button>
        </div>
        <div role="radiogroup" aria-label="Fake student" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {STUDENT_KEYS.map((k) => (
            <button key={k} type="button" role="radio" aria-checked={k === student} className={k === student ? 'btn btn-primary' : 'btn'} onClick={() => pick(k)} data-testid={`student-${k}`} style={SMALL}>
              {FAKE_STUDENTS[k].label}
            </button>
          ))}
          <button type="button" className="btn" onClick={startAgain} data-testid="start-again" style={SMALL}>Start again</button>
        </div>
        <p className="muted" style={{ margin: 0, fontSize: 13 }}>Nothing is saved to the server. Real transcription is used and paid for through the cost router.</p>
        <details>
          <summary className="muted">{fake.label}</summary>
          <p className="muted" style={{ margin: '4px 0 0' }}>{fake.blurb}</p>
        </details>
      </header>

      <Automate key={`${student}-${run}`} items={fake.items} chunks={LAB_CHUNKS} initial={initial} lab={lab} />

      {open && (
        <section role="dialog" aria-label="Notes" data-testid="notes-panel" className="stack"
          style={{ position: 'fixed', left: 0, right: 0, bottom: 0, maxHeight: '70dvh', overflow: 'auto', zIndex: 30, padding: 12, background: 'Canvas', color: 'CanvasText', borderTop: '2px solid currentColor' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
            <strong>Notes</strong>
            <button type="button" className="btn" onClick={() => setOpen(false)} data-testid="notes-close">Close</button>
          </div>
          <p className="muted" data-testid="notes-stamp" style={{ margin: 0 }}>
            About: {frozen?.position ? `question ${frozen.position}` : 'no question yet'}
            {frozen?.level ? `, ${frozen.level.toLowerCase()}` : ''}
            {frozen?.windowMs ? `, window ${(frozen.windowMs / 1000).toFixed(1)}s` : ''}
            {frozen?.responseMs !== null && frozen?.responseMs !== undefined ? `, response ${(frozen.responseMs / 1000).toFixed(1)}s` : ''}
            {frozen?.accuracy !== null && frozen?.accuracy !== undefined ? `, accuracy ${frozen.accuracy}%` : ''}
          </p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {TAGS.map((t) => (
              <button key={t} type="button" aria-pressed={tags.includes(t)} className={tags.includes(t) ? 'btn btn-primary' : 'btn'} onClick={() => setTags((x) => (x.includes(t) ? x.filter((y) => y !== t) : [...x, t]))}>{t}</button>
            ))}
          </div>
          <label className="stack">
            <span>What did you notice?</span>
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} data-testid="note-text" />
          </label>
          <button type="button" className="btn btn-primary" onClick={addNote} data-testid="note-add">Add note</button>

          <p data-testid="log-count" className="muted" style={{ margin: 0 }}>{notes.length} {notes.length === 1 ? 'note' : 'notes'}, {log.length} {log.length === 1 ? 'attempt' : 'attempts'} logged on this device.</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-primary" onClick={() => void copy()} data-testid="notes-copy">Copy notes</button>
            <button type="button" className="btn" onClick={clearNotes} data-testid="notes-clear">Clear notes</button>
            <button type="button" className="btn" onClick={clearLog} data-testid="log-clear">Clear attempt log</button>
          </div>
          {copied === 'yes' && <p role="status" data-testid="copied">Copied. Paste it into the chat.</p>}
          {copied === 'failed' && <p role="status" data-testid="copy-failed">Could not copy. Select the text below and copy it.</p>}
          {report && <textarea readOnly rows={10} value={report} data-testid="report-text" aria-label="The notes as text" />}
        </section>
      )}
    </>
  );
}
