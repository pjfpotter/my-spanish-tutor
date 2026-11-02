import { createHash, randomBytes } from 'node:crypto';
import type { Db } from '../db/types';
import { validateCourse, type Course } from './schema.ts';

export interface SeedResult {
  courseId: string;
  created: boolean;
  /** Shown once, only when the course is first created. Only its hash is stored. */
  ownerToken: string | null;
}

/**
 * Writes a course to the database. Safe to run again: the course is found by class code, questions by
 * position and chunks by Spanish text, and all are updated in place, so nothing is duplicated and
 * the ids that answers and mastery point at never change.
 */
export async function seedCourse(db: Db, course: Course): Promise<SeedResult> {
  const check = validateCourse(course);
  if (!check.ok) throw new Error(`Course is not valid: ${check.problems.join('; ')}`);

  const existing = await db.query<{ id: string }>('select id from courses where class_code = $1', [course.classCode]);
  let courseId: string;
  let ownerToken: string | null = null;
  if (existing.rows[0]) {
    courseId = existing.rows[0].id;
    await db.query('update courses set title = $2, test_date = $3, mark_scheme = $4 where id = $1', [
      courseId, course.title, course.testDate, JSON.stringify(course.markScheme),
    ]);
  } else {
    ownerToken = randomBytes(24).toString('base64url');
    const { rows } = await db.query<{ id: string }>(
      `insert into courses (class_code, owner_token_hash, title, test_date, mark_scheme) values ($1, $2, $3, $4, $5) returning id`,
      [course.classCode, createHash('sha256').update(ownerToken).digest('hex'), course.title, course.testDate, JSON.stringify(course.markScheme)],
    );
    courseId = rows[0].id;
  }

  for (const q of course.questions) {
    await db.query(
      `insert into questions (course_id, position, spanish, english_subtitle, recycled) values ($1,$2,$3,$4,$5)
       on conflict (course_id, position) do update set spanish = excluded.spanish, english_subtitle = excluded.english_subtitle, recycled = excluded.recycled`,
      [courseId, q.position, q.spanish, q.english, q.recycled],
    );
  }
  for (const ch of course.chunks) {
    await db.query(
      `insert into chunks (course_id, spanish, english_gloss, category, feature_tags, recycled) values ($1,$2,$3,$4,$5,$6)
       on conflict (course_id, spanish) do update set english_gloss = excluded.english_gloss, category = excluded.category,
         feature_tags = excluded.feature_tags, recycled = excluded.recycled`,
      [courseId, ch.spanish, ch.english, ch.category, ch.featureTags, ch.recycled],
    );
  }
  return { courseId, created: ownerToken !== null, ownerToken };
}
