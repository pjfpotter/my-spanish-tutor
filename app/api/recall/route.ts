import { getDb } from '../../../lib/db';
import { recordRecall } from '../../../lib/memorise/store';
import { currentProfile } from '../../../lib/server/session';

/**
 * Records one scored attempt at saying a confirmed answer from memory. The browser scores the transcript
 * and sends only the percentage: no audio and no transcript reach this route.
 */
export async function POST(req: Request) {
  const profile = await currentProfile();
  if (!profile) return Response.json({ error: 'Not signed in.' }, { status: 401 });
  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!b || typeof b.itemId !== 'string' || typeof b.sessionId !== 'string' || typeof b.accuracy !== 'number' || typeof b.level !== 'number') {
    return Response.json({ error: 'Bad attempt.' }, { status: 400 });
  }
  const result = await recordRecall(await getDb(), {
    profileId: profile.id, courseId: profile.courseId, itemId: b.itemId, sessionId: b.sessionId, accuracy: b.accuracy, level: b.level,
    responseTimeMs: typeof b.responseTimeMs === 'number' ? b.responseTimeMs : null,
    missedWords: Array.isArray(b.missedWords) ? b.missedWords.filter((n): n is number => typeof n === 'number').slice(0, 500) : [],
  });
  return result.ok ? Response.json(result, { headers: { 'Cache-Control': 'no-store' } }) : Response.json({ error: result.error }, { status: 400 });
}
