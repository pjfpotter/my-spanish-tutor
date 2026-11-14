import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { recordResponse } from '../automate/store';
import { seedCourse } from '../course/seed-db';
import { ALL_MATCHED_COURSE as SEED_COURSE } from '../course/seed';
import { newTestDb } from '../db/test-db';
import { recordRecall } from '../memorise/store';
import { createProfile, nicknameOptions } from '../profile/profile';
import { loadWritingCourse, saveSheetAnswer, type WritingCourse } from '../progress/writing-store';
import { LONG, SHORT } from '../sheets/samples/free-time-selections';
import { earnedValue, EFFORT_SESSIONS, payAnswerValue } from './answer-value';
import { balance } from './ledger';

describe('how much of an answer\'s value is earned (26.1e)', () => {
  const base = { value: 10, effortSessions: 0, memorised: false, automated: false };

  it('pays nothing for writing alone', () => {
    expect(earnedValue(base)).toBe(0);
  });

  it('pays for effort, in parts, however the attempts went', () => {
    expect(earnedValue({ ...base, effortSessions: 1 })).toBe(Math.round(10 * 0.05));
    expect(earnedValue({ ...base, effortSessions: EFFORT_SESSIONS })).toBe(2);
    expect(earnedValue({ ...base, effortSessions: 99 })).toBe(2); // effort has a ceiling, so it cannot be farmed
  });

  it('pays the memorised stage, then the automated one, and a finished answer pays exactly its value', () => {
    const done = { value: 10, effortSessions: 9, memorised: true, automated: true };
    expect(earnedValue({ ...done, automated: false })).toBe(7);
    expect(earnedValue(done)).toBe(10);
    for (const value of [1, 3, 5, 7, 16]) expect(earnedValue({ ...done, value })).toBe(value);
  });
});

describe('paying through learning, from stored progress', () => {
  let db: Awaited<ReturnType<typeof newTestDb>>;
  let course: WritingCourse;
  let courseId: string;
  let n = 0;
  beforeAll(async () => {
    db = await newTestDb();
    ({ courseId } = await seedCourse(db, SEED_COURSE));
    course = await loadWritingCourse(db, courseId);
  });
  afterAll(() => db.close());

  async function student() {
    const p = await createProfile(db, { courseId, nickname: nicknameOptions(++n + 1)[n % 5], interests: [] });
    if (!p.ok) throw new Error('profile');
    const q = course.questions[0];
    const r = await saveSheetAnswer(db, course, p.profile.id, q.id, SHORT, true);
    if (!r.ok) throw new Error(r.error);
    return { pid: p.profile.id, q, value: r.value };
  }
  const recall = (pid: string, qid: string, accuracy: number, sessionId: string, level = 0) =>
    recordRecall(db, { profileId: pid, courseId, itemId: qid, sessionId, accuracy, level });
  const answerEuros = async (pid: string) =>
    Number((await db.query<{ t: string }>(`select coalesce(sum(amount), 0) as t from coin_ledger where profile_id = $1 and reason = 'answer'`, [pid])).rows[0].t);

  it('pays nothing for writing, then pays effort even when the attempts miss', async () => {
    const { pid, q } = await student();
    expect(await answerEuros(pid)).toBe(0);
    for (const s of Array.from({ length: 4 }, () => randomUUID())) await recall(pid, q.id, 10, s);
    expect(await answerEuros(pid)).toBeGreaterThan(0); // effort, not success
  });

  it('pays the memorised stage once, never twice', async () => {
    const { pid, q, value } = await student();
    const [a, b] = [randomUUID(), randomUUID()];
    for (const s of [a, a, b]) await recall(pid, q.id, 95, s, 1);
    const paid = await answerEuros(pid);
    expect(paid).toBe(Math.min(value, Math.round(value * (0.2 * (2 / 4) + 0.5))));
    for (const s of [a, b]) await recall(pid, q.id, 95, s, 1);
    expect(await answerEuros(pid)).toBe(paid); // same sessions, nothing new
    expect(await payAnswerValue(db, pid, q.id)).toBe(0);
  });

  it('pays the rest when the answer meets the timed target, up to exactly its value', async () => {
    const { pid, q, value } = await student();
    const sessions = Array.from({ length: 5 }, () => randomUUID());
    for (const s of sessions.slice(0, 4)) await recall(pid, q.id, 95, s, 1);
    for (const s of sessions.slice(0, 2)) {
      const r = await recordResponse(db, { profileId: pid, courseId, itemId: q.id, sessionId: s, blank: false, accuracy: 95, responseTimeMs: 1500, speed: 1, repeats: 0, assisted: false });
      expect(r.ok).toBe(true);
    }
    expect(await answerEuros(pid)).toBe(value);
  });

  it('tops up when a changed answer is worth more, and never takes anything back', async () => {
    const { pid, q } = await student();
    const [a, b] = [randomUUID(), randomUUID()];
    for (const s of [a, a, b]) await recall(pid, q.id, 95, s, 1);
    const before = await answerEuros(pid);
    const changed = await saveSheetAnswer(db, course, pid, q.id, LONG, true); // a change: progress resets, earnings stay
    expect(changed).toMatchObject({ ok: true });
    expect(await answerEuros(pid)).toBe(before);
    expect(await balance(db, pid)).toBeGreaterThanOrEqual(before);
    for (const s of [randomUUID(), randomUUID(), randomUUID()]) await recall(pid, q.id, 95, s, 1);
    expect(await answerEuros(pid)).toBeGreaterThanOrEqual(before);
  });
});
