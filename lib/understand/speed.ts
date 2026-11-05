import { SPEEDS, type SpeedName } from '../audio/speeds';

export const SPEED_ORDER: SpeedName[] = ['slow', 'normal', 'fast'];

export interface LastPresentation {
  speed: SpeedName;
  outcome: 'correct' | 'wrong' | 'assisted';
}

/**
 * Which speed to play a question at next (question-comprehension: Varied speeds). A student who got
 * it right at a speed moves up one step; a miss or an assisted attempt moves down one step, so it
 * gets easier when they struggle and harder when they do not. A question that is mastered or has
 * never been seen starts where `startAt` says (slow for a first look, slower again after "too fast").
 * Version one has one voice, so speed is the only thing that varies.
 */
export function nextSpeed(last: LastPresentation | null, startAt: SpeedName = 'slow'): SpeedName {
  if (!last) return startAt;
  const i = SPEED_ORDER.indexOf(last.speed);
  if (last.outcome === 'correct') return SPEED_ORDER[Math.min(SPEED_ORDER.length - 1, i + 1)];
  return SPEED_ORDER[Math.max(0, i - 1)];
}

export const speedValue = (name: SpeedName) => SPEEDS[name];

export interface Option {
  id: string;
  /** English meaning shown as a choice. */
  text: string;
}

/**
 * The choices for "what did you hear?": the right meaning and two wrong ones from the other
 * questions, in random order. English only, because the question is heard in Spanish and the
 * student picks its meaning.
 */
export function buildOptions(
  questions: { id: string; english: string }[],
  correctId: string,
  random: () => number = Math.random,
  wrongCount = 2,
): Option[] {
  const correct = questions.find((q) => q.id === correctId);
  if (!correct) throw new Error('unknown question');
  const others = questions.filter((q) => q.id !== correctId && q.english !== correct.english);
  const shuffled = [...others].sort(() => random() - 0.5).slice(0, wrongCount);
  const options = [correct, ...shuffled].map((q) => ({ id: q.id, text: q.english }));
  return options.sort(() => random() - 0.5);
}
