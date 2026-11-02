import { cookies } from 'next/headers';
import { getDb } from '../db';
import { getProfile, type Profile } from '../profile/profile';

const COOKIE = 'profile';
const YEAR = 60 * 60 * 24 * 365;

/** The signed-in profile id lives in an httpOnly cookie. It is a random id, never personal data. */
export async function setProfileCookie(profileId: string) {
  (await cookies()).set(COOKIE, profileId, {
    httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: YEAR, path: '/',
  });
}

export async function clearProfileCookie() {
  (await cookies()).delete(COOKIE);
}

/** The profile for this request, or null when the device has none (or it was deleted). */
export async function currentProfile(): Promise<Profile | null> {
  const id = (await cookies()).get(COOKIE)?.value;
  return id ? getProfile(await getDb(), id) : null;
}

/** The course new profiles join until class-code joining (task 3.3): the oldest course. */
export async function defaultCourse(): Promise<{ id: string; title: string; testDate: string } | null> {
  const db = await getDb();
  const { rows } = await db.query<{ id: string; title: string; test_date: Date | string }>(
    'select id, title, test_date from courses order by created_at, id limit 1',
  );
  const r = rows[0];
  if (!r) return null;
  const testDate = r.test_date instanceof Date ? r.test_date.toISOString().slice(0, 10) : String(r.test_date).slice(0, 10);
  return { id: r.id, title: r.title, testDate };
}
