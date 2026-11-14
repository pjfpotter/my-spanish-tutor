import { QUESTION_COUNT, type PhaseId, type Progress } from '../phases/gate';

/** What the readiness measure is computed from (revision-planner: Readiness meter). */
export interface ReadinessInput extends Progress {
  /** Questions answered accurately and quickly in enough separate sessions, 0 to 5. */
  questionsAutomated: number;
}

export interface Readiness {
  /** 0 to 100: the mean of questions mastered, answers memorised and questions automatised. */
  percent: number;
  /** The phase that will raise it next. */
  next: PhaseId | null;
  /** One sentence naming that action, plain and encouraging. */
  nextAction: { es: string; en: string };
}

const totalOf = (i: Progress) => i.total ?? QUESTION_COUNT;

export function readinessPercent(i: ReadinessInput): number {
  const total = totalOf(i);
  const parts = [i.questionsMastered, i.answersMemorised, i.questionsAutomated].map((n) => Math.max(0, Math.min(total, n)));
  return Math.round((parts.reduce((a, b) => a + b, 0) / (3 * total)) * 100);
}

/**
 * The next action that moves the meter. Later phases come first because they are open only when
 * earlier ones are done; hearing the questions comes before writing because it raises the meter
 * straight away (writing raises it by unlocking memorisation).
 */
export function nextPhase(i: ReadinessInput): PhaseId | null {
  const total = totalOf(i);
  const wrote = i.answersConfirmed >= total;
  const understood = i.questionsMastered >= total;
  const memorised = i.answersMemorised >= total;
  if (wrote && understood && !memorised) return 'memorise';
  if (memorised && i.questionsAutomated < total) return 'automate';
  if (!understood) return 'understand';
  if (!wrote) return 'write';
  return null;
}

const ACTIONS: Record<PhaseId, { es: string; en: string }> = {
  understand: { es: 'Escucha las preguntas', en: 'Listen to the questions until you catch them all.' },
  write: { es: 'Escribe tus respuestas', en: 'Write and confirm your answers. That opens the next step.' },
  memorise: { es: 'Memoriza tus respuestas', en: 'Say your answers from memory.' },
  automate: { es: 'Responde sin pensar', en: 'Answer against the clock to make it automatic.' },
};

export function readiness(i: ReadinessInput): Readiness {
  const next = nextPhase(i);
  return {
    percent: readinessPercent(i),
    next,
    nextAction: next ? ACTIONS[next] : { es: 'Todo listo', en: 'You have done every step. A little light practice keeps it fresh.' },
  };
}
