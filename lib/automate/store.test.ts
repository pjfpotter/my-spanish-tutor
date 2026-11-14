import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { balance } from '../coins/ledger';
import { insertTestCourse, newTestDb } from '../db/test-db';
import { createProfile, nicknameOptions } from '../profile/profile';
import { loadAutomateState, recordResponse, type ResponseInput } from './store';
import { DEFAULT_AUTOMATE } from './window';

let db: Awaited<ReturnType<typeof newTestDb>>;
let profileId: string;
let courseId: string;
let q: string[];
beforeAll(async () => {
  db = await newTestDb();
  const c = await insertTestCourse(db);
  courseId = c.courseId;
  q = c.questionIds;
  const p = await createProfile(db, { courseId, nickname: nicknameOptions(2)[0], interests: [] });
  if (!p.ok) throw new Error('profile');
  profileId = p.profile.id;
});
afterAll(() => db.close());

const sessions = [randomUUID(), randomUUID(), randomUUID()];
const say = (itemId: string, over: Partial<ResponseInput> = {}) =>
  recordResponse(db, { profileId, courseId, itemId, sessionId: sessions[0], blank: false, accuracy: 95, responseTimeMs: 2300, speed: 1, repeats: 0, assisted: false, ...over });

describe('automate store (tasks 9.2 to 9.5)', () => {
  it('stores the response time with the attempt (9.2)', async () => {
    const r = await say(q[0], { responseTimeMs: 2300 });
    expect(r.ok).toBe(true);
    const { rows } = await db.query<{ response_time_ms: number; outcome: string; phase: string }>(`select response_time_ms, outcome, phase from attempts where profile_id = $1 and phase = 'automate'`, [profileId]);
    expect(rows).toEqual([{ response_time_ms: 2300, outcome: 'correct', phase: 'automate' }]);
  });

  it('records a blank as a blank, never as a wrong answer, with no accuracy or time (9.3)', async () => {
    await say(q[1], { blank: true, accuracy: null, responseTimeMs: null });
    const { rows } = await db.query<{ outcome: string; accuracy: string | null; response_time_ms: number | null }>(
      `select outcome, accuracy, response_time_ms from attempts where profile_id = $1 and item_id = $2 and phase = 'automate'`, [profileId, q[1]]);
    expect(rows).toEqual([{ outcome: 'blank', accuracy: null, response_time_ms: null }]);
  });

  it('a blank still earns the effort coin', async () => {
    const before = await balance(db, profileId);
    await say(q[1], { blank: true, accuracy: null, responseTimeMs: null });
    expect(await balance(db, profileId)).toBeGreaterThan(before);
  });

  it('rewards asking for the question again, and stores how many times (9.3)', async () => {
    const before = await balance(db, profileId);
    const plain = await say(q[2]);
    const mid = await balance(db, profileId);
    const asked = await say(q[2], { repeats: 1 });
    const after = await balance(db, profileId);
    if (!plain.ok || !asked.ok) throw new Error('save');
    expect(mid - before).toBe(plain.coinsAwarded);
    expect(after - mid).toBe(asked.coinsAwarded + 1); // one extra coin for the technique
    const { rows } = await db.query<{ replays: number }>(`select replays from attempts where profile_id = $1 and item_id = $2 and phase = 'automate' order by created_at desc, id desc limit 1`, [profileId, q[2]]);
    expect(rows[0].replays).toBe(1);
  });

  it('rejects bad numbers and questions from another course', async () => {
    expect((await say(q[0], { accuracy: 120 })).ok).toBe(false);
    expect((await say(q[0], { responseTimeMs: -5 })).ok).toBe(false);
    expect((await say(q[0], { repeats: 9 })).ok).toBe(false);
    expect((await say(randomUUID())).ok).toBe(false);
  });

  it('attempts made with the text showing do not count toward window, rank or readiness', async () => {
    const other = await createProfile(db, { courseId, nickname: nicknameOptions(3)[0], interests: [] });
    if (!other.ok) throw new Error('profile');
    for (let i = 0; i < 6; i++) {
      await recordResponse(db, { profileId: other.profile.id, courseId, itemId: q[0], sessionId: sessions[0], blank: false, accuracy: 100, responseTimeMs: 500, speed: 1, repeats: 0, assisted: true });
    }
    const state = await loadAutomateState(db, other.profile.id, q);
    expect(state.rank.rank).toBeNull();
    expect(state.windowMs).toBe(DEFAULT_AUTOMATE.startMs);
    expect(state.history).toEqual([]);
  });

  it('is test-ready once every question meets the target, even in one session (9.4)', async () => {
    const p = await createProfile(db, { courseId, nickname: nicknameOptions(4)[0], interests: [] });
    if (!p.ok) throw new Error('profile');
    const go = (itemId: string, sessionId: string, ms = 2500) =>
      recordResponse(db, { profileId: p.profile.id, courseId, itemId, sessionId, blank: false, accuracy: 90, responseTimeMs: ms, speed: 1, repeats: 0, assisted: false });
    for (const id of q.slice(1)) await go(id, sessions[0]);
    expect((await loadAutomateState(db, p.profile.id, q)).ready).toBe(false); // one question has no record yet
    await go(q[0], sessions[0], 9000); // right, but too slow
    expect((await loadAutomateState(db, p.profile.id, q)).ready).toBe(false);
    await go(q[0], sessions[0]);
    const state = await loadAutomateState(db, p.profile.id, q);
    expect(state.ready).toBe(true); // one sitting is enough
    expect(state.sessionsMet[q[0]]).toBe(1);
  });

  it('gives a rank and the student\'s own session history (9.5)', async () => {
    const p = await createProfile(db, { courseId, nickname: nicknameOptions(5)[0], interests: [] });
    if (!p.ok) throw new Error('profile');
    const go = (sessionId: string, ms: number) =>
      recordResponse(db, { profileId: p.profile.id, courseId, itemId: q[0], sessionId, blank: false, accuracy: 90, responseTimeMs: ms, speed: 1, repeats: 0, assisted: false });
    for (let i = 0; i < 3; i++) await go(sessions[0], 6000);
    for (let i = 0; i < 3; i++) await go(sessions[1], 2000);
    const state = await loadAutomateState(db, p.profile.id, q);
    expect(state.history).toEqual([{ averageMs: 6000, answers: 3 }, { averageMs: 2000, answers: 3 }]);
    expect(state.rank.rank).toBe('Pájaro'); // the average of all six is 4000 ms, under 4200
  });
});
