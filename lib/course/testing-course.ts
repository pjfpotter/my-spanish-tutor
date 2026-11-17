import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { SEED_COURSE, TESTING_COURSE } from './seed.ts';
import { validateCourse, type Course } from './schema.ts';

/**
 * The testing course (testing-course-five-builders): five questions, each with its own sentence builder, drawn
 * from the teacher's Year 8 sheets. Those sheets and everything derived from them are teachers' material, so the
 * data lives in a gitignored folder and is never committed. When the folder is there the course is built from it;
 * when it is not (a fresh clone, CI) the course is the previous definition, so everything still builds and
 * the committed tests still pass.
 */
export const TESTING_DATA_DIR = path.join('docs', 'teaching-resources', 'testing-course');
const FILE = 'course.json';

export interface LoadedTestingCourse {
  course: Course;
  source: 'local' | 'default';
  /** One line for the seed to print: which source was used and, for the default, why. */
  note: string;
}

/**
 * `course.json` holds the parts that are specific to this course (title, test date, chunks, questions, calibration, model
 * answers and the merged sheet). The class code and the unlock-all flag are not read from it: the code is the published
 * testing code and every phase is open. A file with no calibration falls back to the shared going-out one.
 */
export function loadTestingCourse(root: string = process.cwd()): LoadedTestingCourse {
  const file = path.join(root, TESTING_DATA_DIR, FILE);
  if (!existsSync(file)) return { course: TESTING_COURSE, source: 'default', note: `testing course: local data not found (${path.join(TESTING_DATA_DIR, FILE)}), using the default` };
  let raw: Partial<Course>;
  try {
    raw = JSON.parse(readFileSync(file, 'utf8')) as Partial<Course>;
  } catch (e) {
    return { course: TESTING_COURSE, source: 'default', note: `testing course: ${FILE} is not readable JSON (${(e as Error).message}), using the default` };
  }
  const course = { calibration: SEED_COURSE.calibration, ...raw, classCode: TESTING_COURSE.classCode, unlockAll: true } as Course;
  const check = validateCourse(course);
  if (!check.ok) return { course: TESTING_COURSE, source: 'default', note: `testing course: local data is not valid, using the default. ${check.problems.slice(0, 5).join('; ')}` };
  return { course: check.course, source: 'local', note: `testing course: using local data (${course.questions.length} questions)` };
}
