import { describe, expect, it } from 'vitest';
import { FREE_TIME } from './samples/free-time';
import { matchSheetQuestion, unmatchedQuestions } from './question-match';

const interp = { questions: [{ es: '¿Qué haces en tu tiempo libre?', en: 'x' }, { es: '¿Qué hiciste ayer?', en: 'y' }, { es: '¿Qué hiciste ayer?', en: 'dup' }] };

describe('matching a course question to a sheet question', () => {
  it('matches the same text', () => expect(matchSheetQuestion(FREE_TIME, '¿Qué haces en tu tiempo libre?')).toBe(0));
  it('ignores capitals, accents and punctuation', () => expect(matchSheetQuestion(interp, 'que haces en tu TIEMPO libre')).toBe(0));
  it('does not match a different question', () => expect(matchSheetQuestion(FREE_TIME, '¿Qué tipo de películas te gustan y por qué?')).toBeNull());
  it('has no match for an empty question or no interpretation', () => {
    expect(matchSheetQuestion(interp, '  ')).toBeNull();
    expect(matchSheetQuestion(null, '¿Qué hiciste ayer?')).toBeNull();
  });
  it('takes the first of two sheet questions with the same text', () => expect(matchSheetQuestion(interp, '¿Qué hiciste ayer?')).toBe(1));
  it('lists the questions with no match', () => {
    const qs = [{ position: 1, spanish: '¿Qué hiciste ayer?' }, { position: 2, spanish: '¿Y mañana?' }];
    expect(unmatchedQuestions(qs, interp).map((q) => q.position)).toEqual([2]);
  });
});

describe('the seeded courses', () => {
  it('report exactly the four going-out questions as having no sentence builder', async () => {
    const { SEED_COURSE, TESTING_COURSE, ALL_MATCHED_COURSE } = await import('../course/seed');
    expect(unmatchedQuestions(SEED_COURSE.questions, SEED_COURSE.sheet.interpretation).map((q) => q.position)).toEqual([1, 2, 3, 4]);
    expect(unmatchedQuestions(TESTING_COURSE.questions, TESTING_COURSE.sheet.interpretation).map((q) => q.position)).toEqual([1, 2, 3, 4]);
    expect(unmatchedQuestions(ALL_MATCHED_COURSE.questions, ALL_MATCHED_COURSE.sheet.interpretation)).toEqual([]);
  });
});
