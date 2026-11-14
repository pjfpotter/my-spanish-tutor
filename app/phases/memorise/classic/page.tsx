import { redirect } from 'next/navigation';
import { courseUnlockAll } from '../../../../lib/course/unlock';
import { getDb } from '../../../../lib/db';
import { focusedAnswerIds, liveRecallCauses } from '../../../../lib/diagnostics/recall-store';
import { loadCourseChunks, loadMemoriseItems } from '../../../../lib/memorise/store';
import { phaseStates } from '../../../../lib/phases/gate';
import { loadProgress } from '../../../../lib/progress/progress';
import { currentProfile } from '../../../../lib/server/session';
import { NothingToPractise } from '../../../components/NothingToPractise';
import { Memorise } from '../Memorise';

export const dynamic = 'force-dynamic';

/**
 * The memorise screen as it was before the ladder (task 27.4): warm-up tasks, then saying the whole answer with the
 * script fading. Kept at this address, linked from nowhere, so its tests keep guarding it until the owner decides
 * whether to delete it. The memorise phase is `/phases/memorise`.
 */
export default async function ClassicMemorisePage() {
  const profile = await currentProfile();
  if (!profile) redirect('/welcome');
  const db = await getDb();
  // The gate: typing the address of a locked phase sends the student back to the desktop.
  const unlockAll = await courseUnlockAll(db, profile.courseId);
  if (phaseStates(await loadProgress(db, profile.id), { unlockAll }).memorise.status === 'locked') redirect('/');
  const items = await loadMemoriseItems(db, profile.id, profile.courseId);
  if (!items.length) return <NothingToPractise heading="Say it from memory" windowTitle="Say it from memory" />;
  // Answers with a hotspot chunk or a live recall tag are practised first.
  return <Memorise items={items} chunks={await loadCourseChunks(db, profile.courseId)} causes={await liveRecallCauses(db, profile.id, profile.courseId, items)} focusIds={await focusedAnswerIds(db, profile.id, profile.courseId, items)} />;
}
