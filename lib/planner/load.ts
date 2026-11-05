import { loadAutomateState } from '../automate/store';
import { DEFAULT_AUTOMATE } from '../automate/window';
import type { Db } from '../db/types';
import { QUESTION_COUNT } from '../phases/gate';
import { loadProgress } from '../progress/progress';
import type { ReadinessInput } from './readiness';

/** What the readiness meter needs for one student: their progress plus how many questions they have automatised. */
export async function loadReadinessInput(db: Db, profileId: string, courseId: string, questionIds: string[]): Promise<ReadinessInput> {
  const progress = await loadProgress(db, profileId, courseId);
  // Automatised questions only exist once answers are memorised, so skip the extra query before then.
  const questionsAutomated = progress.answersMemorised >= QUESTION_COUNT
    ? Object.values((await loadAutomateState(db, profileId, questionIds)).sessionsMet).filter((n) => n >= DEFAULT_AUTOMATE.readySessions).length
    : 0;
  return { ...progress, questionsAutomated };
}
