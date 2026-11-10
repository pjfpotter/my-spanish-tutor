import { BASIC_TENSES, type Course } from '../course/schema';
import { modelAnswersFor } from './model-answers';
import { assessAnswer, assessTest, featureValue, tokens, type AnswerAssessment, type TestAssessment } from './rubric';
import { buildWordBank, validateDraft } from './validator';

/**
 * The writing stage's rules (tasks 7.4 and 26.1), all pure and with no model call: the optional starter,
 * checking an answer, naming at most one optional extra, the whole-test checklist and the confirmation
 * gate. The screens call these and show the result; they decide nothing themselves.
 */
type WritingCourse = Pick<Course, 'chunks' | 'calibration' | 'modelAnswers'> & { questions: { position: number }[] };

/** The optional starter for a question: its simplest model answer, or null when the course has none. */
export function startingAnswer(course: WritingCourse, questionPosition: number) {
  return modelAnswersFor(course.modelAnswers, questionPosition, { chunks: course.chunks, cal: course.calibration })[0] ?? null;
}

export interface Suggestion {
  featureId: string;
  /** Phrased as optional: "add one more touch if you like". */
  text: string;
  /** A phrase from the calibration data that would earn it. */
  example: string;
}

/**
 * At most one optional extra, once an answer works (it has a justified opinion). It is the cheapest
 * feature the answer does not use yet, so it sits just outside the student's comfort zone, and a feature
 * whose phrase is a recycled chunk of the course comes first. Null before the first working answer.
 */
export function suggestTouch(course: WritingCourse, a: AnswerAssessment): Suggestion | null {
  if (a.justifiedOpinions < 1) return null;
  const used = new Set(a.features.map((f) => f.id));
  const recycled = new Set(course.chunks.filter((c) => c.recycled).flatMap((c) => tokens(c.spanish)));
  const candidates = course.calibration.features
    .filter((f) => !used.has(f.id))
    .map((f) => ({ f, recycled: f.phrases.some((p) => tokens(p).every((w) => recycled.has(w))) }))
    .sort((x, y) => Number(y.recycled) - Number(x.recycled) || featureValue(x.f) - featureValue(y.f));
  const pick = candidates[0]?.f;
  return pick ? { featureId: pick.id, text: `Add ${pick.label} if you like.`, example: pick.phrases[0] } : null;
}

export interface AnswerView {
  assessment: AnswerAssessment;
  /** Words that are in neither the sentence builder nor the glue and common-word lists. They count for nothing and block confirmation. */
  outOfBank: string[];
  canConfirm: boolean;
  suggestion: Suggestion | null;
  /** True when the answer is worth more than the course's load-note value: the coach says once that it takes more learning. */
  loadNote: boolean;
}

export function viewAnswer(course: WritingCourse, text: string): AnswerView {
  const assessment = assessAnswer(course.calibration, text);
  const bank = validateDraft(text, buildWordBank(course.chunks, course.calibration.glueWords));
  return {
    assessment,
    outOfBank: bank.check.outOfBank.map((o) => o.word),
    canConfirm: bank.offer,
    suggestion: suggestTouch(course, assessment),
    loadNote: assessment.value > course.calibration.loadNoteValue,
  };
}

export interface WholeTestView {
  test: TestAssessment;
  /** One optional pointer at the answer where a missing tense is easiest to add, or null. */
  tenseHint: { questionPosition: number; tense: string; example: string } | null;
}

/** The whole-test checklist. Targets are ticks, never gates: no answer is lowered because one is unmet. */
export function viewWholeTest(course: WritingCourse, answers: { questionPosition: number; text: string }[]): WholeTestView {
  const test = assessTest(course.calibration, answers);
  let tenseHint: WholeTestView['tenseHint'] = null;
  if (!test.checklist.tenses.met) {
    const missing = BASIC_TENSES.find((t) => !test.tenses.includes(t) && course.calibration.tenses[t].length > 0);
    const shortest = [...answers].filter((a) => a.text.trim()).sort((x, y) => tokens(x.text).length - tokens(y.text).length)[0];
    if (missing && shortest) tenseHint = { questionPosition: shortest.questionPosition, tense: missing, example: course.calibration.tenses[missing][0] };
  }
  return { test, tenseHint };
}

/** True when every answer in the course is confirmed (the all-five bonus; each answer unlocks memorising on its own). */
export const allConfirmed = (confirmedPositions: number[], course: { questions: { position: number }[] }) =>
  course.questions.every((q) => confirmedPositions.includes(q.position));
