import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { parseClipFile } from './clip';
import { BUILT_CLIPS, clipUrls, findClip, loadClip } from './clips';
import { slotFor } from '../audio/manifest';

const clipsDir = path.join(import.meta.dirname, '../../public/audio/clips');
const readClip = (slot: string) => JSON.parse(readFileSync(path.join(clipsDir, `${slot}.json`), 'utf8'));

describe('clip loading', () => {
  it('builds the audio and timeline urls from the slot', () => {
    expect(clipUrls('abc')).toEqual({ audio: '/audio/clips/abc.mp3', json: '/audio/clips/abc.json' });
  });

  it('finds a built clip by exact text and speed, and nothing else', () => {
    const clips = [{ slot: 's1', text: 'Hola', speed: 1 }];
    expect(findClip('Hola', 1, clips)).toBe('s1');
    expect(findClip('Hola', 0.7, clips)).toBeNull();
    expect(findClip('Adiós', 1, clips)).toBeNull();
  });

  it('loads and checks a clip', async () => {
    const slot = BUILT_CLIPS[0].slot;
    const fetchImpl = vi.fn(async () => Response.json(readClip(slot)));
    const clip = await loadClip(slot, fetchImpl as unknown as typeof fetch);
    expect(clip.id).toBe(slot);
    expect(fetchImpl).toHaveBeenCalledWith(`/audio/clips/${slot}.json`);
  });

  it('throws plainly when the clip is missing or malformed', async () => {
    const missing = vi.fn(async () => new Response('', { status: 404 }));
    await expect(loadClip('nope', missing as unknown as typeof fetch)).rejects.toThrow('not found (404)');
    const bad = vi.fn(async () => Response.json({ id: 'x' }));
    await expect(loadClip('x', bad as unknown as typeof fetch)).rejects.toThrow();
  });
});

describe('built clips', () => {
  it.each(BUILT_CLIPS.map((c) => [c.slot, c] as const))('%s has an audio file and a valid timeline with a feeling track', (slot, entry) => {
    // A bit that matches no course chunk has no English gloss, and bits are only played, never captioned.
    const clip = parseClipFile(readClip(slot), { allowNoSubtitle: true });
    expect(clip.id).toBe(slot);
    expect(slotFor(clip.text, clip.source.speed)).toBe(slot); // filed under the hash of what it says
    expect(clip.text).toBe(entry.text);
    expect(clip.feelings.length).toBeGreaterThan(0);
    expect(clip.source.provider).toBe('elevenlabs');
    expect(clip.text).not.toBe(clip.en); // Spanish speech, English only as the subtitle
    expect(readFileSync(path.join(clipsDir, `${slot}.mp3`)).length).toBeGreaterThan(1000);
    expect(clip.end).toBeGreaterThan(clip.words.at(-1)!.t0);
    expect(clip.envelope.length * clip.envelopeHop).toBeGreaterThanOrEqual(clip.end - 0.1);
  });
});
