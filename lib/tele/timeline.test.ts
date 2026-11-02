import { describe, expect, it } from 'vitest';
import { activeWordAt, feelingsAt, loudnessAt, type ClipTimeline } from './timeline';

const clip: ClipTimeline = {
  words: [
    { text: 'Me', t0: 0.1 },
    { text: 'llamo', t0: 0.5 },
    { text: 'Tele', t0: 1.0 },
  ],
  end: 1.6,
  envelope: [0, 0.5, 1, 0.25],
  envelopeHop: 0.5,
  feelings: [
    { t0: 0, feelings: { joy: 0.5 } },
    { t0: 1.0, feelings: { surprise: 0.8 } },
  ],
};

describe('activeWordAt', () => {
  it('is null before the first word and after the clip ends', () => {
    expect(activeWordAt(clip, 0)).toBeNull();
    expect(activeWordAt(clip, 1.6)).toBeNull();
    expect(activeWordAt(clip, 5)).toBeNull();
  });

  it('finds the word being spoken, holding through gaps', () => {
    expect(activeWordAt(clip, 0.1)).toBe(0);
    expect(activeWordAt(clip, 0.49)).toBe(0);
    expect(activeWordAt(clip, 0.5)).toBe(1);
    expect(activeWordAt(clip, 0.99)).toBe(1);
    expect(activeWordAt(clip, 1.0)).toBe(2);
    expect(activeWordAt(clip, 1.59)).toBe(2);
  });

  it('follows a slower clock: half speed means the clip clock runs at half rate', () => {
    // 1.0 s of real time at half speed is 0.5 s into the clip.
    expect(activeWordAt(clip, 1.0 * 0.5)).toBe(1);
  });

  it('copes with an empty clip', () => {
    expect(activeWordAt({ words: [], end: 1 }, 0.5)).toBeNull();
  });
});

describe('feelingsAt and loudnessAt', () => {
  it('holds each feeling until the next one', () => {
    expect(feelingsAt(clip, 0.2)).toEqual({ joy: 0.5 });
    expect(feelingsAt(clip, 1.2)).toEqual({ surprise: 0.8 });
    expect(feelingsAt({}, 1)).toBeNull();
  });

  it('reads loudness from the envelope and is silent outside the clip', () => {
    expect(loudnessAt(clip, 0.6)).toBe(0.5);
    expect(loudnessAt(clip, 1.2)).toBe(1);
    expect(loudnessAt(clip, 1.7)).toBe(0);
    expect(loudnessAt({ end: 1 }, 0.5)).toBe(0);
  });
});
