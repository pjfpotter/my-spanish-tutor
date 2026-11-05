import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { loadCostReport } from '../../../lib/cost/report';
import { getDb } from '../../../lib/db';
import { findCourseByOwnerToken, loadOverview } from '../../../lib/overview/overview';
import { sampleCost, sampleOverview } from '../../../lib/overview/sample';
import '../../components/screens.css';
import { OverviewView } from './OverviewView';

export const dynamic = 'force-dynamic';
// The owner link is the only key, so keep it out of search results and out of referrer headers.
export const metadata: Metadata = { title: 'Class overview', robots: { index: false, follow: false }, referrer: 'no-referrer' };

/**
 * The read-only teacher overview, opened only with the unguessable owner token. The student class code opens nothing.
 * Never linked from the student app. `?demo=1` shows made-up sample data in place of real students.
 */
export default async function Overview({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ demo?: string }> }) {
  const [{ token }, { demo }] = await Promise.all([params, searchParams]);
  const db = await getDb();
  const course = await findCourseByOwnerToken(db, token);
  if (!course) notFound();
  if (demo === '1') return <OverviewView data={sampleOverview()} cost={sampleCost()} sample />;
  return <OverviewView data={await loadOverview(db, course.id)} cost={await loadCostReport(db, course.id)} sample={false} />;
}
