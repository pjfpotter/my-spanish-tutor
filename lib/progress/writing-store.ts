import { assessAnswer, tokens } from '../coach/rubric';
import { awardCoins } from '../coins/ledger';
import { buildBuilder, type Builder } from '../sheets/builder';
import { prepare, sentences } from '../sheets/engine';
import type { Interpretation } from '../sheets/interpretation';
import { fromSelection, type Selection } from '../sheets/selection';
import { signOff } from '../sheets/signoff';
import type { Sheet } from '../sheets/types';
import type { Db } from '../db/types';
import type { Calibration, Chunk, ModelAnswer } from '../course/schema';

export interface WritingCourse {
  questions: { id: string; position: number; spanish: string; english: string; topics: string[]; template: string[] }[];
  chunks: Chunk[];
  calibration: Calibration;
  modelAnswers: ModelAnswer[];
  /** The teacher's sentence builder. Every course made through the seed has one; null only for bare test fixtures. */
  sheet: { sheet: Sheet; interpretation: Interpretation } | null;
}

export interface SavedAnswer {
  questionId: string;
  text: string;
  confirmed: boolean;
  /** The sheet chunks chosen, when the answer was built on the sheet. */
  selection: Selection | null;
}

export async function loadWritingCourse(db: Db, courseId: string): Promise<WritingCourse> {
  const course = await db.query<{ calibration: Calibration; model_answers: ModelAnswer[]; sheet: Sheet | null; interpretation: Interpretation | null }>('select calibration, model_answers, sheet, interpretation from courses where id = $1', [courseId]);
  const questions = await db.query<{ id: string; position: number; spanish: string; english_subtitle: string; topics: string[]; template: string[] }>(
    'select id, position, spanish, english_subtitle, topics, template from questions where course_id = $1 order by position', [courseId]);
  const chunks = await db.query<{ spanish: string; english_gloss: string; category: string; feature_tags: string[]; recycled: boolean }>(
    'select spanish, english_gloss, category, feature_tags, recycled from chunks where course_id = $1 order by spanish', [courseId]);
  return {
    questions: questions.rows.map((q) => ({ id: q.id, position: q.position, spanish: q.spanish, english: q.english_subtitle, topics: q.topics, template: q.template.length ? q.template : q.topics })),
    chunks: chunks.rows.map((c) => ({ spanish: c.spanish, english: c.english_gloss, category: c.category, featureTags: c.feature_tags as Chunk['featureTags'], recycled: c.recycled })),
    calibration: course.rows[0].calibration,
    modelAnswers: course.rows[0].model_answers,
    sheet: course.rows[0].sheet && course.rows[0].interpretation ? { sheet: course.rows[0].sheet, interpretation: course.rows[0].interpretation } : null,
  };
}

export async function loadSavedAnswers(db: Db, profileId: string): Promise<SavedAnswer[]> {
  const { rows } = await db.query<{ question_id: string; text: string; confirmed_at: Date | null; selection: Selection | null }>(
    'select question_id, text, confirmed_at, selection from answers where profile_id = $1', [profileId]);
  return rows.map((r) => ({ questionId: r.question_id, text: r.text, confirmed: r.confirmed_at !== null, selection: r.selection ?? null }));
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

/** The prepared builder for the course's sheet, or null for a course row that has none (only test fixtures).  Built the same way on the server and in the browser. */
export function builderFor(course: WritingCourse): Builder | null {
  return course.sheet ? prepare(buildBuilder('course', course.sheet.sheet, course.sheet.interpretation)) : null;
}

/**
 * Saves an answer built on the sheet. The server rebuilds it from the chosen chunks, so nothing the browser
 * sends can put words on the card that are not on the sheet. It is confirmed only when the exam-rule
 * sign-off passes. The stored text is the Spanish sentence, and its value comes from the rubric on that sentence.
 */
export async function saveSheetAnswer(db: Db, course: WritingCourse, profileId: string, questionId: string, selection: unknown, confirm: boolean): Promise<SaveResult> {
  const B = builderFor(course);
  if (!B) return { ok: false, error: 'This course has no sentence builder.' };
  if (!course.questions.some((q) => q.id === questionId)) return { ok: false, error: 'Unknown question.' };
  const a = fromSelection(B, selection);
  if (!a) return { ok: false, error: 'That answer is not from your sentence builder.' };
  const text = sentences(B, a, 'es').join(' ');
  if (text.length > 1500) return { ok: false, error: 'That answer is too long.' };
  const value = assessAnswer(course.calibration, text).value;
  const ok = signOff(B, a).code === 'ok';
  if (confirm && (!ok || !text.trim())) return { ok: false, error: 'This answer is not finished yet.' };
  const before = await db.query<{ text: string; confirmed_at: Date | null }>('select text, confirmed_at from answers where profile_id = $1 and question_id = $2', [profileId, questionId]);
  const progressReset = !!before.rows[0]?.confirmed_at && !sameWords(before.rows[0].text, text);
  if (progressReset) await resetAnswerProgress(db, profileId, questionId);
  await db.query(
    `insert into answers (profile_id, question_id, text, value, selection, confirmed_at) values ($1,$2,$3,$6,$4, case when $5 then now() else null end)
     on conflict (profile_id, question_id) do update set text = excluded.text, value = excluded.value, selection = excluded.selection,
       confirmed_at = case when $5 then now() else null end`,
    [profileId, questionId, text, JSON.stringify(selection), confirm, value],
  );
  const bonus = confirm ? await payBonusIfComplete(db, course, profileId) : 0;
  return { ok: true, confirmed: confirm, value, bonus, progressReset };
}
