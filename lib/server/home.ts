import { getDb } from '../db';
import { NO_PROGRESS, phaseStates, type PhaseId, type PhaseState, type Progress } from '../phases/gate';
import { channelClarity, daysUntil, loadMastery, loadProgress, loadQuestions } from '../progress/progress';
import { currentProfile, defaultCourse } from './session';

export interface HomeData {
  signedIn: boolean;
  nickname: string | null;
  states: Record<PhaseId, PhaseState>;
  daysToTest: number;
  /** One number per question, 0 (static) to 1 (clear), in question order. */
  channels: number[];
}

/** Everything the desktop shows, from the database. A device with no profile sees the course with no progress. */
export async function loadHome(): Promise<HomeData> {
  const profile = await currentProfile();
  const course = await defaultCourse();
  const db = await getDb();
  const questions = course ? await loadQuestions(db, profile?.courseId ?? course.id) : [];
  const progress: Progress = profile ? await loadProgress(db, profile.id) : NO_PROGRESS;
  const mastery = profile ? await loadMastery(db, profile.id, 'understand') : new Map();
  return {
    signedIn: !!profile,
    nickname: profile?.nickname ?? null,
    states: phaseStates(progress),
    daysToTest: course ? daysUntil(course.testDate) : 0,
    channels: channelClarity(questions, mastery),
  };
}
