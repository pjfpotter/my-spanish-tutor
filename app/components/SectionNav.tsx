import Link from 'next/link';

/**
 * The way out of any screen inside a section (student-flow-principles: Always a way out). Attempts are saved
 * as they are made, so leaving keeps the progress already earned and asks nothing. `onBack` is for screens
 * with a previous step to return to without losing the current answer.
 */
export function SectionNav({ onBack, backLabel = 'Back' }: { onBack?: () => void; backLabel?: string }) {
  return (
    <nav className="section-nav" aria-label="Leave this section">
      {onBack ? (
        <button type="button" className="btn" onClick={onBack} data-testid="section-back">
          {backLabel}
        </button>
      ) : (
        <span />
      )}
      <Link className="btn" href="/" data-testid="section-exit">
        Exit to desktop
      </Link>
    </nav>
  );
}
