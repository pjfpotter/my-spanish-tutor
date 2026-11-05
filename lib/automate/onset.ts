/**
 * Finding when the student starts and stops speaking from the microphone level (task 9.2). The time from
 * the end of the question to the first sound is the response time, so onset is the moment the level first
 * rose, not the moment it was confirmed. Pure: the browser feeds it a level every few milliseconds.
 */
export interface VoiceConfig {
  /** Level (0 to 1) that counts as sound, as a floor. */
  floor: number;
  /** Sound has to stay above the threshold this long before it counts as speech, so a click is ignored. */
  holdMs: number;
  /** Quiet this long after speech ends it. */
  endSilenceMs: number;
  /** Threshold is this many times the background level, if that is higher than the floor. */
  noiseFactor: number;
}

export const DEFAULT_VOICE: VoiceConfig = { floor: 0.04, holdMs: 60, endSilenceMs: 1200, noiseFactor: 3 };

/** Level of a block of 8-bit unsigned samples centred on 128, as the Web Audio analyser gives them. 0 is silence, 1 is full scale. */
export function levelOf(samples: ArrayLike<number>): number {
  if (!samples.length) return 0;
  let sum = 0;
  for (let i = 0; i < samples.length; i++) {
    const v = (samples[i] - 128) / 128;
    sum += v * v;
  }
  return Math.sqrt(sum / samples.length);
}

export type VoiceEvent = { type: 'onset'; at: number } | { type: 'end'; at: number };

export interface VoiceDetector {
  /** Feed one level reading at a time in ms. Returns an event when speech starts or ends. */
  feed(level: number, nowMs: number): VoiceEvent | null;
  /** The background level learned while not listening. */
  background(): number;
}

/** `listening` is false until the question ends: readings before then only teach the background level. */
export function createVoiceDetector(cfg: VoiceConfig = DEFAULT_VOICE): VoiceDetector & { arm(): void } {
  let bg = 0;
  let armed = false;
  let candidate: number | null = null; // when the level first rose above the threshold
  let onset: number | null = null;
  let lastLoud = 0;

  const threshold = () => Math.max(cfg.floor, bg * cfg.noiseFactor);
  return {
    arm: () => {
      armed = true;
      candidate = null;
      onset = null;
    },
    background: () => bg,
    feed(level, now) {
      if (!armed) {
        bg = bg === 0 ? level : bg * 0.9 + level * 0.1; // moving average of quiet time
        return null;
      }
      const loud = level > threshold();
      if (onset === null) {
        if (!loud) {
          candidate = null;
          return null;
        }
        candidate ??= now;
        if (now - candidate >= cfg.holdMs) {
          onset = candidate;
          lastLoud = now;
          return { type: 'onset', at: onset };
        }
        return null;
      }
      if (loud) lastLoud = now;
      else if (now - lastLoud >= cfg.endSilenceMs) {
        armed = false;
        return { type: 'end', at: now };
      }
      return null;
    },
  };
}
