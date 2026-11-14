import { DEFAULT_RANK, rankFor, type RankInfo } from './rank';
import { DEFAULT_AUTOMATE, foldWindow, isTestReady, meetsTarget, type AutomateConfig, type Timed } from './window';

/** One stored timed attempt, as the database holds it and as the lab keeps it on the device. */
export interface AttemptRow {
  item_id: string;
  session_id: string;
  outcome: string;
  accuracy: string | number | null;
  response_time_ms: number | null;
  assisted: boolean;
}

export interface SessionSummary {
  /** Average response time of the answers that counted, in ms. */
  averageMs: number;
  answers: number;
}

export interface AutomateState {
  /** The response window for the next question, in ms. */
  windowMs: number;
  rank: RankInfo;
  /** The student's own recent sessions, oldest first. */
  history: SessionSummary[];
  /** Per question: separate sessions in which it met the accuracy and time target. */
  sessionsMet: Record<string, number>;
  ready: boolean;
}

const toTimed = (r: AttemptRow): Timed => ({ accuracy: r.accuracy === null ? null : Number(r.accuracy), responseMs: r.response_time_ms, blank: r.outcome === 'blank' });

/**
 * Where a student stands in timed practice, from their attempts, oldest first. Attempts made with the text showing
 * (assisted) never count toward the window, rank or readiness: they are practice, not a test of hearing. The same
 * rules serve the stored attempts of a student and the lab's attempts kept on a device.
 */
export function automateStateFrom(rows: AttemptRow[], questionIds: string[], cfg: AutomateConfig = DEFAULT_AUTOMATE): AutomateState {
  const counted = rows.filter((r) => !r.assisted);
  const timed = counted.map(toTimed);

  const bySession = new Map<string, number[]>();
  for (const r of counted) {
    const t = toTimed(r);
    if (t.blank || t.responseMs === null || t.accuracy === null || t.accuracy < DEFAULT_RANK.minAccuracy) continue;
    bySession.set(r.session_id, [...(bySession.get(r.session_id) ?? []), t.responseMs]);
  }
  const history = [...bySession.values()].slice(-8).map((ms) => ({ averageMs: Math.round(ms.reduce((a, b) => a + b, 0) / ms.length), answers: ms.length }));

  const met = new Map<string, Set<string>>();
  for (const r of counted) if (meetsTarget(toTimed(r), cfg)) met.set(r.item_id, (met.get(r.item_id) ?? new Set()).add(r.session_id));
  const sessionsMet = Object.fromEntries(questionIds.map((id) => [id, met.get(id)?.size ?? 0]));

  return {
    windowMs: foldWindow(timed, cfg).windowMs,
    rank: rankFor(timed),
    history,
    sessionsMet,
    ready: isTestReady(questionIds.map((id) => ({ sessionsMet: sessionsMet[id] })), questionIds.length, cfg),
  };
}
