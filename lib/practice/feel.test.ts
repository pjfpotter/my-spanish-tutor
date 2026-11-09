import { describe, expect, it } from 'vitest';
import { PRAISE_POOL, pickPraise } from './praise';
import { answerCurrent, currentEntry, DEFAULT_REQUEUE, MISTAKE_LABEL, newPracticeQueue } from './requeue';
import { NO_COMBO, stepCombo, type Outcome } from './combo';

describe('varied praise', () => {
  it('never repeats a line twice in a row, whatever the dice say', () => {
    let last: string | null = null;
    for (let i = 0; i < 400; i++) {
      const line = pickPraise(last);
      expect(line).not.toBe(last);
      last = line;
    }
  });
  it('even when the random source always picks the first choice', () => {
    expect(pickPraise(PRAISE_POOL[0], () => 0)).not.toBe(PRAISE_POOL[0]);
  });
  it('returns the only line in a one-line pool', () => {
    expect(pickPraise('x', Math.random, ['x'])).toBe('x');
  });
});

describe('mistake re-queue', () => {
  it('puts a missed item back a few places on, labelled as a previous mistake', () => {
    let q = newPracticeQueue(['a', 'b', 'c', 'd', 'e']);
    q = answerCurrent(q, false);
    expect(q.upcoming.map((e) => e.id)).toEqual(['b', 'c', 'd', 'a', 'e']);
    expect(q.upcoming.find((e) => e.id === 'a')?.mistake).toBe(true);
    expect(MISTAKE_LABEL).toBe('Previous mistake');
  });
  it('drops a correct item for good', () => {
    const q = answerCurrent(newPracticeQueue(['a', 'b']), true);
    expect(q.upcoming.map((e) => e.id)).toEqual(['b']);
  });
  it('returns to the end when the queue is short', () => {
    const q = answerCurrent(newPracticeQueue(['a', 'b']), false);
    expect(q.upcoming.map((e) => e.id)).toEqual(['b', 'a']);
  });
  it('stops bringing one item back after the cap, so a session always ends', () => {
    let q = newPracticeQueue(['a']);
    for (let i = 0; i < DEFAULT_REQUEUE.maxReturns; i++) q = answerCurrent(q, false);
    expect(currentEntry(q)?.id).toBe('a');
    q = answerCurrent(q, false);
    expect(currentEntry(q)).toBeNull();
  });
  it('can end on a success: a returned item answered correctly is the last thing', () => {
    let q = newPracticeQueue(['a', 'b']);
    q = answerCurrent(q, false);
    q = answerCurrent(q, true);
    expect(currentEntry(q)).toEqual({ id: 'a', mistake: true });
    q = answerCurrent(q, true);
    expect(currentEntry(q)).toBeNull();
  });
});

describe('combo', () => {
  const run = (outcomes: Outcome[], every = 5) => {
    let s = NO_COMBO;
    return outcomes.map((o) => {
      const r = stepCombo(s, o, every);
      s = r.state;
      return r.combo;
    });
  };
  it('fires on the fifth correct in a row', () => {
    expect(run(Array(5).fill('correct'))).toEqual([false, false, false, false, true]);
  });
  it('a wrong answer ends the run', () => {
    expect(run(['correct', 'correct', 'wrong', 'correct', 'correct', 'correct', 'correct']).includes(true)).toBe(false);
  });
  it('skipped and assisted items neither count nor break a run', () => {
    expect(run(['correct', 'skipped', 'correct', 'assisted', 'correct', 'skipped', 'correct', 'correct'])).toEqual([false, false, false, false, false, false, false, true]);
  });
  it('starts a fresh run after a combo, and the size is configurable', () => {
    expect(run(Array(6).fill('correct'), 3)).toEqual([false, false, true, false, false, true]);
  });
});

import { nextTake, soundAllowed, soundOn, SFX_FILES } from './sound';

describe('interface sounds', () => {
  it('plays only with sound on and calm off', () => {
    expect(soundAllowed({ soundOn: true, calm: false })).toBe(true);
    expect(soundAllowed({ soundOn: false, calm: false })).toBe(false);
    expect(soundAllowed({ soundOn: true, calm: true })).toBe(false);
    expect(soundOn(null)).toBe(true);
    expect(soundOn('off')).toBe(false);
  });
  it('never plays the same take twice in a row', () => {
    let last: string | null = null;
    for (let i = 0; i < 200; i++) {
      const f = nextTake('correct', last);
      expect(f).not.toBe(last);
      last = f;
    }
    expect(nextTake('combo', 'combo-1.mp3')).toBe('combo-1.mp3');
  });
  it('lists only takes that exist on disk', async () => {
    const { existsSync } = await import('node:fs');
    for (const files of Object.values(SFX_FILES)) for (const f of files) expect(existsSync(`public/audio/sfx/${f}`), f).toBe(true);
  });
});
