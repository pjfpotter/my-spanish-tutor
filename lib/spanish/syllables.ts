/**
 * Rule-based Spanish syllable splitting and stress (design D5, D7). No service needed. It is
 * used to show a missed word broken into syllables (task 5.4), so it has to be right for the
 * everyday words in a KS3 sentence builder, not for every word in the dictionary.
 */

export interface Syllabified {
  syllables: string[];
  /** Index into `syllables` of the stressed syllable. */
  stress: number;
}

const STRONG = new Set(['a', 'e', 'o', 'á', 'é', 'í', 'ó', 'ú']); // accented í and ú count as strong: they make a hiatus
const WEAK = new Set(['i', 'u', 'ü']);
const ACCENTED = new Set(['á', 'é', 'í', 'ó', 'ú']);
/** Consonant pairs that start a syllable together: pr, bl, tr, gl... (not dl, tl). */
const CLUSTER = /^[pbcgkf][lr]$|^dr$|^tr$/;

interface Unit {
  text: string;
  vowel: boolean;
}

/** Splits a word into letters, keeping ch, ll, rr, qu and gu (before e or i) as single consonant units. */
function toUnits(word: string): Unit[] {
  const lower = word.toLowerCase();
  const units: Unit[] = [];
  for (let i = 0; i < word.length; i++) {
    const two = lower.slice(i, i + 2);
    const next = lower[i + 2];
    if (two === 'ch' || two === 'll' || two === 'rr') {
      units.push({ text: word.slice(i, i + 2), vowel: false });
      i++;
    } else if ((two === 'qu' || two === 'gu') && next && 'eéií'.includes(next)) {
      // The u is silent: que, qui, gue, gui. (gü is different and handled as a vowel.)
      units.push({ text: word.slice(i, i + 2), vowel: false });
      i++;
    } else {
      const ch = lower[i];
      const finalY = ch === 'y' && i === word.length - 1;
      units.push({ text: word[i], vowel: STRONG.has(ch) || WEAK.has(ch) || finalY });
    }
  }
  return units;
}

const base = (u: Unit) => u.text.toLowerCase();
const strong = (u: Unit) => STRONG.has(base(u));
const hiatus = (a: Unit, b: Unit) => strong(a) && strong(b);

/** Where in the unit list each vowel nucleus (diphthongs and triphthongs kept whole) starts and ends. */
function nuclei(units: Unit[]): [number, number][] {
  const out: [number, number][] = [];
  let i = 0;
  while (i < units.length) {
    if (!units[i].vowel) {
      i++;
      continue;
    }
    let j = i;
    while (j + 1 < units.length && units[j + 1].vowel && !hiatus(units[j], units[j + 1])) j++;
    out.push([i, j]);
    i = j + 1;
  }
  return out;
}

const join = (units: Unit[], from: number, to: number) => units.slice(from, to).map((u) => u.text).join('');

/** Splits one word (letters only) into syllables and finds the stressed one. */
export function syllabify(word: string): Syllabified {
  const letters = word.normalize('NFC').replace(/[^\p{L}]/gu, '');
  if (!letters) return { syllables: [], stress: 0 };
  const units = toUnits(letters);
  const groups = nuclei(units);
  if (!groups.length) return { syllables: [letters], stress: 0 };

  // Boundaries: where each syllable after the first begins.
  const starts: number[] = [0];
  for (let g = 0; g < groups.length - 1; g++) {
    const gapFrom = groups[g][1] + 1;
    const gapTo = groups[g + 1][0]; // consonants in [gapFrom, gapTo)
    if (gapTo === gapFrom) {
      starts.push(gapTo); // hiatus: the two vowels split
      continue;
    }
    const n = gapTo - gapFrom;
    let carry = 1; // how many consonants go with the next syllable
    if (n >= 2) {
      const pair = base(units[gapTo - 2]) + base(units[gapTo - 1]);
      carry = CLUSTER.test(pair) ? 2 : 1;
    }
    starts.push(gapTo - carry);
  }
  const syllables = starts.map((s, i) => join(units, s, i + 1 < starts.length ? starts[i + 1] : units.length));

  // Stress: a written accent wins; otherwise words ending in a vowel, n or s stress the second
  // from last syllable and the rest stress the last. A final y counts as a consonant here.
  let stress = -1;
  starts.forEach((s, i) => {
    const end = i + 1 < starts.length ? starts[i + 1] : units.length;
    if (units.slice(s, end).some((u) => ACCENTED.has(base(u)))) stress = i;
  });
  if (stress < 0) {
    const last = units[units.length - 1];
    const lastCh = base(last);
    const vowelEnding = (last.vowel && lastCh !== 'y') || lastCh === 'n' || lastCh === 's';
    stress = vowelEnding ? Math.max(0, syllables.length - 2) : syllables.length - 1;
  }
  return { syllables, stress };
}

/** "co-mer" style display, with the stressed syllable in capitals: "co-MER". */
export function syllableDisplay(word: string): string {
  const { syllables, stress } = syllabify(word);
  return syllables.map((s, i) => (i === stress ? s.toUpperCase() : s)).join('-');
}
