import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { isPhaseId, phaseStates } from '../../../lib/phases/gate';
import { STUB_PROGRESS } from '../../../lib/home/stub';
import { Win } from '../../components/Win';

// Placeholder for each phase until its milestone lands. The important part is the gate:
// a locked phase cannot be opened by typing its address either.
export default async function PhasePage({ params }: { params: Promise<{ phase: string }> }) {
  const { phase } = await params;
  if (!isPhaseId(phase)) notFound();
  if (phaseStates(STUB_PROGRESS)[phase].status === 'locked') redirect('/');

  return (
    <main style={{ maxWidth: '36rem', margin: '0 auto', padding: '3.5rem 1rem' }}>
      <Win title={`${phase}.exe`}>
        <p>This step is built in a later milestone.</p>
        <Link href="/">Back to the desktop</Link>
      </Win>
    </main>
  );
}
