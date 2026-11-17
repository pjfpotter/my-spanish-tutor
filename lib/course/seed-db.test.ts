import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { newTestDb } from '../db/test-db';
import { FOOD, FOOD_SHEET } from '../sheets/samples/food';
import { ALL_MATCHED_COURSE, SEED_COURSE } from './seed';
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

  it('stores the model answers and updates them in place', async () => {
    const stored = async () => (await db.query<{ model_answers: { questionPosition: number; rung: string; text: string }[] }>('select model_answers from courses')).rows[0].model_answers;
    expect(await stored()).toEqual(SEED_COURSE.modelAnswers);
    const edited = structuredClone(SEED_COURSE);
    edited.modelAnswers[0].text = 'Me gustan las películas de miedo.';
    await seedCourse(db, edited);
    const after = await stored();
    expect(after).toHaveLength(SEED_COURSE.modelAnswers.length);
    expect(after[0].text).toBe('Me gustan las películas de miedo.');
    await seedCourse(db, SEED_COURSE); // put it back for the tests below
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

describe('seedCourse and sentence builders', () => {
  const food = { key: 'food', name: 'Food', sheet: FOOD_SHEET, interpretation: FOOD, calibration: SEED_COURSE.calibration };
  const withFood = { ...SEED_COURSE, classCode: 'BLDS1', builders: [...SEED_COURSE.builders, food],
    questions: SEED_COURSE.questions.map((q) => (q.position === 1 ? { ...q, spanish: '¿Qué comes?', english: 'What do you eat?', builder: 'food' } : q)) };
  const rows = async () => (await db.query<{ key: string; position: number }>('select b.key, b.position from course_builders b join courses c on c.id = b.course_id where c.class_code = $1 order by b.position', ['BLDS1'])).rows;
  const link = async (position: number) => (await db.query<{ key: string | null; builder_question: number | null }>(
    `select b.key, q.builder_question from questions q join courses c on c.id = q.course_id left join course_builders b on b.id = q.builder_id where c.class_code = 'BLDS1' and q.position = $1`, [position])).rows[0];

  it('stores each builder and each question\'s builder and link', async () => {
    await seedCourse(db, withFood);
    expect(await rows()).toEqual([{ key: 'free-time', position: 0 }, { key: 'food', position: 1 }]);
    expect(await link(1)).toEqual({ key: 'food', builder_question: 0 });
    expect(await link(5)).toEqual({ key: 'free-time', builder_question: 0 });
    expect(await link(2)).toEqual({ key: null, builder_question: null });
  });

  it('re-running keeps the builders\' ids, and reordering them does not collide', async () => {
    const before = (await db.query<{ key: string; id: string }>('select b.key, b.id from course_builders b join courses c on c.id = b.course_id where c.class_code = $1', ['BLDS1'])).rows;
    await seedCourse(db, { ...withFood, builders: [food, SEED_COURSE.builders[0]] });
    expect(await rows()).toEqual([{ key: 'food', position: 0 }, { key: 'free-time', position: 1 }]);
    const after = (await db.query<{ key: string; id: string }>('select b.key, b.id from course_builders b join courses c on c.id = b.course_id where c.class_code = $1', ['BLDS1'])).rows;
    expect(Object.fromEntries(after.map((r) => [r.key, r.id]))).toEqual(Object.fromEntries(before.map((r) => [r.key, r.id])));
  });

  it('removing a builder from the file removes it and leaves its questions without one', async () => {
    await seedCourse(db, { ...withFood, builders: [SEED_COURSE.builders[0]], questions: SEED_COURSE.questions });
    expect(await rows()).toEqual([{ key: 'free-time', position: 0 }]);
    expect(await link(1)).toEqual({ key: null, builder_question: null });
  });

  it('refuses a course that names a builder it does not have, and writes nothing', async () => {
    await expect(seedCourse(db, { ...ALL_MATCHED_COURSE, classCode: 'BLDS2', builders: [] })).rejects.toThrow(/no sentence builder/);
    expect((await db.query('select 1 from courses where class_code = $1', ['BLDS2'])).rows).toHaveLength(0);
  });
});
