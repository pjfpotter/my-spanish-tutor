import Link from 'next/link';
import type { ReactNode } from 'react';
import './practice.css';

/**
 * The one-screen frame for every practice screen (task 20.1): a thin top band with the way out, a compact Tele
 * beside a short caption, a task card, and the feedback panel docked at the bottom. It fills the screen exactly
 * and never scrolls at 360 by 640. The Sound and Calm switches float at the top right of the band.
 */
export function PracticeShell({
  onBack, backLabel = 'Back', exitHref = '/', tele, caption, meta, children, footer,
}: {
  onBack?: () => void;
  /** Where Exit goes. The demo sends it back to the tour, not the desktop. */
  exitHref?: string;
  backLabel?: string;
  tele: ReactNode;
  caption: ReactNode;
  meta?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="practice" data-testid="practice-screen">
      <nav className="practice-top" aria-label="Leave this section">
        {onBack && (
          <button type="button" className="btn" onClick={onBack} data-testid="section-back">
            {backLabel}
          </button>
        )}
        <Link className="btn" href={exitHref} data-testid="section-exit">
          <span aria-hidden="true">Exit</span>
          <span className="sr-only">Exit to desktop</span>
        </Link>
      </nav>
      <div className="practice-head">
        <div className="tele-compact">{tele}</div>
        {caption}
      </div>
      {meta ? <p className="practice-meta">{meta}</p> : <span />}
      <div className="practice-body">{children}</div>
      {footer ?? <span className="fb-placeholder" />}
    </main>
  );
}
