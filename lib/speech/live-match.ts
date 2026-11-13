import { normaliseWord, tokenise } from './score';

/**
 * Live word matching while the student is still speaking. The recogniser's running transcript is lined up
 * against the chunks being said, so each word can light up the moment it is understood.
 *
 * Three rules shape it. A word only ever turns on: a later, different guess from the recogniser never takes a
 * lit word away. The student is trained to keep going: a skipped or mangled bit does not stop the words after it
 * from counting, because the whole transcript is aligned against the whole script. And a word that occurs more
 * than once is only lit at the student's place in the sentence (task 27.7), see `liveMatch`.
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

/** Where the student is asked to say one bit again (task 27.8): only that bit is matched, against words heard after `after`. */
export interface Focus {
  /** Index of the chunk to match. */
  chunk: number;
  /** How many words of the transcript had been heard when the student was sent back; only later words count. */
  after: number;
}

/** How many whole bits ahead of the student's place a word may light without further proof. */
const SKIP_AHEAD_BITS = 1;
/** How many words in a row must line up before a word that could be in several places is lit far ahead. */
const ANCHOR_WORDS = 3;

/** The first bit that has not been said, or null when every bit has. */
export function firstUnsaid(m: Pick<LiveMatch, 'said'>): number | null {
  const k = m.said.indexOf(false);
  return k < 0 ? null : k;
}

/**
 * Lines the transcript up against the chunks. Pass the previous result as `prev` and its lit words stay lit.
 *
 * Position (task 27.7). The student's place is the first word not yet lit. A heard word lights where it fits the
 * alignment and either (a) sits within the rest of the current bit or the next one, so a student may skip a bit
 * and carry on, or (b) is further ahead but is not a word that appears more than once, or (c) is further ahead
 * and starts a run of words that line up, so a student who really does jump to a later bit is credited as soon
 * as the run shows it. A repeated word far from the student's place, such as the second "me gusta" of an answer
 * when the first has just been said, stays dark. This also keeps a recogniser that repeats earlier words from
 * lighting them again somewhere else.
 *
 * Focus (task 27.8). With `focus`, only that bit is matched and only against the words heard after `focus.after`.
 */
export function liveMatch(chunks: readonly string[], transcript: string, prev?: LiveMatch | null, focus?: Focus): LiveMatch {
  const words = chunkWords(chunks);
  const flat: string[] = [];
  const owner: [number, number][] = [];
  words.forEach((ws, c) => {
    if (focus && c !== focus.chunk) return;
    ws.forEach((w, i) => { flat.push(w); owner.push([c, i]); });
  });
  let heard = tokenise(transcript).map(normaliseWord);
  if (focus) heard = heard.slice(Math.min(focus.after, heard.length));

  // The best alignment of what was heard against the script. Most words matched wins, so words after a skipped or
  // mangled bit still find their place. Among alignments with the same number of matches, the one made of unbroken
  // runs wins (each word that follows its neighbour scores a little extra), so "me gusta salir con mis amigos"
  // lines up with the last bit and does not borrow the "me gusta" of the first. A remaining tie goes to the earliest.
  const n = flat.length;
  const m = heard.length;
  const MATCH = 1000;
  const eq = flat.map((x) => heard.map((y) => understood(x, y)));
  // score[c][i][j]: best score from flat[i..] and heard[j..], where c says the pair just before this one matched.
  const score = [0, 1].map(() => Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0)));
  for (let a = n - 1; a >= 0; a--) {
    for (let b = m - 1; b >= 0; b--) {
      for (let c = 0; c <= 1; c++) {
        let v = Math.max(score[0][a + 1][b], score[0][a][b + 1]);
        if (eq[a][b]) v = Math.max(v, MATCH + c + score[1][a + 1][b + 1]);
        score[c][a][b] = v;
      }
    }
  }
  const pairs: [number, number][] = [];
  let i = 0;
  let j = 0;
  let c = 0;
  while (i < n && j < m) {
    if (eq[i][j] && score[c][i][j] === MATCH + c + score[1][i + 1][j + 1]) {
      pairs.push([i, j]);
      i++;
      j++;
      c = 1;
    } else if (score[0][i + 1][j] >= score[0][i][j + 1]) {
      i++;
      c = 0;
    } else {
      j++;
      c = 0;
    }
  }

  const hit = words.map((ws, c) => ws.map((_, k) => prev?.hit[c]?.[k] === true));
  const lit = (t: number) => hit[owner[t][0]][owner[t][1]];

  // The student's place, and how far ahead of it a word may light without proof.
  let cursor = flat.findIndex((_, t) => !lit(t));
  if (cursor < 0) cursor = flat.length;
  const limitFor = (at: number) => {
    if (flat.length === 0) return -1;
    const reach = owner[Math.min(at, flat.length - 1)][0] + SKIP_AHEAD_BITS;
    let last = -1;
    owner.forEach(([c], t) => { if (c <= reach) last = t; });
    return last;
  };
  let limit = limitFor(cursor);

  pairs.forEach(([t, h], p) => {
    const [c, w] = owner[t];
    let ok = hit[c][w] || t <= limit;
    if (!ok) {
      const repeated = flat.filter((x) => understood(x, heard[h])).length > 1;
      const run = Math.min(ANCHOR_WORDS, flat.length - t);
      let anchored = true;
      for (let k = 1; k < run; k++) {
        const q = pairs[p + k];
        if (!q || q[0] !== t + k || q[1] !== h + k) anchored = false;
      }
      ok = !repeated || anchored;
    }
    if (!ok) return;
    hit[c][w] = true;
    if (t + 1 > cursor) {
      cursor = t + 1;
      limit = limitFor(cursor);
    }
  });

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
