import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { balance } from '../coins/ledger';
import { newTestDb } from '../db/test-db';
import { logAttempt } from '../events/attempts';
import { seedCourse } from '../course/seed-db';
import { SEED_COURSE } from '../course/seed';
import { HALF, LONG, SHORT } from '../sheets/samples/free-time-selections';
import { createProfile, nicknameOptions } from '../profile/profile';
import { loadMastery } from './progress';
import { loadWritingCourse, resetAnswerProgress, saveSheetAnswer, type WritingCourse } from './writing-store';

let db: Awaited<ReturnType<typeof newTestDb>>;
let course: WritingCourse;
let profileId: string;
let n = 0;

beforeAll(async () => {
  db = await newTestDb();
  const { courseId } = await seedCourse(db, SEED_COURSE);
  course = await loadWritingCourse(db, courseId);
  const p = await createProfile(db, { courseId, nickname: nicknameOptions(1)[0], interests: [] });
  if (!p.ok) throw new Error('profile');
  profileId = p.profile.id;
  n++;
});
afterAll(() => db.close());

const q = (position: number) => course.questions.find((x) => x.position === position)!;
const save = (pid: string, questionId: string, selection: unknown, confirm: boolean) => saveSheetAnswer(db, course, pid, questionId, selection, confirm);

async function freshProfile() {
  const p = await createProfile(db, { courseId: (await db.query<{ id: string }>('select id from courses limit 1')).rows[0].id, nickname: nicknameOptions(++n + 1)[n % 5], interests: [] });
  if (!p.ok) throw new Error('profile');
  return p.profile.id;
}

describe('saving an answer stores its value, not a level', () => {
  it('keeps the rubric value and returns it', async () => {
    const r = await save(profileId, q(1).id, SHORT, false);
    expect(r).toMatchObject({ ok: true, confirmed: false, bonus: 0 });
    if (!r.ok) throw new Error(r.error);
    expect(r.value).toBeGreaterThan(0);
    const row = await db.query<{ value: number }>('select value from answers where profile_id = $1 and question_id = $2', [profileId, q(1).id]);
    expect(row.rows[0].value).toBe(r.value);
    const longer = await save(profileId, q(1).id, LONG, false);
    if (!longer.ok) throw new Error(longer.error);
    expect(longer.value).toBeGreaterThanOrEqual(r.value);
  });
});

describe('the all-five bonus', () => {
  it('is paid once, when the last answer is confirmed, and equals the lowest-valued answer', async () => {
    const pid = await freshProfile();
    const picks = [SHORT, LONG, SHORT, LONG, SHORT];
    const values: number[] = [];
    for (let i = 0; i < 4; i++) {
      const r = await save(pid, course.questions[i].id, picks[i], true);
      if (!r.ok) throw new Error(r.error);
      expect(r.bonus).toBe(0);
      values.push(r.value);
    }
    expect(await balance(db, pid)).toBe(0); // writing alone pays nothing
    const last = await save(pid, course.questions[4].id, picks[4], true);
    if (!last.ok) throw new Error(last.error);
    values.push(last.value);
    expect(last.bonus).toBe(Math.max(1, Math.min(...values)));
    expect(await balance(db, pid)).toBe(last.bonus);

    // Changing an answer and confirming it again does not pay a second bonus.
    await save(pid, course.questions[0].id, LONG, false);
    const again = await save(pid, course.questions[0].id, LONG, true);
    expect(again).toMatchObject({ ok: true, bonus: 0 });
    expect(await balance(db, pid)).toBe(last.bonus);
  });

  it('is not paid while any answer is unconfirmed, and never blocks a student who moves on', async () => {
    const pid = await freshProfile();
    for (const x of course.questions.slice(0, 3)) await save(pid, x.id, SHORT, true);
    expect(await balance(db, pid)).toBe(0);
  });
});

describe('changing a confirmed answer resets its progress', () => {
  async function masterAndAttempt(pid: string, questionId: string) {
    const [s1, s2] = [randomUUID(), randomUUID()];
    for (const s of [s1, s1, s2]) await logAttempt(db, { profileId: pid, itemKind: 'question', itemId: questionId, phase: 'memorise', outcome: 'correct', accuracy: 95, assisted: false, sessionId: s });
  }

  it('wipes memorise progress for that answer only, when its words change', async () => {
    const pid = await freshProfile();
    const [a, b] = [course.questions[0], course.questions[1]];
    await save(pid, a.id, SHORT, true);
    await save(pid, b.id, SHORT, true);
    await masterAndAttempt(pid, a.id);
    await masterAndAttempt(pid, b.id);
    expect((await loadMastery(db, pid, 'memorise')).get(a.id)?.qualifyingSuccesses).toBeGreaterThan(0);

    const r = await save(pid, a.id, LONG, false);
    expect(r).toMatchObject({ ok: true, progressReset: true });
    const mastery = await loadMastery(db, pid, 'memorise');
    expect(mastery.get(a.id)).toBeUndefined();
    expect(mastery.get(b.id)?.qualifyingSuccesses).toBeGreaterThan(0);
    const left = await db.query<{ n: string }>(`select count(*) as n from attempts where profile_id = $1 and item_id = $2 and phase = 'memorise'`, [pid, a.id]);
    expect(Number(left.rows[0].n)).toBe(0);
  });

  it('does not reset when the same words are saved again, or for an answer that was never confirmed', async () => {
    const pid = await freshProfile();
    const x = course.questions[0];
    await save(pid, x.id, SHORT, true);
    await masterAndAttempt(pid, x.id);
    const same = await save(pid, x.id, SHORT, false);
    expect(same).toMatchObject({ progressReset: false });
    expect((await loadMastery(db, pid, 'memorise')).get(x.id)?.qualifyingSuccesses).toBeGreaterThan(0);

    const y = course.questions[1];
    await save(pid, y.id, HALF, false); // a draft
    const r = await save(pid, y.id, SHORT, false);
    expect(r).toMatchObject({ progressReset: false });
  });

  it('keeps the coins already earned', async () => {
    const pid = await freshProfile();
    await db.query(`insert into coin_ledger (profile_id, amount, reason) values ($1, 6, 'attempt')`, [pid]);
    const x = course.questions[0];
    await save(pid, x.id, SHORT, true);
    await resetAnswerProgress(db, pid, x.id);
    expect(await balance(db, pid)).toBe(6);
  });
});
