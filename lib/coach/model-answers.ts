import { LEVELS, type Calibration, type Chunk, type Level, type ModelAnswer } from '../course/schema';
import { matchChunks, tokens } from './rubric';

/**
 * How easy an answer is to say, 0 upward and higher is easier. Many students want the easiest route to
 * a pass, and that is a legitimate choice, so the first answer offered is the easiest one: more
 * cognates, more of the chunks that recur across topics, shorter words and fewer of them.
 */
export function easeScore(text: string, chunks: Chunk[], cal: Pick<Calibration, 'cognates'>): number {
  const words = tokens(text);
  if (!words.length) return 0;
  const cognates = new Set(cal.cognates.flatMap(tokens));
  const cognateShare = words.filter((w) => cognates.has(w)).length / words.length;
  const recycledWords = matchChunks(text, chunks.filter((c) => c.recycled)).reduce((n, m) => n + (m.to - m.from), 0);
  const avgLength = words.reduce((n, w) => n + w.length, 0) / words.length;
  return cognateShare * 2 + recycledWords / words.length - avgLength / 10 - words.length / 50;
}

/** The levels a question has a model answer for, lowest first. A missing level is marked for the teacher. */
export function levelsAvailable(answers: ModelAnswer[], questionPosition: number): Level[] {
  return LEVELS.filter((l) => answers.some((a) => a.questionPosition === questionPosition && a.level === l));
}

/**
 * The course's model answers for one question, nearest the student's target level first (ties go to the
 * lower level, so the easier answer is never hidden below a harder one). Pass `ease` to put the easiest
 * answer first within a level.
 */
export function modelAnswersFor(
  answers: ModelAnswer[],
  questionPosition: number,
  target: Level = 'rock_solid',
  ease?: { chunks: Chunk[]; cal: Pick<Calibration, 'cognates'> },
): ModelAnswer[] {
  const rank = (l: Level) => LEVELS.indexOf(l);
  const score = (a: ModelAnswer) => (ease ? easeScore(a.text, ease.chunks, ease.cal) : 0);
  return answers
    .filter((a) => a.questionPosition === questionPosition)
    .map((a, i) => ({ a, i, s: score(a) }))
    .sort(
      (x, y) =>
        Math.abs(rank(x.a.level) - rank(target)) - Math.abs(rank(y.a.level) - rank(target)) ||
        rank(x.a.level) - rank(y.a.level) ||
        y.s - x.s ||
        x.i - y.i,
    )
    .map(({ a }) => a);
}
