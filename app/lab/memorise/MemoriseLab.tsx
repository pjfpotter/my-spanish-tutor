'use client';

import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import {
  advance, describe, finish, freshState, isWhole, lessonName, lessonsOf, mixReady, newSession, nextFor, outcomeOf, plan, recommended,
  resolveSay, resolveTap, shuffle, stepState, total,
  type Feedback, type Finish, type Lesson, type SayOutcome, type SayStep, type Session, type Step, type TapStep, type World,
} from '../../../lib/memorise/ladder';
import { SOUND_KEY, soundOn } from '../../../lib/practice/sound';
import { liveMatch, type LiveMatch } from '../../../lib/speech/live-match';
import { LATENCY_BUDGET, LatencyLog, budgetVerdict, deviceReport } from '../../../lib/speech/latency';
import { listenCall } from '../../../lib/speech/pause';
import { clipUrls, findClip } from '../../../lib/tele/clips';
import type { Feelings } from '../../../lib/tele/feelings';
import { Tele } from '../../components/Tele';
import { useLiveSpeech } from '../../components/useLiveSpeech';
import { useSfx } from '../../components/useSfx';
import { useWakeLock } from '../../components/useWakeLock';
import { LAB_ANSWERS, TELE } from './content';
import './lab.css';

const KEY = 'memorise-lab-v1';
const A = LAB_ANSWERS;
type Line = readonly [string, string];
type Mode = 'full' | 'letters' | 'blank' | 'ghost';
/** A screen the student speaks to, or one they tap. */
type Kind = 'speak' | 'tap';

/**
 * Tells the two kinds of screen apart without words (task 27.10), and without interrupting anything: a quiet badge
 * beside the instruction. A round microphone for speaking. For tapping, a square badge with a mouse pointer where
 * the device has a mouse and a pointing hand where it is touched, chosen in CSS by the device's main pointer.
 * Shape and picture carry it, never colour alone.
 */
