import { describe, expect, it } from 'vitest';
import { playheadAt } from './playhead';
import type { ClipTimeline } from './timeline';

// A 2.4 second clip: four words 0.5 s apart, a loudness envelope that is loud on even hops and
// quiet on odd ones, and a feeling change halfway.
const HOP = 0.1;
const timeline: ClipTimeline = {
  words: [{ text: 'a', t0: 0.2 }, { text: 'b', t0: 0.7 }, { text: 'c', t0: 1.2 }, { text: 'd', t0: 1.7 }],
  end: 2.4,
  envelope: Array.from({ length: 24 }, (_, i) => (i % 2 === 0 ? 0.9 : 0.1)),
  envelopeHop: HOP,
  feelings: [{ t0: 0, feelings: { joy: 0.5 } }, { t0: 1.2, feelings: { surprise: 0.8 } }],
};

/** A fake audio element: its clock counts seconds of the clip, advancing `rate` clip-seconds per wall-second. */
const fakeAudioClock = (rate: number) => (wallSeconds: number) => wallSeconds * rate;

describe.each([1, 0.75, 0.5])('playback at %s×', (rate) => {
  const clock = fakeAudioClock(rate);
  const FRAME = 1 / 60;

  it('highlights each word when it is spoken, however slowly the clip plays', () => {
    const startedAt = new Map<number, number>();
    for (let wall = 0; wall < (timeline.end / rate) + 0.5; wall += FRAME) {
      const { activeIndex } = playheadAt(timeline, clock(wall));
      if (activeIndex !== null && !startedAt.has(activeIndex)) startedAt.set(activeIndex, wall);
    }
    timeline.words.forEach((w, i) => {
      // On the wall clock the word starts at t0 / rate, to within one animation frame.
      expect(Math.abs(startedAt.get(i)! - w.t0 / rate)).toBeLessThanOrEqual(FRAME + 1e-9);
    });
  });

  it('keeps the glow in step with the sound: loudness read at clip time matches the envelope', () => {
    for (let wall = 0.05; wall < timeline.end / rate - 0.05; wall += 0.037) {
      const t = clock(wall);
      const expected = timeline.envelope![Math.floor(t / HOP)];
      expect(playheadAt(timeline, t).loudness).toBe(expected);
    }
  });

  it('changes feeling at the same point in the clip', () => {
    const wallAtChange = 1.2 / rate;
    expect(playheadAt(timeline, clock(wallAtChange - 0.02)).feelings).toEqual({ joy: 0.5 });
    expect(playheadAt(timeline, clock(wallAtChange + 0.02)).feelings).toEqual({ surprise: 0.8 });
  });

  it('shows nothing before the first word and after the clip ends', () => {
    expect(playheadAt(timeline, clock(0)).activeIndex).toBeNull();
    const after = playheadAt(timeline, clock(timeline.end / rate + 0.1));
    expect(after.activeIndex).toBeNull();
    expect(after.loudness).toBe(0);
  });
});
