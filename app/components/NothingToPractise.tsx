import Link from 'next/link';
import { Win } from './Win';
import './screens.css';

/**
 * Shown by the memorise and automate pages when there is no answer to practise yet. A gated course never gets
 * here (those phases stay locked until five answers exist), but a screen that reads "all done" at 0 of 0, or
 * crashes on an empty list, is wrong for any course, so it says what to do instead.
 */
export function NothingToPractise({ heading, windowTitle }: { heading: string; windowTitle: string }) {
  return (
    <main className="screen">
      <h1>{heading}</h1>
      <Win title={windowTitle} label="Nothing to practise yet">
        <div className="stack" data-testid="nothing-to-practise">
          <p>There is nothing to practise yet. Write and confirm your answers first.</p>
          <Link className="btn" href="/phases/write">Write your answers</Link>
          <Link href="/">Back to the desktop</Link>
        </div>
      </Win>
    </main>
  );
}
