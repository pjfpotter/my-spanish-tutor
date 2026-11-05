import { getDb } from '../../../lib/db';
import { isMood, recordMood } from '../../../lib/diagnostics/mood';
import { currentProfile } from '../../../lib/server/session';

/** Saves the one-tap mood for this session. The answer comes from a fixed list; nothing typed is stored. */
export async function POST(req: Request) {
  const profile = await currentProfile();
  if (!profile) return Response.json({ error: 'Not signed in.' }, { status: 401 });
  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!b || !isMood(b.mood) || typeof b.sessionId !== 'string' || !/^[0-9a-f-]{36}$/i.test(b.sessionId)) {
    return Response.json({ error: 'Bad mood.' }, { status: 400 });
  }
  await recordMood(await getDb(), profile.id, b.sessionId, b.mood);
  return Response.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
}
