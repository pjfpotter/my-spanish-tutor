import { describe, expect, it, vi } from 'vitest';
import { createCostRouter, RATE_LIMITED_MESSAGE } from './router';
import type { CostEntry, CostStore, ServiceLimits } from './types';

const HOUR = 3_600_000;
const limits: Record<string, ServiceLimits> = {
  drafting: { capGbp: 1, periodMs: 24 * HOUR, rate: { max: 2, windowMs: 60_000 } },
};

/** In-memory store with the same counting rules as the Postgres one. */
function memoryStore(now: () => Date) {
  const rows: (CostEntry & { at: Date })[] = [];
  const store: CostStore = {
    async spentSince(service, since) {
      return rows.filter((r) => r.service === service && r.at >= since).reduce((s, r) => s + r.estimatedCostGbp, 0);
    },
    async callsSince(profileId, service, since) {
      return rows.filter(
        (r) => r.profileId === profileId && r.service === service && r.at >= since && ['ok', 'error'].includes(r.outcome),
      ).length;
    },
    async log(entry) {
      rows.push({ ...entry, at: now() });
    },
  };
  return { store, rows };
}

function setup(start = new Date('2026-11-01T10:00:00Z')) {
  let t = start;
  const now = () => t;
  const { store, rows } = memoryStore(now);
  const route = createCostRouter(store, limits, now);
  return { route, rows, advance: (ms: number) => (t = new Date(t.getTime() + ms)) };
}

const paid = (costGbp: number) => vi.fn(async () => ({ value: 'draft', units: 120, costGbp }));
const base = { service: 'drafting', tier: 'small_model' as const, courseId: 'c1', profileId: 'p1', estimateGbp: 0.1 };

describe('cost router', () => {
  it('makes the call and logs service, size and cost against course and profile', async () => {
    const { route, rows } = setup();
    const call = paid(0.05);
    const result = await route({ ...base, call, fallback: () => 'model answer' });

    expect(result).toEqual({ status: 'ok', value: 'draft' });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      service: 'drafting', tier: 'small_model', units: 120, estimatedCostGbp: 0.05,
      courseId: 'c1', profileId: 'p1', outcome: 'ok',
    });
  });

  it('uses the fallback and does not call the service once the cap is reached', async () => {
    const { route, rows } = setup();
    await route({ ...base, profileId: 'p1', call: paid(0.95), fallback: () => 'x' });
    const call = paid(0.05);
    const result = await route({ ...base, profileId: 'p2', call, fallback: () => 'model answer' });

    expect(result).toEqual({ status: 'cap_reached', fallback: 'model answer' });
    expect(call).not.toHaveBeenCalled();
    expect(rows.at(-1)).toMatchObject({ outcome: 'cap_reached', estimatedCostGbp: 0, profileId: 'p2' });
  });

  it('allows a call that lands exactly on the cap', async () => {
    const { route } = setup();
    const result = await route({ ...base, estimateGbp: 1, call: paid(1), fallback: () => 'x' });
    expect(result.status).toBe('ok');
  });

  it('starts a fresh budget when the period rolls over', async () => {
    const { route, advance } = setup();
    await route({ ...base, estimateGbp: 1, call: paid(1), fallback: () => 'x' });
    advance(25 * HOUR);
    const result = await route({ ...base, profileId: 'p2', call: paid(0.1), fallback: () => 'x' });
    expect(result.status).toBe('ok');
  });

  it('refuses a profile over its rate limit with a friendly message, and logs it', async () => {
    const { route, rows } = setup();
    await route({ ...base, call: paid(0.01), fallback: () => 'x' });
    await route({ ...base, call: paid(0.01), fallback: () => 'x' });
    const call = paid(0.01);
    const result = await route({ ...base, call, fallback: () => 'x' });

    expect(result).toEqual({ status: 'rate_limited', message: RATE_LIMITED_MESSAGE, retryAfterMs: 60_000 });
    expect(call).not.toHaveBeenCalled();
    expect(rows.at(-1)).toMatchObject({ outcome: 'rate_limited', profileId: 'p1' });
  });

  it('lets a profile through again once the window has passed, and does not limit other profiles', async () => {
    const { route, advance } = setup();
    for (let i = 0; i < 2; i++) await route({ ...base, call: paid(0.01), fallback: () => 'x' });

    expect((await route({ ...base, profileId: 'p2', call: paid(0.01), fallback: () => 'x' })).status).toBe('ok');
    advance(61_000);
    expect((await route({ ...base, call: paid(0.01), fallback: () => 'x' })).status).toBe('ok');
  });

  it('does not count refusals towards the rate limit', async () => {
    const { route, advance } = setup();
    for (let i = 0; i < 2; i++) await route({ ...base, call: paid(0.01), fallback: () => 'x' });
    // Five refused attempts must not extend the lock-out past the original window.
    for (let i = 0; i < 5; i++) {
      expect((await route({ ...base, call: paid(0.01), fallback: () => 'x' })).status).toBe('rate_limited');
    }
    advance(61_000);
    expect((await route({ ...base, call: paid(0.01), fallback: () => 'x' })).status).toBe('ok');
  });

  it('skips the rate limit for calls with no profile, but still enforces the cap', async () => {
    const { route } = setup();
    for (let i = 0; i < 5; i++) {
      const r = await route({ ...base, profileId: null, estimateGbp: 0.1, call: paid(0.1), fallback: () => 'x' });
      expect(r.status).toBe('ok');
    }
  });

  it('falls back and logs an error with no cost when the service call throws', async () => {
    const { route, rows } = setup();
    const call = vi.fn(async () => {
      throw new Error('boom');
    });
    const result = await route({ ...base, call, fallback: () => 'model answer' });

    expect(result).toEqual({ status: 'failed', fallback: 'model answer' });
    expect(rows[0]).toMatchObject({ outcome: 'error', estimatedCostGbp: 0 });
  });

  it('refuses a service with no configured cap', async () => {
    const { route } = setup();
    await expect(route({ ...base, service: 'unknown', call: paid(0), fallback: () => 'x' })).rejects.toThrow(
      /No spend cap/,
    );
  });
});
