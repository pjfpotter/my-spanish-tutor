import type { LadderAnswer } from '../memorise/ladder';
import { normaliseWord, tokenise } from '../speech/score';

/**
 * The doors of one run. Help fades in five stages: read a bit, read the whole answer, hear the question and see
 * only the first and last letters, hear the question and see only the first bit, then no help at all. The first
 * four stages are fixed (two doors each); the last stage has no fixed length, because the way out is earned by
 * clearing no-help doors. Pure logic, no browser.
 */
export type Stage = 1 | 2 | 3 | 4 | 5;
export type Scene = 'clouds' | 'pool' | 'bedroom' | 'grass' | 'sunset' | 'static';
export type Zone = 'pink' | 'yellow' | 'pool' | 'sky';

export interface Door {
  /** The question this door practises, for a student's own answers. Absent for sample answers. */
  itemId?: string;
  stage: Stage;
  /** What the student must say, as bits. The live matcher lines the transcript up against these. */
  bits: string[];
  /** How many leading bits are shown in full (stage 4 shows only the first). Stages 1 and 2 show everything. */
  shownBits: number;
  /** The Spanish question, spoken from stage 3. */
  question: string;
  /** The English subtitle of the question, so the question never gives away the answer. */
  questionEnglish: string;
  scene: Scene;
  zone: Zone;
}

export const STAGE_NAME: Record<Stage, string> = {
  1: 'Read it out', 2: 'Read the whole answer', 3: 'Hear it, see the ends', 4: 'Hear it, see the start', 5: 'No help',
};

/** Doors in each of the four fixed stages. The fifth has no fixed length. */
export const DOORS_PER_STAGE = 2;
export const FIXED_DOORS = 4 * DOORS_PER_STAGE;
/** Clean no-help doors that earn the way out. */
export const ESCAPE_AFTER = 3;
/** Ghost whispers a student gets in one run. Each costs chase time (`WHISPER_CHASE_COST` in chase.ts). A starting value, tuned by playing. */
export const WHISPERS_PER_RUN = 3;

export interface WhisperState { used: number }
export const whispersLeft = (used: number): number => Math.max(0, WHISPERS_PER_RUN - used);
/** Uses one whisper if there is one. With none left nothing changes and `spent` is false, so nothing is played or charged. */
export function spendWhisper(s: WhisperState): { state: WhisperState; spent: boolean } {
  return whispersLeft(s.used) > 0 ? { state: { used: s.used + 1 }, spent: true } : { state: s, spent: false };
}
const SCENES: Scene[] = ['clouds', 'pool', 'bedroom', 'grass', 'sunset', 'static'];
const ZONES: Zone[] = ['pink', 'yellow', 'pool', 'sky'];

export type Rng = () => number;
export const stageOf = (doorIndex: number): Stage => (doorIndex < FIXED_DOORS ? Math.floor(doorIndex / DOORS_PER_STAGE) + 1 : 5) as Stage;
export const zoneOf = (doorIndex: number): Zone => ZONES[Math.floor(doorIndex / 3) % ZONES.length];
/** Tele speaks the question from stage 3 on. */
export const hearsQuestion = (stage: Stage): boolean => stage >= 3;

/** The bits of the first sentence of an answer, so a door never asks for a whole long paragraph. */
export function firstSentence(a: LadderAnswer): LadderAnswer['chunks'] {
  const first = a.chunks.filter((c) => c.s === 0);
  return first.length ? first : a.chunks;
}

/**
 * Picks which answer a door uses. Never the same answer twice running when there is a choice. When `prefer` is given
 * and any of those answers is usable, only those are picked from.
 */
function pickAnswer(usable: readonly LadderAnswer[], rng: Rng, lastIndex: number, prefer?: ReadonlySet<string>): number {
  const all = usable.map((_, n) => n);
  const wanted = prefer?.size ? all.filter((n) => usable[n].id && prefer.has(usable[n].id as string)) : [];
  const pool = wanted.length ? wanted : all;
  const fresh = pool.filter((n) => n !== lastIndex);
  const from = fresh.length ? fresh : pool;
  return from[Math.floor(rng() * from.length)];
}

function makeDoor(a: LadderAnswer, stage: Stage, index: number, scene: Scene, rng: Rng): Door {
  const bits = firstSentence(a);
  let pick: typeof bits;
  let shownBits = bits.length;
  if (stage === 1) {
    pick = [bits[Math.floor(rng() * bits.length)]];
    shownBits = 1;
  } else {
    pick = bits;
    if (stage === 4) shownBits = 1;
    if (stage === 5) shownBits = 0;
  }
  return { itemId: a.id, stage, bits: pick.map((c) => c.t), shownBits, question: a.q, questionEnglish: a.qen, scene, zone: zoneOf(index) };
}

