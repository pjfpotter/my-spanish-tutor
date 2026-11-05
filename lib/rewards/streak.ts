/**
 * The daily streak, with a freeze that protects it on a missed day (task 13.3). There are no lives or hearts and
 * a missed day never takes progress away. All dates are UTC calendar days as `YYYY-MM-DD`.
 */
export const dayBefore = (day: string, n = 1): string => new Date(Date.parse(day) - n * 86_400_000).toISOString().slice(0, 10);
export const dayOf = (d: Date): string => d.toISOString().slice(0, 10);

/** Days in a row the student practised, counting back from today (or from yesterday if they have not practised yet today). Frozen days keep the chain but do not add to the count. */
export function streakFrom(practised: ReadonlySet<string>, frozen: ReadonlySet<string>, today: string): number {
  let day = practised.has(today) ? today : dayBefore(today);
  let count = 0;
  while (practised.has(day) || frozen.has(day)) {
    if (practised.has(day)) count++;
    day = dayBefore(day);
    if (count > 3650) break;
  }
  return count;
}

/**
 * Which missed days to freeze now. Looks back from yesterday over the days missed in a row. If the run of missed
 * days sits right after a practised or frozen day, and there are enough freezes to cover all of it, those days are
 * frozen and the streak carries on. If there are not enough, nothing is spent: the streak ends and the freezes are kept.
 */
export function daysToFreeze(practised: ReadonlySet<string>, frozen: ReadonlySet<string>, today: string, freezesAvailable: number): string[] {
  const missed: string[] = [];
  let day = dayBefore(today);
  while (!practised.has(day) && !frozen.has(day)) {
    missed.push(day);
    day = dayBefore(day);
    if (missed.length > MAX_LOOKBACK) return []; // long gone: no streak to protect
  }
  if (!missed.length || missed.length > freezesAvailable) return [];
  return missed;
}

const MAX_LOOKBACK = 7;
