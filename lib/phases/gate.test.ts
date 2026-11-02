import { describe, expect, it } from 'vitest';
import { isPhaseId, NO_PROGRESS, phaseStates, PHASES } from './gate';

const status = (p: Parameters<typeof phaseStates>[0]) =>
  Object.fromEntries(PHASES.map((id) => [id, phaseStates(p)[id].status]));

describe('phase gate', () => {
  it('starts with writing and understanding open, memorising and automating locked', () => {
    expect(status(NO_PROGRESS)).toEqual({ write: 'open', understand: 'open', memorise: 'locked', automate: 'locked' });
  });

  it('keeps memorising locked until BOTH all answers are confirmed and all questions mastered', () => {
    expect(status({ answersConfirmed: 5, questionsMastered: 4, answersMemorised: 0 }).memorise).toBe('locked');
    expect(status({ answersConfirmed: 4, questionsMastered: 5, answersMemorised: 0 }).memorise).toBe('locked');
    expect(status({ answersConfirmed: 5, questionsMastered: 5, answersMemorised: 0 }).memorise).toBe('open');
  });

  it('says what is missing, in plain words', () => {
    const none = phaseStates(NO_PROGRESS).memorise;
    expect(none).toMatchObject({ status: 'locked', reason: 'First confirm all five answers and master all five questions by ear.' });
    const oneLeft = phaseStates({ answersConfirmed: 5, questionsMastered: 3, answersMemorised: 0 }).memorise;
    expect(oneLeft).toMatchObject({ reason: 'First master all five questions by ear.' });
  });

  it('opens automating only once all five answers are memorised', () => {
    expect(status({ answersConfirmed: 5, questionsMastered: 5, answersMemorised: 4 }).automate).toBe('locked');
    expect(status({ answersConfirmed: 5, questionsMastered: 5, answersMemorised: 5 }).automate).toBe('open');
    expect(phaseStates({ answersConfirmed: 5, questionsMastered: 5, answersMemorised: 4 }).automate).toMatchObject({
      reason: 'First memorise all five answers.',
    });
  });

  it('marks a phase done when its five are complete, without locking it', () => {
    const s = phaseStates({ answersConfirmed: 5, questionsMastered: 5, answersMemorised: 5 });
    expect(s.write).toEqual({ status: 'open', done: true });
    expect(s.memorise).toEqual({ status: 'open', done: true });
  });

  it('recognises phase ids', () => {
    expect(isPhaseId('memorise')).toBe(true);
    expect(isPhaseId('cheat')).toBe(false);
  });
});
