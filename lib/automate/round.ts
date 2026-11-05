/**
 * Hear-and-answer rounds (task 9.1). Each round covers every question, including the recycled one, in a
 * shuffled order that differs from the round before, at varied speeds so the student cannot lean on a
 * fixed order or a fixed pace. Pure given `random`.
 */
export const ROUND_SPEEDS = [1, 1.2, 0.7] as const;

export interface RoundItem {
  id: string;
  /** Speaking rate of the question audio: the provider's speed setting, as in the clip names. */
  speed: number;
}

function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** The order for a new round. If chance repeats the previous order, the first item moves to the end, so it always differs (given two or more questions). */
export function nextOrder(ids: readonly string[], previous: readonly string[] | null, random: () => number = Math.random): string[] {
  let order = shuffled(ids, random);
  if (ids.length > 1 && previous && previous.length === order.length && order.every((id, i) => id === previous[i])) {
    order = [...order.slice(1), order[0]];
  }
  return order;
}

/** Mostly real-test pace, some fast, some slow, and never one speed for the whole round (given three or more questions). */
export function planSpeeds(count: number, random: () => number = Math.random): number[] {
  const base = [ROUND_SPEEDS[0], ROUND_SPEEDS[1], ROUND_SPEEDS[0], ROUND_SPEEDS[1], ROUND_SPEEDS[2]];
  const speeds = Array.from({ length: count }, (_, i) => base[i % base.length]);
  return shuffled(speeds, random);
}

export function planRound(ids: readonly string[], previous: readonly string[] | null, random: () => number = Math.random): RoundItem[] {
  const order = nextOrder(ids, previous, random);
  const speeds = planSpeeds(order.length, random);
  return order.map((id, i) => ({ id, speed: speeds[i] }));
}
