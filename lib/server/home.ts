import { getDb } from '../db';
import { baselineDone, loadBaseline } from '../diagnostics/baseline';
import { CATALOGUE, itemById } from '../rewards/catalogue';
import { loadShop, settleStreak } from '../rewards/store';
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
  coins: number;
  streak: number;
  freezes: number;
  /** CSS background of the chosen wallpaper, or null for the plain desktop. */
  wallpaper: string | null;
  /** Desktop things the student owns. */
  objects: { id: string; es: string; en: string }[];
  /** The starting-point check is finished, so it is not offered again. */
  baselineDone: boolean;
}

/** Everything the desktop shows, from the database. A device with no profile sees the course with no progress. */
export async function loadHome(): Promise<HomeData> {
  const profile = await currentProfile();
  const course = await defaultCourse();
  const db = await getDb();
  const questions = course ? await loadQuestions(db, profile?.courseId ?? course.id) : [];
  const progress: Progress = profile ? await loadProgress(db, profile.id, profile.courseId) : NO_PROGRESS;
  const mastery = profile ? await loadMastery(db, profile.id, 'understand') : new Map();
  // Settling the streak is the only write here: it uses a freeze on a missed day if the student has one. It earns nothing.
  if (profile) await settleStreak(db, profile.id);
  const shop = profile ? await loadShop(db, profile.id) : null;
  return {
    coins: shop?.coins ?? 0,
    streak: shop?.streak ?? 0,
    freezes: shop?.freezesAvailable ?? 0,
    wallpaper: (shop?.wallpaper && itemById(shop.wallpaper)?.css) || null,
    objects: (shop?.owned ?? []).map((id) => CATALOGUE.find((i) => i.id === id)!).filter((i) => i?.kind === 'object').map(({ id, es, en }) => ({ id, es, en })),
    baselineDone: profile ? baselineDone(await loadBaseline(db, profile.id), questions.length) : true,
    signedIn: !!profile,
    nickname: profile?.nickname ?? null,
    states: phaseStates(progress),
    daysToTest: course ? daysUntil(course.testDate) : 0,
    channels: channelClarity(questions, mastery),
  };
}
