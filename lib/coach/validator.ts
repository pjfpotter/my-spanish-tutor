import type { Chunk } from '../course/schema.ts';
import { ALLOWED_COMMON_WORDS } from './allowed-words.ts';
import { tokens } from './rubric.ts';

/**
 * The word-bank validator (task 7.2). Every word of an answer must come from the course's sentence
 * builder or the small allowed list. A drafted answer with any other word is not offered to the
 * student: the caller replaces the word or asks for a new draft (task 7.3), and after one retry
 * falls back to the model answers (task 7.5). Pure rules, no model.
 *
 * Words are compared without accents, capitals or punctuation, so "Película" matches "película".
 */
export interface OutOfBank {
  /** The word as it appears in the answer after cleaning (lowercase, no accents). */
  word: string;
  /** Position among the answer's words, counting from 0. */
  index: number;
  /** The closest word the student could use instead, when there is a near one. */
  suggestion: string | null;
}

export interface BankCheck {
  /** True when every word is in the bank, so the answer can be offered. */
  ok: boolean;
  outOfBank: OutOfBank[];
}

/** Every word the builder's chunks use, plus the course's glue words and the allowed common words. */
export function buildWordBank(chunks: Pick<Chunk, 'spanish'>[], glueWords: string[] = []): Set<string> {
  const bank = new Set<string>();
  for (const g of glueWords) for (const w of tokens(g)) bank.add(w);
  for (const c of chunks) for (const w of tokens(c.spanish)) bank.add(w);
  for (const w of ALLOWED_COMMON_WORDS) bank.add(w);
  return bank;
}

/** How many single-letter edits turn `a` into `b`. Small words only, so this is cheap. */
function distance(a: string, b: string): number {
  const prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length];
}

/** The nearest bank word within two edits (and no shorter than 4 letters, so "mi" never suggests "me"), or null. */
function nearest(word: string, bank: Set<string>): string | null {
  if (word.length < 4) return null;
  let best: string | null = null;
  let bestD = 3;
  for (const w of bank) {
    if (Math.abs(w.length - word.length) > 2) continue;
    const d = distance(word, w);
    if (d < bestD || (d === bestD && best !== null && w < best)) {
      best = w;
      bestD = d;
    }
  }
  return bestD <= 2 ? best : null;
}

/** Checks an answer against the course's word bank and lists every word outside it. */
export function checkAgainstBank(text: string, bank: Set<string>): BankCheck {
  const outOfBank = tokens(text)
    .map((word, index) => ({ word, index }))
    .filter(({ word }) => !bank.has(word))
    .map(({ word, index }) => ({ word, index, suggestion: nearest(word, bank) }));
  return { ok: outOfBank.length === 0, outOfBank };
}

/** A draft is offered only when it has no out-of-bank word. `reason` says what to fix when it is not. */
export function validateDraft(text: string, bank: Set<string>): { offer: boolean; reason: string | null; check: BankCheck } {
  const check = checkAgainstBank(text, bank);
  if (!text.trim()) return { offer: false, reason: 'the draft is empty', check };
  if (check.ok) return { offer: true, reason: null, check };
  const list = check.outOfBank.map((o) => (o.suggestion ? `"${o.word}" (maybe "${o.suggestion}")` : `"${o.word}"`)).join(', ');
  return { offer: false, reason: `words outside the sentence builder: ${list}`, check };
}
