// Seeds the hand-authored course into the database (task 3.2). Safe to run again: it updates in place.
//   npm run seed
import pg from 'pg';
import { SEED_COURSE, TESTING_COURSE } from '../lib/course/seed.ts';
import { seedCourse } from '../lib/course/seed-db.ts';
import { FREE_TIME, FREE_TIME_SHEET } from '../lib/sheets/samples/free-time.ts';

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
    // Until the real upload is the only way in, every seeded course behaves as if a teacher had uploaded the
    // free-time sentence builder, so students always write on the sheet.
    await pool.query('update courses set sheet = $2, interpretation = $3 where id = $1', [r.courseId, JSON.stringify(FREE_TIME_SHEET), JSON.stringify(FREE_TIME)]);
    console.log(`Attached the sentence builder sheet to ${course.classCode}.`);
    if (r.ownerToken) console.log(`Owner token for ${course.classCode} (shown once, keep it): ${r.ownerToken}`);
  }
} finally {
  await pool.end();
}
