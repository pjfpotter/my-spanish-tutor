import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { insertTestCourse, newTestDb } from '../db/test-db';
import { quickWinId } from '../mastery/mastery';
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

  it('is done only when every question has its second test; summary and known-at-start follow the results', async () => {
    for (const id of q.slice(1, 5)) await saveBaseline(db, { profileId, courseId, questionId: id, stage: 'pre', correct: id === q[1] });
    expect(baselineDone(await loadBaseline(db, profileId), 5)).toBe(false);
    for (const id of q.slice(0, 5)) await saveBaseline(db, { profileId, courseId, questionId: id, stage: 'post', correct: true });
    const rows = await loadBaseline(db, profileId);
    expect(baselineDone(rows, 5)).toBe(true);
    expect(summariseBaseline(rows, 5)).toEqual({ before: 1, after: 5, total: 5 });
    expect(knownAtStart(rows)).toEqual(new Set([q[1]]));
  });

  it('does not count as practice: no attempts, no mastery, no coins', async () => {
    expect((await db.query('select 1 from attempts where profile_id = $1', [profileId])).rows).toHaveLength(0);
    expect((await db.query('select 1 from mastery where profile_id = $1', [profileId])).rows).toHaveLength(0);
  });
});

describe('quickWinId', () => {
  const item = (id: string, position: number, mastered: boolean, successes: number) => ({ id, position, mastered, successes });
  it('picks the unmastered question the student knows best, then the lowest position', () => {
    expect(quickWinId([item('a', 1, false, 0), item('b', 2, false, 2), item('c', 3, true, 3)])).toBe('b');
    expect(quickWinId([item('a', 1, false, 0), item('b', 2, false, 0)])).toBe('a');
  });
  it('is null when everything is mastered', () => expect(quickWinId([item('a', 1, true, 3)])).toBeNull());
});
