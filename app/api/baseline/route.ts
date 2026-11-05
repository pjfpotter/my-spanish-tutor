import { getDb } from '../../../lib/db';
import { saveBaseline } from '../../../lib/diagnostics/baseline';
import { currentProfile } from '../../../lib/server/session';

/** Saves one answer from the starting-point check. It is a diagnostic: no coins, no mastery. */
export async function POST(req: Request) {
  const profile = await currentProfile();
  if (!profile) return Response.json({ error: 'Not signed in.' }, { status: 401 });
  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!b || typeof b.questionId !== 'string' || (b.stage !== 'pre' && b.stage !== 'post') || typeof b.correct !== 'boolean') {
    return Response.json({ error: 'Bad answer.' }, { status: 400 });
  }
  const ok = await saveBaseline(await getDb(), { profileId: profile.id, courseId: profile.courseId, questionId: b.questionId, stage: b.stage, correct: b.correct });
  return ok ? Response.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } }) : Response.json({ error: 'Unknown question.' }, { status: 404 });
}
