import type { Pool } from 'pg';
import type { Interpretation } from './interpretation.ts';

/** What is stored for a processed sheet, keyed by the document's content and the prompt and schema versions (task 4.6). Nothing about a student is in a key or a record. */
export interface IngestRecord {
  status: 'ready';
  interpretation: Interpretation;
  repairs: number;
  costGbp: number;
}
export interface IngestCache {
  get(key: string): Promise<IngestRecord | null>;
  put(key: string, rec: IngestRecord): Promise<void>;
}
export const cacheKey = (hash: string, promptVersion: string, schemaVersion: number) => `${hash}:${promptVersion}:${schemaVersion}`;

export function createMemoryCache(): IngestCache & { size(): number } {
  const m = new Map<string, IngestRecord>();
  return { get: async (k) => m.get(k) ?? null, put: async (k, r) => void m.set(k, structuredClone(r)), size: () => m.size };
}

export function createPgIngestCache(pool: Pool): IngestCache {
  return {
    async get(key) {
      const { rows } = await pool.query('select interpretation, repairs, cost_gbp from sheet_interpretations where cache_key = $1', [key]);
      return rows[0] ? { status: 'ready', interpretation: rows[0].interpretation as Interpretation, repairs: rows[0].repairs, costGbp: Number(rows[0].cost_gbp) } : null;
    },
    async put(key, rec) {
      await pool.query(
        `insert into sheet_interpretations (cache_key, interpretation, repairs, cost_gbp) values ($1, $2, $3, $4)
         on conflict (cache_key) do update set interpretation = excluded.interpretation, repairs = excluded.repairs, cost_gbp = excluded.cost_gbp`,
        [key, JSON.stringify(rec.interpretation), rec.repairs, rec.costGbp],
      );
    },
  };
}
