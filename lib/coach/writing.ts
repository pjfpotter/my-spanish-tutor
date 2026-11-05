import { BASIC_TENSES, LEVELS, type Course, type Level } from '../course/schema';
import { levelsAvailable, modelAnswersFor } from './model-answers';
import { assessAnswer, assessTest, levelFromCounts, survivesOneSwap, tokens, type AnswerAssessment, type TestAssessment } from './rubric';
import { buildWordBank, validateDraft } from './validator';

/**
 * The writing stage's rules (task 7.4), all pure and with no model call: picking a target level,
 * checking an answer, naming at most one optional touch, the whole-test checklist and the
 * confirmation gate. The screens call these and show the result; they decide nothing themselves.
 */
type WritingCourse = Pick<Course, 'chunks' | 'calibration' | 'modelAnswers'> & { questions: { position: number }[] };

/** What the student sees for a level: its name and blurb from the calibration data. Never a grade or a number. */
export const levelInfo = (course: Pick<Course, 'calibration'>, level: Level) => course.calibration.levels[level];

/** Where to start on a question for a target: the nearest model answer, easiest first. Null when the course has none. */
export function startingAnswer(course: WritingCourse, questionPosition: number, target: Level) {
  const first = modelAnswersFor(course.modelAnswers, questionPosition, target, { chunks: course.chunks, cal: course.calibration })[0];
  if (!first) return { answer: null, exact: false, available: [] as Level[] };
  return { answer: first, exact: first.level === target, available: levelsAvailable(course.modelAnswers, questionPosition) };
}

export interface Suggestion {
  featureId: string;
  /** Phrased as optional: "add one more touch if you like". */
  text: string;
  /** A phrase from the calibration data that would earn it. */
  example: string;
}

/**
 * At most one optional touch for an answer that has not reached the student's target. It prefers
 * features not yet used, easy before hard unless the target is Showing off, and a feature whose
 * phrase is a recycled chunk of the course first. Null when the answer is already at the target.
 */
export function suggestTouch(course: WritingCourse, a: AnswerAssessment, target: Level): Suggestion | null {
  if (a.level && LEVELS.indexOf(a.level) >= LEVELS.indexOf(target)) return null;
  const cal = course.calibration;
  if (!a.level) {
    return { featureId: 'frame', text: 'Add a reason with "porque" if you like.', example: cal.frame.justifiers[0] };
  }
  const used = new Set(a.features.map((f) => f.id));
  const recycled = new Set(course.chunks.filter((c) => c.recycled).flatMap((c) => tokens(c.spanish)));
  const hardFirst = target === 'showing_off';
  const candidates = cal.features
    .filter((f) => !used.has(f.id))
    .map((f) => ({ f, recycled: f.phrases.some((p) => tokens(p).every((w) => recycled.has(w))) }))
    .sort((x, y) => Number(hardFirst ? y.f.hard : x.f.hard) - Number(hardFirst ? x.f.hard : y.f.hard) || Number(y.recycled) - Number(x.recycled));
  const pick = candidates[0]?.f;
  return pick ? { featureId: pick.id, text: `Add ${pick.label} if you like.`, example: pick.phrases[0] } : null;
}

export interface AnswerView {
  assessment: AnswerAssessment;
  /** Words that are in neither the sentence builder nor the glue and common-word lists. They count for nothing and block confirmation. */
  outOfBank: string[];
  canConfirm: boolean;
  suggestion: Suggestion | null;
  /** True at Showing off: the coach says once that it takes more memorising. */
  loadNote: boolean;
  /** Whether one swap would leave the answer on its level. */
  steady: boolean;
}

export function viewAnswer(course: WritingCourse, text: string, target: Level): AnswerView {
  const assessment = assessAnswer(course.calibration, text);
  const bank = validateDraft(text, buildWordBank(course.chunks, course.calibration.glueWords));
  return {
    assessment,
    outOfBank: bank.check.outOfBank.map((o) => o.word),
    canConfirm: bank.offer,
    suggestion: suggestTouch(course, assessment, target),
    loadNote: assessment.level === 'showing_off' || target === 'showing_off',
    steady: survivesOneSwap(course.calibration, assessment),
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

/** Memorisation unlocks only when every answer is confirmed (answer-writing-coach: Confirmation gate). */
export const allConfirmed = (confirmedPositions: number[], course: { questions: { position: number }[] }) =>
  course.questions.every((q) => confirmedPositions.includes(q.position));

/** Numbers stored in the answers table: 0 means no level yet, otherwise 1 to 3. Never shown to a student. */
export const levelToStored = (l: Level | null) => (l ? LEVELS.indexOf(l) + 1 : 0);
export const levelFromStored = (n: number): Level | null => (n >= 1 && n <= LEVELS.length ? LEVELS[n - 1] : null);

export { levelFromCounts };
