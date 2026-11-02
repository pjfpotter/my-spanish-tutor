import { BASIC_TENSES, type BasicTense, type Chunk, type Course, type FeatureTag, type Level } from '../course/schema.ts';

/**
 * The rubric engine (task 7.1, design D8). It counts the sentence-builder chunks an answer uses and
 * works out which rung it reaches, by rules alone: no model is involved, and it does not matter who
 * or what wrote the answer. It never produces a grade or a mark; the rungs are the only result.
 *
 * Two scopes (see lib/course/schema.ts):
 *  - one answer decides survival, opinion and detail (opinion and detail are two routes at the same height);
 *  - the whole test decides range (three basic tenses across all five answers), and showing off needs range.
 */
export type RubricCourse = Pick<Course, 'chunks' | 'questions' | 'markScheme'>;

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

/** What the student sees for each feature, by name. No grades, marks or numbers about levels. */
export const FEATURE_LABELS: Record<FeatureTag, string> = {
  verb_phrase: 'a verb phrase',
  opinion: 'an opinion',
  justification: 'a reason',
  connective: 'a connective',
  sequencer: 'a sequencer',
  adjective: 'a describing word',
  adjective_phrase: 'a describing phrase',
  adverb: 'an adverb',
  adverb_phrase: 'an adverb phrase',
  present: 'present tense',
  preterite: 'past tense (I did)',
  near_future: 'future (I am going to)',
  conditional: 'would (I would like)',
  other_tense: 'a fancy tense',
  tricky_syntax: 'tricky grammar',
  idiom: 'a fancy phrase',
};

export interface LitFeature {
  kind: FeatureTag;
  label: string;
  count: number;
  /** The chunks that earned it, as the student wrote them. */
  examples: string[];
}

export interface AnswerAssessment {
  questionPosition: number;
  matches: ChunkMatch[];
  /** Uses at least one chunk from the question's topics. */
  relevant: boolean;
  counts: {
    verbPhrases: number;
    sequencers: number;
    justifiedOpinions: number;
    /** Detail words by weight: a phrase is worth more than a single word. */
    detailPoints: number;
    fancy: number;
  };
  /** The basic tenses this answer uses. */
  tenses: BasicTense[];
  routes: { opinion: boolean; detail: boolean };
  /** What the answer earns by itself, before the whole-test tense gate. Null means no relevant sentence yet. */
  answerRung: 'survival' | 'opinion' | 'detail' | null;
  litFeatures: LitFeature[];
}

const FANCY_KINDS: FeatureTag[] = ['other_tense', 'tricky_syntax', 'idiom'];

export function assessAnswer(course: RubricCourse, questionPosition: number, text: string): AnswerAssessment {
  const q = course.questions.find((x) => x.position === questionPosition);
  if (!q) throw new Error(`no question ${questionPosition}`);
  const scheme = course.markScheme;
  const matches = matchChunks(text, course.chunks);
  const tagged = (tag: FeatureTag) => matches.filter((m) => m.chunk.featureTags.includes(tag));

  const w = scheme.rangeWeights;
  const detailPoints =
    tagged('adjective').length * w.adjective + tagged('adjective_phrase').length * w.adjective_phrase +
    tagged('adverb').length * w.adverb + tagged('adverb_phrase').length * w.adverb_phrase;

  const counts = {
    verbPhrases: tagged('verb_phrase').length,
    sequencers: tagged('sequencer').length,
    // An opinion and a reason go together; one of each makes one justified opinion.
    justifiedOpinions: Math.min(tagged('opinion').length, tagged('justification').length),
    detailPoints,
    fancy: FANCY_KINDS.reduce((n, k) => n + tagged(k).length, 0),
  };
  const relevant = matches.some((m) => q.topics.includes(m.chunk.category));
  const tenses = BASIC_TENSES.filter((t) => tagged(t).length > 0);

  const survival = relevant && counts.verbPhrases >= scheme.survival.verbPhrases;
  const routes = {
    opinion: survival && counts.justifiedOpinions >= scheme.opinion.justifiedOpinions,
    detail:
      survival &&
      counts.verbPhrases >= scheme.detail.verbPhrases &&
      counts.sequencers >= scheme.detail.sequencers &&
      counts.detailPoints >= scheme.detail.rangePoints,
  };
  const answerRung = !survival ? null : routes.detail ? 'detail' : routes.opinion ? 'opinion' : 'survival';

  // One line per kind of feature the answer used, in a fixed order, with the chunks that earned it.
  const litFeatures: LitFeature[] = [];
  for (const kind of Object.keys(FEATURE_LABELS) as FeatureTag[]) {
    const hits = tagged(kind);
    if (hits.length) litFeatures.push({ kind, label: FEATURE_LABELS[kind], count: hits.length, examples: hits.map((m) => m.chunk.spanish) });
  }
  return { questionPosition, matches, relevant, counts, tenses, routes, answerRung, litFeatures };
}

export interface TestAssessment {
  answers: (AnswerAssessment & {
    /** The final rung after the whole-test gate: survival, opinion, detail, range or showing off. Null means not yet. */
    rung: Level | null;
  })[];
  /** Different basic tenses used across the whole test. */
  tenses: BasicTense[];
  tensesNeeded: number;
  gatePassed: boolean;
  justifiedOpinions: number;
  /** About how many a whole speaking test wants. The coach steers toward it; it is never a gate. */
  justifiedOpinionsTarget: number;
}

/** Works out every answer's rung, applying the whole-test tense gate across all of them together. */
export function assessTest(course: RubricCourse, answers: { questionPosition: number; text: string }[]): TestAssessment {
  const assessed = answers.map((a) => assessAnswer(course, a.questionPosition, a.text));
  const tenses = BASIC_TENSES.filter((t) => assessed.some((a) => a.tenses.includes(t)));
  const needed = course.markScheme.range.basicTensesAcrossTest;
  const gatePassed = tenses.length >= needed;
  const fancyNeeded = course.markScheme.showing_off.fancyFeatures;

  return {
    answers: assessed.map((a) => {
      let rung: Level | null = a.answerRung;
      if (a.answerRung === 'detail' && gatePassed) {
        rung = a.counts.fancy >= fancyNeeded ? 'showing_off' : 'range';
      }
      return { ...a, rung };
    }),
    tenses,
    tensesNeeded: needed,
    gatePassed,
    justifiedOpinions: assessed.reduce((n, a) => n + a.counts.justifiedOpinions, 0),
    justifiedOpinionsTarget: course.markScheme.justifiedOpinionsTarget,
  };
}
