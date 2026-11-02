import { redirect } from 'next/navigation';
import { getDb } from '../../../lib/db';
import { DEFAULT_MASTERY, isMastered, needsLaterSession, NO_MASTERY } from '../../../lib/mastery/mastery';
import { loadMastery, loadQuestions } from '../../../lib/progress/progress';
import { currentProfile } from '../../../lib/server/session';
import { Understand } from './Understand';

export const dynamic = 'force-dynamic';

export default async function UnderstandPage() {
  const profile = await currentProfile();
  if (!profile) redirect('/welcome');
  const db = await getDb();
  const questions = await loadQuestions(db, profile.courseId);
  const mastery = await loadMastery(db, profile.id, 'understand');
  const initial = questions.map((q) => {
    const m = mastery.get(q.id) ?? NO_MASTERY;
    return { ...q, mastered: isMastered(m, DEFAULT_MASTERY), laterSession: needsLaterSession(m, DEFAULT_MASTERY), successes: m.qualifyingSuccesses };
  });
  return <Understand questions={initial} />;
}
