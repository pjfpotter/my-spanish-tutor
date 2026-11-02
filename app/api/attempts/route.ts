import { getDb } from '../../../lib/db';
import { logAttempt, OUTCOMES, type AttemptEvent } from '../../../lib/events/attempts';
import { currentProfile } from '../../../lib/server/session';

/** Records one question-comprehension attempt for the signed-in profile and returns mastery and coins. */
export async function POST(req: Request) {
  const profile = await currentProfile();
  if (!profile) return Response.json({ error: 'Not signed in.' }, { status: 401 });

  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!b || typeof b.itemId !== 'string' || typeof b.sessionId !== 'string' || !(OUTCOMES as readonly unknown[]).includes(b.outcome)) {
    return Response.json({ error: 'Bad attempt.' }, { status: 400 });
  }

  const db = await getDb();
  // The question has to belong to this student's course.
  const { rows } = await db.query('select 1 from questions where id = $1 and course_id = $2', [b.itemId, profile.courseId]);
  if (!rows.length) return Response.json({ error: 'Unknown question.' }, { status: 404 });

  const revealed = b.revealed === true;
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
  const event: AttemptEvent = {
    profileId: profile.id,
    itemKind: 'question',
    itemId: b.itemId,
    phase: 'understand',
    outcome: b.outcome as AttemptEvent['outcome'],
    sessionId: b.sessionId,
    voice: typeof b.voice === 'string' ? b.voice.slice(0, 40) : null,
    speed: num(b.speed),
    responseTimeMs: num(b.responseTimeMs),
    assisted: revealed, // revealing the text is the help that stops an attempt counting
    replays: num(b.replays) ?? 0,
    usedSlow: b.usedSlow === true,
    revealed,
  };
  try {
    const result = await logAttempt(db, event);
    return Response.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
