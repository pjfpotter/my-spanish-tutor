import { describe, expect, it } from 'vitest';
import { FREE_TIME } from '../course/calibration';
import { analyse, MAX_STEPS } from './analysis';
import { assessAnswer } from './rubric';

const cal = FREE_TIME;
const teacher = cal.examples.filter((e) => e.source === 'teacher').map((e) => e.text);

describe('the analysis of an answer (26.1d)', () => {
  it('adds up to the value the student saw, for every teacher example', () => {
    for (const text of teacher) {
      const a = analyse(cal, text);
      expect(a.steps.reduce((n, s) => n + s.value, 0) + a.rest.value).toBe(assessAnswer(cal, text).value);
      expect(a.total).toBe(assessAnswer(cal, text).value);
    }
  });

  it('is a short praise session: at most five highlights, richest first, with the rest counted', () => {
    const rich = analyse(cal, teacher[2]);
    expect(rich.steps).toHaveLength(MAX_STEPS);
    const values = rich.steps.map((s) => s.value);
    expect(values).toEqual([...values].sort((a, b) => b - a));
    expect(rich.rest.count).toBeGreaterThan(0);
  });

  it('names each feature in English with an exclamation, and points at the words that earn it', () => {
    const text = 'Me gusta bailar porque es divertido, a veces.';
    const a = analyse(cal, text);
    const time = a.steps.find((s) => s.id === 'E2')!;
    expect(time.label).toBe('a time phrase!');
    expect(text.slice(time.from!, time.to!)).toBe('a veces');
    const frame = a.steps.find((s) => s.id === 'frame')!;
    expect(text.slice(frame.from!, frame.to!)).toBe('Me gusta bailar porque');
  });

  it('has nothing to praise in an answer that is worth nothing yet', () => {
    expect(analyse(cal, 'Me gusta bailar.')).toMatchObject({ steps: [], total: 0, rest: { count: 0, value: 0 } });
    expect(analyse(cal, '').steps).toEqual([]);
  });

  it('never mentions a grade or a level', () => {
    expect(JSON.stringify(analyse(cal, teacher[1]))).not.toMatch(/grade|level|rock solid|stepping out|showing off/i);
  });
});
