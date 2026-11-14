import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readDocx } from './read-docx';

/**
 * Optional manual check (task 1.7). Teachers' own sheets are never committed. Point SHEETS_DIR at a
 * folder of .docx files and this reads each one and prints what it found. Skipped when unset.
 */
const dir = process.env.SHEETS_DIR;
describe.skipIf(!dir || !existsSync(dir))('real sentence builders (local only)', () => {
  const files = dir && existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.docx')) : [];
  it.each(files)('reads %s', (f) => {
    const s = readDocx(readFileSync(join(dir as string, f)));
    console.log(`${f}: ${s.tables.length} table(s), ${s.stats.items} chunks, English for ${s.stats.glossed}, ${s.warnings.length} note(s)`);
    expect(s.stats.items).toBeGreaterThan(10);
    expect(s.warnings.filter((w) => w.includes('has nothing to attach to'))).toEqual([]);
  });
});
