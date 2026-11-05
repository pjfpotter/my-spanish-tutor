import { getDb } from '../../../lib/db';
import { loadWritingCourse, saveAnswer } from '../../../lib/progress/writing-store';
import { currentProfile } from '../../../lib/server/session';

/** Saves (and optionally confirms) one answer for the signed-in profile. No model call: the rubric re-checks it here. */
export async function POST(req: Request) {
  const profile = await currentProfile();
  if (!profile) return Response.json({ error: 'Not signed in.' }, { status: 401 });
  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!b || typeof b.questionId !== 'string' || typeof b.text !== 'string') return Response.json({ error: 'Bad answer.' }, { status: 400 });

  const db = await getDb();
  const course = await loadWritingCourse(db, profile.courseId);
  const result = await saveAnswer(db, course, profile.id, b.questionId, b.text, b.confirm === true);
  return result.ok ? Response.json(result, { headers: { 'Cache-Control': 'no-store' } }) : Response.json({ error: result.error }, { status: 400 });
}
