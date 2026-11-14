import Link from 'next/link';
import { SectionNav } from '../../components/SectionNav';
import { Win } from '../../components/Win';
import '../../components/screens.css';

/**
 * The first thing a student sees in Understand. Two plain choices: prove what they already know with a short quick
 * check, or start learning. Neither is a mark, and the check is only for this step.
 */
export function QuickCheckOffer() {
  return (
    <main className="screen">
      <SectionNav />
      <h1>Understand the questions</h1>
      <Win title="Understand the questions" label="Understand the questions">
        <div className="stack" data-testid="quick-check-offer">
          <p>First, learn what the test questions mean.</p>
          <p>Already know some of them? Try the quick check. The ones you get right are skipped here. It is not a mark.</p>
          <div className="controls">
            <Link className="btn btn-primary" href="/phases/understand/check" data-testid="quick-check-start">Already know these? Try the quick check</Link>
            <Link className="btn" href="/phases/understand?start=1" data-testid="start-learning">Start learning</Link>
          </div>
        </div>
      </Win>
    </main>
  );
}
