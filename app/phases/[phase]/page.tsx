import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getDb } from '../../../lib/db';
import { isPhaseId, phaseStates } from '../../../lib/phases/gate';
import { loadProgress } from '../../../lib/progress/progress';
import { currentProfile } from '../../../lib/server/session';
import { Win } from '../../components/Win';

export const dynamic = 'force-dynamic';

// Placeholder for each phase until its milestone lands. The important part is the gate:
// a locked phase cannot be opened by typing its address either.
export default async function PhasePage({ params }: { params: Promise<{ phase: string }> }) {
  const { phase } = await params;
  if (!isPhaseId(phase)) notFound();
  const profile = await currentProfile();
  if (!profile) redirect('/welcome');
  const progress = await loadProgress(await getDb(), profile.id);
  if (phaseStates(progress)[phase].status === 'locked') redirect('/');

  return (
    <main style={{ maxWidth: '36rem', margin: '0 auto', padding: '3.5rem 1rem' }}>
      <Win title={`${phase}.exe`}>
        <p>This step is built in a later milestone.</p>
        <Link href="/">Back to the desktop</Link>
      </Win>
    </main>
  );
}
