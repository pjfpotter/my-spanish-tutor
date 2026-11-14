import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { insertTestCourse, newTestDb } from '../db/test-db';
import { logAttempt } from '../events/attempts';
import { createProfile, nicknameOptions } from '../profile/profile';
import { phaseStates } from '../phases/gate';
import { daysUntil, loadProgress } from './progress';

let db: Awaited<ReturnType<typeof newTestDb>>;
let profileId: string;
let courseId: string;
let qids: string[];
beforeAll(async () => {
  db = await newTestDb();
  ({ courseId, questionIds: qids } = await insertTestCourse(db));
  const p = await createProfile(db, { courseId, nickname: nicknameOptions(1)[0], interests: [] });
  if (!p.ok) throw new Error('profile');
  profileId = p.profile.id;
});
afterAll(() => db.close());

const ok = (itemId: string, sessionId: string) =>
  logAttempt(db, { profileId, itemKind: 'question', itemId, phase: 'understand', outcome: 'correct', assisted: false, sessionId });

describe('progress from the database', () => {
  it('starts with nothing mastered', async () => {
    expect(await loadProgress(db, profileId)).toEqual({ answersConfirmed: 0, questionsMastered: 0, answersMemorised: 0, testReady: false, total: 5 });
  });

  it('counts a question as mastered after three correct, even in one session', async () => {
    const s1 = randomUUID();
    await ok(qids[0], s1); await ok(qids[0], s1);
    expect((await loadProgress(db, profileId)).questionsMastered).toBe(0);
    await ok(qids[0], s1);
    expect((await loadProgress(db, profileId)).questionsMastered).toBe(1);
  });
});

describe('daysUntil', () => {
  it('counts calendar days to the test date', () => {
    const now = new Date('2026-11-02T15:00:00Z');
    expect(daysUntil('2026-11-20', now)).toBe(18);
    expect(daysUntil('2026-11-02', now)).toBe(0);
    expect(daysUntil('2026-11-01', now)).toBe(-1);
  });
});

describe('the gate, from seeded mastery records (tasks 6.3 and 6.4)', () => {
  it('keeps memorise locked until all five questions are mastered and all five answers confirmed', async () => {
    const d = await newTestDb();
    const { courseId, questionIds } = await insertTestCourse(d);
    const p = await createProfile(d, { courseId, nickname: nicknameOptions(1)[0], interests: [] });
    if (!p.ok) throw new Error('profile');
    const pid = p.profile.id;
    const s1 = randomUUID();
    const s2 = randomUUID();
    const master = async (qid: string) => {
      for (const s of [s1, s1, s2]) await logAttempt(d, { profileId: pid, itemKind: 'question', itemId: qid, phase: 'understand', outcome: 'correct', assisted: false, sessionId: s });
    };
    const confirmAll = async () => {
      for (const qid of questionIds) await d.query(`insert into answers (profile_id, question_id, text, value, confirmed_at) values ($1,$2,'x',1, now())`, [pid, qid]);
    };

    await confirmAll();
    for (const qid of questionIds.slice(0, 4)) await master(qid);
    let progress = await loadProgress(d, pid);
    expect(progress.questionsMastered).toBe(4);
    expect(phaseStates(progress).memorise.status).toBe('locked');

    await master(questionIds[4]);
    progress = await loadProgress(d, pid);
    expect(progress.questionsMastered).toBe(5);
    expect(phaseStates(progress).memorise.status).toBe('open');
    await d.close();
  });
});
