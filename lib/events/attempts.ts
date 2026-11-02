import type { Db } from '../db/types';
import { awardCoins, COIN_AMOUNTS, attemptAwardsToday } from '../coins/ledger';
import { DEFAULT_MASTERY, isMastered, NO_MASTERY, recordAttempt as applyToMastery, type MasteryState } from '../mastery/mastery';

/** The closed list of cause tags (design D11). Keeping it closed keeps analytics and the teacher view simple. */
export const CAUSE_TAGS = [
  // Comprehension
  'too_fast', 'word_not_known', 'sound_spelling_gap', 'thrown_by_context',
  // Recall
  'not_known_well_enough', 'stress_related', 'chunk_hotspot',
] as const;
export type CauseTag = (typeof CAUSE_TAGS)[number];

export const PHASE_IDS = ['write', 'understand', 'memorise', 'automate'] as const;
export const OUTCOMES = ['correct', 'wrong', 'assisted', 'skipped'] as const;
export type Outcome = (typeof OUTCOMES)[number];

/** Everything the spec says an attempt carries (learning-diagnostics: Attempt events). */
export interface AttemptEvent {
  profileId: string;
  itemKind: 'chunk' | 'question';
  itemId: string;
  phase: (typeof PHASE_IDS)[number];
  outcome: Outcome;
  sessionId: string;
  accuracy?: number | null;
  responseTimeMs?: number | null;
  voice?: string | null;
  speed?: number | null;
  /** Help was used, such as revealing the text. An assisted attempt never counts toward mastery. */
  assisted: boolean;
  causeTags?: CauseTag[];
  /** How many times the student replayed the clip, whether they used the slow version, and whether they revealed the text. */
  replays?: number;
  usedSlow?: boolean;
  revealed?: boolean;
}

export function validateAttempt(e: AttemptEvent): string | null {
  if (!(PHASE_IDS as readonly string[]).includes(e.phase)) return `unknown phase "${e.phase}"`;
  if (!(OUTCOMES as readonly string[]).includes(e.outcome)) return `unknown outcome "${e.outcome}"`;
  if (!/^[0-9a-f-]{36}$/i.test(e.sessionId)) return 'sessionId must be a uuid';
  for (const t of e.causeTags ?? []) if (!(CAUSE_TAGS as readonly string[]).includes(t)) return `unknown cause tag "${t}"`;
  if (e.accuracy != null && (e.accuracy < 0 || e.accuracy > 100)) return 'accuracy must be 0 to 100';
  if (e.replays != null && (!Number.isInteger(e.replays) || e.replays < 0 || e.replays > 100)) return 'replays out of range';
  if (e.responseTimeMs != null && (e.responseTimeMs < 0 || e.responseTimeMs > 600_000)) return 'responseTimeMs out of range';
  return null;
}

export interface AttemptResult {
  mastery: MasteryState;
  mastered: boolean;
  coinsAwarded: number;
}

async function readMastery(db: Db, e: AttemptEvent): Promise<MasteryState> {
  const { rows } = await db.query<{ qualifying_successes: number; distinct_sessions: number; last_success_session_id: string | null }>(
    `select qualifying_successes, distinct_sessions, last_success_session_id from mastery
     where profile_id = $1 and item_kind = $2 and item_id = $3 and phase = $4`,
    [e.profileId, e.itemKind, e.itemId, e.phase],
  );
  const r = rows[0];
  return r
    ? { qualifyingSuccesses: r.qualifying_successes, distinctSessions: r.distinct_sessions, lastSuccessSessionId: r.last_success_session_id }
    : NO_MASTERY;
}

/**
 * Stores one attempt, updates mastery and awards effort coins. Coins are for trying, so a wrong or
 * assisted attempt earns them too (engagement-rewards). Throws on an invalid event.
 */
export async function logAttempt(db: Db, e: AttemptEvent): Promise<AttemptResult> {
  const problem = validateAttempt(e);
  if (problem) throw new Error(problem);

  await db.query(
    `insert into attempts (profile_id, item_kind, item_id, phase, outcome, accuracy, response_time_ms, voice, speed, assisted, cause_tags, session_id, replays, used_slow, revealed)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
    [e.profileId, e.itemKind, e.itemId, e.phase, e.outcome, e.accuracy ?? null, e.responseTimeMs ?? null, e.voice ?? null, e.speed ?? null, e.assisted, e.causeTags ?? [], e.sessionId, e.replays ?? 0, e.usedSlow ?? false, e.revealed ?? false],
  );

  const before = await readMastery(db, e);
  const after = applyToMastery(before, { correct: e.outcome === 'correct', assisted: e.assisted, sessionId: e.sessionId });
  if (after !== before) {
    await db.query(
      `insert into mastery (profile_id, item_kind, item_id, phase, qualifying_successes, distinct_sessions, last_success_session_id, updated_at)
       values ($1,$2,$3,$4,$5,$6,$7, now())
       on conflict (profile_id, item_kind, item_id, phase)
       do update set qualifying_successes = excluded.qualifying_successes, distinct_sessions = excluded.distinct_sessions,
                     last_success_session_id = excluded.last_success_session_id, updated_at = now()`,
      [e.profileId, e.itemKind, e.itemId, e.phase, after.qualifyingSuccesses, after.distinctSessions, after.lastSuccessSessionId],
    );
  }

  let coinsAwarded = 0;
  if (e.outcome !== 'skipped' && (await attemptAwardsToday(db, e.profileId)) < COIN_AMOUNTS.attemptsPerDay) {
    coinsAwarded = COIN_AMOUNTS.attempt;
    await awardCoins(db, e.profileId, coinsAwarded, 'attempt');
  }
  return { mastery: after, mastered: isMastered(after, DEFAULT_MASTERY), coinsAwarded };
}
