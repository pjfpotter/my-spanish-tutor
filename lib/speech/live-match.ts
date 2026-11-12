import { normaliseWord, tokenise } from './score';

/**
 * Live word matching while the student is still speaking. The recogniser's running transcript is lined up
 * against the chunks being said, so each word can light up the moment it is understood.
 *
 * Two rules shape it. A word only ever turns on: a later, different guess from the recogniser never takes a
 * lit word away. And the student is trained to keep going: a skipped or mangled bit does not stop the words
 * after it from counting, because the whole transcript is aligned against the whole script.
 */
export interface LiveMatch {
  /** hit[c][w] is true once word w of chunk c has been understood. */
  hit: boolean[][];
  /** A chunk counts as said once most of its words have been understood. */
  said: boolean[];
  /** Every chunk is said. */
  complete: boolean;
  /** The last chunk is said, so the student has reached the end even if something earlier slipped. */
  reachedEnd: boolean;
  /** How many words are lit. Rises, never falls. */
  matched: number;
  /** The first word not yet lit, for a hint. Null when every word is lit. */
  next: { chunk: number; word: number } | null;
}

/**
 * The one rule for when a bit counts as said, used everywhere (task 27.13, decided 12 Nov 2026): most of its words
 * were understood, and a long word one letter out counts as understood. A recognition failure is never held
 * against the student, so one slipped word in a longer bit does not make them say the bit again.
 */
export const CHUNK_SAID = 0.7;

/** Whether `understood` words out of `total` is enough for the bit to count as said. */
export const chunkIsSaid = (understood: number, total: number): boolean => total > 0 && understood / total >= CHUNK_SAID;

function editDistance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const keep = row[j];
      row[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, row[j], row[j - 1]);
      prev = keep;
    }
  }
  return row[b.length];
}

/** The recogniser understood this word: the same word, or a longer word one letter out (an ending, an accent it dropped). */
export function understood(expected: string, heard: string): boolean {
  if (expected === heard) return true;
  return expected.length >= 5 && heard.length >= 4 && editDistance(expected, heard) <= 1;
}

/** The words of each chunk, normalised the same way as scoring. */
export const chunkWords = (chunks: readonly string[]): string[][] => chunks.map((c) => tokenise(c).map(normaliseWord));

/**
 * Lines the transcript up against the chunks. Pass the previous result as `prev` and its lit words stay lit.
 */
export function liveMatch(chunks: readonly string[], transcript: string, prev?: LiveMatch | null): LiveMatch {
  const words = chunkWords(chunks);
  const flat: string[] = [];
  const owner: [number, number][] = [];
  words.forEach((ws, c) => ws.forEach((w, i) => { flat.push(w); owner.push([c, i]); }));
  const heard = tokenise(transcript).map(normaliseWord);

  // Longest common subsequence, so words after a skipped or mangled bit still find their place.
  const lcs: number[][] = Array.from({ length: flat.length + 1 }, () => new Array(heard.length + 1).fill(0));
  for (let i = flat.length - 1; i >= 0; i--) {
    for (let j = heard.length - 1; j >= 0; j--) {
      lcs[i][j] = understood(flat[i], heard[j]) ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }
  const hit = words.map((ws, c) => ws.map((_, i) => prev?.hit[c]?.[i] === true));
  let i = 0;
  let j = 0;
  while (i < flat.length && j < heard.length) {
    if (understood(flat[i], heard[j]) && lcs[i][j] === lcs[i + 1][j + 1] + 1) {
      const [c, w] = owner[i];
      hit[c][w] = true;
      i++;
      j++;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) i++;
    else j++;
  }

  const said = hit.map((ws) => chunkIsSaid(ws.filter(Boolean).length, ws.length));
  let next: LiveMatch['next'] = null;
  for (let c = 0; c < hit.length && !next; c++) {
    const w = hit[c].indexOf(false);
    if (w >= 0) next = { chunk: c, word: w };
  }
  return {
    hit,
    said,
    complete: said.length > 0 && said.every(Boolean),
    reachedEnd: said.length > 0 && said[said.length - 1],
    matched: hit.reduce((n, ws) => n + ws.filter(Boolean).length, 0),
    next,
  };
}
