import type { PhaseId } from '../phases/gate';

/**
 * What the first-impression screens say, in one place so the wording can be reviewed together (guidance-copy). Each
 * step says what it is, why it helps and the one next action. Plain short sentences: the student is 12 or 13 and the
 * tutor never speaks English, so this is the only place English explains what is going on.
 */
export interface StepCopy {
  /** What this step is, a few words. */
  what: string;
  /** Why it helps the speaking test. */
  why: string;
  /** The one thing to do when it opens. */
  next: string;
}

export const STEP_COPY: Record<PhaseId, StepCopy> = {
  understand: {
    what: 'Understand the questions',
    why: 'In the test the teacher asks out loud, so you need to know what each question means by ear.',
    next: 'Listen to a question, then pick what it means.',
  },
  write: {
    what: 'Write your answers',
    why: 'An answer you can really say is easier to learn than a fancy one.',
    next: 'Build one answer from your sentence builder.',
  },
  memorise: {
    what: 'Say your answers from memory',
    why: 'Saying it out loud, a bit at a time, is what moves it into your head.',
    next: 'Say the bit on the screen. Words light up as Tele hears them.',
  },
  automate: {
    what: 'The corridor: say it before it catches you',
    why: 'The test gives you no time to think, so this makes the answers come out fast.',
    next: 'Say what is on each door to open it. Keep talking.',
  },
};

export const WELCOME_COPY = {
  what: 'Revise for your Spanish speaking test by talking, not typing.',
  why: 'Tele, a Spanish-only television, asks the questions. You answer out loud, and nothing you say is recorded.',
  next: 'Pick a nickname below and enter your class code.',
} as const;

/** El Pasillo's title card says what, why and next in one place, then the three rules of the game. */
export const PASILLO_COPY = {
  what: 'The last step: answer from memory, fast.',
  why: STEP_COPY.automate.why,
  next: STEP_COPY.automate.next,
} as const;
