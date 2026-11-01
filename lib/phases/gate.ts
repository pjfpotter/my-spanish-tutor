/**
 * The gated learning path. The order never changes; the sandbox is around it, not in it.
 *
 *   write ──┐
 *           ├─> memorise ──> automate
 *   understand ─┘
 *
 * From the specs:
 * - Memorisation begins once all five answers are confirmed (answer-writing-coach), and a
 *   student does not advance from comprehension until all five questions are mastered
 *   (question-comprehension). So memorise needs both.
 * - response-automatisation states no unlock rule. Inferred: it follows memorisation.
 */
export const PHASES = ['write', 'understand', 'memorise', 'automate'] as const;
export type PhaseId = (typeof PHASES)[number];

export const QUESTION_COUNT = 5;

export interface Progress {
  /** Answers the student has confirmed, 0 to 5. */
  answersConfirmed: number;
  /** Questions mastered by ear (three correct across two sessions), 0 to 5. */
  questionsMastered: number;
  /** Answers memorised (threshold met across two sessions), 0 to 5. */
  answersMemorised: number;
}

export type PhaseState =
  | { status: 'open'; done: boolean }
  | { status: 'locked'; done: false; reason: string };

export const NO_PROGRESS: Progress = { answersConfirmed: 0, questionsMastered: 0, answersMemorised: 0 };

export function phaseStates(p: Progress): Record<PhaseId, PhaseState> {
  const wrote = p.answersConfirmed >= QUESTION_COUNT;
  const understood = p.questionsMastered >= QUESTION_COUNT;
  const memorised = p.answersMemorised >= QUESTION_COUNT;

  const memoriseMissing = [!wrote && 'confirm all five answers', !understood && 'master all five questions by ear'].filter(
    Boolean,
  ) as string[];

  return {
    write: { status: 'open', done: wrote },
    understand: { status: 'open', done: understood },
    memorise:
      memoriseMissing.length === 0
        ? { status: 'open', done: memorised }
        : { status: 'locked', done: false, reason: `First ${memoriseMissing.join(' and ')}.` },
    automate: memorised
      ? { status: 'open', done: false }
      : { status: 'locked', done: false, reason: 'First memorise all five answers.' },
  };
}

export const isPhaseId = (value: string): value is PhaseId => (PHASES as readonly string[]).includes(value);
