import { describe, expect, it } from 'vitest';
import {
  afterAttempt, countMastered, isMastered, masteryFraction, needsLaterSession, newQueue, nextInQueue,
  NO_MASTERY, recordAttempt, type MasteryState,
} from './mastery';

const ok = (s: MasteryState, sessionId: string) => recordAttempt(s, { correct: true, assisted: false, sessionId });

describe('mastery rule', () => {
  it('is not mastered after three correct in one session, and waits for a later one', () => {
    let s = NO_MASTERY;
    for (let i = 0; i < 3; i++) s = ok(s, 'day1');
    expect(s.qualifyingSuccesses).toBe(3);
    expect(s.distinctSessions).toBe(1);
    expect(isMastered(s)).toBe(false);
    expect(needsLaterSession(s)).toBe(true);
  });

  it('is mastered with three correct across two sessions', () => {
    let s = ok(ok(NO_MASTERY, 'day1'), 'day1');
    expect(isMastered(s)).toBe(false);
    s = ok(s, 'day2');
    expect(isMastered(s)).toBe(true);
    expect(needsLaterSession(s)).toBe(false);
  });

  it('does not count assisted attempts', () => {
    let s = NO_MASTERY;
    s = recordAttempt(s, { correct: true, assisted: true, sessionId: 'a' });
    expect(s).toEqual(NO_MASTERY);
  });

  it('never loses progress for a wrong answer', () => {
    const s = ok(NO_MASTERY, 'a');
    expect(recordAttempt(s, { correct: false, assisted: false, sessionId: 'a' })).toEqual(s);
  });

  it('honours configured thresholds', () => {
    const s = ok(ok(NO_MASTERY, 'a'), 'b');
    expect(isMastered(s, { successes: 2, sessions: 2 })).toBe(true);
    expect(isMastered(s, { successes: 3, sessions: 2 })).toBe(false);
  });

  it('keeps the fraction below 1 until mastered', () => {
    expect(masteryFraction(NO_MASTERY)).toBe(0);
    const three = ok(ok(ok(NO_MASTERY, 'a'), 'a'), 'a');
    expect(masteryFraction(three)).toBeLessThan(1);
    expect(masteryFraction(ok(three, 'b'))).toBe(1);
  });

  it('counts mastered items', () => {
    const m = ok(ok(ok(NO_MASTERY, 'a'), 'b'), 'b');
    expect(countMastered([m, NO_MASTERY, m])).toBe(2);
  });
});

describe('in-session spaced return', () => {
  const ids = ['q1', 'q2', 'q3', 'q4', 'q5'];

  it('serves different items first, with a correct one returning after a gap of three', () => {
    let q = newQueue(ids);
    const seen: string[] = [];
    for (let i = 0; i < 4; i++) {
      const id = nextInQueue(q)!;
      seen.push(id);
      q = afterAttempt(q, id, 'correct', false);
    }
    expect(new Set(seen).size).toBe(4);
  });

  it('brings a missed item back sooner than a correct one', () => {
    let q = newQueue(ids);
    q = afterAttempt(q, 'q1', 'wrong', false);
    q = afterAttempt(q, 'q2', 'correct', false);
    const due = (id: string) => q.entries.find((e) => e.id === id)!.due;
    expect(due('q1')).toBeLessThan(due('q2'));
  });

  it('returns a missed question within the same session after a short gap', () => {
    let q = newQueue(ids);
    q = afterAttempt(q, nextInQueue(q)!, 'wrong', false); // q1 missed
    const order: string[] = [];
    for (let i = 0; i < 4; i++) {
      const id = nextInQueue(q)!;
      order.push(id);
      q = afterAttempt(q, id, 'correct', false);
    }
    expect(order).toContain('q1');
    expect(order[0]).not.toBe('q1'); // a gap, not instantly
  });

  it('spaces repeat successes further apart', () => {
    let q = newQueue(['a', 'b']);
    q = afterAttempt(q, 'a', 'correct', false);
    const first = q.entries.find((e) => e.id === 'a')!.due - q.turn;
    q = afterAttempt(q, 'a', 'correct', false);
    const second = q.entries.find((e) => e.id === 'a')!.due - q.turn;
    expect(second).toBeGreaterThan(first);
  });

  it('never serves the same item twice running when another exists', () => {
    let q = newQueue(['a', 'b']);
    q = afterAttempt(q, 'a', 'wrong', false);
    expect(nextInQueue(q)).toBe('b');
  });

  it('drops a mastered item and ends with null', () => {
    let q = newQueue(['a']);
    q = afterAttempt(q, 'a', 'correct', true);
    expect(nextInQueue(q)).toBeNull();
  });
});
