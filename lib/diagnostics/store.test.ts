import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { insertTestCourse, newTestDb } from '../db/test-db';
import { logAttempt, type AttemptEvent } from '../events/attempts';
import { createProfile, nicknameOptions } from '../profile/profile';
import { tagLatestAttempt } from './store';

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

const ev = (sessionId: string, outcome: AttemptEvent['outcome']): AttemptEvent => ({
  profileId, itemKind: 'question', itemId: q1, phase: 'understand', outcome, sessionId, assisted: false,
});

describe('tagLatestAttempt', () => {
  it('tags only the latest attempt at the item, once', async () => {
    const session = randomUUID();
    await logAttempt(db, ev(session, 'correct'));
    await logAttempt(db, ev(session, 'wrong'));
    expect(await tagLatestAttempt(db, profileId, q1, session, 'too_fast')).toBe(true);
    expect(await tagLatestAttempt(db, profileId, q1, session, 'too_fast')).toBe(false);
    const { rows } = await db.query<{ outcome: string; cause_tags: string[] }>(
      'select outcome, cause_tags from attempts where session_id = $1 order by created_at, id', [session],
    );
    expect(rows.map((r) => [r.outcome, r.cause_tags])).toEqual([['correct', []], ['wrong', ['too_fast']]]);
  });

  it('returns false when there is no attempt in the session', async () => {
    expect(await tagLatestAttempt(db, profileId, q1, randomUUID(), 'too_fast')).toBe(false);
  });
});
