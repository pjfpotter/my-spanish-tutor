import type { Db } from '../db/types';
import type { CauseTag } from '../events/attempts';

/**
 * Adds a cause tag to the student's latest attempt at an item in this session (normally the one they
 * just missed). Returns false if there is no such attempt, or it already carries the tag.
 */
export async function tagLatestAttempt(db: Db, profileId: string, itemId: string, sessionId: string, tag: CauseTag): Promise<boolean> {
  const { rows } = await db.query<{ id: string }>(
    `update attempts set cause_tags = array_append(cause_tags, $4)
     where id = (select id from attempts where profile_id = $1 and item_id = $2 and session_id = $3 order by created_at desc, id desc limit 1)
       and not ($4 = any(cause_tags))
     returning id`,
    [profileId, itemId, sessionId, tag],
  );
  return rows.length > 0;
}
