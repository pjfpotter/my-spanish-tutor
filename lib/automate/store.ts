import type { Db } from '../db/types';
import { payAnswerValue } from '../coins/answer-value';
import { awardCoins } from '../coins/ledger';
import { causeTagsForRecallFailure } from '../diagnostics/recall-store';
import { logAttempt, type AttemptResult } from '../events/attempts';
import { practiceAnswerText } from '../memorise/practice-text';
import { automateStateFrom, type AttemptRow, type AutomateState, type SessionSummary } from './state';
import { DEFAULT_AUTOMATE, type AutomateConfig } from './window';

/**
 * Where the student stands in timed practice, from their stored attempts (rules in `state.ts`, shared with the lab).
 */
export async function loadAutomateState(db: Db, profileId: string, questionIds: string[], cfg: AutomateConfig = DEFAULT_AUTOMATE): Promise<AutomateState> {
  const { rows } = await db.query<AttemptRow>(
    `select item_id, session_id, outcome, accuracy, response_time_ms, assisted from attempts
      where profile_id = $1 and phase = 'automate' order by created_at, id`,
    [profileId],
  );
  return automateStateFrom(rows, questionIds, cfg);
}

export type { AutomateState, SessionSummary };

export interface ResponseInput {
  profileId: string;
  courseId: string;
  itemId: string;
  sessionId: string;
  /** Nothing was said in the window. */
  blank: boolean;
  /** Whole percent, ignored for a blank. */
  accuracy: number | null;
  /** From the end of the question audio to the start of speech, in ms. Null for a blank. */
  responseTimeMs: number | null;
  speed: number | null;
  /** How many times the student asked for the question again in Spanish. Good test technique. */
  repeats: number;
  /** The text was shown (a missing clip), so the attempt is practice and does not count. */
  assisted: boolean;
}

export type ResponseResult = ({ ok: true; bonusCoins: number; answerValue: number; state: AutomateState } & AttemptResult) | { ok: false; error: string };

/** Logs one timed attempt and returns the student's new state. Only the numbers are stored: never audio or what was said. */
export async function recordResponse(db: Db, i: ResponseInput, cfg: AutomateConfig = DEFAULT_AUTOMATE): Promise<ResponseResult> {
  if (!i.blank && (i.accuracy === null || !Number.isFinite(i.accuracy) || i.accuracy < 0 || i.accuracy > 100)) return { ok: false, error: 'Bad accuracy.' };
  if (i.responseTimeMs !== null && (!Number.isFinite(i.responseTimeMs) || i.responseTimeMs < 0 || i.responseTimeMs > 600_000)) return { ok: false, error: 'Bad response time.' };
  if (!Number.isInteger(i.repeats) || i.repeats < 0 || i.repeats > 5) return { ok: false, error: 'Bad repeat count.' };
  const questions = await db.query<{ id: string }>('select id from questions where course_id = $1', [i.courseId]);
  const ids = questions.rows.map((q) => q.id);
  if (!ids.includes(i.itemId)) return { ok: false, error: 'Unknown question.' };

  const outcome = i.blank ? 'blank' : i.assisted ? 'assisted' : (i.accuracy as number) >= cfg.threshold ? 'correct' : 'wrong';
  try {
    // A timed miss or blank gets a cause tag by rule (never a mark against the student); practice with the text shown does not.
    let causeTags: Awaited<ReturnType<typeof causeTagsForRecallFailure>> = [];
    if ((outcome === 'wrong' || outcome === 'blank') && !i.assisted) {
      const answer = await practiceAnswerText(db, i.profileId, i.courseId, i.itemId);
      causeTags = await causeTagsForRecallFailure(db, { profileId: i.profileId, courseId: i.courseId, itemId: i.itemId, answer: answer ?? '', timed: true });
    }
    const result = await logAttempt(db, {
      profileId: i.profileId, itemKind: 'question', itemId: i.itemId, phase: 'automate', sessionId: i.sessionId, outcome, causeTags,
      accuracy: i.blank ? null : Math.round(i.accuracy as number),
      responseTimeMs: i.blank ? null : i.responseTimeMs === null ? null : Math.round(i.responseTimeMs),
      speed: i.speed, assisted: i.assisted, replays: i.repeats,
    });
    // Asking for the question again in Spanish is rewarded, never penalised.
    const bonusCoins = i.repeats > 0 ? 1 : 0;
    if (bonusCoins) await awardCoins(db, i.profileId, bonusCoins, 'attempt');
    // The answer's value is paid through learning: the last stage comes when it meets the timed target (answer-value.ts).
    const answerValue = await payAnswerValue(db, i.profileId, i.itemId);
    return { ok: true, ...result, bonusCoins, answerValue, state: await loadAutomateState(db, i.profileId, ids, cfg) };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
