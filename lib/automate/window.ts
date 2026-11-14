/**
 * The response window and what counts as an answer in time (tasks 9.3 and 9.4). The window shortens as the
 * student answers quickly and accurately, and lengthens when they struggle, inside fixed limits. A blank
 * (nothing said in the window) only ever helps the student: it lengthens the window and is never counted as wrong.
 */
export interface AutomateConfig {
  startMs: number;
  minMs: number;
  maxMs: number;
  /** Accuracy (whole percent) that counts as a good answer. */
  threshold: number;
  /** Accuracy below this, or a blank, is a struggle. */
  hardBelow: number;
  /** A fast answer starts within this share of the window. */
  fastShare: number;
  /** Fast, accurate answers in a row before the window shrinks. */
  shrinkAfter: number;
  /** Struggles in a row before the window grows. */
  growAfter: number;
  shrinkBy: number;
  growBy: number;
  /** Test-ready: an accurate answer at least this quick counts toward readiness. */
  targetMs: number;
  /** Test-ready: sessions each question must meet the target in. One by default, so a single sitting can finish. */
  readySessions: number;
}

export const DEFAULT_AUTOMATE: AutomateConfig = {
  startMs: 8000, minMs: 3000, maxMs: 12000,
  threshold: 80, hardBelow: 40, fastShare: 0.5,
  shrinkAfter: 3, growAfter: 2, shrinkBy: 0.85, growBy: 1.25,
  targetMs: 3500, readySessions: 1,
};

/** What one attempt contributes. `responseMs` is null for a blank. */
export interface Timed {
  accuracy: number | null;
  responseMs: number | null;
  blank: boolean;
}

export interface WindowState {
  windowMs: number;
  fast: number;
  struggles: number;
}

export const startWindow = (cfg: AutomateConfig = DEFAULT_AUTOMATE): WindowState => ({ windowMs: cfg.startMs, fast: 0, struggles: 0 });

const clamp = (ms: number, cfg: AutomateConfig) => Math.round(Math.min(cfg.maxMs, Math.max(cfg.minMs, ms)));

export function nextWindow(s: WindowState, a: Timed, cfg: AutomateConfig = DEFAULT_AUTOMATE): WindowState {
  const struggled = a.blank || (a.accuracy !== null && a.accuracy < cfg.hardBelow);
  if (struggled) {
    const struggles = s.struggles + 1;
    return struggles >= cfg.growAfter ? { windowMs: clamp(s.windowMs * cfg.growBy, cfg), fast: 0, struggles: 0 } : { ...s, fast: 0, struggles };
  }
  const fast = a.accuracy !== null && a.accuracy >= cfg.threshold && a.responseMs !== null && a.responseMs <= s.windowMs * cfg.fastShare;
  if (!fast) return { ...s, fast: 0, struggles: 0 };
  return s.fast + 1 >= cfg.shrinkAfter ? { windowMs: clamp(s.windowMs * cfg.shrinkBy, cfg), fast: 0, struggles: 0 } : { ...s, fast: s.fast + 1, struggles: 0 };
}

/** The window after a whole history of attempts, oldest first. This is how it carries across sessions. */
export const foldWindow = (history: Timed[], cfg: AutomateConfig = DEFAULT_AUTOMATE): WindowState =>
  history.reduce((s, a) => nextWindow(s, a, cfg), startWindow(cfg));

/** One question's record: the separate sessions in which it was answered accurately and within the target time. */
export interface QuestionReadiness {
  sessionsMet: number;
}

/** Ready when every question has met the accuracy and time target in enough separate sessions. */
export function isTestReady(questions: QuestionReadiness[], expected: number, cfg: AutomateConfig = DEFAULT_AUTOMATE): boolean {
  return questions.length >= expected && questions.every((q) => q.sessionsMet >= cfg.readySessions);
}

/** Does one attempt meet the readiness target? */
export const meetsTarget = (a: Timed, cfg: AutomateConfig = DEFAULT_AUTOMATE) =>
  !a.blank && a.accuracy !== null && a.accuracy >= cfg.threshold && a.responseMs !== null && a.responseMs <= cfg.targetMs;
