/**
 * The ladder's "day": whole days since 1 January 2026 in UK time. The next-day check opens when this number is higher
 * than the day of the last unaided run, so it opens at UK midnight, not 24 hours later.
 */
const EPOCH = Date.UTC(2026, 0, 1);

export function ladderDay(now: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const n = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  return Math.round((Date.UTC(n('year'), n('month') - 1, n('day')) - EPOCH) / 86_400_000) + 1;
}

/** Whole days from today to a date such as a test date (YYYY-MM-DD), never below zero. */
export function daysUntil(date: string, now: Date = new Date()): number {
  const [y, m, d] = date.slice(0, 10).split('-').map(Number);
  const target = Math.round((Date.UTC(y, m - 1, d) - EPOCH) / 86_400_000) + 1;
  return Math.max(0, target - ladderDay(now));
}
