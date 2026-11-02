import { redirect } from 'next/navigation';
import { INTEREST_TAGS, nicknameOptions } from '../../lib/profile/profile';
import { currentProfile } from '../../lib/server/session';
import { Win } from '../components/Win';
import '../components/screens.css';
import { WelcomeForm } from './WelcomeForm';

export const dynamic = 'force-dynamic'; // a new list of nicknames each visit

export default async function Welcome() {
  if (await currentProfile()) redirect('/');
  return (
    <main className="screen">
      <h1>Bienvenido</h1>
      <Win title="bienvenido.exe" label="Make your profile">
        <WelcomeForm nicknames={nicknameOptions(6)} interests={[...INTEREST_TAGS]} />
      </Win>
    </main>
  );
}
