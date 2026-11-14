import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { insertTestCourse, newTestDb } from '../db/test-db';
import { saveBaseline } from '../diagnostics/baseline';
import { logAttempt } from '../events/attempts';
import { createProfile, nicknameOptions } from '../profile/profile';
import { canDoRow, loadCanDo, summarise, ticksFor, type QuestionFacts } from './can-do';

const none: QuestionFacts = { understood: false, understandStarted: false, wroteConfirmed: false, wroteStarted: false, memorised: false, memoriseStarted: false, fast: false, fastStarted: false };
const q = { id: 'a', position: 1, english: 'Where do you live?' };

describe('can-do ticks', () => {
  it('starts every tick at Not yet', () => {
    expect(ticksFor(none)).toEqual({ understand: 'not-yet', write: 'not-yet', memorise: 'not-yet', automate: 'not-yet' });
  });

  it('is Getting there when a step has started and Got it when it is done', () => {
    const t = ticksFor({ ...none, understandStarted: true, wroteConfirmed: true, wroteStarted: true, memoriseStarted: true });
    expect(t).toEqual({ understand: 'getting-there', write: 'got-it', memorise: 'getting-there', automate: 'not-yet' });
  });

  it('prefers Got it over Getting there', () => {
    expect(ticksFor({ ...none, understood: true, understandStarted: true }).understand).toBe('got-it');
  });

  it('is complete only when all four ticks are Got it, with no next step', () => {
    const all = canDoRow(q, { ...none, understood: true, wroteConfirmed: true, memorised: true, fast: true });
    expect(all).toMatchObject({ complete: true, nextStep: null });
    expect(canDoRow(q, { ...none, understood: true, wroteConfirmed: true, memorised: true })).toMatchObject({ complete: false, nextStep: 'automate' });
  });

  it('points at the first unfinished step in the order Understand, Write, Memorise, Fast', () => {
    expect(canDoRow(q, none).nextStep).toBe('understand');
    expect(canDoRow(q, { ...none, understood: true }).nextStep).toBe('write');
    expect(canDoRow(q, { ...none, understood: true, wroteConfirmed: true }).nextStep).toBe('memorise');
  });

  it('counts questions that are ready, as whole numbers', () => {
    const done = canDoRow(q, { ...none, understood: true, wroteConfirmed: true, memorised: true, fast: true });
    const s = summarise([done, canDoRow(q, none), done]);
    expect(s).toMatchObject({ ready: 2, total: 3 });
  });
});

describe('loadCanDo from the database', () => {
  let db: Awaited<ReturnType<typeof newTestDb>>;
  let profileId: string;
  let courseId: string;
  let qids: string[];
  beforeAll(async () => {
    db = await newTestDb();
    ({ courseId, questionIds: qids } = await insertTestCourse(db));
    const p = await createProfile(db, { courseId, nickname: nicknameOptions(1)[0], interests: [] });
    if (!p.ok) throw new Error('profile');
    profileId = p.profile.id;
  });
  afterAll(() => db.close());

  const attempt = (itemId: string, outcome: 'correct' | 'wrong', sessionId: string) =>
    logAttempt(db, { profileId, itemKind: 'question', itemId, phase: 'understand', outcome, assisted: false, sessionId });

  it('starts with every tick at Not yet, one row per core question', async () => {
    const c = await loadCanDo(db, profileId, courseId);
    expect(c.total).toBe(5);
    expect(c.ready).toBe(0);
    expect(c.rows.every((r) => Object.values(r.ticks).every((t) => t === 'not-yet'))).toBe(true);
    expect(c.rows[0].english.length).toBeGreaterThan(0);
  });

  it('shows Getting there after a success and Got it after three, in one session, and a miss never lowers it', async () => {
    const s = randomUUID();
    await attempt(qids[0], 'correct', s);
    expect((await loadCanDo(db, profileId, courseId)).rows[0].ticks.understand).toBe('getting-there');
    await attempt(qids[0], 'wrong', s);
    expect((await loadCanDo(db, profileId, courseId)).rows[0].ticks.understand).toBe('getting-there');
    await attempt(qids[0], 'correct', s);
    await attempt(qids[0], 'correct', s);
    expect((await loadCanDo(db, profileId, courseId)).rows[0].ticks.understand).toBe('got-it');
  });

  it('counts a question proved in the quick check as Got it for Understand', async () => {
    await saveBaseline(db, { profileId, courseId, questionId: qids[1], stage: 'pre', correct: true });
    expect((await loadCanDo(db, profileId, courseId)).rows[1].ticks.understand).toBe('got-it');
  });

  it('shows Write as Getting there for an unconfirmed answer and Got it once confirmed', async () => {
    await db.query(`insert into answers (profile_id, question_id, text, value) values ($1,$2,'x',1)`, [profileId, qids[2]]);
    expect((await loadCanDo(db, profileId, courseId)).rows[2].ticks.write).toBe('getting-there');
    await db.query(`update answers set confirmed_at = now() where profile_id = $1 and question_id = $2`, [profileId, qids[2]]);
    expect((await loadCanDo(db, profileId, courseId)).rows[2].ticks.write).toBe('got-it');
  });
});
