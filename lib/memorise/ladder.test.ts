import { describe, expect, it } from 'vitest';
import { advance, finish, freshState, lessonsOf, newSession, nextFor, outcomeOf, plan, recommended, resolveSay, resolveTap, stepState, total, type LadderAnswer, type SayStep, type World } from './ladder';
import { liveMatch } from '../speech/live-match';
import { DEFAULT_PAUSE, listenCall } from '../speech/pause';

const C = (t: string, s = 0) => ({ t, en: t, k: 'other' as const, s });
const short: LadderAnswer = { n: 1, q: '¿Uno?', qen: 'One?', en: 'x', chunks: [C('Lo siento, no puedo'), C('porque tengo que'), C('hacer los deberes.')] };
const long: LadderAnswer = { n: 2, q: '¿Dos?', qen: 'Two?', en: 'y', chunks: [C('Los fines de semana'), C('juego a los videojuegos'), C('y escucho música.'), C('Me gusta montar en bici', 1), C('porque es divertido,', 1), C('aunque a veces', 1), C('me gusta salir.', 1)] };
const world = (): World => ({ answers: [short, long], day: 1, euros: 0, states: [freshState(), freshState()] });
const rng = () => 0.5;

/** Plays a lesson with one decision per spoken screen. Returns how many screens it took. */
function play(w: World, type: 'meet' | 'build' | 'wipe' | 'lock' | 'probe', decide: (s: SayStep, n: number) => 'clean' | 'miss' | 'kept', a = 0, part?: number) {
  const s = newSession(w, { type, a, part }, rng);
  let n = 0;
  while (advance(s)) {
    if (++n > 80) throw new Error('lesson did not end');
    const cur = s.cur!;
    if (cur.t !== 'say') resolveTap(s, true, '', rng);
    else {
      const d = decide(cur, n);
      const m = cur.span[Math.min(1, cur.span.length - 1)];
      resolveSay(w, s, d === 'clean' ? { kind: 'clean' } : d === 'kept' && cur.span.length >= 3 ? { kind: 'kept', m } : { kind: 'miss', m }, rng);
    }
  }
  return { s, n, end: finish(w, s) };
}

describe('lesson plans', () => {
  it('gives a long answer one first-letters lesson per sentence', () => {
    const w = world();
    expect(lessonsOf(w.answers, 0).map((l) => l.type)).toEqual(['meet', 'build', 'wipe', 'lock']);
    expect(lessonsOf(w.answers, 1).map((l) => l.type)).toEqual(['meet', 'build', 'build', 'wipe', 'lock']);
  });
  it('builds bit on bit: 1, 2, 1 and 2, then 3, 1 to 3', () => {
    const spans = plan(world(), { type: 'build', a: 0 }, rng).filter((q) => q.t === 'say').map((q) => (q as SayStep).span.join(''));
    expect(spans).toEqual(['0', '1', '01', '2', '012', '012']);
  });
  it('recommends the shortest answer first, then a final check as soon as it is due', () => {
    const w = world();
    expect(recommended(w)).toMatchObject({ type: 'meet', a: 0 });
    w.states[1] = { stage: 4, top: 5, recalls: [1, 1], wipeDay: 1, memorised: false };
    expect(recommended(w)).toMatchObject({ type: 'lock', a: 1 }); // open the same day: nothing waits for tomorrow
  });
  it('never makes a student wait: every unfinished answer has a lesson open today', () => {
    const w = world();
    for (let stage = 0; stage < 4; stage++) {
      w.states[0] = { stage, top: 5, recalls: [], wipeDay: w.day, memorised: false };
      expect(nextFor(w, 0)).not.toBeNull();
      expect(stepState(w, 0, stage)).toBe('now');
    }
  });
});

