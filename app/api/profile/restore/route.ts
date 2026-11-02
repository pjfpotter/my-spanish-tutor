import { getDb } from '../../../../lib/db';
import { restoreProfile } from '../../../../lib/profile/profile';
import { setProfileCookie } from '../../../../lib/server/session';

/** Restores progress on a new device from the recovery code. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { code?: unknown } | null;
  if (!body || typeof body.code !== 'string' || body.code.length > 40) {
    return Response.json({ error: 'Enter your recovery code.' }, { status: 400 });
  }
  const profile = await restoreProfile(await getDb(), body.code);
  if (!profile) {
    return Response.json({ error: 'That code did not match. Check it, or start fresh if you have lost it.' }, { status: 404 });
  }
  await setProfileCookie(profile.id);
  return Response.json({ profile }, { headers: { 'Cache-Control': 'no-store' } });
}
