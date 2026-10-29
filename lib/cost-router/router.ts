import type { CostStore, RouteResult, ServiceLimits, Tier } from './types';

export const RATE_LIMITED_MESSAGE = 'Whoa, slow down a bit! Give it a minute and try again.';

export interface CallRequest<T, F> {
  service: string;
  tier: Tier;
  courseId?: string | null;
  /** Null for build scripts and other calls with no student behind them. */
  profileId?: string | null;
  /** Worst-case cost, checked against the cap before the call is made. */
  estimateGbp: number;
  call: () => Promise<{ value: T; units: number; costGbp: number }>;
  /** Used when the cap is reached or the call fails. */
  fallback: () => F | Promise<F>;
}

export function createCostRouter(
  store: CostStore,
  limits: Record<string, ServiceLimits>,
  now: () => Date = () => new Date(),
) {
  return async function route<T, F>(req: CallRequest<T, F>): Promise<RouteResult<T, F>> {
    const limit = limits[req.service];
    if (!limit) throw new Error(`No spend cap configured for service "${req.service}"`);

    const courseId = req.courseId ?? null;
    const profileId = req.profileId ?? null;
    const refusal = (outcome: 'cap_reached' | 'rate_limited') =>
      store.log({ service: req.service, tier: req.tier, units: 0, estimatedCostGbp: 0, courseId, profileId, outcome });

    if (profileId) {
      const windowStart = new Date(now().getTime() - limit.rate.windowMs);
      if ((await store.callsSince(profileId, req.service, windowStart)) >= limit.rate.max) {
        await refusal('rate_limited');
        return { status: 'rate_limited', message: RATE_LIMITED_MESSAGE, retryAfterMs: limit.rate.windowMs };
      }
    }

    const periodStart = new Date(now().getTime() - limit.periodMs);
    const spent = await store.spentSince(req.service, periodStart);
    if (spent + req.estimateGbp > limit.capGbp) {
      await refusal('cap_reached');
      return { status: 'cap_reached', fallback: await req.fallback() };
    }

    try {
      const { value, units, costGbp } = await req.call();
      await store.log({
        service: req.service, tier: req.tier, units, estimatedCostGbp: costGbp, courseId, profileId, outcome: 'ok',
      });
      return { status: 'ok', value };
    } catch {
      await store.log({
        service: req.service, tier: req.tier, units: 0, estimatedCostGbp: 0, courseId, profileId, outcome: 'error',
      });
      return { status: 'failed', fallback: await req.fallback() };
    }
  };
}
