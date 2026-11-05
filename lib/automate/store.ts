import type { Db } from '../db/types';
import { awardCoins } from '../coins/ledger';
import { causeTagsForRecallFailure } from '../diagnostics/recall-store';
import { logAttempt, type AttemptResult } from '../events/attempts';
import { DEFAULT_RANK, rankFor, type RankInfo } from './rank';
import { DEFAULT_AUTOMATE, foldWindow, isTestReady, meetsTarget, type AutomateConfig, type Timed } from './window';

interface Row {
  item_id: string;
  session_id: string;
  outcome: string;
  accuracy: string | null;
  response_time_ms: number | null;
  assisted: boolean;
}

export interface SessionSummary {
  /** Average response time of the answers that counted, in ms. */
  averageMs: number;
  answers: number;
}

export interface AutomateState {
  /** The response window for the next question, in ms. */
  windowMs: number;
  rank: RankInfo;
  /** The student's own recent sessions, oldest first. */
  history: SessionSummary[];
  /** Per question: separate sessions in which it met the accuracy and time target. */
  sessionsMet: Record<string, number>;
  ready: boolean;
}

const toTimed = (r: Row): Timed => ({ accuracy: r.accuracy === null ? null : Number(r.accuracy), responseMs: r.response_time_ms, blank: r.outcome === 'blank' });

/**
 * Where the student stands in timed practice, from their stored attempts. Attempts made with the text showing
 * (assisted) never count toward the window, rank or readiness: they are practice, not a test of hearing.
 */
export async function loadAutomateState(db: Db, profileId: string, questionIds: string[], cfg: AutomateConfig = DEFAULT_AUTOMATE): Promise<AutomateState> {
  const { rows } = await db.query<Row>(
    `select item_id, session_id, outcome, accuracy, response_time_ms, assisted from attempts
      where profile_id = $1 and phase = 'automate' order by created_at, id`,
    [profileId],
  );
  const counted = rows.filter((r) => !r.assisted);
  const timed = counted.map(toTimed);

  const bySession = new Map<string, number[]>();
  for (const r of counted) {
    const t = toTimed(r);
    if (t.blank || t.responseMs === null || t.accuracy === null || t.accuracy < DEFAULT_RANK.minAccuracy) continue;
    bySession.set(r.session_id, [...(bySession.get(r.session_id) ?? []), t.responseMs]);
  }
  const history = [...bySession.values()].slice(-8).map((ms) => ({ averageMs: Math.round(ms.reduce((a, b) => a + b, 0) / ms.length), answers: ms.length }));

  const met = new Map<string, Set<string>>();
  for (const r of counted) if (meetsTarget(toTimed(r), cfg)) met.set(r.item_id, (met.get(r.item_id) ?? new Set()).add(r.session_id));
  const sessionsMet = Object.fromEntries(questionIds.map((id) => [id, met.get(id)?.size ?? 0]));

  return {
    windowMs: foldWindow(timed, cfg).windowMs,
    rank: rankFor(timed),
    history,
    sessionsMet,
    ready: isTestReady(questionIds.map((id) => ({ sessionsMet: sessionsMet[id] })), questionIds.length, cfg),
  };
}

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

export type ResponseResult = ({ ok: true; bonusCoins: number; state: AutomateState } & AttemptResult) | { ok: false; error: string };

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
      const a = await db.query<{ text: string }>('select text from answers where profile_id = $1 and question_id = $2 and confirmed_at is not null', [i.profileId, i.itemId]);
      causeTags = await causeTagsForRecallFailure(db, { profileId: i.profileId, courseId: i.courseId, itemId: i.itemId, answer: a.rows[0]?.text ?? '', timed: true });
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
    return { ok: true, ...result, bonusCoins, state: await loadAutomateState(db, i.profileId, ids, cfg) };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
