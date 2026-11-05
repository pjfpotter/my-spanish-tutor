import { BASIC_TENSES, LEVELS, type BasicTense, type Calibration, type FeatureDef, type Level } from '../course/calibration/types.ts';
import type { Chunk } from '../course/schema.ts';

/**
 * The rubric engine (tasks 7.1 and 7.7, design D8). It counts the features an answer uses, as defined
 * by the course's calibration data, and works out its level by rules alone: no model is involved and it
 * does not matter who or what wrote the answer. It never produces a grade or a mark.
 *
 *  - A justified opinion is a starter followed by a justifier ("porque", "ya que", "dado que").
 *  - Rock solid is one justified opinion. Stepping out adds at least one extra feature. Showing off
 *    adds enough extras, including enough hard ones. Each feature counts once; repeating the frame adds nothing.
 *  - The whole-test targets (tenses, justified opinions) are a checklist and gate nothing.
 */

/** Words as the matcher sees them: lowercase, no accents (but ñ stays), no punctuation. */
export function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/ñ/g, '\u0001')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\u0001/g, 'ñ')
    .replace(/[^\p{L}\p{N}ñ\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

/** Where a phrase starts in a list of words (whole-word matches only). */
function findPhrase(words: string[], phrase: string): number[] {
  const t = tokens(phrase);
  const at: number[] = [];
  if (!t.length) return at;
  for (let i = 0; i + t.length <= words.length; i++) if (t.every((w, k) => words[i + k] === w)) at.push(i);
  return at;
}
const hasAny = (words: string[], phrases: string[]) => phrases.some((p) => findPhrase(words, p).length > 0);

export interface ChunkMatch {
  chunk: Chunk;
  /** Index of the first and one past the last matched word in the answer. */
  from: number;
  to: number;
}

/**
 * Finds the chunks an answer uses. Longest chunks first, and a word belongs to at most one match, so
 * "salgo con mis amigos" is not also counted as "con mis amigos". Matches come back in reading order.
 */
export function matchChunks(text: string, chunks: Chunk[]): ChunkMatch[] {
  const words = tokens(text);
  const taken = new Array<boolean>(words.length).fill(false);
  const found: ChunkMatch[] = [];
  const byLength = chunks
    .map((chunk) => ({ chunk, t: tokens(chunk.spanish) }))
    .filter((c) => c.t.length)
    .sort((a, b) => b.t.length - a.t.length);

  for (const { chunk, t } of byLength) {
    for (let i = 0; i + t.length <= words.length; i++) {
      if (t.every((w, k) => words[i + k] === w && !taken[i + k])) {
        for (let k = 0; k < t.length; k++) taken[i + k] = true;
        found.push({ chunk, from: i, to: i + t.length });
        i += t.length - 1;
      }
    }
  }
  return found.sort((a, b) => a.from - b.from);
}

export interface LitFeature {
  id: string;
  /** What the student sees, by name. */
  label: string;
  hard: boolean;
}

export interface AnswerAssessment {
  /** Null until the answer has a justified opinion: there is no level to show yet, and nothing is lowered. */
  level: Level | null;
  justifiedOpinions: number;
  /** The features the answer uses, in the order the calibration data lists them. */
  features: LitFeature[];
  extras: number;
  hardExtras: number;
  /** The basic tenses this answer uses. */
  tenses: BasicTense[];
}

/** Pure level rule, so "what if one feature were removed" can be asked without re-reading text. */
export function levelFromCounts(cal: Calibration, justifiedOpinions: number, extras: number, hardExtras: number): Level | null {
  if (justifiedOpinions < 1) return null;
  const { steppingOut, showingOff } = cal.thresholds;
  if (extras >= showingOff.extras && hardExtras >= showingOff.hard) return 'showing_off';
  if (extras >= steppingOut.extras) return 'stepping_out';
  return 'rock_solid';
}

function featureHit(words: string[], f: FeatureDef): boolean {
  return hasAny(words, f.phrases) && (!f.alsoRequires || hasAny(words, f.alsoRequires));
}

/** Each starter followed by a justifier (before the next justifier) makes one justified opinion. */
function countJustifiedOpinions(words: string[], cal: Calibration): number {
  const starters = cal.frame.starters.flatMap((s) => findPhrase(words, s));
  const justifiers = cal.frame.justifiers.flatMap((j) => findPhrase(words, j)).sort((a, b) => a - b);
  let count = 0;
  let prev = -1;
  for (const j of justifiers) {
    if (starters.some((s) => s < j && s > prev)) count++;
    prev = j;
  }
  return count;
}

export function assessAnswer(cal: Calibration, text: string): AnswerAssessment {
  const words = tokens(text);
  const features = cal.features.filter((f) => featureHit(words, f)).map(({ id, label, hard }) => ({ id, label, hard }));
  const justifiedOpinions = countJustifiedOpinions(words, cal);
  const extras = features.length;
  const hardExtras = features.filter((f) => f.hard).length;
  return {
    level: levelFromCounts(cal, justifiedOpinions, extras, hardExtras),
    justifiedOpinions,
    features,
    extras,
    hardExtras,
    tenses: BASIC_TENSES.filter((t) => hasAny(words, cal.tenses[t])),
  };
}

/** True when removing any single feature (one swap) leaves the answer on the same level. */
export function survivesOneSwap(cal: Calibration, a: AnswerAssessment): boolean {
  if (!a.level) return false;
  return a.features.every((f) => levelFromCounts(cal, a.justifiedOpinions, a.extras - 1, a.hardExtras - (f.hard ? 1 : 0)) === a.level);
}

export interface ChecklistItem {
  label: string;
  have: number;
  need: number;
  met: boolean;
}

export interface TestAssessment {
  answers: (AnswerAssessment & { questionPosition: number })[];
  /** Different basic tenses used across the whole test. */
  tenses: BasicTense[];
  justifiedOpinions: number;
  /** Targets shown to the student as ticks. None of them gates a level. */
  checklist: { tenses: ChecklistItem; justifiedOpinions: ChecklistItem };
}

export function assessTest(cal: Calibration, answers: { questionPosition: number; text: string }[]): TestAssessment {
  const assessed = answers.map((a) => ({ ...assessAnswer(cal, a.text), questionPosition: a.questionPosition }));
  const tenses = BASIC_TENSES.filter((t) => assessed.some((a) => a.tenses.includes(t)));
  const justifiedOpinions = assessed.reduce((n, a) => n + a.justifiedOpinions, 0);
  const item = (label: string, have: number, need: number): ChecklistItem => ({ label, have, need, met: have >= need });
  return {
    answers: assessed,
    tenses,
    justifiedOpinions,
    checklist: {
      tenses: item('different tenses across your answers', tenses.length, cal.wholeTest.tenses),
      justifiedOpinions: item('opinions with a reason across your answers', justifiedOpinions, cal.wholeTest.justifiedOpinions),
    },
  };
}

export { LEVELS };
