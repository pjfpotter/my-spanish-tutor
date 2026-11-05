import { findCourseByCode } from '../../../lib/course/join';
import { getDb } from '../../../lib/db';

/** Looks a class code up and returns the course's title and test date. Reads only: it never creates a profile. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { code?: unknown } | null;
  if (!body || typeof body.code !== 'string' || body.code.length > 20) {
    return Response.json({ error: 'Enter your class code.' }, { status: 400 });
  }
  const course = await findCourseByCode(await getDb(), body.code);
  if (!course) {
    return Response.json({ error: 'We could not find that class code. Check it with your teacher.' }, { status: 404 });
  }
  return Response.json({ course: { title: course.title, testDate: course.testDate } }, { headers: { 'Cache-Control': 'no-store' } });
}
