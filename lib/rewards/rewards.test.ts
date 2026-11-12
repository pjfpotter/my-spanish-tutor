import { randomUUID } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { awardCoins, balance } from '../coins/ledger';
import { insertTestCourse, newTestDb } from '../db/test-db';
import { logAttempt } from '../events/attempts';
import { createProfile, nicknameOptions } from '../profile/profile';
import { CATALOGUE, MAX_FREEZES } from './catalogue';
import { buyItem, equipWallpaper, freezesAvailable, loadShop, settleStreak } from './store';
import { daysToFreeze, dayBefore, streakFrom } from './streak';

const days = (...d: string[]) => new Set(d);
const TODAY = '2026-11-10';
const ago = (n: number) => dayBefore(TODAY, n);

describe('streak (task 13.3)', () => {
  it('counts consecutive days of practice, from today or from yesterday', () => {
    expect(streakFrom(days(TODAY, ago(1), ago(2)), days(), TODAY)).toBe(3);
    expect(streakFrom(days(ago(1), ago(2)), days(), TODAY)).toBe(2); // today is still to come
    expect(streakFrom(days(), days(), TODAY)).toBe(0);
  });
  it('a missed day ends it, but nothing else is lost', () => {
    expect(streakFrom(days(ago(1), ago(3), ago(4)), days(), TODAY)).toBe(1);
  });
  it('a frozen day keeps the chain without adding to the count', () => {
    expect(streakFrom(days(TODAY, ago(2), ago(3)), days(ago(1)), TODAY)).toBe(3);
  });
  it('freezes a single missed day when there is a freeze', () => {
    expect(daysToFreeze(days(ago(2), ago(3)), days(), TODAY, 1)).toEqual([ago(1)]);
  });
  it('freezes a run of missed days only if every one can be covered, otherwise spends nothing', () => {
    const practised = days(ago(3), ago(4));
    expect(daysToFreeze(practised, days(), TODAY, 2)).toEqual([ago(1), ago(2)]);
    expect(daysToFreeze(practised, days(), TODAY, 1)).toEqual([]);
  });
  it('has nothing to freeze when yesterday was practised, or when there was never a streak', () => {
    expect(daysToFreeze(days(ago(1)), days(), TODAY, 2)).toEqual([]);
    expect(daysToFreeze(days(), days(), TODAY, 2)).toEqual([]);
  });
});

let db: Awaited<ReturnType<typeof newTestDb>>;
let courseId: string;
let q: string;
beforeAll(async () => {
  db = await newTestDb();
  const c = await insertTestCourse(db);
  courseId = c.courseId;
  q = c.questionIds[0];
});
afterAll(() => db.close());

async function student() {
  const p = await createProfile(db, { courseId, nickname: nicknameOptions(1)[0], interests: [] });
  if (!p.ok) throw new Error('profile');
  return p.profile.id;
}

