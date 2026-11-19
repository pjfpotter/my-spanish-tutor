import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { GHOST_RECIPE, ffmpegGhost, gainFor, ghostArgs, ghostFilter, parseVolume } from './ffmpeg';

const hasFfmpeg = spawnSync('ffmpeg', ['-version']).status === 0;

describe('ghost recipe arguments', () => {
  const cut = { start: 0.77, end: 1.257 };
  it('picks the word, fades both edges by 10 ms, whispers it, makes it glitchy, then applies the gain', () => {
    const f = ghostFilter(cut, 4.5);
    expect(f).toContain('atrim=start=0.77:end=1.257');
    expect(f).toContain('afade=t=in:st=0:d=0.01');
    expect(f).toContain('afade=t=out:st=0.477:d=0.01');
    expect(f).toContain("afftfilt=real='hypot(re,im)*cos(2*PI*random(0))':imag='hypot(re,im)*sin(2*PI*random(0))':win_size=512:overlap=0.75");
    expect(f).toContain('aecho=');
    expect(f).toContain('acrusher=');
    expect(f).toContain('vibrato=');
    expect(f.endsWith('volume=4.5dB')).toBe(true);
    // The order matters: cut and fade before the whisper, gain last.
    const order = ['atrim', 'afade=t=in', 'afade=t=out', 'afftfilt', 'aecho', 'acrusher', 'vibrato', 'volume'].map((k) => f.indexOf(k));
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });
  it('writes 64 kbps mono MP3 like the clips, with no timestamps so a rebuild is byte for byte the same', () => {
    const a = ghostArgs(cut, 0);
    expect(a.join(' ')).toContain('-ac 1 -ar 44100 -b:a 64k');
    expect(a).toContain('+bitexact');
    expect(a.slice(a.indexOf('-f'))).toEqual(['-f', 'mp3', 'pipe:1']);
  });
  it('never fades past the start of a very short cut', () => {
    expect(ghostFilter({ start: 0, end: 0.005 }, 0)).toContain('afade=t=out:st=0:');
  });
});

describe('ghost loudness', () => {
  it('lifts a quiet word towards the target and trims a loud one', () => {
    expect(gainFor(-27.5, -15)).toBeGreaterThan(0);
    expect(gainFor(-14, -3)).toBeLessThan(0);
  });
  it('never pushes the peak past the ceiling, and stays within the limits', () => {
    const g = gainFor(-27, -4);
    expect(-4 + g).toBeLessThanOrEqual(GHOST_RECIPE.peakCeilingDb + 1e-9);
    expect(gainFor(-80, -80)).toBe(GHOST_RECIPE.maxGainDb);
    expect(gainFor(0, 0)).toBe(GHOST_RECIPE.minGainDb);
  });
  it('reads ffmpeg volume reports and rejects an empty one', () => {
    expect(parseVolume('[Parsed_volumedetect_0] mean_volume: -22.8 dB\n[x] max_volume: -5.1 dB')).toEqual({ meanDb: -22.8, maxDb: -5.1 });
    expect(() => parseVolume('nothing')).toThrow('no volume report');
  });
});

describe.skipIf(!hasFfmpeg)('real ffmpeg', () => {
  // A one second tone as an MP3, made by ffmpeg itself so the test needs no fixture file.
  const tone = (): Buffer => {
    const r = spawnSync('ffmpeg', ['-v', 'error', '-f', 'lavfi', '-i', 'sine=frequency=220:duration=1', '-f', 'lavfi', '-i', 'sine=frequency=330:duration=1', '-filter_complex', 'amix=inputs=2', '-ac', '1', '-b:a', '64k', '-f', 'mp3', 'pipe:1'], { maxBuffer: 1 << 24 });
    return r.stdout;
  };
  it('turns a cut of an MP3 into a short MP3 of about the right length, and does it identically twice', async () => {
    const src = tone();
    expect(src.length).toBeGreaterThan(1000);
    const cut = { start: 0.2, end: 0.7 };
    const a = await ffmpegGhost.make(src, cut);
    const b = await ffmpegGhost.make(src, cut);
    expect(a.length).toBeGreaterThan(500);
    expect(a.equals(b)).toBe(true);
    const probe = spawnSync('ffmpeg', ['-hide_banner', '-i', 'pipe:0', '-f', 'null', '-'], { input: a });
    const t = /time=(\d+):(\d+):([\d.]+)/g;
    let last = ''; let m: RegExpExecArray | null;
    const text = String(probe.stderr);
    while ((m = t.exec(text))) last = m[0];
    const seconds = Number(/time=(\d+):(\d+):([\d.]+)/.exec(last)![1]) * 3600 + Number(/time=(\d+):(\d+):([\d.]+)/.exec(last)![2]) * 60 + Number(/time=(\d+):(\d+):([\d.]+)/.exec(last)![3]);
    expect(seconds).toBeGreaterThan(0.4);
    expect(seconds).toBeLessThan(0.7);
  });
});
