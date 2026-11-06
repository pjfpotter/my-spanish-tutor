import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { newTestDb } from '../db/test-db';
import { SEED_COURSE, TESTING_COURSE } from '../course/seed';
import { seedCourse } from '../course/seed-db';
import { createProfile } from '../profile/profile';

let db: Awaited<ReturnType<typeof newTestDb>>;
let current: { id: string; courseId: string; nickname: string; interests: never[] } | null = null;

vi.mock('../db', () => ({ getDb: async () => db }));
vi.mock('./session', async () => ({
  currentProfile: async () => current,
  defaultCourse: async () => {
    const { rows } = await db.query<{ id: string; title: string; test_date: string }>('select id, title, test_date from courses order by created_at, id limit 1');
    return { id: rows[0].id, title: rows[0].title, testDate: String(rows[0].test_date).slice(0, 10) };
  },
}));

const { loadHome } = await import('./home');

beforeAll(async () => {
  db = await newTestDb();
  await seedCourse(db, SEED_COURSE);
  await seedCourse(db, TESTING_COURSE);
});
afterAll(() => db.close());

const joinAs = async (code: string, nickname: string) => {
  const courseId = (await db.query<{ id: string }>('select id from courses where class_code = $1', [code])).rows[0].id;
  const r = await createProfile(db, { courseId, nickname, interests: [] });
  if (!r.ok) throw new Error(r.error);
  current = r.profile as never;
};
beforeEach(() => void (current = null));

describe('the desktop in a testing course (course-unlock-testing)', () => {
  it('shows every phase open and the testing flag for a fresh tester', async () => {
    await joinAs(TESTING_COURSE.classCode, 'Sleepy Llama');
    const home = await loadHome();
    expect(home.unlockAll).toBe(true);
    expect(Object.values(home.states).map((s) => s.status)).toEqual(['open', 'open', 'open', 'open']);
  });

  it('keeps a fresh student of the real course gated, with no testing flag', async () => {
    await joinAs(SEED_COURSE.classCode, 'Fuzzy Taco');
    const home = await loadHome();
    expect(home.unlockAll).toBe(false);
    expect(home.states.memorise.status).toBe('locked');
    expect(home.states.automate.status).toBe('locked');
  });

  it('keeps a device with no profile gated', async () => {
    const home = await loadHome();
    expect(home.signedIn).toBe(false);
    expect(home.unlockAll).toBe(false);
    expect(home.states.automate.status).toBe('locked');
  });
});

