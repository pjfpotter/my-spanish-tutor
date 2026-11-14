import type { Db } from '../db/types';
import { DEFAULT_MASTERY, isMastered, type MasteryState } from '../mastery/mastery';
import { loadAutomateState } from '../automate/store';
import { QUESTION_COUNT, type Progress } from '../phases/gate';
import { knownAtStart, loadBaseline } from '../diagnostics/baseline';

export interface QuestionRow {
  id: string;
  position: number;
  spanish: string;
  english: string;
  recycled: boolean;
  /** An extra question: practised like the others, never needed to unlock a step. */
  extension: boolean;
  keyWord: { spanish: string; english: string } | null;
}

export async function loadQuestions(db: Db, courseId: string): Promise<QuestionRow[]> {
  const { rows } = await db.query<{ id: string; position: number; spanish: string; english_subtitle: string; recycled: boolean; extension: boolean; key_word: string | null; key_word_english: string | null }>(
    'select id, position, spanish, english_subtitle, recycled, extension, key_word, key_word_english from questions where course_id = $1 order by position',
    [courseId],
  );
  return rows.map((r) => ({ id: r.id, position: r.position, spanish: r.spanish, english: r.english_subtitle, recycled: r.recycled, extension: r.extension,
    keyWord: r.key_word && r.key_word_english ? { spanish: r.key_word, english: r.key_word_english } : null,
  }));
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
export async function loadProgress(db: Db, profileId: string, courseId?: string): Promise<Progress> {
  // Only the course's core questions count toward unlocking and readiness; extension questions are optional extras.
  const course = courseId ?? (await db.query<{ course_id: string }>('select course_id from profiles where id = $1', [profileId])).rows[0]?.course_id;
  const core = course
    ? (await db.query<{ id: string }>('select id from questions where course_id = $1 and not extension', [course])).rows.map((r) => r.id)
    : null;
  const isCore = (id: string) => core === null || core.includes(id);
  const confirmed = await db.query<{ question_id: string }>('select question_id from answers where profile_id = $1 and confirmed_at is not null', [profileId]);
  const understood = await loadMastery(db, profileId, 'understand');
  const memorised = await loadMastery(db, profileId, 'memorise');
  const masteredIds = (m: Map<string, MasteryState>) => [...m].filter(([id, s]) => isMastered(s, DEFAULT_MASTERY) && isCore(id)).map(([id]) => id);
  // A question proved in the placement check counts as understood for this stage only (learning-diagnostics: Skipping by proof).
  const understoodIds = new Set(masteredIds(understood));
  for (const id of knownAtStart(await loadBaseline(db, profileId))) if (isCore(id)) understoodIds.add(id);
  const memorisedCount = masteredIds(memorised).length;
  const total = core ? core.length : QUESTION_COUNT;
  // Test-ready only matters once the answers are memorised, so skip the extra query before then.
  let testReady = false;
  if (memorisedCount >= total && core) testReady = (await loadAutomateState(db, profileId, core)).ready;
  return { answersConfirmed: confirmed.rows.filter((r) => isCore(r.question_id)).length, questionsMastered: understoodIds.size, answersMemorised: memorisedCount, testReady, total };
}

/** Whole days from `now` to the test date (negative once it has passed), by calendar date in UTC. */
export function daysUntil(testDate: string | Date, now: Date = new Date()): number {
  const t = typeof testDate === 'string' ? Date.parse(testDate.slice(0, 10)) : Date.UTC(testDate.getFullYear(), testDate.getMonth(), testDate.getDate());
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((t - today) / 86_400_000);
}
