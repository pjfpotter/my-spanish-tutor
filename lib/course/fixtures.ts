import type { Course } from './schema';
import { SEED_COURSE } from './seed';

/**
 * Task 23.2: a course with two sentence builders, four core questions and one extension question.
 * Core questions gate the path and make up readiness. The extension question is practised but never needed.
 */
export function twoBuilderCourse(): Course {
  const c = structuredClone(SEED_COURSE);
  const half = Math.ceil(c.chunks.length / 2);
  c.classCode = 'TWOB4';
  c.title = 'Two builders, four questions';
  c.chunks = c.chunks.map((ch, i) => ({ ...ch, builder: i < half ? 'Films and free time' : 'Clothes and plans' }));
  c.questions = c.questions.slice(0, 5).map((q, i) => ({ ...q, recycled: false, extension: i === 4 }));
  c.modelAnswers = c.modelAnswers.filter((a) => a.questionPosition <= 5);
  return c;
}

