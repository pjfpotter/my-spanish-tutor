import { redirect } from 'next/navigation';
import { getDb } from '../../../lib/db';
import { knownAtStart, loadBaseline } from '../../../lib/diagnostics/baseline';
import { planUnderstand, prioritise } from '../../../lib/diagnostics/plan';
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
  // Questions proved in the placement check are skipped in this stage only; they come back in later stages as normal.
  const proven = knownAtStart(await loadBaseline(db, profile.id));
  const initial = questions.map((q) => {
    const m = mastery.get(q.id) ?? NO_MASTERY;
    return { ...q, mastered: proven.has(q.id) || isMastered(m, DEFAULT_MASTERY), laterSession: needsLaterSession(m, DEFAULT_MASTERY), successes: m.qualifyingSuccesses };
  });
  // Diagnostics drive practice: items with a live cause tag come first and start with adjusted support.
  const plan = await planUnderstand(db, profile.id, initial.map((q) => q.id));
  const ordered = prioritise(initial, (q) => plan.get(q.id)?.needsFocus ?? false);
  return <Understand questions={ordered} plans={Object.fromEntries(plan)} />;
}
