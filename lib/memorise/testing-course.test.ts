import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { recordResponse } from '../automate/store';
import { SEED_COURSE, TESTING_COURSE, simplestSeedAnswer } from '../course/seed';
import { seedCourse } from '../course/seed-db';
import { newTestDb } from '../db/test-db';
import { loadMastery, loadProgress } from '../progress/progress';
import { createProfile } from '../profile/profile';
import { practiceAnswerText } from './practice-text';
import { loadMemoriseItems, recordRecall } from './store';

// course-unlock-testing: a tester with no written answers practises the model answers.
let db: Awaited<ReturnType<typeof newTestDb>>;
let testing: { courseId: string; profileId: string; q: string[] };
let real: { courseId: string; profileId: string; q: string[] };

const modelFor = (position: number) => simplestSeedAnswer(position);

async function join(code: string, nickname: string) {
  const courseId = (await db.query<{ id: string }>('select id from courses where class_code = $1', [code])).rows[0].id;
  const q = (await db.query<{ id: string }>('select id from questions where course_id = $1 order by position', [courseId])).rows.map((r) => r.id);
  const p = await createProfile(db, { courseId, nickname, interests: [] });
  if (!p.ok) throw new Error(p.error);
  return { courseId, profileId: p.profile.id, q };
}

beforeAll(async () => {
  db = await newTestDb();
  await seedCourse(db, SEED_COURSE);
  await seedCourse(db, TESTING_COURSE);
  testing = await join(TESTING_COURSE.classCode, 'Sleepy Llama');
  real = await join(SEED_COURSE.classCode, 'Fuzzy Taco');
});
afterAll(() => db.close());

describe('memorise items in a testing course', () => {
  it('offers the Rock solid model answer for every question when nothing is written', async () => {
    const items = await loadMemoriseItems(db, testing.profileId, testing.courseId);
    expect(items.map((i) => i.id)).toEqual(testing.q);
    expect(items.map((i) => i.answer)).toEqual([1, 2, 3, 4, 5].map(modelFor));
    expect(items.every((i) => i.best === null && !i.mastered)).toBe(true);
  });

  it('never stores the model answer as the tester’s answer', async () => {
    const { rows } = await db.query<{ n: string }>('select count(*) as n from answers where profile_id = $1', [testing.profileId]);
    expect(Number(rows[0].n)).toBe(0);
    expect((await loadProgress(db, testing.profileId, testing.courseId)).answersConfirmed).toBe(0);
  });

  it('uses the tester’s own confirmed answer for a question when they have one, and the model for the rest', async () => {
    await db.query(`insert into answers (profile_id, question_id, text, value, confirmed_at) values ($1,$2,'Mi respuesta.',1, now())`, [testing.profileId, testing.q[1]]);
    const items = await loadMemoriseItems(db, testing.profileId, testing.courseId);
    expect(items).toHaveLength(5);
    expect(items[1]).toMatchObject({ id: testing.q[1], answer: 'Mi respuesta.' });
    expect(items[0].answer).toBe(modelFor(1));
    await db.query('delete from answers where profile_id = $1', [testing.profileId]);
  });

  it('treats an unconfirmed draft as no answer', async () => {
    await db.query(`insert into answers (profile_id, question_id, text, value, confirmed_at) values ($1,$2,'Borrador',1, null)`, [testing.profileId, testing.q[2]]);
    const items = await loadMemoriseItems(db, testing.profileId, testing.courseId);
    expect(items[2].answer).toBe(modelFor(3));
    await db.query('delete from answers where profile_id = $1', [testing.profileId]);
  });
});

describe('a gated course gets no fallback', () => {
  it('offers nothing and refuses an attempt until an answer is confirmed', async () => {
    expect(await loadMemoriseItems(db, real.profileId, real.courseId)).toEqual([]);
    expect(await practiceAnswerText(db, real.profileId, real.courseId, real.q[0])).toBeNull();
    const r = await recordRecall(db, { profileId: real.profileId, courseId: real.courseId, itemId: real.q[0], sessionId: randomUUID(), accuracy: 90, level: 1 });
    expect(r).toEqual({ ok: false, error: 'Confirm this answer first.' });
  });

  it('does not let a tester practise a question from another course', async () => {
    expect(await practiceAnswerText(db, testing.profileId, testing.courseId, real.q[0])).toBeNull();
  });
});

describe('attempts on model answers are real attempts (task 3.3)', () => {
  const s1 = randomUUID();
  const s2 = randomUUID();
  const say = (accuracy: number, sessionId: string) =>
    recordRecall(db, { profileId: testing.profileId, courseId: testing.courseId, itemId: testing.q[0], sessionId, accuracy, level: 1 });

  it('records memorise attempts against the question id and counts them towards mastery and coins', async () => {
    for (let i = 0; i < 3; i++) expect((await say(90, s1)).ok).toBe(true);
    const later = await say(90, s2);
    if (!later.ok) throw new Error(later.error);
    expect(later.mastered).toBe(true);
    expect(later.coinsAwarded).toBeGreaterThan(0);
    const mastery = await loadMastery(db, testing.profileId, 'memorise');
    expect(mastery.get(testing.q[0])?.qualifyingSuccesses).toBeGreaterThanOrEqual(3);
    const items = await loadMemoriseItems(db, testing.profileId, testing.courseId);
    expect(items[0].mastered).toBe(true);
  });

  it('records a timed round without any written answer', async () => {
    const r = await recordResponse(db, {
      profileId: testing.profileId, courseId: testing.courseId, itemId: testing.q[1], sessionId: randomUUID(),
      blank: false, accuracy: 90, responseTimeMs: 3000, repeats: 0, speed: 1, assisted: false,
    });
    expect(r.ok).toBe(true);
    const { rows } = await db.query<{ phase: string; outcome: string }>(`select phase, outcome from attempts where profile_id = $1 and item_id = $2`, [testing.profileId, testing.q[1]]);
    expect(rows).toEqual([{ phase: 'automate', outcome: 'correct' }]);
  });
});
