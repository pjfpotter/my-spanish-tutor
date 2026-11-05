import type { Db } from '../db/types';

/**
 * Deletes a profile and everything tied to it, at once. Every table that holds a profile's data
 * references profiles with `on delete cascade`. The two spend/diagnostic logs (cost_log,
 * clip_failures) keep their rows but lose the link (`on delete set null`), so they hold no trace
 * of who it was. Returns whether a profile was found.
 */
export async function deleteProfile(db: Db, profileId: string): Promise<boolean> {
  if (!/^[0-9a-f-]{36}$/i.test(profileId)) return false;
  const { rows } = await db.query<{ id: string }>('delete from profiles where id = $1 returning id', [profileId]);
  return rows.length > 0;
}
