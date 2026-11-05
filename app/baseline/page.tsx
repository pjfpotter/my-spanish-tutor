import { redirect } from 'next/navigation';
import { getDb } from '../../lib/db';
import { loadBaseline } from '../../lib/diagnostics/baseline';
import { loadQuestions } from '../../lib/progress/progress';
import { currentProfile } from '../../lib/server/session';
import { Baseline } from './Baseline';

export const dynamic = 'force-dynamic';

export default async function BaselinePage() {
  const profile = await currentProfile();
  if (!profile) redirect('/welcome');
  const db = await getDb();
  const questions = await loadQuestions(db, profile.courseId);
  const done = await loadBaseline(db, profile.id);
  return <Baseline questions={questions.map(({ id, position, spanish, english }) => ({ id, position, spanish, english }))} done={done} />;
}
