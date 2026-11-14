import { describe, expect, it } from 'vitest';
import { isStalled, STALL } from './simplify';

describe('when an answer counts as stalled', () => {
  it('needs enough attempts, all the recent ones short of the bar, and no mastery', () => {
    const bad = Array(STALL.minAttempts).fill(40);
    expect(isStalled(bad, false)).toBe(true);
    expect(isStalled(bad.slice(1), false)).toBe(false); // too few attempts to say
    expect(isStalled(bad, true)).toBe(false); // mastered
    expect(isStalled([...bad, 95], false)).toBe(false); // a recent good go means it is moving
  });

  it('is not stalled by early misses followed by a run of good attempts', () => {
    expect(isStalled([10, 10, 10, 90, 90, 90, 90, 90], false)).toBe(false);
  });
});
