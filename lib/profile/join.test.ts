import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { insertTestCourse, newTestDb } from '../db/test-db';
import { ADJECTIVES, NICKNAME_TAKEN, NOUNS, OPTION_COUNT, createProfile, joinClass, joinOptions, takenNicknames } from './profile';

// A small seeded random source, so a failure can be repeated.
const seeded = (seed = 1) => { let s = seed; return (max: number) => { s = (s * 16807) % 2147483647; return s % max; }; };

let db: Awaited<ReturnType<typeof newTestDb>>;
let courseId: string;
let otherCourseId: string;
beforeAll(async () => {
  db = await newTestDb();
  courseId = (await insertTestCourse(db, 'CLASS1')).courseId;
  otherCourseId = (await insertTestCourse(db, 'CLASS2')).courseId;
});
afterAll(() => db.close());

describe('nicknames offered when a student joins a class', () => {
  it('are six different names and never one a classmate has, even in a class that already holds a lot of them', async () => {
    // Fill the class with 400 students, by taking the first 400 two-part names, so that taken names are common.
    const names = ADJECTIVES.flatMap((a) => NOUNS.map((n) => `${a} ${n}`)).slice(0, 400);
    for (const nickname of names) await createProfile(db, { courseId, nickname, interests: [] });
    const taken = await takenNicknames(db, courseId);
    expect(taken.size).toBe(400);
    const random = seeded(9);
    for (let i = 0; i < 100; i++) {
      const options = await joinOptions(db, courseId, random);
      expect(options).toHaveLength(OPTION_COUNT);
      expect(new Set(options).size).toBe(OPTION_COUNT);
      for (const o of options) expect(taken.has(o), o).toBe(false);
    }
  });

  it('are not affected by who is in another class', async () => {
    await createProfile(db, { courseId: otherCourseId, nickname: 'Zippy Wombat', interests: [] });
    expect((await takenNicknames(db, courseId)).has('Zippy Wombat')).toBe(false);
    expect((await takenNicknames(db, otherCourseId)).has('Zippy Wombat')).toBe(true);
  });
});

describe('joining with a nickname', () => {
  it('works with a free nickname, and a nickname from the old list is still accepted', async () => {
    const r = await joinClass(db, { courseId, nickname: 'Zippy Cosmic Kettle' });
    expect(r.ok).toBe(true);
    expect((await takenNicknames(db, courseId)).has('Zippy Cosmic Kettle')).toBe(true);
  });

  it('refuses a nickname a classmate has, says so plainly and offers fresh options, and creates nothing', async () => {
    const taken = await takenNicknames(db, courseId);
    const before = taken.size;
    const again = await joinClass(db, { courseId, nickname: 'Zippy Cosmic Kettle' }, seeded(2));
    expect(again.ok).toBe(false);
    if (again.ok) return;
    expect(again.taken).toBe(true);
    expect(again.error).toBe(NICKNAME_TAKEN);
    expect(again.nicknames).toHaveLength(OPTION_COUNT);
    for (const o of again.nicknames!) expect(taken.has(o)).toBe(false);
    expect((await takenNicknames(db, courseId)).size).toBe(before);
  });

  it('accepts the same nickname in a different class', async () => {
    expect((await joinClass(db, { courseId: otherCourseId, nickname: 'Zippy Cosmic Kettle' })).ok).toBe(true);
  });

  it('still refuses a made-up nickname with the ordinary message, not the taken one', async () => {
    const r = await joinClass(db, { courseId, nickname: 'Alex' });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.taken).toBeUndefined();
    expect(r.error).toBe('Pick a nickname from the list.');
  });
});
