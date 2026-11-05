import type { Db } from '../db/types';

export interface JoinableCourse {
  id: string;
  title: string;
  /** YYYY-MM-DD */
  testDate: string;
}

/** Class codes are typed on phones, so case, spaces and dashes do not matter. Null if it can't be a code. */
export function normaliseClassCode(raw: string): string | null {
  const code = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return /^[A-Z0-9]{4,8}$/.test(code) ? code : null;
}

/**
 * Looks a class code up. Joining by code only reads: it creates nothing, so entering the same
 * code twice (a repeat) gives the same answer and never makes a second profile.
 */
export async function findCourseByCode(db: Db, raw: string): Promise<JoinableCourse | null> {
  const code = normaliseClassCode(raw);
  if (!code) return null;
  const { rows } = await db.query<{ id: string; title: string; test_date: Date | string }>(
    'select id, title, test_date from courses where class_code = $1',
    [code],
  );
  const r = rows[0];
  if (!r) return null;
  return { id: r.id, title: r.title, testDate: r.test_date instanceof Date ? r.test_date.toISOString().slice(0, 10) : String(r.test_date).slice(0, 10) };
}
