import { QUESTION_COUNT } from '../phases/gate.ts';

/**
 * What a chunk can count for in the mark scheme (design D8). The rubric engine (task 7.1) counts
 * these tags in an answer. Tags are about the language, not about marks, so a teacher can read them.
 */
export const BASIC_TENSES = ['present', 'preterite', 'near_future', 'conditional'] as const;
export type BasicTense = (typeof BASIC_TENSES)[number];

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

/**
 * The five rungs a student sees, by name only. Grades are never shown or mentioned in the app.
 * (Behind the scenes, for the teacher's own understanding: survival is working towards grade 1,
 * opinion grade 2, detail grades 3 to 4, range grade 4, showing off grade 5 and above. This mapping
 * is deliberately not in code or in any screen.)
 */
export const LEVELS = ['survival', 'opinion', 'detail', 'range', 'showing_off'] as const;
export type Level = (typeof LEVELS)[number];

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
}

/**
 * The mark scheme as data, so each course can tune it. Two kinds of rule:
 *  - per answer: survival, opinion, detail and showing off look at one answer;
 *  - across the test: `range` is gated by tenses used over all five answers, and the coach steers
 *    toward the opinion target without making it a gate (not every question suits an opinion).
 * Opinion and detail are two routes at the same height. An answer can reach detail with no opinion.
 */
export interface MarkScheme {
  /** Understands the question and says something relevant that counts as a sentence. */
  survival: { verbPhrases: number };
  /** A justified opinion: an opinion chunk and a justification chunk. */
  opinion: { justifiedOpinions: number };
  /** Range and extra detail: several verb phrases joined with sequencers, and weighted detail words. */
  detail: { verbPhrases: number; sequencers: number; rangePoints: number };
  /** Detail, plus this many different basic tenses across the whole test. */
  range: { basicTensesAcrossTest: number };
  /** Range, plus this many fancy features used in the answer. */
  showing_off: { fancyFeatures: number };
  /** A phrase is worth more than a single word. Used for `rangePoints`. */
  rangeWeights: { adjective: number; adjective_phrase: number; adverb: number; adverb_phrase: number };
  /** Roughly how many justified opinions a whole speaking test wants. A target the coach steers to, not a gate. */
  justifiedOpinionsTarget: number;
}

/**
 * A ready-made answer, offered when drafting is unavailable or capped so a student is never blocked.
 * Hand-authored from the sentence builder. `rung` is the author's intent; the rubric engine
 * (task 7.1) still works out the real rung, and a test checks the two agree.
 */
export interface ModelAnswer {
  questionPosition: number;
  rung: Level;
  text: string;
}

export interface Course {
  title: string;
  classCode: string;
  /** ISO date, YYYY-MM-DD. */
  testDate: string;
  chunks: Chunk[];
  questions: Question[];
  markScheme: MarkScheme;
  modelAnswers: ModelAnswer[];
}

export type CourseCheck = { ok: true; course: Course } | { ok: false; problems: string[] };

const blank = (v: unknown) => typeof v !== 'string' || !v.trim();
const posInt = (v: unknown) => Number.isInteger(v) && (v as number) >= 1;

function checkMarkScheme(m: Partial<MarkScheme> | undefined, problems: string[]) {
  if (!m) return void problems.push('the mark scheme is missing');
  const need = (ok: boolean, text: string) => ok || problems.push(`mark scheme: ${text}`);

  need(posInt(m.survival?.verbPhrases), 'survival needs a whole number of verb phrases of at least 1');
  need(posInt(m.opinion?.justifiedOpinions), 'opinion needs a whole number of justified opinions of at least 1');
  need(posInt(m.detail?.verbPhrases) && posInt(m.detail?.sequencers) && posInt(m.detail?.rangePoints), 'detail needs verb phrases, sequencers and range points, each at least 1');
  need(
    posInt(m.range?.basicTensesAcrossTest) && m.range!.basicTensesAcrossTest <= BASIC_TENSES.length,
    `range needs a number of basic tenses from 1 to ${BASIC_TENSES.length}`,
  );
  need(posInt(m.showing_off?.fancyFeatures), 'showing off needs at least 1 fancy feature');
  need(posInt(m.justifiedOpinionsTarget), 'the justified-opinions target must be at least 1');

  const w = m.rangeWeights;
  if (!w || ![w.adjective, w.adjective_phrase, w.adverb, w.adverb_phrase].every(posInt)) {
    problems.push('mark scheme: every range weight must be a whole number of at least 1');
  } else {
    need(w.adjective_phrase > w.adjective, 'an adjective phrase must be worth more than a single adjective');
    need(w.adverb_phrase > w.adverb, 'an adverb phrase must be worth more than a single adverb');
  }
  // Grades are never part of a mark scheme, in code or on screen.
  const text = JSON.stringify(m).toLowerCase();
  need(!/grade|wtg|"mark"|score/.test(text), 'a mark scheme must not contain grades or marks');
}

/** Checks a loose object (for example a seed file) and lists everything missing, or returns the course. */
export function validateCourse(input: unknown): CourseCheck {
  const c = (input ?? {}) as Partial<Course>;
  const problems: string[] = [];

  if (blank(c.title)) problems.push('title is missing');
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
  });
  if (questions.length === QUESTION_COUNT && questions.filter((q) => q?.recycled).length !== 1) {
    problems.push('exactly one question must be recycled from an earlier topic');
  }

  checkMarkScheme(c.markScheme, problems);

  const answers = Array.isArray(c.modelAnswers) ? c.modelAnswers : [];
  for (const a of answers) {
    if (!questions.some((q) => q?.position === a?.questionPosition)) problems.push(`a model answer is for question ${a?.questionPosition}, which does not exist`);
    if (!(LEVELS as readonly string[]).includes(a?.rung)) problems.push(`a model answer has an unknown rung "${a?.rung}"`);
    if (blank(a?.text)) problems.push('a model answer has no text');
  }
  for (const q of questions) {
    const mine = answers.filter((a) => a?.questionPosition === q?.position);
    if (mine.length < 2) problems.push(`question ${q?.position} needs at least two model answers, found ${mine.length}`);
    else if (!mine.some((a) => a.rung === 'survival')) problems.push(`question ${q?.position} needs a survival model answer so a nervous student has somewhere to start`);
  }
  return problems.length ? { ok: false, problems } : { ok: true, course: c as Course };
}
