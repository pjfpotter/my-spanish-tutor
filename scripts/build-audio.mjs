// Builds every audio clip the app needs, once (tasks 4.2 and 12.2).
//
//   npm run build-audio                  DRY RUN (the default): lists what is missing and what it would cost. Spends nothing.
//   npm run build-audio -- --yes         builds only the missing or out-of-date clips, through the cost router
//   npm run build-audio -- --yes --force rebuilds even unchanged clips (this costs money again)
//   npm run build-audio -- --only=lines  or --only=questions
//
// Clips are stored in public/audio/clips/<slot>.mp3 and .json, where the slot is a hash of the text and
// speed. A clip is skipped when its stored source hash (text, voice, model, speed) matches, so a rerun
// with nothing changed pays for nothing. Needs ELEVENLABS_API_KEY and ELEVENLABS_VOICE_TELE in .env.local;
// DATABASE_URL in .env makes the spend count toward the cap across runs.
import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { MPEGDecoder } from 'mpg123-decoder';
import { buildClips, planBuild, TTS_SERVICE } from '../lib/audio/build.ts';
import { planClips } from '../lib/audio/manifest.ts';
import { SEED_COURSE } from '../lib/course/seed.ts';
import { PHRASE_BANK } from '../lib/tele/phrase-bank.ts';
import { createCostRouter } from '../lib/cost-router/router.ts';
import { createPgCostStore } from '../lib/cost-router/pg-store.ts';

const args = process.argv.slice(2);
const yes = args.includes('--yes');
const force = args.includes('--force');
const only = args.find((a) => a.startsWith('--only='))?.slice(7);

const voiceId = process.env.ELEVENLABS_VOICE_TELE;
const key = process.env.ELEVENLABS_API_KEY;
if (!voiceId || (yes && !key)) {
  console.error('Set ELEVENLABS_VOICE_TELE (and ELEVENLABS_API_KEY to build) in .env.local');
  process.exit(2);
}
const voice = { provider: 'elevenlabs', voiceId, model: process.env.ELEVENLABS_MODEL ?? 'eleven_multilingual_v2' };

const dir = path.join(import.meta.dirname, '../public/audio/clips');
const builtIndex = path.join(import.meta.dirname, '../lib/audio/built.ts');
const store = {
  async read(slot) {
    const p = path.join(dir, `${slot}.json`);
    return existsSync(p) && existsSync(path.join(dir, `${slot}.mp3`)) ? JSON.parse(await readFile(p, 'utf8')) : null;
  },
  async write(slot, mp3, clip) {
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, `${slot}.mp3`), mp3);
    await writeFile(path.join(dir, `${slot}.json`), JSON.stringify(clip, null, 1) + '\n');
  },
};

let specs = planClips(SEED_COURSE.questions, PHRASE_BANK);
if (only === 'lines') specs = specs.filter((s) => s.kind === 'line');
if (only === 'questions') specs = specs.filter((s) => s.kind === 'question');

const plan = await planBuild(specs, voice, store, force);
console.log(`Clips wanted: ${specs.length}. Already built and up to date: ${plan.upToDate.length}. To build: ${plan.toBuild.length}.`);
for (const s of plan.toBuild) console.log(`  + ${s.label.padEnd(28)} ${String(s.text.length).padStart(3)} chars  ${s.text}`);
console.log(`Characters to synthesise: ${plan.characters}. Estimated cost: £${plan.estimateGbp.toFixed(3)} (the rate is an unverified estimate).`);

if (!plan.toBuild.length) process.exit(0);
if (!yes) {
  console.log('\nDry run only. Nothing was spent. Add --yes to build.');
  process.exit(0);
}

const synth = {
  async synthesise(text, speed) {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/with-timestamps?output_format=mp3_44100_128`, {
      method: 'POST',
      headers: { 'xi-api-key': key, 'content-type': 'application/json' },
      body: JSON.stringify({ text, model_id: voice.model, voice_settings: { speed } }),
    });
    if (!res.ok) throw new Error(`ElevenLabs returned ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const j = await res.json();
    return { mp3: Buffer.from(j.audio_base64, 'base64'), alignment: j.alignment };
  },
};
const mpg = new MPEGDecoder();
await mpg.ready;
const decoder = {
  async decode(mp3) {
    const { channelData, sampleRate } = mpg.decode(new Uint8Array(mp3));
    return { samples: channelData[0], sampleRate };
  },
};

let pool = null;
let costStore;
if (process.env.DATABASE_URL) {
  const { default: pg } = await import('pg');
  pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  costStore = createPgCostStore(pool);
} else {
  console.warn('DATABASE_URL not set: the spend is not logged or capped across runs.');
  const rows = [];
  costStore = { spentSince: async () => rows.reduce((s, r) => s + r.estimatedCostGbp, 0), callsSince: async () => 0, log: async (e) => void rows.push(e) };
}
const route = createCostRouter(costStore, { [TTS_SERVICE]: { capGbp: 3, periodMs: 30 * 24 * 3_600_000, rate: { max: 1000, windowMs: 60_000 } } });

const report = await buildClips(plan.toBuild, voice, { synth, decoder, store, route }).finally(() => pool?.end());
mpg.free();

// Record which clips exist (text and speed to slot), so the app can find them without hashing in the browser.
const entries = [];
for (const f of (await readdir(dir)).filter((f) => f.endsWith('.json'))) {
  const c = JSON.parse(await readFile(path.join(dir, f), 'utf8'));
  entries.push({ slot: c.id, text: c.text, speed: c.source.speed });
}
entries.sort((a, b) => a.slot.localeCompare(b.slot));
await writeFile(
  builtIndex,
  '// GENERATED by `npm run build-audio`. Do not edit by hand.\nexport default ' + JSON.stringify(entries, null, 2) + ' as { slot: string; text: string; speed: number }[];\n',
);

console.log(`\nBuilt ${report.built.length}, failed ${report.failed.length}. Spent about £${report.spentGbp.toFixed(3)}.`);
for (const f of report.failed) console.log(`  ! ${f.label}: ${f.status}`);
process.exit(report.failed.length ? 1 : 0);
