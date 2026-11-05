import { describe, expect, it, vi } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { buildClips, TTS_SERVICE } from '../audio/build';
import { setUpCourse, SETUP_SERVICE } from '../coach/setup';
import { SEED_COURSE } from '../course/seed';
import { createClipTranscriber, TRANSCRIPTION_SERVICE } from '../transcription/transcribe';
import { SERVICE_FALLBACKS, SERVICE_LIMITS } from './limits';
import { createCostRouter } from './router';
import type { CostEntry, CostStore } from './types';

/** A store that says the cap is already used up, and keeps what the router logs. */
function exhausted(service: string) {
  const log: CostEntry[] = [];
  const store: CostStore = {
    spentSince: async (s) => (s === service ? SERVICE_LIMITS[service].capGbp : 0),
    callsSince: async () => 0,
    log: async (e) => void log.push(e),
  };
  return { store, log };
}

describe('every paid service has a cap and a fallback (task 14.1)', () => {
  it('has a registry entry and a stated fallback for each service the code uses', () => {
    const found = new Set<string>();
    const walk = (dir: string) => {
      for (const f of readdirSync(dir)) {
        const full = path.join(dir, f);
        if (statSync(full).isDirectory()) { if (f !== 'node_modules') walk(full); continue; }
        if (!/\.(ts|tsx|mjs)$/.test(f) || /\.test\./.test(f)) continue;
        for (const m of readFileSync(full, 'utf8').matchAll(/_SERVICE\s*=\s*'([^']+)'/g)) found.add(m[1]);
      }
    };
    for (const d of ['lib', 'app', 'scripts']) walk(path.join(process.cwd(), d));
    expect([...found].sort()).toEqual([SETUP_SERVICE, TRANSCRIPTION_SERVICE, TTS_SERVICE].sort());
    for (const s of found) {
      expect(SERVICE_LIMITS[s], s).toBeDefined();
      expect(SERVICE_LIMITS[s].capGbp).toBeGreaterThan(0);
      expect(SERVICE_FALLBACKS[s], s).toMatch(/\w/);
    }
  });

  it('transcription: at the cap, the paid call is not made and the attempt is "unavailable" (a free retry), and the refusal is logged', async () => {
    const { store, log } = exhausted(TRANSCRIPTION_SERVICE);
    const transcribe = vi.fn();
    const run = createClipTranscriber({ route: createCostRouter(store, SERVICE_LIMITS), transcriber: { transcribe }, costPerSecondGbp: 0.0001 });
    const r = await run({ clip: new Uint8Array([1, 2, 3]), mimeType: 'audio/webm', durationMs: 2000, profileId: 'p1' });
    expect(r).toMatchObject({ status: 'unavailable', reason: 'cap_reached' });
    expect(transcribe).not.toHaveBeenCalled();
    expect(log).toEqual([expect.objectContaining({ service: TRANSCRIPTION_SERVICE, outcome: 'cap_reached', estimatedCostGbp: 0 })]);
  });

  it('audio build: at the cap, nothing is synthesised, the build stops and the refusal is logged', async () => {
    const { store, log } = exhausted(TTS_SERVICE);
    const synth = { synthesise: vi.fn() };
    const specs = [1, 2, 3].map((n) => ({ slot: `s${n}`, label: `clip ${n}`, text: 'Hola', en: 'Hi', speed: 1, feelings: [] }));
    const report = await buildClips(specs as never, { provider: 'x', voiceId: 'v', model: 'm' }, {
      synth: synth as never, decoder: { decode: vi.fn() } as never, store: { read: vi.fn(), write: vi.fn() } as never, route: createCostRouter(store, SERVICE_LIMITS),
    });
    expect(synth.synthesise).not.toHaveBeenCalled();
    expect(report.built).toEqual([]);
    expect(report.failed).toEqual([{ label: 'clip 1', status: 'cap_reached' }]); // stopped at the first refusal
    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject({ service: TTS_SERVICE, outcome: 'cap_reached' });
  });

  it('course set-up: at the cap, no model call is made, there are no drafts, and the refusal is logged', async () => {
    const { store, log } = exhausted(SETUP_SERVICE);
    const callModel = vi.fn();
    const r = await setUpCourse({ route: createCostRouter(store, SERVICE_LIMITS), course: SEED_COURSE, courseId: 'c1', estimateGbp: 0.05, callModel });
    expect(callModel).not.toHaveBeenCalled();
    expect(r).toMatchObject({ source: 'none', reason: 'cap_reached', modelAnswers: [] });
    expect(log[0]).toMatchObject({ service: SETUP_SERVICE, outcome: 'cap_reached' });
  });

  it('the router refuses a service with no configured cap', async () => {
    const route = createCostRouter(exhausted('x').store, SERVICE_LIMITS);
    await expect(route({ service: 'surprise', tier: 'speech', estimateGbp: 0, call: async () => ({ value: 1, units: 1, costGbp: 0 }), fallback: () => null })).rejects.toThrow(/No spend cap/);
  });
});
