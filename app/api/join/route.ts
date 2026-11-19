import { findCourseByCode } from '../../../lib/course/join';
import { getDb } from '../../../lib/db';
import { joinOptions } from '../../../lib/profile/profile';

/**
 * Looks a class code up and returns the course's title and test date, and six nicknames to pick from that no one in the class has.
 * Reads only: it never creates a profile. Nicknames are offered only here, once the class is known.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { code?: unknown } | null;
  if (!body || typeof body.code !== 'string' || body.code.length > 20) {
    return Response.json({ error: 'Enter your class code.' }, { status: 400 });
  }
  const db = await getDb();
  const course = await findCourseByCode(db, body.code);
  if (!course) {
    return Response.json({ error: 'We could not find that class code. Check it with your teacher.' }, { status: 404 });
  }
  return Response.json({ course: { title: course.title, testDate: course.testDate }, nicknames: await joinOptions(db, course.id) }, { headers: { 'Cache-Control': 'no-store' } });
}
