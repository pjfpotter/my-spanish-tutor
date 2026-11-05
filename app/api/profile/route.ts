import { findCourseByCode } from '../../../lib/course/join';
import { getDb } from '../../../lib/db';
import { deleteProfile } from '../../../lib/profile/delete';
import { createProfile } from '../../../lib/profile/profile';
import { clearProfileCookie, currentProfile, setProfileCookie } from '../../../lib/server/session';

/**
 * Creates an anonymous profile in the course the class code names: a listed nickname and fixed interest tags.
 * The privacy notice must have been acknowledged. Returns the recovery code once.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { classCode?: unknown; privacyAcknowledged?: unknown; nickname?: unknown; interests?: unknown } | null;
  if (!body || typeof body.nickname !== 'string' || !Array.isArray(body.interests)) {
    return Response.json({ error: 'Pick a nickname and your interests.' }, { status: 400 });
  }
  if (body.privacyAcknowledged !== true) {
    return Response.json({ error: 'Read the privacy notice and tick the box to carry on.' }, { status: 400 });
  }
  const db = await getDb();
  const course = typeof body.classCode === 'string' ? await findCourseByCode(db, body.classCode) : null;
  if (!course) return Response.json({ error: 'We could not find that class code. Check it with your teacher.' }, { status: 404 });

  const result = await createProfile(db, {
    courseId: course.id, nickname: body.nickname, interests: body.interests.filter((i): i is string => typeof i === 'string'),
  });
  if (!result.ok) return Response.json({ error: result.error }, { status: 400 });
  await setProfileCookie(result.profile.id);
  return Response.json({ profile: result.profile, recoveryCode: result.recoveryCode }, { headers: { 'Cache-Control': 'no-store' } });
}

/** Deletes the signed-in profile and all its data at once, then signs this device out. The profile comes from the cookie. */
export async function DELETE(req: Request) {
  const body = (await req.json().catch(() => null)) as { confirm?: unknown } | null;
  if (body?.confirm !== true) return Response.json({ error: 'Confirm to delete.' }, { status: 400 });
  const profile = await currentProfile();
  if (profile) await deleteProfile(await getDb(), profile.id);
  await clearProfileCookie();
  return Response.json({ deleted: !!profile }, { headers: { 'Cache-Control': 'no-store' } });
}
