import { describe, expect, it, vi } from 'vitest';
import { HAUNT, createGhostPlayer, findGhost, ghostUrl, hauntingImpulse, type GhostAudioEl, type GhostContext, type GhostDeps } from './ghost-player';

const index = [{ word: 'quiero', slot: 'aaaa11112222' }, { word: 'que', slot: 'bbbb11112222' }];
const bytes = () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) });

function fakeContext(over: Partial<GhostContext> = {}) {
  const log: string[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const node = (name: string, extra: object = {}): any => ({ connect: (to: unknown) => (log.push(`${name}->`), to), ...extra });
  const c = {
    currentTime: 0, sampleRate: 8000, destination: { dest: true },
    resume: async () => void log.push('resume'),
    decodeAudioData: async () => ({ duration: 0.01 }),
    createBuffer: (_c: number, n: number) => ({ getChannelData: () => new Float32Array(n) }),
    createBufferSource: () => { const s = node('src', { buffer: null, detune: { value: 0 }, onended: null as (() => void) | null, start() { log.push('start'); setTimeout(() => s.onended?.(), 0); } }); return s; },
    createConvolver: () => node('room', { buffer: null }),
    createGain: () => node('gain', { gain: { value: 1, setValueAtTime: () => void log.push('flicker') } }),
    ...over,
  } as unknown as GhostContext;
  return { c, log };
}
const audioEl = (play: () => Promise<void> = async () => {}): GhostAudioEl => {
  const el: GhostAudioEl = { onended: null, onerror: null, play: async () => { await play(); setTimeout(() => el.onended?.(), 0); } };
  return el;
};
const deps = (over: Partial<GhostDeps> = {}): GhostDeps => ({
  index, fetchImpl: vi.fn(async () => bytes()), makeContext: () => fakeContext().c, makeAudio: () => audioEl(), random: () => 0.5, ...over,
});

describe('finding a ghost word', () => {
  it('looks a word up the way scoring spells it: accents, case and punctuation do not matter', () => {
    expect(findGhost('Quiero,', index)).toBe('aaaa11112222');
    expect(findGhost('¿Qué?', index)).toBe('bbbb11112222');
    expect(findGhost('nada', index)).toBeNull();
    expect(findGhost('...', index)).toBeNull();
    expect(ghostUrl('aaaa11112222')).toBe('/audio/ghost/aaaa11112222.mp3');
  });
});

describe('the ghost player', () => {
  it('fetches nothing until the student taps, and nothing for a word with no ghost file', async () => {
    const fetchImpl = vi.fn(async () => bytes());
    const p = createGhostPlayer(deps({ fetchImpl }));
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(p.has('quiero')).toBe(true);
    expect(p.has('nada')).toBe(false);
    expect(await p.play('nada')).toBe('none');
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(await p.play('quiero')).toBe('haunted');
    expect(fetchImpl).toHaveBeenCalledWith('/audio/ghost/aaaa11112222.mp3');
  });
  it('plays through the haunting chain (detune, reverb, flicker) and remembers the decoded word', async () => {
    const { c, log } = fakeContext();
    const fetchImpl = vi.fn(async () => bytes());
    const p = createGhostPlayer(deps({ fetchImpl, makeContext: () => c }));
    expect(await p.play('quiero')).toBe('haunted');
    expect(await p.play('quiero')).toBe('haunted');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(log).toContain('resume');
    expect(log).toContain('start');
    expect(log.filter((l) => l === 'flicker').length).toBe(HAUNT.flickerSteps * 2);
  });
  it('plays the plain file when there is no Web Audio', async () => {
    const fetchImpl = vi.fn(async () => bytes());
    const made: string[] = [];
    const p = createGhostPlayer(deps({ makeContext: () => null, fetchImpl, makeAudio: (u) => (made.push(u), audioEl()) }));
    expect(await p.play('quiero')).toBe('plain');
    expect(made).toEqual(['/audio/ghost/aaaa11112222.mp3']);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
  it('plays the plain file when Web Audio will not start or cannot decode', async () => {
    expect(await createGhostPlayer(deps({ makeContext: () => { throw new Error('no audio'); } })).play('quiero')).toBe('plain');
    expect(await createGhostPlayer(deps({ makeContext: () => fakeContext({ decodeAudioData: async () => { throw new Error('bad data'); } }).c })).play('quiero')).toBe('plain');
    expect(await createGhostPlayer(deps({ fetchImpl: async () => ({ ok: false, arrayBuffer: async () => new ArrayBuffer(0) }) })).play('quiero')).toBe('plain');
  });
  it('never throws, even when everything fails', async () => {
    const p = createGhostPlayer(deps({ makeContext: () => null, makeAudio: () => audioEl(async () => { throw new Error('blocked'); }) }));
    await expect(p.play('quiero')).resolves.toBe('failed');
  });
  it('can be stopped', async () => {
    const p = createGhostPlayer(deps({ makeContext: () => null, makeAudio: () => ({ onended: null, onerror: null, play: async () => {} }) }));
    const done = p.play('quiero');
    p.stop();
    await expect(done).resolves.toBe('plain');
  });
});

describe('the haunting room', () => {
  it('is a short burst of noise that dies away to nothing', () => {
    const imp = hauntingImpulse(8000, 0.5, () => 0.9);
    expect(imp).toHaveLength(4000);
    expect(Math.abs(imp[0])).toBeGreaterThan(Math.abs(imp[3000]));
    expect(Math.abs(imp[3999])).toBeLessThan(0.01);
    expect(HAUNT.wet).toBeLessThan(HAUNT.dry);
  });
});
