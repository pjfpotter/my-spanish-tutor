import { redirect } from 'next/navigation';
import { getDb } from '../../../lib/db';
import { loadSavedAnswers, loadWritingCourse } from '../../../lib/progress/writing-store';
import { currentProfile } from '../../../lib/server/session';
import { SheetWrite } from './SheetWrite';

export const dynamic = 'force-dynamic';

export default async function WritePage({ searchParams }: { searchParams: Promise<{ question?: string }> }) {
  const profile = await currentProfile();
  if (!profile) redirect('/welcome');
  const db = await getDb();
  const [course, saved] = await Promise.all([loadWritingCourse(db, profile.courseId), loadSavedAnswers(db, profile.id)]);
  // Every course has a teacher's sentence builder; there is no other way to write.
  if (!course.sheet) throw new Error('This course has no sentence builder sheet.');
  // The memorise phase links to one question to rebuild it with fewer parts.
  const wanted = Number((await searchParams).question);
  const focus = Math.max(0, course.questions.findIndex((q) => q.position === wanted));
  return <SheetWrite course={course} saved={saved} focus={focus} />;
}
