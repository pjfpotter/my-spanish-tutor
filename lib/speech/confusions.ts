import { normaliseWord } from './score';

/**
 * Common mix-ups for English speakers learning Spanish, with a one-line tip each (task 5.3). A tip is
 * shown only when a missed word's recognised replacement fits an entry; any other mismatch shows no
 * tip rather than a wrong one. Rules only: no model is involved.
 */
export interface Confusion {
  id: 'me_mi' | 'final_o' | 'silent_h' | 'j' | 'll' | 'v_b' | 'z_c';
  /** What the student sees. One line, plain words. */
  tip: string;
  /** `script` is the intended word and `heard` what the recogniser understood, both already normalised. */
  matches: (script: string, heard: string) => boolean;
}

const withoutH = (s: string) => s.replace(/(?<!c)h/g, '');

/** True when the words differ only at positions where `a` and `b` swap places. */
const differsOnlyBySwap = (s: string, h: string, a: string, b: string) => {
  if (s.length !== h.length) return false;
  let differs = false;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === h[i]) continue;
    if (!((s[i] === a && h[i] === b) || (s[i] === b && h[i] === a))) return false;
    differs = true;
  }
  return differs;
};

export const CONFUSIONS: readonly Confusion[] = [
  {
    id: 'me_mi',
    tip: '“me” sounds like English “may”, and “mi” sounds like “mee”.',
    matches: (s, h) => (s === 'me' && h === 'mi') || (s === 'mi' && h === 'me'),
  },
  {
    id: 'final_o',
    tip: 'A final “o” is short and clean. Do not glide it into “ow”.',
    matches: (s, h) => s.length > 1 && s.endsWith('o') && ['ow', 'ou', 'aw', 'au', 'u', 'w'].some((end) => h === s.slice(0, -1) + end),
  },
  {
    id: 'silent_h',
    tip: 'The “h” is silent in Spanish: “hola” sounds like “ola”.',
    matches: (s, h) => withoutH(s) !== s && (h === withoutH(s) || h === s.replace(/(?<!c)h/g, 'j')),
  },
  {
    id: 'j',
    tip: '“j” is a rough sound from the back of the throat, stronger than an English “h”.',
    matches: (s, h) => s.includes('j') && [s.replace(/j/g, 'h'), s.replace(/j/g, 'y'), s.replace(/j/g, 'ch')].includes(h),
  },
  {
    id: 'll',
    tip: '“ll” sounds like the “y” in “yes”, not a double “l”.',
    matches: (s, h) => s.includes('ll') && [s.replace(/ll/g, 'l'), s.replace(/ll/g, 'li'), s.replace(/ll/g, 'ly')].includes(h),
  },
  {
    id: 'v_b',
    tip: 'In Spanish “v” and “b” sound the same: a soft “b”.',
    matches: (s, h) => differsOnlyBySwap(s, h, 'v', 'b'),
  },
  {
    id: 'z_c',
    tip: 'In Castilian Spanish, “z” and “c” before “e” or “i” sound like “th” in “think”.',
    matches: (s, h) => /z|c(?=[ei])/.test(s) && h === s.replace(/z|c(?=[ei])/g, 's'),
  },
];

/** The confusion that fits this mismatch, or null (then no tip is shown). */
export function confusionFor(script: string, heard: string): Confusion | null {
  const s = normaliseWord(script);
  const h = normaliseWord(heard);
  if (!s || !h || s === h) return null;
  return CONFUSIONS.find((c) => c.matches(s, h)) ?? null;
}

export const tipFor = (script: string, heard: string): string | null => confusionFor(script, heard)?.tip ?? null;