describe('help moves with results', () => {
  it('a clean run reaches the question alone, and the final check memorises it the same day', () => {
    const w = world();
    play(w, 'meet', () => 'clean');
    play(w, 'build', () => 'clean');
    const { end } = play(w, 'wipe', () => 'clean');
    expect(end.shout).toBe('From memory');
    expect(w.states[0]).toMatchObject({ stage: 3, top: 5, wipeDay: 1 });
    expect(play(w, 'lock', () => 'clean').end.shout).toBe('Memorised');
    expect(w.states[0].memorised).toBe(true);
  });
  it('a slip adds a fix for that bit, then the same screen again', () => {
    const w = world();
    const s = newSession(w, { type: 'wipe', a: 0 }, rng);
    advance(s);
    const before = total(s);
    const fb = resolveSay(w, s, { kind: 'miss', m: 1 }, rng);
    expect(fb).toMatchObject({ ok: false, head: 'One bit to fix', missed: 1 });
    expect(s.queue.slice(0, 3).map((q) => (q as SayStep).span.join(''))).toEqual(['1', '01', '012']);
    expect(total(s)).toBe(before); // fixes do not lengthen the progress bar
  });
  it('two slips on one screen put words back for the rest of the lesson', () => {
    const w = world();
    w.states[0].top = 3;
    let slips = 0;
    const { end } = play(w, 'wipe', (s) => (s.planned && s.r >= 3 && slips < 2 ? (slips++, 'miss') : 'clean'));
    expect(end.shout).toBe('Nearly there');
    expect(w.states[0].stage).toBe(2); // the step comes round again
  });
  it('three clean first goes take words away and shorten the lesson', () => {
    const w = world();
    const planned = plan(w, { type: 'build', a: 0 }, rng).length;
    const { s } = play(w, 'build', () => 'clean');
    expect(w.states[0].top).toBe(4); // the plan ends on empty blocks (3); the streak lifted it to English only
    expect(s.done).toBeLessThan(planned); // the third bit alone was skipped: the whole answer covers it
  });
  it('keeping going after one fudged bit passes the screen and only tidies that bit', () => {
    const w = world();
    const s = newSession(w, { type: 'wipe', a: 0 }, rng);
    advance(s);
    const fb = resolveSay(w, s, outcomeOf([0, 1, 2], [true, false, true], false), rng);
    expect(fb).toMatchObject({ ok: true, head: 'You kept going' });
    expect(s.done).toBe(1);
    expect((s.queue[0] as SayStep).span).toEqual([1]);
    expect(s.queue.filter((q) => !q.planned)).toHaveLength(1);
  });
  it('always ends, whatever the student does', () => {
    let seed = 7;
    const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 200; i++) {
      const w = world();
      w.states[1].top = Math.floor(r() * 6);
      const type = (['meet', 'build', 'wipe', 'lock'] as const)[Math.floor(r() * 4)];
      play(w, type, () => (r() < 0.45 ? 'miss' : r() < 0.5 ? 'kept' : 'clean'), 1, type === 'build' ? Math.floor(r() * 2) : undefined);
    }
  });
});

describe('how a spoken go is judged', () => {
  it('all said is clean, or helped after a hint', () => {
    expect(outcomeOf([0, 1], [true, true], false)).toEqual({ kind: 'clean' });
    expect(outcomeOf([0, 1], [true, true], true)).toEqual({ kind: 'helped' });
  });
  it('one bit missing from a short go is a slip on that bit', () => {
    expect(outcomeOf([3, 4], [true, false], false)).toEqual({ kind: 'miss', m: 4 });
    expect(outcomeOf([0, 1, 2, 3], [true, false, false, true], false)).toEqual({ kind: 'miss', m: 1 });
  });
});

describe('live word matching', () => {
  const chunks = ['Lo siento, no puedo', 'porque tengo que', 'hacer los deberes.'];
  it('lights words as they are understood, accents and capitals aside', () => {
    const m = liveMatch(chunks, 'lo siento no');
    expect(m.hit[0]).toEqual([true, true, true, false]);
    expect(m.said).toEqual([true, false, false]);
    expect(m.next).toEqual({ chunk: 0, word: 3 });
  });
  it('still counts what comes after a skipped or mangled bit', () => {
    const m = liveMatch(chunks, 'lo siento no puedo por que tango hacer los deberes');
    expect(m.said).toEqual([true, false, true]);
    expect(m.reachedEnd).toBe(true);
    expect(m.complete).toBe(false);
  });
  it('never turns a lit word off when the recogniser changes its mind', () => {
    const first = liveMatch(chunks, 'lo siento no puedo');
    const second = liveMatch(chunks, 'los cientos', first);
    expect(second.hit[0]).toEqual([true, true, true, true]);
    expect(second.matched).toBeGreaterThanOrEqual(first.matched);
  });
  it('accepts a long word that is one letter out', () => {
    expect(liveMatch(['los deberes'], 'los debere').complete).toBe(true);
    expect(liveMatch(['no puedo'], 'no pueda').complete).toBe(true);
    expect(liveMatch(['me gusta'], 'me gasto').complete).toBe(false);
  });
});

describe('pauses', () => {
  const base = { startedAt: 0, lastProgressAt: null, lastVoiceAt: null, complete: false, reachedEnd: false };
  it('never times a quiet student out: it offers a hint and keeps listening', () => {
    expect(listenCall({ ...base, now: 2000 })).toEqual({ kind: 'wait' });
    expect(listenCall({ ...base, now: DEFAULT_PAUSE.hintAfterMs })).toEqual({ kind: 'offer' });
    expect(listenCall({ ...base, now: 60_000 })).toEqual({ kind: 'offer' });
  });
  it('a new word resets the pause', () => {
    expect(listenCall({ ...base, now: 5000, lastProgressAt: 4000 })).toEqual({ kind: 'wait' });
  });
  it('moves on by itself once all of it is said', () => {
    expect(listenCall({ ...base, now: 1100, lastProgressAt: 1000, complete: true, reachedEnd: true })).toEqual({ kind: 'wait' });
    expect(listenCall({ ...base, now: 1000 + DEFAULT_PAUSE.settleMs, lastProgressAt: 1000, complete: true, reachedEnd: true })).toEqual({ kind: 'finish', why: 'complete' });
  });
  it('ends after the last bit and a short quiet, even with an earlier bit missing', () => {
    const i = { ...base, lastProgressAt: 5000, lastVoiceAt: 5200, reachedEnd: true };
    expect(listenCall({ ...i, now: 6000 })).toEqual({ kind: 'wait' });
    expect(listenCall({ ...i, now: 5200 + DEFAULT_PAUSE.trailMs })).toEqual({ kind: 'finish', why: 'trailed' });
  });
});
