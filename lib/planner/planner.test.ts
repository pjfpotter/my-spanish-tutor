import { describe, expect, it } from 'vitest';
import { nextPhase, readiness, readinessPercent, type ReadinessInput } from './readiness';

const none: ReadinessInput = { answersConfirmed: 0, questionsMastered: 0, answersMemorised: 0, questionsAutomated: 0 };
const all: ReadinessInput = { answersConfirmed: 5, questionsMastered: 5, answersMemorised: 5, questionsAutomated: 5 };

describe('readiness', () => {
  it('runs from 0 to 100 as the three measures fill', () => {
    expect(readinessPercent(none)).toBe(0);
    expect(readinessPercent(all)).toBe(100);
    expect(readinessPercent({ ...none, questionsMastered: 5 })).toBe(33);
    expect(readinessPercent({ ...none, questionsMastered: 5, answersMemorised: 5 })).toBe(67);
  });
  it('does not change when answers are only written', () => {
    expect(readinessPercent({ ...none, answersConfirmed: 5 })).toBe(0);
  });
  it('ignores values outside 0 to 5', () => {
    expect(readinessPercent({ ...all, questionsMastered: 9, answersMemorised: -2 })).toBe(67);
  });
  it('names the next action in order', () => {
    expect(nextPhase(none)).toBe('understand');
    expect(nextPhase({ ...none, questionsMastered: 5 })).toBe('write');
    expect(nextPhase({ ...none, questionsMastered: 5, answersConfirmed: 5 })).toBe('memorise');
    expect(nextPhase({ ...all, questionsAutomated: 2 })).toBe('automate');
    expect(nextPhase(all)).toBeNull();
  });
});
