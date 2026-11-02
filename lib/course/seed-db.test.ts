import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { newTestDb } from '../db/test-db';
import { SEED_COURSE } from './seed';
import { seedCourse } from './seed-db';

let db: Awaited<ReturnType<typeof newTestDb>>;
beforeAll(async () => void (db = await newTestDb()));
afterAll(() => db.close());

const count = async (table: string) => Number((await db.query<{ n: string }>(`select count(*) as n from ${table}`)).rows[0].n);

describe('seedCourse', () => {
  it('creates the course, five questions and every chunk', async () => {
    const r = await seedCourse(db, SEED_COURSE);
    expect(r.created).toBe(true);
    expect(r.ownerToken).toBeTruthy();
    expect(await count('courses')).toBe(1);
    expect(await count('questions')).toBe(5);
    expect(await count('chunks')).toBe(SEED_COURSE.chunks.length);
  });

  it('re-running does not duplicate anything and keeps the same ids', async () => {
    const before = (await db.query<{ id: string }>('select id from questions order by position')).rows.map((r) => r.id);
    const r = await seedCourse(db, SEED_COURSE);
    expect(r.created).toBe(false);
    expect(r.ownerToken).toBeNull();
    expect(await count('courses')).toBe(1);
    expect(await count('questions')).toBe(5);
    expect(await count('chunks')).toBe(SEED_COURSE.chunks.length);
    expect((await db.query<{ id: string }>('select id from questions order by position')).rows.map((r) => r.id)).toEqual(before);
  });

  it('picks up an edited question in place', async () => {
    const edited = structuredClone(SEED_COURSE);
    edited.questions[0].english = 'What films do you like?';
    await seedCourse(db, edited);
    const { rows } = await db.query<{ english_subtitle: string }>('select english_subtitle from questions where position = 1');
    expect(rows[0].english_subtitle).toBe('What films do you like?');
    expect(await count('questions')).toBe(5);
  });

  it('refuses an invalid course and writes nothing new', async () => {
    const bad = { ...structuredClone(SEED_COURSE), classCode: 'BAD1' };
    bad.questions.pop();
    await expect(seedCourse(db, bad)).rejects.toThrow(/not valid/);
    expect(await count('courses')).toBe(1);
  });
});
