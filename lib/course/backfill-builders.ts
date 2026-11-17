import type { Db } from '../db/types';
import type { Interpretation } from '../sheets/interpretation.ts';
import { matchSheetQuestion } from '../sheets/question-match.ts';
import type { Sheet } from '../sheets/types.ts';

/**
 * Carries courses made before per-question builders over (course-builder-per-question, design D5). A course that
 * has a stored sheet and no builder rows gets one builder, holding that sheet, its interpretation and the
 * course's calibration, and each question whose Spanish text matches a question of the sheet is assigned to
 * it and linked to that sheet question. Questions that matched nothing stay without a builder, exactly as
 * they showed "no sentence builder yet" before. Safe to run again: a course that already has a builder is
 * skipped. Returns how many courses were carried over.
 */
export async function backfillBuilders(db: Db): Promise<number> {
  const { rows } = await db.query<{ id: string; sheet: Sheet; interpretation: Interpretation; calibration: unknown }>(
    `select c.id, c.sheet, c.interpretation, c.calibration from courses c
      where c.sheet is not null and c.interpretation is not null
        and not exists (select 1 from course_builders b where b.course_id = c.id)`,
  );
  for (const c of rows) {
    const made = await db.query<{ id: string }>(
      `insert into course_builders (course_id, position, key, name, sheet, interpretation, calibration) values ($1, 0, 'sheet', $2, $3, $4, $5) returning id`,
      [c.id, c.interpretation.title || c.interpretation.name || 'Sentence builder', JSON.stringify(c.sheet), JSON.stringify(c.interpretation), JSON.stringify(c.calibration)],
    );
    const qs = await db.query<{ id: string; spanish: string }>('select id, spanish from questions where course_id = $1', [c.id]);
    for (const q of qs.rows) {
      const at = matchSheetQuestion(c.interpretation, q.spanish);
      if (at !== null) await db.query('update questions set builder_id = $2, builder_question = $3 where id = $1', [q.id, made.rows[0].id, at]);
    }
  }
  return rows.length;
}
