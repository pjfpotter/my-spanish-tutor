import type { ChunkKind } from '../practice/chunk-kind';

/**
 * The memorise ladder (lab). One answer is learned in a few short lessons, and inside a lesson the help on
 * screen moves with the student's results. Five levels of help, most first: 1 listen and repeat, 2 first
 * letters, 3 empty blocks, 4 English only, 5 just the question. Rules only: nothing here calls a model.
 *
 * A lesson is a queue of screens. A slip adds screens that fix the one bit that slipped. Two slips on the same
 * screen put words back for the rest of the lesson. Three clean first goes take words away. A student who
 * keeps going after fudging one bit passes the screen and only tidies that bit.
 */
export interface LadderChunk { t: string; en: string; k: ChunkKind; /** Sentence number, from 0. */ s: number }
export interface LadderAnswer { n: number; q: string; qen: string; en: string; chunks: LadderChunk[] }
export interface AnswerState { stage: number; top: number; recalls: number[]; wipeDay: number; memorised: boolean }
export interface World { answers: readonly LadderAnswer[]; day: number; euros: number; states: AnswerState[] }

export type LessonType = 'meet' | 'build' | 'wipe' | 'lock' | 'mix' | 'probe';
export interface Lesson { type: LessonType; a: number | null; part?: number }

export interface SayStep {
  t: 'say'; a: number; span: number[]; /** Level of help, 1 to 5. */ r: number; tries: number; planned: boolean;
  /** Words on screen, Tele silent. */ read?: boolean; cold?: boolean; tag?: 'fix' | 'again'; counted?: boolean;
}
export interface TapStep { t: 'meaning' | 'next' | 'start' | 'order'; a: number; i?: number; planned: boolean; tag?: 'again'; counted?: boolean }
export type Step = SayStep | TapStep;

export interface Session {
  lesson: Lesson; queue: Step[]; cur: Step | null; done: number; streak: number; said: number; got5: number; earned: number;
  /** "I already know this one": the bit that slipped, or null. */
  probe: number | null;
}

export type TeleKey = 'good' | 'top' | 'miss' | 'up' | 'down';
export interface Feedback { ok: boolean; head: string; body?: string; btn?: string; /** Moves on by itself after this many ms. */ auto?: number; tele: TeleKey; gain?: number; missed?: number }

export type SayOutcome = { kind: 'clean' } | { kind: 'helped' } | { kind: 'kept'; m: number } | { kind: 'miss'; m: number };
export type Rng = () => number;

export const HELP = ['', 'listen and repeat', 'first letters', 'empty blocks', 'English only', 'just the question'] as const;
export const LESSON_NAME: Record<LessonType, string> = { meet: 'Listen and repeat', build: 'First letters', wipe: 'From memory', lock: 'Next-day check', mix: 'Mix-up', probe: 'Test me first' };

