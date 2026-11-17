import { buildBuilder, type Builder, type Item } from '../sheets/builder.ts';
import { prepare, slotItems } from '../sheets/engine.ts';
import type { Interpretation } from '../sheets/interpretation.ts';
import type { Sheet } from '../sheets/types.ts';
import { tokens } from '../coach/rubric.ts';
import { GOING_OUT, type Calibration, type FeatureDef } from './calibration/index.ts';
import type { Chunk, Course, FeatureTag, ModelAnswer, Question } from './schema.ts';

/**
 * Builds the testing course (testing-course-five-builders) from the merged sentence builder and a small content
 * file: chunks come from the builder, so they are exactly what the write screen offers, and only the questions'
 * key words, starting slots and model answers are written by hand. Pure: the build script reads and writes the files.
 */
export interface TestingContent {
  title: string;
  testDate: string;
  /** Block prefix to the name shown with its chunks, for example `film` to `films`. */
  labels: Record<string, string>;
  questions: { position: number; prefix: string; keyWord: { spanish: string; english: string }; template: string[] }[];
  modelAnswers: ModelAnswer[];
  /** Overrides for the heuristic tags, keyed by the chunk's Spanish text. */
  tagOverrides?: Record<string, FeatureTag[]>;
}

const OPINION = /gusta|encanta|chifla|prefiero|odio|detesto|opini[oó]n|pienso|creo|dir[ií]a/i;
const PRETERITE = /^(fui|hice|com[ií]|llovi[oó]|hizo|fue|lo pas[eé]|me gust[oó]|me encant[oó])\b/i;
const FIRST_PERSON = /^(leo|salgo|voy|juego|navego|hablo|descargo|hago|llevo|suelo|comparto|me gusta|me encanta|prefiero|odio)\b/i;
const HAS_VERB = /\b(llevar|ver|tener|hay|tiene)\b/i;

/** The mark-scheme tags a chunk counts for, from where it sits on the sheet and what it says. A guess, so it can be overridden. */
export function tagsFor(kind: string, spanish: string, title: string): FeatureTag[] {
  const es = spanish.trim();
  const words = es.split(/\s+/).length;
  const tense: FeatureTag = /^(voy a|vas a)\b/i.test(es) ? 'near_future' : /gustar[ií]a/i.test(es) ? 'conditional' : PRETERITE.test(es) ? 'preterite' : 'present';
  const tags: FeatureTag[] = [];
  if (/^¡?qué\b/i.test(es) || /¡qué/i.test(es)) tags.push('idiom');
  switch (kind) {
    case 'opinion':
      if (OPINION.test(es)) tags.push('opinion');
      if (/\b(es|porque|ya que)\b/i.test(es) && /gusta/i.test(es)) tags.push('justification');
      if (FIRST_PERSON.test(es) || HAS_VERB.test(es)) tags.push('verb_phrase', tense);
      return tags;
    case 'link': return ['connective'];
    case 'time': return [words > 1 ? 'adverb_phrase' : 'adverb'];
    case 'reason':
      if (title === 'Colour' || title === 'Describe it' || !/^(es|me|hizo|hice|llovi|com[ií])\b/i.test(es)) return [words > 1 ? 'adjective_phrase' : 'adjective'];
      return ['justification', 'verb_phrase', tense];
    case 'other':
      if (/^(muy|bastante|extremadamente)$/i.test(es)) return ['adverb'];
      return tags;
    default:
      if (PRETERITE.test(es)) return [...tags, 'verb_phrase', 'preterite'];
      if (FIRST_PERSON.test(es)) return [...tags, 'verb_phrase', 'present'];
      return tags;
  }
}

/** The course chunks: every chunk the write screen offers, once by Spanish text (the seed keys chunks by it). */
export function chunksFromBuilder(B: Builder, content: Pick<TestingContent, 'labels' | 'tagOverrides'>): Chunk[] {
  const offered = new Set<string>();
  for (const sd of B.slots) for (const it of slotItems(B, sd)) offered.add(it.id);
  const seen = new Set<string>(), out: Chunk[] = [];
  for (const col of B.columns) {
    const prefix = col.key.split('_')[0];
    const label = content.labels[prefix];
    if (!label) throw new Error(`No label for the "${prefix}" builder.`);
    for (const it of col.items as Item[]) {
      // A printed fixed word ("está") is never picked, but the student says it, so it is a chunk too.
      if (!col.static && !offered.has(it.id)) continue;
      const spanish = it.adj && it.base ? it.base : it.es;
      const key = spanish.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        spanish, english: it.en ?? '', category: `${label} ${col.title.toLowerCase()}`,
        featureTags: content.tagOverrides?.[spanish] ?? tagsFor(col.kind, spanish, col.title),
        recycled: false, builder: label,
      });
    }
  }
  return out;
}

