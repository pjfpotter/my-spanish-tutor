import { tokens } from '../coach/rubric';
import { viewAnswer } from '../coach/writing';
import { awardCoins } from '../coins/ledger';
import type { Db } from '../db/types';
import type { Calibration, Chunk, ModelAnswer } from '../course/schema';

export interface WritingCourse {
  questions: { id: string; position: number; spanish: string; english: string; topics: string[]; template: string[] }[];
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
  const questions = await db.query<{ id: string; position: number; spanish: string; english_subtitle: string; topics: string[]; template: string[] }>(
    'select id, position, spanish, english_subtitle, topics, template from questions where course_id = $1 order by position', [courseId]);
  const chunks = await db.query<{ spanish: string; english_gloss: string; category: string; feature_tags: string[]; recycled: boolean }>(
    'select spanish, english_gloss, category, feature_tags, recycled from chunks where course_id = $1 order by spanish', [courseId]);
  return {
    questions: questions.rows.map((q) => ({ id: q.id, position: q.position, spanish: q.spanish, english: q.english_subtitle, topics: q.topics, template: q.template.length ? q.template : q.topics })),
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

export type SaveResult = { ok: true; confirmed: boolean; value: number; bonus: number; progressReset: boolean } | { ok: false; error: string };

const sameWords = (a: string, b: string) => tokens(a).join(' ') === tokens(b).join(' ');

/**
 * Changing a confirmed answer resets the progress on that answer (answer-writing-coach: Changing a confirmed
 * answer). The memorise and automate mastery and attempt history for the question go, because they were earned
 * on words that are no longer there. Coins already earned stay, and nothing is taken away.
 */
export async function resetAnswerProgress(db: Db, profileId: string, questionId: string): Promise<void> {
  await db.query(`delete from mastery where profile_id = $1 and item_kind = 'question' and item_id = $2 and phase in ('memorise', 'automate')`, [profileId, questionId]);
  await db.query(`delete from attempts where profile_id = $1 and item_kind = 'question' and item_id = $2 and phase in ('memorise', 'automate')`, [profileId, questionId]);
}

/**
 * The all-five bonus: when every answer in the course is confirmed, one bonus equal to the value of the
 * lowest-valued answer is paid, once. It rewards finishing the writing and blocks nobody who moves on earlier.
 * Returns the amount paid now, or 0.
 */
async function payBonusIfComplete(db: Db, course: WritingCourse, profileId: string): Promise<number> {
  const { rows } = await db.query<{ value: number }>('select value from answers where profile_id = $1 and confirmed_at is not null', [profileId]);
  if (rows.length < course.questions.length) return 0;
  const paid = await db.query<{ n: string }>(`select count(*) as n from coin_ledger where profile_id = $1 and reason = 'bonus'`, [profileId]);
  if (Number(paid.rows[0].n) > 0) return 0;
  const amount = Math.max(1, Math.min(...rows.map((r) => r.value)));
  await awardCoins(db, profileId, amount, 'bonus');
  return amount;
}

/**
 * Saves an answer. The server re-checks it, so a confirmed answer always passes the word bank. Any edit
 * un-confirms the answer until the student confirms it again (they can change a confirmed answer later), and
 * changing the words of a confirmed answer resets its progress.
 */
export async function saveAnswer(db: Db, course: WritingCourse, profileId: string, questionId: string, text: string, confirm: boolean): Promise<SaveResult> {
  if (!course.questions.some((q) => q.id === questionId)) return { ok: false, error: 'Unknown question.' };
  if (text.length > 1500) return { ok: false, error: 'That answer is too long.' };
  const view = viewAnswer(course, text);
  if (confirm && (!view.canConfirm || !text.trim())) return { ok: false, error: 'This answer has words outside the sentence builder.' };

  const before = await db.query<{ text: string; confirmed_at: Date | null }>('select text, confirmed_at from answers where profile_id = $1 and question_id = $2', [profileId, questionId]);
  const progressReset = !!before.rows[0]?.confirmed_at && !sameWords(before.rows[0].text, text);
  if (progressReset) await resetAnswerProgress(db, profileId, questionId);

  await db.query(
    `insert into answers (profile_id, question_id, text, value, confirmed_at) values ($1,$2,$3,$4, case when $5 then now() else null end)
     on conflict (profile_id, question_id) do update set text = excluded.text, value = excluded.value,
       confirmed_at = case when $5 then now() else null end`,
    [profileId, questionId, text, view.assessment.value, confirm],
  );
  const bonus = confirm ? await payBonusIfComplete(db, course, profileId) : 0;
  return { ok: true, confirmed: confirm, value: view.assessment.value, bonus, progressReset };
}
