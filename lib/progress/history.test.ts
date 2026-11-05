import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { insertTestCourse, newTestDb } from '../db/test-db';
import { logAttempt } from '../events/attempts';
import { createProfile, nicknameOptions } from '../profile/profile';
import { CLASS_GOAL, loadClassGoal } from './class-goal';
import { loadOwnHistory } from './history';

let db: Awaited<ReturnType<typeof newTestDb>>;
let courseId: string;
let q: string[];
beforeAll(async () => {
  db = await newTestDb();
  const c = await insertTestCourse(db);
  courseId = c.courseId;
  q = c.questionIds;
});
afterAll(() => db.close());

async function student(nickname: string) {
  const p = await createProfile(db, { courseId, nickname, interests: [] });
  if (!p.ok) throw new Error('profile');
  return p.profile.id;
}
const attempt = (profileId: string, itemId: string, over: Record<string, unknown> = {}) =>
  logAttempt(db, { profileId, itemKind: 'question', itemId, phase: 'memorise', outcome: 'correct', sessionId: randomUUID(), assisted: false, accuracy: 80, ...over } as never);

describe('own history (task 13.4)', () => {
  it('is empty before any practice, with no best on any answer', async () => {
    const id = await student(nicknameOptions(1)[0]);
    const h = await loadOwnHistory(db, id, courseId);
    expect(h).toMatchObject({ attempts: 0, daysPractised: 0, sessions: 0 });
    expect(h.bests).toHaveLength(5);
    expect(h.bests.every((b) => b.best === null)).toBe(true);
  });

  it('counts only the student\'s own practice and keeps their best per answer', async () => {
    const me = await student(nicknameOptions(1)[0]);
    const other = await student(nicknameOptions(1)[0]);
    await attempt(me, q[0], { accuracy: 60 });
    await attempt(me, q[0], { accuracy: 90 });
    await attempt(me, q[0], { accuracy: 70 });
    await attempt(other, q[0], { accuracy: 100 });
    const h = await loadOwnHistory(db, me, courseId);
    expect(h.attempts).toBe(3);
    expect(h.byPhase).toEqual({ memorise: 3 });
    expect(h.bests[0]).toEqual({ position: 1, best: 90 });
    expect(h.daysPractised).toBe(1);
  });
});

describe('class goal (task 13.4)', () => {
  it('shows nothing while the class is too small for a total to hide anyone', async () => {
    const c = await insertTestCourse(db, 'SMALL1');
    for (let i = 0; i < CLASS_GOAL.minStudents - 1; i++) {
      const p = await createProfile(db, { courseId: c.courseId, nickname: nicknameOptions(1)[0], interests: [] });
      if (!p.ok) throw new Error('profile');
      await attempt(p.profile.id, c.questionIds[0]);
    }
    expect(await loadClassGoal(db, c.courseId)).toEqual({ shown: false });
  });

  it('shows combined totals only: no names, no ids, no positions', async () => {
    const c = await insertTestCourse(db, 'BIG123');
    const names = nicknameOptions(6);
    const ids: string[] = [];
    for (const nickname of names) {
      const p = await createProfile(db, { courseId: c.courseId, nickname, interests: [] });
      if (!p.ok) throw new Error('profile');
      ids.push(p.profile.id);
    }
    for (let i = 0; i < 6; i++) await attempt(ids[0], c.questionIds[0]); // one very keen student
    await attempt(ids[1], c.questionIds[1]);

    const goal = await loadClassGoal(db, c.courseId);
    expect(goal).toEqual({ shown: true, students: 6, attempts: 7, goal: 6 * CLASS_GOAL.attemptsPerStudent });
    const text = JSON.stringify(goal);
    for (const name of names) expect(text).not.toContain(name);
    for (const id of ids) expect(text).not.toContain(id);
    expect(Object.keys(goal).sort()).toEqual(['attempts', 'goal', 'shown', 'students']);
  });

  it('counts only this class and only this week', async () => {
    const c = await insertTestCourse(db, 'WEEK12');
    const ids: string[] = [];
    for (let i = 0; i < 5; i++) {
      const p = await createProfile(db, { courseId: c.courseId, nickname: nicknameOptions(1)[0], interests: [] });
      if (!p.ok) throw new Error('profile');
      ids.push(p.profile.id);
    }
    await attempt(ids[0], c.questionIds[0]);
    await db.query(`update attempts set created_at = now() - interval '10 days' where profile_id = $1`, [ids[0]]);
    await attempt(ids[1], c.questionIds[0]);
    expect((await loadClassGoal(db, c.courseId) as { attempts: number }).attempts).toBe(1);
  });
});
