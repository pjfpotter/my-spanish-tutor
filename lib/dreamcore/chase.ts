/**
 * The chase. `gap` is how far away the thing is, from 0 (it has you) to 1 (far behind). It closes by itself, slows
 * while the student is trying (they are heard), and is pushed back by every bit said. There is no timeout on a
 * door and no penalty for a recogniser that fails: with no microphone the chase simply waits.
 */
export interface Chase { gap: number; caught: boolean }

export const START_GAP = 0.8;
export const PUSH = 0.2;
/** How fast the gap closes while nothing is heard, per second, at a door index. */
export const closingRate = (doorIndex: number): number => 0.012 + 0.0035 * doorIndex;
/** While the student is heard it closes this much more slowly. */
export const TRYING_FACTOR = 0.25;

export const startChase = (): Chase => ({ gap: START_GAP, caught: false });

export interface Tick { dt: number; doorIndex: number; trying: boolean; micOk: boolean; paused: boolean }

export function tick(c: Chase, t: Tick): Chase {
  if (c.caught || t.paused || !t.micOk) return c;
  const rate = closingRate(t.doorIndex) * (t.trying ? TRYING_FACTOR : 1);
  const gap = Math.max(0, c.gap - rate * t.dt);
  return { gap, caught: gap <= 0 };
}

/** A bit was said: the thing is pushed back. */
export const push = (c: Chase, bits: number): Chase => ({ ...c, gap: Math.min(1, c.gap + PUSH * Math.min(2, Math.max(0, bits) / 2 + 0.5)) });

/** Roughly when the thing makes the student turn round: when it is near and not too often. */
export function wantsLookBehind(c: Chase, secondsSinceLast: number, rand: number): boolean {
  return !c.caught && c.gap < 0.6 && secondsSinceLast > 14 && rand < 0.01;
}
