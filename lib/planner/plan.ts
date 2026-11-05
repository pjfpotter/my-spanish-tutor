import { QUESTION_COUNT, type PhaseId } from '../phases/gate';
import type { ReadinessInput } from './readiness';

/** Minutes of work left per item, by phase. Late starters get the short version. */
const MINUTES = {
  normal: { write: 6, understand: 4, memorise: 5, automate: 3 },
  late: { write: 4, understand: 2, memorise: 3, automate: 5 },
} satisfies Record<string, Record<PhaseId, number>>;

/** Automatisation needs separate sessions, so even a student who has started needs a few rounds of it. */
const AUTOMATE_FLOOR = { normal: 6, late: 8 };

/** No single session is longer than this, so each one stays short enough to start. */
export const MAX_SESSION_MINUTES = 15;
/** Few days left: shorten phases and put the weight on writing short answers and rapid recall. */
export const LATE_DAYS = 3;

export interface PlannedSession {
  phase: PhaseId;
  /** The stated duration, in whole minutes. */
  minutes: number;
}
export interface PlannedDay {
  /** 0 is today. */
  day: number;
  sessions: PlannedSession[];
}
export interface Plan {
  mode: 'normal' | 'late' | 'none';
  days: PlannedDay[];
  /** Everything fits only with a longer day than the student offered. Said kindly, never as a failure. */
  tight: boolean;
  /** The phases a late starter should lean on. */
  focus: PhaseId[];
  /** A calm sentence about today. */
  message: string;
}

function remainingWork(i: ReadinessInput, mode: 'normal' | 'late'): PlannedSession[] {
  const m = MINUTES[mode];
  const left = (done: number) => Math.max(0, QUESTION_COUNT - done);
  const work: PlannedSession[] = [
    { phase: 'write', minutes: left(i.answersConfirmed) * m.write },
    { phase: 'understand', minutes: left(i.questionsMastered) * m.understand },
    { phase: 'memorise', minutes: left(i.answersMemorised) * m.memorise },
    { phase: 'automate', minutes: i.questionsAutomated >= QUESTION_COUNT ? 0 : Math.max(left(i.questionsAutomated) * m.automate, AUTOMATE_FLOOR[mode]) },
  ];
  return work.filter((w) => w.minutes > 0);
}

/**
 * A short plan from the minutes the student has per day and the days left (today counts).
 * The plan is always rebuilt from what is still to do, so a skipped session is not lost or
 * punished: the remaining work is simply spread over the days that remain.
 */
export function buildPlan(input: { progress: ReadinessInput; minutesPerDay: number; daysLeft: number }): Plan {
  const { progress, daysLeft } = input;
  const minutesPerDay = Math.max(5, Math.floor(input.minutesPerDay));
  if (daysLeft < 1) return { mode: 'none', days: [], tight: false, focus: [], message: '' };

  const mode = daysLeft <= LATE_DAYS ? 'late' : 'normal';
  const work = remainingWork(progress, mode);
  const total = work.reduce((a, w) => a + w.minutes, 0);
  const focus: PhaseId[] = mode === 'late' ? ['write', 'automate'] : [];
  if (total === 0) return { mode, days: [], tight: false, focus, message: 'Nothing left to plan. A few minutes of light practice keeps it fresh.' };

  // Even spread, never above what the student offered. If that is not enough, the days are full and we say so kindly.
  const perDay = Math.min(minutesPerDay, Math.ceil(total / daysLeft));
  const days: PlannedDay[] = [];
  let queue = work.map((w) => ({ ...w }));
  for (let d = 0; d < daysLeft && queue.length; d++) {
    let room = perDay;
    const sessions: PlannedSession[] = [];
    while (room > 0 && queue.length) {
      const head = queue[0];
      const take = Math.min(head.minutes, room, MAX_SESSION_MINUTES);
      sessions.push({ phase: head.phase, minutes: take });
      head.minutes -= take;
      room -= take;
      if (head.minutes === 0) queue = queue.slice(1);
    }
    // Neighbouring slices of the same phase read better as one session.
    days.push({ day: d, sessions: sessions.reduce<PlannedSession[]>((acc, s) => (acc.at(-1)?.phase === s.phase ? [...acc.slice(0, -1), { phase: s.phase, minutes: s.minutes + acc.at(-1)!.minutes }] : [...acc, s]), []) });
  }
  const tight = queue.length > 0;
  const today = days[0]?.sessions.reduce((a, s) => a + s.minutes, 0) ?? 0;
  const message = tight
    ? `Today: about ${today} minutes. There is a lot to fit in, so even a bit more time on any day helps.`
    : `Today: about ${today} minutes, then ${daysLeft - 1 === 0 ? 'you are done' : `${daysLeft - 1} more ${daysLeft - 1 === 1 ? 'day' : 'days'} to go`}.`;
  return { mode, days, tight, focus, message };
}
