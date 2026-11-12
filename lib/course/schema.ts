import { QUESTION_COUNT } from '../phases/gate.ts';
import { BASIC_TENSES, validateCalibration, type BasicTense, type Calibration } from './calibration/types.ts';

export { BASIC_TENSES, type BasicTense, type Calibration };

/**
 * What a chunk can count for in the mark scheme (design D8). The rubric engine (task 7.1) counts
 * these tags in an answer. Tags are about the language, not about marks, so a teacher can read them.
 */
/** Language that goes beyond the basics. Any tense outside the four basic ones is fancy. */
export const FANCY_TAGS = [
  /** Any tense other than the four basic ones: perfect, imperfect, simple future, subjunctive, and so on. */
  'other_tense',
  /** Syntax that is tricky for native English speakers, such as "A mis padres les gusta" or "me da miedo". */
  'tricky_syntax',
  'idiom',
] as const;
export type FancyTag = (typeof FANCY_TAGS)[number];

export const FEATURE_TAGS = [
  'verb_phrase',
  'opinion',
  'justification',
  'connective',
  'sequencer',
  // Detail. A phrase is worth more than a single word (see `rangeWeights`).
  'adjective',
  'adjective_phrase',
  'adverb',
  'adverb_phrase',
  ...BASIC_TENSES,
  ...FANCY_TAGS,
] as const;
export type FeatureTag = (typeof FEATURE_TAGS)[number];

export interface Chunk {
  spanish: string;
  english: string;
  category: string;
  featureTags: FeatureTag[];
  /** Recurs across topics; offered first when lifting an answer. */
  recycled: boolean;
}

export interface Question {
  position: number;
  spanish: string;
  /** English subtitle, text only. */
  english: string;
  /** The one question drawn from an earlier topic. */
  recycled: boolean;
  /** Chunk categories that answer this question. An answer is relevant if it uses at least one. */
  topics: string[];
  /** The categories shown as empty slots when a student opens the question. Defaults to all of `topics`. */
  template?: string[];
  /** The word the comprehension probe plays alone after a missed question, with its English meaning. */
  keyWord?: { spanish: string; english: string };
}

/**
 * A model answer for one question: the optional starting point in the writing stage. Written once when
 * the sentence builder is uploaded (or by hand). Its worth comes from the rubric, never from a label.
 */
export interface ModelAnswer {
  questionPosition: number;
  text: string;
}

export interface Course {
  title: string;
  classCode: string;
  /** ISO date, YYYY-MM-DD. */
  testDate: string;
  chunks: Chunk[];
  questions: Question[];
  /** Editable calibration data: features and their weights, glue words and the teacher's examples. */
  calibration: Calibration;
  modelAnswers: ModelAnswer[];
  /**
   * A testing course: every phase is open from the first visit (course-unlock-testing). Off unless the
   * seed says so, so a real class keeps the gated order.
   */
  unlockAll?: boolean;
}

export type CourseCheck = { ok: true; course: Course } | { ok: false; problems: string[] };

const blank = (v: unknown) => typeof v !== 'string' || !v.trim();

/** Checks a loose object (for example a seed file) and lists everything missing, or returns the course. */
export function validateCourse(input: unknown): CourseCheck {
  const c = (input ?? {}) as Partial<Course>;
  const problems: string[] = [];

  if (blank(c.title)) problems.push('title is missing');
  if (c.unlockAll !== undefined && typeof c.unlockAll !== 'boolean') problems.push('unlockAll must be true or false');
  if (blank(c.classCode)) problems.push('class code is missing');
  else if (!/^[A-Z0-9]{4,8}$/.test(c.classCode!)) problems.push('class code must be 4 to 8 capital letters or digits');
  if (blank(c.testDate) || !/^\d{4}-\d{2}-\d{2}$/.test(c.testDate!) || Number.isNaN(Date.parse(c.testDate!))) {
    problems.push('test date is missing or not a date (YYYY-MM-DD)');
  }

  const chunks = Array.isArray(c.chunks) ? c.chunks : [];
  if (!chunks.length) problems.push('the sentence builder has no chunks');
  chunks.forEach((ch, i) => {
    const at = `chunk ${i + 1}`;
    if (blank(ch?.spanish)) problems.push(`${at} has no Spanish`);
    if (blank(ch?.english)) problems.push(`${at} has no English gloss`);
    if (blank(ch?.category)) problems.push(`${at} has no category`);
    for (const t of ch?.featureTags ?? []) {
      if (!(FEATURE_TAGS as readonly string[]).includes(t)) problems.push(`${at} has unknown feature tag "${t}"`);
    }
  });

  const questions = Array.isArray(c.questions) ? c.questions : [];
  if (questions.length !== QUESTION_COUNT) {
    problems.push(`a course needs exactly ${QUESTION_COUNT} questions, found ${questions.length}`);
  }
  const categories = new Set(chunks.map((ch) => ch?.category));
  questions.forEach((q, i) => {
    if (blank(q?.spanish)) problems.push(`question ${i + 1} has no Spanish text`);
    if (blank(q?.english)) problems.push(`question ${i + 1} is missing its English subtitle`);
    if (!Array.isArray(q?.topics) || !q.topics.length) problems.push(`question ${i + 1} lists no topics that answer it`);
    else for (const t of q.topics) if (!categories.has(t)) problems.push(`question ${i + 1} names a topic "${t}" that no chunk has`);
    for (const t of q?.template ?? []) if (!(q.topics ?? []).includes(t)) problems.push(`question ${i + 1} has a starting slot "${t}" that is not one of its topics`);
  });
  if (questions.length === QUESTION_COUNT && questions.filter((q) => q?.recycled).length !== 1) {
    problems.push('exactly one question must be recycled from an earlier topic');
  }

  problems.push(...validateCalibration(c.calibration));

  const answers = Array.isArray(c.modelAnswers) ? c.modelAnswers : [];
  for (const a of answers) {
    if (!questions.some((q) => q?.position === a?.questionPosition)) problems.push(`a model answer is for question ${a?.questionPosition}, which does not exist`);
    if (blank(a?.text)) problems.push('a model answer has no text');
  }
  return problems.length ? { ok: false, problems } : { ok: true, course: c as Course };
}
