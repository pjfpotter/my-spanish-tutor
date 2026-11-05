import { getDb } from '../../../../lib/db';
import { findCourseByOwnerToken } from '../../../../lib/overview/overview';
import { setCheekyPool } from '../../../../lib/rewards/cheeky';

/** The course owner switches the cheeky pool on or off. The owner token is the only credential; the class code does nothing here. */
export async function POST(req: Request) {
  const b = (await req.json().catch(() => null)) as { token?: unknown; enabled?: unknown } | null;
  if (!b || typeof b.token !== 'string' || typeof b.enabled !== 'boolean') return Response.json({ error: 'Bad request.' }, { status: 400 });
  const db = await getDb();
  const course = await findCourseByOwnerToken(db, b.token);
  if (!course) return Response.json({ error: 'Not found.' }, { status: 404 });
  await setCheekyPool(db, course.id, b.enabled);
  return Response.json({ enabled: b.enabled }, { headers: { 'Cache-Control': 'no-store' } });
}
