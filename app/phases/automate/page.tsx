import { redirect } from 'next/navigation';
import { DreamcoreGame } from '../../components/dreamcore/DreamcoreGame';
import { loadAutomateState } from '../../../lib/automate/store';
import { courseUnlockAll } from '../../../lib/course/unlock';
import { getDb } from '../../../lib/db';
import { loadLadder } from '../../../lib/memorise/ladder-store';
import { loadCourseChunks } from '../../../lib/memorise/store';
import { phaseStates } from '../../../lib/phases/gate';
import { loadProgress } from '../../../lib/progress/progress';
import { currentProfile } from '../../../lib/server/session';
import { NothingToPractise } from '../../components/NothingToPractise';

export const dynamic = 'force-dynamic';

/**
 * The fourth step is El Pasillo, a corridor game on the student's own answers. The step keeps its old name in the
 * code (`automate`) so the gate, readiness and the teacher overview are unchanged: each cleared top-rung door is
 * stored as a timed attempt through `/api/respond`.
 */
export default async function AutomatePage() {
  const profile = await currentProfile();
  if (!profile) redirect('/welcome');
  const db = await getDb();
  // The gate: typing the address of a locked phase sends the student back to the desktop.
  const unlockAll = await courseUnlockAll(db, profile.courseId);
  if (phaseStates(await loadProgress(db, profile.id), { unlockAll }).automate.status === 'locked') redirect('/');
  const start = await loadLadder(db, profile.id, profile.courseId, await loadCourseChunks(db, profile.courseId));
  if (!start.answers.length) return <NothingToPractise heading="El Pasillo" windowTitle="El Pasillo" />;
  const ids = start.answers.flatMap((a) => (a.id ? [a.id] : []));
  const state = await loadAutomateState(db, profile.id, ids);
  const unmet = ids.filter((id) => (state.sessionsMet[id] ?? 0) < 1);
  return <DreamcoreGame answers={start.answers} source="course" record unmet={unmet} />;
}
