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

/** One sentence builder of a course, as stored: the sheet, its interpretation and the calibration for answers written on it. */
export interface WritingBuilder {
  id: string;
  name: string;
  sheet: Sheet;
  interpretation: Interpretation;
  calibration: Calibration;
}

export interface WritingCourse {
  questions: {
    id: string; position: number; spanish: string; english: string; topics: string[]; template: string[];
    /** The sentence builder this question is written on, or null when it has none yet (question-builder-assignment). */
    builderId: string | null;
    /** Which of that builder's own questions it uses, or null for the whole builder. Fixed when the course was seeded. */
    builderQuestion: number | null;
  }[];
  chunks: Chunk[];
  /** The course's own calibration: the whole-test targets, and the fallback for a question with no builder. */
  calibration: Calibration;
  modelAnswers: ModelAnswer[];
  /** The course's sentence builders, in order. Empty only for bare test fixtures. */
  builders: WritingBuilder[];
}

export interface SavedAnswer {
  questionId: string;
  text: string;
  confirmed: boolean;
  /** The sheet chunks chosen, when the answer was built on the sheet. */
  selection: Selection | null;
}

export async function loadWritingCourse(db: Db, courseId: string): Promise<WritingCourse> {
  const course = await db.query<{ calibration: Calibration; model_answers: ModelAnswer[] }>('select calibration, model_answers from courses where id = $1', [courseId]);
  const questions = await db.query<{ id: string; position: number; spanish: string; english_subtitle: string; topics: string[]; template: string[]; builder_id: string | null; builder_question: number | null }>(
    'select id, position, spanish, english_subtitle, topics, template, builder_id, builder_question from questions where course_id = $1 order by position', [courseId]);
  const chunks = await db.query<{ spanish: string; english_gloss: string; category: string; feature_tags: string[]; recycled: boolean }>(
    'select spanish, english_gloss, category, feature_tags, recycled from chunks where course_id = $1 order by spanish', [courseId]);
  const builders = await db.query<{ id: string; name: string; sheet: Sheet; interpretation: Interpretation; calibration: Calibration }>(
    'select id, name, sheet, interpretation, calibration from course_builders where course_id = $1 order by position', [courseId]);
  return {
    questions: questions.rows.map((q) => ({ id: q.id, position: q.position, spanish: q.spanish, english: q.english_subtitle, topics: q.topics, template: q.template.length ? q.template : q.topics, builderId: q.builder_id, builderQuestion: q.builder_question })),
    chunks: chunks.rows.map((c) => ({ spanish: c.spanish, english: c.english_gloss, category: c.category, featureTags: c.feature_tags as Chunk['featureTags'], recycled: c.recycled })),
    calibration: course.rows[0].calibration,
    modelAnswers: course.rows[0].model_answers,
    builders: builders.rows,
  };
}

export async function loadSavedAnswers(db: Db, profileId: string): Promise<SavedAnswer[]> {
  const { rows } = await db.query<{ question_id: string; text: string; confirmed_at: Date | null; selection: Selection | null }>(
    'select question_id, text, confirmed_at, selection from answers where profile_id = $1', [profileId]);
  return rows.map((r) => ({ questionId: r.question_id, text: r.text, confirmed: r.confirmed_at !== null, selection: r.selection ?? null }));
}

export type SaveResult = { ok: true; confirmed: boolean; value: number; bonus: number; progressReset: boolean } | { ok: false; error: string };

export const NO_SHEET_FOR_QUESTION = 'This question has no sentence builder yet.';

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

const prepared = new WeakMap<WritingBuilder, Builder>();

/**
 * The prepared builder for a question's sentence builder, or null when the question has none (or a bare test
 * fixture has no builders). Built the same way on the server and in the browser, and kept per builder.
 */
export function builderFor(course: WritingCourse, question: WritingCourse['questions'][number]): Builder | null {
  const wb = question.builderId === null ? undefined : course.builders.find((b) => b.id === question.builderId);
  if (!wb) return null;
  let B = prepared.get(wb);
  if (!B) { B = prepare(buildBuilder(wb.id, wb.sheet, wb.interpretation)); prepared.set(wb, B); }
  return B;
}

/** The builder's own question a course question is written against, or undefined for the whole builder. */
export const builderQuestionFor = (B: Builder, question: WritingCourse['questions'][number]) => (question.builderQuestion === null ? undefined : B.questions[question.builderQuestion]);

/** The calibration that scores answers to a question: its builder's, or the course's when it has none (question-builder-assignment). */
export function calibrationFor(course: Pick<WritingCourse, 'calibration' | 'builders'>, question: { builderId: string | null }): Calibration {
  return course.builders.find((b) => b.id === question.builderId)?.calibration ?? course.calibration;
}

/**
 * Saves an answer built on the sheet. The server rebuilds it from the chosen chunks, so nothing the browser
 * sends can put words on the card that are not on the sheet. It is confirmed only when the exam-rule
 * sign-off passes. The stored text is the Spanish sentence, and its value comes from the rubric on that sentence.
 */
export async function saveSheetAnswer(db: Db, course: WritingCourse, profileId: string, questionId: string, selection: unknown, confirm: boolean): Promise<SaveResult> {
  const question = course.questions.find((q) => q.id === questionId);
  if (!question) return { ok: false, error: 'Unknown question.' };
  // A question with no builder is never answered from another question's builder.
  const B = builderFor(course, question);
  if (!B) return { ok: false, error: NO_SHEET_FOR_QUESTION };
  const Q = builderQuestionFor(B, question);
  const a = fromSelection(B, selection);
  if (!a) return { ok: false, error: 'That answer is not from your sentence builder.' };
  const text = sentences(B, a, 'es', Q).join(' ');
  if (text.length > 1500) return { ok: false, error: 'That answer is too long.' };
  const value = assessAnswer(calibrationFor(course, question), text).value;
  const ok = signOff(B, a, Q).code === 'ok';
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
