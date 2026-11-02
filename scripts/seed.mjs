// Seeds the hand-authored course into the database (task 3.2). Safe to run again: it updates in place.
//   npm run seed
import pg from 'pg';
import { SEED_COURSE } from '../lib/course/seed.ts';
import { seedCourse } from '../lib/course/seed-db.ts';

const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) {
  console.error('Set DATABASE_URL in .env first. See README.');
  process.exit(1);
}
const pool = new pg.Pool({ connectionString: url, max: 1 });
try {
  const r = await seedCourse(pool, SEED_COURSE);
  console.log(`${r.created ? 'Created' : 'Updated'} course ${SEED_COURSE.classCode} (${r.courseId}).`);
  if (r.ownerToken) console.log(`Owner token (shown once, keep it): ${r.ownerToken}`);
} finally {
  await pool.end();
}
