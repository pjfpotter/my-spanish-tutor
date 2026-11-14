import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { insertTestCourse, newTestDb } from '../db/test-db';
import { createProfile, nicknameOptions } from '../profile/profile';
import { balance } from '../coins/ledger';
import { ladderDay } from './day';
import { LADDER_PAY, loadLadder, saveLesson, type LessonSave } from './ladder-store';

let db: Awaited<ReturnType<typeof newTestDb>>;
let profileId: string;
let courseId: string;
let q: string[];
const chunks = [{ spanish: 'Me llamo', english: 'My name is', category: 'other', featureTags: [], recycled: false }];
const today = new Date('2026-11-13T10:00:00Z');
const tomorrow = new Date('2026-11-14T10:00:00Z');

beforeAll(async () => {
  db = await newTestDb();
  const c = await insertTestCourse(db);
  courseId = c.courseId;
  q = c.questionIds;
  const p = await createProfile(db, { courseId, nickname: nicknameOptions(1)[0], interests: [] });
  if (!p.ok) throw new Error('profile');
  profileId = p.profile.id;
  await db.query(`insert into answers (profile_id, question_id, text, value, confirmed_at) values ($1,$2,'Me llamo Ana.',1, now()), ($1,$3,'Vivo en Leeds.',1, now())`, [profileId, q[0], q[1]]);
});
afterAll(() => db.close());

const clean = (itemId: string) => ({ itemId, accuracy: 100, level: 4 });
const save = (over: Partial<LessonSave>, when = today) =>
  saveLesson(db, { profileId, courseId, answers: [], recalls: [], earned: 0, ...over }, when);

describe('the ladder store (task 27.4)', () => {
  it('starts every confirmed answer fresh, split into its bits, with the day and the test countdown', async () => {
    const start = await loadLadder(db, profileId, courseId, chunks, today);
    expect(start.answers.map((a) => a.id)).toEqual([q[0], q[1]]);
    expect(start.answers[0].chunks.map((c) => c.t)).toEqual(['Me llamo', 'Ana']);
    expect(start.states.every((s) => s.stage === 0 && !s.memorised)).toBe(true);
    expect(start.day).toBe(ladderDay(today));
    expect(start.testDays).toBe(18);
  });

  it('remembers where each answer is, and pays what was earned', async () => {
    const r = await save({ answers: [{ itemId: q[0], stage: 2, top: 4, wipeDay: 0, recalls: [] }], earned: 12 });
    expect(r).toMatchObject({ ok: true, paid: 12, euros: 12 });
    const start = await loadLadder(db, profileId, courseId, chunks, today);
    expect(start.states[0]).toMatchObject({ stage: 2, top: 4, memorised: false });
    expect(start.euros).toBe(12);
  });

  it('refuses an answer the student has not confirmed', async () => {
    expect((await save({ answers: [{ itemId: q[2], stage: 1, top: 1, wipeDay: 0, recalls: [] }] })).ok).toBe(false);
  });

  it('caps what one save and one day can pay, so replaying cannot farm euros', async () => {
    const before = await balance(db, profileId);
    const r = await save({ earned: 9999 });
    expect(r).toMatchObject({ ok: true, paid: LADDER_PAY.perSave });
    await save({ earned: 9999 });
    await save({ earned: 9999 });
    expect((await balance(db, profileId)) - before).toBeLessThanOrEqual(LADDER_PAY.perDay);
  });

  it('memorises an answer after three clean answers from memory, even on one day, matching the ladder', async () => {
    const a = { itemId: q[1], stage: 3, top: 5, wipeDay: ladderDay(today), recalls: [ladderDay(today), ladderDay(today)] };
    await save({ answers: [a], recalls: [clean(q[1]), clean(q[1])] });
    let start = await loadLadder(db, profileId, courseId, chunks, today);
    expect(start.states[1].memorised).toBe(false); // two are not enough
    await save({ answers: [{ ...a, recalls: [...a.recalls, ladderDay(today)] }], recalls: [clean(q[1])] });
    start = await loadLadder(db, profileId, courseId, chunks, today);
    expect(start.states[1]).toMatchObject({ memorised: true }); // the third, the same day, is
  });

  it('does not count help or the lower rungs as memorising', async () => {
    const other = { itemId: q[0], stage: 2, top: 4, wipeDay: 0, recalls: [] };
    for (const day of [today, tomorrow, new Date('2026-11-15T10:00:00Z')]) {
      await save({ answers: [other], recalls: [{ itemId: q[0], accuracy: 90, level: 0 }, { itemId: q[0], accuracy: 90, level: 0 }] }, day);
    }
    expect((await loadLadder(db, profileId, courseId, chunks, today)).states[0].memorised).toBe(false);
  });
});
