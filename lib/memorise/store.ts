import type { Db } from '../db/types';
import { courseUnlockAll } from '../course/unlock';
import type { Calibration, Chunk, FeatureTag, ModelAnswer } from '../course/schema';
import { simplestModelAnswer } from '../coach/model-answers';
import { isStalled } from '../coach/simplify';
import { payAnswerValue } from '../coins/answer-value';
import { practiceAnswerText } from './practice-text';
import { causeTagsForRecallFailure, recordChunkEvents } from '../diagnostics/recall-store';
import { logAttempt, type AttemptResult } from '../events/attempts';
import { DEFAULT_MASTERY, isMastered, NO_MASTERY } from '../mastery/mastery';
import { loadMastery } from '../progress/progress';
import { countsTowardMastery, DEFAULT_MEMORISE, foldFade, MAX_LEVEL, type FadeState, type MemoriseConfig } from './fade';

export interface MemoriseItem {
  id: string;
  position: number;
  /** The question, Spanish. */
  question: string;
  english: string;
  /** The student's own confirmed answer. */
  answer: string;
  /** How much of the script the prompt gives now, 0 to 4. Carries across sessions. */
  level: number;
  /** The student's own highest accuracy on this answer, or null before a first attempt. */
  best: number | null;
  successes: number;
  mastered: boolean;
  /** Repeated failures to recall it, so the app suggests a simpler version (answer-writing-coach). */
  stalled: boolean;
}

/** Accuracies of the whole-answer attempts at one item, oldest first. */
async function loadAccuracies(db: Db, profileId: string, itemId: string): Promise<number[]> {
  const { rows } = await db.query<{ accuracy: string }>(
    `select accuracy from attempts where profile_id = $1 and item_id = $2 and phase = 'memorise' and accuracy is not null order by created_at, id`,
    [profileId, itemId],
  );
  return rows.map((r) => Number(r.accuracy));
}

/**
 * The confirmed answers the student can practise, in question order. In a testing course
 * (course-unlock-testing) a question with no confirmed answer is practised with the course's Rock solid model
 * answer instead, so a tester can reach this phase and the timed round without writing anything first. The model
 * answer is read here only; it is never stored as the student's answer. Attempts and mastery still record against
 * the question id, exactly as for a student's own answer.
 */
export async function loadMemoriseItems(db: Db, profileId: string, courseId: string, cfg: MemoriseConfig = DEFAULT_MEMORISE): Promise<MemoriseItem[]> {
  const own = await db.query<{ id: string; position: number; spanish: string; english_subtitle: string; text: string }>(
    `select q.id, q.position, q.spanish, q.english_subtitle, a.text
       from questions q join answers a on a.question_id = q.id and a.profile_id = $1 and a.confirmed_at is not null
      where q.course_id = $2 order by q.position`,
    [profileId, courseId],
  );
  let rows = own.rows;
  if (await courseUnlockAll(db, courseId)) {
    const course = await db.query<{ model_answers: ModelAnswer[]; calibration: Calibration }>('select model_answers, calibration from courses where id = $1', [courseId]);
    const models = course.rows[0]?.model_answers ?? [];
    const cal = course.rows[0]?.calibration;
    const have = new Set(rows.map((r) => r.id));
    const all = await db.query<{ id: string; position: number; spanish: string; english_subtitle: string }>(
      'select id, position, spanish, english_subtitle from questions where course_id = $1 order by position',
      [courseId],
    );
    const stand = all.rows.flatMap((q) => {
      const model = cal ? simplestModelAnswer(models, q.position, cal) : null;
      return have.has(q.id) || !model ? [] : [{ ...q, text: model.text }];
    });
    rows = [...rows, ...stand].sort((a, b) => a.position - b.position);
  }
  const mastery = await loadMastery(db, profileId, 'memorise');
  const items: MemoriseItem[] = [];
  for (const r of rows) {
    const accuracies = await loadAccuracies(db, profileId, r.id);
    const m = mastery.get(r.id) ?? NO_MASTERY;
    items.push({
      id: r.id, position: r.position, question: r.spanish, english: r.english_subtitle, answer: r.text,
      level: foldFade(accuracies, cfg).level,
      best: accuracies.length ? Math.max(...accuracies) : null,
      successes: m.qualifyingSuccesses,
      mastered: isMastered(m, DEFAULT_MASTERY),
      stalled: isStalled(accuracies, isMastered(m, DEFAULT_MASTERY)),
    });
  }
  return items;
}

