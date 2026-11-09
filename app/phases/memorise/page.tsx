import { redirect } from 'next/navigation';
import { courseUnlockAll } from '../../../lib/course/unlock';
import { getDb } from '../../../lib/db';
import { focusedAnswerIds } from '../../../lib/diagnostics/recall-store';
import { loadMemoriseItems } from '../../../lib/memorise/store';
import { phaseStates } from '../../../lib/phases/gate';
import { loadProgress } from '../../../lib/progress/progress';
import { currentProfile } from '../../../lib/server/session';
import { NothingToPractise } from '../../components/NothingToPractise';
import { Memorise } from './Memorise';

export const dynamic = 'force-dynamic';

export default async function MemorisePage() {
  const profile = await currentProfile();
  if (!profile) redirect('/welcome');
  const db = await getDb();
  // The gate: typing the address of a locked phase sends the student back to the desktop.
  const unlockAll = await courseUnlockAll(db, profile.courseId);
  if (phaseStates(await loadProgress(db, profile.id), { unlockAll }).memorise.status === 'locked') redirect('/');
  const items = await loadMemoriseItems(db, profile.id, profile.courseId);
  if (!items.length) return <NothingToPractise heading="Say it from memory" windowTitle="memorise.exe" />;
  // Answers with a hotspot chunk or a live recall tag are practised first.
  return <Memorise items={items} focusIds={await focusedAnswerIds(db, profile.id, profile.courseId, items)} />;
}
