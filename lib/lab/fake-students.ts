import { SEED_COURSE } from '../course/seed';
import type { Chunk } from '../course/schema';

/**
 * Pre-written fake students for the automate lab (automate-lab). Each has five answers taken from the seeded
 * model answers, at different lengths, so the chunk ladder has different depths. Nothing here is a real student:
 * no names, no data, and every id is prefixed so it can never match a real question id or a demo id.
 */
export type StudentKey = 'short' | 'mixed' | 'long';
export const STUDENT_KEYS: readonly StudentKey[] = ['short', 'mixed', 'long'];
export const LAB_ITEM_PREFIX = 'lab:';

export interface LabItem {
  id: string;
  position: number;
  question: string;
  english: string;
  answer: string;
}

export interface FakeStudent {
  key: StudentKey;
  label: string;
  blurb: string;
  items: LabItem[];
}

/** The model answers for one question, shortest first. */
function answersFor(position: number): string[] {
  return SEED_COURSE.modelAnswers
    .filter((a) => a.questionPosition === position)
    .map((a) => a.text)
    .sort((x, y) => x.length - y.length);
}

type Pick = (answers: string[], position: number) => string;
const PICKS: Record<StudentKey, { label: string; blurb: string; pick: Pick }> = {
  short: { label: 'Short answers', blurb: 'One short sentence each. Few chunks, so the ladder is shallow.', pick: (a) => a[0] },
  mixed: { label: 'A mix', blurb: 'Some short, some long, so the ladder depth changes from question to question.', pick: (a, p) => (p % 2 === 1 ? a[0] : a[a.length - 1]) },
  long: { label: 'Long answers', blurb: 'The longest answer for each question. Many chunks and a deep ladder.', pick: (a) => a[a.length - 1] },
};

export const FAKE_STUDENTS: Record<StudentKey, FakeStudent> = Object.fromEntries(
  STUDENT_KEYS.map((key) => {
    const { label, blurb, pick } = PICKS[key];
    const items = SEED_COURSE.questions.map((q) => ({
      id: `${LAB_ITEM_PREFIX}${key}:${q.position}`,
      position: q.position,
      question: q.spanish,
      english: q.english,
      answer: pick(answersFor(q.position), q.position),
    }));
    return [key, { key, label, blurb, items }];
  }),
) as Record<StudentKey, FakeStudent>;

/** The course's chunks, so a lab answer is split into the same pieces as a real one. */
export const LAB_CHUNKS: Chunk[] = SEED_COURSE.chunks;

export const isStudentKey = (v: unknown): v is StudentKey => typeof v === 'string' && (STUDENT_KEYS as readonly string[]).includes(v);
