import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { newTestDb } from '../db/test-db';
import { cacheKey, createMemoryCache, createPgIngestCache } from './cache';
import type { Interpretation } from './interpretation';
import { FREE_TIME } from './samples/free-time';

let db: Awaited<ReturnType<typeof newTestDb>>;
beforeAll(async () => void (db = await newTestDb()));
afterAll(() => db.close());

describe('ingest cache (task 4.6)', () => {
  const rec = (i: Interpretation, n = 0) => ({ status: 'ready' as const, interpretation: i, repairs: n, costGbp: 0.2 });

  it('keys by content, prompt version and schema version only', () => {
    expect(cacheKey('abc', 'sheet-v1', 1)).toBe('abc:sheet-v1:1');
  });

  it('stores and reads an interpretation in the database, and updates in place', async () => {
    const cache = createPgIngestCache(db as never);
    expect(await cache.get('k1')).toBeNull();
    await cache.put('k1', rec(FREE_TIME, 1));
    const got = await cache.get('k1');
    expect(got?.interpretation.name).toBe('Free time');
    expect(got).toMatchObject({ repairs: 1, costGbp: 0.2 });
    await cache.put('k1', rec(FREE_TIME, 2));
    expect((await cache.get('k1'))?.repairs).toBe(2);
    expect(Number((await db.query<{ n: string }>('select count(*) as n from sheet_interpretations')).rows[0].n)).toBe(1);
  });

  it('holds nothing about a student', async () => {
    const cols = (await db.query<{ column_name: string }>("select column_name from information_schema.columns where table_name = 'sheet_interpretations'")).rows.map((r) => r.column_name);
    expect(cols.sort()).toEqual(['cache_key', 'cost_gbp', 'created_at', 'interpretation', 'repairs']);
  });

  it('the memory cache copies what it stores', async () => {
    const c = createMemoryCache();
    const i = structuredClone(FREE_TIME);
    await c.put('a', rec(i));
    i.name = 'changed';
    expect((await c.get('a'))?.interpretation.name).toBe('Free time');
  });
});
