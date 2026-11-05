import { PGlite } from '@electric-sql/pglite';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type { Db } from './types';

/** A fresh in-process Postgres with every migration applied, for unit tests. */
export async function newTestDb(): Promise<Db & { close(): Promise<void> }> {
  const pg = new PGlite();
  const dir = path.join(import.meta.dirname, '../../db/migrations');
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
    await pg.exec(readFileSync(path.join(dir, file), 'utf8'));
  }
  return {
    query: (sql, params) => pg.query(sql, params as unknown[]) as never,
    close: () => pg.close(),
  };
}

/** Inserts a minimal course with five questions and returns the ids. */
export async function insertTestCourse(db: Db, classCode = 'TEST42') {
  const { rows } = await db.query<{ id: string }>(
    `insert into courses (class_code, owner_token_hash, title, test_date) values ($1, 'x', 'Test', '2026-12-01') returning id`,
    [classCode],
  );
  const courseId = rows[0].id;
  const questionIds: string[] = [];
  for (let n = 1; n <= 5; n++) {
    const q = await db.query<{ id: string }>(
      `insert into questions (course_id, position, spanish, english_subtitle, recycled) values ($1, $2, $3, $4, $5) returning id`,
      [courseId, n, `Pregunta ${n}`, `Question ${n}`, n === 5],
    );
    questionIds.push(q.rows[0].id);
  }
  return { courseId, questionIds };
}
