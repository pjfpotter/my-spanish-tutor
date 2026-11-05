import { normaliseWord } from '../speech/score';

/**
 * Asking for the question again, in Spanish, is good test technique (task 9.3). The student says
 * something like "¿Puede repetir, por favor?" and the question plays again. It is rewarded, never penalised.
 */
export const REPEAT_PHRASE = '¿Puede repetir, por favor?';

const STEMS = ['repetir', 'repite', 'repita', 'repites'];

/** True when the transcript contains a form of "repetir". Forgiving about the rest of the sentence and about accents. */
export function isRepeatRequest(transcript: string): boolean {
  return transcript.split(/\s+/).map(normaliseWord).some((w) => STEMS.includes(w));
}

/** A hint for a blank: the first words of the answer, no more. */
export function firstWords(answer: string, count = 2): string {
  return answer.split(/\s+/).filter(Boolean).slice(0, count).join(' ');
}
