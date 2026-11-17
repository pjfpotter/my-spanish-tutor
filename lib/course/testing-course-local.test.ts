import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { assessAnswer } from '../coach/rubric';
import { buildWordBank, checkAgainstBank } from '../coach/validator';
import { buildBuilder } from '../sheets/builder';
import { clash, compose, isReady, parseText, prepare, slotItems } from '../sheets/engine';
import { unmatchedQuestions, matchSheetQuestion } from '../sheets/question-match';
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
  const B = prepare(buildBuilder('local', course.sheet.sheet, course.sheet.interpretation));
  const Q = (position: number) => B.questions[matchSheetQuestion(course.sheet.interpretation, course.questions[position - 1].spanish) as number];

  it('is used, and validates', () => {
    expect(loaded.source, loaded.note).toBe('local');
    const r = validateCourse(course);
    expect(r.ok, r.ok ? '' : r.problems.join('; ')).toBe(true);
    expect(course.classCode).toBe('PRBA7K3M');
    expect(course.unlockAll).toBe(true);
  });

  it('has five questions and every one has its own sentence builder', () => {
    expect(course.questions).toHaveLength(5);
    expect(unmatchedQuestions(course.questions, course.sheet.interpretation)).toEqual([]);
    expect(course.questions.map((q) => Q(q.position).blocks)).toEqual([[0], [1], [2], [3], [4]]);
  });

  it('has no duplicate Spanish chunks and a gloss for every one', () => {
    const texts = course.chunks.map((c) => c.spanish.toLowerCase());
    expect(new Set(texts).size, texts.filter((t, i) => texts.indexOf(t) !== i).join(', ')).toBe(texts.length);
    for (const c of course.chunks) expect(c.english, c.spanish).not.toBe('');
  });

  it('has model answers for every question that are valid, worth something and can be written on the sheet', () => {
    const bank = buildWordBank(course.chunks, course.calibration.glueWords);
    for (const q of course.questions) {
      const own = course.modelAnswers.filter((a) => a.questionPosition === q.position);
      expect(own.length, `question ${q.position}`).toBeGreaterThan(0);
      for (const a of own) {
        expect(checkAgainstBank(a.text, bank).ok, a.text).toBe(true);
        expect(assessAnswer(course.calibration, a.text).value, a.text).toBeGreaterThan(0);
        // Written the way the write screen composes it: reading it back must give the same text, confirmed.
        const read = parseText(B, a.text, Q(q.position));
        expect(read.off, a.text).toEqual([]);
        expect(isReady(B, read.ans, Q(q.position)), a.text).toBe(true);
        expect(compose(B, read.ans, 'es', Q(q.position)), a.text).toBe(a.text);
        expect(signOff(B, read.ans, Q(q.position)), a.text).toEqual({ code: 'ok' });
      }
    }
  });

  it('offers a question only its own part: every slot of every other builder is refused', () => {
    for (const q of course.questions) {
      const mine = Q(q.position);
      for (const sd of B.slots) {
        const item = slotItems(B, sd)[0];
        if (!item) continue;
        const refused = clash(B, {}, sd.key, item, mine)?.msg === 'That part is for another question.';
        expect(refused, `${sd.key} for question ${q.position}`).toBe(!(mine.blocks as number[]).includes(sd.block as number));
      }
    }
  });
});
