import { redirect } from 'next/navigation';
import { getDb } from '../../../lib/db';
import { focusedAnswerIds } from '../../../lib/diagnostics/recall-store';
import { loadMemoriseItems } from '../../../lib/memorise/store';
import { phaseStates } from '../../../lib/phases/gate';
import { loadProgress } from '../../../lib/progress/progress';
import { currentProfile } from '../../../lib/server/session';
import { Memorise } from './Memorise';

export const dynamic = 'force-dynamic';

export default async function MemorisePage() {
  const profile = await currentProfile();
  if (!profile) redirect('/welcome');
  const db = await getDb();
  // The gate: typing the address of a locked phase sends the student back to the desktop.
  if (phaseStates(await loadProgress(db, profile.id)).memorise.status === 'locked') redirect('/');
  const items = await loadMemoriseItems(db, profile.id, profile.courseId);
  // Answers with a hotspot chunk or a live recall tag are practised first.
  return <Memorise items={items} focusIds={await focusedAnswerIds(db, profile.id, profile.courseId, items)} />;
}
