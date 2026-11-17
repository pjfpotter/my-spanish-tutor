import { resolveBuilderQuestion } from '../sheets/question-match.ts';
import type { Course } from './schema.ts';

/** What the seed reports for one question: its builder and which part of it the question uses. */
export interface Assignment {
  position: number;
  spanish: string;
  /** The name of the sentence builder it is written on, or null when it has none yet. */
  builder: string | null;
  /** `question N: text` of the builder, `the whole builder`, or an empty string when there is no builder. */
  part: string;
}

/** Each question's builder and the part of it that applies (course-builder-per-question, design D3). Assumes the course is valid. */
export function assignments(course: Pick<Course, 'questions' | 'builders'>): Assignment[] {
  return course.questions.map((q) => {
    const b = q.builder === undefined ? undefined : course.builders.find((x) => x.key === q.builder);
    if (!b) return { position: q.position, spanish: q.spanish, builder: null, part: '' };
    const link = resolveBuilderQuestion(b.interpretation, q);
    const part = link.ok && link.index !== null ? `question ${link.index}: ${b.interpretation.questions[link.index].es}` : 'the whole builder';
    return { position: q.position, spanish: q.spanish, builder: b.name, part };
  });
}

/** The questions with no sentence builder yet, for the seed notice. */
export const withoutBuilder = (course: Pick<Course, 'questions' | 'builders'>) => assignments(course).filter((a) => a.builder === null);
