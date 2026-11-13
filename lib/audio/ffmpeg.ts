import { spawn } from 'node:child_process';
import type { Stretcher } from './build.ts';

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
