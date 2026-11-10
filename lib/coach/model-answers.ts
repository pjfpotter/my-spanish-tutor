import type { Calibration, Chunk, ModelAnswer } from '../course/schema';
import { assessAnswer, matchChunks, tokens } from './rubric';

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

/**
 * The course's model answers for one question, simplest first: lowest value, then easiest to say, then
 * the order they were listed in. The first is where a student who wants the quickest route starts, and
 * the practice text used when a testing course has no written answer of its own.
 */
export function modelAnswersFor(
  answers: ModelAnswer[],
  questionPosition: number,
  ctx: { chunks: Chunk[]; cal: Calibration },
): ModelAnswer[] {
  return answers
    .filter((a) => a.questionPosition === questionPosition)
    .map((a, i) => ({ a, i, value: assessAnswer(ctx.cal, a.text).value, ease: easeScore(a.text, ctx.chunks, ctx.cal) }))
    .sort((x, y) => x.value - y.value || y.ease - x.ease || x.i - y.i)
    .map(({ a }) => a);
}

/** The simplest model answer for a question by value alone (no sentence builder needed), or null. */
export function simplestModelAnswer(answers: ModelAnswer[], questionPosition: number, cal: Calibration): ModelAnswer | null {
  const own = answers.filter((a) => a.questionPosition === questionPosition);
  return own.map((a, i) => ({ a, i, value: assessAnswer(cal, a.text).value })).sort((x, y) => x.value - y.value || x.i - y.i)[0]?.a ?? null;
}
