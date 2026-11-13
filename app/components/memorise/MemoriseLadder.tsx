'use client';

import Link from 'next/link';
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import {
  advance, describe, finish, freshState, isWhole, lessonName, lessonsOf, mixReady, newSession, nextFor, outcomeOf, plan, recommended,
  resolveSay, resolveTap, shuffle, stepState, total,
  type AnswerState, type Feedback, type Finish, type LadderAnswer, type Lesson, type SayOutcome, type SayStep, type Session, type Step, type TapStep, type World,
} from '../../../lib/memorise/ladder';
import type { LadderStart, LessonRecall } from '../../../lib/memorise/ladder-store';
import { DEFAULT_MEMORISE } from '../../../lib/memorise/fade';
import { SOUND_KEY, soundOn } from '../../../lib/practice/sound';
import { firstUnsaid, liveMatch, type Focus, type LiveMatch } from '../../../lib/speech/live-match';
import { tokenise } from '../../../lib/speech/score';
import { LATENCY_BUDGET, LatencyLog, budgetVerdict, deviceReport } from '../../../lib/speech/latency';
import { listenCall } from '../../../lib/speech/pause';
import { clipUrls, findBitClip, findClip } from '../../../lib/tele/clips';
import type { Feelings } from '../../../lib/tele/feelings';
import { Tele } from '../../components/Tele';
import { useLiveSpeech } from '../../components/useLiveSpeech';
import { useSfx } from '../../components/useSfx';
import { useWakeLock } from '../../components/useWakeLock';
import { TELE } from '../../../lib/memorise/tele-lines';
import './ladder.css';

const KEY = 'memorise-lab-v1';
/** The real phase keeps only the student's two settings in the browser; their progress is saved to the server. */
const PREFS_KEY = 'memorise-prefs-v1';
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
  /** The bit (index within this screen) marked as the one to say next, or null. Set when a student stalls part way (27.5) or is sent back to a missed bit (27.8). */
  pointer: number | null;
  /** The student reached the end with a bit missing and has been sent back to it, once. */
  returning: boolean;
  /** While returning: only this bit is matched, against words heard after the point the student was sent back. */
  focus: Focus | null;
}
const newUi = (): Ui => ({ phase: 'cue', match: null, helped: false, shown: new Set(), offer: false, heard: '', fb: null, line: null, showQ: false, blocks: false, note: '', opts: [], right: '', picked: null, built: [], pool: [], wrong: null, errors: 0, startedAt: 0, lastProgressAt: null, lastVoiceAt: null, kind: 'speak', raw: '', pointer: null, returning: false, focus: null });

const freshWorld = (A: readonly LadderAnswer[]): World => ({ answers: A, day: 1, euros: 0, states: A.map(freshState) });
const pick = <T,>(list: readonly T[]): T => list[Math.floor(Math.random() * list.length)];
const mins = (w: World, L: Lesson) => { const n = plan(w, L).length; return n <= 4 ? 'about 1 min' : `about ${Math.max(2, Math.round((n * 12) / 60))} min`; };
const readSound = () => { try { return soundOn(localStorage.getItem(SOUND_KEY)); } catch { return true; } };
const isPhone = () => typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
const JOY: Feelings = { joy: 0.8 };
const SAD: Feelings = { sadness: 0.4 };

