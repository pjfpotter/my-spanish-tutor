import { redirect } from 'next/navigation';
import { getDb } from '../../../lib/db';
import { loadSavedAnswers, loadWritingCourse } from '../../../lib/progress/writing-store';
import { currentProfile } from '../../../lib/server/session';
import { SheetWrite } from './SheetWrite';
import { Write } from './Write';

export const dynamic = 'force-dynamic';

export default async function WritePage() {
  const profile = await currentProfile();
  if (!profile) redirect('/welcome');
  const db = await getDb();
  const [course, saved] = await Promise.all([loadWritingCourse(db, profile.courseId), loadSavedAnswers(db, profile.id)]);
  // A course with a teacher's sentence builder writes on the sheet; any other course keeps the chunk-swap flow.
  return course.sheet ? <SheetWrite course={course} saved={saved} /> : <Write course={course} saved={saved} />;
}
