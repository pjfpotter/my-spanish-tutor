import { createTeleDrawing } from './draw';
import type { Feelings } from './feelings';

export interface TeleRenderer {
  start(): void;
  stop(): void;
  /** Draw one frame now (used in tests and for a still image). */
  renderOnce(): void;
  setFeelings(feelings: Feelings): void;
  /** Voice loudness 0 to 1; only shows while speaking. */
  setLoudness(level: number): void;
  setSpeaking(speaking: boolean): void;
  /** Raised brows and tilt, for the end of a question. */
  setQuestion(isQuestion: boolean): void;
  /** A small start, for a stressed word. */
  emphasise(): void;
  /** Wear the patchwork corduroy jacket over the stripy turtleneck. */
  setJacket(on: boolean): void;
  /** The dial turns and the picture flashes, like changing channel. */
  channelChange(): void;
  lookAt(x: number, y: number, ms: number): void;
  current(): Required<Feelings>;
}

/** isCalm is read every frame so the calm switch and the device setting apply instantly. */
export function createTele(canvas: HTMLCanvasElement, isCalm: () => boolean): TeleRenderer {
  return createTeleDrawing(canvas, isCalm) as TeleRenderer;
}

export function isCalmNow(): boolean {
  if (typeof document === 'undefined') return true;
  return document.documentElement.dataset.calm === 'on' || matchMedia('(prefers-reduced-motion: reduce)').matches;
}
