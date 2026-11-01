import type { WordTime } from './timeline';

/** The character-level timing ElevenLabs returns with a clip (`alignment`). */
export interface CharAlignment {
  characters: string[];
  character_start_times_seconds: number[];
  character_end_times_seconds: number[];
}

/**
 * Groups character timings into words. A word runs from the start of its first character to the
 * start of the next word, and keeps its punctuation (so "¡Hola!" is one word). Spaces separate
 * words. Returns word start times and the end of the last spoken character.
 */
export function wordsFromAlignment(a: CharAlignment): { words: WordTime[]; end: number } {
  const { characters, character_start_times_seconds: starts, character_end_times_seconds: ends } = a;
  if (characters.length !== starts.length || characters.length !== ends.length) {
    throw new Error('alignment arrays have different lengths');
  }
  const words: WordTime[] = [];
  let text = '';
  let t0 = 0;
  const flush = () => {
    if (text) words.push({ text, t0 });
    text = '';
  };
  characters.forEach((ch, i) => {
    if (/\s/.test(ch)) return flush();
    if (!text) t0 = starts[i];
    text += ch;
  });
  flush();
  return { words, end: ends.length ? Math.max(...ends) : 0 };
}
