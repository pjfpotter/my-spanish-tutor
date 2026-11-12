/**
 * How quickly live listening keeps up (task 27.9), and the report a tester copies into the device matrix
 * (task 27.12). Only timings and device facts are kept: no audio, no words, no names.
 *
 * Three timings are taken while a student speaks:
 * - `first-word`: from the browser first noticing speech on a screen to the first word lighting. It includes the
 *   time to say that word, so it is a ceiling on the recogniser's own delay, not the delay alone.
 * - `paint`: from a result reaching the app to the lit word being on screen. This part is ours to reduce.
 * - `gap`: the time between one result and the next. Long gaps are the recogniser batching its guesses.
 */
export type LatencyKind = 'first-word' | 'paint' | 'gap';

/**
 * The budgets, set on 12 Nov 2026 from a run on the reference Android phone (docs/performance-budget.md).
 * `paint` is ours and is a hard limit; `first-word` depends on the recogniser and the network, so it is set
 * just above what that phone measured and the level indicator covers the rest.
 */
export const LATENCY_BUDGET = { paintP90Ms: 100, firstWordMedianMs: 2500 } as const;

export interface Summary { n: number; median: number; p90: number; max: number }

const pct = (sorted: number[], p: number) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(p * sorted.length) - 1))];

export function summarise(values: readonly number[]): Summary | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  return { n: s.length, median: Math.round(pct(s, 0.5)), p90: Math.round(pct(s, 0.9)), max: Math.round(s[s.length - 1]) };
}

export class LatencyLog {
  private samples: Record<LatencyKind, number[]> = { 'first-word': [], paint: [], gap: [] };
  add(kind: LatencyKind, ms: number) {
    if (Number.isFinite(ms) && ms >= 0 && ms < 60_000) this.samples[kind].push(ms);
  }
  summary(kind: LatencyKind) { return summarise(this.samples[kind]); }
  count() { return this.samples['first-word'].length + this.samples.paint.length + this.samples.gap.length; }
  reset() { this.samples = { 'first-word': [], paint: [], gap: [] }; }
}

/** What the live recogniser did during the run, kept by `useLiveSpeech`. */
export interface LiveStats {
  /** Recogniser sessions opened (the browser ends one now and then; we open the next quietly). */
  sessions: number;
  /** Results that were still being revised, which is what lets words light while the student speaks. */
  interims: number;
  finals: number;
  /** Milliseconds from start to the first result of the first session, or null if none came. */
  firstResultMs: number | null;
  /** Errors the recogniser reported, by name. */
  errors: string[];
  /** Times listening came back after the screen locked or the app went to the background. */
  resumes: number;
}

export const freshStats = (): LiveStats => ({ sessions: 0, interims: 0, finals: 0, firstResultMs: null, errors: [], resumes: 0 });

export interface DeviceFacts {
  userAgent: string;
  recogniser: boolean;
  meterOn: boolean;
  wakeLock: boolean;
  wakeLockHeld: boolean;
}

const fmt = (s: Summary | null, budget?: string) => (s ? `median ${s.median} ms, 90th ${s.p90} ms, worst ${s.max} ms, ${s.n} samples${budget ? ` (${budget})` : ''}` : 'no samples');

/** Pass or miss against the provisional budget, as words. */
export function budgetVerdict(log: LatencyLog): { paint: string; firstWord: string } {
  const p = log.summary('paint');
  const f = log.summary('first-word');
  return {
    paint: !p ? 'not measured' : p.p90 <= LATENCY_BUDGET.paintP90Ms ? 'within budget' : 'over budget',
    firstWord: !f ? 'not measured' : f.median <= LATENCY_BUDGET.firstWordMedianMs ? 'within budget' : 'over budget',
  };
}

/** The block a tester pastes under "Results" in docs/device-matrix.md. */
export function deviceReport(facts: DeviceFacts, stats: LiveStats, log: LatencyLog): string {
  const v = budgetVerdict(log);
  return [
    '### Memorise lab run',
    `- Browser: ${facts.userAgent}`,
    `- Built-in recogniser present: ${facts.recogniser ? 'yes' : 'no'}`,
    `- Results while speaking: ${stats.interims} still being revised (interim), ${stats.finals} settled (final)`,
    `- First result after the microphone opened: ${stats.firstResultMs === null ? 'none' : `${stats.firstResultMs} ms`}`,
    `- Recogniser sessions opened: ${stats.sessions}`,
    `- Errors: ${stats.errors.length ? stats.errors.join(', ') : 'none'}`,
    `- Level meter: ${facts.meterOn ? 'on' : 'off'}`,
    `- Screen stays awake: ${facts.wakeLock ? (facts.wakeLockHeld ? 'supported and held' : 'supported, not held now') : 'not supported'}`,
    `- Listening came back after a lock or background: ${stats.resumes} time${stats.resumes === 1 ? '' : 's'}`,
    `- Result to screen: ${fmt(log.summary('paint'), `${v.paint}, 90th under ${LATENCY_BUDGET.paintP90Ms} ms`)}`,
    `- Speech start to first word lit: ${fmt(log.summary('first-word'), `${v.firstWord}, median under ${LATENCY_BUDGET.firstWordMedianMs} ms`)}`,
    `- Gap between results: ${fmt(log.summary('gap'))}`,
  ].join('\n');
}
