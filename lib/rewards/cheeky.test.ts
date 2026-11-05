import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { awardCoins } from '../coins/ledger';
import { insertTestCourse, newTestDb } from '../db/test-db';
import { createProfile, nicknameOptions } from '../profile/profile';
import { CHEEKY_POOL } from '../tele/cheeky';
import { CHEEKY_ITEM_ID } from './catalogue';
import { cheekyLinesFor, cheekyPoolEnabled, setCheekyPool } from './cheeky';
import { buyItem } from './store';

let db: Awaited<ReturnType<typeof newTestDb>>;
let courseId: string;
let profileId: string;
beforeAll(async () => {
  db = await newTestDb();
  courseId = (await insertTestCourse(db, 'CHEEK')).courseId;
  const p = await createProfile(db, { courseId, nickname: nicknameOptions(1)[0], interests: [] });
  if (!p.ok) throw new Error('profile');
  profileId = p.profile.id;
  await awardCoins(db, profileId, 200, 'attempt');
});
afterAll(() => db.close());

describe('cheeky pool (task 13.5)', () => {
  it('is off by default: it cannot be bought and no line is available', async () => {
    expect(await cheekyPoolEnabled(db, courseId)).toBe(false);
    expect(await buyItem(db, profileId, CHEEKY_ITEM_ID)).toEqual({ ok: false, error: 'That is not in the shop.' });
    expect(await cheekyLinesFor(db, profileId, courseId)).toEqual([]);
  });

  it('once the owner switches it on, a student can buy it at its fixed price and then gets the lines', async () => {
    await setCheekyPool(db, courseId, true);
    expect(await cheekyLinesFor(db, profileId, courseId)).toEqual([]); // on, but not bought yet
    const r = await buyItem(db, profileId, CHEEKY_ITEM_ID);
    expect(r).toMatchObject({ ok: true, coins: 160 });
    expect(await cheekyLinesFor(db, profileId, courseId)).toEqual(CHEEKY_POOL);
  });

  it('disappears when switched off, even for a student who already bought it, and returns when switched back on', async () => {
    await setCheekyPool(db, courseId, false);
    expect(await cheekyLinesFor(db, profileId, courseId)).toEqual([]);
    expect(await buyItem(db, profileId, CHEEKY_ITEM_ID)).toMatchObject({ ok: false });
    await setCheekyPool(db, courseId, true);
    expect(await cheekyLinesFor(db, profileId, courseId)).toEqual(CHEEKY_POOL);
  });

  it('only affects its own course', async () => {
    const other = (await insertTestCourse(db, 'CHEEK2')).courseId;
    await setCheekyPool(db, courseId, true);
    expect(await cheekyPoolEnabled(db, other)).toBe(false);
  });
});
