import type { createCostRouter } from '../cost-router/router';
import type { ServiceLimits } from '../cost-router/types';
import type { Course, ModelAnswer } from '../course/schema';
import { assessAnswer } from './rubric';
import { buildWordBank, validateDraft } from './validator';

import { COURSE_SETUP, SERVICE_LIMITS } from '../cost-router/limits';
type Router = ReturnType<typeof createCostRouter>;

/**
 * The upload-time set-up call (task 7.8, course-content: Course set-up from a sentence builder). When a
 * sentence builder is uploaded, one call to a small model, through the cost router, flags chunk
 * combinations that do not work together and writes a few model answers for each question, from simple
 * to rich. It is the only model call in the writing path: the student's side makes none. Code decides
 * what is kept: an answer survives only if every word is in the bank and the rubric finds a justified
 * opinion in it. A question with no kept answer is asked for once more, then marked missing.
 */
export const SETUP_SERVICE = 'course-setup';

/** Caps live in one registry (task 14.1). */
export const SETUP_LIMITS: Record<string, ServiceLimits> = { [SETUP_SERVICE]: SERVICE_LIMITS[COURSE_SETUP] };

export interface SetupRequest {
  questions: { position: number; spanish: string; english: string }[];
  chunkBank: string[];
  /** How many answers to write for each question, from simple to rich. */
  perQuestion: number;
  /** The teacher's examples, so the model can calibrate length and features. */
  examples: { text: string }[];
  /** Questions with no acceptable answer on the first try, and why, so the model can fix them. */
  retry?: { questionPosition: number; problem: string }[];
}

export interface SetupResponse {
  modelAnswers: ModelAnswer[];
  /** Combinations in the builder that read oddly, for example an adverb a verb phrase makes irrelevant. */
  flags: string[];
}

export interface Missing {
  questionPosition: number;
  problem: string;
}

/** Answers asked for per question: a simple one and some richer ones. */
export const ANSWERS_PER_QUESTION = 3;

export interface SetupResult {
  modelAnswers: ModelAnswer[];
  flags: string[];
  /** Questions with no acceptable model answer: marked for the teacher, never offered. */
  missing: Missing[];
  source: 'model' | 'none';
  reason?: 'cap_reached' | 'rate_limited' | 'failed';
}

type CallModel = (req: SetupRequest) => Promise<{ value: SetupResponse; units: number; costGbp: number }>;

/** Why an answer is not acceptable as a starter, or null if it is. */
export function problemWith(course: Pick<Course, 'chunks' | 'calibration'>, a: ModelAnswer): string | null {
  const bank = validateDraft(a.text, buildWordBank(course.chunks, course.calibration.glueWords));
  if (!bank.offer) return bank.reason;
  if (assessAnswer(course.calibration, a.text).justifiedOpinions < 1) return 'it has no opinion with a reason, so it is not worth anything yet';
  return null;
}

export async function setUpCourse(deps: {
  route: Router;
  course: Pick<Course, 'chunks' | 'calibration' | 'questions'>;
  courseId: string;
  estimateGbp: number;
  callModel: CallModel;
}): Promise<SetupResult> {
  const { course } = deps;
  const base: SetupRequest = {
    questions: course.questions.map(({ position, spanish, english }) => ({ position, spanish, english })),
    chunkBank: course.chunks.map((c) => c.spanish),
    perQuestion: ANSWERS_PER_QUESTION,
    examples: course.calibration.examples.map(({ text }) => ({ text })),
  };
  const kept: ModelAnswer[] = [];
  const flags = new Set<string>();
  let problems: Missing[] = course.questions.map((q) => ({ questionPosition: q.position, problem: 'not written yet' }));
  let last: Awaited<ReturnType<Router>> | null = null;

  for (let attempt = 0; attempt < 2 && problems.length; attempt++) {
    const req: SetupRequest = attempt === 0 ? base : { ...base, retry: problems.map(({ questionPosition, problem }) => ({ questionPosition, problem })) };
    const result = await deps.route({
      service: SETUP_SERVICE, tier: 'small_model', courseId: deps.courseId, profileId: null,
      estimateGbp: deps.estimateGbp, call: () => deps.callModel(req), fallback: () => null,
    });
    last = result;
    if (result.status !== 'ok') {
      const reason = result.status;
      return { modelAnswers: kept, flags: [...flags], missing: problems, source: kept.length ? 'model' : 'none', reason };
    }
    result.value.flags.forEach((f) => flags.add(f));
    const next: Missing[] = [];
    for (const w of problems) {
      const candidates = result.value.modelAnswers.filter((a) => a.questionPosition === w.questionPosition);
      let why = 'the model wrote no answer for it';
      let got = 0;
      for (const a of candidates) {
        const p = problemWith(course, a);
        if (p) why = p;
        else if (!kept.some((k) => k.questionPosition === a.questionPosition && k.text === a.text)) {
          kept.push({ questionPosition: a.questionPosition, text: a.text });
          got++;
        }
      }
      if (!got) next.push({ ...w, problem: why });
    }
    problems = next;
  }
  void last;
  return { modelAnswers: kept, flags: [...flags], missing: problems, source: 'model' };
}
