import { normaliseWord } from '../speech/score';
import ghostIndex from './built-ghost';

/**
 * The ghost whisper player core (ghost whisper change, task 4.1), kept free of React and of Node so it can be tested and bundled. A ghost word is a short MP3 built ahead of time from Tele's own
 * slow clips (`npm run build-audio`). It is fetched only when the student taps Whisper, and played through Web Audio with a
 * light haunting layer (a little reverb, a slight detune, a flicker). If Web Audio is missing or fails it plays the plain file,
 * and if that fails too nothing happens: `play` never throws and never blocks the game.
 */

export type GhostIndex = readonly { word: string; slot: string }[];
export const ghostUrl = (slot: string): string => `/audio/ghost/${slot}.mp3`;

/** The slot of a word's ghost file, or null when there is none. The word is looked up as scoring normalises it. */
export function findGhost(word: string, index: GhostIndex = ghostIndex): string | null {
  const w = normaliseWord(word);
  return (w && index.find((e) => e.word === w)?.slot) || null;
}

/** What happened to a tap: played hauntingly, played plainly, nothing to play, or playing failed. */
export type WhisperResult = 'haunted' | 'plain' | 'none' | 'failed';

/** The slice of Web Audio the player uses, so tests can stand in for it. */
export interface GhostContext {
  readonly currentTime: number;
  readonly sampleRate: number;
  readonly destination: unknown;
  resume(): Promise<void>;
  decodeAudioData(data: ArrayBuffer): Promise<GhostBuffer>;
  createBuffer(channels: number, length: number, sampleRate: number): { getChannelData(c: number): Float32Array };
  createBufferSource(): GhostNode & { buffer: unknown; detune: { value: number }; start(when?: number): void; onended: (() => void) | null };
  createConvolver(): GhostNode & { buffer: unknown };
  createGain(): GhostNode & { gain: { value: number; setValueAtTime(v: number, t: number): void } };
}
export interface GhostBuffer { readonly duration: number }
interface GhostNode { connect<T>(to: T): T }
export interface GhostAudioEl { play(): Promise<void>; onended: (() => void) | null; onerror: (() => void) | null }

export interface GhostDeps {
  index: GhostIndex;
  fetchImpl: (url: string) => Promise<{ ok: boolean; arrayBuffer(): Promise<ArrayBuffer> }>;
  /** Makes the AudioContext, or returns null when the browser has none. May throw. */
  makeContext: () => GhostContext | null;
  makeAudio: (url: string) => GhostAudioEl;
  random?: () => number;
}

/** A short decaying burst of noise: the room the whisper sits in. */
export function hauntingImpulse(sampleRate: number, seconds: number, random: () => number = Math.random): Float32Array {
  const n = Math.max(1, Math.floor(sampleRate * seconds));
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = (random() * 2 - 1) * (1 - i / n) ** 3;
  return out;
}

/** How much of the reverb is heard, how far the voice is pulled down in cents, and how the volume flickers. Light on purpose. */
export const HAUNT = { wet: 0.35, dry: 0.9, detuneCents: -80, flicker: 0.12, flickerSteps: 6, impulseSeconds: 0.7 } as const;

export function createGhostPlayer(deps: GhostDeps) {
  const random = deps.random ?? Math.random;
  const decoded = new Map<string, GhostBuffer>();
  let ctx: GhostContext | null | undefined;
  let current: { stop: () => void } | null = null;

  const context = (): GhostContext | null => {
    if (ctx !== undefined) return ctx;
    try { ctx = deps.makeContext(); } catch { ctx = null; }
    return ctx;
  };

  async function haunted(slot: string, c: GhostContext): Promise<void> {
    await c.resume();
    let buf = decoded.get(slot);
    if (!buf) {
      const res = await deps.fetchImpl(ghostUrl(slot));
      if (!res.ok) throw new Error('no ghost file');
      buf = await c.decodeAudioData(await res.arrayBuffer());
      decoded.set(slot, buf);
    }
    const src = c.createBufferSource();
    src.buffer = buf;
    src.detune.value = HAUNT.detuneCents;
    const room = c.createConvolver();
    const impulse = hauntingImpulse(c.sampleRate, HAUNT.impulseSeconds, random);
    const room0 = c.createBuffer(1, impulse.length, c.sampleRate);
    room0.getChannelData(0).set(impulse);
    room.buffer = room0;
    const dry = c.createGain();
    dry.gain.value = HAUNT.dry;
    const wet = c.createGain();
    wet.gain.value = HAUNT.wet;
    const flicker = c.createGain();
    // A few quick dips in volume across the word, so it wavers as if the signal is bad.
    const t0 = c.currentTime;
    for (let i = 0; i < HAUNT.flickerSteps; i++) flicker.gain.setValueAtTime(1 - random() * HAUNT.flicker, t0 + (i * buf.duration) / HAUNT.flickerSteps);
    src.connect(dry).connect(flicker);
    src.connect(room).connect(wet).connect(flicker);
    flicker.connect(c.destination);
    await new Promise<void>((resolve) => {
      const done = () => resolve();
      src.onended = done;
      current = { stop: done };
      src.start();
      setTimeout(done, buf!.duration * 1000 / 1 + 600); // a source that never ends must not hold the game
    });
  }

  async function plain(slot: string): Promise<void> {
    const el = deps.makeAudio(ghostUrl(slot));
    await new Promise<void>((resolve, reject) => {
      el.onended = () => resolve();
      el.onerror = () => reject(new Error('ghost audio failed'));
      current = { stop: () => resolve() };
      el.play().catch(reject);
      setTimeout(resolve, 6000);
    });
  }

  return {
    has: (word: string) => findGhost(word, deps.index) !== null,
    /** Plays the word's ghost whisper. Never throws. */
    async play(word: string): Promise<WhisperResult> {
      const slot = findGhost(word, deps.index);
      if (!slot) return 'none';
      const c = context();
      if (c) {
        try { await haunted(slot, c); return 'haunted'; } catch { /* Web Audio failed: the plain file is next */ }
      }
      try { await plain(slot); return 'plain'; } catch { return 'failed'; }
    },
    stop() { current?.stop(); current = null; },
  };
}
