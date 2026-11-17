import { createHash, randomBytes } from 'node:crypto';
import type { Db } from '../db/types';
import { checkCourseLimit, CourseLimitError } from './limits.ts';
import { resolveBuilderQuestion } from '../sheets/question-match.ts';
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
    await db.query('update courses set title = $2, test_date = $3, calibration = $4, model_answers = $5, unlock_all = $6 where id = $1', [
      courseId, course.title, course.testDate, JSON.stringify(course.calibration), JSON.stringify(course.modelAnswers), course.unlockAll === true,
    ]);
  } else {
    // Loading a new course costs real money, so a teacher can only load so many a month. Re-running a seed never counts.
    const allowed = await checkCourseLimit(db, course.teacher);
    if (!allowed.ok) throw new CourseLimitError(allowed.message);
    ownerToken = randomBytes(24).toString('base64url');
    const { rows } = await db.query<{ id: string }>(
      `insert into courses (class_code, owner_token_hash, title, test_date, calibration, model_answers, unlock_all, teacher_ref) values ($1, $2, $3, $4, $5, $6, $7, $8) returning id`,
      [course.classCode, createHash('sha256').update(ownerToken).digest('hex'), course.title, course.testDate, JSON.stringify(course.calibration), JSON.stringify(course.modelAnswers), course.unlockAll === true, course.teacher ?? null],
    );
    courseId = rows[0].id;
  }

  // Builders by key: removed ones go (their questions lose the link), positions are parked out of the way so a reorder cannot collide.
  const keys = course.builders.map((b) => b.key);
  await db.query('delete from course_builders where course_id = $1 and not (key = any($2))', [courseId, keys]);
  await db.query('update course_builders set position = position + 1000 where course_id = $1', [courseId]);
  const builderIds = new Map<string, string>();
  for (const [i, b] of course.builders.entries()) {
    const { rows } = await db.query<{ id: string }>(
      `insert into course_builders (course_id, position, key, name, sheet, interpretation, calibration) values ($1,$2,$3,$4,$5,$6,$7)
       on conflict (course_id, key) do update set position = excluded.position, name = excluded.name, sheet = excluded.sheet, interpretation = excluded.interpretation, calibration = excluded.calibration
       returning id`,
      [courseId, i, b.key, b.name, JSON.stringify(b.sheet), JSON.stringify(b.interpretation), JSON.stringify(b.calibration)],
    );
    builderIds.set(b.key, rows[0].id);
  }

  for (const q of course.questions) {
    const builder = q.builder === undefined ? null : course.builders.find((b) => b.key === q.builder)!;
    const link = builder ? resolveBuilderQuestion(builder.interpretation, q) : null;
    await db.query(
      `insert into questions (course_id, position, spanish, english_subtitle, recycled, key_word, key_word_english, topics, template, extension, builder_id, builder_question) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       on conflict (course_id, position) do update set spanish = excluded.spanish, english_subtitle = excluded.english_subtitle, recycled = excluded.recycled,
         key_word = excluded.key_word, key_word_english = excluded.key_word_english, topics = excluded.topics, template = excluded.template, extension = excluded.extension,
         builder_id = excluded.builder_id, builder_question = excluded.builder_question`,
      [courseId, q.position, q.spanish, q.english, q.recycled, q.keyWord?.spanish ?? null, q.keyWord?.english ?? null, q.topics, q.template ?? q.topics, q.extension === true,
        q.builder === undefined ? null : builderIds.get(q.builder), link && link.ok ? link.index : null],
    );
  }
  for (const ch of course.chunks) {
    await db.query(
      `insert into chunks (course_id, spanish, english_gloss, category, feature_tags, recycled, builder) values ($1,$2,$3,$4,$5,$6,$7)
       on conflict (course_id, spanish) do update set english_gloss = excluded.english_gloss, category = excluded.category,
         feature_tags = excluded.feature_tags, recycled = excluded.recycled, builder = excluded.builder`,
      [courseId, ch.spanish, ch.english, ch.category, ch.featureTags, ch.recycled, ch.builder ?? null],
    );
  }
  return { courseId, created: ownerToken !== null, ownerToken };
}
