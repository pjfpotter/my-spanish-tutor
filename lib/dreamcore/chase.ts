/**
 * The chase. `gap` is how far away the thing is, from 0 (it has you) to 1 (far behind). It closes by itself, slows
 * while the student is trying (matched words, not just noise), and is pushed back by every bit said. There is no timeout on a
 * door and no penalty for a recogniser that fails: with no microphone the chase simply waits.
 */
export interface Chase { gap: number; caught: boolean }

export const START_GAP = 0.8;
export const PUSH = 0.2;
/**
 * The no-help stage has no fixed length, so the rate stops rising at the last door of the old twelve-door run. Tuning
 * there is unchanged, and a student who needs more no-help doors is never chased harder than at the twelfth.
 */
export const RATE_CAP_INDEX = 11;
/**
 * How fast the gap closes while nothing matches, per second, at a door index. Tuned on paper for roughly eight seconds a
 * door: early doors are comfortable for a student who answers at once, and from about the sixth the gap shrinks even for
 * them unless they are quick, which is what makes the pressure mount (Dolores's test: it was too easy).
 */
export const closingRate = (doorIndex: number): number => 0.018 + 0.0045 * Math.min(doorIndex, RATE_CAP_INDEX);
/** While the student is saying words that match the door it closes this much more slowly. */
export const TRYING_FACTOR = 0.25;
/** How long after a matched word the slowdown lasts, in seconds. Noise, coughs and wrong words never start it. */
export const TRYING_WINDOW = 2;
/** True while the last matched word is recent. Only matched progress counts: sound alone does not hold it back. */
export const isTrying = (now: number, lastProgress: number): boolean => now - lastProgress < TRYING_WINDOW;

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

/** The gap below which fear starts to build. Above it the corridor is only uneasy. */
export const FEAR_FROM = 0.67;
/** How afraid the screen should be, 0 to 1: shake, glitch, flicker and heartbeat all follow this one curve. */
export const fear = (gap: number): number => Math.min(1, Math.max(0, (FEAR_FROM - gap) / FEAR_FROM)) ** 1.5;

/** Seconds after a look-behind before another can start. */
export const LOOK_COOLDOWN = 10;
/** The chance per second that the thing makes the student turn round: rare when far, common when close. */
export const lookChance = (gap: number, secondsSinceLast: number): number => (secondsSinceLast < LOOK_COOLDOWN ? 0 : 0.02 + 0.28 * fear(gap));
/** One frame's dice roll for turning round. `rand` is 0 to 1 and `dt` the frame length in seconds. */
export const wantsLookBehind = (c: Chase, secondsSinceLast: number, dt: number, rand: number): boolean =>
  !c.caught && rand < lookChance(c.gap, secondsSinceLast) * dt;
