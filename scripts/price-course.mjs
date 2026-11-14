// Prices a course before it is loaded (task 23.7): how many clips already exist, how many would be built, and the estimated cost.
// Spends nothing and calls nothing.
//   npm run price-course -- TELE8            a course that is in lib/course/seed.ts, by class code
//   npm run price-course -- ./my-course.ts   a course file whose default export is a Course
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import built from '../lib/audio/built.ts';
import { SEED_COURSE, TESTING_COURSE } from '../lib/course/seed.ts';
import { validateCourse } from '../lib/course/schema.ts';
import { priceCourse } from '../lib/course/pricing.ts';

const arg = process.argv[2];
if (!arg) {
  console.error('Usage: npm run price-course -- <class code | path to a course file>');
  process.exit(2);
}
const known = [SEED_COURSE, TESTING_COURSE].find((c) => c.classCode === arg.toUpperCase());
const course = known ?? (await import(pathToFileURL(path.resolve(arg)).href)).default;
const check = validateCourse(course);
if (!check.ok) {
  console.error('This course is not valid yet:');
  for (const p of check.problems) console.error(`  - ${p}`);
  process.exit(1);
}
const p = priceCourse(course, built);
const gbp = (n) => `£${n.toFixed(n < 1 ? 3 : 2)}`;
console.log(`${course.title} (${course.classCode})`);
console.log(`Clips wanted: ${p.wanted}. Already built and shared: ${p.shared}. New: ${p.toBuild}.`);
console.log(`Characters to synthesise: ${p.characters}. Estimated cost: ${gbp(p.estimateGbp)} (the rate is an unverified estimate, not an invoice).`);
if (p.needsSetUp) console.log('This course has no model answers, so the set-up call would also run once (one small model call, capped separately).');
for (const c of p.newClips.filter((c) => c.speed === 1).slice(0, 20)) console.log(`  + ${c.label.padEnd(28)} ${c.text}`);
if (p.newClips.length > 20) console.log('  ...');
