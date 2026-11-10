import { describe, expect, it } from 'vitest';
import { SEED_COURSE } from '../course/seed';
import { answerPieces, availableTypes, buildTask, type ChoiceTask, type ScrambleTask, type MatchTask } from './tasks';

const ANSWER = SEED_COURSE.modelAnswers.find((a) => a.questionPosition === 1 && a.level === 'rock_solid')!.text;
const pool = SEED_COURSE.chunks;

describe('answer pieces', () => {
  const pieces = answerPieces(ANSWER, pool);
  it('splits an answer into its chunks in order, covering every word once', () => {
    expect(pieces.length).toBeGreaterThanOrEqual(3);
    expect(pieces.map((p) => p.text).join(' ').toLowerCase().replace(/[.,;:!?¡¿]/g, '')).toBe(ANSWER.toLowerCase().replace(/[.,;:!?¡¿]/g, '').replace(/\s+/g, ' ').trim());
    expect(pieces.map((p) => p.id)).toEqual(pieces.map((_, i) => String(i)));
  });
  it('gives matched chunks an English gloss and a kind, and plain words none', () => {
    const odd = answerPieces('Zzz me gustan las películas de acción', pool);
    expect(odd[0]).toMatchObject({ text: 'Zzz', english: '', kind: 'other' });
    expect(odd.some((p) => p.english)).toBe(true);
  });
  it('splits an answer even when nothing matches', () => {
    expect(answerPieces('uno dos tres', []).map((p) => p.text)).toEqual(['uno dos tres']);
  });
});

describe('building tasks', () => {
  const pieces = answerPieces(ANSWER, pool);
  const seeded = (n: number) => { let s = n; return () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296); };

  it('offers saying it aloud always, and the others when the answer has enough pieces', () => {
    expect(availableTypes(pieces, pool)).toContain('say_aloud');
    expect(availableTypes([], pool)).toEqual(['say_aloud']);
    expect(availableTypes(pieces, pool).length).toBeGreaterThan(3);
  });

  it('choice tasks hold the right option once, at the reported place, with no picture field', () => {
    for (const type of ['hear_choose', 'tap_hear', 'fill_gap'] as const) {
      for (let s = 1; s <= 30; s++) {
        const t = buildTask(type, pieces, pool, 'x', seeded(s)) as ChoiceTask;
        expect(t.options).toHaveLength(3);
        expect(new Set(t.options).size).toBe(3);
        expect(t.options[t.correctIndex]).toBeTruthy();
        expect(Object.keys(t)).not.toContain('picture');
      }
    }
  });

  it('fill the gap leaves the answer text around exactly one missing piece', () => {
    const t = buildTask('fill_gap', pieces, pool, 'x', seeded(3)) as ChoiceTask;
    const gap = t.options[t.correctIndex];
    expect(`${t.before} ${gap} ${t.after}`.replace(/\s+/g, ' ').trim()).toBe(t.answer);
  });

  it('scramble never starts in the right order and uses every piece once', () => {
    for (let s = 1; s <= 50; s++) {
      const t = buildTask('scramble', pieces, pool, 'x', seeded(s)) as ScrambleTask;
      expect(t.tiles.map((x) => x.id)).not.toEqual(t.answer);
      expect([...t.tiles.map((x) => x.id)].sort()).toEqual([...t.answer].sort());
    }
  });

  it('match pairs makes three or four distinct glossed pairs', () => {
    const t = buildTask('match_pairs', pieces, pool, 'x', seeded(2)) as MatchTask | null;
    if (!t) return expect(pieces.filter((p) => p.english).length).toBeLessThan(3);
    expect(t.pairs.length).toBeGreaterThanOrEqual(3);
    expect(new Set(t.pairs.map((p) => p.spanish)).size).toBe(t.pairs.length);
    expect(t.spanishOrder.sort()).toEqual(t.englishOrder.sort());
  });

  it('returns null rather than a broken task when there is not enough to build it', () => {
    expect(buildTask('scramble', pieces.slice(0, 2), pool, 'x')).toBeNull();
    expect(buildTask('fill_gap', pieces, pool.slice(0, 2), 'x')).toBeNull();
  });
});
