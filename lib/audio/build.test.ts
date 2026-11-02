import { describe, expect, it, vi } from 'vitest';
import { createCostRouter } from '../cost-router/router';
import type { CostEntry, CostStore } from '../cost-router/types';
import type { ClipFile } from '../tele/clip';
import { PHRASE_BANK } from '../tele/phrase-bank';
import { SEED_COURSE } from '../course/seed';
import { buildClips, estimateFor, planBuild, type ClipStore, type Synthesiser, type Voice } from './build';
import { planClips, slotFor, SPEEDS } from './manifest';

const voice: Voice = { provider: 'test', voiceId: 'v1', model: 'm1' };

function fakes(capGbp = 5) {
  const files = new Map<string, ClipFile>();
  const store: ClipStore = { read: async (s) => files.get(s) ?? null, write: async (s, _m, c) => void files.set(s, c) };
  const calls: { text: string; speed: number }[] = [];
  const synth: Synthesiser = {
    synthesise: async (text, speed) => {
      calls.push({ text, speed });
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
  return { files, store, calls, synth, decoder, log, route };
}

describe('planClips', () => {
  const specs = planClips(SEED_COURSE.questions, PHRASE_BANK);

  it('plans every question at slow, normal and fast, and every phrase-bank line once', () => {
    expect(specs.filter((s) => s.kind === 'question')).toHaveLength(5 * 3);
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
  const specs = planClips(SEED_COURSE.questions, PHRASE_BANK).slice(0, 4);

  it('a dry run plans and prices the work but calls nothing', async () => {
    const f = fakes();
    const plan = await planBuild(specs, voice, f.store);
    expect(plan.toBuild).toHaveLength(4);
    expect(plan.estimateGbp).toBeCloseTo(estimateFor(specs));
    expect(f.calls).toHaveLength(0);
    expect(f.log).toHaveLength(0);
  });

  it('builds missing clips through the cost router and logs each cost', async () => {
    const f = fakes();
    const plan = await planBuild(specs, voice, f.store);
    const report = await buildClips(plan.toBuild, voice, f);
    expect(report.built).toHaveLength(4);
    expect(f.calls).toHaveLength(4);
    expect(f.log.filter((e) => e.outcome === 'ok')).toHaveLength(4);
    expect(f.files.size).toBe(4);
  });

  it('rerunning with unchanged text pays for nothing and writes no new files', async () => {
    const f = fakes();
    await buildClips((await planBuild(specs, voice, f.store)).toBuild, voice, f);
    const before = f.files.size;
    const again = await planBuild(specs, voice, f.store);
    expect(again.toBuild).toHaveLength(0);
    expect(again.estimateGbp).toBe(0);
    await buildClips(again.toBuild, voice, f);
    expect(f.calls).toHaveLength(4); // still only the first run's calls
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
    expect((await planBuild(specs, { ...voice, voiceId: 'other' }, f.store)).toBuild).toHaveLength(4);
    expect((await planBuild(specs, { ...voice, model: 'm2' }, f.store)).toBuild).toHaveLength(4);
    expect((await planBuild(specs, voice, f.store)).toBuild).toHaveLength(0);
  });

  it('--force rebuilds even unchanged clips', async () => {
    const f = fakes();
    await buildClips((await planBuild(specs, voice, f.store)).toBuild, voice, f);
    expect((await planBuild(specs, voice, f.store, true)).toBuild).toHaveLength(4);
  });

  it('stops spending the moment the cap is reached', async () => {
    const f = fakes(0.01); // room for only a couple of short clips
    const report = await buildClips(specs, voice, f);
    expect(report.built.length).toBeLessThan(4);
    expect(report.failed.at(-1)?.status).toBe('cap_reached');
    expect(f.calls.length).toBe(report.built.length);
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
