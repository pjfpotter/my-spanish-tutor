import { describe, expect, it, vi } from 'vitest';
import { createCostRouter } from '../cost-router/router';
import type { CostEntry, CostStore } from '../cost-router/types';
import { SEED_COURSE } from '../course/seed';
import { DRAFT_LIMITS, DRAFTING_SERVICE, draftOrModelAnswers } from './drafting';
import { modelAnswersFor } from './model-answers';

const PROFILE = '11111111-1111-1111-1111-111111111111';
const COURSE = '22222222-2222-2222-2222-222222222222';

/** An in-memory cost store with a spend we can set, so the cap can be simulated. */
function store(spent = 0, calls = 0) {
  const log: CostEntry[] = [];
  const s: CostStore = { spentSince: async () => spent, callsSince: async () => calls, log: async (e) => void log.push(e) };
  return { s, log };
}

type Draft = { value: { text: string }; units: number; costGbp: number };
const draftOk = () => vi.fn(async (): Promise<Draft> => ({ value: { text: 'Me gustan las películas de acción.' }, units: 120, costGbp: 0.002 }));

const run = async (st: CostStore, draft: () => Promise<Draft>, target?: 'survival') => {
  const route = createCostRouter(st, DRAFT_LIMITS);
  return draftOrModelAnswers({
    route, modelAnswers: SEED_COURSE.modelAnswers, questionPosition: 1, target, profileId: PROFILE, courseId: COURSE,
    estimateGbp: 0.01, draft,
  });
};

describe('model-answers fallback (task 7.5)', () => {
  it('uses a draft when drafting is available, and logs its cost', async () => {
    const { s, log } = store();
    const draft = draftOk();
    const r = await run(s, draft);
    expect(r.source).toBe('draft');
    expect(draft).toHaveBeenCalledOnce();
    expect(log).toMatchObject([{ service: DRAFTING_SERVICE, tier: 'small_model', outcome: 'ok', courseId: COURSE, profileId: PROFILE }]);
  });

  it('offers the course\'s model answers when the spending cap is reached, never calls the model, and logs it', async () => {
    const { s, log } = store(DRAFT_LIMITS[DRAFTING_SERVICE].capGbp); // the cap is used up
    const draft = draftOk();
    const r = await run(s, draft);
    expect(r.source).toBe('model');
    if (r.source !== 'model') return;
    expect(r.reason).toBe('cap_reached');
    expect(r.answers.length).toBeGreaterThanOrEqual(2);
    expect(r.answers.every((a) => a.questionPosition === 1)).toBe(true);
    expect(draft).not.toHaveBeenCalled(); // nothing was spent past the cap
    expect(log).toMatchObject([{ service: DRAFTING_SERVICE, outcome: 'cap_reached', estimatedCostGbp: 0 }]);
  });

  it('offers model answers when a draft fails, and logs the failure', async () => {
    const { s, log } = store();
    const r = await run(s, () => Promise.reject<Draft>(new Error('model down')));
    expect(r).toMatchObject({ source: 'model', reason: 'failed' });
    expect(log).toMatchObject([{ outcome: 'error' }]);
  });

  it('offers model answers with a friendly message when the profile is rate limited', async () => {
    const { s, log } = store(0, DRAFT_LIMITS[DRAFTING_SERVICE].rate.max); // already at the limit
    const draft = draftOk();
    const r = await run(s, draft);
    expect(r.source).toBe('model');
    if (r.source !== 'model') return;
    expect(r.reason).toBe('rate_limited');
    expect(r.message).toMatch(/slow down/i);
    expect(r.answers.length).toBeGreaterThanOrEqual(2); // not blocked while they wait
    expect(draft).not.toHaveBeenCalled();
    expect(log).toMatchObject([{ outcome: 'rate_limited' }]);
  });

  it('puts the answers nearest the student\'s target first, and the easier one first on a tie', async () => {
    const { s } = store(DRAFT_LIMITS[DRAFTING_SERVICE].capGbp);
    const r = await run(s, draftOk(), 'survival');
    if (r.source !== 'model') throw new Error('expected model answers');
    expect(r.answers[0].rung).toBe('survival');
    const high = modelAnswersFor(SEED_COURSE.modelAnswers, 2, 'detail');
    expect(high[0].rung).toBe('detail');
    // Survival (2 away) and showing off (2 away) tie for second; the lower rung goes first.
    expect(high.slice(1).map((a) => a.rung)).toEqual(['survival', 'survival', 'showing_off']);
  });
});

describe('the course\'s model answers', () => {
  it('cover every question with a survival answer to start from', () => {
    for (const q of SEED_COURSE.questions) {
      const mine = modelAnswersFor(SEED_COURSE.modelAnswers, q.position);
      expect(mine.length, `question ${q.position}`).toBeGreaterThanOrEqual(2);
      expect(mine[0].rung).toBe('survival');
    }
  });

  it('are Spanish, never English, and never mention grades', () => {
    for (const a of SEED_COURSE.modelAnswers) {
      expect(a.text).toMatch(/[a-záéíóúñ]/i);
      expect(a.text).not.toMatch(/\bgrades?\b|\bWTG\b/i);
    }
  });
});
