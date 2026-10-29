import type { Pool } from 'pg';
import type { CostEntry, CostStore } from './types';

export function createPgCostStore(pool: Pool): CostStore {
  return {
    async spentSince(service, since) {
      const { rows } = await pool.query(
        'select coalesce(sum(estimated_cost_gbp), 0) as spent from cost_log where service = $1 and created_at >= $2',
        [service, since],
      );
      return Number(rows[0].spent);
    },
    async callsSince(profileId, service, since) {
      const { rows } = await pool.query(
        `select count(*) as n from cost_log
         where profile_id = $1 and service = $2 and created_at >= $3 and outcome in ('ok', 'error')`,
        [profileId, service, since],
      );
      return Number(rows[0].n);
    },
    async log(e: CostEntry) {
      await pool.query(
        `insert into cost_log (service, tier, units, estimated_cost_gbp, course_id, profile_id, outcome)
         values ($1, $2, $3, $4, $5, $6, $7)`,
        [e.service, e.tier, e.units, e.estimatedCostGbp, e.courseId, e.profileId, e.outcome],
      );
    },
  };
}
