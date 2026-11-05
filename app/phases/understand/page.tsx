import { redirect } from 'next/navigation';
import { getDb } from '../../../lib/db';
import { latestMood } from '../../../lib/diagnostics/mood';
import { planUnderstand, prioritise } from '../../../lib/diagnostics/plan';
import { DEFAULT_MASTERY, isMastered, needsLaterSession, NO_MASTERY, quickWinId } from '../../../lib/mastery/mastery';
import { loadMastery, loadQuestions } from '../../../lib/progress/progress';
import { currentProfile } from '../../../lib/server/session';
import { Understand } from './Understand';

export const dynamic = 'force-dynamic';

export default async function UnderstandPage({ searchParams }: { searchParams: Promise<{ quick?: string }> }) {
  const { quick } = await searchParams;
  const profile = await currentProfile();
  if (!profile) redirect('/welcome');
  const db = await getDb();
  const questions = await loadQuestions(db, profile.courseId);
  const mastery = await loadMastery(db, profile.id, 'understand');
  const initial = questions.map((q) => {
    const m = mastery.get(q.id) ?? NO_MASTERY;
    return { ...q, mastered: isMastered(m, DEFAULT_MASTERY), laterSession: needsLaterSession(m, DEFAULT_MASTERY), successes: m.qualifyingSuccesses };
  });
  // ?quick=1 is the easy quick win offered after "Spanish is not my favourite": one question, then done.
  const quickId = quick === '1' ? quickWinId(initial) : null;
  // Diagnostics drive practice: items with a live cause tag come first and start with adjusted support.
  const plan = await planUnderstand(db, profile.id, initial.map((q) => q.id), await latestMood(db, profile.id));
  const ordered = prioritise(initial, (q) => plan.get(q.id)?.needsFocus ?? false);
  return <Understand questions={ordered} quickId={quickId} plans={Object.fromEntries(plan)} />;
}
