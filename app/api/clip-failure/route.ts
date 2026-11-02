import { getDb } from '../../../lib/db';
import { currentProfile } from '../../../lib/server/session';

/** Records that a clip would not load, so it can be fixed. Only the clip slot is stored. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { slot?: unknown } | null;
  if (!body || typeof body.slot !== 'string' || !/^[0-9a-f]{12}$/.test(body.slot)) {
    return Response.json({ error: 'Bad clip.' }, { status: 400 });
  }
  const profile = await currentProfile();
  await (await getDb()).query('insert into clip_failures (slot, profile_id) values ($1, $2)', [body.slot, profile?.id ?? null]);
  return new Response(null, { status: 204 });
}
