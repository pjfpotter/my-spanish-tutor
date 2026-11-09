import { describe, expect, it } from 'vitest';
import { DEFAULT_REMINDER, parsePrefs, reminderDue } from './reminders';
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
  it('always explains itself in Spanish and English', () => {
    for (const p of [none, all, { ...none, questionsMastered: 5, answersConfirmed: 5 }]) {
      const r = readiness(p);
      expect(r.nextAction.es.length).toBeGreaterThan(0);
      expect(r.nextAction.en.length).toBeGreaterThan(0);
    }
  });
});

describe('reminders', () => {
  const on = { enabled: true, time: '17:00' };
  const at = (h: number, m = 0) => new Date(2026, 10, 5, h, m);
  const base = { prefs: on, permission: 'granted' as const, now: at(18), lastShownDate: null, daysToTest: 3 };
  it('sends nothing without opt-in, whatever the permission or time', () => {
    expect(DEFAULT_REMINDER.enabled).toBe(false);
    expect(reminderDue({ ...base, prefs: DEFAULT_REMINDER })).toBe(false);
    expect(reminderDue({ ...base, prefs: parsePrefs(null) })).toBe(false);
    expect(reminderDue({ ...base, prefs: parsePrefs('not json') })).toBe(false);
  });
  it('needs the device to agree', () => {
    for (const permission of ['denied', 'default', 'unsupported'] as const) expect(reminderDue({ ...base, permission })).toBe(false);
  });
  it('fires once a day, at or after the chosen time', () => {
    expect(reminderDue({ ...base, now: at(16, 59) })).toBe(false);
    expect(reminderDue({ ...base, now: at(17) })).toBe(true);
    expect(reminderDue({ ...base, lastShownDate: '2026-11-05' })).toBe(false);
    expect(reminderDue({ ...base, lastShownDate: '2026-11-04' })).toBe(true);
  });
  it('stops after the test date', () => {
    expect(reminderDue({ ...base, daysToTest: -1 })).toBe(false);
    expect(reminderDue({ ...base, daysToTest: 0 })).toBe(true);
  });
  it('rejects a bad time in saved settings', () => {
    expect(parsePrefs('{"enabled":true,"time":"25:99"}')).toEqual(DEFAULT_REMINDER);
  });
});
