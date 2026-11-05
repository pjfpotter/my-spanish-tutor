import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { assessAnswer } from '../coach/rubric';
import { FANCY_TAGS, validateCourse } from './schema';
import { SEED_COURSE } from './seed';

const byCategory = (cats: string[]) => SEED_COURSE.chunks.filter((c) => cats.includes(c.category));

describe('seed course', () => {
  it('is a valid course', () => {
    const r = validateCourse(SEED_COURSE);
    expect(r.ok, r.ok ? '' : r.problems.join('; ')).toBe(true);
  });

  it('has five questions, each with a Spanish text and an English subtitle that differ', () => {
    expect(SEED_COURSE.questions).toHaveLength(5);
    for (const q of SEED_COURSE.questions) expect(q.spanish).not.toBe(q.english);
  });

  it('asks about "the party", not "a party"', () => {
    expect(SEED_COURSE.questions[3].spanish).toBe('¿Qué vas a llevar para la fiesta?');
    expect(SEED_COURSE.questions[3].english).toBe('What are you going to wear to the party?');
  });

  it('has no duplicate Spanish chunks (the seed keys chunks by their Spanish text)', () => {
    const texts = SEED_COURSE.chunks.map((c) => c.spanish);
    expect(new Set(texts).size, 'duplicate: ' + texts.filter((t, i) => texts.indexOf(t) !== i)).toBe(texts.length);
  });

  it('lets every question be answered with a real sentence from its own topic', () => {
    for (const q of SEED_COURSE.questions) {
      const verbChunks = byCategory(q.topics).filter((c) => c.featureTags.includes('verb_phrase'));
      expect(verbChunks.length, `question ${q.position}`).toBeGreaterThan(0);
    }
  });

  it('has a Rock solid model answer for every question and uses only Rock solid, Stepping out and Showing off', () => {
    for (const q of SEED_COURSE.questions) {
      expect(SEED_COURSE.modelAnswers.some((a) => a.questionPosition === q.position && a.level === 'rock_solid'), `question ${q.position}`).toBe(true);
    }
    expect(new Set(SEED_COURSE.modelAnswers.map((a) => a.level))).toEqual(new Set(['rock_solid', 'stepping_out', 'showing_off']));
  });

  it('makes the tense target reachable from the model answers across the test', () => {
    const text = SEED_COURSE.modelAnswers.map((a) => a.text).join(' ');
    const tenses = assessAnswer(SEED_COURSE.calibration, text).tenses;
    expect(tenses.length).toBeGreaterThanOrEqual(SEED_COURSE.calibration.wholeTest.tenses);
  });

  it('keeps each fancy chunk labelled fancy, with a basic-tense or fancy tag that explains why', () => {
    for (const c of SEED_COURSE.chunks.filter((x) => x.category === 'fancy')) {
      expect(c.featureTags.some((t) => (FANCY_TAGS as readonly string[]).includes(t)), c.spanish).toBe(true);
    }
  });
});

describe('grades stay behind the scenes', () => {
  // Nothing a student sees may mention grades, marks or levels as numbers. This scans the app's
  // screens and the course data for the words, so a mention fails the build.
  const root = path.join(import.meta.dirname, '../..');
  const walk = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));
  const files = [...walk(path.join(root, 'app')), ...walk(path.join(root, 'lib/ui')), path.join(root, 'lib/tele/phrase-bank.ts')].filter((f) => /\.(tsx?|css)$/.test(f));

  it('finds the screens to check', () => {
    expect(files.length).toBeGreaterThan(5);
  });

  it.each(files.map((f) => [path.relative(root, f), f]))('%s never says grade, WTG or working towards', (_name, file) => {
    const text = readFileSync(file, 'utf8');
    // Comments are fine to explain the rule elsewhere; screens and strings are not. Strip comments first.
    const code = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
    expect(code).not.toMatch(/\bWTG\b|working towards|\bgrades?\b/i);
  });
});
