import { getDb } from '../../../lib/db';
import { tagComprehension } from '../../../lib/diagnostics/comprehension';
import { tagLatestAttempt } from '../../../lib/diagnostics/store';
import { currentProfile } from '../../../lib/server/session';

const flag = (v: unknown) => (typeof v === 'boolean' ? v : null);

/**
 * Takes the result of the short probe that follows a missed question, works out the cause tag by rule
 * and saves it on the missed attempt. A probe never counts toward mastery or coins.
 */
export async function POST(req: Request) {
  const profile = await currentProfile();
  if (!profile) return Response.json({ error: 'Not signed in.' }, { status: 401 });

  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!b || typeof b.itemId !== 'string' || typeof b.sessionId !== 'string' || typeof b.heardSlow !== 'boolean') {
    return Response.json({ error: 'Bad probe.' }, { status: 400 });
  }
  const db = await getDb();
  const { rows } = await db.query('select 1 from questions where id = $1 and course_id = $2', [b.itemId, profile.courseId]);
  if (!rows.length) return Response.json({ error: 'Unknown question.' }, { status: 404 });

  const tag = tagComprehension({ heardSlow: b.heardSlow, heardNormal: flag(b.heardNormal), written: flag(b.written) });
  if (tag) await tagLatestAttempt(db, profile.id, b.itemId, b.sessionId, tag);
  return Response.json({ tag }, { headers: { 'Cache-Control': 'no-store' } });
}
