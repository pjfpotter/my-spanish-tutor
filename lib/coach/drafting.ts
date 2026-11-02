import type { createCostRouter } from '../cost-router/router';
import type { ServiceLimits } from '../cost-router/types';
import type { Level, ModelAnswer } from '../course/schema';
import { modelAnswersFor } from './model-answers';

type Router = ReturnType<typeof createCostRouter>;

export const DRAFTING_SERVICE = 'answer-drafting';

const DAY = 24 * 3_600_000;
/**
 * Spend cap and rate limit for drafting. SPIKE DEFAULTS: task 14.1 sets the real numbers once the
 * model and its price are chosen, as it does for transcription. The cap errs on the safe side.
 */
export const DRAFT_LIMITS: Record<string, ServiceLimits> = {
  [DRAFTING_SERVICE]: { capGbp: 4, periodMs: 30 * DAY, rate: { max: 10, windowMs: 10 * 60_000 } },
};

export type AnswerOptions<T> =
  | { source: 'draft'; draft: T }
  | {
      source: 'model';
      /** Why the student got model answers, so the screen can say so kindly. */
      reason: 'cap_reached' | 'rate_limited' | 'failed';
      /** Set when rate limited: a friendly message about waiting. The student still has model answers. */
      message?: string;
      answers: ModelAnswer[];
    };

/**
 * Asks for a drafted answer through the cost router, and falls back to the course's model answers
 * whenever drafting cannot be had: the cap is reached, the profile is rate limited, or the call
 * fails. A student is never blocked (answer-writing-coach: Draft failure handling). The router logs
 * the refusal or failure, which is the "event is logged" the spec asks for. `draft` is the actual
 * model call (task 7.3) and is never invoked when the router refuses.
 */
export async function draftOrModelAnswers<T>(deps: {
  route: Router;
  modelAnswers: ModelAnswer[];
  questionPosition: number;
  /** The rung the student is aiming for; model answers nearest it come first. */
  target?: Level;
  profileId: string;
  courseId: string;
  /** Worst-case cost of one draft, checked against the cap before calling. */
  estimateGbp: number;
  draft: () => Promise<{ value: T; units: number; costGbp: number }>;
}): Promise<AnswerOptions<T>> {
  const models = () => modelAnswersFor(deps.modelAnswers, deps.questionPosition, deps.target);
  const result = await deps.route({
    service: DRAFTING_SERVICE,
    tier: 'small_model',
    courseId: deps.courseId,
    profileId: deps.profileId,
    estimateGbp: deps.estimateGbp,
    call: deps.draft,
    fallback: models,
  });
  switch (result.status) {
    case 'ok':
      return { source: 'draft', draft: result.value };
    case 'rate_limited':
      return { source: 'model', reason: 'rate_limited', message: result.message, answers: models() };
    case 'cap_reached':
      return { source: 'model', reason: 'cap_reached', answers: result.fallback };
    case 'failed':
      return { source: 'model', reason: 'failed', answers: result.fallback };
  }
}
