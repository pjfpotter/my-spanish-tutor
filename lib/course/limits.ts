import type { Db } from '../db/types';

/**
 * How many new courses one teacher can load in a month (task 23.7). A new course is priced before it is loaded and costs real
 * money (audio, and a set-up call), so the number is capped. **The owner chooses the number**: change `perTeacher` here and nowhere else.
 * There are no teacher accounts; a teacher is the label the developer gives them (`teacher_ref`).
 */
export const COURSE_LIMIT = { perTeacher: 3, periodDays: 30 } as const;

export type CourseLimitCheck = { ok: true; remaining: number } | { ok: false; message: string; nextAt: string };

export async function checkCourseLimit(db: Db, teacherRef: string | null | undefined, now: Date = new Date(), limit = COURSE_LIMIT): Promise<CourseLimitCheck> {
  // Courses with no teacher label are the developer's own and are not limited.
  if (!teacherRef) return { ok: true, remaining: Infinity };
  const since = new Date(now.getTime() - limit.periodDays * 86_400_000);
  const { rows } = await db.query<{ created_at: Date | string }>('select created_at from courses where teacher_ref = $1 and created_at > $2 order by created_at', [teacherRef, since]);
  if (rows.length < limit.perTeacher) return { ok: true, remaining: limit.perTeacher - rows.length };
  const next = new Date(new Date(rows[0].created_at).getTime() + limit.periodDays * 86_400_000);
  return {
    ok: false,
    nextAt: next.toISOString(),
    message: `You have loaded ${rows.length} new courses in the last ${limit.periodDays} days, which is the limit (${limit.perTeacher}). Each new course costs real money to set up, so the number is capped. You can load another on ${next.toISOString().slice(0, 10)}.`,
  };
}

export class CourseLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CourseLimitError';
  }
}
