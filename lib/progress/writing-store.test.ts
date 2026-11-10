import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { assessAnswer } from '../coach/rubric';
import { balance } from '../coins/ledger';
import { newTestDb } from '../db/test-db';
import { logAttempt } from '../events/attempts';
import { seedCourse } from '../course/seed-db';
import { SEED_COURSE, simplestSeedAnswer } from '../course/seed';
import { createProfile, nicknameOptions } from '../profile/profile';
import { loadMastery } from './progress';
import { loadWritingCourse, resetAnswerProgress, saveAnswer, type WritingCourse } from './writing-store';

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
const value = (text: string) => assessAnswer(course.calibration, text).value;

async function freshProfile() {
  const p = await createProfile(db, { courseId: (await db.query<{ id: string }>('select id from courses limit 1')).rows[0].id, nickname: nicknameOptions(++n + 1)[n % 5], interests: [] });
  if (!p.ok) throw new Error('profile');
  return p.profile.id;
}

describe('saving an answer stores its value, not a level', () => {
  it('keeps the rubric value and returns it', async () => {
    const text = simplestSeedAnswer(1);
    const r = await saveAnswer(db, course, profileId, q(1).id, text, false);
    expect(r).toMatchObject({ ok: true, confirmed: false, value: value(text), bonus: 0 });
    const row = await db.query<{ value: number }>('select value from answers where profile_id = $1 and question_id = $2', [profileId, q(1).id]);
    expect(row.rows[0].value).toBe(value(text));
  });
});

describe('the all-five bonus', () => {
  it('is paid once, when the last answer is confirmed, and equals the lowest-valued answer', async () => {
    const pid = await freshProfile();
    const texts = course.questions.map((x) => simplestSeedAnswer(x.position));
    let bonus = 0;
    for (let i = 0; i < 4; i++) {
      const r = await saveAnswer(db, course, pid, course.questions[i].id, texts[i], true);
      expect(r).toMatchObject({ ok: true, bonus: 0 });
    }
    expect(await balance(db, pid)).toBe(0); // writing alone pays nothing
    const last = await saveAnswer(db, course, pid, course.questions[4].id, texts[4], true);
    if (!last.ok) throw new Error(last.error);
    bonus = last.bonus;
    expect(bonus).toBe(Math.max(1, Math.min(...texts.map(value))));
    expect(await balance(db, pid)).toBe(bonus);

    // Changing an answer and confirming it again does not pay a second bonus.
    await saveAnswer(db, course, pid, course.questions[0].id, 'Me gusta montar en bici porque es divertido.', false);
    const again = await saveAnswer(db, course, pid, course.questions[0].id, 'Me gusta montar en bici porque es divertido.', true);
    expect(again).toMatchObject({ ok: true, bonus: 0 });
    expect(await balance(db, pid)).toBe(bonus);
  });

  it('is not paid while any answer is unconfirmed, and never blocks a student who moves on', async () => {
    const pid = await freshProfile();
    for (const x of course.questions.slice(0, 3)) await saveAnswer(db, course, pid, x.id, simplestSeedAnswer(x.position), true);
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
    await saveAnswer(db, course, pid, a.id, simplestSeedAnswer(1), true);
    await saveAnswer(db, course, pid, b.id, simplestSeedAnswer(2), true);
    await masterAndAttempt(pid, a.id);
    await masterAndAttempt(pid, b.id);
    expect((await loadMastery(db, pid, 'memorise')).get(a.id)?.qualifyingSuccesses).toBeGreaterThan(0);

    const r = await saveAnswer(db, course, pid, a.id, 'Me gustan las películas de miedo porque son graciosas.', false);
    expect(r).toMatchObject({ ok: true, progressReset: true });
    const mastery = await loadMastery(db, pid, 'memorise');
    expect(mastery.get(a.id)).toBeUndefined();
    expect(mastery.get(b.id)?.qualifyingSuccesses).toBeGreaterThan(0);
    const left = await db.query<{ n: string }>(`select count(*) as n from attempts where profile_id = $1 and item_id = $2 and phase = 'memorise'`, [pid, a.id]);
    expect(Number(left.rows[0].n)).toBe(0);
  });

  it('does not reset for punctuation-only edits, or for an answer that was never confirmed', async () => {
    const pid = await freshProfile();
    const x = course.questions[0];
    const text = simplestSeedAnswer(1);
    await saveAnswer(db, course, pid, x.id, text, true);
    await masterAndAttempt(pid, x.id);
    const same = await saveAnswer(db, course, pid, x.id, text.replace(/\.$/, '!'), false);
    expect(same).toMatchObject({ progressReset: false });
    expect((await loadMastery(db, pid, 'memorise')).get(x.id)?.qualifyingSuccesses).toBeGreaterThan(0);

    const y = course.questions[1];
    await saveAnswer(db, course, pid, y.id, 'Me gusta.', false); // a draft
    const r = await saveAnswer(db, course, pid, y.id, 'Me gusta el cine.', false);
    expect(r).toMatchObject({ progressReset: false });
  });

  it('keeps the coins already earned', async () => {
    const pid = await freshProfile();
    await db.query(`insert into coin_ledger (profile_id, amount, reason) values ($1, 6, 'attempt')`, [pid]);
    const x = course.questions[0];
    await saveAnswer(db, course, pid, x.id, simplestSeedAnswer(1), true);
    await resetAnswerProgress(db, pid, x.id);
    expect(await balance(db, pid)).toBe(6);
  });
});
