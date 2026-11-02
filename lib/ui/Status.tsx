import type { ReactNode } from 'react';

export type StatusKind = 'done' | 'retry' | 'locked';

/**
 * Every state in the app is a distinct shape plus words, never a colour alone.
 * The label is required, so a state cannot be shown as a bare coloured dot.
 */
const SHAPES: Record<StatusKind, ReactNode> = {
  // tick in a circle
  done: (
    <>
      <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M4.5 8.5l2.5 2.5 4.5-5" fill="none" stroke="currentColor" strokeWidth="2" />
    </>
  ),
  // arrow looping back
  retry: (
    <>
      <path d="M13 8a5 5 0 1 1-1.8-3.8" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M13.5 2v4h-4" fill="none" stroke="currentColor" strokeWidth="2" />
    </>
  ),
  // padlock
  locked: (
    <>
      <rect x="3" y="7" width="10" height="7" fill="currentColor" />
      <path d="M5 7V5a3 3 0 0 1 6 0v2" fill="none" stroke="currentColor" strokeWidth="2" />
    </>
  ),
};

export function Status({ kind, label }: { kind: StatusKind; label: string }) {
  if (!label.trim()) throw new Error('A status needs a text label');
  return (
    <span className={`status status-${kind}`}>
      <svg viewBox="0 0 16 16" aria-hidden="true" data-shape={kind}>
        {SHAPES[kind]}
      </svg>
      <span>{label}</span>
    </span>
  );
}
