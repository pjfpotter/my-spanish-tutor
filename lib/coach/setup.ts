import type { createCostRouter } from '../cost-router/router';
import type { ServiceLimits } from '../cost-router/types';
import { LEVELS, type Course, type Level, type ModelAnswer } from '../course/schema';
import { assessAnswer, survivesOneSwap } from './rubric';
import { buildWordBank, validateDraft } from './validator';

type Router = ReturnType<typeof createCostRouter>;

/**
 * The upload-time set-up call (task 7.8, course-content: Course set-up from a sentence builder). When a
 * sentence builder is uploaded, one call to a small model, through the cost router, flags chunk
 * combinations that do not work together and writes model answers for each question and level. It
 * is the only model call in the writing path: the student's side makes none. Code decides what is
 * kept: an answer survives only if every word is in the bank, the rubric puts it on the level it was
 * written for, and one swap would not drop it a level. A miss is asked for once more, then marked missing.
 */
export const SETUP_SERVICE = 'course-setup';

const DAY = 24 * 3_600_000;
/** SPIKE DEFAULTS: task 14.1 sets the real numbers once the model and its price are chosen. */
export const SETUP_LIMITS: Record<string, ServiceLimits> = {
  [SETUP_SERVICE]: { capGbp: 2, periodMs: 30 * DAY, rate: { max: 5, windowMs: 60 * 60_000 } },
};

export interface SetupRequest {
  questions: { position: number; spanish: string; english: string }[];
  chunkBank: string[];
  levels: Record<Level, { name: string; blurb: string }>;
  /** The teacher's examples, so the model can calibrate length and features. */
  examples: { level: Level; text: string }[];
  /** Answers the rubric rejected on the first try, so the model can fix them. */
  retry?: { questionPosition: number; level: Level; problem: string }[];
}

export interface SetupResponse {
  modelAnswers: ModelAnswer[];
  /** Combinations in the builder that read oddly, for example an adverb a verb phrase makes irrelevant. */
  flags: string[];
}

export interface Missing {
  questionPosition: number;
  level: Level;
  problem: string;
}

export interface SetupResult {
  modelAnswers: ModelAnswer[];
  flags: string[];
  /** Question and level pairs with no acceptable model answer: marked for the teacher, never offered. */
  missing: Missing[];
  source: 'model' | 'none';
  reason?: 'cap_reached' | 'rate_limited' | 'failed';
}

type CallModel = (req: SetupRequest) => Promise<{ value: SetupResponse; units: number; costGbp: number }>;

/** Why an answer is not acceptable at the level it was written for, or null if it is. */
export function problemWith(course: Pick<Course, 'chunks' | 'calibration'>, a: ModelAnswer): string | null {
  const bank = validateDraft(a.text, buildWordBank(course.chunks, course.calibration.glueWords));
  if (!bank.offer) return bank.reason;
  const assessed = assessAnswer(course.calibration, a.text);
  if (assessed.level !== a.level) return `the rubric puts it at ${assessed.level ?? 'no level'}, not ${a.level}`;
  if (a.level !== 'rock_solid' && !survivesOneSwap(course.calibration, assessed)) return 'one swap would drop it a level, so it needs a spare extra';
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
    levels: course.calibration.levels,
    examples: course.calibration.examples.map(({ level, text }) => ({ level, text })),
  };
  const wanted = course.questions.flatMap((q) => LEVELS.map((level) => ({ questionPosition: q.position, level })));
  const kept: ModelAnswer[] = [];
  const flags = new Set<string>();
  let problems: Missing[] = wanted.map((w) => ({ ...w, problem: 'not written yet' }));
  let last: Awaited<ReturnType<Router>> | null = null;

  for (let attempt = 0; attempt < 2 && problems.length; attempt++) {
    const req: SetupRequest = attempt === 0 ? base : { ...base, retry: problems.map(({ questionPosition, level, problem }) => ({ questionPosition, level, problem })) };
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
      const candidates = result.value.modelAnswers.filter((a) => a.questionPosition === w.questionPosition && a.level === w.level);
      let why = 'the model wrote no answer for it';
      let ok: ModelAnswer | undefined;
      for (const a of candidates) {
        const p = problemWith(course, a);
        if (!p) { ok = a; break; }
        why = p;
      }
      if (ok) kept.push(ok);
      else next.push({ ...w, problem: why });
    }
    problems = next;
  }
  void last;
  return { modelAnswers: kept, flags: [...flags], missing: problems, source: 'model' };
}
