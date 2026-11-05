/**
 * Calibration data (design D8, course-content: Calibration data is editable). Everything the rubric
 * needs to judge an answer lives here as plain data, so a problem found in live testing is fixed by
 * editing a JSON file, not code. The files sit next to this one and are loaded by `index.ts`.
 *
 * Levels are named for what an answer does, never as a ranking, and no grade appears anywhere.
 */
export const LEVELS = ['rock_solid', 'stepping_out', 'showing_off'] as const;
export type Level = (typeof LEVELS)[number];

export const BASIC_TENSES = ['present', 'preterite', 'near_future', 'conditional'] as const;
export type BasicTense = (typeof BASIC_TENSES)[number];

export interface FeatureDef {
  /** Short stable id, such as "E1". Shown nowhere; used by tests and the checklist's order. */
  id: string;
  /** What the student sees when the feature lights up. */
  label: string;
  /** Hard features are the ones students avoid; Showing off needs some of them. */
  hard: boolean;
  /** Any one of these phrases earns the feature (matched on whole words, ignoring accents and capitals). */
  phrases: string[];
  /** The feature also needs at least one of these phrases somewhere in the answer (for example a second justifier next to "porque"). */
  alsoRequires?: string[];
}

export interface ExampleAnswer {
  level: Level;
  text: string;
  source: 'teacher' | 'generated';
}

export interface Calibration {
  version: number;
  levels: Record<Level, { name: string; blurb: string }>;
  thresholds: {
    /** Stepping out: a justified opinion plus at least this many extra features. */
    steppingOut: { extras: number };
    /** Showing off: a justified opinion plus this many extras, at least `hard` of them hard. */
    showingOff: { extras: number; hard: number };
  };
  /** The basic frame: a starter, then later a justifier. Each pair is one justified opinion. */
  frame: { starters: string[]; justifiers: string[] };
  features: FeatureDef[];
  /** Phrases that show each basic tense, for the whole-test checklist. */
  tenses: Record<BasicTense, string[]>;
  /** Linking words allowed in swaps. They never count as features. */
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
  for (const l of LEVELS) {
    need(!!c.levels?.[l]?.name?.trim() && !!c.levels?.[l]?.blurb?.trim(), `level "${l}" needs a name and a blurb`);
  }
  need(posInt(c.thresholds?.steppingOut?.extras), 'stepping out needs at least 1 extra');
  need(posInt(c.thresholds?.showingOff?.extras), 'showing off needs at least 1 extra');
  need((c.thresholds?.showingOff?.hard ?? -1) >= 0, 'showing off needs a number of hard features (0 or more)');
  need(
    (c.thresholds?.showingOff?.extras ?? 0) > (c.thresholds?.steppingOut?.extras ?? 99),
    'showing off must need more extras than stepping out',
  );
  need(isStrings(c.frame?.starters) && c.frame!.starters.length > 0, 'the frame needs starters');
  need(isStrings(c.frame?.justifiers) && c.frame!.justifiers.length > 0, 'the frame needs justifiers');

  const features = Array.isArray(c.features) ? c.features : [];
  need(features.length > 0, 'at least one feature is needed');
  need(new Set(features.map((f) => f.id)).size === features.length, 'feature ids must be unique');
  features.forEach((f) => {
    need(!!f.id?.trim() && !!f.label?.trim() && isStrings(f.phrases) && f.phrases.length > 0, `feature "${f.id}" needs an id, a label and phrases`);
    need(f.alsoRequires === undefined || isStrings(f.alsoRequires), `feature "${f.id}" has a bad alsoRequires`);
  });
  const hardCount = features.filter((f) => f.hard).length;
  need(hardCount >= (c.thresholds?.showingOff?.hard ?? 0), 'there are fewer hard features than showing off needs');
  need(features.length >= (c.thresholds?.showingOff?.extras ?? 0), 'there are fewer features than showing off needs');
  for (const t of BASIC_TENSES) need(isStrings(c.tenses?.[t]), `tense "${t}" needs a list of phrases (it may be empty)`);
  need(isStrings(c.glueWords) && isStrings(c.cognates), 'glueWords and cognates must be lists of words');
  need(posInt(c.wholeTest?.tenses) && c.wholeTest!.tenses <= BASIC_TENSES.length, `the tense target must be from 1 to ${BASIC_TENSES.length}`);
  need(posInt(c.wholeTest?.justifiedOpinions), 'the justified-opinion target must be at least 1');
  (c.examples ?? []).forEach((e, i) =>
    need((LEVELS as readonly string[]).includes(e?.level) && !!e?.text?.trim(), `example ${i + 1} needs a level and text`),
  );

  // Grades are never part of calibration data, in code or on screen.
  need(!/\bgrade\b|\bwtg\b|\bmark\b|\bscore\b/i.test(JSON.stringify({ ...c, examples: undefined })), 'calibration must not contain grades or marks');
  return problems;
}
