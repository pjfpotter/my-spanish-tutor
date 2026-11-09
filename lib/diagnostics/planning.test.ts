import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { insertTestCourse, newTestDb } from '../db/test-db';
import { logAttempt } from '../events/attempts';
import { recordRecall } from '../memorise/store';
import { createProfile, nicknameOptions } from '../profile/profile';
import { saveBaseline } from './baseline';
import { planUnderstand } from './plan';
import { focusedAnswerIds } from './recall-store';
import { tagLatestAttempt } from './store';

// Task 10.5: tags and the starting-point check shape the next session, through the database.

let db: Awaited<ReturnType<typeof newTestDb>>;
let courseId: string;
let q: string[];
let n = 0;
beforeAll(async () => {
  db = await newTestDb();
  const c = await insertTestCourse(db);
  courseId = c.courseId;
  q = c.questionIds;
  await db.query(`insert into chunks (course_id, spanish, english_gloss, category, feature_tags, recycled) values ($1,'al cine','to the cinema','x','{}',false)`, [courseId]);
});
afterAll(() => db.close());

async function student() {
  const p = await createProfile(db, { courseId, nickname: nicknameOptions(++n)[0], interests: [] });
  if (!p.ok) throw new Error('profile');
  return p.profile.id;
}
const hear = (profileId: string, itemId: string, outcome: 'correct' | 'wrong', speed: number, sessionId = randomUUID()) =>
  logAttempt(db, { profileId, itemKind: 'question', itemId, phase: 'understand', outcome, speed, sessionId, assisted: false });

describe('diagnostics drive practice (10.5)', () => {
  it('a new student starts every question slowly', async () => {
    const id = await student();
    const plan = await planUnderstand(db, id, q);
    expect([...plan.values()].map((s) => s.startSpeed)).toEqual(['slow', 'slow', 'slow', 'slow', 'slow']);
  });

  it('the starting-point check lets a question already understood start at normal speed', async () => {
    const id = await student();
    await saveBaseline(db, { profileId: id, courseId, questionId: q[0], stage: 'pre', correct: true });
    const plan = await planUnderstand(db, id, q);
    expect(plan.get(q[0])?.startSpeed).toBe('normal');
    expect(plan.get(q[1])?.startSpeed).toBe('slow');
  });

  it('too fast: the same miss starts a step slower than without the tag', async () => {
    const tagged = await student();
    const untagged = await student();
    for (const id of [tagged, untagged]) await hear(id, q[0], 'wrong', 1.2);
    const session = randomUUID();
    await hear(tagged, q[1], 'wrong', 1.2, session);
    await hear(untagged, q[1], 'wrong', 1.2, session);
    await tagLatestAttempt(db, tagged, q[1], session, 'too_fast');
    const a = (await planUnderstand(db, tagged, q)).get(q[1])!;
    const b = (await planUnderstand(db, untagged, q)).get(q[1])!;
    expect(b.startSpeed).toBe('normal');
    expect(a.startSpeed).toBe('slow');
    expect(a.needsFocus).toBe(true);
    expect(b.needsFocus).toBe(false);
  });

  it('a later success clears the tag', async () => {
    const id = await student();
    const s = randomUUID();
    await hear(id, q[2], 'wrong', 1, s);
    await tagLatestAttempt(db, id, q[2], s, 'too_fast');
    await hear(id, q[2], 'correct', 0.7);
    expect((await planUnderstand(db, id, q)).get(q[2])?.needsFocus).toBe(false);
  });

  it('memorise practises first the answer with a hotspot chunk', async () => {
    const id = await student();
    await db.query(`insert into answers (profile_id, question_id, text, level, confirmed_at) values ($1,$2,'Voy al cine.',1, now()), ($1,$3,'Vivo en Leeds.',1, now())`, [id, q[0], q[1]]);
    const items = [{ id: q[0], answer: 'Voy al cine.' }, { id: q[1], answer: 'Vivo en Leeds.' }];
    expect(await focusedAnswerIds(db, id, courseId, items)).toEqual([]);
    for (let i = 0; i < 3; i++) await recordRecall(db, { profileId: id, courseId, itemId: q[0], sessionId: randomUUID(), accuracy: 40, level: 2, missedWords: [1, 2] });
    expect(await focusedAnswerIds(db, id, courseId, items)).toEqual([q[0]]);
  });
});
