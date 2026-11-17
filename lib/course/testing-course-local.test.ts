import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { assessAnswer } from '../coach/rubric';
import { buildWordBank, checkAgainstBank } from '../coach/validator';
import { assignments, withoutBuilder } from './assignments';
import { buildBuilder } from '../sheets/builder';
import { compose, isReady, parseText, prepare } from '../sheets/engine';
import { resolveBuilderQuestion } from '../sheets/question-match';
import { signOff } from '../sheets/signoff';
import { validateCourse } from './schema';
import { loadTestingCourse, TESTING_DATA_DIR } from './testing-course';

/**
 * Local only (testing-course-five-builders). The testing course is built from the teacher's sheets, which are never
 * committed, so this whole file is skipped when the local data is not there. Run `node scripts/build-testing-course.mjs`
 * first. It checks the course the way the spec states it: it validates, every question has a sentence builder, every
 * model answer can be written and confirmed on the write screen, and a question never offers another question's part.
 */
const ready = existsSync(path.join(process.cwd(), TESTING_DATA_DIR, 'course.json'));

describe.skipIf(!ready)('the testing course built from local data', () => {
  // Read only when the data is there: skipIf still runs this body to collect the tests.
  const loaded = ready ? loadTestingCourse() : loadTestingCourse('/nonexistent');
  const course = loaded.course;
  const own = (position: number) => {
    const q = course.questions.find((x) => x.position === position)!;
    const b = course.builders.find((x) => x.key === q.builder)!;
    const B = prepare(buildBuilder(b.key, b.sheet, b.interpretation));
    const link = resolveBuilderQuestion(b.interpretation, q);
    return { q, b, B, Q: link.ok && link.index !== null ? B.questions[link.index] : undefined };
  };

  it('is used, and validates', () => {
    expect(loaded.source, loaded.note).toBe('local');
    const r = validateCourse(course);
    expect(r.ok, r.ok ? '' : r.problems.join('; ')).toBe(true);
    expect(course.classCode).toBe('PRBA7K3M');
    expect(course.unlockAll).toBe(true);
  });

  it('has five questions and every one has its own sentence builder, used whole', () => {
    expect(course.questions).toHaveLength(5);
    expect(course.builders).toHaveLength(5);
    expect(withoutBuilder(course)).toEqual([]);
    expect(new Set(course.questions.map((q) => q.builder)).size).toBe(5);
    // Each question's own text is its builder's question, so the link is filled in by the text, not guessed.
    for (const a of assignments(course)) expect(a.part, `question ${a.position}`).toMatch(/^question 0: /);
    for (const q of course.questions) expect(own(q.position).Q, `question ${q.position}`).toBeDefined();
  });

  it('has no duplicate Spanish chunks and a gloss for every one', () => {
    const texts = course.chunks.map((c) => c.spanish.toLowerCase());
    expect(new Set(texts).size, texts.filter((t, i) => texts.indexOf(t) !== i).join(', ')).toBe(texts.length);
    for (const c of course.chunks) expect(c.english, c.spanish).not.toBe('');
  });

  it('has model answers for every question that are valid, worth something and can be written on the sheet', () => {
    const bank = buildWordBank(course.chunks, course.calibration.glueWords);
    for (const q of course.questions) {
      const { b, B, Q } = own(q.position);
      const answers = course.modelAnswers.filter((a) => a.questionPosition === q.position);
      expect(answers.length, `question ${q.position}`).toBeGreaterThan(0);
      for (const a of answers) {
        expect(checkAgainstBank(a.text, bank).ok, a.text).toBe(true);
        // Scored with its own builder's calibration, which is what a student's answer is scored with.
        expect(assessAnswer(b.calibration, a.text).value, a.text).toBeGreaterThan(0);
        // Written the way the write screen composes it: reading it back must give the same text, confirmed.
        const read = parseText(B, a.text, Q);
        expect(read.off, a.text).toEqual([]);
        expect(isReady(B, read.ans, Q), a.text).toBe(true);
        expect(compose(B, read.ans, 'es', Q), a.text).toBe(a.text);
        expect(signOff(B, read.ans, Q), a.text).toEqual({ code: 'ok' });
      }
    }
  });
});
