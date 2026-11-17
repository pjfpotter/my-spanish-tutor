import { describe, expect, it } from 'vitest';
import { assessAnswer } from '../coach/rubric';
import { mergeSheets } from '../sheets/merge';
import { FREE_TIME, FREE_TIME_SHEET } from '../sheets/samples/free-time';
import { assembleTestingCourse, calibrationFromChunks, tagsFor, type TestingContent } from './testing-course-build';
import { validateCalibration } from './calibration/types';
import { validateCourse } from './schema';
import { SEED_COURSE } from './seed';

// Uses the project's own free-time builder, never a teacher's sheet.
describe('tagsFor', () => {
  it('tags openers, tenses, connectives, time phrases and adjectives from where a chunk sits', () => {
    expect(tagsFor('opinion', 'Me gusta ver', 'Opinion')).toEqual(['opinion', 'verb_phrase', 'present']);
    expect(tagsFor('opinion', 'voy a llevar', 'Going to wear')).toEqual(['verb_phrase', 'near_future']);
    expect(tagsFor('opinion', 'Me gustaría tener', 'Start')).toEqual(['opinion', 'verb_phrase', 'conditional']);
    expect(tagsFor('detail', 'fui a España', 'Where')).toEqual(['verb_phrase', 'preterite']);
    expect(tagsFor('detail', 'salgo con mis amigos', 'Activity')).toEqual(['verb_phrase', 'present']);
    expect(tagsFor('detail', 'un armario', 'Furniture')).toEqual([]);
    expect(tagsFor('link', 'aunque', 'Because word')).toEqual(['connective']);
    expect(tagsFor('time', 'Todos los días', 'When')).toEqual(['adverb_phrase']);
    expect(tagsFor('time', 'Mañana', 'Time')).toEqual(['adverb']);
    expect(tagsFor('reason', 'es divertido', 'Reason')).toEqual(['justification', 'verb_phrase', 'present']);
    expect(tagsFor('reason', 'hizo buen tiempo', 'Reason')).toEqual(['justification', 'verb_phrase', 'preterite']);
    expect(tagsFor('reason', 'rojo', 'Colour')).toEqual(['adjective']);
    expect(tagsFor('other', '¡Qué rollo!', 'Finish')).toEqual(['idiom']);
  });
});

describe('assembleTestingCourse', () => {
  const merged = mergeSheets([{ prefix: 'free', sheet: FREE_TIME_SHEET, interpretation: FREE_TIME }], { name: 'T', title: 'T', subtitle: 'T' });
  const content: TestingContent = {
    title: 'Test', testDate: '2026-12-18', labels: { free: 'free time' },
    questions: [{ position: 1, prefix: 'free', keyWord: { spanish: 'tiempo libre', english: 'free time' }, template: ['starter', 'activity', 'connector', 'reason'] }],
    modelAnswers: [{ questionPosition: 1, text: 'Me gusta montar en bici porque es divertido.' }],
  };
  const data = assembleTestingCourse(content, merged);

  it('derives one chunk per offered Spanish text, labelled with its builder, each with English', () => {
    const texts = data.chunks.map((c) => c.spanish.toLowerCase());
    expect(new Set(texts).size).toBe(texts.length);
    expect(data.chunks.every((c) => c.english && c.builder === 'free time')).toBe(true);
    expect(data.chunks.find((c) => c.spanish === 'Me gusta')?.featureTags).toContain('opinion');
  });

  it('takes the question from the sheet and its topics and starting slots from the builder', () => {
    const q = data.questions[0];
    expect(q.spanish).toBe('¿Qué haces en tu tiempo libre?');
    expect(q.template).toEqual(['free time starter', 'free time activity', 'free time connector', 'free time reason']);
    for (const t of q.topics) expect(data.chunks.some((c) => c.category === t)).toBe(true);
  });

  it('makes a calibration of its own that values a justified opinion and passes the calibration check', () => {
    expect(validateCalibration(data.calibration)).toEqual([]);
    expect(assessAnswer(data.calibration, 'Me gusta montar en bici porque es divertido.').value).toBeGreaterThan(0);
    expect(assessAnswer(data.calibration, 'Hola.').value).toBe(0);
  });

  it('refuses a missing label or a question the sheet does not have', () => {
    expect(() => assembleTestingCourse({ ...content, labels: {} }, merged)).toThrow(/No label/);
    expect(() => assembleTestingCourse({ ...content, questions: [{ ...content.questions[0], position: 2 }] }, merged)).toThrow(/no sheet question/);
  });

  it('is accepted by the course check once it has the fields the loader adds', () => {
    // Only the question count rule fails here: the invented content has one question, a course needs four or five.
    const r = validateCourse({ ...data, classCode: 'ABCD1234'.slice(0, 8), unlockAll: true });
    expect(r.ok ? [] : r.problems).toEqual(['a course needs 4 or 5 core questions, found 1']);
    expect(calibrationFromChunks(data.chunks, SEED_COURSE.calibration).glueWords).toEqual(SEED_COURSE.calibration.glueWords);
  });
});
