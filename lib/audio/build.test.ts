import { spawnSync } from 'node:child_process';
import { describe, expect, it, vi } from 'vitest';
import { createCostRouter } from '../cost-router/router';
import type { CostEntry, CostStore } from '../cost-router/types';
import type { ClipFile } from '../tele/clip';
import { PHRASE_BANK } from '../tele/phrase-bank';
import { SEED_COURSE } from '../course/seed';
import { buildClips, estimateFor, planBuild, type ClipStore, type Stretcher, type Synthesiser, type Voice } from './build';
import { planClips, slotFor, SPEEDS } from './manifest';

const voice: Voice = { provider: 'test', voiceId: 'v1', model: 'm1' };

function fakes(capGbp = 5) {
  const files = new Map<string, ClipFile>();
  const mp3s = new Map<string, Buffer>();
  const store: ClipStore = {
    read: async (s) => files.get(s) ?? null,
    readMp3: async (s) => mp3s.get(s) ?? null,
    write: async (s, m, c) => void (files.set(s, c), mp3s.set(s, m)),
  };
  const calls: { text: string }[] = [];
  const stretches: number[] = [];
  const stretcher: Stretcher = { process: async (mp3, rate) => (stretches.push(rate), mp3) };
  const synth: Synthesiser = {
    synthesise: async (text) => {
      calls.push({ text });
      const chars = text.split('');
      return {
        mp3: Buffer.from('x'),
        alignment: {
          characters: chars,
          character_start_times_seconds: chars.map((_, i) => i * 0.05),
          character_end_times_seconds: chars.map((_, i) => i * 0.05 + 0.05),
        },
      };
    },
  };
  const decoder = { decode: async () => ({ samples: new Float32Array(44100 * 20).fill(0.2), sampleRate: 44100 }) };
  const log: CostEntry[] = [];
  const costStore: CostStore = {
    spentSince: async () => log.reduce((s, e) => s + e.estimatedCostGbp, 0),
    callsSince: async () => 0,
    log: async (e) => void log.push(e),
  };
  const route = createCostRouter(costStore, { 'elevenlabs-tts': { capGbp, periodMs: 1e9, rate: { max: 1e6, windowMs: 1 } } });
  return { files, store, calls, stretches, stretcher, synth, decoder, log, route };
}

describe('planClips', () => {
  const specs = planClips(SEED_COURSE.questions, PHRASE_BANK);

  it('plans every question at slow, normal and fast, each key word at slow and normal, and every phrase-bank line once', () => {
    expect(specs.filter((s) => s.kind === 'question')).toHaveLength(5 * 3 + 5 * 2);
    expect(specs.filter((s) => s.kind === 'line')).toHaveLength(PHRASE_BANK.length);
    const speeds = new Set(specs.filter((s) => s.kind === 'question').map((s) => s.speed));
    expect(speeds).toEqual(new Set(Object.values(SPEEDS)));
  });

  it('uses one clip for identical text and speed, however many places want it', () => {
    const twice = planClips([...SEED_COURSE.questions, ...SEED_COURSE.questions], PHRASE_BANK);
    expect(twice).toHaveLength(specs.length);
  });

  it('gives different slots to different speeds and texts', () => {
    expect(slotFor('hola', 1)).not.toBe(slotFor('hola', 0.7));
    expect(slotFor('hola', 1)).not.toBe(slotFor('adios', 1));
    expect(slotFor('hola', 1)).toBe(slotFor('hola', 1));
  });
});

