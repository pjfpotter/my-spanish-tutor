// Writes the synthetic sentence-builder fixtures as .docx files so a person can open them in Word.
//   node scripts/make-fixture-sheets.mjs [folder]
// The content is invented; no teacher's worksheet is in the repo.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { FIXTURES } from '../lib/sheets/fixture-docx.ts';

const dir = process.argv[2] ?? 'tests/fixtures/sheets';
mkdirSync(dir, { recursive: true });
for (const [name, make] of Object.entries(FIXTURES)) {
  const bytes = make();
  writeFileSync(join(dir, `${name}.docx`), bytes);
  console.log(`wrote ${join(dir, name)}.docx (${bytes.length} bytes)`);
}
