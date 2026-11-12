import type { Chunk, Course } from '../course/schema';
import { easeScore } from './model-answers';
import { addableUnused, partsFromText, removePart, textFromParts, type Part } from './builder';
import { assessAnswer } from './rubric';

/**
 * Helping with an answer that will not stick (answer-writing-coach: Changing a confirmed answer). When a
 * student keeps failing to recall an answer, the app suggests a simpler version: easier chunks first (cognates and
 * the chunks that recur across topics), then the hardest-weighted extras taken out. All rules, no model, and the
 * student chooses whether to use it.
 */
export const STALL = {
  /** Whole-answer attempts before an answer can count as stalled. */
  minAttempts: 6,
  /** How many of the latest attempts all have to fall short. */
  window: 5,
  /** Accuracy under this is a miss. */
  ceiling: 70,
} as const;

/** Whole-answer accuracies, oldest first. Stalled means repeated failures to recall and no mastery yet. */
export function isStalled(accuracies: number[], mastered: boolean): boolean {
  if (mastered || accuracies.length < STALL.minAttempts) return false;
  return accuracies.slice(-STALL.window).every((a) => a < STALL.ceiling);
}

type SimplifyCourse = Pick<Course, 'chunks' | 'calibration'>;

export interface Simplification {
  /** The simpler answer, ready to use. */
  text: string;
  /** Chunks the suggestion takes out. */
  removed: string[];
  /** Chunks the suggestion swaps for an easier one of the same kind. */
  swapped: { from: string; to: string }[];
}

const MAX_REMOVED = 2;
/** An easier chunk must beat the current one by this much on the ease score before it is offered. */
const EASIER_BY = 0.25;

/**
 * Whether one chunk can stand in for another without breaking the grammar. The sentence builder carries no
 * grammar data, so this is a cautious rule: the same kind of chunk with the same feature tags, and for
 * adjectives the same ending (so "divertido" is never swapped for "divertidas" after "porque es").
 */
export function canStandIn(a: Chunk, b: Chunk): boolean {
  if (a.category !== b.category) return false;
  if ([...a.featureTags].sort().join() !== [...b.featureTags].sort().join()) return false;
  if (a.featureTags.some((t) => t === 'adjective' || t === 'adjective_phrase')) return a.spanish.trim().slice(-1) === b.spanish.trim().slice(-1);
  return true;
}

const frame = (course: SimplifyCourse, parts: Part[]) => assessAnswer(course.calibration, textFromParts(parts)).justifiedOpinions;

/**
 * A simpler version of an answer, or null when there is nothing sensible to simplify. It never takes out the
 * justified opinion, so the simpler answer still works.
 */
export function simplerVersion(course: SimplifyCourse, text: string): Simplification | null {
  let parts = partsFromText(text, course.chunks);
  if (!parts.length) return null;
  const opinions = frame(course, parts);
  const swapped: Simplification['swapped'] = [];
  const removed: string[] = [];

  // 1. Easier chunks of the same kind: more cognates, more recurring chunks, shorter words.
  parts = parts.map((p) => {
    if (p.kind !== 'block' || !p.text) return p;
    const here = course.chunks.find((c) => c.spanish === p.text);
    if (!here) return p;
    const used = new Set(parts.filter((x) => x.kind === 'block' && x.text).map((x) => x.text));
    const best = addableUnused(course.chunks, p.category, used)
      .filter((c) => canStandIn(here, c))
      .map((c) => ({ c, s: easeScore(c.spanish, course.chunks, course.calibration) }))
      .sort((a, b) => b.s - a.s)[0];
    if (!best || best.s < easeScore(here.spanish, course.chunks, course.calibration) + EASIER_BY) return p;
    const next = parts.map((x) => (x.id === p.id ? { ...x, text: best.c.spanish } : x));
    if (frame(course, next) < opinions) return p; // never break the frame to make it easier
    swapped.push({ from: here.spanish, to: best.c.spanish });
    parts = next;
    return { ...p, text: best.c.spanish };
  });

  // 2. Take out the extras that add the most value (the hardest to learn), keeping the frame.
  for (let i = 0; i < MAX_REMOVED; i++) {
    const now = assessAnswer(course.calibration, textFromParts(parts)).value;
    const drops = parts
      .filter((p) => p.kind === 'block' && p.text)
      .map((p) => ({ p, rest: removePart(parts, p.id) }))
      .filter(({ rest }) => rest.length && frame(course, rest) >= opinions)
      .map(({ p, rest }) => ({ p, rest, drop: now - assessAnswer(course.calibration, textFromParts(rest)).value }))
      .filter((d) => d.drop > 0)
      .sort((a, b) => b.drop - a.drop);
    const pick = drops[0];
    if (!pick) break;
    removed.push(pick.p.text!);
    parts = pick.rest;
  }

  // A joining word left at either end has nothing to join.
  while (parts.length && parts[0].kind === 'glue') parts = parts.slice(1);
  while (parts.length && parts[parts.length - 1].kind === 'glue') parts = parts.slice(0, -1);

  const result = textFromParts(parts);
  if (!swapped.length && !removed.length) return null;
  return { text: result, removed, swapped };
}
