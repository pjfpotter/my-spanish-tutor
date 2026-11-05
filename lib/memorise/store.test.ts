import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { insertTestCourse, newTestDb } from '../db/test-db';
import { createProfile, nicknameOptions } from '../profile/profile';
import { loadMemoriseItems, recordRecall } from './store';

let db: Awaited<ReturnType<typeof newTestDb>>;
let profileId: string;
let q: string[];
let courseId: string;
beforeAll(async () => {
  db = await newTestDb();
  const c = await insertTestCourse(db);
  courseId = c.courseId;
  q = c.questionIds;
  const p = await createProfile(db, { courseId, nickname: nicknameOptions(1)[0], interests: [] });
  if (!p.ok) throw new Error('profile');
  profileId = p.profile.id;
  // Questions 1 and 2 have confirmed answers, question 3 is only a draft.
  await db.query(`insert into answers (profile_id, question_id, text, level, confirmed_at) values ($1,$2,'Me llamo Ana.',1, now()), ($1,$3,'Vivo en Leeds.',1, now()), ($1,$4,'Borrador',1, null)`, [profileId, q[0], q[1], q[2]]);
});
afterAll(() => db.close());

const s1 = randomUUID();
const s2 = randomUUID();
const say = (itemId: string, accuracy: number, level: number, sessionId = s1) => recordRecall(db, { profileId, courseId, itemId, sessionId, accuracy, level });

describe('memorise store (tasks 8.1 to 8.4)', () => {
  it('offers only confirmed answers, starting with the whole script and no best', async () => {
    const items = await loadMemoriseItems(db, profileId, courseId);
    expect(items.map((i) => i.id)).toEqual([q[0], q[1]]);
    expect(items[0]).toMatchObject({ answer: 'Me llamo Ana.', level: 0, best: null, mastered: false });
  });

  it('refuses an answer that is not confirmed, and bad numbers', async () => {
    expect(await say(q[2], 90, 0)).toEqual({ ok: false, error: 'Confirm this answer first.' });
    expect((await say(q[0], 101, 0)).ok).toBe(false);
    expect((await say(q[0], 50, 9)).ok).toBe(false);
  });

  it('reading the whole script is assisted: it earns coins and fades the prompt but never counts toward mastery', async () => {
    const a = await say(q[0], 100, 0);
    const b = await say(q[0], 100, 0);
    if (!a.ok || !b.ok) throw new Error('save');
    expect(b.mastery.qualifyingSuccesses).toBe(0);
    expect(b.coinsAwarded).toBeGreaterThan(0);
    expect(b.level).toBe(1); // two good attempts in a row: less of the script
    const { rows } = await db.query<{ outcome: string; assisted: boolean }>(`select outcome, assisted from attempts where profile_id=$1 and item_id=$2 order by created_at, id`, [profileId, q[0]]);
    expect(rows.map((r) => r.outcome)).toEqual(['assisted', 'assisted']);
  });

  it('three good recalls in one session leave the answer in progress, and a later session confirms it', async () => {
    for (let i = 0; i < 3; i++) await say(q[0], 90, 1, s1);
    let items = await loadMemoriseItems(db, profileId, courseId);
    expect(items[0]).toMatchObject({ mastered: false, laterSession: true, successes: 3 });
    const later = await say(q[0], 85, 2, s2);
    if (!later.ok) throw new Error('save');
    expect(later.mastered).toBe(true);
    items = await loadMemoriseItems(db, profileId, courseId);
    expect(items[0].mastered).toBe(true);
  });

  it('keeps the personal best, and reports the previous one so an improvement can be celebrated', async () => {
    const r = await say(q[1], 60, 0);
    if (!r.ok) throw new Error('save');
    expect(r).toMatchObject({ best: 60, previousBest: null });
    const better = await say(q[1], 75, 0);
    if (!better.ok) throw new Error('save');
    expect(better).toMatchObject({ best: 75, previousBest: 60 });
    const worse = await say(q[1], 40, 0);
    if (!worse.ok) throw new Error('save');
    expect(worse).toMatchObject({ best: 75, previousBest: 75 });
    expect((await loadMemoriseItems(db, profileId, courseId))[1].best).toBe(75);
  });

  it('a below-threshold attempt never removes mastery progress', async () => {
    const before = (await loadMemoriseItems(db, profileId, courseId))[0].successes;
    await say(q[0], 10, 2, s2);
    expect((await loadMemoriseItems(db, profileId, courseId))[0].successes).toBe(before);
  });

  it('carries the support level across sessions from stored attempts', async () => {
    // Question 1 had 2 + 3 + 1 good attempts and then a bad one: it has faded and been given a little back, never past English only.
    const item = (await loadMemoriseItems(db, profileId, courseId))[0];
    expect(item.level).toBeGreaterThan(0);
    expect(item.level).toBeLessThanOrEqual(4);
  });

  it('stores accuracy only: no transcript or audio column is involved', async () => {
    const { rows } = await db.query<{ column_name: string }>(`select column_name from information_schema.columns where table_name = 'attempts'`);
    expect(rows.map((r) => r.column_name).join(',')).not.toMatch(/transcript|audio|text/);
  });
});
