import type { createCostRouter } from '../cost-router/router';

type Route = ReturnType<typeof createCostRouter>;

export const TRANSCRIPTION_SERVICE = 'transcription';
/** A test answer is a sentence or two, so anything longer is not a clip we want to handle. */
export const MAX_CLIP_MS = 20_000;
export const MAX_CLIP_BYTES = 2_000_000;

export interface Transcript {
  text: string;
  /** Null when the vendor does not report one. */
  confidence: number | null;
}

/** The vendor behind the fallback. Swappable without touching features (design D4). */
export interface Transcriber {
  transcribe(clip: Uint8Array, opts: { mimeType: string; language: 'es' }): Promise<Transcript>;
}

export type TranscribeResult =
  | ({ status: 'ok' } & Transcript)
  | { status: 'unavailable'; reason: 'cap_reached' | 'failed' }
  | { status: 'rate_limited'; message: string; retryAfterMs: number }
  | { status: 'rejected'; reason: string };

export interface ClipInput {
  clip: Uint8Array;
  mimeType: string;
  durationMs: number;
  profileId?: string | null;
  courseId?: string | null;
}

/**
 * Server-side transcription for devices where browser recognition is not good enough.
 * The clip lives only in this call: it is handed to the vendor and then dropped. It is
 * never written to disk, the database or the cost log (the log records size and cost only).
 * Callers must not retry with a wrong-looking transcript as a penalty: a failure here is
 * "unavailable", which the feedback layer treats as a no-penalty retry.
 */
export function createClipTranscriber(deps: { route: Route; transcriber: Transcriber; costPerSecondGbp: number }) {
  return async function transcribeClip(input: ClipInput): Promise<TranscribeResult> {
    const { clip, mimeType, durationMs } = input;
    if (!mimeType.startsWith('audio/')) return { status: 'rejected', reason: 'not audio' };
    if (clip.byteLength === 0) return { status: 'rejected', reason: 'empty clip' };
    if (clip.byteLength > MAX_CLIP_BYTES) return { status: 'rejected', reason: 'clip too large' };
    if (!Number.isFinite(durationMs) || durationMs <= 0 || durationMs > MAX_CLIP_MS) {
      return { status: 'rejected', reason: 'clip too long' };
    }

    const seconds = Math.max(1, Math.ceil(durationMs / 1000));
    const costGbp = seconds * deps.costPerSecondGbp;
    const result = await deps.route({
      service: TRANSCRIPTION_SERVICE,
      tier: 'speech',
      courseId: input.courseId ?? null,
      profileId: input.profileId ?? null,
      estimateGbp: costGbp,
      call: async () => ({
        value: await deps.transcriber.transcribe(clip, { mimeType, language: 'es' }),
        units: seconds,
        costGbp,
      }),
      fallback: () => null,
    });

    switch (result.status) {
      case 'ok':
        return { status: 'ok', ...result.value };
      case 'rate_limited':
        return { status: 'rate_limited', message: result.message, retryAfterMs: result.retryAfterMs };
      default:
        return { status: 'unavailable', reason: result.status };
    }
  };
}
