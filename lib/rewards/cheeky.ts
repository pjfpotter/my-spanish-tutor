import type { Db } from '../db/types';
import { CHEEKY_POOL } from '../tele/cheeky';
import type { PhraseLine } from '../tele/phrase-bank';
import { CHEEKY_ITEM_ID } from './catalogue';

/** Whether the course owner has switched the cheeky pool on. Off until they do. */
export async function cheekyPoolEnabled(db: Db, courseId: string): Promise<boolean> {
  const { rows } = await db.query<{ cheeky_pool: boolean }>('select cheeky_pool from courses where id = $1', [courseId]);
  return rows[0]?.cheeky_pool === true;
}

export async function setCheekyPool(db: Db, courseId: string, enabled: boolean): Promise<void> {
  await db.query('update courses set cheeky_pool = $2 where id = $1', [courseId, enabled]);
}

/**
 * The cheeky lines this student may see: none unless the course has the pool on AND they bought it. The check is
 * made here on the server, so with the pool off the lines are never sent to the browser at all.
 */
export async function cheekyLinesFor(db: Db, profileId: string, courseId: string): Promise<PhraseLine[]> {
  if (!(await cheekyPoolEnabled(db, courseId))) return [];
  const owned = await db.query('select 1 from inventory where profile_id = $1 and item = $2', [profileId, CHEEKY_ITEM_ID]);
  return owned.rows.length ? CHEEKY_POOL : [];
}
