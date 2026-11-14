// Moves a course along the way to a class (task 23.3): draft, set up, reviewed, published, shared.
//   npm run course -- status TELE8
//   npm run course -- review TELE8     signs off the course as it stands now (any later edit lapses it)
//   npm run course -- publish TELE8    blocks, naming every missing item, until the course is ready
//   npm run course -- share TELE8      marks the class code as handed to the class (published courses only)
// Publishing makes no paid call by itself. If model answers or audio are missing it says which command to run.
import pg from 'pg';
import { courseSummary, markReviewed, publishCourse, shareCourse } from '../lib/course/status.ts';

const [command, rawCode] = process.argv.slice(2);
const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) {
  console.error('Set DATABASE_URL in .env first. See README.');
  process.exit(1);
}
if (!['status', 'review', 'publish', 'share'].includes(command ?? '') || !rawCode) {
  console.error('Usage: npm run course -- <status|review|publish|share> <class code>');
  process.exit(2);
}
const pool = new pg.Pool({ connectionString: url, max: 1 });
const say = (label, r) => {
  if (r.ok) return console.log(`${label}: done.`);
  console.error(`${label}: not yet. Still missing:`);
  for (const m of r.missing) console.error(`  - ${m}`);
  process.exitCode = 1;
};
try {
  const course = (await pool.query('select id, title from courses where class_code = $1', [rawCode.toUpperCase()])).rows[0];
  if (!course) throw new Error(`No course with class code ${rawCode.toUpperCase()}.`);
  if (command === 'review') say('Review', await markReviewed(pool, course.id));
  if (command === 'publish') {
    const r = await publishCourse(pool, course.id);
    say('Publish', r);
    if (r.ok && !r.changed) console.log('Nothing had changed since the last publish, so nothing was run.');
  }
  if (command === 'share') {
    const r = await shareCourse(pool, course.id);
    say('Share', r);
    if (r.ok) console.log(`Give students the class code ${r.classCode}.`);
  }
  const s = await courseSummary(pool, course.id);
  console.log(`${course.title} (${rawCode.toUpperCase()}): ${s.status.replace('_', ' ')}`);
  if (s.missing.length) for (const m of s.missing) console.log(`  next needs: ${m}`);
} finally {
  await pool.end();
}
