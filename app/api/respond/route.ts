import { getDb } from '../../../lib/db';
import { recordResponse } from '../../../lib/automate/store';
import { currentProfile } from '../../../lib/server/session';

/**
 * Records one timed hear-and-answer attempt. The browser scores the transcript and measures the response
 * time; only those numbers arrive here. No audio and no transcript.
 */
export async function POST(req: Request) {
  const profile = await currentProfile();
  if (!profile) return Response.json({ error: 'Not signed in.' }, { status: 401 });
  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
  if (!b || typeof b.itemId !== 'string' || typeof b.sessionId !== 'string' || typeof b.blank !== 'boolean') {
    return Response.json({ error: 'Bad attempt.' }, { status: 400 });
  }
  const result = await recordResponse(await getDb(), {
    profileId: profile.id, courseId: profile.courseId, itemId: b.itemId, sessionId: b.sessionId, blank: b.blank,
    accuracy: num(b.accuracy), responseTimeMs: num(b.responseTimeMs), speed: num(b.speed),
    repeats: num(b.repeats) ?? 0, assisted: b.assisted === true,
  });
  return result.ok ? Response.json(result, { headers: { 'Cache-Control': 'no-store' } }) : Response.json({ error: result.error }, { status: 400 });
}
