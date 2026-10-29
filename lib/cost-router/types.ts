export type Tier = 'stored' | 'rules' | 'speech' | 'small_model' | 'large_model';

export type Outcome = 'ok' | 'cap_reached' | 'rate_limited' | 'error';

export interface CostEntry {
  service: string;
  tier: Tier;
  units: number;
  estimatedCostGbp: number;
  courseId: string | null;
  profileId: string | null;
  outcome: Outcome;
}

/** Storage behind the router, so the rules can be tested without a database. */
export interface CostStore {
  /** Estimated spend on a service since `since`. */
  spentSince(service: string, since: Date): Promise<number>;
  /** Calls that reached the service (outcome ok or error) for a profile since `since`. */
  callsSince(profileId: string, service: string, since: Date): Promise<number>;
  log(entry: CostEntry): Promise<void>;
}

export interface ServiceLimits {
  /** Hard cap on estimated spend per period, in GBP. */
  capGbp: number;
  /** Length of the spend period in ms; the cap resets when it rolls over. */
  periodMs: number;
  /** Per-profile limit: at most `max` calls in any `windowMs`. */
  rate: { max: number; windowMs: number };
}

export type RouteResult<T, F> =
  | { status: 'ok'; value: T }
  | { status: 'cap_reached' | 'failed'; fallback: F }
  | { status: 'rate_limited'; message: string; retryAfterMs: number };
