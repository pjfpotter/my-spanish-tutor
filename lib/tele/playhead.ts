import type { Feelings } from './feelings';
import { activeWordAt, feelingsAt, loudnessAt, type ClipTimeline } from './timeline';

export interface Playhead {
  /** Index of the word being spoken, or null. */
  activeIndex: number | null;
  feelings: Feelings | null;
  /** 0 to 1, drives Tele's glow. */
  loudness: number;
}

/**
 * What the caption, glow and feelings should show at clip time `t`. `t` is the audio element's
 * own `currentTime`, which counts seconds of the clip, not seconds on the wall: at half speed it
 * advances half as fast, so the timeline needs no scaling and cannot drift (design D7).
 */
export function playheadAt(timeline: ClipTimeline, t: number): Playhead {
  return { activeIndex: activeWordAt(timeline, t), feelings: feelingsAt(timeline, t), loudness: loudnessAt(timeline, t) };
}
