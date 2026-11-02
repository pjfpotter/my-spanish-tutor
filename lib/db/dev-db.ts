import { PGlite } from '@electric-sql/pglite';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { SEED_COURSE } from '../course/seed';
import { seedCourse } from '../course/seed-db';
import type { Db } from './types';

/**
 * An in-process Postgres with every migration applied and the seed course loaded. Used only when
 * DB_DRIVER=pglite (Playwright and local experiments), so tests never write to the real database.
 * Lives for the life of the server process; restarting the server starts again from empty.
 */
export async function createDevDb(): Promise<Db> {
  const pg = new PGlite();
  const dir = path.join(process.cwd(), 'db', 'migrations');
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) await pg.exec(readFileSync(path.join(dir, file), 'utf8'));
  const db: Db = { query: (sql, params) => pg.query(sql, params as unknown[]) as never };
  await seedCourse(db, SEED_COURSE);
  return db;
}
