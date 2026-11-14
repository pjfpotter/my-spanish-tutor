import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { newTestDb } from '../db/test-db';
import { createCostRouter } from '../cost-router/router';
import { SERVICE_LIMITS } from '../cost-router/limits';
import { buildClips, planBuild } from '../audio/build';
import { loadCostReport } from '../cost/report';
import { checkCourseLimit, COURSE_LIMIT, CourseLimitError } from './limits';
import { clipsFor, priceCourse } from './pricing';
import { SEED_COURSE } from './seed';
import { seedCourse } from './seed-db';
import { twoBuilderCourse } from './fixtures';

/** Task 23.7: a course is priced for its new clips only; its spend is recorded against it; a teacher can load only so many a month. */
const built = (course: Parameters<typeof clipsFor>[0]) => clipsFor(course).map((c) => ({ slot: c.slot }));

describe('pricing a course before loading it', () => {
  it('prices a first course for every clip, and the same course again for nothing', () => {
    const first = priceCourse(SEED_COURSE, []);
    expect(first.toBuild).toBe(first.wanted);
    expect(first.shared).toBe(0);
    expect(first.estimateGbp).toBeGreaterThan(0);
    const again = priceCourse(SEED_COURSE, built(SEED_COURSE));
    expect(again).toMatchObject({ toBuild: 0, estimateGbp: 0, characters: 0 });
  });

  it('prices a second course that shares phrases with the first for the new clips only', () => {
    const second = structuredClone(SEED_COURSE);
    second.classCode = 'SECOND';
    // One new question and one new chunk; everything else is shared with the first course.
    second.questions[0].spanish = '¿Qué deporte te gusta practicar con tus amigos?';
    second.chunks.push({ spanish: 'me encanta jugar al fútbol', english: 'I love playing football', category: 'film opinion', featureTags: ['opinion'], recycled: false });
    const price = priceCourse(second, built(SEED_COURSE));
    expect(price.shared).toBeGreaterThan(0);
    const newTexts = new Set(price.newClips.map((c) => c.text));
    expect(newTexts).toEqual(new Set(['¿Qué deporte te gusta practicar con tus amigos?', 'me encanta jugar al fútbol']));
    // Both are priced at all three speeds for the question and two for the chunk, but only the natural ones are paid for.
    expect(price.characters).toBe('¿Qué deporte te gusta practicar con tus amigos?'.length + 'me encanta jugar al fútbol'.length);
    expect(price.estimateGbp).toBeCloseTo(price.characters * 0.00016, 6);
    expect(price.estimateGbp).toBeLessThan(priceCourse(second, []).estimateGbp / 10);
  });

  it('says when a course will also need its model answers drafted', () => {
    const bare = structuredClone(SEED_COURSE);
    bare.modelAnswers = [];
    expect(priceCourse(bare, []).needsSetUp).toBe(true);
    expect(priceCourse(SEED_COURSE, []).needsSetUp).toBe(false);
  });
});

describe('spend recorded against the course', () => {
  let db: Awaited<ReturnType<typeof newTestDb>>;
  beforeAll(async () => void (db = await newTestDb()));
  afterAll(() => db.close());

  it('a build for a course writes its cost to that course in the cost log', async () => {
    const { courseId } = await seedCourse(db, twoBuilderCourse());
    const other = await seedCourse(db, { ...twoBuilderCourse(), classCode: 'OTHER1' });
    const store = {
      spentSince: async () => 0, callsSince: async () => 0,
      log: async (e: { service: string; tier: string; units: number; estimatedCostGbp: number; courseId: string | null; profileId: string | null; outcome: string }) => void (await db.query(
        'insert into cost_log (service, tier, units, estimated_cost_gbp, course_id, profile_id, outcome) values ($1,$2,$3,$4,$5,$6,$7)',
        [e.service, e.tier, e.units, e.estimatedCostGbp, e.courseId, e.profileId, e.outcome])),
    };
    const route = createCostRouter(store as never, SERVICE_LIMITS);
    const voice = { provider: 'x', voiceId: 'v', model: 'm' };
    const specs = clipsFor(twoBuilderCourse()).filter((s) => s.kind === 'question' && s.speed === 1).slice(0, 2);
    const written: string[] = [];
    const clipStore = { read: async () => null, readMp3: async () => null, write: async (slot: string) => void written.push(slot) };
    const plan = await planBuild(specs, voice, clipStore, false);
    await buildClips(plan.toBuild, voice, {
      courseId, route, store: clipStore,
      synth: { synthesise: async (text: string) => ({ mp3: Buffer.from('x'), alignment: { characters: [...text], character_start_times_seconds: [...text].map((_, i) => i * 0.05), character_end_times_seconds: [...text].map((_, i) => i * 0.05 + 0.05) } }) },
      decoder: { decode: async () => ({ samples: new Float32Array(44100 * 20).fill(0.2), sampleRate: 44100 }) },
      stretcher: { process: async (b: Buffer) => b },
    });
    expect(written.length).toBe(2);
    expect((await loadCostReport(db, courseId)).totalGbp).toBeGreaterThan(0);
    expect((await loadCostReport(db, other.courseId)).totalGbp).toBe(0);
  });
});

describe('a monthly limit on new courses per teacher', () => {
  let db: Awaited<ReturnType<typeof newTestDb>>;
  beforeAll(async () => void (db = await newTestDb()));
  afterAll(() => db.close());
  const course = (code: string, teacher?: string) => ({ ...twoBuilderCourse(), classCode: code, ...(teacher ? { teacher } : {}) });

  it('lets a teacher load up to the limit, then says why not and when they can again', async () => {
    for (let i = 0; i < COURSE_LIMIT.perTeacher; i++) await seedCourse(db, course(`TCHA${i}`, 'teacher-a'));
    const refused = seedCourse(db, course('TCHA9', 'teacher-a'));
    await expect(refused).rejects.toBeInstanceOf(CourseLimitError);
    await expect(refused).rejects.toThrow(/limit \(3\).*costs real money.*another on \d{4}-\d{2}-\d{2}/);
    const check = await checkCourseLimit(db, 'teacher-a');
    expect(check.ok).toBe(false);
  });

  it('does not count a re-run of a course that already exists, other teachers, or the developer\'s own courses', async () => {
    await expect(seedCourse(db, course('TCHA0', 'teacher-a'))).resolves.toMatchObject({ created: false });
    await expect(seedCourse(db, course('TCHB0', 'teacher-b'))).resolves.toMatchObject({ created: true });
    for (let i = 0; i < 5; i++) await expect(seedCourse(db, course(`DEV${i}`))).resolves.toMatchObject({ created: true });
  });

  it('lets a teacher load again once the month has passed', async () => {
    const later = new Date(Date.now() + (COURSE_LIMIT.periodDays + 1) * 86_400_000);
    expect(await checkCourseLimit(db, 'teacher-a', later)).toMatchObject({ ok: true });
  });
});
