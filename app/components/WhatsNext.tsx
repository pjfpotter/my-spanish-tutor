import Link from 'next/link';
import type { NextStep } from '../../lib/planner/next-step';
import { WINDOW_TITLES } from '../../lib/ui/window-titles';
import { Win } from './Win';

/** One sentence and one button: the step to do now. The student can still open any open step from the steps window. */
export function WhatsNext({ next }: { next: NextStep }) {
  return (
    <Win title={WINDOW_TITLES.next} label={WINDOW_TITLES.next}>
      <div className="stack" data-testid="whats-next" data-step={next.step}>
        <p data-testid="whats-next-text">{next.sentence}</p>
        <Link className="btn btn-primary" href={next.href} data-testid="whats-next-go">{next.label}</Link>
      </div>
    </Win>
  );
}
