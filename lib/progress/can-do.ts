import { loadAutomateState } from '../automate/store';
import { DEFAULT_AUTOMATE } from '../automate/window';
import type { Db } from '../db/types';
import { knownAtStart, loadBaseline } from '../diagnostics/baseline';
import { DEFAULT_MASTERY, isMastered, NO_MASTERY } from '../mastery/mastery';
import type { PhaseId } from '../phases/gate';
import { loadMastery, loadQuestions } from './progress';

/** How far a student is on one step of one question. Said in words and an icon, never by colour alone. */
export type TickState = 'not-yet' | 'getting-there' | 'got-it';

/** What is stored about one question, before it is turned into ticks. */
export interface QuestionFacts {
  understood: boolean;
  understandStarted: boolean;
  wroteConfirmed: boolean;
  wroteStarted: boolean;
  memorised: boolean;
  memoriseStarted: boolean;
  fast: boolean;
  fastStarted: boolean;
}

export interface CanDoRow {
  id: string;
  position: number;
  /** The English meaning of the question, for the statement "I can answer ...". */
  english: string;
  ticks: Record<PhaseId, TickState>;
  /** Every tick is "Got it". */
  complete: boolean;
  /** The first step on this question that is not done, or null if all are. */
  nextStep: PhaseId | null;
}

export interface CanDo {
  rows: CanDoRow[];
  /** Questions with every tick at "Got it". */
  ready: number;
  total: number;
}

const tick = (done: boolean, started: boolean): TickState => (done ? 'got-it' : started ? 'getting-there' : 'not-yet');
const ORDER: PhaseId[] = ['understand', 'write', 'memorise', 'automate'];

/** The four ticks for one question, by rules. A wrong answer or a recognition failure can never lower a tick. */
export function ticksFor(f: QuestionFacts): Record<PhaseId, TickState> {
  return {
    understand: tick(f.understood, f.understandStarted),
    write: tick(f.wroteConfirmed, f.wroteStarted),
    memorise: tick(f.memorised, f.memoriseStarted),
    automate: tick(f.fast, f.fastStarted),
  };
}

export function canDoRow(q: { id: string; position: number; english: string }, f: QuestionFacts): CanDoRow {
  const ticks = ticksFor(f);
  const nextStep = ORDER.find((p) => ticks[p] !== 'got-it') ?? null;
  return { id: q.id, position: q.position, english: q.english, ticks, complete: nextStep === null, nextStep };
}

export function summarise(rows: CanDoRow[]): CanDo {
  return { rows, ready: rows.filter((r) => r.complete).length, total: rows.length };
}

/**
 * One row per core question, from data already stored: Understand from mastery and the quick check, Write from
 * confirmed answers, Memorise from mastery and the ladder, Fast from the timed answers. No new data, no model.
 */
export async function loadCanDo(db: Db, profileId: string, courseId: string): Promise<CanDo> {
  const questions = (await loadQuestions(db, courseId)).filter((q) => !q.extension);
  const ids = questions.map((q) => q.id);
  const [understand, memorise, automate, baseline, answers, ladder] = await Promise.all([
    loadMastery(db, profileId, 'understand'),
    loadMastery(db, profileId, 'memorise'),
    loadMastery(db, profileId, 'automate'),
    loadBaseline(db, profileId),
    db.query<{ question_id: string; confirmed: boolean }>('select question_id, confirmed_at is not null as confirmed from answers where profile_id = $1', [profileId]),
    db.query<{ question_id: string }>('select question_id from memorise_ladder where profile_id = $1 and (stage > 0 or top > 0)', [profileId]),
  ]);
  const proven = knownAtStart(baseline);
  const wrote = new Map(answers.rows.map((r) => [r.question_id, r.confirmed]));
  const laddered = new Set(ladder.rows.map((r) => r.question_id));
  // Timed answers only matter once something is memorised, so skip the extra query before then.
  const sessionsMet = [...memorise.values()].some((m) => isMastered(m, DEFAULT_MASTERY)) ? (await loadAutomateState(db, profileId, ids)).sessionsMet : {};

  const rows = questions.map((q) => {
    const u = understand.get(q.id) ?? NO_MASTERY;
    const m = memorise.get(q.id) ?? NO_MASTERY;
    const a = automate.get(q.id) ?? NO_MASTERY;
    return canDoRow(q, {
      understood: proven.has(q.id) || isMastered(u, DEFAULT_MASTERY),
      understandStarted: u.qualifyingSuccesses > 0,
      wroteConfirmed: wrote.get(q.id) === true,
      wroteStarted: wrote.has(q.id),
      memorised: isMastered(m, DEFAULT_MASTERY),
      memoriseStarted: m.qualifyingSuccesses > 0 || laddered.has(q.id),
      fast: (sessionsMet[q.id] ?? 0) >= DEFAULT_AUTOMATE.readySessions,
      fastStarted: a.qualifyingSuccesses > 0 || (sessionsMet[q.id] ?? 0) > 0,
    });
  });
  return summarise(rows);
}
