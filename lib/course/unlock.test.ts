import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { newTestDb, insertTestCourse } from '../db/test-db';
import { SEED_COURSE, TESTING_COURSE } from './seed';
import { seedCourse } from './seed-db';
import { validateCourse } from './schema';
import { courseUnlockAll } from './unlock';
import { normaliseClassCode } from './join';

let db: Awaited<ReturnType<typeof newTestDb>>;
beforeAll(async () => void (db = await newTestDb()));
afterAll(() => db.close());

const flag = async (code: string) =>
  (await db.query<{ unlock_all: boolean }>('select unlock_all from courses where class_code = $1', [code])).rows[0].unlock_all;

describe('the unlock_all column (migration 0011)', () => {
  it('is false for a course inserted without it', async () => {
    await insertTestCourse(db, 'PLAIN1');
    expect(await flag('PLAIN1')).toBe(false);
  });
});

describe('seeding the real course and the testing course', () => {
  it('seeds both, with the flag only on the testing course', async () => {
    await seedCourse(db, SEED_COURSE);
    await seedCourse(db, TESTING_COURSE);
    expect(await flag(SEED_COURSE.classCode)).toBe(false);
    expect(await flag(TESTING_COURSE.classCode)).toBe(true);
  });

  it('gives the testing course the same questions, chunks and model answers', async () => {
    const texts = async (code: string, table: 'questions' | 'chunks', col: string) =>
      (await db.query<{ t: string }>(`select x.${col} as t from ${table} x join courses c on c.id = x.course_id where c.class_code = $1 order by x.${col}`, [code])).rows.map((r) => r.t);
    expect(await texts(TESTING_COURSE.classCode, 'questions', 'spanish')).toEqual(await texts(SEED_COURSE.classCode, 'questions', 'spanish'));
    expect(await texts(TESTING_COURSE.classCode, 'chunks', 'spanish')).toEqual(await texts(SEED_COURSE.classCode, 'chunks', 'spanish'));
    expect(TESTING_COURSE.modelAnswers).toEqual(SEED_COURSE.modelAnswers);
  });

  it('keeps the flag when re-seeded, and a course seeded without it stays gated', async () => {
    await seedCourse(db, TESTING_COURSE);
    expect(await flag(TESTING_COURSE.classCode)).toBe(true);
    await seedCourse(db, SEED_COURSE);
    expect(await flag(SEED_COURSE.classCode)).toBe(false);
  });

  it('is a valid course whose class code can be typed at joining', () => {
    expect(validateCourse(TESTING_COURSE).ok).toBe(true);
    expect(normaliseClassCode(TESTING_COURSE.classCode)).toBe(TESTING_COURSE.classCode);
    expect(validateCourse({ ...SEED_COURSE, unlockAll: 'yes' }).ok).toBe(false);
  });
});

describe('courseUnlockAll', () => {
  const idOf = async (code: string) => (await db.query<{ id: string }>('select id from courses where class_code = $1', [code])).rows[0].id;

  it('is true for a flagged course, false for an unflagged one and false for an unknown id', async () => {
    expect(await courseUnlockAll(db, await idOf(TESTING_COURSE.classCode))).toBe(true);
    expect(await courseUnlockAll(db, await idOf(SEED_COURSE.classCode))).toBe(false);
    expect(await courseUnlockAll(db, '00000000-0000-0000-0000-000000000000')).toBe(false);
  });
});
