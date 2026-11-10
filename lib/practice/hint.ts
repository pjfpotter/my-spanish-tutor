/**
 * The hint delay (task 22.3). If the student has not started speaking within the delay (default 2.5 s),
 * the first words of the next chunk appear. A hint means the attempt was assisted; it is never an error.
 * The delay is measured from `now`, a clock passed in, so tests can use a fake one.
 */
export const DEFAULT_HINT_DELAY_MS = 2500;
export const HINT_WORDS = 2;

export interface HintTimer {
  /** Stop and forget the pending hint (the student started speaking, or the round ended). */
  cancel: () => void;
}

export interface Clock {
  setTimeout: (fn: () => void, ms: number) => unknown;
  clearTimeout: (id: unknown) => void;
}

const real: Clock = { setTimeout: (fn, ms) => setTimeout(fn, ms), clearTimeout: (id) => clearTimeout(id as ReturnType<typeof setTimeout>) };

/** Starts the delay. `onHint` runs once if the delay passes without a cancel. */
export function startHintTimer(onHint: () => void, delayMs: number = DEFAULT_HINT_DELAY_MS, clock: Clock = real): HintTimer {
  const id = clock.setTimeout(onHint, delayMs);
  return { cancel: () => clock.clearTimeout(id) };
}

/** The first words of the next chunk to say, as the hint text. */
export function hintText(chunks: readonly string[], saidChunks: number, words = HINT_WORDS): string | null {
  const next = chunks[saidChunks];
  return next ? next.split(/\s+/).slice(0, words).join(' ') : null;
}
