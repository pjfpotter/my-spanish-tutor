import { redirect } from 'next/navigation';
import { simplerVersion, type Simplification } from '../../../lib/coach/simplify';
import { getDb } from '../../../lib/db';
import { loadMemoriseItems } from '../../../lib/memorise/store';
import { loadSavedAnswers, loadWritingCourse } from '../../../lib/progress/writing-store';
import { currentProfile } from '../../../lib/server/session';
import { Write } from './Write';

export const dynamic = 'force-dynamic';

export default async function WritePage({ searchParams }: { searchParams: Promise<{ question?: string }> }) {
  const profile = await currentProfile();
  if (!profile) redirect('/welcome');
  const db = await getDb();
  const [course, saved] = await Promise.all([loadWritingCourse(db, profile.courseId), loadSavedAnswers(db, profile.id)]);
  // An answer the student keeps failing to recall gets a simpler version to offer, never to force.
  const stalled = (await loadMemoriseItems(db, profile.id, profile.courseId)).filter((i) => i.stalled);
  const suggestions: Record<string, Simplification> = {};
  for (const item of stalled) {
    const own = saved.find((s) => s.questionId === item.id && s.confirmed);
    const s = own && simplerVersion(course, own.text);
    if (s) suggestions[item.id] = s;
  }
  const wanted = Number((await searchParams).question);
  const focus = Math.max(0, course.questions.findIndex((q) => q.position === wanted));
  return <Write course={course} saved={saved} suggestions={suggestions} focus={focus} />;
}
