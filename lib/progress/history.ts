import type { Db } from '../db/types';

export interface OwnHistory {
  daysPractised: number;
  sessions: number;
  attempts: number;
  /** Attempts per phase, by phase id. */
  byPhase: Record<string, number>;
  /** The student's own best score saying each answer from memory, by question position. Null before a first try. */
  bests: { position: number; best: number | null }[];
}

/** Everything here is about one student against their own earlier results. There is nothing to compare with anyone else. */
export async function loadOwnHistory(db: Db, profileId: string, courseId: string): Promise<OwnHistory> {
  const totals = await db.query<{ attempts: string; days: string; sessions: string }>(
    `select count(*) as attempts, count(distinct (created_at at time zone 'utc')::date) as days, count(distinct session_id) as sessions
       from attempts where profile_id = $1`, [profileId]);
  const phases = await db.query<{ phase: string; n: string }>('select phase, count(*) as n from attempts where profile_id = $1 group by phase', [profileId]);
  const bests = await db.query<{ position: number; best: string | null }>(
    `select q.position, max(a.accuracy) as best from questions q
       left join attempts a on a.item_id = q.id and a.profile_id = $1 and a.phase = 'memorise' and a.accuracy is not null
      where q.course_id = $2 group by q.position order by q.position`, [profileId, courseId]);
  return {
    attempts: Number(totals.rows[0].attempts), daysPractised: Number(totals.rows[0].days), sessions: Number(totals.rows[0].sessions),
    byPhase: Object.fromEntries(phases.rows.map((r) => [r.phase, Number(r.n)])),
    bests: bests.rows.map((r) => ({ position: r.position, best: r.best === null ? null : Math.round(Number(r.best)) })),
  };
}
