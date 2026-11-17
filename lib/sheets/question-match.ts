import { norm } from './engine.ts';
import type { Interpretation } from './interpretation.ts';

/**
 * Which sheet question a course question is answered from (question-sheet-match). The match is the Spanish
 * text, compared without capitals, accents or punctuation, and is worked out each time from what is stored, so
 * it needs no column and cannot drift. A question with no match has no sentence builder: it is never answered
 * from another question's sheet.
 */
export function matchSheetQuestion(interpretation: Pick<Interpretation, 'questions'> | null | undefined, spanish: string): number | null {
  if (!interpretation) return null;
  const want = norm(spanish);
  if (!want) return null;
  const at = interpretation.questions.findIndex((q) => norm(q.es) === want);
  return at >= 0 ? at : null;
}

/** The course questions that have no sheet question, for the seed report and for tests. */
export function unmatchedQuestions<Q extends { position: number; spanish: string }>(
  questions: readonly Q[],
  interpretation: Pick<Interpretation, 'questions'> | null | undefined,
): Q[] {
  return questions.filter((q) => matchSheetQuestion(interpretation, q.spanish) === null);
}

export type BuilderLink = { ok: true; index: number | null } | { ok: false; error: string };

/**
 * Which of a builder's own questions a course question uses (course-builder-per-question, design D3). An explicit
 * link wins and must exist; otherwise the Spanish text decides; otherwise a builder with at most one question is
 * used whole (index null); otherwise nothing is guessed and the error lists the builder's questions to choose from.
 * Worked out once, at seed or migration, and stored: nothing compares text while a student writes.
 */
export function resolveBuilderQuestion(
  interpretation: Pick<Interpretation, 'questions'>,
  question: { spanish: string; builderQuestion?: number },
): BuilderLink {
  const qs = interpretation.questions;
  if (question.builderQuestion !== undefined) {
    const n = question.builderQuestion;
    return Number.isInteger(n) && n >= 0 && n < qs.length
      ? { ok: true, index: n }
      : { ok: false, error: `it links to question ${n} of its sentence builder, which does not exist (the builder has ${qs.length})` };
  }
  const at = matchSheetQuestion(interpretation, question.spanish);
  if (at !== null) return { ok: true, index: at };
  if (qs.length <= 1) return { ok: true, index: null };
  const list = qs.map((q, i) => `${i}: ${q.es}`).join(' | ');
  return { ok: false, error: `its sentence builder has ${qs.length} questions and none matches "${question.spanish}". Add builderQuestion to choose one (${list})` };
}
