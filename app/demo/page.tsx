import Link from 'next/link';
import { STOPS } from '../../lib/demo/stops';
import { Win } from '../components/Win';
import '../components/screens.css';
import './demo.css';

/** The front door of demo mode: one tap in from the front page, no class code, nickname or recovery code. */
export default function DemoHub() {
  return (
    <main className="screen demo-hub" data-testid="demo-hub">
      <h1>Demo</h1>
      <Win title="demo.exe" label="Take the tour">
        <div className="stack">
          <p>Six one-minute stops on a sample course. Start at the top, or jump to any stop. Nothing you do here is saved, and nobody is signed up.</p>
          <ol className="demo-stops">
            {STOPS.map((s, i) => (
              <li key={s.id}>
                <Link href={s.path} data-testid={`demo-stop-${s.id}`}>
                  <strong>{i + 1}. {s.title}</strong>
                  <span>{s.blurb}</span>
                </Link>
              </li>
            ))}
          </ol>
          <p className="muted">Every spoken step has a Pretend button, so the tour works in a noisy room and with no microphone.</p>
          <Link className="btn btn-primary" href={STOPS[0].path} data-testid="demo-begin">Start the tour</Link>
        </div>
      </Win>
    </main>
  );
}
