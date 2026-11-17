// Rebuilds the local data for the testing course (PRBA7K3M) from the teacher's sentence builders.
// Teachers' sheets and anything derived from them are never committed: this reads and writes only
// docs/teaching-resources/, which is gitignored.
//
//   node scripts/build-testing-course.mjs
//
// Reads  docs/teaching-resources/testing-course/sources.json  (which sheets, in question order, and their interpretations)
//        docs/teaching-resources/testing-course/interpretations/*.json  (one reviewed interpretation per sheet)
//        docs/teaching-resources/testing-course/content.json  (questions, model answers; optional until written)
// Checks every interpretation with the validator and the verification gate, merges the five into one sheet and one
// interpretation, checks that again, and writes sheet.json, interpretation.json and (when content.json exists) course.json.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { buildBuilder } from '../lib/sheets/builder.ts';
import { prepare } from '../lib/sheets/engine.ts';
import { mergeSheets } from '../lib/sheets/merge.ts';
import { readDocx } from '../lib/sheets/read-docx.ts';
import { validateInterpretation } from '../lib/sheets/validate.ts';
import { verifyBuilder } from '../lib/sheets/verify.ts';
import { assembleTestingCourse } from '../lib/course/testing-course-build.ts';

const dir = path.join('docs', 'teaching-resources', 'testing-course');
const sources = JSON.parse(readFileSync(path.join(dir, 'sources.json'), 'utf8'));
let failed = false;
const report = (label, problems) => {
  if (!problems.length) { console.log(`  ok   ${label}`); return; }
  failed = true;
  console.log(`  FAIL ${label}`);
  for (const p of problems) console.log(`       ${typeof p === 'string' ? p : JSON.stringify(p)}`);
};

const parts = [];
for (const p of sources.parts) {
  const sheet = readDocx(readFileSync(path.join(sources.sheetsDir, p.file)));
  const interpretation = JSON.parse(readFileSync(path.join(dir, p.interpretation), 'utf8'));
  console.log(`${p.prefix}: ${p.file} (${sheet.stats.items} chunks)`);
  const invalid = validateInterpretation(sheet, interpretation);
  report('validates', invalid.map((x) => `${x.path}: ${x.message}`));
  if (!invalid.length) {
    const B = prepare(buildBuilder(p.prefix, sheet, interpretation));
    report('verification gate (150 walks)', verifyBuilder(B, { walks: 150, sheet }).failures);
  }
  parts.push({ prefix: p.prefix, sheet, interpretation });
}
if (failed) { console.log('\nFix the interpretations above first.'); process.exit(1); }

const merged = mergeSheets(parts, { name: 'Testing course', title: 'Testing course', subtitle: 'Five sentence builders' });
console.log('merged:');
report('validates', validateInterpretation(merged.sheet, merged.interpretation).map((x) => `${x.path}: ${x.message}`));
const B = prepare(buildBuilder('testing', merged.sheet, merged.interpretation));
report('verification gate (300 walks)', verifyBuilder(B, { walks: 300, sheet: merged.sheet }).failures);
if (failed) process.exit(1);

writeFileSync(path.join(dir, 'sheet.json'), JSON.stringify(merged.sheet));
writeFileSync(path.join(dir, 'interpretation.json'), JSON.stringify(merged.interpretation));
console.log(`wrote sheet.json and interpretation.json (${merged.interpretation.questions.length} questions)`);

const contentFile = path.join(dir, 'content.json');
if (existsSync(contentFile)) {
  const course = assembleTestingCourse(JSON.parse(readFileSync(contentFile, 'utf8')), merged);
  writeFileSync(path.join(dir, 'course.json'), JSON.stringify(course));
  console.log(`wrote course.json (${course.chunks.length} chunks, ${course.questions.length} questions, ${course.modelAnswers.length} model answers)`);
} else {
  console.log('no content.json yet, so course.json was not written');
}
