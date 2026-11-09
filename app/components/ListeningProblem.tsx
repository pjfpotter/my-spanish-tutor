'use client';

import type { CaptureState } from './useSpeechCapture';

/**
 * What the student sees when listening does not work (task 19.1). Plain English, always a way to try again,
 * and a way to carry on without speaking, so a broken microphone or recogniser never traps them.
 * Nothing here is scored or counted against the student.
 */
export function ListeningProblem({
  state,
  onRetry,
  onSkip,
}: {
  state: CaptureState;
  onRetry: () => void;
  /** Carries on to the next step without speaking. Left out where there is nothing to skip to. */
  onSkip?: () => void;
}) {
  if (state !== 'denied' && state !== 'unsupported' && state !== 'unavailable') return null;

  const text =
    state === 'denied'
      ? 'The microphone is blocked. Tele cannot hear you without it. Allow the microphone for this site in your browser, then try again.'
      : state === 'unsupported'
        ? 'This browser cannot use a microphone here. Try Chrome on a phone or a Chromebook, or a different device.'
        : 'Tele could not listen just now. That is not your fault and it does not count against you.';

  return (
    <div className="stack" data-testid={state} role="status">
      <p className="error">{text}</p>
      <div className="controls">
        {state !== 'unsupported' && (
          <button type="button" className="btn btn-primary" onClick={onRetry}>
            Try again
          </button>
        )}
        {onSkip && (
          <button type="button" className="btn" onClick={onSkip} data-testid="continue-without-speaking">
            Continue without speaking
          </button>
        )}
      </div>
    </div>
  );
}