const range = (n: number) => Array.from({ length: n }, (_, i) => i);
export function shuffle<T>(list: readonly T[], rng: Rng): T[] {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const pick = <T,>(list: readonly T[], rng: Rng): T => list[Math.min(list.length - 1, Math.floor(rng() * list.length))];
const bare = (t: string) => t.replace(/[.,]+$/, '');

export const freshState = (): AnswerState => ({ stage: 0, top: 0, recalls: [], wipeDay: 0, memorised: false });
export const partsOf = (a: LadderAnswer): number[][] => {
  const p: number[][] = [];
  a.chunks.forEach((c, i) => (p[c.s] ??= []).push(i));
  return p.filter(Boolean);
};
export const lessonsOf = (answers: readonly LadderAnswer[], ai: number): Lesson[] => [
  { type: 'meet', a: ai },
  ...partsOf(answers[ai]).map((_, p): Lesson => ({ type: 'build', a: ai, part: p })),
  { type: 'wipe', a: ai },
  { type: 'lock', a: ai },
];
export const lessonName = (answers: readonly LadderAnswer[], L: Lesson) =>
  L.type === 'build' && L.a !== null && partsOf(answers[L.a]).length > 1 ? `First letters, part ${(L.part ?? 0) + 1}` : LESSON_NAME[L.type];
const allOf = (a: LadderAnswer) => range(a.chunks.length);
export const isWhole = (w: World, s: SayStep) => s.span.length === w.answers[s.a].chunks.length;
const say = (a: number, span: number[], r: number, x: Partial<SayStep> = {}): SayStep => ({ t: 'say', a, span, r, tries: 0, planned: true, ...x });
const tap = (t: TapStep['t'], a: number, i?: number): TapStep => ({ t, a, i, planned: true });

/** The screens of a lesson, before any slip or streak changes them. */
export function plan(w: World, L: Lesson, rng: Rng = Math.random): Step[] {
  const q: Step[] = [];
  if (L.type === 'mix') {
    const ids = shuffle(range(w.answers.length).filter((i) => w.states[i].top >= 5), rng);
    if (ids.length) q.push(tap('start', ids[ids.length - 1]));
    ids.forEach((i) => q.push(say(i, allOf(w.answers[i]), 5)));
    return q;
  }
  const ai = L.a ?? 0;
  const ans = w.answers[ai];
  const all = allOf(ans);
  const n = all.length;
  if (L.type === 'meet') {
    for (let i = 0; i < n; i++) {
      q.push(say(ai, [i], 1));
      if (i % 2 === 1) q.push(tap('meaning', ai, i - 1));
    }
    if (n % 2 === 1) q.push(tap('meaning', ai, n - 1));
    q.push(tap('order', ai), say(ai, all, 1), say(ai, all, 1, { read: true }));
  } else if (L.type === 'build') {
    const parts = partsOf(ans);
    const part = parts[L.part ?? 0];
    const upto = parts.slice(0, (L.part ?? 0) + 1).flat();
    part.forEach((i, j) => {
      q.push(say(ai, [i], 2));
      if (j >= 1) q.push(say(ai, part.slice(0, j + 1), 2));
      if (j === 1) q.push(tap('next', ai, part[0]));
    });
    if ((L.part ?? 0) > 0) q.push(say(ai, upto, 2));
    q.push(say(ai, upto, 3));
  } else if (L.type === 'wipe') {
    // Start one level below the best so far, then climb to the question alone, twice, with a tap task between recalls.
    const from = Math.min(4, Math.max(2, w.states[ai].top - 1));
    const taps: TapStep[] = [tap('start', ai), tap('next', ai, Math.floor(rng() * (n - 1))), tap('meaning', ai, Math.floor(rng() * n))];
    q.push(say(ai, all, from), say(ai, all, from + 1));
    let t = 0;
    for (let r = from + 2; r <= 5; r++) q.push({ ...taps[t++ % 3] }, say(ai, all, r));
    q.push({ ...taps[t % 3] }, say(ai, all, 5));
  } else if (L.type === 'lock') {
    q.push(say(ai, all, 5, { cold: true }), tap('order', ai), say(ai, all, 5));
  } else q.push(say(ai, all, 5));
  return q;
}

export const lockOpen = (w: World, ai: number) => w.day > w.states[ai].wipeDay;
export type StepState = 'done' | 'now' | 'wait' | 'todo';
export function stepState(w: World, ai: number, idx: number): StepState {
  const st = w.states[ai];
  if (st.memorised || idx < st.stage) return 'done';
  if (idx === st.stage) return lessonsOf(w.answers, ai)[idx].type === 'lock' && !lockOpen(w, ai) ? 'wait' : 'now';
  return 'todo';
}
/** The lesson that can be done for one answer right now, or null (memorised, or waiting for tomorrow). */
export function nextFor(w: World, ai: number): Lesson | null {
  const st = w.states[ai];
  if (st.memorised) return null;
  const L = lessonsOf(w.answers, ai)[st.stage];
  return L.type === 'lock' && !lockOpen(w, ai) ? null : L;
}
const wordCount = (a: LadderAnswer) => a.chunks.reduce((n, c) => n + c.t.split(' ').length, 0);
/** What to do next: a next-day check that is due, then the answer in progress, then the shortest answer not started. */
export function recommended(w: World): Lesson | null {
  const ids = range(w.answers.length).filter((i) => nextFor(w, i));
  const due = ids.filter((i) => nextFor(w, i)!.type === 'lock');
  if (due.length) return nextFor(w, due[0]);
  const going = ids.filter((i) => w.states[i].stage > 0);
  if (going.length) return nextFor(w, going[0]);
  const todo = ids.sort((x, y) => wordCount(w.answers[x]) - wordCount(w.answers[y]));
  return todo.length ? nextFor(w, todo[0]) : null;
}
export const mixReady = (w: World) => w.states.filter((s) => s.top >= 5).length >= 2;

export const newSession = (w: World, L: Lesson, rng: Rng = Math.random): Session => ({ lesson: L, queue: plan(w, L, rng), cur: null, done: 0, streak: 0, said: 0, got5: 0, earned: 0, probe: null });
/** Planned screens in the lesson as it now stands: the length of the progress bar. */
export const total = (s: Session) => s.done + s.queue.filter((q) => q.planned).length + (s.cur && s.cur.planned && !s.cur.counted && !s.queue.includes(s.cur) ? 1 : 0);
/** Moves to the next screen. Returns null when the lesson is over. */
export function advance(s: Session): Step | null {
  const next = s.queue.shift() ?? null;
  if (next) next.counted = false;
  s.cur = next;
  return next;
}
function countDone(s: Session, step: Step) {
  if (step.planned && !step.counted) {
    step.counted = true;
    s.done++;
  }
}
function earn(w: World, s: Session, n: number) {
  w.euros += n;
  s.earned += n;
}

/**
 * How a spoken go went, from which chunks were said. All of it: clean, or helped if a hint was used. One bit
 * missing from three or more with the rest said: kept going. Anything else: a slip on the first missing bit.
 */
export function outcomeOf(span: readonly number[], said: readonly boolean[], helped: boolean): SayOutcome {
  const missing = span.filter((_, k) => !said[k]);
  if (!missing.length) return { kind: helped ? 'helped' : 'clean' };
  if (missing.length === 1 && span.length >= 3) return { kind: 'kept', m: missing[0] };
  return { kind: 'miss', m: missing[0] };
}

function lowerRest(s: Session, ai: number, r: number, self: Step) {
  s.queue.forEach((q) => {
    if (q !== self && q.t === 'say' && q.a === ai && q.planned && q.r >= r) q.r = Math.max(2, q.r - 1);
  });
}
/**
 * Three clean first goes: every spoken screen still to come gives one level less help. A single bit that a later,
 * longer screen already covers is skipped, and so is a screen that is now a repeat, so the lesson gets shorter.
 */
function boost(w: World, s: Session): boolean {
  let changed = false;
  s.queue.forEach((q) => {
    if (q.t === 'say' && q.planned && q.r >= 2 && q.r < (isWhole(w, q) ? 5 : 4)) {
      q.r++;
      changed = true;
    }
  });
  const seen: Record<string, number> = {};
  s.queue = s.queue.filter((q, at) => {
    if (q.t !== 'say' || !q.planned) return true;
    if (q.span.length === 1 && s.queue.slice(at + 1).some((x) => x.t === 'say' && x.planned && x.a === q.a && x.span.length > 1 && x.span.includes(q.span[0]))) {
      changed = true;
      return false;
    }
    const k = `${q.a}:${q.span.join(',')}:${q.r}`;
    seen[k] = (seen[k] ?? 0) + 1;
    return seen[k] <= (q.r === 5 ? 2 : 1);
  });
  return changed;
}

/** Applies the result of a spoken screen: changes the queue and the answer's state, and says what to show. */
export function resolveSay(w: World, s: Session, o: SayOutcome, rng: Rng = Math.random): Feedback {
  const step = s.cur as SayStep;
  const st = w.states[step.a];
  const whole = isWhole(w, step);
  s.said++;
  earn(w, s, 1); // effort earns, whatever the result
  const bitOf = (m: number) => `«${bare(w.answers[step.a].chunks[m].t)}»`;

  if (o.kind === 'miss') {
    s.streak = 0;
    step.tries++;
    const bit = bitOf(o.m);
    const fb = (head: string, body: string, btn: string, tele: TeleKey = 'miss'): Feedback => ({ ok: false, head, body, btn, tele, missed: o.m });
    if (s.lesson.type === 'probe') {
      s.probe = o.m;
      countDone(s, step);
      return fb('Good to know', 'That shows where to start.', 'Continue');
    }
    if (step.r === 1) {
      if (step.tries < 2) {
        s.queue.unshift(step);
        return fb('Once more', `Listen to ${bit} again, then say it with Tele.`, 'Again');
      }
      countDone(s, step);
      return fb('Moving on', 'That bit comes round again later.', 'Continue');
    }
    if (!step.planned) {
      if (step.tries < 2) {
        step.r = Math.max(1, step.r - 1);
        s.queue.unshift(step);
        return fb('Once more', `${bit} again, with more help.`, 'Again');
      }
      return fb('Moving on', 'That bit comes round again later.', 'Continue');
    }
    if (step.tries === 1) {
      const ins: Step[] = [say(step.a, [o.m], step.r - 1, { planned: false, tag: 'fix' })];
      if (step.span.length >= 3) ins.push(say(step.a, o.m > step.span[0] ? [o.m - 1, o.m] : [o.m, o.m + 1], Math.max(2, step.r - 1), { planned: false, tag: 'fix' }));
      step.tag = 'again';
      s.queue.unshift(...ins, step);
      return fb('One bit to fix', `${bit}. Just that bit next, then this again.`, 'Fix it');
    }
    if (step.tries === 2) {
      lowerRest(s, step.a, step.r, step);
      step.r = Math.max(1, step.r - 1);
      if (whole) st.top = Math.min(st.top, Math.max(1, step.r - 1));
      s.queue.unshift(say(step.a, [o.m], 1, { planned: false, tag: 'fix' }), step);
      return fb('More help for now', 'Tele puts some words back. They come off again when you are ready.', 'Continue', 'down');
    }
    countDone(s, step);
    return fb('Moving on', 'This one comes back another time.', 'Continue');
  }

  countDone(s, step);
  if (o.kind === 'kept') {
    // They fudged one bit and kept going. The screen passes; only that bit is tidied.
    s.streak = 0;
    if (whole) st.top = Math.max(st.top, step.r - 1);
    if (s.lesson.type === 'probe') s.probe = o.m;
    else s.queue.unshift(say(step.a, [o.m], Math.max(1, step.r - 1), { planned: false, tag: 'fix' }));
    return { ok: true, head: 'You kept going', body: `Good. One bit to tidy: ${bitOf(o.m)}.`, btn: 'Tidy it', tele: 'good', gain: 1, missed: o.m };
  }
  const clean = o.kind === 'clean';
  if (whole) {
    const reached = clean ? step.r : step.r - 1;
    if (reached > st.top) st.top = reached;
    if (clean && step.r === 5) {
      st.recalls.push(w.day);
      s.got5++;
      earn(w, s, 2);
    }
  }
  if (step.r >= 2) s.streak = clean && step.tries === 0 ? s.streak + 1 : 0;
  const gain = clean && step.r === 5 ? 3 : 1;
  if (!clean) return { ok: true, head: 'That works', body: 'You had a bit of help, so it comes round once more.', btn: 'Continue', tele: 'good', gain };
  if (s.streak >= 3 && (s.lesson.type === 'build' || s.lesson.type === 'wipe')) {
    s.streak = 0;
    if (boost(w, s)) return { ok: true, head: 'Three in a row', body: 'Tele takes more words away now.', btn: 'Continue', tele: 'up', gain };
  }
  if (step.r === 1) return { ok: true, head: pick(['Nice', 'Good', 'Lovely'], rng), auto: 700, tele: 'good', gain };
  if (step.r === 5) return { ok: true, head: 'From memory', body: 'Nothing on screen, and you said it.', auto: 1500, tele: 'top', gain };
  return { ok: true, head: pick(['Got it', 'Spot on', 'That is it', 'Yes'], rng), auto: 900, tele: 'good', gain };
}

/** Applies the result of a tap screen. A miss comes back once, a couple of screens later. */
export function resolveTap(s: Session, right: boolean, answer: string, rng: Rng = Math.random): Feedback {
  const step = s.cur as TapStep;
  if (right) {
    countDone(s, step);
    return { ok: true, head: pick(['Correct', 'Yes', 'That is it'], rng), auto: 900, tele: 'good' };
  }
  if (!step.tag) {
    step.tag = 'again';
    s.queue.splice(Math.min(2, s.queue.length), 0, step);
  } else countDone(s, step);
  return { ok: false, head: 'Not quite', body: `It is: ${answer}`, btn: 'Continue', tele: 'miss' };
}

export type EndKey = LessonType | 'soft';
export interface Finish { shout: string; line: string; tele: EndKey }
const memorisedNow = (st: AnswerState) => st.recalls.length >= 3 && new Set(st.recalls).size >= 2;

/** Ends the lesson: moves the answer on, back, or leaves it, and says how to sum it up. Pays the lesson bonus. */
export function finish(w: World, s: Session): Finish {
  const L = s.lesson;
  earn(w, s, 5);
  if (L.type === 'mix' || L.a === null) {
    w.states.forEach((st, i) => {
      if (!st.memorised && memorisedNow(st) && lessonsOf(w.answers, i)[st.stage]?.type === 'lock') {
        st.memorised = true;
        st.stage = lessonsOf(w.answers, i).length;
      }
    });
    return { shout: 'All mixed up', line: 'Any question, any order.', tele: 'mix' };
  }
  const st = w.states[L.a];
  const Ls = lessonsOf(w.answers, L.a);
  const idx = (t: LessonType) => Ls.findIndex((x) => x.type === t);
  if (L.type === 'meet') {
    st.stage = Math.max(st.stage, 1);
    st.top = Math.max(st.top, 1);
    return { shout: 'Good start', line: 'You know what every bit means and how it sounds.', tele: 'meet' };
  }
  if (L.type === 'build') {
    st.stage = Math.max(st.stage, Ls.findIndex((x) => x.type === 'build' && x.part === L.part) + 1);
    return { shout: 'Getting there', line: st.top >= 3 ? 'The letters went and you still said it.' : 'It is going in.', tele: 'build' };
  }
  if (L.type === 'wipe') {
    if (s.got5) {
      st.stage = idx('lock');
      st.wipeDay = w.day;
      return { shout: 'From memory', line: 'Nothing on screen, and you answered Tele.', tele: 'wipe' };
    }
    st.stage = idx('wipe');
    return { shout: 'Nearly there', line: 'Not quite from memory yet. This step comes round once more, and it will be quicker.', tele: 'build' };
  }
  if (L.type === 'lock') {
    if (s.got5 && memorisedNow(st)) {
      st.memorised = true;
      st.stage = Ls.length;
      return { shout: 'Memorised', line: 'Three clean answers across two days. This one is yours.', tele: 'lock' };
    }
    if (s.got5) {
      st.wipeDay = w.day;
      return { shout: 'Still there', line: 'One more check tomorrow and it is locked in.', tele: 'lock' };
    }
    st.stage = idx('wipe');
    return { shout: 'It slipped a bit', line: 'That is normal after a night. One more go at "From memory" and it comes back faster.', tele: 'soft' };
  }
  // "I already know this one"
  if (s.probe === null && s.got5) {
    st.stage = idx('lock');
    st.wipeDay = w.day;
    st.top = 5;
    return { shout: 'You do know it', line: 'The lessons are skipped. It comes back tomorrow for a check.', tele: 'probe' };
  }
  if (s.probe !== null && s.probe > 0) {
    st.stage = Math.max(st.stage, 1);
    st.top = Math.max(st.top, 1);
    return { shout: 'Good to know', line: 'You have the start of it. "First letters" is next.', tele: 'probe' };
  }
  return { shout: 'Good to know', line: '"Listen and repeat" is the place to start.', tele: 'probe' };
}

/** One line for a screen, for the tester's live plan. */
export function describe(w: World, q: Step): string {
  const n = w.answers[q.a].chunks.length;
  if (q.t === 'say') {
    const a = q.span[0] + 1;
    const b = q.span[q.span.length - 1] + 1;
    const what = q.span.length === n ? 'the whole answer' : a === b ? `bit ${a}` : `bits ${a} to ${b}`;
    return `Say ${what}: ${q.read ? 'words on screen, no Tele' : HELP[q.r]}${q.tag === 'fix' ? ' (added to fix a slip)' : q.tag === 'again' ? ' (second go)' : ''}`;
  }
  const names = { meaning: `Tap: what bit ${(q.i ?? 0) + 1} means`, next: `Tap: what comes after bit ${(q.i ?? 0) + 1}`, start: 'Tap: how the answer starts', order: 'Tap the answer into order' };
  return names[q.t] + (q.tag === 'again' ? ' (back after a miss)' : '');
}
