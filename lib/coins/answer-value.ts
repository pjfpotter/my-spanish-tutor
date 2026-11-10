import { DEFAULT_AUTOMATE } from '../automate/window';
import type { Db } from '../db/types';
import { DEFAULT_MASTERY, isMastered } from '../mastery/mastery';
import { loadMastery } from '../progress/progress';
import { awardCoins } from './ledger';

/**
 * Paying an answer's value through learning (task 26.1e, engagement-rewards). Writing pays nothing. As the
 * student practises the answer the value is paid in stages, and it rewards effort as well as success:
 *
 *  - effort (20%): in four equal parts, one for each separate session in which the student had a go at saying the
 *    answer, however it went;
 *  - memorised (50%): when the answer is memorised;
 *  - automated (30%): when it meets the timed target in enough separate sessions.
 *
 * Everything is worked out from stored progress and paid as a top-up against what has already been paid, so it is
 * safe to call after every attempt, never pays a stage twice and never takes anything back. Cumulative rounding means
 * a finished answer pays exactly its value.
 */
export const ANSWER_SHARES = { effort: 0.2, memorised: 0.5, automated: 0.3 } as const;
export const EFFORT_SESSIONS = 4;

export interface AnswerProgress {
  value: number;
  /** Separate memorise sessions with a whole-answer attempt, whatever the outcome. */
  effortSessions: number;
  memorised: boolean;
  automated: boolean;
}

/** How much of an answer's value is earned so far, as a whole number. */
export function earnedValue(p: AnswerProgress): number {
  const fraction =
    (ANSWER_SHARES.effort * Math.min(p.effortSessions, EFFORT_SESSIONS)) / EFFORT_SESSIONS +
    (p.memorised ? ANSWER_SHARES.memorised : 0) +
    (p.automated ? ANSWER_SHARES.automated : 0);
  return Math.min(p.value, Math.round(p.value * fraction));
}

/** The progress on one answer, from the database. Null when the student has no confirmed answer there. */
export async function loadAnswerProgress(db: Db, profileId: string, questionId: string): Promise<AnswerProgress | null> {
  const answer = await db.query<{ value: number }>('select value from answers where profile_id = $1 and question_id = $2 and confirmed_at is not null', [profileId, questionId]);
  if (!answer.rows[0]) return null;
  const sessions = await db.query<{ n: string }>(
    `select count(distinct session_id) as n from attempts where profile_id = $1 and item_kind = 'question' and item_id = $2 and phase = 'memorise' and accuracy is not null`,
    [profileId, questionId],
  );
  const memorised = isMastered((await loadMastery(db, profileId, 'memorise')).get(questionId) ?? { qualifyingSuccesses: 0, distinctSessions: 0, lastSuccessSessionId: null }, DEFAULT_MASTERY);
  const met = await db.query<{ n: string }>(
    `select count(distinct session_id) as n from attempts where profile_id = $1 and item_kind = 'question' and item_id = $2 and phase = 'automate'
       and not assisted and accuracy >= $3 and response_time_ms is not null and response_time_ms <= $4`,
    [profileId, questionId, DEFAULT_AUTOMATE.threshold, DEFAULT_AUTOMATE.targetMs],
  );
  return {
    value: answer.rows[0].value,
    effortSessions: Number(sessions.rows[0].n),
    memorised,
    automated: Number(met.rows[0].n) >= DEFAULT_AUTOMATE.readySessions,
  };
}

/** Pays whatever is newly earned on one answer. Returns the amount paid now (0 when nothing new). */
export async function payAnswerValue(db: Db, profileId: string, questionId: string): Promise<number> {
  const progress = await loadAnswerProgress(db, profileId, questionId);
  if (!progress) return 0;
  const paid = (await db.query<{ paid: number }>('select paid from answer_payouts where profile_id = $1 and question_id = $2', [profileId, questionId])).rows[0]?.paid ?? 0;
  const due = earnedValue(progress) - paid;
  if (due <= 0) return 0;
  await awardCoins(db, profileId, due, 'answer');
  await db.query(
    `insert into answer_payouts (profile_id, question_id, paid) values ($1, $2, $3)
     on conflict (profile_id, question_id) do update set paid = answer_payouts.paid + $3, updated_at = now()`,
    [profileId, questionId, due],
  );
  return due;
}
