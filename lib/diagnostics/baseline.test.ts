import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { insertTestCourse, newTestDb } from '../db/test-db';
import { createProfile, nicknameOptions } from '../profile/profile';
import { baselineDone, knownAtStart, loadBaseline, saveBaseline, summariseBaseline } from './baseline';

let db: Awaited<ReturnType<typeof newTestDb>>;
let profileId: string;
let courseId: string;
let q: string[];
beforeAll(async () => {
  db = await newTestDb();
  const c = await insertTestCourse(db);
  courseId = c.courseId;
  q = c.questionIds;
  const other = await insertTestCourse(db, 'OTHER1');
  q.push(other.questionIds[0]);
  const p = await createProfile(db, { courseId, nickname: nicknameOptions(1)[0], interests: [] });
  if (!p.ok) throw new Error('profile');
  profileId = p.profile.id;
});
afterAll(() => db.close());

describe('starting-point check (10.4)', () => {
  it('stores results, keeps the first answer for a stage, and refuses another course\'s question', async () => {
    expect(await saveBaseline(db, { profileId, courseId, questionId: q[0], stage: 'pre', correct: false })).toBe(true);
    await saveBaseline(db, { profileId, courseId, questionId: q[0], stage: 'pre', correct: true });
    expect(await saveBaseline(db, { profileId, courseId, questionId: q[5], stage: 'pre', correct: true })).toBe(false);
    const rows = await loadBaseline(db, profileId);
    expect(rows).toEqual([{ questionId: q[0], stage: 'pre', correct: false }]);
  });

  it('is done once every question is answered (one pass); the summary names what is known and what is left to learn', async () => {
    for (const id of q.slice(1, 4)) await saveBaseline(db, { profileId, courseId, questionId: id, stage: 'pre', correct: id === q[1] });
    expect(baselineDone(await loadBaseline(db, profileId), 5)).toBe(false);
    await saveBaseline(db, { profileId, courseId, questionId: q[4], stage: 'pre', correct: true });
    const rows = await loadBaseline(db, profileId);
    expect(baselineDone(rows, 5)).toBe(true);
    expect(summariseBaseline(rows, q.slice(0, 5))).toEqual({ known: 2, total: 5, toLearn: [q[0], q[2], q[3]] });
    expect(knownAtStart(rows)).toEqual(new Set([q[1], q[4]]));
  });

  it('does not count as practice: no attempts, no mastery, no coins', async () => {
    expect((await db.query('select 1 from attempts where profile_id = $1', [profileId])).rows).toHaveLength(0);
    expect((await db.query('select 1 from mastery where profile_id = $1', [profileId])).rows).toHaveLength(0);
  });
});
