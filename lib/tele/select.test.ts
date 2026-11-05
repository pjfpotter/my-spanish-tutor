import { describe, expect, it } from 'vitest';
import { PHRASE_BANK, SITUATIONS } from './phrase-bank';
import { daysSituation, selectLine } from './select';

describe('selectLine', () => {
  it('returns a line for the requested situation', () => {
    for (const s of SITUATIONS) expect(selectLine(s).situation).toBe(s);
  });

  it('never repeats the line just played, whatever the random roll', () => {
    const correct = PHRASE_BANK.filter((l) => l.situation === 'correct');
    for (const last of correct) {
      for (const roll of [0, 0.25, 0.5, 0.75, 0.999]) {
        expect(selectLine('correct', { lastId: last.id, random: () => roll }).id).not.toBe(last.id);
      }
    }
  });

  it('reaches every line eventually', () => {
    const seen = new Set<string>();
    let last: string | null = null;
    for (let i = 0; i < 400; i++) {
      const l = selectLine('poke', { lastId: last });
      seen.add(l.id);
      last = l.id;
    }
    expect(seen.size).toBe(PHRASE_BANK.filter((l) => l.situation === 'poke').length);
  });

  it('plays the only line again when a situation has just one', () => {
    expect(selectLine('test_day', { lastId: 'hoy-es-el-dia' }).id).toBe('hoy-es-el-dia');
  });

  it('throws plainly for a situation with no lines', () => {
    expect(() => selectLine('correct', { bank: [] })).toThrow(/no phrase-bank lines/);
  });
});

describe('daysSituation', () => {
  it('maps days left to a countdown situation', () => {
    expect(daysSituation(30)).toBe('days_far');
    expect(daysSituation(8)).toBe('days_far');
    expect(daysSituation(7)).toBe('days_near');
    expect(daysSituation(1)).toBe('days_near');
    expect(daysSituation(0)).toBe('test_day');
    expect(daysSituation(-1)).toBe('after_test');
  });
});
