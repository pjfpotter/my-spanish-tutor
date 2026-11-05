import type { Db } from '../db/types';

export type BaselineStage = 'pre' | 'post';

export interface BaselineRow {
  questionId: string;
  stage: BaselineStage;
  correct: boolean;
}

/** Saves one baseline answer (the first answer for a question and stage stands). Returns false if the question is not in the student's course. */
export async function saveBaseline(db: Db, i: { profileId: string; courseId: string; questionId: string; stage: BaselineStage; correct: boolean }): Promise<boolean> {
  const q = await db.query('select 1 from questions where id = $1 and course_id = $2', [i.questionId, i.courseId]);
  if (!q.rows.length) return false;
  await db.query(
    `insert into baseline_results (profile_id, question_id, stage, correct) values ($1,$2,$3,$4) on conflict do nothing`,
    [i.profileId, i.questionId, i.stage, i.correct],
  );
  return true;
}

export async function loadBaseline(db: Db, profileId: string): Promise<BaselineRow[]> {
  const { rows } = await db.query<{ question_id: string; stage: BaselineStage; correct: boolean }>(
    'select question_id, stage, correct from baseline_results where profile_id = $1', [profileId],
  );
  return rows.map((r) => ({ questionId: r.question_id, stage: r.stage, correct: r.correct }));
}

/** The check is finished once every question has its second test. Until then it is still offered. */
export function baselineDone(rows: BaselineRow[], questionCount: number): boolean {
  return rows.filter((r) => r.stage === 'post').length >= questionCount;
}

export interface BaselineSummary {
  before: number;
  after: number;
  total: number;
}

export function summariseBaseline(rows: BaselineRow[], total: number): BaselineSummary {
  const count = (stage: BaselineStage) => rows.filter((r) => r.stage === stage && r.correct).length;
  return { before: count('pre'), after: count('post'), total };
}

/**
 * Questions the student already understood cold, before being taught anything. Practice can begin
 * these at normal speed; every other question starts slowly.
 */
export function knownAtStart(rows: BaselineRow[]): Set<string> {
  return new Set(rows.filter((r) => r.stage === 'pre' && r.correct).map((r) => r.questionId));
}