export interface RecallInput {
  profileId: string;
  courseId: string;
  itemId: string;
  sessionId: string;
  /** Whole percent from the word-by-word score. */
  accuracy: number;
  /** Support level the prompt had when the student said it. */
  level: number;
  responseTimeMs?: number | null;
  /** Positions of script words the recogniser did not match. Positions only: no transcript is sent or kept. */
  missedWords?: number[];
}

export type RecallResult =
  | ({ ok: true; level: number; best: number; previousBest: number | null; answerValue: number } & AttemptResult)
  | { ok: false; error: string };

/**
 * Logs one scored whole-answer attempt. A good attempt (at or above the threshold) counts toward
 * mastery unless the whole script was showing. Only the accuracy is stored, never the audio or what was said.
 */
export async function recordRecall(db: Db, i: RecallInput, cfg: MemoriseConfig = DEFAULT_MEMORISE): Promise<RecallResult> {
  if (!Number.isFinite(i.accuracy) || i.accuracy < 0 || i.accuracy > 100) return { ok: false, error: 'Bad accuracy.' };
  if (!Number.isInteger(i.level) || i.level < 0 || i.level > MAX_LEVEL) return { ok: false, error: 'Bad level.' };
  const answerText = await practiceAnswerText(db, i.profileId, i.courseId, i.itemId);
  if (answerText === null) return { ok: false, error: 'Confirm this answer first.' };
  const missedWords = (i.missedWords ?? []).filter((n) => Number.isInteger(n) && n >= 0 && n < 1000);

  const previous = await loadAccuracies(db, i.profileId, i.itemId);
  const good = i.accuracy >= cfg.threshold;
  const assisted = !countsTowardMastery(i.level);
  try {
    // Which chunks were missed feeds the hotspot rule; a failed attempt then gets a cause tag by rule.
    const { missedChunkIds } = await recordChunkEvents(db, {
      profileId: i.profileId, courseId: i.courseId, answer: answerText, missedWords, sessionId: i.sessionId, readingAloud: assisted,
    });
    const causeTags = good || assisted
      ? []
      : await causeTagsForRecallFailure(db, { profileId: i.profileId, courseId: i.courseId, itemId: i.itemId, answer: answerText, timed: false, missedChunkIds });
    const result = await logAttempt(db, {
      profileId: i.profileId, itemKind: 'question', itemId: i.itemId, phase: 'memorise', sessionId: i.sessionId,
      outcome: good ? (assisted ? 'assisted' : 'correct') : 'wrong',
      accuracy: Math.round(i.accuracy), responseTimeMs: i.responseTimeMs ?? null, assisted, causeTags,
    });
    const fade: FadeState = foldFade([...previous, Math.round(i.accuracy)], cfg);
    // The answer's value is paid through learning: effort, then memorised (answer-value.ts).
    const answerValue = await payAnswerValue(db, i.profileId, i.itemId);
    return { ok: true, ...result, answerValue, level: fade.level, best: Math.max(Math.round(i.accuracy), ...previous), previousBest: previous.length ? Math.max(...previous) : null };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/** The course's chunks, for the warm-up tasks that split an answer into its pieces (tasks 21.1 to 21.3). */
export async function loadCourseChunks(db: Db, courseId: string): Promise<Chunk[]> {
  const { rows } = await db.query<{ spanish: string; english_gloss: string; category: string; feature_tags: FeatureTag[]; recycled: boolean }>(
    'select spanish, english_gloss, category, feature_tags, recycled from chunks where course_id = $1 order by spanish',
    [courseId],
  );
  return rows.map((r) => ({ spanish: r.spanish, english: r.english_gloss, category: r.category, featureTags: r.feature_tags ?? [], recycled: r.recycled }));
}
