import Link from 'next/link';
import { STOPS } from '../../lib/demo/stops';
import { Win } from '../components/Win';
import '../components/screens.css';
import './demo.css';

/** The four steps a student takes, in plain words for a visitor who has never taught. Kept here so the tour and the README say the same. */
const STEPS = [
  { name: 'Understand', why: 'Hear each test question in Spanish with the words hidden, so the student learns what is being asked by ear, which is how the test works.' },
  { name: 'Write', why: 'Build a short answer from the sentence builder their teacher gave them, in words they can really say.' },
  { name: 'Memorise', why: 'Say the answer aloud, a bit at a time, while the help fades away until it comes from memory. This is the big step.' },
  { name: 'El Pasillo', why: 'A spooky corridor game that makes them say the answers fast and without notes, because the test gives no time to think.' },
];

/** The front door of the demo: what the test is, who it is for, the four steps, then one tap to start with your voice. */
export default function DemoHub() {
  return (
    <main className="screen demo-hub" data-testid="demo-hub">
      <h1>Demo</h1>
      <Win title="What this is">
        <div className="stack">
          <p><strong>The problem.</strong> In England, 12 and 13 year olds learning Spanish sit a short speaking test: five questions from their teacher, answered aloud. Most students dislike it and feel self-conscious saying Spanish out loud, so they avoid practising the one skill the test measures.</p>
          <p><strong>The app.</strong> A phone-first revision tool where a Spanish-only television called Tele asks the questions and the student answers by voice. It listens, shows each word lighting up as it is understood, and rewards effort. There are no lives, no ranking of students, and no student accounts or recordings.</p>
          <p><strong>The journey.</strong> Four steps, in order:</p>
          <ol className="demo-steps" data-testid="demo-steps">
            {STEPS.map((s) => <li key={s.name}><strong>{s.name}.</strong> {s.why}</li>)}
          </ol>
        </div>
      </Win>
      <Win title="Try it with your voice">
        <div className="stack">
          <p>Six short stops on a sample course. You will be asked to use your microphone: speak Spanish if you can, and the demo listens for real. Nothing is recorded or saved, and nobody is signed up.</p>
          <p className="muted">If your device has no microphone, each spoken stop says so and offers a clearly labelled example instead.</p>
          <Link className="btn btn-primary" href={STOPS[0].path} data-testid="demo-begin">Start with your voice</Link>
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
        </div>
      </Win>
    </main>
  );
}
