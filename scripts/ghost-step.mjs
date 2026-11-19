// The ghost whisper step of `npm run build-audio` (ghost whisper change, tasks 2.1 and 2.2). It cuts each distinct word out of
// a slow clip that is already on disk and turns it into a short ghost MP3, with local ffmpeg. It is free: no voice service, no
// cost router, no key, no database. Files go in public/audio/ghost/<slot>.mp3 with a <slot>.json note beside each (the word
// and the hash that says whether it is stale), and the browser finds them through the generated lib/audio/built-ghost.ts.
import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { normaliseWord } from '../lib/speech/score.ts';
import { ghostWords, planGhost, unwantedSlots, wordCut } from '../lib/audio/ghost.ts';
import { ffmpegGhost } from '../lib/audio/ffmpeg.ts';

const clipsDir = path.join(import.meta.dirname, '../public/audio/clips');
const ghostDir = path.join(import.meta.dirname, '../public/audio/ghost');
const builtIndex = path.join(import.meta.dirname, '../lib/audio/built-ghost.ts');

async function readClips() {
  if (!existsSync(clipsDir)) return [];
  const out = [];
  for (const f of (await readdir(clipsDir)).filter((f) => f.endsWith('.json'))) {
    if (!existsSync(path.join(clipsDir, f.replace('.json', '.mp3')))) continue;
    out.push({ slot: f.slice(0, -5), clip: JSON.parse(await readFile(path.join(clipsDir, f), 'utf8')) });
  }
  return out;
}

const store = {
  async read(slot) {
    const p = path.join(ghostDir, `${slot}.json`);
    return existsSync(p) && existsSync(path.join(ghostDir, `${slot}.mp3`)) ? JSON.parse(await readFile(p, 'utf8')) : null;
  },
};

/**
 * Plans, and with `yes` builds, the ghost words. Without `yes` it is a dry run: it lists what it would build and what it would
 * remove and writes nothing. `prune` removes ghost files no slow clip wants any more (never together with `limit` or `only`).
 * `only` is a list of words to build and nothing else, for a listening test.
 * Returns { built, failed, removed } so the caller can set its exit code.
 */
export async function ghostStep({ yes = false, force = false, limit = null, prune = false, only = null } = {}) {
  const clips = await readClips();
  const sources = new Map(clips.map((c) => [c.slot, c.clip]));
  const words = ghostWords(clips);
  const plan = await planGhost(words, store, force);
  if (only) {
    const wanted = new Set(only.map(normaliseWord));
    const known = new Set(words.map((w) => w.word));
    const unknown = [...wanted].filter((w) => !known.has(w));
    if (unknown.length) console.log(`No ghost word for: ${unknown.join(', ')} (not in any slow clip).`);
    plan.toBuild = plan.toBuild.filter((w) => wanted.has(w.word));
  }
  if (limit) plan.toBuild = plan.toBuild.slice(0, limit);
  const onDisk = existsSync(ghostDir) ? [...new Set((await readdir(ghostDir)).filter((f) => /\.(mp3|json)$/.test(f)).map((f) => f.replace(/\.(mp3|json)$/, '')))] : [];
  const orphans = prune && !limit && !only ? unwantedSlots(words, onDisk) : [];

  console.log(`\nGhost words wanted: ${words.length} (from ${clips.length} clips). Already built and up to date: ${plan.upToDate.length}. To build: ${plan.toBuild.length}. This step is free: local ffmpeg, no service is called.`);
  for (const w of plan.toBuild) {
    const cut = wordCut(sources.get(w.source.slot), w.source.index);
    console.log(`  + ${w.word.padEnd(18)} from ${w.source.slot} ${cut.start.toFixed(2)}s to ${cut.end.toFixed(2)}s`);
  }
  for (const s of orphans) console.log(`  - ${s} (no slow clip wants it any more)`);
  if (!yes) {
    if (plan.toBuild.length || orphans.length) console.log('Ghost dry run only. Nothing was built and nothing was removed. Add --yes to build.');
    return { built: 0, failed: [], removed: 0 };
  }

  const failed = [];
  let built = 0;
  await mkdir(ghostDir, { recursive: true });
  for (const w of plan.toBuild) {
    try {
      const clip = sources.get(w.source.slot);
      const mp3 = await readFile(path.join(clipsDir, `${w.source.slot}.mp3`));
      const out = await ffmpegGhost.make(mp3, wordCut(clip, w.source.index));
      await writeFile(path.join(ghostDir, `${w.slot}.mp3`), out);
      await writeFile(path.join(ghostDir, `${w.slot}.json`), JSON.stringify({ word: w.word, hash: w.hash, source: w.source }, null, 1) + '\n');
      built++;
    } catch (e) {
      failed.push({ word: w.word, error: String(e.message ?? e) });
    }
  }
  let removed = 0;
  if (!failed.length) {
    for (const slot of orphans) for (const ext of ['mp3', 'json']) await rm(path.join(ghostDir, `${slot}.${ext}`), { force: true });
    removed = orphans.length;
  } else if (orphans.length) console.log('Some ghost words failed, so nothing was removed.');

  // Record which ghost words exist (word to slot), so the app can find them without hashing in the browser.
  const entries = [];
  for (const f of existsSync(ghostDir) ? (await readdir(ghostDir)).filter((f) => f.endsWith('.json')) : []) {
    if (!existsSync(path.join(ghostDir, f.replace('.json', '.mp3')))) continue;
    const m = JSON.parse(await readFile(path.join(ghostDir, f), 'utf8'));
    entries.push({ word: m.word, slot: f.slice(0, -5) });
  }
  entries.sort((a, b) => a.word.localeCompare(b.word));
  await writeFile(builtIndex, '// GENERATED by `npm run build-audio`. Do not edit by hand.\nexport default ' + JSON.stringify(entries, null, 2) + ' as { word: string; slot: string }[];\n');

  console.log(`Ghost words built ${built}, failed ${failed.length}${removed ? `, removed ${removed}` : ''}.`);
  for (const f of failed) console.log(`  ! ${f.word}: ${f.error}`);
  return { built, failed, removed };
}
