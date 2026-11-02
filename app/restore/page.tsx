import { Win } from '../components/Win';
import '../components/screens.css';
import { RestoreForm } from './RestoreForm';

export default function Restore() {
  return (
    <main className="screen">
      <h1>Recuperar</h1>
      <Win title="recuperar.exe" label="Get your progress back">
        <RestoreForm />
      </Win>
    </main>
  );
}
