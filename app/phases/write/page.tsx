import Link from 'next/link';
import { redirect } from 'next/navigation';
import { courseUnlockAll } from '../../../lib/course/unlock';
import { getDb } from '../../../lib/db';
import { loadSavedAnswers, loadWritingCourse } from '../../../lib/progress/writing-store';
import { currentProfile } from '../../../lib/server/session';
import { Win } from '../../components/Win';
import '../../components/screens.css';
import { SheetWrite } from './SheetWrite';

export const dynamic = 'force-dynamic';

export default async function WritePage({ searchParams }: { searchParams: Promise<{ question?: string }> }) {
  const profile = await currentProfile();
  if (!profile) redirect('/welcome');
  const db = await getDb();
  const [course, saved] = await Promise.all([loadWritingCourse(db, profile.courseId), loadSavedAnswers(db, profile.id)]);
  // Every course should have a teacher's sentence builder; there is no other way to write. A course without
  // one gets a plain message instead of a crash.
  if (!course.sheet) {
    return (
      <main className="screen">
        <h1>Write</h1>
        <Win title="Writing is not ready yet">
          <div className="stack" data-testid="no-sheet">
            <p>Your teacher has not added the sentence builder for this class yet. Check back soon.</p>
            <Link href="/">Back to the desktop</Link>
          </div>
        </Win>
      </main>
    );
  }
  // The memorise phase links to one question to rebuild it with fewer parts.
  const wanted = Number((await searchParams).question);
  const focus = Math.max(0, course.questions.findIndex((q) => q.position === wanted));
  const unlockAll = await courseUnlockAll(db, profile.courseId);
  return <SheetWrite course={course} saved={saved} focus={focus} unlockAll={unlockAll} />;
}
