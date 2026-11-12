/**
 * What the screen does while the student is speaking, or not speaking. There is no clock to beat: a student
 * who goes quiet for a few seconds is often about to remember, so a pause is answered with the offer of a hint
 * and a way to move on, never with a timeout. Listening only ends by itself when the answer has been said.
 */
export interface PauseConfig {
  /** No new word for this long and a hint is offered, with a way to move on. */
  hintAfterMs: number;
  /** After the last word lights, wait this long so the student sees it before the screen moves on. */
  settleMs: number;
  /** The student reached the end with a bit missing: quiet for this long means they have finished. */
  trailMs: number;
}

export const DEFAULT_PAUSE: PauseConfig = { hintAfterMs: 3000, settleMs: 400, trailMs: 1500 };

export type ListenCall =
  | { kind: 'wait' }
  /** Offer a hint and a way to move on. Listening carries on. */
  | { kind: 'offer' }
  /** Stop listening and mark what was said. `complete`: all of it. `trailed`: they reached the end but a bit slipped. */
  | { kind: 'finish'; why: 'complete' | 'trailed' };

export interface ListenInput {
  now: number;
  /** When listening started. */
  startedAt: number;
  /** When a word last lit, or a hint was last given. Null if nothing yet. */
  lastProgressAt: number | null;
  /** When the student's voice was last heard at all. Null if not known. */
  lastVoiceAt: number | null;
  complete: boolean;
  reachedEnd: boolean;
}

export function listenCall(i: ListenInput, cfg: PauseConfig = DEFAULT_PAUSE): ListenCall {
  const progress = i.lastProgressAt ?? i.startedAt;
  if (i.complete) return i.now - progress >= cfg.settleMs ? { kind: 'finish', why: 'complete' } : { kind: 'wait' };
  if (i.reachedEnd && i.now - Math.max(progress, i.lastVoiceAt ?? 0) >= cfg.trailMs) return { kind: 'finish', why: 'trailed' };
  return i.now - progress >= cfg.hintAfterMs ? { kind: 'offer' } : { kind: 'wait' };
}
