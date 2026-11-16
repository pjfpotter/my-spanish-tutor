import { redirect } from 'next/navigation';
import { courseUnlockAll } from '../../../../lib/course/unlock';
import { getDb } from '../../../../lib/db';
import { loadAutomateState } from '../../../../lib/automate/store';
import { loadCourseChunks, loadMemoriseItems } from '../../../../lib/memorise/store';
import { phaseStates } from '../../../../lib/phases/gate';
import { loadProgress } from '../../../../lib/progress/progress';
import { currentProfile } from '../../../../lib/server/session';
import { NothingToPractise } from '../../../components/NothingToPractise';
import { Automate } from '../Automate';

import type { Metadata } from 'next';

export const metadata: Metadata = { robots: { index: false } };
export const dynamic = 'force-dynamic';

/** The old timed round, kept at an address nothing links to. The fourth step is El Pasillo (`../page.tsx`); this stays as a fallback and for its tests. */

export default async function AutomatePage() {
  const profile = await currentProfile();
  if (!profile) redirect('/welcome');
  const db = await getDb();
  // The gate: typing the address of a locked phase sends the student back to the desktop.
  const unlockAll = await courseUnlockAll(db, profile.courseId);
  if (phaseStates(await loadProgress(db, profile.id), { unlockAll }).automate.status === 'locked') redirect('/');
  const items = await loadMemoriseItems(db, profile.id, profile.courseId);
  if (!items.length) return <NothingToPractise heading="Answer fast" windowTitle="Answer fast" />;
  const state = await loadAutomateState(db, profile.id, items.map((i) => i.id));
  return <Automate items={items.map(({ id, position, question, english, answer }) => ({ id, position, question, english, answer }))} initial={state} chunks={await loadCourseChunks(db, profile.courseId)} unlockAll={unlockAll} />;
}
