import type { Db } from '../db/types';
import type { Tier } from '../cost-router/types';

/** Cheapest first, the order the app tries them in (usage-cost-control: Cheapest adequate tool). */
export const TIERS: Tier[] = ['stored', 'rules', 'speech', 'small_model', 'large_model'];

export interface TierCost {
  tier: Tier;
  costGbp: number;
  /** 0 to 1 of the total. 0 for every tier when nothing has been spent. */
  share: number;
  /** Paid calls that went through. */
  calls: number;
}

export interface CostReport {
  /** Students now in the course. Deleted profiles are gone, so their share is spread over those who remain. */
  students: number;
  totalGbp: number;
  /** Null when there are no students to divide by. */
  perStudentGbp: number | null;
  tiers: TierCost[];
  /** Calls the router refused because a cap or rate limit was reached. */
  refused: number;
}

/**
 * Estimated cost for a course, from the cost log alone. It counts everything logged against the course plus
 * shared build costs that name no course (such as the tutor's voice clips), so with one course at a time the
 * per-student figure is the whole bill divided by students.
 */
export async function loadCostReport(db: Db, courseId: string): Promise<CostReport> {
  const { rows } = await db.query<{ tier: Tier; cost: string; calls: string; refused: string }>(
    `select tier,
            coalesce(sum(estimated_cost_gbp), 0) as cost,
            count(*) filter (where outcome = 'ok') as calls,
            count(*) filter (where outcome in ('cap_reached', 'rate_limited')) as refused
       from cost_log where course_id = $1 or course_id is null group by tier`,
    [courseId],
  );
  const students = Number((await db.query<{ n: string }>('select count(*) as n from profiles where course_id = $1', [courseId])).rows[0].n);
  const byTier = new Map(rows.map((r) => [r.tier, r]));
  const totalGbp = rows.reduce((s, r) => s + Number(r.cost), 0);
  return {
    students,
    totalGbp,
    perStudentGbp: students > 0 ? totalGbp / students : null,
    tiers: TIERS.map((tier) => {
      const r = byTier.get(tier);
      const costGbp = r ? Number(r.cost) : 0;
      return { tier, costGbp, share: totalGbp > 0 ? costGbp / totalGbp : 0, calls: r ? Number(r.calls) : 0 };
    }),
    refused: rows.reduce((s, r) => s + Number(r.refused), 0),
  };
}

export const TIER_LABEL: Record<Tier, string> = {
  stored: 'Stored results', rules: 'Rules', speech: 'Speech', small_model: 'Small model', large_model: 'Large model',
};
