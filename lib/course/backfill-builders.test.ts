import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { newTestDb } from '../db/test-db';
import { createProfile, nicknameOptions } from '../profile/profile';
import { builderFor, loadSavedAnswers, loadWritingCourse, saveSheetAnswer } from '../progress/writing-store';
import { fromSelection } from '../sheets/selection';
import { SHORT } from '../sheets/samples/free-time-selections';
import { FREE_TIME, FREE_TIME_SHEET } from '../sheets/samples/free-time';
import { backfillBuilders } from './backfill-builders';
import { SEED_COURSE } from './seed';
import { seedCourse } from './seed-db';

let db: Awaited<ReturnType<typeof newTestDb>>;
let courseId: string, profileId: string;
beforeAll(async () => {
  db = await newTestDb();
  ({ courseId } = await seedCourse(db, SEED_COURSE));
  // A student's confirmed answer, saved before the move.
  const p = await createProfile(db, { courseId, nickname: nicknameOptions(1)[0], interests: [] });
  if (!p.ok) throw new Error('profile');
  profileId = p.profile.id;
  const before = await loadWritingCourse(db, courseId);
  expect(await saveSheetAnswer(db, before, profileId, before.questions[4].id, SHORT, true)).toMatchObject({ ok: true, confirmed: true });
  // Put the course back the way it was before builders: a stored sheet and interpretation on the course, no builder rows, no links.
  await db.query('update courses set sheet = $2, interpretation = $3 where id = $1', [courseId, JSON.stringify(FREE_TIME_SHEET), JSON.stringify(FREE_TIME)]);
  await db.query('delete from course_builders where course_id = $1', [courseId]);
  await db.query('update questions set builder_id = null, builder_question = null where course_id = $1', [courseId]);
});
afterAll(() => db.close());

const links = async () => (await db.query<{ position: number; builder_id: string | null; builder_question: number | null }>(
  'select position, builder_id, builder_question from questions where course_id = $1 order by position', [courseId])).rows;

describe('backfillBuilders', () => {
  it('turns the course\'s sheet into one builder and links the question that matched it by text', async () => {
    expect(await backfillBuilders(db)).toBe(1);
    const builders = (await db.query<{ key: string; name: string; calibration: unknown }>('select key, name, calibration from course_builders where course_id = $1', [courseId])).rows;
    expect(builders).toHaveLength(1);
    expect(builders[0].key).toBe('sheet');
    expect(builders[0].calibration).toEqual(SEED_COURSE.calibration);
    const rows = await links();
    // The seeded course had one matched question (5) and four with no sentence builder; that is unchanged.
    expect(rows.map((r) => r.builder_id !== null)).toEqual([false, false, false, false, true]);
    expect(rows[4].builder_question).toBe(0);
    expect(rows.filter((r) => r.builder_id === null).every((r) => r.builder_question === null)).toBe(true);
  });

  it('leaves a saved answer valid: it still opens on the carried-over builder', async () => {
    const c = await loadWritingCourse(db, courseId);
    const saved = (await loadSavedAnswers(db, profileId)).find((a) => a.questionId === c.questions[4].id)!;
    expect(saved.confirmed).toBe(true);
    const B = builderFor(c, c.questions[4])!;
    expect(fromSelection(B, saved.selection)).not.toBeNull();
    // And it can be saved again as it stands.
    expect(await saveSheetAnswer(db, c, profileId, c.questions[4].id, saved.selection, true)).toMatchObject({ ok: true, confirmed: true });
  });

  it('does nothing the second time', async () => {
    const before = JSON.stringify(await links());
    expect(await backfillBuilders(db)).toBe(0);
    expect(JSON.stringify(await links())).toBe(before);
    expect((await db.query('select 1 from course_builders where course_id = $1', [courseId])).rows).toHaveLength(1);
  });

  it('skips a course that has no stored sheet', async () => {
    const { courseId: other } = await seedCourse(db, { ...SEED_COURSE, classCode: 'NOSHEET' });
    await db.query('delete from course_builders where course_id = $1', [other]);
    expect(await backfillBuilders(db)).toBe(0);
    expect((await db.query('select 1 from course_builders where course_id = $1', [other])).rows).toHaveLength(0);
  });
});
