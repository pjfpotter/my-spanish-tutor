import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { insertTestCourse, newTestDb } from '../db/test-db';
import { findCourseByCode, normaliseClassCode } from '../course/join';
import { createProfile, nicknameOptions } from '../profile/profile';
import { deleteProfile } from '../profile/delete';
import { logAttempt } from '../events/attempts';
import { awardCoins } from '../coins/ledger';
import { fleschKincaidGrade } from './readability';
import { NOTICE_TEXT, PRIVACY_NOTICE } from './notice';

let db: Awaited<ReturnType<typeof newTestDb>>;
let courseId: string;
let qids: string[];
beforeAll(async () => {
  db = await newTestDb();
  ({ courseId, questionIds: qids } = await insertTestCourse(db, 'TELE8'));
});
afterAll(() => db.close());

describe('class codes (task 3.3)', () => {
  it('finds the course for a valid code, in any case and with stray spaces or dashes', async () => {
    for (const typed of ['TELE8', 'tele8', ' te-le 8 ']) {
      expect(await findCourseByCode(db, typed)).toEqual({ id: courseId, title: 'Test', testDate: '2026-12-01' });
    }
  });
  it('says nothing found for an unknown or malformed code', async () => {
    for (const typed of ['NOPE99', '', 'ab', 'WAYTOOLONGCODE', '<script>']) expect(await findCourseByCode(db, typed)).toBeNull();
    expect(normaliseClassCode('x')).toBeNull();
  });
  it('a repeat lookup creates nothing', async () => {
    const before = (await db.query<{ n: string }>('select count(*) n from profiles')).rows[0].n;
    await findCourseByCode(db, 'TELE8');
    await findCourseByCode(db, 'TELE8');
    expect((await db.query<{ n: string }>('select count(*) n from profiles')).rows[0].n).toBe(before);
  });
});

describe('delete everything (task 3.5)', () => {
  it('removes every row for the profile, in every table that has a profile_id', async () => {
    const made = await createProfile(db, { courseId, nickname: nicknameOptions(1)[0], interests: ['music'] });
    if (!made.ok) throw new Error('profile');
    const id = made.profile.id;
    await logAttempt(db, { profileId: id, itemKind: 'question', itemId: qids[0], phase: 'understand', outcome: 'correct', assisted: false, sessionId: crypto.randomUUID() });
    await awardCoins(db, id, 5, 'attempt');
    await db.query(`insert into cost_log (service, tier, units, estimated_cost_gbp, profile_id) values ('x', 'y', 1, 0.01, $1)`, [id]);
    await db.query(`insert into clip_failures (slot, profile_id) values ('s', $1)`, [id]);

    expect(await deleteProfile(db, id)).toBe(true);

    // Look at every table with a profile_id column, so a table added later is covered too.
    const { rows: tables } = await db.query<{ table_name: string }>(
      `select table_name from information_schema.columns where column_name = 'profile_id' and table_schema = 'public'`,
    );
    expect(tables.length).toBeGreaterThan(8);
    for (const { table_name } of tables) {
      const left = await db.query<{ n: string }>(`select count(*) n from ${table_name} where profile_id = $1`, [id]);
      expect(Number(left.rows[0].n), table_name).toBe(0);
    }
    expect((await db.query('select 1 from profiles where id = $1', [id])).rows).toHaveLength(0);
    // The spend rows stay (budgets need them) but no longer point at anyone.
    expect(Number((await db.query<{ n: string }>(`select count(*) n from cost_log where service = 'x'`)).rows[0].n)).toBe(1);
  });
  it('does not touch other students, and a second delete finds nothing', async () => {
    const a = await createProfile(db, { courseId, nickname: nicknameOptions(1)[0], interests: [] });
    const b = await createProfile(db, { courseId, nickname: nicknameOptions(1)[0], interests: [] });
    if (!a.ok || !b.ok) throw new Error('profile');
    expect(await deleteProfile(db, a.profile.id)).toBe(true);
    expect(await deleteProfile(db, a.profile.id)).toBe(false);
    expect(await deleteProfile(db, 'not-an-id')).toBe(false);
    expect((await db.query('select 1 from profiles where id = $1', [b.profile.id])).rows).toHaveLength(1);
  });
});

describe('privacy notice (task 3.6)', () => {
  it('is readable by a 13-year-old (Flesch-Kincaid grade 7 or lower) and short', () => {
    expect(fleschKincaidGrade(NOTICE_TEXT)).toBeLessThanOrEqual(7);
    expect(NOTICE_TEXT.split(/\s+/).length).toBeLessThan(300);
  });
  it('says what is stored, what is not and how to delete', () => {
    const headings = PRIVACY_NOTICE.map((s) => s.heading.toLowerCase());
    expect(headings).toEqual(expect.arrayContaining(['what we keep', 'what we never keep', 'how to delete everything']));
    expect(NOTICE_TEXT).toMatch(/recording of your voice/i);
  });
  it('has a data-protection impact assessment of about one page', () => {
    const dpia = readFileSync(new URL('../../docs/dpia.md', import.meta.url), 'utf8');
    for (const part of ['Purpose', 'Data we hold', 'Risks', 'Retention', 'Rights']) expect(dpia).toContain(part);
    expect(dpia.split(/\s+/).length).toBeLessThan(900);
  });
});
