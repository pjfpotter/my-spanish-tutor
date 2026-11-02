import { beforeEach, describe, expect, it, vi } from 'vitest';

// Any attempt to write the clip to disk would go through these. They must stay uncalled.
const fsWrites = vi.hoisted(() => ({
  writeFile: vi.fn(),
  appendFile: vi.fn(),
  createWriteStream: vi.fn(),
  mkdtemp: vi.fn(),
}));
vi.mock('node:fs/promises', () => ({ ...fsWrites, default: fsWrites }));
vi.mock('node:fs', () => ({ createWriteStream: fsWrites.createWriteStream, default: fsWrites }));

import { createCostRouter, RATE_LIMITED_MESSAGE } from '../cost-router/router';
import type { CostEntry, CostStore, ServiceLimits } from '../cost-router/types';
import { createOpenAiTranscriber } from './openai';
import { createClipTranscriber, MAX_CLIP_BYTES, MAX_CLIP_MS, TRANSCRIPTION_SERVICE, type Transcriber } from './transcribe';

const limits: Record<string, ServiceLimits> = {
  [TRANSCRIPTION_SERVICE]: { capGbp: 0.01, periodMs: 86_400_000, rate: { max: 2, windowMs: 60_000 } },
};

function memoryStore() {
  const rows: CostEntry[] = [];
  const store: CostStore = {
    async spentSince(service) {
      return rows.filter((r) => r.service === service).reduce((s, r) => s + r.estimatedCostGbp, 0);
    },
    async callsSince(profileId, service) {
      return rows.filter((r) => r.profileId === profileId && r.service === service && ['ok', 'error'].includes(r.outcome))
        .length;
    },
    async log(e) {
      rows.push(e);
    },
  };
  return { store, rows };
}

const clip = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
const input = { clip, mimeType: 'audio/webm;codecs=opus', durationMs: 3200, profileId: 'p1' };

function setup(transcriber?: Transcriber, costPerSecondGbp = 0.001) {
  const { store, rows } = memoryStore();
  const fake: Transcriber = transcriber ?? { transcribe: vi.fn(async () => ({ text: 'me llamo ana', confidence: 0.9 })) };
  const transcribeClip = createClipTranscriber({ route: createCostRouter(store, limits), transcriber: fake, costPerSecondGbp });
  return { transcribeClip, rows, fake };
}

beforeEach(() => vi.clearAllMocks());

describe('server-side transcription fallback', () => {
  it('goes through the cost router: speech tier, logged size and cost against the profile', async () => {
    const { transcribeClip, rows, fake } = setup();
    const result = await transcribeClip(input);

    expect(result).toEqual({ status: 'ok', text: 'me llamo ana', confidence: 0.9 });
    expect(fake.transcribe).toHaveBeenCalledWith(clip, { mimeType: 'audio/webm;codecs=opus', language: 'es' });
    expect(rows).toEqual([
      {
        service: TRANSCRIPTION_SERVICE, tier: 'speech', units: 4, estimatedCostGbp: 0.004,
        courseId: null, profileId: 'p1', outcome: 'ok',
      },
    ]);
  });

  it('never stores the clip: no disk writes and nothing but numbers in the cost log', async () => {
    const { transcribeClip, rows } = setup();
    await transcribeClip(input);
    await transcribeClip({ ...input, profileId: 'p2' });

    for (const write of Object.values(fsWrites)) expect(write).not.toHaveBeenCalled();
    for (const row of rows) {
      expect(Object.keys(row).sort()).toEqual(
        ['courseId', 'estimatedCostGbp', 'outcome', 'profileId', 'service', 'tier', 'units'],
      );
      expect(Object.values(row).some((v) => v instanceof Uint8Array || (v !== null && typeof v === 'object'))).toBe(false);
    }
  });

  it('does not keep the clip in the result it returns', async () => {
    const { transcribeClip } = setup();
    const result = await transcribeClip(input);
    expect(JSON.stringify(result)).not.toContain('[1,2,3');
    expect(Object.values(result).some((v) => v instanceof Uint8Array)).toBe(false);
  });

  it('is unavailable, not wrong, when the cap is reached, and does not call the vendor', async () => {
    const { transcribeClip, rows, fake } = setup(undefined, 0.01); // each call is estimated at 0.04
    const result = await transcribeClip(input);

    expect(result).toEqual({ status: 'unavailable', reason: 'cap_reached' });
    expect(fake.transcribe).not.toHaveBeenCalled();
    expect(rows[0].outcome).toBe('cap_reached');
  });

  it('is unavailable and logs an error when the vendor fails', async () => {
    const failing: Transcriber = { transcribe: vi.fn(async () => { throw new Error('boom'); }) };
    const { transcribeClip, rows } = setup(failing);
    const result = await transcribeClip(input);

    expect(result).toEqual({ status: 'unavailable', reason: 'failed' });
    expect(rows[0].outcome).toBe('error');
  });

  it('rate-limits a profile with the friendly message', async () => {
    const { transcribeClip } = setup();
    await transcribeClip(input);
    await transcribeClip(input);
    const result = await transcribeClip(input);

    expect(result).toEqual({ status: 'rate_limited', message: RATE_LIMITED_MESSAGE, retryAfterMs: 60_000 });
  });

  it.each([
    ['not audio', { ...input, mimeType: 'text/plain' }],
    ['empty clip', { ...input, clip: new Uint8Array() }],
    ['clip too large', { ...input, clip: new Uint8Array(MAX_CLIP_BYTES + 1) }],
    ['clip too long', { ...input, durationMs: MAX_CLIP_MS + 1 }],
    ['clip too long', { ...input, durationMs: Number.NaN }],
  ])('rejects %s before any paid call', async (reason, bad) => {
    const { transcribeClip, rows, fake } = setup();
    expect(await transcribeClip(bad)).toEqual({ status: 'rejected', reason });
    expect(fake.transcribe).not.toHaveBeenCalled();
    expect(rows).toHaveLength(0);
  });
});

describe('OpenAI transcriber adapter', () => {
  it('posts the clip as multipart Spanish audio and returns the trimmed text', async () => {
    const fetchImpl = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const form = init?.body as FormData;
      expect(form.get('language')).toBe('es');
      expect(form.get('model')).toBe('gpt-4o-mini-transcribe');
      expect((form.get('file') as File).name).toBe('clip.webm');
      return Response.json({ text: ' vivo en madrid ' });
    });
    const t = createOpenAiTranscriber('key', undefined, fetchImpl as unknown as typeof fetch);

    expect(await t.transcribe(clip, { mimeType: 'audio/webm;codecs=opus', language: 'es' })).toEqual({
      text: 'vivo en madrid', confidence: null,
    });
    expect((fetchImpl.mock.calls[0][1]?.headers as Record<string, string>).Authorization).toBe('Bearer key');
  });

  it('throws on a failed request so the router can fall back', async () => {
    const fetchImpl = vi.fn(async () => new Response('no', { status: 500 }));
    const t = createOpenAiTranscriber('key', undefined, fetchImpl as unknown as typeof fetch);
    await expect(t.transcribe(clip, { mimeType: 'audio/webm', language: 'es' })).rejects.toThrow('500');
  });
});
