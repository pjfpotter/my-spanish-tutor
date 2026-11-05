import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { insertTestCourse, newTestDb } from '../db/test-db';
import { createProfile, nicknameOptions } from '../profile/profile';
import { balance, awardCoins } from '../coins/ledger';
import { logAttempt, validateAttempt, type AttemptEvent } from './attempts';

let db: Awaited<ReturnType<typeof newTestDb>>;
let profileId: string;
let q1: string;
beforeAll(async () => {
  db = await newTestDb();
  const { courseId, questionIds } = await insertTestCourse(db);
  q1 = questionIds[0];
  const p = await createProfile(db, { courseId, nickname: nicknameOptions(1)[0], interests: [] });
  if (!p.ok) throw new Error('profile');
  profileId = p.profile.id;
});
afterAll(() => db.close());

const ev = (over: Partial<AttemptEvent> = {}): AttemptEvent => ({
  profileId, itemKind: 'question', itemId: q1, phase: 'understand', outcome: 'correct',
  sessionId: randomUUID(), assisted: false, voice: 'tele', speed: 1, responseTimeMs: 1200, ...over,
});

describe('attempt events', () => {
  it('stores every specified field', async () => {
    const e = ev({ outcome: 'wrong', assisted: true, causeTags: ['too_fast'], accuracy: 50 });
    await logAttempt(db, e);
    const { rows } = await db.query<Record<string, unknown>>(`select * from attempts where session_id = $1`, [e.sessionId]);
    expect(rows[0]).toMatchObject({
      item_kind: 'question', item_id: q1, phase: 'understand', outcome: 'wrong', response_time_ms: 1200,
      voice: 'tele', assisted: true, cause_tags: ['too_fast'],
    });
    expect(Number(rows[0].speed)).toBe(1);
    expect(Number(rows[0].accuracy)).toBe(50);
  });

  it('records replays, slow and reveal on the attempt', async () => {
    const e = ev({ replays: 2, usedSlow: true, revealed: true, assisted: true });
    await logAttempt(db, e);
    const { rows } = await db.query<Record<string, unknown>>(`select replays, used_slow, revealed from attempts where session_id = $1`, [e.sessionId]);
    expect(rows[0]).toEqual({ replays: 2, used_slow: true, revealed: true });
  });

  it('rejects tags outside the closed list, and other bad values', () => {
    expect(validateAttempt(ev({ causeTags: ['lazy' as never] }))).toMatch(/unknown cause tag/);
    expect(validateAttempt(ev({ phase: 'nope' as never }))).toMatch(/phase/);
    expect(validateAttempt(ev({ sessionId: 'x' }))).toMatch(/uuid/);
    expect(validateAttempt(ev())).toBeNull();
  });

  it('updates mastery across sessions, ignoring assisted attempts', async () => {
    const q = (await db.query<{ id: string }>(`select id from questions where position = 2`)).rows[0].id;
    const s1 = randomUUID();
    const s2 = randomUUID();
    await logAttempt(db, ev({ itemId: q, sessionId: s1, assisted: true }));
    await logAttempt(db, ev({ itemId: q, sessionId: s1 }));
    await logAttempt(db, ev({ itemId: q, sessionId: s1 }));
    const third = await logAttempt(db, ev({ itemId: q, sessionId: s1 }));
    expect(third.mastered).toBe(false);
    expect(third.mastery).toMatchObject({ qualifyingSuccesses: 3, distinctSessions: 1 });
    const fourth = await logAttempt(db, ev({ itemId: q, sessionId: s2 }));
    expect(fourth.mastered).toBe(true);
  });
});

describe('coin ledger', () => {
  it('a low-scoring attempt still earns coins', async () => {
    const before = await balance(db, profileId);
    const r = await logAttempt(db, ev({ outcome: 'wrong', accuracy: 10 }));
    expect(r.coinsAwarded).toBeGreaterThan(0);
    expect(await balance(db, profileId)).toBe(before + r.coinsAwarded);
  });

  it('asking for help earns coins and takes none away', async () => {
    const before = await balance(db, profileId);
    await logAttempt(db, ev({ outcome: 'assisted', assisted: true }));
    expect(await balance(db, profileId)).toBeGreaterThan(before);
  });

  it('is append-only: entries cannot be edited', async () => {
    await expect(db.query(`update coin_ledger set amount = 999 where profile_id = $1`, [profileId])).rejects.toThrow(/append-only/);
  });

  it('only spending can subtract', async () => {
    await expect(awardCoins(db, profileId, -5, 'attempt')).rejects.toThrow();
    await expect(awardCoins(db, profileId, 0, 'attempt')).rejects.toThrow();
  });
});