describe('the shop (task 13.3)', () => {
  it('has a fixed price for every item, whole coins, and nothing free', () => {
    for (const i of CATALOGUE) expect(Number.isInteger(i.price) && i.price > 0).toBe(true);
    expect(new Set(CATALOGUE.map((i) => i.id)).size).toBe(CATALOGUE.length);
  });

  it('gives exactly the item bought and takes exactly its price', async () => {
    const id = await student();
    await awardCoins(db, id, 100, 'attempt');
    const r = await buyItem(db, id, 'wall-caramelo');
    expect(r).toMatchObject({ ok: true, coins: 60 });
    expect(await balance(db, id)).toBe(60);
    expect((await loadShop(db, id)).owned).toEqual(['wall-caramelo']);
    const { rows } = await db.query<{ amount: number; reason: string }>(`select amount, reason from coin_ledger where profile_id = $1 order by id`, [id]);
    expect(rows).toEqual([{ amount: 100, reason: 'attempt' }, { amount: -40, reason: 'spend' }]);
  });

  it('refuses when there are not enough coins, taking nothing and saying how many more', async () => {
    const id = await student();
    await awardCoins(db, id, 30, 'attempt');
    expect(await buyItem(db, id, 'obj-reloj')).toEqual({ ok: false, error: 'You need €50 more for that.' });
    expect(await balance(db, id)).toBe(30);
    expect((await loadShop(db, id)).owned).toEqual([]);
  });

  it('refuses a second copy and an unknown item', async () => {
    const id = await student();
    await awardCoins(db, id, 200, 'attempt');
    await buyItem(db, id, 'stk-ojo');
    expect(await buyItem(db, id, 'stk-ojo')).toEqual({ ok: false, error: 'You already have that.' });
    expect((await buyItem(db, id, 'nope')).ok).toBe(false);
    expect(await balance(db, id)).toBe(180);
  });

  it('cannot spend the same coins twice at once', async () => {
    const id = await student();
    await awardCoins(db, id, 50, 'attempt');
    const results = await Promise.all([buyItem(db, id, 'obj-lampara'), buyItem(db, id, 'obj-lampara'), buyItem(db, id, 'obj-planta')]);
    expect(await balance(db, id)).toBeGreaterThanOrEqual(0);
    expect((await loadShop(db, id)).owned.filter((x) => x === 'obj-lampara').length).toBeLessThanOrEqual(1);
    expect(results.some((r) => r.ok)).toBe(true);
  });

  it('only a wallpaper the student owns can be chosen', async () => {
    const id = await student();
    await awardCoins(db, id, 100, 'attempt');
    expect(await equipWallpaper(db, id, 'wall-colinas')).toEqual({ ok: false, error: 'Buy it first.' });
    await buyItem(db, id, 'wall-colinas');
    expect(await equipWallpaper(db, id, 'wall-colinas')).toEqual({ ok: true });
    expect((await loadShop(db, id)).wallpaper).toBe('wall-colinas');
    expect((await equipWallpaper(db, id, 'stk-ojo')).ok).toBe(false);
    expect(await equipWallpaper(db, id, null)).toEqual({ ok: true });
  });

  it('a freeze can be held up to the limit, and is used on a missed day to keep the streak', async () => {
    const id = await student();
    await awardCoins(db, id, 200, 'attempt');
    for (let i = 0; i < MAX_FREEZES; i++) expect((await buyItem(db, id, 'freeze')).ok).toBe(true);
    expect((await buyItem(db, id, 'freeze')).ok).toBe(false);
    expect(await freezesAvailable(db, id)).toBe(MAX_FREEZES);

    // Practised two and three days ago, missed yesterday.
    for (const back of [2, 3]) {
      await logAttempt(db, { profileId: id, itemKind: 'question', itemId: q, phase: 'understand', outcome: 'correct', sessionId: randomUUID(), assisted: false });
      await db.query(`update attempts set created_at = now() - make_interval(days => $2) where profile_id = $1 and created_at > now() - interval '1 minute'`, [id, back]);
    }
    const today = new Date().toISOString().slice(0, 10);
    await settleStreak(db, id, today);
    expect(await freezesAvailable(db, id)).toBe(MAX_FREEZES - 1); // one used on yesterday
    expect((await loadShop(db, id, today)).streak).toBe(2);
    await settleStreak(db, id, today); // idempotent
    expect(await freezesAvailable(db, id)).toBe(MAX_FREEZES - 1);
  });

  it('keeps freezes and ends the streak when there are none to use, losing nothing else', async () => {
    const id = await student();
    await logAttempt(db, { profileId: id, itemKind: 'question', itemId: q, phase: 'understand', outcome: 'correct', sessionId: randomUUID(), assisted: false });
    await db.query(`update attempts set created_at = now() - interval '3 days' where profile_id = $1`, [id]);
    const before = await balance(db, id);
    await settleStreak(db, id);
    expect((await loadShop(db, id)).streak).toBe(0);
    expect(await balance(db, id)).toBe(before); // no coins taken for a missed day
  });
});

describe('play earns nothing, and there is no payment or random draw (task 13.3)', () => {
  it('loading the shop and the home data awards no coins', async () => {
    const id = await student();
    await loadShop(db, id);
    await settleStreak(db, id);
    expect(await balance(db, id)).toBe(0);
    const { rows } = await db.query('select 1 from coin_ledger where profile_id = $1', [id]);
    expect(rows).toEqual([]);
  });

  const files = (dir: string): string[] =>
    readdirSync(dir).flatMap((f) => {
      const p = path.join(dir, f);
      return statSync(p).isDirectory() ? (f === 'node_modules' || f === '.next' ? [] : files(p)) : /\.(ts|tsx)$/.test(f) && !/\.test\.tsx?$/.test(f) ? [p] : [];
    });
  const root = path.join(__dirname, '..', '..');
  const source = [...files(path.join(root, 'app')), ...files(path.join(root, 'lib'))];

  it('has no payment provider or checkout anywhere in the app', () => {
    const hits = source.filter((f) => /stripe|paypal|braintree|checkout|payment_intent|apple pay|google pay|in-app purchase/i.test(readFileSync(f, 'utf8')));
    expect(hits).toEqual([]);
  });

  it('has no random draw in anything that gives a student an item', () => {
    const reward = source.filter((f) => /[\\/](rewards|shop)[\\/]|api[\\/]shop/.test(f) || /rewards\/store/.test(f));
    expect(reward.length).toBeGreaterThan(3);
    const hits = reward.filter((f) => /Math\.random|randomInt|randomUUID|getRandomValues|shuffle|loot|gacha|lucky|mystery|pack\b/i.test(readFileSync(f, 'utf8')));
    expect(hits).toEqual([]);
  });
});
