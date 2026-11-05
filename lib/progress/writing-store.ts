import { viewAnswer, levelToStored } from '../coach/writing';
import type { Db } from '../db/types';
import type { Calibration, Chunk, Level, ModelAnswer } from '../course/schema';

export interface WritingCourse {
  questions: { id: string; position: number; spanish: string; english: string }[];
  chunks: Chunk[];
  calibration: Calibration;
  modelAnswers: ModelAnswer[];
}

export interface SavedAnswer {
  questionId: string;
  text: string;
  confirmed: boolean;
}

export async function loadWritingCourse(db: Db, courseId: string): Promise<WritingCourse> {
  const course = await db.query<{ calibration: Calibration; model_answers: ModelAnswer[] }>('select calibration, model_answers from courses where id = $1', [courseId]);
  const questions = await db.query<{ id: string; position: number; spanish: string; english_subtitle: string }>(
    'select id, position, spanish, english_subtitle from questions where course_id = $1 order by position', [courseId]);
  const chunks = await db.query<{ spanish: string; english_gloss: string; category: string; feature_tags: string[]; recycled: boolean }>(
    'select spanish, english_gloss, category, feature_tags, recycled from chunks where course_id = $1 order by spanish', [courseId]);
  return {
    questions: questions.rows.map((q) => ({ id: q.id, position: q.position, spanish: q.spanish, english: q.english_subtitle })),
    chunks: chunks.rows.map((c) => ({ spanish: c.spanish, english: c.english_gloss, category: c.category, featureTags: c.feature_tags as Chunk['featureTags'], recycled: c.recycled })),
    calibration: course.rows[0].calibration,
    modelAnswers: course.rows[0].model_answers,
  };
}

export async function loadSavedAnswers(db: Db, profileId: string): Promise<SavedAnswer[]> {
  const { rows } = await db.query<{ question_id: string; text: string; confirmed_at: Date | null }>(
    'select question_id, text, confirmed_at from answers where profile_id = $1', [profileId]);
  return rows.map((r) => ({ questionId: r.question_id, text: r.text, confirmed: r.confirmed_at !== null }));
}

export type SaveResult = { ok: true; confirmed: boolean; level: Level | null } | { ok: false; error: string };

/**
 * Saves an answer. The server re-checks it, so a confirmed answer always passes the word bank. Any edit
 * un-confirms the answer until the student confirms it again (they can change a confirmed answer later).
 */
export async function saveAnswer(db: Db, course: WritingCourse, profileId: string, questionId: string, text: string, confirm: boolean): Promise<SaveResult> {
  if (!course.questions.some((q) => q.id === questionId)) return { ok: false, error: 'Unknown question.' };
  if (text.length > 1500) return { ok: false, error: 'That answer is too long.' };
  const view = viewAnswer(course, text, 'rock_solid');
  if (confirm && (!view.canConfirm || !text.trim())) return { ok: false, error: 'This answer has words outside the sentence builder.' };
  await db.query(
    `insert into answers (profile_id, question_id, text, level, confirmed_at) values ($1,$2,$3,$4, case when $5 then now() else null end)
     on conflict (profile_id, question_id) do update set text = excluded.text, level = excluded.level,
       confirmed_at = case when $5 then now() else null end`,
    [profileId, questionId, text, levelToStored(view.assessment.level), confirm],
  );
  return { ok: true, confirmed: confirm, level: view.assessment.level };
}