/**
 * The four fixed stages of a run, two doors each. Doors are spread across the answers so one answer is not hammered.
 * The no-help doors that follow are drawn one at a time by `nextNoHelpDoor`, because the run goes on until the student
 * has earned the way out.
 */
export function buildRun(answers: readonly LadderAnswer[], rng: Rng = Math.random): Door[] {
  const usable = answers.filter((a) => a.chunks.length > 0);
  if (!usable.length) return [];
  const doors: Door[] = [];
  let last = -1;
  const scenes = shuffled(SCENES, rng);
  for (let i = 0; i < FIXED_DOORS; i++) {
    const ai = pickAnswer(usable, rng, last);
    last = ai;
    doors.push(makeDoor(usable[ai], stageOf(i), i, scenes[i % scenes.length], rng));
  }
  return doors;
}

/**
 * The next no-help door. It goes to a question that has not met the timed target yet (`unmet`) when there is one,
 * and never asks the question just asked, unless it is the only one.
 */
export function nextNoHelpDoor(
  answers: readonly LadderAnswer[], doorIndex: number, previousItemId: string | undefined, rng: Rng = Math.random, unmet: ReadonlySet<string> = new Set(),
): Door | null {
  const usable = answers.filter((a) => a.chunks.length > 0);
  if (!usable.length) return null;
  const lastIndex = previousItemId ? usable.findIndex((a) => a.id === previousItemId) : -1;
  const ai = pickAnswer(usable, rng, lastIndex, unmet);
  return makeDoor(usable[ai], 5, doorIndex, SCENES[Math.floor(rng() * SCENES.length)], rng);
}

/**
 * Does this door count towards the way out? Only a no-help door cleared without Show me and without a ghost whisper, which
 * is help too: it plays the answer's word. A door passed by tap because the microphone cannot hear (recognition failure is
 * never penalised) counts too, so nobody is stuck for it.
 */
export const countsAsClean = (d: Door, assisted: boolean, whispered = false): boolean => d.stage === 5 && !assisted && !whispered;
export const escapeEarned = (clean: number): boolean => clean >= ESCAPE_AFTER;

function shuffled<T>(list: readonly T[], rng: Rng): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** First and last letter of each word, with dots between, e.g. "Me encantan" becomes "Me e.....n". Short words stay whole. */
export function firstLast(text: string): string {
  return tokenise(text).map((w) => {
    const letters = Array.from(w).filter((c) => normaliseWord(c));
    if (letters.length <= 2) return letters.join('');
    return `${letters[0]}${'.'.repeat(letters.length - 2)}${letters[letters.length - 1]}`;
  }).join(' ');
}

/** What each word of the door's answer shows, for the stage: the whole word, its ends, or a dot when it is hidden. */
export function maskedWords(d: Door): string[] {
  const words = tokenise(d.bits.join(' '));
  switch (d.stage) {
    case 1: case 2: return words;
    case 3: return words.map(firstLast);
    case 4: {
      const shown = tokenise(d.bits.slice(0, d.shownBits).join(' ')).length;
      return words.map((w, i) => (i < shown ? w : '•'));
    }
    case 5: return words.map(() => '•');
  }
}

/**
 * The line above the answer words. Stages 1 and 2 show what to read. From stage 3 it is the Spanish question, with
 * its English subtitle; the question never carries the answer, and English is only ever a subtitle.
 */
export function plaqueOf(d: Door): { main: string; sub: string; lang: 'es' } {
  if (d.stage <= 2) return { main: d.bits.join(' '), sub: '', lang: 'es' };
  return { main: d.question, sub: d.questionEnglish, lang: 'es' };
}

/**
 * The word a ghost whisper would speak: the first word of the door the recogniser has not understood yet. With nothing
 * heard it is the door's first word; once every word is understood there is none.
 */
export function nextUnsaidWord(d: Pick<Door, 'bits'>, match: { next: { chunk: number; word: number } | null } | null): string | null {
  const next = match ? match.next : { chunk: 0, word: 0 };
  if (!next) return null;
  return tokenise(d.bits[next.chunk] ?? '')[next.word] ?? null;
}

/** A hint after a pause: the next words that have not been said, never a penalty. */
export function hintOf(d: Door, nextWordIndex: number): string {
  const words = tokenise(d.bits.join(' '));
  return words.slice(nextWordIndex, nextWordIndex + 3).join(' ');
}
