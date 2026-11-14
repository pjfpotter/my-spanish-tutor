import { describe, expect, it } from 'vitest';
import { isPhaseId, NO_PROGRESS, phaseStates, PHASES } from './gate';

const status = (p: Parameters<typeof phaseStates>[0]) =>
  Object.fromEntries(PHASES.map((id) => [id, phaseStates(p)[id].status]));

describe('phase gate', () => {
  it('lists Understand before Write, then Memorise, then Automate', () => {
    expect([...PHASES]).toEqual(['understand', 'write', 'memorise', 'automate']);
  });

  it('opens Understand and Write on a fresh profile, without changing the unlock rules', () => {
    const s = phaseStates(NO_PROGRESS);
    expect(s.understand).toEqual({ status: 'open', done: false });
    expect(s.write).toEqual({ status: 'open', done: false });
    expect(s.memorise.status).toBe('locked');
    expect(s.automate.status).toBe('locked');
  });

  it('starts with writing and understanding open, memorising and automating locked', () => {
    expect(status(NO_PROGRESS)).toEqual({ write: 'open', understand: 'open', memorise: 'locked', automate: 'locked' });
  });

  it('keeps memorising locked until an answer is confirmed AND all questions are mastered', () => {
    expect(status({ answersConfirmed: 5, questionsMastered: 4, answersMemorised: 0 }).memorise).toBe('locked');
    expect(status({ answersConfirmed: 0, questionsMastered: 5, answersMemorised: 0 }).memorise).toBe('locked');
    expect(status({ answersConfirmed: 5, questionsMastered: 5, answersMemorised: 0 }).memorise).toBe('open');
  });

  it('opens memorising with a single confirmed answer, while the others are still being written', () => {
    const s = phaseStates({ answersConfirmed: 1, questionsMastered: 5, answersMemorised: 0 });
    expect(s.memorise).toEqual({ status: 'open', done: false });
    expect(s.write.done).toBe(false);
  });

  it('says what is missing, in plain words', () => {
    const none = phaseStates(NO_PROGRESS).memorise;
    expect(none).toMatchObject({ status: 'locked', reason: 'First confirm an answer and master all five questions by ear.' });
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

describe('automate phase completion', () => {
  const memorised = { answersConfirmed: 5, questionsMastered: 5, answersMemorised: 5 };
  it('is open but not done until the student is test-ready, then done', () => {
    expect(phaseStates(memorised).automate).toEqual({ status: 'open', done: false });
    expect(phaseStates({ ...memorised, testReady: true }).automate).toEqual({ status: 'open', done: true });
  });
  it('stays locked until all five answers are memorised, even if marked test-ready', () => {
    expect(phaseStates({ ...memorised, answersMemorised: 4, testReady: true }).automate.status).toBe('locked');
  });
});

describe('phase gate in a testing course (course-unlock-testing)', () => {
  const open = (p: Parameters<typeof phaseStates>[0]) => Object.fromEntries(PHASES.map((id) => [id, phaseStates(p, { unlockAll: true })[id].status]));

  it('opens all four phases for a student with no progress', () => {
    expect(open(NO_PROGRESS)).toEqual({ write: 'open', understand: 'open', memorise: 'open', automate: 'open' });
  });

  it('does not tick a phase that has not been earned', () => {
    const s = phaseStates(NO_PROGRESS, { unlockAll: true });
    expect(PHASES.map((id) => s[id])).toEqual(PHASES.map(() => ({ status: 'open', done: false })));
  });

  it('still ticks phases from real progress', () => {
    const s = phaseStates({ answersConfirmed: 5, questionsMastered: 5, answersMemorised: 5, testReady: true }, { unlockAll: true });
    expect(PHASES.map((id) => s[id].done)).toEqual([true, true, true, true]);
  });

  it('changes nothing when the flag is absent or false', () => {
    const p = { answersConfirmed: 2, questionsMastered: 1, answersMemorised: 0 };
    expect(phaseStates(p, {})).toEqual(phaseStates(p));
    expect(phaseStates(p, { unlockAll: false })).toEqual(phaseStates(p));
    expect(phaseStates(p).memorise.status).toBe('locked');
  });
});
