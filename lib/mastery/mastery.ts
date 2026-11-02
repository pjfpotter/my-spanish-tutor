/**
 * Mastery as separate-session evidence (design D10). An item is mastered after enough correct,
 * unassisted answers spread across enough different sessions. Wrong answers never take
 * progress away; they only bring the item back sooner.
 */

export interface MasteryConfig {
  /** Correct, unassisted answers needed. */
  successes: number;
  /** Distinct sessions those answers must come from. */
  sessions: number;
}

export const DEFAULT_MASTERY: MasteryConfig = { successes: 3, sessions: 2 };

/** Matches the `mastery` table: qualifying_successes, distinct_sessions, last_success_session_id. */
export interface MasteryState {
  qualifyingSuccesses: number;
  distinctSessions: number;
  lastSuccessSessionId: string | null;
}

export const NO_MASTERY: MasteryState = { qualifyingSuccesses: 0, distinctSessions: 0, lastSuccessSessionId: null };

export interface AttemptResult {
  correct: boolean;
  /** Help was used (revealed text, for example). An assisted attempt never counts. */
  assisted: boolean;
  sessionId: string;
}

/**
 * Applies one attempt. Sessions are counted when a new session id records a success, which
 * works because a student's attempts arrive in time order and a session never resumes after
 * another has begun.
 */
export function recordAttempt(state: MasteryState, attempt: AttemptResult): MasteryState {
  if (!attempt.correct || attempt.assisted) return state;
  const newSession = state.lastSuccessSessionId !== attempt.sessionId;
  return {
    qualifyingSuccesses: state.qualifyingSuccesses + 1,
    distinctSessions: state.distinctSessions + (newSession ? 1 : 0),
    lastSuccessSessionId: attempt.sessionId,
  };
}

export function isMastered(state: MasteryState, config: MasteryConfig = DEFAULT_MASTERY): boolean {
  return state.qualifyingSuccesses >= config.successes && state.distinctSessions >= config.sessions;
}

/** Enough correct answers, but all from too few sessions: it must wait for a later session. */
export function needsLaterSession(state: MasteryState, config: MasteryConfig = DEFAULT_MASTERY): boolean {
  return state.qualifyingSuccesses >= config.successes && state.distinctSessions < config.sessions;
}

/** 0 to 1, how far along the item is. Drives how clear a channel's picture is (task 6.4). */
export function masteryFraction(state: MasteryState, config: MasteryConfig = DEFAULT_MASTERY): number {
  if (isMastered(state, config)) return 1;
  const bySuccess = Math.min(1, state.qualifyingSuccesses / config.successes);
  const bySession = Math.min(1, state.distinctSessions / config.sessions);
  // Capped just under 1: only real mastery reaches 1.
  return Math.min(0.95, (bySuccess + bySession) / 2);
}

/** How many of the given items are mastered. */
export function countMastered(states: MasteryState[], config: MasteryConfig = DEFAULT_MASTERY): number {
  return states.filter((s) => isMastered(s, config)).length;
}

// ---- In-session spaced return -------------------------------------------------------------

/** Items come back after this many other items: a miss soon, then further apart on each success. */
export const MISS_GAP = 2;
export const SUCCESS_GAPS = [3, 5, 8] as const;

export interface QueueEntry {
  id: string;
  /** Consecutive successes this session, which sets how far away it returns. */
  streak: number;
  /** Turn number at which the entry is due. */
  due: number;
}

export interface SessionQueue {
  turn: number;
  entries: QueueEntry[];
  /** The id served last, so the same item is never served twice running unless it is the only one. */
  last: string | null;
}

export function newQueue(ids: string[]): SessionQueue {
  return { turn: 0, entries: ids.map((id, i) => ({ id, streak: 0, due: i })), last: null };
}

/** The next item to practise, or null when the queue is empty. Earliest due first, never the same twice in a row. */
export function nextInQueue(q: SessionQueue): string | null {
  if (!q.entries.length) return null;
  const sorted = [...q.entries].sort((a, b) => a.due - b.due);
  const pick = sorted.find((e) => e.id !== q.last) ?? sorted[0];
  return pick.id;
}

/** Records how the served item went and schedules its return. A mastered item leaves the queue. */
export function afterAttempt(q: SessionQueue, id: string, outcome: 'correct' | 'wrong' | 'assisted', mastered: boolean): SessionQueue {
  const turn = q.turn + 1;
  const entries = q.entries.flatMap((e) => {
    if (e.id !== id) return [e];
    if (mastered) return [];
    if (outcome === 'correct') {
      const streak = e.streak + 1;
      return [{ ...e, streak, due: turn + SUCCESS_GAPS[Math.min(streak, SUCCESS_GAPS.length) - 1] }];
    }
    return [{ ...e, streak: 0, due: turn + MISS_GAP }];
  });
  return { turn, entries, last: id };
}
