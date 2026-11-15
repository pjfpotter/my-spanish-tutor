// Seeds the hand-authored course into the database (task 3.2). Safe to run again: it updates in place.
//   npm run seed
import pg from 'pg';
import { SEED_COURSE, TESTING_COURSE } from '../lib/course/seed.ts';
import { seedCourse } from '../lib/course/seed-db.ts';
import { unmatchedQuestions } from '../lib/sheets/question-match.ts';

const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) {
  console.error('Set DATABASE_URL in .env first. See README.');
  process.exit(1);
}
const pool = new pg.Pool({ connectionString: url, max: 1 });
try {
  for (const course of [SEED_COURSE, TESTING_COURSE]) {
    const r = await seedCourse(pool, course);
    console.log(`${r.created ? 'Created' : 'Updated'} course ${course.classCode} (${r.courseId}).`);
    // A question the sheet does not cover cannot be written; say so here, not when a student finds it.
    for (const q of unmatchedQuestions(course.questions, course.sheet.interpretation)) console.log(`  No sentence builder for question ${q.position}: ${q.spanish}`);
    if (r.ownerToken) console.log(`Owner token for ${course.classCode} (shown once, keep it): ${r.ownerToken}`);
  }
} finally {
  await pool.end();
}
