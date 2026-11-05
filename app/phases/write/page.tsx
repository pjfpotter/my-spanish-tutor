import { redirect } from 'next/navigation';
import { getDb } from '../../../lib/db';
import { loadSavedAnswers, loadWritingCourse } from '../../../lib/progress/writing-store';
import { currentProfile } from '../../../lib/server/session';
import { Write } from './Write';

export const dynamic = 'force-dynamic';

export default async function WritePage() {
  const profile = await currentProfile();
  if (!profile) redirect('/welcome');
  const db = await getDb();
  const [course, saved] = await Promise.all([loadWritingCourse(db, profile.courseId), loadSavedAnswers(db, profile.id)]);
  return <Write course={course} saved={saved} />;
}
