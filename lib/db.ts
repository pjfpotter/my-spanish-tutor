import { Pool } from 'pg';
import type { Db } from './db/types';

let pool: Pool | undefined;

/** One small pooled connection set per server instance, using the pooled Neon URL. */
export function getPool(): Pool {
  if (!pool) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL is not set');
    pool = new Pool({ connectionString: url, max: 3 });
  }
  return pool;
}

const g = globalThis as unknown as { __devDb?: Promise<Db> };

/**
 * The database the app talks to. Normally Neon. With DB_DRIVER=pglite it is a throwaway in-process
 * Postgres seeded with the course, so Playwright runs never touch real data.
 */
export async function getDb(): Promise<Db> {
  if (process.env.DB_DRIVER === 'pglite') {
    g.__devDb ??= import('./db/dev-db').then((m) => m.createDevDb());
    return g.__devDb;
  }
  return getPool();
}
