import { redirect } from 'next/navigation';
import { getDb } from '../../../lib/db';
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
  return <Memorise items={await loadMemoriseItems(db, profile.id, profile.courseId)} />;
}
