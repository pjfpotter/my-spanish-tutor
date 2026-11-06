import type { Db } from '../db/types';

/**
 * Whether a course is a testing course that opens every phase (course-unlock-testing). This is the one
 * place the flag is read; the gate callers pass the answer to `phaseStates`. An unknown course is not unlocked.
 */
export async function courseUnlockAll(db: Db, courseId: string): Promise<boolean> {
  const { rows } = await db.query<{ unlock_all: boolean }>('select unlock_all from courses where id = $1', [courseId]);
  return rows[0]?.unlock_all === true;
}
