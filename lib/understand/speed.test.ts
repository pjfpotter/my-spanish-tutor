import { describe, expect, it } from 'vitest';
import { buildOptions, nextSpeed } from './speed';

describe('nextSpeed', () => {
  it('starts slow for a question never seen, or wherever the caller says', () => {
    expect(nextSpeed(null)).toBe('slow');
    expect(nextSpeed(null, 'normal')).toBe('normal');
  });

  it('moves faster after a correct answer, up to fast', () => {
    expect(nextSpeed({ speed: 'slow', outcome: 'correct' })).toBe('normal');
    expect(nextSpeed({ speed: 'normal', outcome: 'correct' })).toBe('fast');
    expect(nextSpeed({ speed: 'fast', outcome: 'correct' })).toBe('fast');
  });

  it('moves slower after a miss or an assisted attempt, down to slow', () => {
    expect(nextSpeed({ speed: 'fast', outcome: 'wrong' })).toBe('normal');
    expect(nextSpeed({ speed: 'normal', outcome: 'assisted' })).toBe('slow');
    expect(nextSpeed({ speed: 'slow', outcome: 'wrong' })).toBe('slow');
  });
});

describe('buildOptions', () => {
  const qs = [1, 2, 3, 4, 5].map((n) => ({ id: `q${n}`, english: `Meaning ${n}` }));

  it('has the right meaning plus two wrong ones, all different', () => {
    const o = buildOptions(qs, 'q3');
    expect(o).toHaveLength(3);
    expect(o.map((x) => x.id)).toContain('q3');
    expect(new Set(o.map((x) => x.text)).size).toBe(3);
  });

  it('puts the right answer in different places', () => {
    const positions = new Set<number>();
    for (let i = 0; i < 100; i++) positions.add(buildOptions(qs, 'q1').findIndex((o) => o.id === 'q1'));
    expect(positions.size).toBe(3);
  });

  it('never offers a wrong meaning identical to the right one', () => {
    const dup = [...qs, { id: 'q6', english: 'Meaning 1' }];
    for (let i = 0; i < 50; i++) expect(new Set(buildOptions(dup, 'q1').map((o) => o.text)).size).toBe(3);
  });

  it('rejects an unknown question', () => {
    expect(() => buildOptions(qs, 'nope')).toThrow();
  });
});
