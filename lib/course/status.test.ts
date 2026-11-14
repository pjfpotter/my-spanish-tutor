import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { slotFor, SPEEDS } from '../audio/manifest';
import { newTestDb } from '../db/test-db';
import type { BuiltClip } from '../tele/clips';
import { twoBuilderCourse } from './fixtures';
import { contentHash, courseSummary, markReviewed, publishCourse, shareCourse } from './status';
import { seedCourse } from './seed-db';

/** Task 23.3: status per course, publish blocked by missing items, and no new paid calls for unchanged text. */
let db: Awaited<ReturnType<typeof newTestDb>>;
let courseId = '';
const questionTexts = twoBuilderCourse().questions.map((q) => q.spanish);
const clipsFor = (texts: string[]): BuiltClip[] => texts.flatMap((text) => Object.values(SPEEDS).map((speed) => ({ slot: slotFor(text, speed), text, speed })));
const ALL = clipsFor(questionTexts);

beforeAll(async () => {
  db = await newTestDb();
  courseId = (await seedCourse(db, twoBuilderCourse())).courseId;
});
afterAll(() => db.close());

describe('course status', () => {
  it('starts as a draft or set up depending on whether it has model answers, and lists what blocks publishing', async () => {
    await db.query('update courses set model_answers = $2 where id = $1', [courseId, '[]']);
    let s = await courseSummary(db, courseId, ALL);
    expect(s.status).toBe('draft');
    expect(s.missing.join('|')).toMatch(/model answers for questions 1, 2, 3, 4/);
    expect(s.missing).toContain('a review sign-off');

    // The seed's hand-written model answers put it at "set up".
    await seedCourse(db, twoBuilderCourse());
    s = await courseSummary(db, courseId, ALL);
    expect(s.status).toBe('set_up');
  });

  it('will not sign off a draft, and publish names every missing item', async () => {
    await db.query('update courses set model_answers = $2 where id = $1', [courseId, '[]']);
    expect((await markReviewed(db, courseId, ALL)).ok).toBe(false);
    const r = await publishCourse(db, courseId, {}, clipsFor([]));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.missing.join('|')).toMatch(/model answers/);
      expect(r.missing.join('|')).toMatch(/audio for questions 1, 2, 3, 4, 5/);
      expect(r.missing).toContain('a review sign-off');
    }
    await seedCourse(db, twoBuilderCourse());
  });

  it('blocks publish until reviewed and the audio exists, then publishes and can be shared', async () => {
    const noAudio = await publishCourse(db, courseId, {}, clipsFor([]));
    expect(noAudio.ok).toBe(false);
    expect((await markReviewed(db, courseId, ALL)).ok).toBe(true);
    expect((await courseSummary(db, courseId, ALL)).status).toBe('reviewed');
    const stillNoAudio = await publishCourse(db, courseId, {}, clipsFor(questionTexts.slice(0, 2)));
    expect(stillNoAudio.ok).toBe(false);
    if (!stillNoAudio.ok) expect(stillNoAudio.missing.join('|')).toMatch(/audio for questions 3, 4, 5/);

    expect((await shareCourse(db, courseId, ALL)).ok).toBe(false); // not published yet
    expect(await publishCourse(db, courseId, {}, ALL)).toEqual({ ok: true, changed: true });
    expect((await courseSummary(db, courseId, ALL)).status).toBe('published');
    const shared = await shareCourse(db, courseId, ALL);
    expect(shared).toEqual({ ok: true, classCode: 'TWOB4' });
    expect((await courseSummary(db, courseId, ALL)).status).toBe('shared');
  });

  it('publishing unchanged text again makes no new calls', async () => {
    let setUps = 0;
    let builds = 0;
    const steps = { setUp: async () => void setUps++, buildAudio: async () => void builds++ };
    // Even with no clips listed, an unchanged published course does nothing: it is not rebuilt, not set up again.
    expect(await publishCourse(db, courseId, steps, clipsFor([]))).toEqual({ ok: true, changed: false });
    expect(await publishCourse(db, courseId, steps, ALL)).toEqual({ ok: true, changed: false });
    expect(setUps + builds).toBe(0);
    // Re-seeding the same text does not change the hash either.
    const hash = await contentHash(db, courseId);
    await seedCourse(db, twoBuilderCourse());
    expect(await contentHash(db, courseId)).toBe(hash);
    expect(await publishCourse(db, courseId, steps, ALL)).toEqual({ ok: true, changed: false });
    expect(setUps + builds).toBe(0);
  });

  it('changing a question lapses the sign-offs, and only the paid step whose output is missing runs again', async () => {
    const edited = twoBuilderCourse();
    edited.questions[0].spanish = '¿Qué películas ves cuando estás de buen humor?';
    await seedCourse(db, edited);
    let s = await courseSummary(db, courseId, ALL);
    expect(s.status).toBe('set_up'); // no longer reviewed, published or shared
    expect(s.missing.join('|')).toMatch(/new review sign-off/);
    expect(s.missing.join('|')).toMatch(/audio for question 1/);

    let setUps = 0;
    let builds = 0;
    const steps = { setUp: async () => void setUps++, buildAudio: async () => void builds++ };
    const r = await publishCourse(db, courseId, steps, ALL);
    // The audio for question 1 is missing, so the audio step is tried once. Set-up is not: the answers still exist.
    expect(builds).toBe(1);
    expect(setUps).toBe(0);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.missing.join('|')).toMatch(/new review sign-off/);

    // Sign off the new text, supply its clips, and it publishes.
    const clips = clipsFor([edited.questions[0].spanish, ...questionTexts.slice(1)]);
    expect((await markReviewed(db, courseId, clips)).ok).toBe(true);
    expect(await publishCourse(db, courseId, steps, clips)).toEqual({ ok: true, changed: true });
    expect(builds).toBe(1);
  });

  it('a course that existed before status counts as published', async () => {
    const legacy = twoBuilderCourse();
    legacy.classCode = 'OLDONE';
    const id = (await seedCourse(db, legacy)).courseId;
    await db.query('update courses set published_at = now(), shared_at = now(), reviewed_hash = null, published_hash = null where id = $1', [id]);
    expect((await courseSummary(db, id, [])).status).toBe('shared');
  });
});
