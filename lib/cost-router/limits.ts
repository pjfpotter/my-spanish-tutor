import type { ServiceLimits } from './types';

/**
 * The one place spend caps live (usage-cost-control: Spend caps). Every paid service has an entry; the
 * router refuses to call a service without one. When a cap is reached the feature degrades to the fallback
 * named here, and the refusal is logged. Prices behind the estimates are not yet verified against vendor
 * invoices, so the caps err on the safe side.
 */
export const TRANSCRIPTION = 'transcription';
export const TTS = 'elevenlabs-tts';
export const COURSE_SETUP = 'course-setup';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

export const SERVICE_LIMITS: Record<string, ServiceLimits> = {
  // Runtime, per student call. A busy revision week should fit well inside the daily cap.
  [TRANSCRIPTION]: { capGbp: 2, periodMs: DAY, rate: { max: 30, windowMs: 10 * 60_000 } },
  // Build time only: clips are made once and stored, so students never trigger it.
  [TTS]: { capGbp: 3, periodMs: 30 * DAY, rate: { max: 1000, windowMs: 60_000 } },
  // Build time only: drafting model answers for a course.
  [COURSE_SETUP]: { capGbp: 2, periodMs: 30 * DAY, rate: { max: 5, windowMs: HOUR } },
};

/** What each service does when its cap is reached or its call fails. */
export const SERVICE_FALLBACKS: Record<string, string> = {
  [TRANSCRIPTION]: 'The attempt gets a free retry with no penalty, and browser recognition is still used where it works.',
  [TTS]: 'The build stops spending, keeps the clips it has, and the app shows the written line without audio.',
  [COURSE_SETUP]: 'Students are offered the hand-written model answers and the event is logged.',
};
