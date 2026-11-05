import { describe, expect, it } from 'vitest';
import { buildPlan, LATE_DAYS, MAX_SESSION_MINUTES } from './plan';
import { DEFAULT_REMINDER, parsePrefs, reminderDue } from './reminders';
import { nextPhase, readiness, readinessPercent, type ReadinessInput } from './readiness';

const none: ReadinessInput = { answersConfirmed: 0, questionsMastered: 0, answersMemorised: 0, questionsAutomated: 0 };
const all: ReadinessInput = { answersConfirmed: 5, questionsMastered: 5, answersMemorised: 5, questionsAutomated: 5 };
const total = (p: ReturnType<typeof buildPlan>) => p.days.flatMap((d) => d.sessions).reduce((a, s) => a + s.minutes, 0);

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

describe('session plan', () => {
  it('fits the minutes per day and keeps every session short', () => {
    const plan = buildPlan({ progress: none, minutesPerDay: 15, daysLeft: 6 });
    expect(plan.mode).toBe('normal');
    for (const d of plan.days) {
      expect(d.sessions.reduce((a, s) => a + s.minutes, 0)).toBeLessThanOrEqual(15);
      for (const s of d.sessions) expect(s.minutes).toBeLessThanOrEqual(MAX_SESSION_MINUTES);
    }
    expect(plan.days.length).toBeLessThanOrEqual(6);
  });
  it('plans nothing for finished work and nothing after the test', () => {
    expect(buildPlan({ progress: all, minutesPerDay: 15, daysLeft: 6 }).days).toEqual([]);
    expect(buildPlan({ progress: none, minutesPerDay: 15, daysLeft: 0 }).mode).toBe('none');
  });
  it('redistributes after a missed day without alarming language', () => {
    const before = buildPlan({ progress: none, minutesPerDay: 20, daysLeft: 6 });
    const after = buildPlan({ progress: none, minutesPerDay: 20, daysLeft: 5 });
    expect(total(after)).toBe(total(before));
    expect(after.days.length).toBeLessThanOrEqual(5);
    expect(after.days[0].sessions.reduce((a, s) => a + s.minutes, 0)).toBeGreaterThanOrEqual(before.days[0].sessions.reduce((a, s) => a + s.minutes, 0));
    expect(after.message).not.toMatch(/miss|behind|late|fail|worry|panic|urgent|!/i);
  });
  it('says kindly when the days are full, and never plans above the minutes offered', () => {
    const plan = buildPlan({ progress: none, minutesPerDay: 5, daysLeft: 4 });
    expect(plan.tight).toBe(true);
    expect(plan.message).not.toMatch(/miss|behind|fail|worry|panic|urgent|!/i);
    for (const d of plan.days) expect(d.sessions.reduce((a, s) => a + s.minutes, 0)).toBeLessThanOrEqual(5);
  });
  it('late starter with two days left: short answers first, then rapid recall, shorter phases', () => {
    const late = buildPlan({ progress: none, minutesPerDay: 45, daysLeft: 2 });
    const normal = buildPlan({ progress: none, minutesPerDay: 45, daysLeft: LATE_DAYS + 1 });
    expect(late.mode).toBe('late');
    expect(late.focus).toEqual(['write', 'automate']);
    expect(late.days[0].sessions[0].phase).toBe('write');
    const phases = late.days.flatMap((d) => d.sessions.map((s) => s.phase));
    expect(phases).toContain('automate');
    const minutesIn = (p: typeof late, phase: string) => p.days.flatMap((d) => d.sessions).filter((s) => s.phase === phase).reduce((a, s) => a + s.minutes, 0);
    expect(minutesIn(late, 'understand')).toBeLessThan(minutesIn(normal, 'understand'));
    expect(minutesIn(late, 'automate')).toBeGreaterThan(minutesIn(normal, 'automate'));
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
