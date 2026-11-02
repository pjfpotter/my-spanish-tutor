import { getDb } from '../../../lib/db';
import { createProfile } from '../../../lib/profile/profile';
import { defaultCourse, setProfileCookie } from '../../../lib/server/session';

/** Creates an anonymous profile: a listed nickname and fixed interest tags. Returns the recovery code once. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { nickname?: unknown; interests?: unknown } | null;
  if (!body || typeof body.nickname !== 'string' || !Array.isArray(body.interests)) {
    return Response.json({ error: 'Pick a nickname and your interests.' }, { status: 400 });
  }
  const course = await defaultCourse();
  if (!course) return Response.json({ error: 'There is no course to join yet.' }, { status: 503 });

  const result = await createProfile(await getDb(), {
    courseId: course.id, nickname: body.nickname, interests: body.interests.filter((i): i is string => typeof i === 'string'),
  });
  if (!result.ok) return Response.json({ error: result.error }, { status: 400 });
  await setProfileCookie(result.profile.id);
  return Response.json({ profile: result.profile, recoveryCode: result.recoveryCode }, { headers: { 'Cache-Control': 'no-store' } });
}
