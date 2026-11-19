import { spawn } from 'node:child_process';
import type { Stretcher } from './build.ts';
import type { GhostMaker } from './ghost.ts';

/**
 * Re-encodes a clip as 64 kbps mono MP3, changing its speed on the way without changing its pitch. This is how the slow
 * and fast clips are made (task 27.4 follow-up): ElevenLabs is asked once per text for the natural voice, and the other
 * speeds are made here, free, from that one clip. A rate of 1 just re-encodes. `rubberband` with formants kept is used
 * because it keeps speech clear at 0.7 where the simpler `atempo` filter smears it; both were compared by ear.
 */
export const ffmpegStretcher: Stretcher = {
  process(mp3, rate) {
    const filter = rate === 1 ? [] : ['-filter:a', `rubberband=tempo=${rate}:formant=preserved:transients=smooth`];
    return new Promise((resolve, reject) => {
      const p = spawn('ffmpeg', ['-v', 'error', '-i', 'pipe:0', ...filter, '-ac', '1', '-ar', '44100', '-b:a', '64k', '-f', 'mp3', 'pipe:1'], { stdio: ['pipe', 'pipe', 'pipe'] });
      const out: Buffer[] = [];
      const err: Buffer[] = [];
      p.stdout.on('data', (d: Buffer) => out.push(d));
      p.stderr.on('data', (d: Buffer) => err.push(d));
      p.on('error', (e) => reject(new Error(`could not run ffmpeg: ${e.message}`)));
      p.on('close', (code) => (code === 0 && out.length ? resolve(Buffer.concat(out)) : reject(new Error(`ffmpeg failed (${code}): ${Buffer.concat(err).toString().slice(0, 300)}`))));
      p.stdin.on('error', () => {});
      p.stdin.end(mp3);
    });
  },
};

/**
 * The ghost recipe. Every number here is a starting value to be set by ear (task 2.3 of the ghost whisper change) and then
 * frozen; changing any of them means bumping `GHOST` in `ghost.ts` so every ghost word is rebuilt.
 * - A random-phase spectral filter keeps each frequency's strength but scrambles its phase: the vowel colour survives and the
 *   pitch goes, which is what a whisper is. `random(0)` is seeded the same way every run, so a rebuild gives identical bytes.
 * - A short echo, a light bit-crush and a slow vibrato make it glitchy and haunted.
 */
export const GHOST_RECIPE = {
  /** Seconds of fade at each edge of the cut, so it does not click. */
  fade: 0.01,
  window: 512,
  overlap: 0.75,
  echo: '0.8:0.6:45:0.25',
  crush: 'bits=8:mix=0.2:mode=log:aa=1',
  vibrato: 'f=5:d=0.3',
  /** Words are brought to about this mean level, but never so loud that the peak passes the ceiling. */
  targetMeanDb: -20,
  peakCeilingDb: -1,
  maxGainDb: 12,
  minGainDb: -6,
} as const;

/** The audio filter for one cut: pick the word, fade the edges, whisper it, make it glitchy, then apply a gain. */
export function ghostFilter(cut: { start: number; end: number }, gainDb = 0, r = GHOST_RECIPE): string {
  const dur = Math.round((cut.end - cut.start) * 1000) / 1000;
  const fadeOutAt = Math.max(0, Math.round((dur - r.fade) * 1000) / 1000);
  return [
    `atrim=start=${cut.start}:end=${cut.end}`,
    'asetpts=PTS-STARTPTS',
    `afade=t=in:st=0:d=${r.fade}`,
    `afade=t=out:st=${fadeOutAt}:d=${r.fade}`,
    `afftfilt=real='hypot(re,im)*cos(2*PI*random(0))':imag='hypot(re,im)*sin(2*PI*random(0))':win_size=${r.window}:overlap=${r.overlap}`,
    `aecho=${r.echo}`,
    `acrusher=${r.crush}`,
    `vibrato=${r.vibrato}`,
    `volume=${Math.round(gainDb * 100) / 100}dB`,
  ].join(',');
}

/** The ffmpeg arguments that write the final ghost MP3 (64 kbps mono, like the clips) from an MP3 on stdin. */
export function ghostArgs(cut: { start: number; end: number }, gainDb: number, r = GHOST_RECIPE): string[] {
  return ['-v', 'error', '-i', 'pipe:0', '-filter:a', ghostFilter(cut, gainDb, r), '-ac', '1', '-ar', '44100', '-b:a', '64k', '-fflags', '+bitexact', '-flags:a', '+bitexact', '-map_metadata', '-1', '-f', 'mp3', 'pipe:1'];
}

/** How much louder or quieter to make a word: towards the target mean, never past the peak ceiling, within the limits. */
export function gainFor(meanDb: number, maxDb: number, r = GHOST_RECIPE): number {
  const wanted = Math.min(r.targetMeanDb - meanDb, r.peakCeilingDb - maxDb);
  return Math.round(Math.max(r.minGainDb, Math.min(r.maxGainDb, wanted)) * 100) / 100;
}

/** Reads the mean and peak level (dB) out of ffmpeg's `volumedetect` report. */
export function parseVolume(report: string): { meanDb: number; maxDb: number } {
  const mean = /mean_volume:\s*(-?[\d.]+) dB/.exec(report);
  const max = /max_volume:\s*(-?[\d.]+) dB/.exec(report);
  if (!mean || !max) throw new Error('ffmpeg gave no volume report for the ghost word');
  return { meanDb: Number(mean[1]), maxDb: Number(max[1]) };
}

function run(args: string[], input: Buffer): Promise<{ out: Buffer; err: string }> {
  return new Promise((resolve, reject) => {
    const p = spawn('ffmpeg', args, { stdio: ['pipe', 'pipe', 'pipe'] });
    const out: Buffer[] = [];
    const err: Buffer[] = [];
    p.stdout.on('data', (d: Buffer) => out.push(d));
    p.stderr.on('data', (d: Buffer) => err.push(d));
    p.on('error', (e) => reject(new Error(`could not run ffmpeg: ${e.message}`)));
    p.on('close', (code) => (code === 0 ? resolve({ out: Buffer.concat(out), err: Buffer.concat(err).toString() }) : reject(new Error(`ffmpeg failed (${code}): ${Buffer.concat(err).toString().slice(0, 300)}`))));
    p.stdin.on('error', () => {});
    p.stdin.end(input);
  });
}

/**
 * Makes a ghost word from a clip's MP3. Two passes of the same recipe: the first measures how loud the whisper comes out,
 * the second applies the gain that brings every word to a similar level. Both passes give the same sound, because the
 * random phases are seeded identically. Local and free: no service is called.
 */
export const ffmpegGhost: GhostMaker = {
  async make(mp3, cut) {
    const measured = await run(['-v', 'info', '-i', 'pipe:0', '-filter:a', `${ghostFilter(cut, 0)},volumedetect`, '-f', 'null', '-'], mp3);
    const { meanDb, maxDb } = parseVolume(measured.err);
    const { out } = await run(ghostArgs(cut, gainFor(meanDb, maxDb)), mp3);
    if (!out.length) throw new Error('ffmpeg wrote no ghost audio');
    return out;
  },
};