/**
 * Tele's voice: a built clip when there is one (the answer's bits are course chunks, built ahead of time), otherwise the
 * device's Spanish voice, otherwise a short wait. Given several bits it says them one after the other, so a whole
 * answer is its bits in order and needs no clip of its own.
 */
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
  const speak = useCallback(async (text: string | readonly string[], slow = false) => {
    stop();
    const mine = token.current;
    if (!readSound()) return;
    setSpeaking(true);
    const one = async (t: string) => {
      const slot = findClip(t, slow ? 0.7 : 1) ?? findBitClip(t, slow ? 0.7 : 1) ?? (slow ? findClip(t, 1) ?? findBitClip(t, 1) : null);
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
          const u = new SpeechSynthesisUtterance(t);
          u.lang = 'es-ES';
          const v = synth.getVoices().find((x) => /^es[-_]ES/i.test(x.lang)) ?? synth.getVoices().find((x) => /^es/i.test(x.lang));
          if (v) u.voice = v;
          u.rate = slow ? 0.6 : 0.9;
          u.onend = u.onerror = () => res();
          synth.speak(u);
          setTimeout(res, 2500 + t.length * 130);
        });
        return;
      }
      await new Promise((res) => setTimeout(res, 400 + t.length * 40));
    };
    try {
      for (const t of typeof text === 'string' ? [text] : text) {
        if (mine !== token.current) return;
        await one(t);
      }
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
/**
 * One whole-answer go as numbers. The score is the share of words understood. Rules, not a model, and a recognition
 * failure is never held against the student: a clean go (every bit said) is at least the mastery bar. Only a clean go
 * with nothing on screen counts toward memorising (level 4); a go with help, or at a rung above the bottom, is
 * recorded as help-assisted (level 0) so it is effort, never a mark against the student.
 */
export function recallOf(answer: LadderAnswer, step: SayStep, o: SayOutcome, match: LiveMatch | null, helped: boolean): LessonRecall {
  const total = answer.chunks.reduce((n, c) => n + c.t.split(' ').length, 0);
  const understood = match ? Math.round((100 * match.matched) / Math.max(1, total)) : o.kind === 'clean' ? 100 : o.kind === 'miss' ? 40 : 80;
  const missedWords = match ? match.hit.flat().flatMap((h, i) => (h ? [] : [i])) : [];
  const counts = o.kind === 'clean' && step.r === 5 && !helped;
  if (counts) return { itemId: answer.id!, accuracy: Math.max(understood, DEFAULT_MEMORISE.threshold), level: 4, missedWords };
  if (o.kind === 'miss') return { itemId: answer.id!, accuracy: Math.min(understood, DEFAULT_MEMORISE.threshold - 1), level: step.r === 5 ? 4 : 0, missedWords };
  return { itemId: answer.id!, accuracy: Math.max(understood, DEFAULT_MEMORISE.threshold), level: 0, missedWords };
}

export interface SaveBody { answers: { itemId: string; stage: number; top: number; wipeDay: number; recalls: number[] }[]; recalls: LessonRecall[]; earned: number }
export interface SaveReply { paid: number; euros: number; memorised: string[] }

export function MemoriseLadder({ answers: A, variant, start, save: saveRemote }: {
  answers: LadderAnswer[];
  /** `lab` keeps progress in this browser and shows the tester tools; `real` is the memorise phase, saved to the server. */
  variant: 'lab' | 'real';
  start?: Pick<LadderStart, 'day' | 'euros' | 'states' | 'testDays'>;
  /** Real phase: saves progress and pays what was earned. Resolves null if the save could not be made. */
  save?: (body: SaveBody) => Promise<SaveReply | null>;
}) {
  const real = variant === 'real';
  const [, bump] = useReducer((n: number) => n + 1, 0);
  const world = useRef<World>(start ? { answers: A, day: start.day, euros: start.euros, states: start.states } : freshWorld(A));
  const recallLog = useRef<LessonRecall[]>([]);
  const sentEarned = useRef(0);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
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
      const old = JSON.parse(localStorage.getItem(real ? PREFS_KEY : KEY) ?? '{}');
      const progress = real ? {} : { day: world.current.day, euros: world.current.euros, states: world.current.states };
      localStorage.setItem(real ? PREFS_KEY : KEY, JSON.stringify({ ...old, ...progress, ...extra }));
    } catch { /* storage is a convenience only */ }
  }, [real]);
  /**
   * Real phase: sends where each answer is, the whole-answer attempts since the last send, and the euros earned since
   * then. Sends run one at a time. If one fails the attempts go back on the list and are sent with the next.
   */
  const flush = useCallback((earnedTotal: number) => {
    if (!real || !saveRemote) return Promise.resolve();
    const recalls = recallLog.current;
    recallLog.current = [];
    const earned = Math.max(0, earnedTotal - sentEarned.current);
    sentEarned.current = Math.max(sentEarned.current, earnedTotal);
    const body: SaveBody = {
      answers: world.current.answers.flatMap((a, i) => (a.id ? [{ itemId: a.id, stage: world.current.states[i].stage, top: world.current.states[i].top, wipeDay: world.current.states[i].wipeDay, recalls: world.current.states[i].recalls }] : [])),
      recalls, earned,
    };
    queue.current = queue.current.then(async () => {
      const reply = await saveRemote(body).catch(() => null);
      if (!reply) { recallLog.current = [...recalls, ...recallLog.current]; sentEarned.current -= earned; setSaveFailed(true); return; }
      setSaveFailed(false);
      const w = world.current;
      w.euros = reply.euros;
      // The mastery record is the authority on "memorised". Make the ladder agree with it.
      w.answers.forEach((a, i) => {
        const st = w.states[i];
        const should = !!a.id && reply.memorised.includes(a.id);
        const last = lessonsOf(w.answers, i).length;
        if (should && !st.memorised) { st.memorised = true; st.stage = last; }
        if (!should && st.memorised) { st.memorised = false; st.stage = last - 1; st.wipeDay = w.day; }
      });
      bump();
    });
    return queue.current;
  }, [real, saveRemote]);
  const [saveFailed, setSaveFailed] = useState(false);
  useEffect(() => {
    let m = !isPhone();
    try {
      const j = JSON.parse(localStorage.getItem(real ? PREFS_KEY : KEY) ?? 'null');
      if (!real && j?.states?.length === A.length) world.current = { answers: A, day: j.day ?? 1, euros: j.euros ?? 0, states: j.states };
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
      const m = liveMatch(spanChunks(s), text, u.match, u.focus ?? undefined);
      const lit = m.matched > before;
      if (u.focus && m.said[u.focus.chunk]) {
        // The bit they were sent back to is said. If another is still missing, send them to that one next.
        const more = firstUnsaid(m);
        u.focus = more === null ? null : { chunk: more, after: tokenise(text).length };
      }
      if (u.returning) u.pointer = firstUnsaid(m);
      else if (lit) u.pointer = null;
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
    const u = ui.current;
    const whole = isWhole(w, step);
    // A whole-answer go is a recall. It is kept as numbers only (task 27.4), and only the unaided, clean ones from memory count toward memorising.
    if (real && whole && A[step.a].id) recallLog.current.push(recallOf(A[step.a], step, o, u.match, u.helped));
    const fb = resolveSay(w, s, o);
    u.phase = 'result';
    u.fb = fb;
    u.line = tele(fb.tele);
    sfx(fb.tele === 'up' ? 'combo' : !fb.ok ? 'miss' : step.r === 5 && o.kind === 'clean' ? 'personal-best' : 'correct');
    if (fb.tele === 'miss' || fb.tele === 'top') void voice.speak(u.line[0]);
    save();
    if (whole) void flush(s.earned);
    bump();
    if (fb.auto) autoTimer.current = setTimeout(() => { if (ui.current === u) nextStep(); }, fb.auto);
  }
  /** The student has reached the end with a bit missing: point at that bit and let them say it before the screen ends (27.8). */
  function sendBack() {
    const u = ui.current;
    const m = u.match;
    const at = m ? firstUnsaid(m) : null;
    if (!m || at === null) return conclude();
    u.returning = true;
    u.helped = true; // being pointed back is help, so this is not a clean recall
    u.focus = { chunk: at, after: tokenise(u.raw).length };
    u.pointer = at;
    u.offer = true;
    u.lastProgressAt = performance.now();
    bump();
  }
  /** The student has said some bits of a longer screen and stalled: mark the next bit to say (27.5). */
  function markNext() {
    const u = ui.current;
    const s = ses.current?.cur;
    if (!s || s.t !== 'say' || u.returning || !u.match || u.match.matched === 0 || u.match.complete || s.span.length < 3) return;
    const at = firstUnsaid(u.match);
    if (at === null) return;
    u.pointer = at;
    u.helped = true;
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
      // Once sent back to a missed bit, reaching the end again does not end the screen: saying that bit does.
      const call = listenCall({ now: performance.now(), startedAt: u.startedAt, lastProgressAt: u.lastProgressAt, lastVoiceAt: u.lastVoiceAt, complete: !!u.match?.complete, reachedEnd: !!u.match?.reachedEnd && !u.returning });
      if (call.kind === 'finish') {
        if (call.why === 'trailed' && !u.returning && u.match && firstUnsaid(u.match) !== null) sendBack();
        else conclude();
      } else if (call.kind === 'offer' && !u.offer) { u.offer = true; markNext(); bump(); }
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
    // A fresh recogniser session starts its transcript from nothing, so the point they were sent back from restarts too.
    if (u.focus) u.focus.after = 0;
    live.start();
    bump();
  }

  // ---- Moving through a lesson --------------------------------------------------------------------------
  /** What Tele says for a screen: the bits to echo, or the question. A list is said bit by bit. */
  function cueText(step: Step): string | string[] | null {
    const a = A[step.a];
    if (step.t === 'say') {
      if (step.r === 1 && !step.read) return spanChunks(step);
      if (isWhole(w, step)) return a.q;
      return null;
    }
    if (step.t === 'meaning') return a.chunks[step.i ?? 0].t;
    if (step.t === 'start') return a.q;
    return null;
  }
  async function playCue(step: Step, slow = false) {
    const c = cueText(step);
    if (c) await voice.speak(c, slow);
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
    sentEarned.current = 0;
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
    void flush(s.earned);
    sfx('section-complete');
    setView('done');
  }
  function goHome() {
    clearTimeout(autoTimer.current);
    voice.stop();
    live.stop();
    live.release();
    void flush(ses.current?.earned ?? 0);
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
    const m = u.match ?? liveMatch(spanChunks(s), '');
    // With a bit marked, the hint is for that bit; otherwise it is the next word not yet lit.
    const word = u.pointer !== null ? m.hit[u.pointer].indexOf(false) : -1;
    const next = u.pointer !== null && word >= 0 ? { chunk: u.pointer, word } : m.next;
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
  /** Tele says just the marked bit, then listens again (27.5, 27.8). */
  function hearBit() {
    const u = ui.current;
    const s = ses.current?.cur;
    if (!s || s.t !== 'say' || u.pointer === null) return;
    const text = A[s.a].chunks[s.span[u.pointer]].t;
    live.stop();
    u.helped = true;
    u.phase = 'cue';
    bump();
    void voice.speak(text, true).then(() => { if (ui.current === u && u.phase === 'cue') beginListening(); });
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
        <div className="ml-titlebar"><span>memorise.exe</span>{real && <Link href="/" className="ml-link" data-testid="section-exit">Desktop</Link>}{real ? (start?.testDays != null && <span className="ml-when" data-testid="ml-countdown">{start.testDays} {start.testDays === 1 ? 'day' : 'days'} to the test</span>) : <span className="ml-when">{Math.max(0, 9 - w.day)} days to the test</span>}</div>
        {saveFailed && <p className="ml-note" role="status" data-testid="ml-save-failed">Your progress could not be saved just now. It will be sent with your next answer, so keep this page open.</p>}
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
        <div className="ml-listhead"><h2>Your answers</h2><span data-testid="ml-memorised">{memo} of {A.length} memorised</span></div>
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
        {real ? (
          <details className="ml-tools">
            <summary>Settings</summary>
            <div className="ml-toolbody">
              <label><input type="checkbox" checked={selfMark} onChange={(e) => { setSelfMark(e.target.checked); save({ selfMark: e.target.checked }); }} /> Check my own answers (no microphone)</label>
              <label><input type="checkbox" checked={meter} onChange={(e) => { setMeter(e.target.checked); save({ meter: e.target.checked }); }} /> Voice level meter (turn off if words stop lighting up)</label>
              <p>{live.supported ? 'This browser can listen as you speak.' : 'This browser has no built-in listening, so you check your own answers here.'}</p>
            </div>
          </details>
        ) : (
          <details className="ml-tools">
            <summary>Tester tools</summary>
            <div className="ml-toolbody">
              <p>{live.supported ? 'This browser can listen as you speak.' : 'This browser has no built-in listening, so you check your own answers here. Chrome and Safari have it.'}</p>
              <label><input type="checkbox" checked={selfMark} onChange={(e) => { setSelfMark(e.target.checked); save({ selfMark: e.target.checked }); }} /> Check my own answers (no microphone)</label>
              <label><input type="checkbox" checked={meter} onChange={(e) => { setMeter(e.target.checked); save({ meter: e.target.checked }); }} /> Voice level meter (turn off if words stop lighting up)</label>
              <div className="ml-rowbtns">
                <button type="button" className="ml-btn ml-small" onClick={() => { w.day++; setSel(null); save(); bump(); }}>Skip to tomorrow (now day {w.day})</button>
                <button type="button" className="ml-btn ml-small" onClick={() => { world.current = freshWorld(A); setSel(null); save(); bump(); }}>Start over</button>
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
        )}
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
    const here = !!sayStep && c >= 0 && u.pointer === c && !reveal;
    // The marked bit shows even when nothing else is on screen, as blanks, so the student can see where they are.
    if (here && m === 'ghost') m = 'blank';
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
    const inner = <>{here && <span className="ml-here" aria-hidden="true" />}<span lang="es">{body}</span>{o.en && <span className="ml-ten">{chunk.en}</span>}</>;
    return (
      <li key={o.key ?? ci}>
        {o.onClick
          ? <button type="button" className={cls} data-k={chunk.k} data-miss={o.miss || undefined} data-wrong={o.wrong || undefined} data-here={here || undefined} aria-current={here ? 'step' : undefined} data-testid={here ? 'lab-here' : undefined} onClick={o.onClick}>{inner}</button>
          : <span className={cls} data-k={chunk.k} data-miss={o.miss || undefined} data-here={here || undefined} aria-current={here ? 'step' : undefined} data-testid={here ? 'lab-here' : undefined}>{inner}</span>}
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
        {(u.offer || u.pointer !== null) && !tap && (
          <div className="ml-two" data-testid="lab-offer" data-cols={u.pointer !== null ? 3 : 2}>
            <button type="button" className="ml-btn" onClick={hint} data-testid="lab-hint" aria-label={u.pointer !== null ? 'Hint for the marked bit' : undefined}>{u.pointer !== null ? 'Hint' : sayStep.r === 1 && !sayStep.read ? 'Hear it again' : 'Give me a hint'}</button>
            {u.pointer !== null && <button type="button" className="ml-btn" onClick={hearBit} data-testid="lab-hear-bit" aria-label="Hear the marked bit">Hear it</button>}
            <button type="button" className="ml-btn" onClick={conclude} data-testid="lab-pass">Move on</button>
          </div>
        )}
        {tap ? (
          <button type="button" className="ml-btn ml-primary ml-big" onClick={() => live.start()}>Tap, then speak</button>
        ) : (
          <div className="ml-listen" ref={meterEl} data-testid="lab-listen" data-meter={live.meterOn || undefined} role="status">
            <span className="ml-bars" aria-hidden="true"><i /><i /><i /><i /><i /></span>
            <span className="ml-listentext" data-testid="lab-listentext">{u.returning && u.pointer !== null ? 'One bit left. Say the marked bit.' : u.pointer !== null ? 'Say the marked bit next.' : u.offer ? 'Take your time. Tele is still listening.' : 'Tele is listening. Say it out loud.'}</span>
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
