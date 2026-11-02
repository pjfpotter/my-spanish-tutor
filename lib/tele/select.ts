import { linesFor, type PhraseLine, type Situation } from './phrase-bank';

/**
 * Chooses a stock line for a situation (task 12.3). Pure and deterministic given `random`, so the
 * rules are unit tested. No language model, no student data: the situation alone picks the line.
 */
export function selectLine(
  situation: Situation,
  opts: { lastId?: string | null; random?: () => number; bank?: PhraseLine[] } = {},
): PhraseLine {
  const pool = opts.bank ? opts.bank.filter((l) => l.situation === situation) : linesFor(situation);
  if (!pool.length) throw new Error(`no phrase-bank lines for situation "${situation}"`);
  // Never the line just played, unless it is the only one there is.
  const choices = pool.length > 1 ? pool.filter((l) => l.id !== opts.lastId) : pool;
  const random = opts.random ?? Math.random;
  return choices[Math.min(choices.length - 1, Math.floor(random() * choices.length))];
}

/** Days left to the test decide which countdown line fits. */
export function daysSituation(daysToTest: number): Situation {
  if (daysToTest < 0) return 'after_test';
  if (daysToTest === 0) return 'test_day';
  return daysToTest <= 7 ? 'days_near' : 'days_far';
}
