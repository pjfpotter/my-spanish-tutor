/**
 * Word-level diff between what the recogniser heard and the student's script (design D5).
 * A word is matched if the recogniser understood it: that is the intelligibility standard.
 * Accents and capitals never count against a student. Scores come from rules, not a model.
 */

export type WordStatus = 'matched' | 'missed' | 'different';

export interface ScoredWord {
  /** The word as written in the script. */
  word: string;
  status: WordStatus;
  /** What the recogniser heard in its place, for a 'different' word. */
  heard?: string;
}

export interface Score {
  words: ScoredWord[];
  /** Words heard that are not in the script. They are shown but do not lower the accuracy. */
  extra: string[];
  matched: number;
  /** Whole percent, 0 to 100, of script words matched. */
  accuracy: number;
}

/** Lowercase, drop punctuation and accent marks. Keeps ñ (año and ano are different words). */
export function normaliseWord(w: string): string {
  return w
    .toLowerCase()
    .replace(/ñ/g, '\u0001')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\u0001/g, 'ñ')
    .replace(/[^\p{L}\p{N}ñ]/gu, '');
}

export function tokenise(text: string): string[] {
  return text.split(/\s+/).map((w) => w.trim()).filter((w) => normaliseWord(w));
}

/** Scores a transcript against the script. */
export function scoreAttempt(script: string, transcript: string): Score {
  const target = tokenise(script);
  const heard = tokenise(transcript);
  const a = target.map(normaliseWord);
  const b = heard.map(normaliseWord);

  // Longest common subsequence table.
  const lcs: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }

  const words: ScoredWord[] = [];
  const extra: string[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) {
      words.push({ word: target[i], status: 'matched' });
      i++;
      j++;
      continue;
    }
    // A stretch with no match: collect script and heard words until the next matched pair.
    const gapScript: number[] = [];
    const gapHeard: number[] = [];
    while ((i < a.length || j < b.length) && !(i < a.length && j < b.length && a[i] === b[j])) {
      if (j >= b.length || (i < a.length && lcs[i + 1][j] >= lcs[i][j + 1])) gapScript.push(i++);
      else gapHeard.push(j++);
    }
    // Pair them off in order: a script word with a heard word in its place is 'different'.
    gapScript.forEach((si, k) => {
      if (k < gapHeard.length) words.push({ word: target[si], status: 'different', heard: heard[gapHeard[k]] });
      else words.push({ word: target[si], status: 'missed' });
    });
    gapHeard.slice(gapScript.length).forEach((hj) => extra.push(heard[hj]));
  }

  const matched = words.filter((w) => w.status === 'matched').length;
  return { words, extra, matched, accuracy: target.length ? Math.round((matched / target.length) * 100) : 0 };
}
