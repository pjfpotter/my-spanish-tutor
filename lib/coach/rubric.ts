import { BASIC_TENSES, type BasicTense, type Calibration, type FeatureDef } from '../course/calibration/types.ts';
import type { Chunk } from '../course/schema.ts';

/**
 * The rubric engine (tasks 7.1, 7.7 and 26.1a, design D8). It counts the features an answer uses, as
 * defined by the course's calibration data, and works out the answer's value by rules alone: no model
 * is involved and it does not matter who or what wrote the answer. There are no levels, grades or marks.
 *
 *  - A justified opinion is a starter followed by a justifier ("porque", "ya que", "dado que"). It is
 *    worth the frame's value, once, however many times it is repeated.
 *  - Each other feature is worth one unit plus its weight (how hard it is to learn), once.
 *  - Glue words, accents, small slips and recognition failures never change the value.
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
export function findPhrase(words: string[], phrase: string): number[] {
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
  weight: number;
  /** What this feature adds to the answer's value: one unit plus its weight. */
  value: number;
}

export interface AnswerAssessment {
  justifiedOpinions: number;
  /** The features the answer uses, in the order the calibration data lists them. Each counts once. */
  features: LitFeature[];
  /** What the answer is worth, in the in-app currency: the frame (once) plus each feature's value. */
  value: number;
  /** The basic tenses this answer uses. */
  tenses: BasicTense[];
}

/** What a feature adds: one unit per extra, plus a weight for how hard it is to learn. */
export const featureValue = (f: Pick<FeatureDef, 'weight'>) => 1 + f.weight;

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
  const features = cal.features
    .filter((f) => featureHit(words, f))
    .map(({ id, label, weight }) => ({ id, label, weight, value: 1 + weight }));
  const justifiedOpinions = countJustifiedOpinions(words, cal);
  const value = (justifiedOpinions > 0 ? cal.frame.value : 0) + features.reduce((n, f) => n + f.value, 0);
  return {
    justifiedOpinions,
    features,
    value,
    tenses: BASIC_TENSES.filter((t) => hasAny(words, cal.tenses[t])),
  };
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
  /** Targets shown to the student as ticks. None of them gates anything. */
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
