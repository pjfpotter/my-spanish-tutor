import { QUESTION_COUNT, type PhaseId, type PhaseState, type Progress } from '../phases/gate';

/** The one thing the "What's next?" window suggests. `review` is a little light practice once everything is done. */
export interface NextStep {
  step: PhaseId | 'review';
  /** One or two plain sentences, in English, encouraging, naming one thing to do. */
  sentence: string;
  /** The button text. */
  label: string;
  href: string;
}

export interface NextStepInput {
  states: Record<PhaseId, PhaseState>;
  progress: Progress;
  /** The step the student worked on most recently (an attempt, a confirmed answer or a quick-check result), or null if they have done nothing at all. */
  last: PhaseId | null;
  /** Days to the test, negative once it has passed. */
  daysToTest?: number;
}

const TITLE: Record<PhaseId, string> = {
  understand: 'Understand the questions',
  write: 'Write your answers',
  memorise: 'Memorise your answers',
  automate: 'Answer fast',
};

/** What the student was doing, said so it follows "Last time you were". */
const LAST: Record<PhaseId, string> = {
  understand: 'working out what the questions mean',
  write: 'writing your answers',
  memorise: 'saying your answers from memory',
  automate: 'answering against the clock',
};

/** What to do now, said so it follows "Now let's do". */
const NOW: Record<PhaseId, string> = {
  understand: 'learn what the questions mean',
  write: 'write your answers',
  memorise: 'say your answers from memory',
  automate: 'answer fast',
};

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * Which step to do next, from the student's saved progress and what they did last. Fixed rules, in order, with no
 * model: first session, then Understand until every question is understood, then Write, then Memorise, then Automate,
 * then a light review. A step that is locked is never suggested. After the test date it is only ever a light review.
 */
export function nextStep(i: NextStepInput): NextStep {
  const total = i.progress.total ?? QUESTION_COUNT;
  const open = (p: PhaseId) => i.states[p].status === 'open';
  const go = (step: PhaseId, remaining: string | null): NextStep => {
    const text = remaining ? `${remaining} ` : '';
    let sentence: string;
    if (i.last === null) {
      sentence = "It's your first session, so we start by learning what the test questions mean.";
    } else if (i.last === step) {
      sentence = `Last time you were ${LAST[step]}. ${text}Let's keep going.`;
    } else {
      sentence = `Last time you were ${LAST[i.last]}. Now let's ${NOW[step]}.`;
    }
    if (i.daysToTest !== undefined && i.daysToTest >= 0 && i.daysToTest <= 2 && (step === 'write' || step === 'memorise')) {
      sentence += ' With so few days left, short answers are fine.';
    }
    return { step, sentence, label: TITLE[step], href: `/phases/${step}` };
  };
  const review: NextStep = {
    step: 'review',
    sentence: i.daysToTest !== undefined && i.daysToTest < 0 ? 'The test is done. A little light review keeps it fresh.' : 'You have done every step. A little light practice keeps it fresh.',
    label: 'Light review',
    href: '/phases/automate',
  };

  if (i.daysToTest !== undefined && i.daysToTest < 0) return review;
  if (i.last === null && open('understand')) return go('understand', null);
  if (i.progress.questionsMastered < total && open('understand')) return go('understand', `${plural(total - i.progress.questionsMastered, 'question is', 'questions are')} still to go.`);
  if (i.progress.answersConfirmed < total && open('write')) return go('write', `${plural(total - i.progress.answersConfirmed, 'answer', 'answers')} still to write.`);
  if (i.progress.answersMemorised < total && open('memorise')) return go('memorise', `${plural(total - i.progress.answersMemorised, 'answer', 'answers')} still to learn.`);
  if (!i.progress.testReady && open('automate')) return go('automate', null);
  return review;
}
