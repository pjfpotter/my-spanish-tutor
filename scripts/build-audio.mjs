// Builds every audio clip the app needs, once (tasks 4.2 and 12.2).
//
//   npm run build-audio                  DRY RUN (the default): lists what is missing and what it would cost. Spends nothing.
//   npm run build-audio -- --yes         builds only the missing or out-of-date clips, through the cost router
//   npm run build-audio -- --yes --force rebuilds even unchanged clips (this costs money again)
//   npm run build-audio -- --yes --limit=3  builds only the first three that are missing, for a listening test
//
// ElevenLabs is asked once per text, for the natural voice, with no speed setting (v4 ignores it). The slow and fast clips
// are that clip stretched here with ffmpeg (needs ffmpeg with the rubberband filter), free. Every clip is written as
// 64 kbps mono MP3, encoded once from the 128 kbps original. A full build (no --only, no --limit) that finishes with no failures
// also removes every file in the clips folder that no current clip wants: old voices, old text, anything left over.
// The dry run says how many it would remove.
//   npm run build-audio -- --only=lines, --only=questions or --only=bits
//
// Clips are stored in public/audio/clips/<slot>.mp3 and .json, where the slot is a hash of the text and
// speed. A clip is skipped when its stored source hash (text, voice, model, speed) matches, so a rerun
// with nothing changed pays for nothing. Needs ELEVENLABS_API_KEY and ELEVENLABS_VOICE_TELE in .env.local;
// DATABASE_URL in .env makes the spend count toward the cap across runs.
import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { MPEGDecoder } from 'mpg123-decoder';
import { buildClips, planBuild, TTS_SERVICE } from '../lib/audio/build.ts';
import { planClips } from '../lib/audio/manifest.ts';
import { CHEEKY_POOL } from '../lib/tele/cheeky.ts';
import { SEED_COURSE } from '../lib/course/seed.ts';
import { bitsFor } from '../lib/audio/bits.ts';
import { ffmpegStretcher } from '../lib/audio/ffmpeg.ts';
import { LAB_ANSWERS } from '../app/lab/memorise/content.ts';
import { PHRASE_BANK } from '../lib/tele/phrase-bank.ts';
import { createCostRouter } from '../lib/cost-router/router.ts';
import { SERVICE_LIMITS } from '../lib/cost-router/limits.ts';
import { createPgCostStore } from '../lib/cost-router/pg-store.ts';

const args = process.argv.slice(2);
const yes = args.includes('--yes');
const force = args.includes('--force');
const only = args.find((a) => a.startsWith('--only='))?.slice(7);
const limit = Number(args.find((a) => a.startsWith('--limit='))?.slice(8)) || null;

const voiceId = process.env.ELEVENLABS_VOICE_TELE;
const key = process.env.ELEVENLABS_API_KEY;
if (!voiceId || (yes && !key)) {
  console.error('Set ELEVENLABS_VOICE_TELE (and ELEVENLABS_API_KEY to build) in .env.local');
  process.exit(2);
}
// ELEVENLABS_TAG, such as "[very slowly]", is put at the start of every sentence sent and removed from the timings.
// Tags are read as directions by the newer expressive models (v3 and later) only, so set ELEVENLABS_MODEL with it.
const tag = process.env.ELEVENLABS_TAG?.trim() || undefined;
const voice = { provider: 'elevenlabs', voiceId, model: process.env.ELEVENLABS_MODEL ?? 'eleven_multilingual_v2', tag };
if (tag && /multilingual|turbo|flash|monolingual/.test(voice.model)) {
  console.error(`ELEVENLABS_TAG is set but the model is ${voice.model}. Tags are directions only on the newer expressive models (eleven_v3 and later); older ones may say them aloud. Set ELEVENLABS_MODEL to the model you chose.`);
  process.exit(2);
}

const dir = path.join(import.meta.dirname, '../public/audio/clips');
const builtIndex = path.join(import.meta.dirname, '../lib/audio/built.ts');
const store = {
  async read(slot) {
    const p = path.join(dir, `${slot}.json`);
    return existsSync(p) && existsSync(path.join(dir, `${slot}.mp3`)) ? JSON.parse(await readFile(p, 'utf8')) : null;
  },
  async readMp3(slot) {
    const p = path.join(dir, `${slot}.mp3`);
    return existsSync(p) ? readFile(p) : null;
  },
  async write(slot, mp3, clip) {
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, `${slot}.mp3`), mp3);
    await writeFile(path.join(dir, `${slot}.json`), JSON.stringify(clip, null, 1) + '\n');
  },
};

// Bits Tele can say in the memorise ladder: the course chunks, the pieces of the model answers that match no chunk, and
// the memorise lab's sample bits, so the lab sounds like the real phase.
const bits = bitsFor(SEED_COURSE, LAB_ANSWERS.flatMap((a) => a.chunks.map((c) => ({ t: c.t, en: c.en }))));
let specs = planClips(SEED_COURSE.questions, [...PHRASE_BANK, ...CHEEKY_POOL], bits);
if (only === 'lines') specs = specs.filter((s) => s.kind === 'line');
if (only === 'questions') specs = specs.filter((s) => s.kind === 'question');
if (only === 'bits') specs = specs.filter((s) => s.kind === 'bit');

const plan = await planBuild(specs, voice, store, force);
if (limit) plan.toBuild = plan.toBuild.slice(0, limit);
const wanted = new Set(specs.map((s) => s.slot));
const onDisk = existsSync(dir) ? [...new Set((await readdir(dir)).filter((f) => /\.(mp3|json)$/.test(f)).map((f) => f.replace(/\.(mp3|json)$/, '')))] : [];
const orphans = only || limit ? [] : onDisk.filter((slot) => !wanted.has(slot));
console.log(`Clips wanted: ${specs.length}. Already built and up to date: ${plan.upToDate.length}. To build: ${plan.toBuild.length}.`);
for (const s of plan.toBuild) console.log(`  + ${s.label.padEnd(28)} ${String(s.text.length).padStart(3)} chars  ${s.text}`);
console.log(`Characters to synthesise: ${plan.characters}. Estimated cost: £${plan.estimateGbp.toFixed(3)} (the rate is an unverified estimate).`);

const prune = async () => {
  for (const slot of orphans) for (const ext of ['mp3', 'json']) await rm(path.join(dir, `${slot}.${ext}`), { force: true });
  if (orphans.length) console.log(`Removed ${orphans.length} old clips that nothing wants any more.`);
};
if (orphans.length) console.log(`Old clips no current clip wants: ${orphans.length}. A full build with --yes removes them.`);
if (!plan.toBuild.length) {
  if (yes) await prune();
  process.exit(0);
}
if (!yes) {
  console.log('\nDry run only. Nothing was spent and nothing was removed. Add --yes to build.');
  process.exit(0);
}

const synth = {
  async synthesise(text) {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/with-timestamps?output_format=mp3_44100_128`, {
      method: 'POST',
      headers: { 'xi-api-key': key, 'content-type': 'application/json' },
      body: JSON.stringify({ text, model_id: voice.model }),
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
const route = createCostRouter(costStore, SERVICE_LIMITS);

const report = await buildClips(plan.toBuild, voice, { synth, decoder, store, route, stretcher: ffmpegStretcher }).finally(() => pool?.end());
mpg.free();
if (!report.failed.length) await prune();
else console.log('Some clips failed, so nothing was removed.');

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
