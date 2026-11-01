// Builds one tutor clip with the ElevenLabs character voice (task 18.8, the seed of task 4.2).
//
//   npm run tele-line -- hola            build the clip for the placeholder line "hola"
//   npm run tele-line -- hola --force    rebuild even if nothing changed
//
// Writes public/audio/tele/<id>.mp3 and <id>.json (word times, loudness envelope, feeling track).
// Clips are keyed by a hash of text, voice, model and speed, so a rerun costs nothing unless
// something changed. The paid call goes through the cost router and is logged.
//
// Needs in .env.local: ELEVENLABS_API_KEY, ELEVENLABS_VOICE_TELE. Optional: ELEVENLABS_MODEL
// (default eleven_multilingual_v2), ELEVENLABS_SPEED (default 1), DATABASE_URL (in .env) to log cost.
//
// Imports the app's TypeScript modules directly (Node strips the types).
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { MPEGDecoder } from 'mpg123-decoder';
import { wordsFromAlignment } from '../lib/tele/alignment.ts';
import { parseClipFile } from '../lib/tele/clip.ts';
import { envelopeFromSamples } from '../lib/tele/envelope.ts';
import { PLACEHOLDER_LINES } from '../lib/tele/lines.ts';
import { createCostRouter } from '../lib/cost-router/router.ts';
import { createPgCostStore } from '../lib/cost-router/pg-store.ts';

const SERVICE = 'elevenlabs-tts';
// Unverified estimate: Starter is about $6 for 30,000 credits, roughly one credit a character.
const COST_PER_CHAR_GBP = 0.00016;
const LIMITS = { [SERVICE]: { capGbp: 3, periodMs: 30 * 24 * 3_600_000, rate: { max: 1000, windowMs: 60_000 } } };
const HOP = 0.03;

const args = process.argv.slice(2);
const force = args.includes('--force');
const id = args.find((a) => !a.startsWith('--'));
const line = PLACEHOLDER_LINES.find((l) => l.id === id);
if (!line) {
  console.error(`Pick a line: ${PLACEHOLDER_LINES.map((l) => l.id).join(', ')}`);
  process.exit(2);
}

const key = process.env.ELEVENLABS_API_KEY;
const voiceId = process.env.ELEVENLABS_VOICE_TELE;
if (!key || !voiceId) {
  console.error('Set ELEVENLABS_API_KEY and ELEVENLABS_VOICE_TELE in .env.local');
  process.exit(2);
}
const model = process.env.ELEVENLABS_MODEL ?? 'eleven_multilingual_v2';
const speed = Number(process.env.ELEVENLABS_SPEED ?? 1);

const dir = path.join(import.meta.dirname, '../public/audio/tele');
const mp3Path = path.join(dir, `${id}.mp3`);
const jsonPath = path.join(dir, `${id}.json`);
const hash = createHash('sha1').update(JSON.stringify({ text: line.es, voiceId, model, speed })).digest('hex').slice(0, 12);

if (!force && existsSync(jsonPath) && existsSync(mp3Path)) {
  const existing = JSON.parse(await readFile(jsonPath, 'utf8'));
  if (existing.source?.hash === hash) {
    console.log(`${id}: unchanged (hash ${hash}), nothing to pay for.`);
    process.exit(0);
  }
}

// Cost router with a Postgres log when DATABASE_URL is set, otherwise an in-memory one.
let pool = null;
let store;
if (process.env.DATABASE_URL) {
  const { default: pg } = await import('pg');
  pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  store = createPgCostStore(pool);
} else {
  console.warn('DATABASE_URL not set: the spend is not logged or capped across runs.');
  const rows = [];
  store = {
    spentSince: async () => rows.reduce((s, r) => s + r.estimatedCostGbp, 0),
    callsSince: async () => 0,
    log: async (e) => void rows.push(e),
  };
}
const route = createCostRouter(store, LIMITS);

const cost = line.es.length * COST_PER_CHAR_GBP;
const result = await route({
  service: SERVICE,
  tier: 'speech',
  profileId: null,
  estimateGbp: cost,
  fallback: () => null,
  call: async () => {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/with-timestamps?output_format=mp3_44100_128`,
      {
        method: 'POST',
        headers: { 'xi-api-key': key, 'content-type': 'application/json' },
        body: JSON.stringify({ text: line.es, model_id: model, voice_settings: { speed } }),
      },
    );
    if (!res.ok) throw new Error(`ElevenLabs returned ${res.status}: ${(await res.text()).slice(0, 200)}`);
    return { value: await res.json(), units: line.es.length, costGbp: cost };
  },
}).finally(() => pool?.end());

if (result.status !== 'ok') {
  console.error(`${id}: not built (${result.status}).`);
  process.exit(1);
}

const { audio_base64: audio, alignment } = result.value;
const mp3 = Buffer.from(audio, 'base64');

const decoder = new MPEGDecoder();
await decoder.ready;
const { channelData, sampleRate, samplesDecoded } = decoder.decode(new Uint8Array(mp3));
decoder.free();
const duration = samplesDecoded / sampleRate;

const { words } = wordsFromAlignment(alignment);
const clip = parseClipFile({
  id,
  text: line.es,
  en: line.en,
  end: Math.round(duration * 1000) / 1000,
  words: words.map((w) => ({ text: w.text, t0: Math.round(w.t0 * 1000) / 1000 })),
  envelope: envelopeFromSamples(channelData[0], sampleRate, HOP),
  envelopeHop: HOP,
  feelings: [{ t0: 0, feelings: line.feelings }],
  source: { provider: 'elevenlabs', voiceId, model, speed, hash },
});

await mkdir(dir, { recursive: true });
await writeFile(mp3Path, mp3);
await writeFile(jsonPath, JSON.stringify(clip, null, 1) + '\n');
console.log(`${id}: built ${(mp3.length / 1024).toFixed(0)} KB, ${clip.end}s, ${clip.words.length} words, hash ${hash}.`);
console.log(clip.words.map((w) => `${w.t0.toFixed(2)} ${w.text}`).join('  '));
