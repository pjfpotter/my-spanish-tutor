import type { Metadata } from 'next';
import { DreamcoreGame } from '../../components/dreamcore/DreamcoreGame';
import { getDb } from '../../../lib/db';
import { loadLadder } from '../../../lib/memorise/ladder-store';
import { loadCourseChunks } from '../../../lib/memorise/store';
import { currentProfile } from '../../../lib/server/session';
import { LAB_ANSWERS } from '../memorise/content';

export const metadata: Metadata = { title: 'El Pasillo', robots: { index: false } };
export const dynamic = 'force-dynamic';

/**
 * The dreamcore corridor game, standalone. It uses the student's own confirmed answers when there is a profile and a
 * database, and the memorise lab's sample answers otherwise, so the page always works. Progress stays on the device.
 */
export default async function DreamcorePage() {
  try {
    const profile = await currentProfile();
    if (profile) {
      const db = await getDb();
      const start = await loadLadder(db, profile.id, profile.courseId, await loadCourseChunks(db, profile.courseId));
      if (start.answers.length) return <DreamcoreGame answers={start.answers} source="course" />;
    }
  } catch {
    // No profile or no database here: play with the samples.
  }
  return <DreamcoreGame answers={LAB_ANSWERS} source="sample" />;
}
