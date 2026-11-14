import { redirect } from 'next/navigation';
import { getDb } from '../../../lib/db';
import { baselineDone, knownAtStart, loadBaseline } from '../../../lib/diagnostics/baseline';
import { planUnderstand, prioritise } from '../../../lib/diagnostics/plan';
import { DEFAULT_MASTERY, isMastered, NO_MASTERY } from '../../../lib/mastery/mastery';
import { loadMastery, loadQuestions } from '../../../lib/progress/progress';
import { currentProfile } from '../../../lib/server/session';
import { QuickCheckOffer } from './QuickCheckOffer';
import { Understand } from './Understand';

export const dynamic = 'force-dynamic';

export default async function UnderstandPage({ searchParams }: { searchParams: Promise<{ start?: string }> }) {
  const profile = await currentProfile();
  if (!profile) redirect('/welcome');
  const db = await getDb();
  const questions = await loadQuestions(db, profile.courseId);
  const mastery = await loadMastery(db, profile.id, 'understand');
  // Questions proved in the placement check are skipped in this stage only; they come back in later stages as normal.
  const baseline = await loadBaseline(db, profile.id);
  const proven = knownAtStart(baseline);
  const initial = questions.map((q) => {
    const m = mastery.get(q.id) ?? NO_MASTERY;
    return { ...q, mastered: proven.has(q.id) || isMastered(m, DEFAULT_MASTERY), successes: m.qualifyingSuccesses };
  });
  // The optional quick check (a test-out for this step only) is offered before anything has been learned or checked.
  const checkDone = baselineDone(baseline, questions.length);
  const untouched = baseline.length === 0 && initial.every((q) => !q.mastered && q.successes === 0);
  if (untouched && (await searchParams).start !== '1') return <QuickCheckOffer />;
  // Diagnostics drive practice: items with a live cause tag come first and start with adjusted support.
  const plan = await planUnderstand(db, profile.id, initial.map((q) => q.id));
  const ordered = prioritise(initial, (q) => plan.get(q.id)?.needsFocus ?? false);
  return <Understand questions={ordered} plans={Object.fromEntries(plan)} quickCheck={!checkDone} />;
}
