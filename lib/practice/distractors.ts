/**
 * Distractors for choose-and-fill tasks (task 21.3). Wrong options must not give the answer away: they
 * are close to the right one in length, and when the right option contains a cognate (a word that looks
 * like its English meaning) at least one wrong option does too, so a cognate alone is not a clue.
 */
const strip = (s: string) => s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[^a-z\s]/g, '');

/** Crude cognate test: a Spanish word shares a long start with one of the English words. */
export function containsCognate(spanish: string, english: string): boolean {
  const en = strip(english).split(/\s+/).filter((w) => w.length >= 5);
  return strip(spanish).split(/\s+/).filter((w) => w.length >= 5).some((w) => en.some((e) => w.slice(0, 5) === e.slice(0, 5)));
}

export interface Option {
  spanish: string;
  english: string;
  /** The chunk's category in the sentence builder. Wrong options from the same category are the believable ones. */
  category?: string;
}

/** Longer or shorter than the answer by more than this share makes it too easy to rule out. */
const LENGTH_SHARE = 0.4;

export function pickDistractors(correct: Option, pool: readonly Option[], n = 2, random: () => number = Math.random): Option[] {
  const same = (o: Option) => strip(o.spanish) === strip(correct.spanish) || strip(o.english) === strip(correct.english);
  const close = (o: Option) => Math.abs(o.spanish.length - correct.spanish.length) <= Math.max(3, correct.spanish.length * LENGTH_SHARE);
  const others = pool.filter((o) => !same(o));
  // Believable first: the same kind of chunk and a similar length. Then similar length. Then anything.
  const sameKind = correct.category ? others.filter((o) => o.category === correct.category) : [];
  const tiers = [sameKind.filter(close), sameKind, others.filter(close), others];
  const candidates = tiers.find((t) => t.length >= n) ?? others;
  const shuffled = [...candidates].sort(() => random() - 0.5);
  const picked: Option[] = [];
  if (containsCognate(correct.spanish, correct.english)) {
    const trap = shuffled.find((o) => containsCognate(o.spanish, o.english));
    if (trap) picked.push(trap);
  }
  for (const o of shuffled) if (picked.length < n && !picked.includes(o)) picked.push(o);
  return picked.slice(0, n);
}

/** The options in a random order, with where the right one landed. */
export function shuffleOptions<T>(correct: T, wrong: readonly T[], random: () => number = Math.random): { options: T[]; correctIndex: number } {
  const options = [correct, ...wrong];
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }
  return { options, correctIndex: options.indexOf(correct) };
}
