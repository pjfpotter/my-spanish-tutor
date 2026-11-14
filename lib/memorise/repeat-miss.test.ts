import { describe, expect, it } from 'vitest';
import { newRepeatMiss, recordAttempt, REPEAT_MISS_ATTEMPTS } from './repeat-miss';

const go = (lit: boolean) => [{ word: 'Me', lit: true }, { word: 'divertidas.', lit }];

describe('repeat counter for pronunciation support (task 27.6)', () => {
  it('offers the word on the third unlit attempt, not before', () => {
    const r = newRepeatMiss();
    expect(REPEAT_MISS_ATTEMPTS).toBe(3);
    expect(recordAttempt(r, 0, go(false))).toBeNull();
    expect(recordAttempt(r, 0, go(false))).toBeNull();
    expect(recordAttempt(r, 0, go(false))).toBe('divertidas');
  });
  it('offers a word once per lesson', () => {
    const r = newRepeatMiss();
    for (let i = 0; i < 3; i++) recordAttempt(r, 0, go(false));
    expect(recordAttempt(r, 0, go(false))).toBeNull();
  });
  it('starts again when the word lights', () => {
    const r = newRepeatMiss();
    recordAttempt(r, 0, go(false));
    recordAttempt(r, 0, go(false));
    recordAttempt(r, 0, go(true));
    expect(recordAttempt(r, 0, go(false))).toBeNull();
    expect(recordAttempt(r, 0, go(false))).toBeNull();
    expect(recordAttempt(r, 0, go(false))).toBe('divertidas');
  });
  it('counts a word separately in each answer', () => {
    const r = newRepeatMiss();
    recordAttempt(r, 0, go(false));
    recordAttempt(r, 1, go(false));
    recordAttempt(r, 0, go(false));
    expect(recordAttempt(r, 1, go(false))).toBeNull();
  });
  it('counts a word said twice in one answer once, and ignores one-letter words', () => {
    const r = newRepeatMiss();
    const twice = [{ word: 'me', lit: false }, { word: 'me', lit: false }, { word: 'y', lit: false }];
    expect(recordAttempt(r, 0, twice)).toBeNull();
    expect(recordAttempt(r, 0, twice)).toBeNull();
    expect(recordAttempt(r, 0, twice)).toBe('me');
    expect(r.unlit.has('0:y')).toBe(false);
  });
});
