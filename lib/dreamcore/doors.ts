import type { LadderAnswer } from '../memorise/ladder';
import { normaliseWord, tokenise } from '../speech/score';

/**
 * The doors of one run. Each door asks for something to be said, and the asks climb the memorise ladder of fading
 * help: read a bit, read two, first letters, empty blocks, English clue, Spanish question. Pure logic, no browser.
 */
export type Rung = 1 | 2 | 3 | 4 | 5 | 6;
export type Scene = 'clouds' | 'pool' | 'bedroom' | 'grass' | 'sunset' | 'static';
export type Zone = 'pink' | 'yellow' | 'pool' | 'sky';

export interface Door {
  /** The question this door practises, for a student's own answers. Absent for sample answers. */
  itemId?: string;
  rung: Rung;
  /** What the student must say, as bits. The live matcher lines the transcript up against these. */
  bits: string[];
  /** The English clue or question gloss, for the rungs that show it. English is only ever a subtitle. */
  english: string;
  /** The Spanish question, for rung 6. */
  question: string;
  /** The English subtitle of the question, so rung 6 never gives away the answer. */
  questionEnglish: string;
  scene: Scene;
  zone: Zone;
}

export const RUNG_NAME: Record<Rung, string> = {
  1: 'Read it out', 2: 'Read two bits', 3: 'First letters', 4: 'Empty blocks', 5: 'English clue', 6: 'Answer the question',
};

/** Doors per rung. Two of each, so a run is twelve doors and then the way out. */
export const DOORS_PER_RUNG = 2;
export const RUN_LENGTH = 6 * DOORS_PER_RUNG;
const SCENES: Scene[] = ['clouds', 'pool', 'bedroom', 'grass', 'sunset', 'static'];
const ZONES: Zone[] = ['pink', 'yellow', 'pool', 'sky'];

export type Rng = () => number;
export const rungOf = (doorIndex: number): Rung => (Math.min(5, Math.floor(doorIndex / DOORS_PER_RUNG)) + 1) as Rung;
export const zoneOf = (doorIndex: number): Zone => ZONES[Math.floor(doorIndex / 3) % ZONES.length];

/** The bits of the first sentence of an answer, so a door never asks for a whole long paragraph. */
export function firstSentence(a: LadderAnswer): LadderAnswer['chunks'] {
  const first = a.chunks.filter((c) => c.s === 0);
  return first.length ? first : a.chunks;
}

/**
 * Builds a run from the student's answers. Doors are spread across the answers so one answer is not hammered, and
 * each rung draws bits from a different answer than the door before it where it can. The last rung is the one that
 * counts towards being test ready, so its doors go to questions that have not met the target yet (`unmet`) first.
 */
export function buildRun(answers: readonly LadderAnswer[], rng: Rng = Math.random, unmet: ReadonlySet<string> = new Set()): Door[] {
  const usable = answers.filter((a) => a.chunks.length > 0);
  if (!usable.length) return [];
  const doors: Door[] = [];
  let last = -1;
  const scenes = shuffled(SCENES, rng);
  for (let i = 0; i < RUN_LENGTH; i++) {
    let ai = Math.floor(rng() * usable.length);
    if (usable.length > 1 && ai === last) ai = (ai + 1) % usable.length;
    if (rungOf(i) === 6) {
      const all = usable.map((a, n) => (a.id && unmet.has(a.id) ? n : -1)).filter((n) => n >= 0);
      // Avoid asking the same question twice running, unless it is the only one left to meet.
      const wanted = all.filter((n) => n !== last);
      const pool = wanted.length ? wanted : all;
      if (pool.length) ai = pool[Math.floor(rng() * pool.length)];
    }
    last = ai;
    const a = usable[ai];
    const bits = firstSentence(a);
    const rung = rungOf(i);
    const at = Math.floor(rng() * bits.length);
    let pick: typeof bits;
    if (rung === 6) pick = bits;
    else if (rung === 2) pick = bits.length > 1 ? bits.slice(Math.min(at, bits.length - 2), Math.min(at, bits.length - 2) + 2) : bits;
    else pick = [bits[at]];
    doors.push({
      itemId: a.id,
      rung,
      bits: pick.map((c) => c.t),
      english: pick.map((c) => c.en).filter(Boolean).join(' ') || a.qen,
      question: a.q,
      questionEnglish: a.qen,
      scene: scenes[i % scenes.length],
      zone: zoneOf(i),
    });
  }
  return doors;
}

function shuffled<T>(list: readonly T[], rng: Rng): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** The first letter of each word, with dots for the rest, e.g. "Me encantan" becomes "M. e.......". */
export function firstLetters(text: string): string {
  return tokenise(text).map((w) => `${w[0]}${'.'.repeat(Math.max(0, normaliseWord(w).length - 1))}`).join(' ');
}

/** Empty blocks: one block per letter, so only the length of each word shows. */
export function emptyBlocks(text: string): string {
  return tokenise(text).map((w) => '▢'.repeat(Math.max(1, normaliseWord(w).length))).join(' ');
}

/** What the door plaque shows for the rung, as a line of Spanish (or English) and an optional second line. */
export function plaqueOf(d: Door): { main: string; sub: string; lang: 'es' | 'en' } {
  const text = d.bits.join(' ');
  switch (d.rung) {
    case 1: case 2: return { main: text, sub: '', lang: 'es' };
    case 3: return { main: firstLetters(text), sub: '', lang: 'es' };
    case 4: return { main: emptyBlocks(text), sub: '', lang: 'es' };
    case 5: return { main: d.english, sub: '', lang: 'en' };
    case 6: return { main: d.question, sub: d.questionEnglish, lang: 'es' };
  }
}

/** A hint after a pause: the next words that have not been said, never a penalty. */
export function hintOf(d: Door, nextWordIndex: number): string {
  const words = tokenise(d.bits.join(' '));
  return words.slice(nextWordIndex, nextWordIndex + 3).join(' ');
}
