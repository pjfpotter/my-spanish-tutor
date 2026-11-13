import { redirect } from 'next/navigation';
import { courseUnlockAll } from '../../../lib/course/unlock';
import { getDb } from '../../../lib/db';
import { loadLadder } from '../../../lib/memorise/ladder-store';
import { loadCourseChunks } from '../../../lib/memorise/store';
import { phaseStates } from '../../../lib/phases/gate';
import { loadProgress } from '../../../lib/progress/progress';
import { currentProfile } from '../../../lib/server/session';
import { NothingToPractise } from '../../components/NothingToPractise';
import { MemorisePhase } from './MemorisePhase';

export const dynamic = 'force-dynamic';

export default async function MemorisePage() {
  const profile = await currentProfile();
  if (!profile) redirect('/welcome');
  const db = await getDb();
  // The gate: typing the address of a locked phase sends the student back to the desktop.
  const unlockAll = await courseUnlockAll(db, profile.courseId);
  if (phaseStates(await loadProgress(db, profile.id), { unlockAll }).memorise.status === 'locked') redirect('/');
  const start = await loadLadder(db, profile.id, profile.courseId, await loadCourseChunks(db, profile.courseId));
  if (!start.answers.length) return <NothingToPractise heading="Say it from memory" windowTitle="memorise.exe" />;
  return <MemorisePhase answers={start.answers} start={{ day: start.day, euros: start.euros, states: start.states, testDays: start.testDays }} />;
}