describe('the build', () => {
  // Two questions at slow, normal and fast: two natural clips are paid for, four are stretched from them.
  const specs = planClips(SEED_COURSE.questions, PHRASE_BANK).slice(0, 6);

  it('a dry run plans and prices the work but calls nothing', async () => {
    const f = fakes();
    const plan = await planBuild(specs, voice, f.store);
    expect(plan.toBuild).toHaveLength(6);
    expect(plan.estimateGbp).toBeCloseTo(estimateFor(specs));
    expect(f.calls).toHaveLength(0);
    expect(f.log).toHaveLength(0);
  });

  it('builds missing clips through the cost router and logs each cost', async () => {
    const f = fakes();
    const plan = await planBuild(specs, voice, f.store);
    const report = await buildClips(plan.toBuild, voice, f);
    expect(report.built).toHaveLength(6);
    expect(f.calls).toHaveLength(2); // one paid call for each text, not one for each speed
    expect(f.log.filter((e) => e.outcome === 'ok')).toHaveLength(2);
    expect(f.files.size).toBe(6);
  });

  it('makes the slow and fast clips from the natural one, free, and scales their word times to match', async () => {
    const f = fakes();
    await buildClips((await planBuild(specs, voice, f.store)).toBuild, voice, f);
    expect(f.stretches.sort()).toEqual([0.7, 0.7, 1, 1, 1.2, 1.2]);
    const [slow, normal] = [specs[0], specs[1]].map((s) => f.files.get(s.slot)!);
    expect(specs[0].speed).toBe(0.7);
    expect(slow.words.at(-1)!.t0).toBeCloseTo(normal.words.at(-1)!.t0 / 0.7, 2);
    expect(slow.source.speed).toBe(0.7);
    expect(slow.source.hash).not.toBe(normal.source.hash);
  });

  it('a dry run prices only the natural clips', async () => {
    const f = fakes();
    const plan = await planBuild(specs, voice, f.store);
    const naturalChars = specs.filter((s) => s.speed === 1).reduce((n, s) => n + s.text.length, 0);
    expect(plan.characters).toBe(naturalChars);
  });

  it('a stretched clip is rebuilt from the stored natural clip without a paid call when only it is stale', async () => {
    const f = fakes();
    await buildClips((await planBuild(specs, voice, f.store)).toBuild, voice, f);
    f.files.delete(specs[0].slot); // lose one slow clip
    const plan = await planBuild(specs, voice, f.store);
    expect(plan.toBuild.map((s) => s.slot)).toEqual([specs[0].slot]);
    expect(plan.estimateGbp).toBe(0);
    const before = f.calls.length;
    const report = await buildClips(plan.toBuild, voice, f);
    expect(report.built).toHaveLength(1);
    expect(f.calls).toHaveLength(before);
  });

  it('says so, and spends nothing, when a stretched clip has no natural clip to come from', async () => {
    const f = fakes();
    const report = await buildClips([specs[0]], voice, f);
    expect(report.failed[0].status).toBe('no_natural_clip');
    expect(f.calls).toHaveLength(0);
  });

  it('rerunning with unchanged text pays for nothing and writes no new files', async () => {
    const f = fakes();
    await buildClips((await planBuild(specs, voice, f.store)).toBuild, voice, f);
    const before = f.files.size;
    const again = await planBuild(specs, voice, f.store);
    expect(again.toBuild).toHaveLength(0);
    expect(again.estimateGbp).toBe(0);
    await buildClips(again.toBuild, voice, f);
    expect(f.calls).toHaveLength(2); // still only the first run's calls
    expect(f.files.size).toBe(before);
  });

  it('rebuilds only the clip whose text changed', async () => {
    const f = fakes();
    await buildClips((await planBuild(specs, voice, f.store)).toBuild, voice, f);
    const edited = [...specs];
    edited[1] = { ...edited[1], text: edited[1].text + ' hoy', slot: slotFor(edited[1].text + ' hoy', edited[1].speed) };
    const plan = await planBuild(edited, voice, f.store);
    expect(plan.toBuild.map((s) => s.slot)).toEqual([edited[1].slot]);
  });

  it('marks clips stale when the voice or model changes, and only then', async () => {
    const f = fakes();
    await buildClips((await planBuild(specs, voice, f.store)).toBuild, voice, f);
    expect((await planBuild(specs, { ...voice, voiceId: 'other' }, f.store)).toBuild).toHaveLength(6);
    expect((await planBuild(specs, { ...voice, model: 'm2' }, f.store)).toBuild).toHaveLength(6);
    expect((await planBuild(specs, voice, f.store)).toBuild).toHaveLength(0);
  });

  it('--force rebuilds even unchanged clips', async () => {
    const f = fakes();
    await buildClips((await planBuild(specs, voice, f.store)).toBuild, voice, f);
    expect((await planBuild(specs, voice, f.store, true)).toBuild).toHaveLength(6);
  });

  it('stops spending the moment the cap is reached', async () => {
    const f = fakes(0.01); // room for only one short clip
    const report = await buildClips(specs, voice, f);
    expect(report.failed.at(-1)?.status).toBe('cap_reached');
    expect(f.calls.length).toBeLessThan(2);
  });

  it('stores a valid timeline with words, loudness and a feeling track beside each clip', async () => {
    const f = fakes();
    await buildClips(specs, voice, f);
    for (const clip of f.files.values()) {
      expect(clip.words.length).toBeGreaterThan(0);
      expect(clip.envelope.length).toBeGreaterThan(0);
      expect(clip.feelings.length).toBeGreaterThan(0);
    }
  });

  it('never calls the provider when planning', async () => {
    const f = fakes();
    const spy = vi.spyOn(f.synth, 'synthesise');
    await planBuild(planClips(SEED_COURSE.questions, PHRASE_BANK), voice, f.store);
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('planClips: the bits of a student\'s answer (task 27.4)', () => {
  const bits = SEED_COURSE.chunks.slice(0, 3);
  const specs = planClips(SEED_COURSE.questions, PHRASE_BANK, bits);
  it('plans each course chunk at slow and normal speed, and nothing for the questions changes', () => {
    const got = specs.filter((s) => s.kind === 'bit');
    expect(got).toHaveLength(bits.length * 2);
    expect(got.map((s) => s.speed).sort()).toEqual([0.7, 0.7, 0.7, 1, 1, 1]);
    expect(specs.filter((s) => s.kind !== 'bit')).toEqual(planClips(SEED_COURSE.questions, PHRASE_BANK));
  });
  it('shares a clip when a chunk is already a phrase or question at the same speed', () => {
    const q = SEED_COURSE.questions[0];
    const again = planClips(SEED_COURSE.questions, PHRASE_BANK, [{ spanish: q.spanish, english: q.english }]);
    expect(again.filter((s) => s.text === q.spanish && s.speed === 1)).toHaveLength(1);
  });
});

describe('the ffmpeg stretcher (real ffmpeg, skipped where it is not installed)', () => {
  const have = spawnSync('ffmpeg', ['-hide_banner', '-filters']).stdout?.toString().includes('rubberband');
  it.skipIf(!have)('makes a 0.7 clip about 1/0.7 as long, as a 64 kbps MP3', async () => {
    const { ffmpegStretcher } = await import('./ffmpeg');
    // One second of a tone as WAV from ffmpeg itself, then through the stretcher.
    const src = spawnSync('ffmpeg', ['-v', 'error', '-f', 'lavfi', '-i', 'sine=frequency=220:duration=1', '-f', 'mp3', 'pipe:1'], { maxBuffer: 1e7 }).stdout;
    const slow = await ffmpegStretcher.process(src, 0.7);
    // 64 kbps is 8,000 bytes a second, so the size says how long it is.
    const seconds = slow.length / 8000;
    expect(seconds).toBeGreaterThan(1.3);
    expect(seconds).toBeLessThan(1.6);
  });
});
