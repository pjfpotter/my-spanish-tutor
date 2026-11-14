import Link from 'next/link';
import { redirect } from 'next/navigation';
import { nicknameOptions } from '../../lib/profile/profile';
import { currentProfile } from '../../lib/server/session';
import { Win } from '../components/Win';
import '../components/screens.css';
import { WelcomeForm } from './WelcomeForm';

export const dynamic = 'force-dynamic'; // a new list of nicknames each visit

export default async function Welcome() {
  if (await currentProfile()) redirect('/');
  return (
    <main className="screen">
      <h1>Welcome</h1>
      <Win title="welcome.exe" label="Make your profile">
        <WelcomeForm nicknames={nicknameOptions(6)} />
      </Win>
      <p className="muted">Not in a class? <Link href="/demo" data-testid="demo-entry">Try the demo</Link>. It needs no sign-up and saves nothing.</p>
    </main>
  );
}
