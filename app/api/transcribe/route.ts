import { SERVICE_LIMITS } from '../../../lib/cost-router/limits';
import { createCostRouter } from '../../../lib/cost-router/router';
import { createPgCostStore } from '../../../lib/cost-router/pg-store';
import { getPool } from '../../../lib/db';
import { currentProfile } from '../../../lib/server/session';
import { createOpenAiTranscriber } from '../../../lib/transcription/openai';
import { createClipTranscriber } from '../../../lib/transcription/transcribe';

const LIMITS = SERVICE_LIMITS;
const COST_PER_SECOND_GBP = Number(process.env.TRANSCRIBE_COST_PER_SECOND_GBP ?? 0.0001);

/**
 * POST an audio clip as the raw body. Headers: `content-type` (audio/*), `x-clip-ms` (length). The profile comes from the cookie. Returns a transcript. The clip is processed in memory and
 * discarded; nothing about the audio is stored.
 */
export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return Response.json({ status: 'unavailable', reason: 'not_configured' }, { status: 503 });

  const clip = new Uint8Array(await req.arrayBuffer());
  // The profile comes from the cookie, so the per-profile rate limit cannot be dodged by sending another id.
  const profile = await currentProfile();

  const route = createCostRouter(createPgCostStore(getPool()), LIMITS);
  const transcribeClip = createClipTranscriber({
    route,
    transcriber: createOpenAiTranscriber(apiKey, process.env.OPENAI_TRANSCRIBE_MODEL),
    costPerSecondGbp: COST_PER_SECOND_GBP,
  });

  const result = await transcribeClip({
    clip,
    mimeType: req.headers.get('content-type') ?? '',
    durationMs: Number(req.headers.get('x-clip-ms')),
    profileId: profile?.id ?? null,
    courseId: profile?.courseId ?? null,
  });

  const httpStatus = { ok: 200, rejected: 400, rate_limited: 429, unavailable: 503 }[result.status];
  return Response.json(result, { status: httpStatus, headers: { 'Cache-Control': 'no-store' } });
}
