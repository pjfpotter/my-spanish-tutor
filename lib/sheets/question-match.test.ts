import { describe, expect, it } from 'vitest';
import { FREE_TIME } from './samples/free-time';
import { matchSheetQuestion, resolveBuilderQuestion, unmatchedQuestions } from './question-match';

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
    const { withoutBuilder } = await import('../course/assignments');
    expect(withoutBuilder(SEED_COURSE).map((q) => q.position)).toEqual([1, 2, 3, 4]);
    expect(withoutBuilder(TESTING_COURSE).map((q) => q.position)).toEqual([1, 2, 3, 4]);
    expect(withoutBuilder(ALL_MATCHED_COURSE)).toEqual([]);
  });
});

describe('resolveBuilderQuestion', () => {
  const two = { questions: [{ es: '¿Qué haces ahora?', en: '' }, { es: '¿Qué hiciste ayer?', en: '' }] };
  const one = { questions: [{ es: '¿Qué haces ahora?', en: '' }] };
  const none = { questions: [] };
  it('uses an explicit link first, even when the text matches another', () => expect(resolveBuilderQuestion(two, { spanish: '¿Qué haces ahora?', builderQuestion: 1 })).toEqual({ ok: true, index: 1 }));
  it('refuses an explicit link that does not exist', () => {
    const r = resolveBuilderQuestion(two, { spanish: 'x', builderQuestion: 2 });
    expect(r.ok).toBe(false);
    expect(!r.ok && r.error).toMatch(/does not exist/);
  });
  it('links by text when there is no explicit link', () => expect(resolveBuilderQuestion(two, { spanish: 'que hiciste AYER' })).toEqual({ ok: true, index: 1 }));
  it('uses the whole builder when it has one question or none and nothing matches', () => {
    expect(resolveBuilderQuestion(one, { spanish: 'otra cosa' })).toEqual({ ok: true, index: null });
    expect(resolveBuilderQuestion(none, { spanish: 'otra cosa' })).toEqual({ ok: true, index: null });
  });
  it('stops and lists the builder questions when there are several and nothing matches', () => {
    const r = resolveBuilderQuestion(two, { spanish: '¿Qué haces los fines de semana?' });
    expect(r.ok).toBe(false);
    expect(!r.ok && r.error).toMatch(/0: ¿Qué haces ahora\?.*1: ¿Qué hiciste ayer\?/);
  });
});
