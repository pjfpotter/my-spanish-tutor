/**
 * Mistakes get a second chance (task 20.3). A missed item comes back a few places later in the same
 * session, labelled as a previous mistake, so the session can end on a success. Nothing is lost for a
 * miss: no hearts, no lives. A hard cap stops one stubborn item from looping forever.
 */
export interface QueueEntry {
  id: string;
  /** True when this entry is a return of an item the student missed earlier. */
  mistake: boolean;
}

export interface PracticeQueue {
  /** Upcoming entries, next first. */
  upcoming: QueueEntry[];
  /** How many times each id has been put back. */
  returns: Record<string, number>;
}

export interface RequeueConfig {
  /** How many items later a missed one returns. */
  gap: number;
  /** The most times one item can return in a session. */
  maxReturns: number;
}

export const DEFAULT_REQUEUE: RequeueConfig = { gap: 3, maxReturns: 2 };
export const MISTAKE_LABEL = 'Previous mistake';

export const newPracticeQueue = (ids: readonly string[]): PracticeQueue => ({
  upcoming: ids.map((id) => ({ id, mistake: false })),
  returns: {},
});

export const currentEntry = (q: PracticeQueue): QueueEntry | null => q.upcoming[0] ?? null;

/** Takes the current entry off the queue and, for a miss, puts the item back `gap` places on. */
export function answerCurrent(q: PracticeQueue, correct: boolean, cfg: RequeueConfig = DEFAULT_REQUEUE): PracticeQueue {
  const [done, ...rest] = q.upcoming;
  if (!done) return q;
  if (correct || (q.returns[done.id] ?? 0) >= cfg.maxReturns) return { upcoming: rest, returns: q.returns };
  const at = Math.min(cfg.gap, rest.length);
  return {
    upcoming: [...rest.slice(0, at), { id: done.id, mistake: true }, ...rest.slice(at)],
    returns: { ...q.returns, [done.id]: (q.returns[done.id] ?? 0) + 1 },
  };
}