function KindBadge({ kind }: { kind: Kind }) {
  const stroke = { fill: 'none', stroke: 'currentColor', strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
  return (
    <span className="ml-kind" data-kind={kind} data-testid="lab-kind" role="img" aria-label={kind === 'speak' ? 'Speaking screen' : 'Tapping screen'}>
      {kind === 'speak' ? (
        <svg viewBox="0 0 24 24" width="100%" height="100%" focusable="false">
          <rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor" />
          <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7" strokeWidth="2" {...stroke} />
        </svg>
      ) : (
        <>
          <svg className="ml-ptr" viewBox="0 0 24 24" width="100%" height="100%" focusable="false">
            <path d="M6 3l12 9.5-5.2 1 3 5.8-2.6 1.3-3-5.8L6 18z" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" />
          </svg>
          <svg className="ml-hand" viewBox="0 0 24 24" width="100%" height="100%" focusable="false">
            <path d="M9 11.5V5.2a1.7 1.7 0 0 1 3.4 0v5.3m0 0a1.5 1.5 0 0 1 3 .2m0 0a1.5 1.5 0 0 1 3 .6v4.2a5.5 5.5 0 0 1-5.5 5.5h-1.1a5.5 5.5 0 0 1-4.3-2.1l-3-3.8a1.5 1.5 0 0 1 2.3-1.9L9 14.5" strokeWidth="1.8" {...stroke} />
          </svg>
        </>
      )}
    </span>
  );
}

interface Ui {
  phase: 'cue' | 'listening' | 'ready' | 'mark' | 'pick' | 'result';
  /** Words lit so far, for the chunks of this screen. */
  match: LiveMatch | null;
  helped: boolean;
  /** Words shown by a hint or a peek, as "chunk:word" within this screen. */
  shown: Set<string>;
  /** The student has paused: a hint and a way to move on are on offer. */
  offer: boolean;
  /** The last few words the recogniser heard, shown as they arrive. */
  heard: string;
  fb: Feedback | null;
  line: Line | null;
  showQ: boolean;
  blocks: boolean;
  note: string;
  opts: string[];
  right: string;
  picked: number | null;
  built: number[];
  pool: number[];
  wrong: number | null;
  errors: number;
  startedAt: number;
  lastProgressAt: number | null;
  lastVoiceAt: number | null;
  /** Which kind of screen this is. */
  kind: Kind;
  /** The whole transcript last drawn, so a repeated interim result costs nothing. */
  raw: string;
}
const newUi = (): Ui => ({ phase: 'cue', match: null, helped: false, shown: new Set(), offer: false, heard: '', fb: null, line: null, showQ: false, blocks: false, note: '', opts: [], right: '', picked: null, built: [], pool: [], wrong: null, errors: 0, startedAt: 0, lastProgressAt: null, lastVoiceAt: null, kind: 'speak', raw: '' });

const freshWorld = (): World => ({ answers: A, day: 1, euros: 0, states: A.map(freshState) });
const pick = <T,>(list: readonly T[]): T => list[Math.floor(Math.random() * list.length)];
const mins = (w: World, L: Lesson) => { const n = plan(w, L).length; return n <= 4 ? 'about 1 min' : `about ${Math.max(2, Math.round((n * 12) / 60))} min`; };
const readSound = () => { try { return soundOn(localStorage.getItem(SOUND_KEY)); } catch { return true; } };
const isPhone = () => typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
const JOY: Feelings = { joy: 0.8 };
const SAD: Feelings = { sadness: 0.4 };

/** Tele's voice for the lab: a built clip when there is one, otherwise the device's Spanish voice, otherwise a short wait. */
function useVoice() {
  const [speaking, setSpeaking] = useState(false);
  const token = useRef(0);
  const audio = useRef<HTMLAudioElement | null>(null);
  const stop = useCallback(() => {
    token.current++;
    audio.current?.pause();
    audio.current = null;
    try { window.speechSynthesis?.cancel(); } catch { /* no voice on this device */ }
    setSpeaking(false);
  }, []);
  const speak = useCallback(async (text: string, slow = false) => {
    stop();
    const mine = token.current;
    if (!readSound()) return;
    setSpeaking(true);
    try {
      const slot = findClip(text, slow ? 0.7 : 1);
      if (slot) {
        await new Promise<void>((res) => {
          const a = new Audio(clipUrls(slot).audio);
          audio.current = a;
          a.onended = a.onerror = a.onpause = () => res();
          void a.play().catch(() => res());
        });
        return;
      }
      const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined;
      if (synth && typeof SpeechSynthesisUtterance !== 'undefined') {
        await new Promise<void>((res) => {
          const u = new SpeechSynthesisUtterance(text);
          u.lang = 'es-ES';
          const v = synth.getVoices().find((x) => /^es[-_]ES/i.test(x.lang)) ?? synth.getVoices().find((x) => /^es/i.test(x.lang));
          if (v) u.voice = v;
          u.rate = slow ? 0.6 : 0.9;
          u.onend = u.onerror = () => res();
          synth.speak(u);
          setTimeout(res, 2500 + text.length * 130);
        });
        return;
      }
      await new Promise((res) => setTimeout(res, 400 + text.length * 40));
    } finally {
      if (mine === token.current) setSpeaking(false);
    }
  }, [stop]);
  useEffect(() => stop, [stop]);
  return { speak, stop, speaking, current: () => token.current };
}

/**
 * The memorise ladder with live listening (lab). Whenever the microphone is open the screen shows it is hearing:
 * a level meter moves with the voice, words light as they are understood, and the screen moves on by itself when
 * the answer has been said. A pause is met with the offer of a hint, never a clock. Open at /lab/memorise.
 */
export function MemoriseLab() {
  const [, bump] = useReducer((n: number) => n + 1, 0);
  const world = useRef<World>(freshWorld());
  const ses = useRef<Session | null>(null);
  const ui = useRef<Ui>(newUi());
  const [view, setView] = useState<'home' | 'lesson' | 'done'>('home');
  const [sel, setSel] = useState<number | null>(null);
  const [selfMark, setSelfMark] = useState(false);
  const [meter, setMeter] = useState(false);
  const [ready, setReady] = useState(false);
  const done = useRef<{ L: Lesson; end: Finish; said: number; earned: number } | null>(null);
  const meterEl = useRef<HTMLDivElement | null>(null);
  const hearTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const autoTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const fallback = useRef(false);
  const lat = useRef(new LatencyLog());
  const speechStartAt = useRef<number | null>(null);
  const lastResultAt = useRef<number | null>(null);
  const [report, setReport] = useState('');
  const sfx = useSfx();
  const voice = useVoice();
  const w = world.current;

  // ---- Saved progress: this browser only ---------------------------------------------------------------
  const save = useCallback((extra: { selfMark?: boolean; meter?: boolean } = {}) => {
    try {
      const old = JSON.parse(localStorage.getItem(KEY) ?? '{}');
      localStorage.setItem(KEY, JSON.stringify({ ...old, day: world.current.day, euros: world.current.euros, states: world.current.states, ...extra }));
    } catch { /* storage is a convenience only */ }
  }, []);
  useEffect(() => {
    let m = !isPhone();
    try {
      const j = JSON.parse(localStorage.getItem(KEY) ?? 'null');
      if (j?.states?.length === A.length) world.current = { answers: A, day: j.day ?? 1, euros: j.euros ?? 0, states: j.states };
      if (typeof j?.selfMark === 'boolean') setSelfMark(j.selfMark);
      if (typeof j?.meter === 'boolean') m = j.meter;
    } catch { /* start fresh */ }
    setMeter(m);
    setReady(true);
  }, []);

  // ---- Live listening -----------------------------------------------------------------------------------
  const spanChunks = (s: SayStep) => s.span.map((i) => A[s.a].chunks[i].t);
  const live = useLiveSpeech({
    onTranscript: (text) => {
      const u = ui.current;
      const s = ses.current?.cur;
      if (u.phase !== 'listening' || !s || s.t !== 'say') return;
      const t0 = performance.now();
      if (lastResultAt.current !== null) lat.current.add('gap', t0 - lastResultAt.current);
      lastResultAt.current = t0;
      const before = u.match?.matched ?? 0;
      const heard = text.split(/\s+/).slice(-6).join(' ');
      // Interim results often repeat. If nothing the student can see has changed, there is nothing to draw.
      if (text === u.raw && u.match) return;
      u.raw = text;
      const m = liveMatch(spanChunks(s), text, u.match);
      const lit = m.matched > before;
      if (lit) {
        u.lastProgressAt = t0;
        u.offer = false;
        if (before === 0 && speechStartAt.current !== null) lat.current.add('first-word', t0 - speechStartAt.current);
      }
      u.match = m;
      u.heard = heard;
      bump();
      if (lit) requestAnimationFrame(() => setTimeout(() => lat.current.add('paint', performance.now() - t0), 0));
    },
    onSpeechStart: () => { if (speechStartAt.current === null) speechStartAt.current = performance.now(); },
    onResume: () => {
      // Back from a lock: the student has been away, so the pause clock starts again and no hint is pushed at them.
      const u = ui.current;
      if (u.phase !== 'listening') return;
      u.lastProgressAt = performance.now();
      u.offer = false;
      bump();
    },
    onLevel: (level) => meterEl.current?.style.setProperty('--lvl', String(Math.min(1, level * 5))),
    onVoice: () => {
      ui.current.lastVoiceAt = performance.now();
      const el = meterEl.current;
      if (!el) return;
      el.dataset.hearing = '1';
      clearTimeout(hearTimer.current);
      hearTimer.current = setTimeout(() => { if (meterEl.current) delete meterEl.current.dataset.hearing; }, 450);
    },
  }, { meter });
  const liveOn = live.supported && !selfMark && !fallback.current;
  // A phone that locks mid-lesson takes the microphone, so keep the screen awake while a lesson listens.
  const awake = useWakeLock(view === 'lesson' && liveOn);

  const tele = (key: Feedback['tele']): Line => pick(TELE[key] as readonly Line[]);

  function applySay(o: SayOutcome) {
    const s = ses.current!;
    const step = s.cur as SayStep;
    live.stop();
    const fb = resolveSay(w, s, o);
    const u = ui.current;
    u.phase = 'result';
    u.fb = fb;
    u.line = tele(fb.tele);
    sfx(fb.tele === 'up' ? 'combo' : !fb.ok ? 'miss' : step.r === 5 && o.kind === 'clean' ? 'personal-best' : 'correct');
    if (fb.tele === 'miss' || fb.tele === 'top') void voice.speak(u.line[0]);
    save();
    bump();
    if (fb.auto) autoTimer.current = setTimeout(() => { if (ui.current === u) nextStep(); }, fb.auto);
  }
  function conclude() {
    const s = ses.current?.cur;
    const u = ui.current;
    if (!s || s.t !== 'say' || u.phase !== 'listening') return;
    const m = u.match ?? liveMatch(spanChunks(s), '');
    applySay(outcomeOf(s.span, m.said, u.helped));
  }
  // While listening: move on when it has all been said, offer a hint after a pause. Never a time limit.
  const listening = view === 'lesson' && ui.current.phase === 'listening';
  useEffect(() => {
    if (!listening) return;
    const t = setInterval(() => {
      const u = ui.current;
      if (u.phase !== 'listening') return;
      const call = listenCall({ now: performance.now(), startedAt: u.startedAt, lastProgressAt: u.lastProgressAt, lastVoiceAt: u.lastVoiceAt, complete: !!u.match?.complete, reachedEnd: !!u.match?.reachedEnd });
      if (call.kind === 'finish') conclude();
      else if (call.kind === 'offer' && !u.offer) { u.offer = true; bump(); }
    }, 150);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listening]);
  // The microphone was refused or could not be reached: nothing is marked, and the student marks themselves instead.
  useEffect(() => {
    if (!['denied', 'unavailable', 'unsupported'].includes(live.state) || view !== 'lesson') return;
    fallback.current = true;
    const u = ui.current;
    if (u.phase === 'listening' || u.phase === 'cue') {
      u.phase = 'ready';
      u.note = live.state === 'denied' ? 'The microphone is off, so check your answer yourself.' : 'Tele cannot listen on this device right now, so check your answer yourself.';
      bump();
    }
  }, [live.state, view]);

  function beginListening() {
    const u = ui.current;
    u.phase = 'listening';
    u.offer = false;
    u.startedAt = performance.now();
    u.lastProgressAt = null;
    u.lastVoiceAt = null;
    speechStartAt.current = null;
    lastResultAt.current = null;
    live.start();
    bump();
  }

  // ---- Moving through a lesson --------------------------------------------------------------------------
  function cueText(step: Step): { text: string; clip: boolean } | null {
    const a = A[step.a];
    if (step.t === 'say') {
      if (step.r === 1 && !step.read) return { text: spanChunks(step).join(' '), clip: false };
      if (isWhole(w, step)) return { text: a.q, clip: true };
      return null;
    }
    if (step.t === 'meaning') return { text: a.chunks[step.i ?? 0].t, clip: false };
    if (step.t === 'start') return { text: a.q, clip: true };
    return null;
  }
  async function playCue(step: Step, slow = false) {
    const c = cueText(step);
    if (c) await voice.speak(c.text, slow);
  }
  function nextStep() {
    clearTimeout(autoTimer.current);
    voice.stop();
    live.stop();
    const s = ses.current!;
    const step = advance(s);
    if (!step) return endLesson();
    const u = (ui.current = newUi());
    u.kind = step.t === 'say' ? 'speak' : 'tap';
    const a = A[step.a];
    if (step.t === 'meaning' || step.t === 'next' || step.t === 'start') {
      const i = step.i ?? 0;
      const all = A.flatMap((x) => x.chunks);
      const own = step.t === 'meaning' ? a.chunks.filter((_, k) => k !== i).map((c) => c.en) : step.t === 'next' ? a.chunks.filter((_, k) => k !== i && k !== i + 1).map((c) => c.t) : A.filter((x) => x !== a).map((x) => x.chunks[0].t);
      u.right = step.t === 'meaning' ? a.chunks[i].en : step.t === 'next' ? a.chunks[i + 1].t : a.chunks[0].t;
      let wrong = shuffle(own.filter((x) => x !== u.right), Math.random);
      if (wrong.length < 2) wrong = wrong.concat(shuffle(all.map((c) => (step.t === 'meaning' ? c.en : c.t)).filter((x) => x !== u.right && !wrong.includes(x)), Math.random));
      u.opts = shuffle([u.right, ...wrong.slice(0, 2)], Math.random);
    }
    if (step.t === 'order') {
      u.pool = shuffle(a.chunks.map((_, k) => k), Math.random);
      if (u.pool[0] === 0 && u.pool.length > 1) u.pool.push(u.pool.shift()!);
    }
    if (step.t !== 'say' || !liveOn) {
      u.phase = 'ready';
      bump();
      void playCue(step);
      return;
    }
    bump();
    // Tele speaks first, then the microphone opens, so Tele's own voice is never taken for the student's.
    void playCue(step).then(() => { if (ui.current === u && u.phase === 'cue') beginListening(); });
  }
  function startLesson(L: Lesson) {
    fallback.current = false;
    ses.current = newSession(w, L);
    setView('lesson');
    nextStep();
  }
  function endLesson() {
    const s = ses.current!;
    const end = finish(w, s);
    done.current = { L: s.lesson, end, said: s.said, earned: s.earned };
    ses.current = null;
    live.stop();
    live.release();
    setSel(null);
    save();
    sfx('section-complete');
    setView('done');
  }
  function goHome() {
    clearTimeout(autoTimer.current);
    voice.stop();
    live.stop();
    live.release();
    ses.current = null;
    setView('home');
  }

  // ---- Things the student can do on a spoken screen -----------------------------------------------------
  function hint() {
    const u = ui.current;
    const s = ses.current?.cur;
    if (!s || s.t !== 'say') return;
    u.offer = false;
    u.lastProgressAt = performance.now();
    if (s.r === 1 && !s.read) {
      // The words are already there, so the hint is hearing it again.
      live.stop();
      u.phase = 'cue';
      bump();
      void playCue(s, true).then(() => { if (ui.current === u && u.phase === 'cue') beginListening(); });
      return;
    }
    u.helped = true;
    const next = (u.match ?? liveMatch(spanChunks(s), '')).next;
    if (next) u.shown.add(`${next.chunk}:${next.word}`);
    bump();
  }
  function peek(c: number) {
    const u = ui.current;
    const s = ses.current?.cur;
    if (!s || s.t !== 'say' || (u.phase !== 'listening' && u.phase !== 'ready')) return;
    u.helped = true;
    u.lastProgressAt = performance.now();
    const keys = A[s.a].chunks[s.span[c]].t.split(' ').map((_, i) => `${c}:${i}`);
    keys.forEach((k) => u.shown.add(k));
    bump();
    setTimeout(() => { if (ui.current === u && u.phase !== 'result') { keys.forEach((k) => u.shown.delete(k)); bump(); } }, 1600);
  }
  function hearAgain(slow = false) {
    const u = ui.current;
    const s = ses.current?.cur;
    if (!s) return;
    if (u.phase !== 'listening') return void playCue(s, slow);
    live.stop();
    u.phase = 'cue';
    bump();
    void playCue(s, slow).then(() => { if (ui.current === u && u.phase === 'cue') beginListening(); });
  }
  function said() {
    const s = ses.current!.cur as SayStep;
    voice.stop();
    if (s.r === 1) return applySay({ kind: 'clean' });
    ui.current.phase = 'mark';
    bump();
  }
  function tapAnswer(k: number) {
    const u = ui.current;
    if (u.phase !== 'ready') return;
    u.picked = k;
    finishTap(u.opts[k] === u.right);
  }
  function finishTap(right: boolean, body?: string) {
    const u = ui.current;
    const fb = resolveTap(ses.current!, right, u.right);
    if (body) fb.body = body;
    u.phase = 'result';
    u.fb = fb;
    u.line = tele(fb.tele);
    sfx(right ? 'correct' : 'miss');
    bump();
    if (fb.auto) autoTimer.current = setTimeout(() => { if (ui.current === u) nextStep(); }, fb.auto);
  }
  function tapOrder(i: number) {
    const u = ui.current;
    const step = ses.current!.cur as TapStep;
    if (u.phase !== 'ready') return;
    if (i === u.built.length) {
      u.built.push(i);
      sfx('tap');
      if (u.built.length === A[step.a].chunks.length) return finishTap(true, u.errors ? undefined : 'In order, first time.');
    } else {
      u.errors++;
      u.wrong = i;
      setTimeout(() => { if (ui.current === u) { u.wrong = null; bump(); } }, 300);
    }
    bump();
  }
  useEffect(() => () => { clearTimeout(autoTimer.current); clearTimeout(hearTimer.current); }, []);

  // ---- Rendering ----------------------------------------------------------------------------------------
  const teleRow = (line: Line, feelings: Feelings | undefined, again?: () => void, question = false) => (
    <div className="ml-telerow">
      <div className="ml-tele"><Tele feelings={feelings} speaking={voice.speaking} loudness={voice.speaking ? 0.6 : 0} question={question} /></div>
      <div className="ml-bubble ml-paper" aria-live="polite">
        <p className="ml-es" lang="es">{line[0]}</p>
        {line[1] && <p className="ml-en">{line[1]}</p>}
        {again && <button type="button" className="ml-btn ml-again" onClick={again} aria-label="Hear it again">♪</button>}
      </div>
    </div>
  );
  const pips = (ai: number) => {
    const Ls = lessonsOf(A, ai);
    const n = Ls.filter((_, i) => stepState(w, ai, i) === 'done').length;
    return <span className="ml-pips" role="img" aria-label={`${n} of ${Ls.length} steps done`}>{Ls.map((_, i) => <i key={i} data-s={stepState(w, ai, i)} />)}</span>;
  };

  if (!ready) return <main className="ml" />;

  if (view === 'home') {
    const rec = recommended(w);
    const ai = sel ?? rec?.a ?? 0;
    const a = A[ai];
    const st = w.states[ai];
    const Ls = lessonsOf(A, ai);
    const L = nextFor(w, ai);
    const memo = w.states.filter((s) => s.memorised).length;
    const started = w.states.some((s) => s.stage > 0 || s.top > 0);
    const line = (memo === A.length ? TELE.all : rec?.type === 'lock' ? TELE.morning : !rec ? TELE.rest : started ? TELE.back : TELE.hello) as Line;
    return (
      <main className="ml ml-home" data-testid="lab-home">
        <div className="ml-titlebar"><span>Memorizar.exe</span><span className="ml-when">{Math.max(0, 9 - w.day)} days to the test</span></div>
        {teleRow(line, undefined)}
        <section className="ml-paper ml-today" aria-label="Up next">
          <p className="ml-which"><span>Answer {a.n} of {A.length}</span><span className="ml-euros" aria-label={`${w.euros} euros`}>€{w.euros}</span></p>
          <div><h1 lang="es">{a.q}</h1><p className="ml-en">{a.qen}</p></div>
          {L ? (
            <>
              <p>{pips(ai)} Step {st.stage + 1} of {Ls.length}</p>
              <button type="button" className="ml-btn ml-primary ml-big" onClick={() => startLesson(L)} data-testid="lab-start">{lessonName(A, L)}<small>Start, {mins(w, L)}</small></button>
              {st.stage === 0 && st.top === 0 && <button type="button" className="ml-link" onClick={() => startLesson({ type: 'probe', a: ai })}>I already know this one</button>}
            </>
          ) : st.memorised ? (
            <p>{pips(ai)} <strong>Memorised.</strong> Pick another answer below.</p>
          ) : (
            <>
              <p>{pips(ai)} The last step opens <strong>tomorrow</strong>. A night&apos;s sleep is part of learning it.</p>
              {rec && <button type="button" className="ml-btn ml-primary ml-big" onClick={() => setSel(rec.a ?? 0)}>Go to answer {A[rec.a ?? 0].n}<small>{lessonName(A, rec)}</small></button>}
            </>
          )}
        </section>
        <div className="ml-listhead"><h2>Your five answers</h2><span>{memo} memorised</span></div>
        <ol className="ml-list">
          {A.map((x, i) => (
            <li key={x.n}>
              <button type="button" className="ml-row" aria-pressed={i === ai} onClick={() => setSel(i)}>
                <span className="ml-n">{x.n}</span><span lang="es">{x.q}</span>{w.states[i].memorised ? <strong>✓ done</strong> : pips(i)}
              </button>
            </li>
          ))}
          {mixReady(w) && (
            <li><button type="button" className="ml-row" onClick={() => startLesson({ type: 'mix', a: null })}><span className="ml-n">?</span><span><strong>Mix-up.</strong> Tele asks any question you know.</span><strong>Start</strong></button></li>
          )}
        </ol>
        <details className="ml-tools">
          <summary>Tester tools</summary>
          <div className="ml-toolbody">
            <p>{live.supported ? 'This browser can listen as you speak.' : 'This browser has no built-in listening, so you check your own answers here. Chrome and Safari have it.'}</p>
            <label><input type="checkbox" checked={selfMark} onChange={(e) => { setSelfMark(e.target.checked); save({ selfMark: e.target.checked }); }} /> Check my own answers (no microphone)</label>
            <label><input type="checkbox" checked={meter} onChange={(e) => { setMeter(e.target.checked); save({ meter: e.target.checked }); }} /> Voice level meter (turn off if words stop lighting up)</label>
            <div className="ml-rowbtns">
              <button type="button" className="ml-btn ml-small" onClick={() => { w.day++; setSel(null); save(); bump(); }}>Skip to tomorrow (now day {w.day})</button>
              <button type="button" className="ml-btn ml-small" onClick={() => { world.current = freshWorld(); setSel(null); save(); bump(); }}>Start over</button>
            </div>
            <p>How well this phone keeps up, from the lessons you have just done:</p>
            <div className="ml-rowbtns">
              <button type="button" className="ml-btn ml-small" data-testid="lab-report" onClick={() => {
                const text = deviceReport({ userAgent: navigator.userAgent, recogniser: live.supported, meterOn: live.meterOn, wakeLock: awake.supported, wakeLockHeld: awake.held }, live.stats.current, lat.current);
                setReport(text);
                void navigator.clipboard?.writeText(text).catch(() => {});
              }}>Show and copy the device report</button>
              <button type="button" className="ml-btn ml-small" onClick={() => { lat.current.reset(); setReport(''); }}>Clear timings</button>
            </div>
            {report && <pre className="ml-report" data-testid="lab-report-text">{report}</pre>}
            <p className="ml-en">Budget: a lit word on screen within {LATENCY_BUDGET.paintP90Ms} ms of the result in 9 of 10 tries, and the first word lit within {LATENCY_BUDGET.firstWordMedianMs / 1000} s of starting to speak. Measured so far: result to screen {budgetVerdict(lat.current).paint}, first word {budgetVerdict(lat.current).firstWord}.</p>
            <p>Jump to a step of answer {a.n}:</p>
            <div className="ml-rowbtns">{Ls.map((x, i) => <button key={i} type="button" className="ml-btn ml-small" onClick={() => startLesson(x)}>{lessonName(A, x)}</button>)}</div>
          </div>
        </details>
      </main>
    );
  }

  if (view === 'done' && done.current) {
    const d = done.current;
    const ai = d.L.a;
    const same = ai !== null ? nextFor(w, ai) : null;
    const next = same ?? recommended(w);
    return (
      <main className="ml ml-done" data-testid="lab-done">
        <p className="ml-shout" data-testid="lab-shout">{d.end.shout}</p>
        {teleRow(TELE.end[d.end.tele] as Line, JOY)}
        <section className="ml-paper ml-sum">
          <p>{d.end.line}</p>
          {ai !== null && (
            <>
              <p className="ml-q" lang="es">{A[ai].q}</p>
              <ol className="ml-steps">
                {lessonsOf(A, ai).map((x, i) => {
                  const s = stepState(w, ai, i);
                  return <li key={i} data-s={s}><span className="ml-ic" aria-hidden="true">{s === 'done' ? '✓' : i + 1}</span><span>{lessonName(A, x)}</span><small>{s === 'done' ? 'done' : s === 'now' ? 'next' : s === 'wait' ? 'opens tomorrow' : ''}</small></li>;
                })}
              </ol>
            </>
          )}
          <p className="ml-earned"><strong>+€{d.earned}</strong> for saying it out loud {d.said} {d.said === 1 ? 'time' : 'times'}.</p>
        </section>
        {next && <button type="button" className="ml-btn ml-primary ml-big" onClick={() => startLesson(next)} data-testid="lab-next">{same ? 'Keep going' : `Next: answer ${A[next.a ?? 0].n}`}<small>{lessonName(A, next)}, {mins(w, next)}</small></button>}
        <button type="button" className="ml-btn" onClick={goHome}>{next ? 'Stop here' : 'Back to my answers'}</button>
      </main>
    );
  }

  // ---- A lesson screen: one instruction, Tele, one card, one dock ---------------------------------------
  const s = ses.current;
  const step = s?.cur;
  if (!s || !step) return <main className="ml" />;
  const u = ui.current;
  const a = A[step.a];
  const T = total(s);
  const res = u.phase === 'result';
  const fb = u.fb;
  const sayStep = step.t === 'say' ? step : null;
  const vr = sayStep ? (u.blocks ? 3 : sayStep.r) : 0;
  const reveal = !!sayStep && (u.phase === 'mark' || u.phase === 'pick' || res);
  const whole = !!sayStep && isWhole(w, sayStep);
  const title = step.t === 'meaning' ? 'What does this mean?' : step.t === 'next' ? 'What comes next?' : step.t === 'start' ? 'How does your answer start?' : step.t === 'order' ? 'Tap your answer into order'
    : sayStep!.r === 1 ? (sayStep!.read ? 'Now say it without Tele' : sayStep!.span.length > 2 ? 'Listen to all of it, then say it' : 'Listen, then say it out loud')
    : vr === 2 ? 'Say it from the first letters' : vr === 3 ? 'Say it. The letters are gone' : vr === 4 ? 'Say it in Spanish' : 'Tele asks. You answer';
  const tag = step.tag === 'fix' ? 'Fixing one bit' : step.tag === 'again' ? 'Second go' : sayStep?.cold ? 'First go today' : '';
  let line: Line;
  if (res && u.line) line = u.line;
  else if (sayStep) line = sayStep.r === 1 && !sayStep.read ? TELE.echo : whole ? (sayStep.r === 5 && !u.showQ ? ['¿ … ?', ''] : [a.q, sayStep.r === 5 ? '' : a.qen]) : TELE.now;
  else line = step.t === 'start' ? [a.q, ''] : TELE[step.t as 'meaning' | 'next' | 'order'];
  const mode: Mode = reveal || vr <= 1 ? 'full' : vr === 2 ? 'letters' : vr === 3 ? 'blank' : 'ghost';
  const few = !!sayStep && sayStep.span.length <= 2;
  const spanEn = sayStep ? (whole ? a.en : sayStep.span.map((i) => a.chunks[i].en).join(' ')) : '';

  const tile = (ci: number, c: number, m: Mode, o: { onClick?: () => void; small?: boolean; miss?: boolean; wrong?: boolean; en?: boolean; key?: string } = {}) => {
    const chunk = a.chunks[ci];
    const words = chunk.t.split(' ');
    const lit = (k: number) => !!sayStep && u.match?.hit[c]?.[k] === true;
    const visible = m !== 'ghost' || words.some((_, k) => lit(k) || u.shown.has(`${c}:${k}`));
    if (!visible) return null;
    const body = words.map((word, k) => {
      const parts = word.match(/^(.+?)([.,]*)$/)!;
      const state = lit(k) ? 'lit' : m === 'full' || u.shown.has(`${c}:${k}`) ? 'plain' : m;
      return (
        <span key={k} className="ml-w" data-s={state} data-testid="lab-word">
          {state === 'lit' || state === 'plain' ? word : state === 'ghost' ? '' : <>{state === 'letters' ? parts[1][0] : ''}<i style={{ ['--n' as string]: state === 'letters' ? parts[1].length - 1 : parts[1].length }} />{parts[2]}</>}
          {' '}
        </span>
      );
    });
    const cls = `ml-tile${o.small ? ' ml-sm' : ''}`;
    const inner = <><span lang="es">{body}</span>{o.en && <span className="ml-ten">{chunk.en}</span>}</>;
    return (
      <li key={o.key ?? ci}>
        {o.onClick
          ? <button type="button" className={cls} data-k={chunk.k} data-miss={o.miss || undefined} data-wrong={o.wrong || undefined} onClick={o.onClick}>{inner}</button>
          : <span className={cls} data-k={chunk.k} data-miss={o.miss || undefined}>{inner}</span>}
      </li>
    );
  };

  let card: React.ReactNode;
  if (sayStep) {
    const tiles = sayStep.span.map((ci, c) => tile(ci, c, mode, {
      small: sayStep.span.length > 3,
      en: few,
      miss: res && fb?.missed === ci,
      onClick: u.phase === 'pick' ? () => applySay({ kind: 'miss', m: ci }) : !reveal && (mode === 'letters' || mode === 'blank') ? () => peek(c) : undefined,
    }));
    const any = tiles.some(Boolean);
    card = (
      <div className={`ml-paper ml-work${sayStep.span.length > 4 ? ' ml-tight' : ''}`}>
        {mode === 'ghost' && vr === 4 && <p className="ml-meaning ml-bigen">{spanEn}</p>}
        {mode === 'ghost' && vr === 5 && !any && <div className="ml-empty">Nothing on screen this time.</div>}
        {any && <ol className="ml-tiles">{tiles}</ol>}
        {!few && !reveal && mode !== 'ghost' && (sayStep.span.length <= 4 || vr === 3) && <p className="ml-meaning">{spanEn}</p>}
      </div>
    );
  } else if (step.t === 'order') {
    card = (
      <div className={`ml-paper ml-work${a.chunks.length > 4 ? ' ml-tight' : ''}`}>
        <ol className="ml-tiles ml-built" aria-label="Your answer so far">{u.built.map((i) => tile(i, -1, 'full', { small: true, key: `b${i}` }))}</ol>
        <ol className="ml-tiles">{u.pool.filter((i) => !u.built.includes(i)).map((i) => tile(i, -1, 'full', { small: true, wrong: u.wrong === i, onClick: res ? undefined : () => tapOrder(i) }))}</ol>
      </div>
    );
  } else {
    card = (
      <>
        {step.t !== 'start' && <ol className="ml-tiles">{tile((step as TapStep).i ?? 0, -1, 'full')}</ol>}
        <ol className="ml-opts">
          {u.opts.map((o, k) => {
            const st = res ? (o === u.right ? 'right' : k === u.picked ? 'wrong' : undefined) : undefined;
            return <li key={k}><button type="button" className="ml-opt" data-s={st} disabled={res} lang={step.t === 'meaning' ? undefined : 'es'} onClick={() => tapAnswer(k)} data-testid="lab-opt" data-right={o === u.right || undefined}><span>{o}</span><span aria-hidden="true">{st === 'right' ? '✓' : st === 'wrong' ? '✗' : ''}</span></button></li>;
          })}
        </ol>
      </>
    );
  }

  let dock: React.ReactNode = null;
  if (res && fb) {
    dock = (
      <div className="ml-fb" data-ok={fb.ok ? '1' : '0'} role="status" data-testid="lab-fb">
        <h2><span className="ml-sym" aria-hidden="true">{fb.ok ? '✓' : '↻'}</span>{fb.head}{fb.gain ? <span> +€{fb.gain}</span> : null}</h2>
        {fb.body && <p>{fb.body}</p>}
        {!fb.auto && <button type="button" className="ml-btn ml-primary" onClick={nextStep} autoFocus data-testid="lab-continue">{fb.btn ?? 'Continue'}</button>}
      </div>
    );
  } else if (sayStep && u.phase === 'cue') {
    dock = <div className="ml-quiet" role="status">Tele is speaking. Your turn next.</div>;
  } else if (sayStep && u.phase === 'listening') {
    const tap = live.state === 'needs-tap';
    dock = (
      <>
        {u.offer && !tap && (
          <div className="ml-two" data-testid="lab-offer">
            <button type="button" className="ml-btn" onClick={hint} data-testid="lab-hint">{sayStep.r === 1 && !sayStep.read ? 'Hear it again' : 'Give me a hint'}</button>
            <button type="button" className="ml-btn" onClick={conclude} data-testid="lab-pass">Move on</button>
          </div>
        )}
        {tap ? (
          <button type="button" className="ml-btn ml-primary ml-big" onClick={() => live.start()}>Tap, then speak</button>
        ) : (
          <div className="ml-listen" ref={meterEl} data-testid="lab-listen" data-meter={live.meterOn || undefined} role="status">
            <span className="ml-bars" aria-hidden="true"><i /><i /><i /><i /><i /></span>
            <span className="ml-listentext">{u.offer ? 'Take your time. Tele is still listening.' : 'Tele is listening. Say it out loud.'}</span>
            <span className="ml-heard" lang="es" data-testid="lab-heard">{u.heard}</span>
          </div>
        )}
      </>
    );
  } else if (sayStep && u.phase === 'ready') {
    dock = (
      <>
        <div className="ml-quiet">
          {u.note ? <span role="status">{u.note}</span>
            : sayStep.r === 1 && !sayStep.read ? <button type="button" className="ml-link" onClick={() => hearAgain(true)}>Play it slower</button>
            : vr === 5 ? <>{!u.showQ && <button type="button" className="ml-link" onClick={() => { u.showQ = true; bump(); }}>Read the question</button>}</>
            : sayStep.r === 4 && !u.blocks ? <button type="button" className="ml-link" onClick={() => { u.blocks = true; u.helped = true; bump(); }}>Show me the blocks</button>
            : sayStep.r >= 2 && mode !== 'ghost' ? <span>Stuck? Tap a block to peek.</span> : null}
        </div>
        <button type="button" className="ml-btn ml-primary ml-big" onClick={said} data-testid="lab-said">{sayStep.r === 1 ? "I've said it" : 'Check my answer'}</button>
      </>
    );
  } else if (sayStep && u.phase === 'mark') {
    dock = (
      <div className="ml-ask">
        <p>Did you say all of it?</p>
        <div className="ml-two">
          <button type="button" className="ml-btn ml-primary" onClick={() => applySay({ kind: u.helped ? 'helped' : 'clean' })} data-testid="lab-yes">Yes</button>
          <button type="button" className="ml-btn" onClick={() => { if (sayStep.span.length === 1) applySay({ kind: 'miss', m: sayStep.span[0] }); else { u.phase = 'pick'; bump(); } }} data-testid="lab-no">Missed a bit</button>
        </div>
      </div>
    );
  } else if (sayStep && u.phase === 'pick') {
    dock = <div className="ml-ask"><p>Tap the first bit you missed.</p></div>;
  } else if (step.t === 'order') dock = <div className="ml-quiet">Tap the bits in the order you say them.</div>;

  const hasCue = !!cueText(step);
  return (
    <main className="ml ml-lesson" data-testid="lab-lesson" data-phase={u.phase}>
      <div className="ml-top">
        <button type="button" className="ml-btn ml-x" onClick={goHome} aria-label="Leave this lesson">✕</button>
        <div className="ml-prog" role="progressbar" aria-valuemin={0} aria-valuemax={T} aria-valuenow={s.done} aria-label={`Lesson progress, ${s.done} of ${T} done`} data-testid="lab-progress">
          {Array.from({ length: T }, (_, i) => <i key={i} className={i < s.done ? 'on' : undefined} />)}
        </div>
        <span className="ml-euros" aria-label={`${w.euros} euros`}>€{w.euros}</span>
      </div>
      <div className="ml-head">
        <KindBadge kind={u.kind} />
        <div className="ml-headtext">{tag && <span className="ml-tag">{tag}</span>}<h1 data-testid="lab-title">{title}</h1></div>
      </div>
      {teleRow(line, res ? (fb?.ok ? JOY : SAD) : undefined, !res && hasCue ? () => hearAgain() : undefined, u.phase === 'listening')}
      <div className="ml-mid">{card}</div>
      <div className="ml-dock">{dock}</div>
      <details className="ml-plan">
        <summary>Lesson plan</summary>
        <ol>{[step, ...s.queue].map((q, i) => <li key={i} data-now={i === 0 || undefined} data-added={!q.planned || undefined}>{describe(w, q)}</li>)}</ol>
      </details>
    </main>
  );
}
