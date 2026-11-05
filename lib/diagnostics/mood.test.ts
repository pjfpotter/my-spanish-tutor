import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { insertTestCourse, newTestDb } from '../db/test-db';
import { createProfile, nicknameOptions } from '../profile/profile';
import { latestMood, moodPlan, recordMood } from './mood';

let db: Awaited<ReturnType<typeof newTestDb>>;
let profileId: string;
beforeAll(async () => {
  db = await newTestDb();
  const { courseId } = await insertTestCourse(db);
  const p = await createProfile(db, { courseId, nickname: nicknameOptions(1)[0], interests: [] });
  if (!p.ok) throw new Error('profile');
  profileId = p.profile.id;
});
afterAll(() => db.close());

describe('mood check-in (10.4)', () => {
  it('has no mood before the first answer', async () => expect(await latestMood(db, profileId)).toBeNull());

  it('the latest answer wins, and a second answer in one session replaces the first', async () => {
    const s = randomUUID();
    await recordMood(db, profileId, s, 'good');
    await recordMood(db, profileId, s, 'nervous');
    expect(await latestMood(db, profileId)).toBe('nervous');
    expect((await db.query('select 1 from mood_checkins where session_id = $1', [s])).rows).toHaveLength(1);
    await recordMood(db, profileId, randomUUID(), 'ok');
    expect(await latestMood(db, profileId)).toBe('ok');
  });

  it('rejects a mood outside the fixed list', async () => {
    await expect(recordMood(db, profileId, randomUUID(), 'furious' as never)).rejects.toThrow();
  });

  it('"not a fan" acknowledges it lightly and leads to an easy quick win', () => {
    expect(moodPlan('not_a_fan')).toEqual({ situations: ['dislike', 'quick_win'], quickWin: true, gentle: true });
  });
  it('good and ok change nothing', () => expect(moodPlan('good')).toEqual({ situations: [], quickWin: false, gentle: false }));
});
