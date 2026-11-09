/**
 * Varied praise (task 20.3). A stored pool of short, school-passable lines. The same line is never
 * played twice in a row. This is interface wording, not the tutor, so it is English. Rules only.
 */
export const PRAISE_POOL = [
  'Nice one.',
  'Spot on.',
  'That’s the one.',
  'Smooth.',
  'Nailed it.',
  'Yes, that works.',
  'Right first time.',
  'Look at you go.',
  'Easy, wasn’t it?',
  'Sorted.',
  'Clean answer.',
  'You’ve got this.',
] as const;

/** A praise line that is not `last`. With a one-line pool the only line is returned. */
export function pickPraise(last: string | null, random: () => number = Math.random, pool: readonly string[] = PRAISE_POOL): string {
  const choices = pool.length > 1 ? pool.filter((l) => l !== last) : pool;
  return choices[Math.min(choices.length - 1, Math.floor(random() * choices.length))];
}
