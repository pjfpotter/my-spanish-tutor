import { normaliseWord } from '../speech/score';

/**
 * Pronunciation support for a word that will not light (task 27.6). The same word left unlit on this many attempts
 * in one lesson earns the offer of slow audio and syllables. It is an offer, never a mark against the student, and a
 * recognition failure is not held against them: the word is offered help, not counted as wrong.
 */
export const REPEAT_MISS_ATTEMPTS = 3;

/** Per lesson: how many attempts in a row each word has stayed unlit, and which words have already been offered. */
export interface RepeatMiss {
  unlit: Map<string, number>;
  offered: Set<string>;
}

export const newRepeatMiss = (): RepeatMiss => ({ unlit: new Map(), offered: new Set() });

/** One word of an attempt: the word as written on screen and whether the recogniser understood it. */
export interface AttemptWord { word: string; lit: boolean }

const keyOf = (answer: number, word: string): string => `${answer}:${normaliseWord(word)}`;
const clean = (word: string): string => word.replace(/[.,;:!?¡¿"“”]/g, '');

/**
 * Records one attempt at an answer. A word that is lit starts again from nothing, so only the same word unlit
 * attempt after attempt counts. Returns the first word to reach the limit that has not been offered yet, or null.
 * Words that cannot be told apart from noise (under two letters) are never offered.
 */
export function recordAttempt(r: RepeatMiss, answer: number, words: readonly AttemptWord[]): string | null {
  let offer: string | null = null;
  const seen = new Set<string>();
  for (const { word, lit } of words) {
    const text = clean(word);
    if (text.length < 2) continue;
    const key = keyOf(answer, text);
    if (seen.has(key)) continue; // a word said twice in one answer is one attempt at it
    seen.add(key);
    if (lit) {
      r.unlit.delete(key);
      continue;
    }
    const n = (r.unlit.get(key) ?? 0) + 1;
    r.unlit.set(key, n);
    if (n >= REPEAT_MISS_ATTEMPTS && !r.offered.has(key) && offer === null) {
      r.offered.add(key);
      offer = text;
    }
  }
  return offer;
}
