import { getDb } from '../db';
import { cheekyLinesFor } from '../rewards/cheeky';
import type { PhraseLine } from '../tele/phrase-bank';
import { CATALOGUE, itemById } from '../rewards/catalogue';
import { loadShop, settleStreak } from '../rewards/store';
import { courseUnlockAll } from '../course/unlock';
import { NO_PROGRESS, phaseStates, type PhaseId, type PhaseState, type Progress } from '../phases/gate';
import { loadCanDo, type CanDo } from '../progress/can-do';
import { daysUntil, loadQuestions } from '../progress/progress';
import { loadLastStep, loadReadinessInput } from '../planner/load';
import { nextStep, type NextStep } from '../planner/next-step';
import type { ReadinessInput } from '../planner/readiness';
import { currentProfile, defaultCourse } from './session';

export interface HomeData {
  signedIn: boolean;
  nickname: string | null;
  states: Record<PhaseId, PhaseState>;
  /** The student's course is a testing course with every phase open, so the desktop says so. */
  unlockAll: boolean;
  daysToTest: number;
  /** One can-do row per question, or null for a device with no profile. */
  canDo: CanDo | null;
  progress: ReadinessInput;
  /** The step the "What's next?" window points at. */
  next: NextStep;
  coins: number;
  streak: number;
  freezes: number;
  /** CSS background of the chosen wallpaper, or null for the plain desktop. */
  wallpaper: string | null;
  /** Desktop things the student owns. */
  objects: { id: string; es: string; en: string }[];
  /** Cheeky lines this student may see: empty unless the course owner switched the pool on and the student bought it. */
  cheekyLines: PhraseLine[];
}

/** Everything the desktop shows, from the database. A device with no profile sees the course with no progress. */
export async function loadHome(): Promise<HomeData> {
  const profile = await currentProfile();
  const course = await defaultCourse();
  const db = await getDb();
  const questions = course ? await loadQuestions(db, profile?.courseId ?? course.id) : [];
  // One load serves the phase gates and the readiness meter.
  const readinessInput: ReadinessInput = profile ? await loadReadinessInput(db, profile.id, profile.courseId, questions.filter((q) => !q.extension).map((q) => q.id)) : { ...NO_PROGRESS, questionsAutomated: 0 };
  const progress: Progress = readinessInput;
  // The only place the flag is read for the desktop; a device with no profile sees the gated course.
  const unlockAll = profile ? await courseUnlockAll(db, profile.courseId) : false;
  // Settling the streak is the only write here: it uses a freeze on a missed day if the student has one. It earns nothing.
  if (profile) await settleStreak(db, profile.id);
  const shop = profile ? await loadShop(db, profile.id) : null;
  const daysToTest = course ? daysUntil(course.testDate) : 0;
  const states = phaseStates(progress, { unlockAll });
  const last = profile ? await loadLastStep(db, profile.id) : null;
  return {
    progress: readinessInput,
    next: nextStep({ states, progress, last, daysToTest }),
    coins: shop?.coins ?? 0,
    streak: shop?.streak ?? 0,
    freezes: shop?.freezesAvailable ?? 0,
    wallpaper: (shop?.wallpaper && itemById(shop.wallpaper)?.css) || null,
    objects: (shop?.owned ?? []).map((id) => CATALOGUE.find((i) => i.id === id)!).filter((i) => i?.kind === 'object').map(({ id, es, en }) => ({ id, es, en })),
    cheekyLines: profile ? await cheekyLinesFor(db, profile.id, profile.courseId) : [],
    signedIn: !!profile,
    nickname: profile?.nickname ?? null,
    states,
    unlockAll,
    daysToTest,
    canDo: profile ? await loadCanDo(db, profile.id, profile.courseId) : null,
  };
}
