import { LEVELS, type Level, type ModelAnswer } from '../course/schema';

/**
 * The course's ready-made answers for one question, with the ones nearest the student's target first
 * (task 7.5). A nervous student whose target is survival sees the survival answers first; ties go to
 * the lower rung, so the easier answer is never hidden below a harder one.
 */
export function modelAnswersFor(answers: ModelAnswer[], questionPosition: number, target: Level = 'survival'): ModelAnswer[] {
  const rank = (r: Level) => LEVELS.indexOf(r);
  return answers
    .filter((a) => a.questionPosition === questionPosition)
    .map((a, i) => ({ a, i }))
    .sort((x, y) => Math.abs(rank(x.a.rung) - rank(target)) - Math.abs(rank(y.a.rung) - rank(target)) || rank(x.a.rung) - rank(y.a.rung) || x.i - y.i)
    .map(({ a }) => a);
}
