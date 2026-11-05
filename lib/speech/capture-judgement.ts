/**
 * Decides whether a captured attempt can be scored at all (task 5.5). If the recogniser heard nothing,
 * or was unsure, the app says it could not hear clearly and offers a retry. That attempt is never
 * scored, never logged and never lowers anything: noise is not the student's mistake.
 */
export type Capture =
  | { status: 'ok'; transcript: string; confidence: number | null }
  | { status: 'unclear' };

/** Below this the recogniser is guessing. A missing or zero confidence means the device does not report one. */
export const MIN_CONFIDENCE = 0.4;

export type Judgement =
  | { scorable: true; transcript: string }
  | { scorable: false; reason: 'nothing_heard' | 'low_confidence' };

export function judgeCapture(c: Capture, minConfidence: number = MIN_CONFIDENCE): Judgement {
  if (c.status === 'unclear' || !c.transcript.trim()) return { scorable: false, reason: 'nothing_heard' };
  if (c.confidence !== null && c.confidence > 0 && c.confidence < minConfidence) return { scorable: false, reason: 'low_confidence' };
  return { scorable: true, transcript: c.transcript.trim() };
}

/** What the student is told. Plain, kind, and about the room rather than about them. */
export const UNCLEAR_MESSAGE = 'I could not hear that clearly. It was not scored. Try again, somewhere a bit quieter if you can.';