const phrase = (s: string) => tokens(s).join(' ');
const uniq = (xs: string[]) => [...new Set(xs.map(phrase).filter(Boolean))];

/**
 * A calibration for the testing course, worked out from its own chunks. The shared one lists phrases from other
 * courses, so every answer here would be worth nothing. Which chunks count for what comes from their tags, so it is
 * as good as the tags are: a testing aid, not a teacher's mark scheme. Glue words and targets come from the shared one.
 */
export function calibrationFromChunks(chunks: Chunk[], base: Calibration = GOING_OUT): Calibration {
  const has = (c: Chunk, t: FeatureTag) => c.featureTags.includes(t);
  const verbs = chunks.filter((c) => (has(c, 'verb_phrase') && !has(c, 'justification')) || has(c, 'opinion'));
  const tense = (t: FeatureTag) => uniq(verbs.filter((c) => has(c, t)).map((c) => c.spanish));
  const list = (cs: Chunk[]) => uniq(cs.map((c) => c.spanish));
  const defs: (FeatureDef & { phrases: string[] })[] = [
    { id: 'T1', label: 'a contrast', weight: 0, phrases: uniq(chunks.filter((c) => /^(aunque|sin embargo)$/i.test(c.spanish)).map((c) => c.spanish)) },
    { id: 'T2', label: 'a time phrase', weight: 0, phrases: list(chunks.filter((c) => (has(c, 'adverb_phrase') || has(c, 'adverb')) && !/how much/.test(c.category))) },
    { id: 'T3', label: 'another time frame', weight: 1, phrases: list(chunks.filter((c) => has(c, 'near_future') || has(c, 'conditional') || has(c, 'preterite'))) },
    { id: 'T4', label: 'a describing phrase', weight: 0, phrases: list(chunks.filter((c) => has(c, 'adjective_phrase'))) },
    { id: 'T5', label: 'a fancy phrase', weight: 2, phrases: list(chunks.filter((c) => has(c, 'idiom'))) },
  ];
  return {
    ...base,
    frame: { starters: uniq(verbs.map((c) => c.spanish)), justifiers: ['porque', 'ya que', 'dado que'], value: base.frame.value },
    features: defs.filter((d) => d.phrases.length),
    tenses: { present: tense('present'), preterite: tense('preterite'), near_future: tense('near_future'), conditional: tense('conditional') },
    cognates: [],
    examples: [],
  };
}

export type TestingCourseData = Omit<Course, 'classCode' | 'unlockAll'>;

export function assembleTestingCourse(content: TestingContent, merged: { sheet: Sheet; interpretation: Interpretation }): TestingCourseData {
  const B = prepare(buildBuilder('testing', merged.sheet, merged.interpretation));
  const chunks = chunksFromBuilder(B, content);
  const questions: Question[] = content.questions.map((q) => {
    const sq = B.questions[q.position - 1];
    if (!sq) throw new Error(`Question ${q.position} has no sheet question.`);
    const label = content.labels[q.prefix];
    const cat = (key: string) => {
      const col = B.cols[`${q.prefix}_${key}`];
      if (!col) throw new Error(`Question ${q.position}: no column "${key}" in the "${q.prefix}" builder.`);
      return `${label} ${col.title.toLowerCase()}`;
    };
    const own = [...new Set(B.columns.filter((c) => c.key.startsWith(`${q.prefix}_`) && !c.static).map((c) => `${label} ${c.title.toLowerCase()}`))];
    return {
      position: q.position, spanish: sq.es, english: sq.en, recycled: false,
      topics: own.filter((t) => chunks.some((c) => c.category === t)),
      template: [...new Set(q.template.map(cat))],
      keyWord: q.keyWord,
    };
  });
  return { title: content.title, testDate: content.testDate, chunks, questions, calibration: calibrationFromChunks(chunks), modelAnswers: content.modelAnswers, sheet: merged };
}
