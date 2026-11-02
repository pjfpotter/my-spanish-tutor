import type { Db } from '../db/types';
import { DEFAULT_MASTERY, isMastered, masteryFraction, NO_MASTERY, type MasteryState } from '../mastery/mastery';
import type { Progress } from '../phases/gate';

export interface QuestionRow {
  id: string;
  position: number;
  spanish: string;
  english: string;
  recycled: boolean;
}

export async function loadQuestions(db: Db, courseId: string): Promise<QuestionRow[]> {
  const { rows } = await db.query<{ id: string; position: number; spanish: string; english_subtitle: string; recycled: boolean }>(
    'select id, position, spanish, english_subtitle, recycled from questions where course_id = $1 order by position',
    [courseId],
  );
  return rows.map((r) => ({ id: r.id, position: r.position, spanish: r.spanish, english: r.english_subtitle, recycled: r.recycled }));
}

/** Mastery of each item in a phase, keyed by item id. Items never attempted are absent. */
export async function loadMastery(db: Db, profileId: string, phase: string): Promise<Map<string, MasteryState>> {
  const { rows } = await db.query<{ item_id: string; qualifying_successes: number; distinct_sessions: number; last_success_session_id: string | null }>(
    'select item_id, qualifying_successes, distinct_sessions, last_success_session_id from mastery where profile_id = $1 and phase = $2',
    [profileId, phase],
  );
  return new Map(
    rows.map((r) => [r.item_id, { qualifyingSuccesses: r.qualifying_successes, distinctSessions: r.distinct_sessions, lastSuccessSessionId: r.last_success_session_id }]),
  );
}

/** Where the student stands, from the database. Drives which phases are open. */
export async function loadProgress(db: Db, profileId: string): Promise<Progress> {
  const confirmed = await db.query<{ n: string }>('select count(*) as n from answers where profile_id = $1 and confirmed_at is not null', [profileId]);
  const understood = await loadMastery(db, profileId, 'understand');
  const memorised = await loadMastery(db, profileId, 'memorise');
  const count = (m: Map<string, MasteryState>) => [...m.values()].filter((s) => isMastered(s, DEFAULT_MASTERY)).length;
  return { answersConfirmed: Number(confirmed.rows[0].n), questionsMastered: count(understood), answersMemorised: count(memorised) };
}

/** How clear each question's channel is, 0 (static) to 1 (clear and locked in). In question order. */
export function channelClarity(questions: QuestionRow[], mastery: Map<string, MasteryState>): number[] {
  return questions.map((q) => masteryFraction(mastery.get(q.id) ?? NO_MASTERY, DEFAULT_MASTERY));
}

/** Whole days from `now` to the test date (negative once it has passed), by calendar date in UTC. */
export function daysUntil(testDate: string | Date, now: Date = new Date()): number {
  const t = typeof testDate === 'string' ? Date.parse(testDate.slice(0, 10)) : Date.UTC(testDate.getFullYear(), testDate.getMonth(), testDate.getDate());
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((t - today) / 86_400_000);
}
