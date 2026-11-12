import { describe, expect, it, vi } from 'vitest';
import { createCostRouter } from '../cost-router/router';
import type { CostEntry, CostStore } from '../cost-router/types';
import { SEED_COURSE } from '../course/seed';
import type { ModelAnswer } from '../course/schema';
import { problemWith, setUpCourse, SETUP_LIMITS, SETUP_SERVICE, type SetupRequest, type SetupResponse } from './setup';

const COURSE_ID = '22222222-2222-2222-2222-222222222222';
const course = SEED_COURSE;

function store(spent = 0, calls = 0) {
  const log: CostEntry[] = [];
  const s: CostStore = { spentSince: async () => spent, callsSince: async () => calls, log: async (e) => void log.push(e) };
  return { s, log };
}
const run = (st: CostStore, callModel: (r: SetupRequest) => Promise<{ value: SetupResponse; units: number; costGbp: number }>) =>
  setUpCourse({ route: createCostRouter(st, SETUP_LIMITS), course, courseId: COURSE_ID, estimateGbp: 0.05, callModel });
const reply = (modelAnswers: ModelAnswer[], flags: string[] = []) => ({ value: { modelAnswers, flags }, units: 900, costGbp: 0.01 });

describe('upload-time course set-up (task 7.8)', () => {
  it('keeps answers the rubric accepts, logs the cost and reports the model\'s flags', async () => {
    const { s, log } = store();
    const call = vi.fn(async () => reply(SEED_COURSE.modelAnswers, ['"siempre" does not fit "voy a llevar"']));
    const r = await run(s, call);
    expect(r.modelAnswers).toHaveLength(SEED_COURSE.modelAnswers.length);
    expect(r.flags).toEqual(['"siempre" does not fit "voy a llevar"']);
    expect(r.missing).toEqual([]);
    expect(log[0]).toMatchObject({ service: SETUP_SERVICE, tier: 'small_model', outcome: 'ok', courseId: COURSE_ID, profileId: null });
  });

  it('asks again once for a question with no acceptable answer, with the reason, and keeps the fix', async () => {
    const { s } = store();
    const bad: ModelAnswer = { questionPosition: 5, text: 'Me gusta montar en bici.' };
    const calls: SetupRequest[] = [];
    const call = vi.fn(async (req: SetupRequest) => {
      calls.push(req);
      return calls.length === 1 ? reply([...SEED_COURSE.modelAnswers.filter((a) => a.questionPosition !== 5), bad]) : reply(SEED_COURSE.modelAnswers.filter((a) => a.questionPosition === 5));
    });
    const r = await run(s, call);
    expect(call).toHaveBeenCalledTimes(2);
    expect(calls[1].retry).toEqual([{ questionPosition: 5, problem: expect.stringMatching(/no opinion with a reason/) }]);
    expect(r.modelAnswers.filter((a) => a.questionPosition === 5).length).toBeGreaterThan(0);
    expect(r.modelAnswers.some((a) => a === bad)).toBe(false);
    expect(r.missing).toEqual([]);
  });

  it('marks a question missing rather than offering a bad answer when it is still wrong after one retry', async () => {
    const bad: ModelAnswer = { questionPosition: 5, text: 'Me gusta montar en bici.' };
    const r = await run(store().s, async () => reply([...SEED_COURSE.modelAnswers.filter((a) => a.questionPosition !== 5), bad]));
    expect(r.modelAnswers).not.toContainEqual(bad);
    expect(r.missing.find((m) => m.questionPosition === 5)?.problem).toMatch(/no opinion with a reason/);
  });

  it('rejects words outside the bank and answers that are worth nothing', () => {
    expect(problemWith(course, { questionPosition: 1, text: 'Me gustan las películas de acción porque son fantásticas.' })).toMatch(/outside the sentence builder/);
    expect(problemWith(course, { questionPosition: 4, text: 'Voy a llevar una camiseta blanca.' })).toMatch(/no opinion with a reason/);
    expect(problemWith(course, { questionPosition: 4, text: 'Voy a llevar una camiseta blanca porque quiero estar guay.' })).toBeNull();
  });

  it('asks for a few answers per question and never mentions levels', async () => {
    const calls: SetupRequest[] = [];
    await run(store().s, async (req) => { calls.push(req); return reply(SEED_COURSE.modelAnswers); });
    expect(calls[0].perQuestion).toBeGreaterThanOrEqual(2);
    expect(JSON.stringify(calls[0])).not.toMatch(/rock_solid|stepping_out|showing_off|level/i);
  });

  it('uses no model when the cap is reached, and says so', async () => {
    const { s, log } = store(SETUP_LIMITS[SETUP_SERVICE].capGbp);
    const call = vi.fn();
    const r = await run(s, call as never);
    expect(call).not.toHaveBeenCalled();
    expect(r).toMatchObject({ source: 'none', reason: 'cap_reached', modelAnswers: [] });
    expect(log[0]).toMatchObject({ outcome: 'cap_reached' });
  });

  it('survives the model failing, with the course left to its hand-written answers', async () => {
    const r = await run(store().s, async () => { throw new Error('boom'); });
    expect(r).toMatchObject({ source: 'none', reason: 'failed', modelAnswers: [] });
  });
});
