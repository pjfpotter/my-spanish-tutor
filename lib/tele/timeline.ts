import type { Feelings } from './feelings';

/** One spoken word and when it starts, in seconds from the start of the clip. */
export interface WordTime {
  text: string;
  t0: number;
}

/**
 * What ships beside each tutor clip (design D7): word times for the caption, a loudness
 * envelope for the glow, and a feeling track. Generated at build time (task 4.4).
 * Tele has no mouth, so there are no mouth shapes in here.
 */
export interface ClipTimeline {
  words: WordTime[];
  /** Seconds when the clip ends. */
  end: number;
  /** Loudness 0 to 1, one value per `envelopeHop` seconds. Optional until 4.4. */
  envelope?: number[];
  envelopeHop?: number;
  /** Feeling changes over the clip, each holding until the next. */
  feelings?: { t0: number; feelings: Feelings }[];
}

/**
 * The index of the word being spoken at time `t`, or null before the first word or after the
 * clip ends. A word stays active through the gap until the next one starts, so the caption
 * does not flicker between words. `t` is the audio clock scaled by playback speed.
 */
export function activeWordAt(timeline: Pick<ClipTimeline, 'words' | 'end'>, t: number): number | null {
  const { words, end } = timeline;
  if (!words.length || t < words[0].t0 || t >= end) return null;
  let lo = 0;
  let hi = words.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (words[mid].t0 <= t) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

/** The feelings in force at time `t`, or null when the clip has no feeling track. */
export function feelingsAt(timeline: Pick<ClipTimeline, 'feelings'>, t: number): Feelings | null {
  const track = timeline.feelings;
  if (!track?.length) return null;
  let current: Feelings | null = null;
  for (const step of track) {
    if (step.t0 <= t) current = step.feelings;
    else break;
  }
  return current;
}

/** Loudness at time `t`, 0 when there is no envelope or the clip is over. */
export function loudnessAt(timeline: Pick<ClipTimeline, 'envelope' | 'envelopeHop' | 'end'>, t: number): number {
  const { envelope, envelopeHop } = timeline;
  if (!envelope?.length || !envelopeHop || t < 0 || t >= timeline.end) return 0;
  return envelope[Math.min(envelope.length - 1, Math.floor(t / envelopeHop))] ?? 0;
}
