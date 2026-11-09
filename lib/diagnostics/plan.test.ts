import { describe, expect, it } from 'vitest';
import { activeTags, prioritise, supportFor, type PastAttempt } from './plan';

const a = (outcome: PastAttempt['outcome'], speed: number, causeTags: PastAttempt['causeTags'] = [], assisted = false): PastAttempt => ({ outcome, speed, assisted, causeTags });
const none = { history: [], knownAtStart: false } as const;

describe('activeTags', () => {
  it('uses the tags on the latest failed attempt', () => {
    expect(activeTags([a('wrong', 1, ['too_fast'])])).toEqual(['too_fast']);
  });
  it('clears once the student gets it right afterwards', () => {
    expect(activeTags([a('wrong', 1, ['too_fast']), a('correct', 0.7)])).toEqual([]);
  });
  it('an assisted success does not clear it', () => {
    expect(activeTags([a('wrong', 1, ['too_fast']), a('assisted', 0.7, [], true)])).toEqual(['too_fast']);
  });
});

describe('supportFor (10.5)', () => {
  it('starts a new question slowly, or at normal if it was understood cold', () => {
    expect(supportFor(none).startSpeed).toBe('slow');
    expect(supportFor({ ...none, knownAtStart: true }).startSpeed).toBe('normal');
  });

  it('too-fast case starts slower than the same history without the tag', () => {
    const without = supportFor({ ...none, history: [a('correct', 1)] }); // a success at normal goes up to fast
    const withTag = supportFor({ ...none, history: [a('wrong', 1, ['too_fast'])] });
    expect(without.startSpeed).toBe('fast');
    expect(withTag.startSpeed).toBe('slow');
    // The same last attempt, with and without the tag: the tag takes it a step lower.
    expect(supportFor({ ...none, history: [a('correct', 1, ['too_fast'])] }).startSpeed).toBe('fast');
    expect(supportFor({ ...none, history: [a('wrong', 1.2, ['too_fast'])] }).startSpeed).toBe('slow');
    expect(supportFor({ ...none, history: [a('wrong', 1.2)] }).startSpeed).toBe('normal');
  });

  it('never starts a too-fast item above normal', () => {
    expect(supportFor({ ...none, history: [a('wrong', 1.2, ['too_fast'])] }).startSpeed).not.toBe('fast');
  });

  it('previews the key word when the word is not known or not linked to its sound', () => {
    expect(supportFor({ ...none, history: [a('wrong', 1, ['word_not_known'])] })).toMatchObject({ preview: true, startSpeed: 'slow', needsFocus: true });
    expect(supportFor({ ...none, history: [a('wrong', 1, ['sound_spelling_gap'])] }).preview).toBe(true);
    expect(supportFor({ ...none, history: [a('wrong', 1, ['thrown_by_context'])] }).preview).toBe(false);
  });
});

describe('prioritise', () => {
  it('puts items needing focus first and keeps the order otherwise', () => {
    expect(prioritise([1, 2, 3, 4, 5], (n) => n === 4 || n === 2)).toEqual([2, 4, 1, 3, 5]);
  });
});
