// Seeds the hand-authored course into the database (task 3.2). Safe to run again: it updates in place.
//   npm run seed
import pg from 'pg';
import { SEED_COURSE } from '../lib/course/seed.ts';
import { loadTestingCourse } from '../lib/course/testing-course.ts';
import { seedCourse } from '../lib/course/seed-db.ts';
import { assignments } from '../lib/course/assignments.ts';

const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) {
  console.error('Set DATABASE_URL in .env first. See README.');
  process.exit(1);
}
const pool = new pg.Pool({ connectionString: url, max: 1 });
// The testing course comes from local, gitignored data when it is there (testing-course-five-builders).
const testing = loadTestingCourse();
console.log(testing.note);
try {
  for (const course of [SEED_COURSE, testing.course]) {
    const r = await seedCourse(pool, course);
    console.log(`${r.created ? 'Created' : 'Updated'} course ${course.classCode} (${r.courseId}).`);
    // Say here which builder each question uses and which part of it, so a gap or a wrong assignment is seen now and not by a student.
    for (const a of assignments(course)) console.log(a.builder ? `  Question ${a.position}: ${a.builder}, ${a.part}` : `  Question ${a.position} has no sentence builder yet: ${a.spanish}`);
    if (r.ownerToken) console.log(`Owner token for ${course.classCode} (shown once, keep it): ${r.ownerToken}`);
  }
} finally {
  await pool.end();
}
