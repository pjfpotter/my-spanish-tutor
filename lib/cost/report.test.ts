import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { insertTestCourse, newTestDb } from '../db/test-db';
import { createProfile, nicknameOptions } from '../profile/profile';
import { loadCostReport } from './report';

let db: Awaited<ReturnType<typeof newTestDb>>;
let courseId: string;
let otherCourse: string;
beforeAll(async () => {
  db = await newTestDb();
  courseId = (await insertTestCourse(db, 'COST1')).courseId;
  otherCourse = (await insertTestCourse(db, 'COST2')).courseId;
});
afterAll(() => db.close());

const log = (tier: string, cost: number, course: string | null, outcome = 'ok') =>
  db.query(`insert into cost_log (service, tier, units, estimated_cost_gbp, course_id, outcome) values ('s', $1, 1, $2, $3, $4)`, [tier, cost, course, outcome]);

describe('cost per student report (task 14.2)', () => {
  it('matches a seeded cost log: total, per student, and each tier with its share', async () => {
    for (let i = 0; i < 4; i++) {
      const p = await createProfile(db, { courseId, nickname: nicknameOptions(1)[0], interests: [] });
      if (!p.ok) throw new Error('profile');
    }
    await log('speech', 0.3, courseId);
    await log('speech', 0.1, courseId);
    await log('small_model', 0.4, courseId);
    await log('speech', 0.2, null); // shared build cost, no course named
    await log('speech', 5, otherCourse); // another course: not counted
    await log('speech', 0, courseId, 'cap_reached');
    await log('speech', 0, courseId, 'rate_limited');

    const r = await loadCostReport(db, courseId);
    expect(r.students).toBe(4);
    expect(r.totalGbp).toBeCloseTo(1.0, 6);
    expect(r.perStudentGbp).toBeCloseTo(0.25, 6);
    expect(r.tiers.map((t) => t.tier)).toEqual(['stored', 'rules', 'speech', 'small_model', 'large_model']);
    const t = Object.fromEntries(r.tiers.map((x) => [x.tier, x]));
    expect(t.speech.costGbp).toBeCloseTo(0.6, 6);
    expect(t.speech.share).toBeCloseTo(0.6, 6);
    expect(t.small_model.share).toBeCloseTo(0.4, 6);
    expect(t.large_model).toMatchObject({ costGbp: 0, share: 0, calls: 0 });
    expect(r.tiers.reduce((s, x) => s + x.share, 0)).toBeCloseTo(1, 6);
    expect(t.speech.calls).toBe(3);
    expect(r.refused).toBe(2);
  });

  it('has no per-student figure for a course with no students, and zero shares when nothing was spent', async () => {
    const empty = (await insertTestCourse(db, 'COST3')).courseId;
    await db.query('delete from cost_log');
    const r = await loadCostReport(db, empty);
    expect(r).toMatchObject({ students: 0, totalGbp: 0, perStudentGbp: null, refused: 0 });
    expect(r.tiers.every((x) => x.share === 0)).toBe(true);
  });
});
