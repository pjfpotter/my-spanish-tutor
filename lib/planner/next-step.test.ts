import { describe, expect, it } from 'vitest';
import { phaseStates, type Progress } from '../phases/gate';
import { nextStep } from './next-step';

const progress = (over: Partial<Progress> = {}): Progress => ({ answersConfirmed: 0, questionsMastered: 0, answersMemorised: 0, total: 5, ...over });
const next = (p: Progress, last: Parameters<typeof nextStep>[0]['last'], extra: { daysToTest?: number; unlockAll?: boolean } = {}) =>
  nextStep({ states: phaseStates(p, { unlockAll: extra.unlockAll }), progress: p, last, daysToTest: extra.daysToTest });

describe('nextStep', () => {
  it('says it is the first session and points at Understand when nothing has been done', () => {
    const n = next(progress(), null);
    expect(n).toMatchObject({ step: 'understand', href: '/phases/understand', label: 'Understand the questions' });
    expect(n.sentence).toContain("first session");
    expect(n.sentence).toContain('what the test questions mean');
  });

  it('keeps a returning student on Understand, saying what is left', () => {
    const n = next(progress({ questionsMastered: 3 }), 'understand');
    expect(n.step).toBe('understand');
    expect(n.sentence).toContain('Last time you were working out what the questions mean');
    expect(n.sentence).toContain('2 questions are still to go');
  });

  it('says one question when one is left', () => {
    expect(next(progress({ questionsMastered: 4 }), 'understand').sentence).toContain('1 question is still to go');
  });

  it('moves on to Write once every question is understood, naming what was done last', () => {
    const n = next(progress({ questionsMastered: 5 }), 'understand');
    expect(n).toMatchObject({ step: 'write', href: '/phases/write' });
    expect(n.sentence).toBe("Last time you were working out what the questions mean. Now let's write your answers.");
  });

  it('suggests Memorise when everything before it is done', () => {
    const n = next(progress({ questionsMastered: 5, answersConfirmed: 5 }), 'write');
    expect(n.step).toBe('memorise');
    expect(n.sentence).toContain("Now let's say your answers from memory");
  });

  it('suggests Automate once every answer is memorised', () => {
    const n = next(progress({ questionsMastered: 5, answersConfirmed: 5, answersMemorised: 5 }), 'memorise');
    expect(n).toMatchObject({ step: 'automate', href: '/phases/automate' });
  });

  it('offers a light review when everything is done', () => {
    const n = next(progress({ questionsMastered: 5, answersConfirmed: 5, answersMemorised: 5, testReady: true }), 'automate');
    expect(n).toMatchObject({ step: 'review', label: 'Light review' });
  });

  it('offers only a light review after the test date', () => {
    expect(next(progress(), 'understand', { daysToTest: -1 }).step).toBe('review');
  });

  it('never suggests a locked step', () => {
    // Understood but nothing written: Memorise is locked, so Write comes first, not Memorise.
    expect(next(progress({ questionsMastered: 5 }), 'understand').step).toBe('write');
    // Written but not understood: Understand, not Memorise.
    expect(next(progress({ answersConfirmed: 5 }), 'write').step).toBe('understand');
    // Automate is locked until every answer is memorised.
    const n = next(progress({ questionsMastered: 5, answersConfirmed: 5, answersMemorised: 2 }), 'memorise');
    expect(n.step).toBe('memorise');
  });

  it('counts a student who only did the quick check as no longer new', () => {
    const n = next(progress({ questionsMastered: 5 }), 'understand');
    expect(n.sentence).not.toContain('first session');
  });

  it('suggests short answers when few days remain', () => {
    expect(next(progress({ questionsMastered: 5 }), 'understand', { daysToTest: 2 }).sentence).toContain('short answers are fine');
    expect(next(progress({ questionsMastered: 5 }), 'understand', { daysToTest: 9 }).sentence).not.toContain('short answers');
  });

  it('names only one thing to do, in English, with no timings', () => {
    for (const last of [null, 'understand', 'write', 'memorise', 'automate'] as const) {
      const n = next(progress({ questionsMastered: 2 }), last);
      expect(n.sentence).not.toMatch(/\d+\s*min|[áéíóúñ¿¡]/i);
    }
  });
});
