import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { parseClipFile } from './clip';
import { CLIP_IDS, clipUrls, loadClip } from './clips';

const publicDir = path.join(import.meta.dirname, '../../public');
const readClip = (id: string) => JSON.parse(readFileSync(path.join(publicDir, 'audio/tele', `${id}.json`), 'utf8'));

describe('clip loading', () => {
  it('builds the audio and timeline urls', () => {
    expect(clipUrls('hola')).toEqual({ audio: '/audio/tele/hola.mp3', json: '/audio/tele/hola.json' });
  });

  it('loads and checks a clip', async () => {
    const fetchImpl = vi.fn(async () => Response.json(readClip('hola')));
    const clip = await loadClip('hola', fetchImpl as unknown as typeof fetch);
    expect(clip.id).toBe('hola');
    expect(fetchImpl).toHaveBeenCalledWith('/audio/tele/hola.json');
  });

  it('throws plainly when the clip is missing or malformed', async () => {
    const missing = vi.fn(async () => new Response('', { status: 404 }));
    await expect(loadClip('nope', missing as unknown as typeof fetch)).rejects.toThrow('not found (404)');
    const bad = vi.fn(async () => Response.json({ id: 'x' }));
    await expect(loadClip('x', bad as unknown as typeof fetch)).rejects.toThrow();
  });
});

describe('built clips', () => {
  it.each([...CLIP_IDS])('%s has an audio file and a valid timeline with a baked feeling', (id) => {
    const clip = parseClipFile(readClip(id));
    expect(clip.id).toBe(id);
    expect(clip.feelings.length).toBeGreaterThan(0);
    expect(clip.source.provider).toBe('elevenlabs');
    const mp3 = readFileSync(path.join(publicDir, 'audio/tele', `${id}.mp3`));
    expect(mp3.length).toBeGreaterThan(1000);
    // The audio ends close to the timeline end: an mp3 frame is about 26 ms.
    expect(clip.end).toBeGreaterThan(clip.words.at(-1)!.t0);
    expect(clip.envelope.length * clip.envelopeHop).toBeGreaterThanOrEqual(clip.end - 0.1);
  });

  it('speaks Spanish with an English subtitle that is different text', () => {
    for (const id of CLIP_IDS) {
      const clip = parseClipFile(readClip(id));
      expect(clip.text).not.toBe(clip.en);
    }
  });
});
