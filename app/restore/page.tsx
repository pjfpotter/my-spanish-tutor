import { Win } from '../components/Win';
import '../components/screens.css';
import { RestoreForm } from './RestoreForm';

export default function Restore() {
  return (
    <main className="screen">
      <h1>Get your progress back</h1>
      <Win title="Get your progress back">
        <RestoreForm />
      </Win>
    </main>
  );
}
