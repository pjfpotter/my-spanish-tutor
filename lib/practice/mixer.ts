/**
 * The session mixer (task 21.4). A session mixes task types with a rising difficulty curve, never repeats
 * one type more than three times in a row, and ends with spoken recall. Pure given `random`.
 */
export const TASK_TYPES = ['hear_choose', 'match_pairs', 'tap_hear', 'fill_gap', 'scramble', 'say_aloud'] as const;
export type TaskType = (typeof TASK_TYPES)[number];

/** Easiest first. A type unlocks later in the session the higher it sits. */
const ORDER: readonly TaskType[] = TASK_TYPES;
export const MAX_RUN = 3;

export function planMix(count: number, available: readonly TaskType[] = TASK_TYPES, random: () => number = Math.random): TaskType[] {
  const types = ORDER.filter((t) => available.includes(t));
  if (count <= 0 || !types.length) return [];
  const spoken: TaskType = types.includes('say_aloud') ? 'say_aloud' : types[types.length - 1];
  const out: TaskType[] = [];
  for (let i = 0; i < count; i++) {
    if (i === count - 1) {
      out.push(spoken);
      continue;
    }
    // The pool of unlocked types grows from two to all of them as the session goes on.
    const unlocked = Math.min(types.length, 2 + Math.floor((i / Math.max(1, count - 1)) * (types.length - 1)));
    let pool = types.slice(0, Math.max(1, unlocked)).filter((t) => t !== 'say_aloud' || types.length === 1);
    if (!pool.length) pool = types.slice(0, 1);
    const run = out.length >= MAX_RUN && out.slice(-MAX_RUN).every((t) => t === out[out.length - 1]) ? out[out.length - 1] : null;
    const allowed = pool.filter((t) => t !== run);
    let choices = allowed.length ? allowed : pool;
    // Make sure three different types appear: from the third slot, prefer one not yet used.
    const unseen = choices.filter((t) => !out.includes(t));
    if (i >= 2 && new Set(out).size < 3 && unseen.length) choices = unseen;
    out.push(choices[Math.min(choices.length - 1, Math.floor(random() * choices.length))]);
  }
  return out;
}
