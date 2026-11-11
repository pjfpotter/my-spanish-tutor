import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildBuilder } from './builder';
import { compose, prepare, slotFits, type Answer } from './engine';
import type { Interpretation } from './interpretation';
import { readDocx } from './read-docx';
import { validateInterpretation } from './validate';
import { verifyBuilder } from './verify';

/**
 * Optional manual check (tasks 2.1 and 3.1). The owner's real sheets and the interpretations written for
 * them are derived from teachers' documents, so neither is committed. With SHEETS_DIR set to a folder of
 * the sheets and the interpretations in tests/local/interpretations/, each interpretation must validate
 * against its sheet and build into a working engine.
 */
export const FIND: Record<string, string> = { wear: 'Que_vas_a_llevar', tech: 'tecnolog', trip: 'fuiste_el_a', bed: 'dormitorio' };
const sheets = process.env.SHEETS_DIR;
const idir = 'tests/local/interpretations';
const ready = !!sheets && existsSync(sheets) && existsSync(idir);

describe.skipIf(!ready)('real sheets with their reviewed interpretations (local only)', () => {
  const ids = ready ? readdirSync(idir).filter((f) => f.endsWith('.json')).map((f) => f.replace('.json', '')) : [];
  it.each(ids)('%s validates and builds', (id) => {
    const file = readdirSync(sheets as string).find((f) => f.includes(FIND[id]));
    expect(file, `a sheet for ${id}`).toBeDefined();
    const sheet = readDocx(readFileSync(join(sheets as string, file as string)));
    const interp = JSON.parse(readFileSync(join(idir, `${id}.json`), 'utf8')) as Interpretation;
    expect(validateInterpretation(sheet, interp)).toEqual([]);
    const B = prepare(buildBuilder(id, sheet, interp));
    const v = verifyBuilder(B, { walks: 150, sheet });
    expect(v.failures, 'the gate finds nothing').toEqual([]);
    const a: Answer = {};
    const q = B.questions[0], need = q.required ?? (B.required.length ? B.required : (B.requiredAny?.[0] ?? []));
    for (const k of need) { const fit = slotFits(B, a, k, q); expect(fit.length, `something fits ${k}`).toBeGreaterThan(0); a[k] = fit[0]; }
    expect(compose(B, a, 'es', q).length).toBeGreaterThan(3);
  });
});
