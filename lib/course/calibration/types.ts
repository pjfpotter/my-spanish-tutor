/**
 * Calibration data (design D8, answer-writing-coach: Value grows with detail). Everything the rubric
 * needs to value an answer lives here as plain data, so a problem found in live testing is fixed by
 * editing a JSON file, not code. The files sit next to this one and are loaded by `index.ts`.
 *
 * There are no level names, grades or ladders. An answer is worth an amount that grows as the student
 * adds features; each feature counts once.
 */
export const BASIC_TENSES = ['present', 'preterite', 'near_future', 'conditional'] as const;
export type BasicTense = (typeof BASIC_TENSES)[number];

export const FEATURE_WEIGHTS = [0, 1, 2] as const;
export type FeatureWeight = (typeof FEATURE_WEIGHTS)[number];

export interface FeatureDef {
  /** Short stable id, such as "E1". Shown nowhere; used by tests and the checklist's order. */
  id: string;
  /** What the student sees when the feature lights up. */
  label: string;
  /** How hard the feature is to learn: 0 easy, 1 medium, 2 hard. Its value is one unit plus this weight. */
  weight: FeatureWeight;
  /** Any one of these phrases earns the feature (matched on whole words, ignoring accents and capitals). */
  phrases: string[];
  /** The feature also needs at least one of these phrases somewhere in the answer (for example a second justifier next to "porque"). */
  alsoRequires?: string[];
}

export interface ExampleAnswer {
  /** How rich the teacher judged it: 1 simplest, 3 richest. Never shown; the regression test keeps values in this order. */
  rank: 1 | 2 | 3;
  text: string;
  source: 'teacher' | 'generated';
  /** The feature ids the answer should light up (regression fixture). */
  features: string[];
  /** The value the answer should be worth (regression fixture). */
  value: number;
}

export interface Calibration {
  version: number;
  /** The basic frame: a starter, then later a justifier. A justified opinion is worth `value`, once. */
  frame: { starters: string[]; justifiers: string[]; value: number };
  /** When an answer's value passes this, the coach says once that a longer answer takes more learning. */
  loadNoteValue: number;
  features: FeatureDef[];
  /** Phrases that show each basic tense, for the whole-test checklist. */
  tenses: Record<BasicTense, string[]>;
  /** Linking words allowed in swaps. They never count as features and carry no value. */
  glueWords: string[];
  /** Words (without accents) that read as cognates for an English speaker; the easiest-route score favours them. */
  cognates: string[];
  /** Whole-test targets. Shown as a checklist; they gate nothing. */
  wholeTest: { tenses: number; justifiedOpinions: number };
  /** The teacher's examples, run as regression fixtures. */
  examples: ExampleAnswer[];
}

const isStrings = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === 'string' && x.trim());
const posInt = (v: unknown) => Number.isInteger(v) && (v as number) >= 1;

/** Lists every problem in a calibration object, or returns an empty list. */
export function validateCalibration(input: unknown): string[] {
  const c = (input ?? {}) as Partial<Calibration>;
  const problems: string[] = [];
  const need = (ok: boolean, text: string) => ok || problems.push(`calibration: ${text}`);

  need(posInt(c.version), 'version must be a whole number of at least 1');
  need(isStrings(c.frame?.starters) && c.frame!.starters.length > 0, 'the frame needs starters');
  need(isStrings(c.frame?.justifiers) && c.frame!.justifiers.length > 0, 'the frame needs justifiers');
  need(posInt(c.frame?.value), 'the frame needs a value of at least 1');
  need(posInt(c.loadNoteValue), 'loadNoteValue must be a whole number of at least 1');

  const features = Array.isArray(c.features) ? c.features : [];
  need(features.length > 0, 'at least one feature is needed');
  need(new Set(features.map((f) => f.id)).size === features.length, 'feature ids must be unique');
  features.forEach((f) => {
    need(!!f.id?.trim() && !!f.label?.trim() && isStrings(f.phrases) && f.phrases.length > 0, `feature "${f.id}" needs an id, a label and phrases`);
    need((FEATURE_WEIGHTS as readonly number[]).includes(f.weight as number), `feature "${f.id}" needs a weight of 0, 1 or 2`);
    need(f.alsoRequires === undefined || isStrings(f.alsoRequires), `feature "${f.id}" has a bad alsoRequires`);
  });
  for (const t of BASIC_TENSES) need(isStrings(c.tenses?.[t]), `tense "${t}" needs a list of phrases (it may be empty)`);
  need(isStrings(c.glueWords) && isStrings(c.cognates), 'glueWords and cognates must be lists of words');
  need(posInt(c.wholeTest?.tenses) && c.wholeTest!.tenses <= BASIC_TENSES.length, `the tense target must be from 1 to ${BASIC_TENSES.length}`);
  need(posInt(c.wholeTest?.justifiedOpinions), 'the justified-opinion target must be at least 1');
  (c.examples ?? []).forEach((e, i) =>
    need(
      [1, 2, 3].includes(e?.rank) && !!e?.text?.trim() && isStrings(e?.features) && Number.isInteger(e?.value),
      `example ${i + 1} needs a rank, text, features and a value`,
    ),
  );

  // Grades are never part of calibration data, in code or on screen.
  need(!/\bgrade\b|\bwtg\b|\bmark\b|\bscore\b/i.test(JSON.stringify({ ...c, examples: undefined })), 'calibration must not contain grades or marks');
  return problems;
}
