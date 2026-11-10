import type { Db } from '../db/types';
import { courseUnlockAll } from '../course/unlock';
import type { Calibration, ModelAnswer } from '../course/schema';
import { simplestModelAnswer } from '../coach/model-answers';

/**
 * The text a student practises for one question: their own confirmed answer, or, only in a testing course
 * (course-unlock-testing), the course's Rock solid model answer when they have not confirmed one. Null when
 * there is nothing to practise. The model answer is read, never stored as the student's answer.
 */
export async function practiceAnswerText(db: Db, profileId: string, courseId: string, questionId: string): Promise<string | null> {
  const own = await db.query<{ text: string }>(
    'select text from answers where profile_id = $1 and question_id = $2 and confirmed_at is not null',
    [profileId, questionId],
  );
  if (own.rows[0]) return own.rows[0].text;
  if (!(await courseUnlockAll(db, courseId))) return null;
  const q = await db.query<{ position: number; model_answers: ModelAnswer[]; calibration: Calibration }>(
    'select q.position, c.model_answers, c.calibration from questions q join courses c on c.id = q.course_id where q.id = $1 and q.course_id = $2',
    [questionId, courseId],
  );
  const row = q.rows[0];
  return row ? (simplestModelAnswer(row.model_answers, row.position, row.calibration)?.text ?? null) : null;
}
