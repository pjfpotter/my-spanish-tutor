import type { Db } from '../db/types';

/** A class goal for the week. It is a target for the whole class together, never for one student. */
export const CLASS_GOAL = {
  /** Practice attempts each student adds to the target, so the goal grows with the class. */
  attemptsPerStudent: 15,
  /** Below this many students a total could point at one person, so none is shown. */
  minStudents: 5,
  windowDays: 7,
} as const;

export type ClassGoal =
  | { shown: false }
  | { shown: true; students: number; attempts: number; goal: number };

/**
 * The class's combined practice this week. Only totals leave this function: no names, no ids, no one's position.
 * With too few students to hide anyone in the total, it shows nothing at all.
 */
export async function loadClassGoal(db: Db, courseId: string): Promise<ClassGoal> {
  const { rows } = await db.query<{ students: string; attempts: string }>(
    `select (select count(*) from profiles where course_id = $1) as students,
            (select count(*) from attempts a join profiles p on p.id = a.profile_id
              where p.course_id = $1 and a.created_at > now() - make_interval(days => $2)) as attempts`,
    [courseId, CLASS_GOAL.windowDays],
  );
  const students = Number(rows[0].students);
  if (students < CLASS_GOAL.minStudents) return { shown: false };
  return { shown: true, students, attempts: Number(rows[0].attempts), goal: students * CLASS_GOAL.attemptsPerStudent };
}
