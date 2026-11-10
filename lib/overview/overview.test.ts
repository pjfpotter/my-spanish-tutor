import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { insertTestCourse, newTestDb } from '../db/test-db';
import { logAttempt } from '../events/attempts';
import { createProfile, nicknameOptions } from '../profile/profile';
import { findCourseByOwnerToken, hashOwnerToken, loadOverview, stageOf } from './overview';
import { sampleCost, sampleOverview } from './sample';

let db: Awaited<ReturnType<typeof newTestDb>>;
let courseId: string;
let qids: string[];
const TOKEN = 'owner-token-abcdefghijklmnop';
beforeAll(async () => {
  db = await newTestDb();
  ({ courseId, questionIds: qids } = await insertTestCourse(db, 'OVER1'));
  await db.query('update courses set owner_token_hash = $1 where id = $2', [hashOwnerToken(TOKEN), courseId]);
});
afterAll(() => db.close());

const student = async () => {
  const p = await createProfile(db, { courseId, nickname: nicknameOptions(1)[0], interests: ['music'] });
  if (!p.ok) throw new Error('profile');
  return p.profile;
};
const fail = (profileId: string, itemId: string, causeTags: never[] | string[] = []) =>
  logAttempt(db, { profileId, itemKind: 'question', itemId, phase: 'understand', outcome: 'wrong', assisted: false, sessionId: crypto.randomUUID(), causeTags: causeTags as never });

describe('owner link (task 15.1)', () => {
  it('opens with the owner token, and not with the student class code or anything else', async () => {
    expect(await findCourseByOwnerToken(db, TOKEN)).toEqual({ id: courseId });
    for (const wrong of ['OVER1', 'over1', '', 'short', 'owner-token-abcdefghijklmnoq', '../etc/passwd']) expect(await findCourseByOwnerToken(db, wrong), wrong).toBeNull();
  });
  it('is never linked from the student app', () => {
    const hits: string[] = [];
    const walk = (dir: string) => {
      for (const f of readdirSync(dir)) {
        const full = path.join(dir, f);
        if (statSync(full).isDirectory()) { if (full !== path.join(process.cwd(), 'app', 'owner')) walk(full); continue; }
        if (/\.(ts|tsx)$/.test(f) && /['"`]\/owner/.test(readFileSync(full, 'utf8'))) hits.push(full);
      }
    };
    walk(path.join(process.cwd(), 'app'));
    expect(hits).toEqual([]);
  });
});

describe('class overview (task 15.1)', () => {
  it('has zeroes and no average for an empty class', async () => {
    const o = await loadOverview(db, courseId);
    expect(o).toMatchObject({ joined: 0, started: 0, averageReadiness: null, students: [] });
  });

  it('counts joined and started students, students per step, and the average readiness', async () => {
    const a = await student();
    const b = await student();
    await student(); // never starts
    await fail(a.id, qids[0]);
    await db.query(`insert into answers (profile_id, question_id, text, value) values ($1, $2, 'x', 1)`, [b.id, qids[0]]);
    const o = await loadOverview(db, courseId);
    expect(o.joined).toBe(3);
    expect(o.started).toBe(2);
    expect(o.stages).toEqual({ write: 3, understand: 0, memorise: 0, automate: 0, ready: 0 });
    expect(o.averageReadiness).toBe(0);
    expect(Object.keys(o.students[0]).sort()).toEqual(['nickname', 'readiness', 'stage']); // nickname and progress only
  });

  it('puts the most-missed question and chunk at the top, with the commonest causes', async () => {
    const a = await student();
    for (let i = 0; i < 3; i++) await fail(a.id, qids[2], ['too_fast']);
    await fail(a.id, qids[1], ['word_not_known']);
    const chunk = async (spanish: string, n: number) => {
      const id = (await db.query<{ id: string }>(`insert into chunks (course_id, spanish, english_gloss, category, feature_tags, recycled) values ($1, $2, 'g', 'c', '{}', false) returning id`, [courseId, spanish])).rows[0].id;
      for (let i = 0; i < n; i++) await db.query(`insert into chunk_events (profile_id, chunk_id, session_id, missed) values ($1, $2, $3, true)`, [a.id, id, crypto.randomUUID()]);
    };
    await chunk('a veces', 1);
    await chunk('voy a llevar', 4);
    const o = await loadOverview(db, courseId);
    expect(o.questionHotspots[0]).toEqual({ label: 'Pregunta 3', misses: 3 });
    expect(o.chunkHotspots[0]).toEqual({ label: 'voy a llevar', misses: 4 });
    expect(o.causes[0]).toEqual({ tag: 'too_fast', count: 3 });
    expect(o.causes[1]).toEqual({ tag: 'word_not_known', count: 1 });
  });

  it('places a student at the first step of the path they have not finished', () => {
    const base = { answersConfirmed: 0, questionsMastered: 0, answersMemorised: 0, questionsAutomated: 0 };
    expect(stageOf(base)).toBe('write');
    expect(stageOf({ ...base, answersConfirmed: 5 })).toBe('understand');
    expect(stageOf({ ...base, answersConfirmed: 5, questionsMastered: 5 })).toBe('memorise');
    expect(stageOf({ ...base, answersConfirmed: 5, questionsMastered: 5, answersMemorised: 5 })).toBe('automate');
    expect(stageOf({ ...base, answersConfirmed: 5, questionsMastered: 5, answersMemorised: 5, questionsAutomated: 5 })).toBe('ready');
  });
});

describe('demonstration data (task 15.2)', () => {
  it('is built in memory: loading it writes nothing and real students stay apart', async () => {
    const before = (await db.query<{ n: string }>('select count(*) n from profiles')).rows[0].n;
    const sample = sampleOverview();
    sampleCost();
    expect((await db.query<{ n: string }>('select count(*) n from profiles')).rows[0].n).toBe(before);
    const real = await loadOverview(db, courseId);
    const sampleNames = new Set(sample.students.map((s) => s.nickname));
    expect(real.students.some((s) => sampleNames.has(s.nickname) && real.title.includes('sample'))).toBe(false);
    expect(sample.title).toMatch(/sample/i);
    expect(sample.students.length).toBe(sample.joined);
  });
});
