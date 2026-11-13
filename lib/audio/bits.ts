import type { Course } from '../course/schema.ts';
import { answerPieces } from '../practice/tasks.ts';
import type { ChunkLike } from './manifest.ts';

/**
 * Every bit Tele can say in the memorise ladder (task 27.4): the course's chunks, the pieces of its model answers that
 * match no chunk (plain bits such as "llevo"), and any extra sample bits, such as the memorise lab's. A student's own
 * answer is made of these, so the clips are built once for the course and never for one student.
 */
export function bitsFor(course: Pick<Course, 'chunks' | 'modelAnswers'>, extra: { t: string; en: string }[] = []): ChunkLike[] {
  const bits = new Map(course.chunks.map((c) => [c.spanish, c.english]));
  for (const m of course.modelAnswers) for (const p of answerPieces(m.text, course.chunks)) if (!bits.has(p.text)) bits.set(p.text, p.english);
  for (const e of extra) if (!bits.has(e.t)) bits.set(e.t, e.en);
  return [...bits].map(([spanish, english]) => ({ spanish, english }));
}
