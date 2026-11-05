import Link from 'next/link';
import { currentProfile } from '../../lib/server/session';
import { PrivacyNotice } from '../components/PrivacyNotice';
import { Win } from '../components/Win';
import '../components/screens.css';
import { DeleteEverything } from './DeleteEverything';

export const dynamic = 'force-dynamic'; // the delete section depends on who is signed in

export default async function Privacy() {
  const signedIn = !!(await currentProfile());
  return (
    <main className="screen">
      <h1>Privacidad</h1>
      <Win title="privacidad.exe" label="Privacy notice">
        <PrivacyNotice />
        <p className="muted">
          Teachers and parents: the <Link href="/privacy/dpia" data-testid="dpia-link">data protection impact assessment</Link> has the detail.
        </p>
      </Win>
      {signedIn && (
        <Win title="borrar.exe" label="Delete everything">
          <DeleteEverything />
        </Win>
      )}
      <p><Link href="/">Back to the desktop</Link></p>
    </main>
  );
}
