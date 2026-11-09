import { SPEEDS, type SpeedName } from '../audio/speeds';
import type { Db } from '../db/types';
import type { CauseTag } from '../events/attempts';
import { nextSpeed, SPEED_ORDER } from '../understand/speed';
import { knownAtStart, loadBaseline } from './baseline';

/** What the planner needs to know about one past attempt at an item. Oldest first when in a list. */
export interface PastAttempt {
  outcome: 'correct' | 'wrong' | 'assisted' | 'skipped' | 'blank';
  speed: number | null;
  assisted: boolean;
  causeTags: CauseTag[];
}

/**
 * The cause tags that still apply to an item: those on its most recent failed attempt, until the
 * student gets it right (unassisted) afterwards. A fixed problem stops steering practice.
 */
export function activeTags(attempts: readonly PastAttempt[]): CauseTag[] {
  for (let i = attempts.length - 1; i >= 0; i--) {
    const a = attempts[i];
    if (a.outcome === 'correct' && !a.assisted) return [];
    if (a.causeTags.length) return a.causeTags;
  }
  return [];
}

export interface Support {
  /** Where the first presentation starts. */
  startSpeed: SpeedName;
  /** Show the key word with its meaning before the question plays (for words not known or not linked to their sound). */
  preview: boolean;
  /** This item has a live cause tag, so it goes first in the session. */
  needsFocus: boolean;
}

const nameForSpeed = (speed: number | null): SpeedName | null =>
  speed === null ? null : SPEED_ORDER.reduce((best, n) => (Math.abs(SPEEDS[n] - speed) < Math.abs(SPEEDS[best] - speed) ? n : best), SPEED_ORDER[0]);

/**
 * How to practise one question by ear (learning-diagnostics: Diagnostics drive practice).
 *  - No history: slow, or normal if the student already understood it cold at the starting-point check.
 *  - Otherwise carry on from the last attempt: a step faster after a success, a step slower after a miss.
 *  - "Too fast" starts a step slower than that, and never above normal.
 *  - "Word not known" and "sound-spelling gap" preview the key word first.
 */
export function supportFor(i: { history: readonly PastAttempt[]; knownAtStart: boolean }): Support {
  const tags = activeTags(i.history);
  const last = i.history.at(-1);
  const lastSpeed = last ? nameForSpeed(last.speed) : null;
  let start: SpeedName = last && lastSpeed
    ? nextSpeed({ speed: lastSpeed, outcome: last.outcome === 'correct' && !last.assisted ? 'correct' : last.outcome === 'wrong' ? 'wrong' : 'assisted' })
    : i.knownAtStart ? 'normal' : 'slow';
  if (tags.includes('too_fast')) start = SPEED_ORDER[Math.max(0, Math.min(SPEED_ORDER.indexOf(start), SPEED_ORDER.indexOf('normal')) - 1)];
  if (tags.includes('word_not_known') || tags.includes('sound_spelling_gap')) start = 'slow';
  return { startSpeed: start, preview: tags.includes('word_not_known') || tags.includes('sound_spelling_gap'), needsFocus: tags.length > 0 };
}

/** Items with live problems come first; otherwise the order is unchanged. */
export function prioritise<T>(items: readonly T[], needsFocus: (item: T) => boolean): T[] {
  return [...items.filter(needsFocus), ...items.filter((x) => !needsFocus(x))];
}

/** The last few attempts per item for a phase, oldest first, for the planner. */
export async function loadHistory(db: Db, profileId: string, phase: string, perItem = 8): Promise<Map<string, PastAttempt[]>> {
  const { rows } = await db.query<{ item_id: string; outcome: PastAttempt['outcome']; speed: string | null; assisted: boolean; cause_tags: CauseTag[] }>(
    `select item_id, outcome, speed, assisted, cause_tags from attempts where profile_id = $1 and phase = $2 order by created_at, id`,
    [profileId, phase],
  );
  const map = new Map<string, PastAttempt[]>();
  for (const r of rows) {
    const list = map.get(r.item_id) ?? [];
    list.push({ outcome: r.outcome, speed: r.speed === null ? null : Number(r.speed), assisted: r.assisted, causeTags: r.cause_tags });
    map.set(r.item_id, list.slice(-perItem));
  }
  return map;
}

/** Support for every question of a student, from their history, starting-point check. */
export async function planUnderstand(db: Db, profileId: string, questionIds: string[]): Promise<Map<string, Support>> {
  const history = await loadHistory(db, profileId, 'understand');
  const known = knownAtStart(await loadBaseline(db, profileId));
  return new Map(questionIds.map((id) => [id, supportFor({ history: history.get(id) ?? [], knownAtStart: known.has(id) })]));
}
