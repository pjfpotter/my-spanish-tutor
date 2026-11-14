import { loadAutomateState } from '../automate/store';
import { DEFAULT_AUTOMATE } from '../automate/window';
import type { Db } from '../db/types';
import { isPhaseId, QUESTION_COUNT, type PhaseId } from '../phases/gate';
import { loadProgress } from '../progress/progress';
import type { ReadinessInput } from './readiness';

/** What the readiness meter needs for one student: their progress plus how many questions they have automatised. */
export async function loadReadinessInput(db: Db, profileId: string, courseId: string, questionIds: string[]): Promise<ReadinessInput> {
  const progress = await loadProgress(db, profileId, courseId);
  // Automatised questions only exist once answers are memorised, so skip the extra query before then.
  const questionsAutomated = progress.answersMemorised >= (progress.total ?? QUESTION_COUNT)
    ? Object.values((await loadAutomateState(db, profileId, questionIds)).sessionsMet).filter((n) => n >= DEFAULT_AUTOMATE.readySessions).length
    : 0;
  return { ...progress, questionsAutomated };
}

/**
 * The step a student worked on most recently, from attempts, confirmed answers and quick-check results, or null if
 * they have done nothing. One small query; it stores nothing new.
 */
export async function loadLastStep(db: Db, profileId: string): Promise<PhaseId | null> {
  const { rows } = await db.query<{ phase: string }>(
    `select phase from (
       select phase, created_at as at from attempts where profile_id = $1
       union all select 'write' as phase, confirmed_at as at from answers where profile_id = $1 and confirmed_at is not null
       union all select 'understand' as phase, created_at as at from baseline_results where profile_id = $1
     ) t order by at desc limit 1`,
    [profileId],
  );
  const phase = rows[0]?.phase;
  return phase && isPhaseId(phase) ? phase : null;
}
