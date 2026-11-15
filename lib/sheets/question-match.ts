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
