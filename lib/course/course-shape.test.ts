import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { newTestDb } from '../db/test-db';
import { phaseStates } from '../phases/gate';
import { readinessPercent, nextPhase } from '../planner/readiness';
import { loadProgress, loadQuestions } from '../progress/progress';
import { stageOf } from '../overview/overview';
import { twoBuilderCourse } from './fixtures';
import { validateCourse } from './schema';
import { SEED_COURSE } from './seed';
import { seedCourse } from './seed-db';

const problems = (c: unknown) => { const r = validateCourse(c); return r.ok ? [] : r.problems; };

describe('course shape validation', () => {
  it('accepts two builders with four core questions and one extension question', () => {
    expect(problems(twoBuilderCourse())).toEqual([]);
  });

  it('still accepts the original one-builder, five-question course', () => {
    expect(validateCourse(SEED_COURSE).ok).toBe(true);
  });

  it('needs four or five core questions, and extension questions are not counted', () => {
    const three = twoBuilderCourse();
    three.questions[3].extension = true; // now 3 core + 2 extension
    expect(problems(three).join()).toMatch(/4 or 5 core questions, found 3/);
    const six = twoBuilderCourse();
    six.questions.push({ ...six.questions[0], position: 6, extension: false });
    six.questions.push({ ...six.questions[0], position: 7, extension: false });
    expect(problems(six).join()).toMatch(/4 or 5 core questions, found 6/);
  });

  it('allows at most one recycled core question, and no two questions at one position', () => {
    const two = twoBuilderCourse();
    two.questions[0].recycled = true;
    two.questions[1].recycled = true;
    expect(problems(two).join()).toMatch(/at most one core question/);
    const dup = twoBuilderCourse();
    dup.questions[1].position = dup.questions[0].position;
    expect(problems(dup).join()).toMatch(/share a position/);
  });

  it('rejects a chunk with an empty builder name', () => {
    const c = twoBuilderCourse();
    c.chunks[0].builder = '  ';
    expect(problems(c).join()).toMatch(/chunk 1 has an empty builder name/);
  });
});

describe('a two-builder course in the database', () => {
  let db: Awaited<ReturnType<typeof newTestDb>>;
  let courseId = '';
  beforeAll(async () => {
    db = await newTestDb();
    courseId = (await seedCourse(db, twoBuilderCourse())).courseId;
  });
  afterAll(() => db.close());

  it('stores the builder of each chunk and which question is an extension, and re-seeding changes nothing', async () => {
    const builders = (await db.query<{ builder: string; n: string }>('select builder, count(*) as n from chunks where course_id = $1 group by builder order by builder', [courseId])).rows;
    expect(builders.map((b) => b.builder)).toEqual(['Clothes and plans', 'Films and free time']);
    const ext = (await db.query<{ position: number }>('select position from questions where course_id = $1 and extension', [courseId])).rows;
    expect(ext.map((r) => r.position)).toEqual([5]);
    await seedCourse(db, twoBuilderCourse());
    expect((await db.query('select 1 from questions where course_id = $1', [courseId])).rows).toHaveLength(5);
  });

  it('counts only the core questions toward unlocking, and the extension question does not gate anything', async () => {
    const profile = (await db.query<{ id: string }>(`insert into profiles (course_id, nickname, recovery_code_hash) values ($1, 'Otter', 'h1') returning id`, [courseId])).rows[0].id;
    const questions = await loadQuestions(db, courseId);
    expect(questions.map((q) => q.extension)).toEqual([false, false, false, false, true]);
    const confirm = (qid: string) => db.query(`insert into answers (profile_id, question_id, text, value, confirmed_at) values ($1,$2,'Me gusta.',1, now())`, [profile, qid]);

    // Three core answers and the extension one: not yet written, because the extension one does not count.
    for (const q of [...questions.slice(0, 3), questions[4]]) await confirm(q.id);
    let p = await loadProgress(db, profile);
    expect(p.total).toBe(4);
    expect(p.answersConfirmed).toBe(3);
    expect(phaseStates(p).write.done).toBe(false);

    // The fourth core answer completes the writing step.
    await confirm(questions[3].id);
    p = await loadProgress(db, profile);
    expect(p.answersConfirmed).toBe(4);
    expect(phaseStates(p).write.done).toBe(true);
  });

  it('names four, not five, in what is missing and measures readiness out of four', () => {
    const states = phaseStates({ answersConfirmed: 0, questionsMastered: 0, answersMemorised: 0, total: 4 });
    expect(states.memorise.status === 'locked' && states.memorise.reason).toMatch(/all four questions/);
    expect(states.automate.status === 'locked' && states.automate.reason).toMatch(/all four answers/);
    const full = { answersConfirmed: 4, questionsMastered: 4, answersMemorised: 4, questionsAutomated: 4, total: 4 };
    expect(readinessPercent(full)).toBe(100);
    expect(readinessPercent({ ...full, questionsAutomated: 2 })).toBe(Math.round(((4 + 4 + 2) / 12) * 100));
    expect(nextPhase({ ...full, questionsAutomated: 3 })).toBe('automate');
    expect(stageOf({ ...full, testReady: false, questionsAutomated: 4 })).toBe('ready');
    expect(stageOf({ answersConfirmed: 4, questionsMastered: 4, answersMemorised: 3, questionsAutomated: 0, total: 4 })).toBe('memorise');
  });
});
