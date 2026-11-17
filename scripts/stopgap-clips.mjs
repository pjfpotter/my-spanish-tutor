// Lists the built clips that no committed course plans: they belong to a local-only course (for example the
// testing course PRBA7K3M). Writes only their ids, never their text, to lib/audio/stopgap-clips.json, which
// the "no unused clips" test accepts. A stopgap until clips live in object storage (see change
// `clip-storage-and-sharing`). Usage: node scripts/stopgap-clips.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { SEED_COURSE } from '../lib/course/seed.ts';
import { CHEEKY_POOL } from '../lib/tele/cheeky.ts';
import { PHRASE_BANK } from '../lib/tele/phrase-bank.ts';
import { LAB_ANSWERS } from '../app/lab/memorise/content.ts';
import { teleLines } from '../lib/memorise/tele-lines.ts';
import { bitsFor } from '../lib/audio/bits.ts';
import { planClips } from '../lib/audio/manifest.ts';

const bits = bitsFor(SEED_COURSE, LAB_ANSWERS.flatMap((a) => a.chunks.map((c) => ({ t: c.t, en: c.en }))));
const wanted = new Set(planClips(SEED_COURSE.questions, [...PHRASE_BANK, ...CHEEKY_POOL], bits, teleLines()).map((s) => s.slot));
const built = [...readFileSync('lib/audio/built.ts', 'utf8').matchAll(/"slot": "([0-9a-f]{12})"/g)].map((m) => m[1]);
const extra = [...new Set(built.filter((s) => !wanted.has(s)))].sort();
writeFileSync('lib/audio/stopgap-clips.json', JSON.stringify(extra, null, 1) + '\n');
console.log(`${extra.length} clips belong to no committed course`);
