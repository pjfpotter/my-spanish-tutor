import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { recordResponse } from '../automate/store';
import { insertTestCourse, newTestDb } from '../db/test-db';
import { recordRecall } from '../memorise/store';
import { createProfile, nicknameOptions } from '../profile/profile';
import { hotspotChunkIds } from './recall-store';

// Task 10.3: recall cause tags and chunk hotspots, through the real recorders.

let db: Awaited<ReturnType<typeof newTestDb>>;
let courseId: string;
let q: string[];
const chunkIds: Record<string, string> = {};
const ANSWER = 'Me gustaría ir al cine. Prefiero el sábado.';

async function newStudent(n: number, answerFor: string) {
  const p = await createProfile(db, { courseId, nickname: nicknameOptions(n)[0], interests: [] });
  if (!p.ok) throw new Error('profile');
  await db.query(`insert into answers (profile_id, question_id, text, level, confirmed_at) values ($1,$2,$3,1, now())`, [p.profile.id, q[0], answerFor]);
  return p.profile.id;
}
const tagsOf = async (profileId: string) =>
  (await db.query<{ phase: string; outcome: string; cause_tags: string[] }>('select phase, outcome, cause_tags from attempts where profile_id = $1 order by created_at, id', [profileId])).rows;

beforeAll(async () => {
  db = await newTestDb();
  const c = await insertTestCourse(db);
  courseId = c.courseId;
  q = c.questionIds;
  for (const [spanish, english] of [['Me gustaría ir', 'I would like to go'], ['al cine', 'to the cinema'], ['el sábado', 'on Saturday']]) {
    const { rows } = await db.query<{ id: string }>(`insert into chunks (course_id, spanish, english_gloss, category, feature_tags, recycled) values ($1,$2,$3,'x','{}',false) returning id`, [courseId, spanish, english]);
    chunkIds[spanish] = rows[0].id;
  }
});
afterAll(() => db.close());

// "Me gustaría ir al cine." = words 0..4, "Prefiero el sábado." = words 5..7. Word 3-4 is "al cine".
const missCine = { missedWords: [3, 4] };
const recall = (profileId: string, over: Partial<Parameters<typeof recordRecall>[1]> = {}) =>
  recordRecall(db, { profileId, courseId, itemId: q[0], sessionId: randomUUID(), accuracy: 50, level: 3, ...over });

describe('recall cause tags and hotspots (10.3)', () => {
  it('a failed untimed attempt is tagged not known well enough', async () => {
    const id = await newStudent(1, ANSWER);
    await recall(id, { ...missCine });
    expect((await tagsOf(id))[0]).toMatchObject({ outcome: 'wrong', cause_tags: ['not_known_well_enough'] });
  });

  it('the same chunk missed in three attempts becomes a hotspot, and the next miss is tagged for it', async () => {
    const id = await newStudent(2, ANSWER);
    for (let n = 0; n < 2; n++) await recall(id, { ...missCine });
    expect(await hotspotChunkIds(db, id)).toEqual(new Set());
    await recall(id, { ...missCine });
    expect(await hotspotChunkIds(db, id)).toEqual(new Set([chunkIds['al cine']]));
    const rows = await tagsOf(id);
    expect(rows.map((r) => r.cause_tags)).toEqual([['not_known_well_enough'], ['not_known_well_enough'], ['chunk_hotspot']]);
  });

  it('reading the whole script (assisted) records no chunk events and no tag', async () => {
    const id = await newStudent(3, ANSWER);
    await recall(id, { ...missCine, level: 0 });
    expect((await db.query('select 1 from chunk_events where profile_id = $1', [id])).rows).toHaveLength(0);
    expect((await tagsOf(id))[0].cause_tags).toEqual([]);
  });

  it('stress pattern: right untimed, wrong timed after feeling nervous', async () => {
    const id = await newStudent(4, ANSWER);
    await recall(id, { accuracy: 95 }); // passes untimed
    await db.query(`insert into mood_checkins (profile_id, session_id, mood) values ($1,$2,'nervous')`, [id, randomUUID()]);
    await recordResponse(db, { profileId: id, courseId, itemId: q[0], sessionId: randomUUID(), blank: false, accuracy: 30, responseTimeMs: 2000, speed: 1, repeats: 0, assisted: false });
    const rows = await tagsOf(id);
    expect(rows[1]).toMatchObject({ phase: 'automate', outcome: 'wrong', cause_tags: ['stress_related'] });
  });

  it('the same timed failure is not stress when the student felt fine', async () => {
    const id = await newStudent(5, ANSWER);
    await recall(id, { accuracy: 95 });
    await db.query(`insert into mood_checkins (profile_id, session_id, mood) values ($1,$2,'good')`, [id, randomUUID()]);
    await recordResponse(db, { profileId: id, courseId, itemId: q[0], sessionId: randomUUID(), blank: false, accuracy: 30, responseTimeMs: 2000, speed: 1, repeats: 0, assisted: false });
    expect((await tagsOf(id))[1].cause_tags).toEqual([]);
  });

  it('a blank timed answer is still a blank, and is tagged by the same rule', async () => {
    const id = await newStudent(6, ANSWER);
    await recall(id, { accuracy: 95 });
    await db.query(`insert into mood_checkins (profile_id, session_id, mood) values ($1,$2,'nervous')`, [id, randomUUID()]);
    await recordResponse(db, { profileId: id, courseId, itemId: q[0], sessionId: randomUUID(), blank: true, accuracy: null, responseTimeMs: null, speed: 1, repeats: 0, assisted: false });
    expect((await tagsOf(id))[1]).toMatchObject({ outcome: 'blank', cause_tags: ['stress_related'] });
  });
});
