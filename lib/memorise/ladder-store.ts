import { createHash } from 'node:crypto';
import type { Db } from '../db/types';
import type { Chunk } from '../course/schema';
import { awardCoins, balance } from '../coins/ledger';
import { daysUntil, ladderDay } from './day';
import { freshState, lessonsOf, type AnswerState, type LadderAnswer } from './ladder';
import { ladderAnswerOf } from './ladder-answers';
import { loadMemoriseItems, recordRecall, type MemoriseItem } from './store';

/** What the memorise phase needs to start: the student's answers as bits, where each is on the ladder, and the day. */
export interface LadderStart {
  answers: LadderAnswer[];
  states: AnswerState[];
  day: number;
  euros: number;
  /** Days left to the test, or null when the course has no date. */
  testDays: number | null;
}

interface Row { question_id: string; stage: number; top: number; wipe_day: number; recalls: number[] }

/**
 * Where each answer is. The mastery table is the authority on "memorised" (three clean answers from memory in two
 * separate sessions), so an answer it counts as memorised is shown as memorised whatever this table says, and an
 * answer it does not count is never shown as memorised.
 */
export function stateFor(row: Row | undefined, item: Pick<MemoriseItem, 'mastered'>, answer: LadderAnswer): AnswerState {
  const last = lessonsOf([answer], 0).length;
  if (item.mastered) return { ...(row ? { stage: last, top: Math.max(5, row.top), wipeDay: row.wipe_day, recalls: row.recalls } : { stage: last, top: 5, wipeDay: 0, recalls: [] }), stage: last, memorised: true };
  if (!row) return freshState();
  return { stage: Math.min(row.stage, last - 1), top: row.top, wipeDay: row.wipe_day, recalls: row.recalls, memorised: false };
}

export async function loadLadder(db: Db, profileId: string, courseId: string, chunks: readonly Chunk[], now: Date = new Date()): Promise<LadderStart> {
  const items = await loadMemoriseItems(db, profileId, courseId);
  const answers = items.map((i) => ladderAnswerOf(i, chunks));
  const { rows } = await db.query<Row>('select question_id, stage, top, wipe_day, recalls from memorise_ladder where profile_id = $1', [profileId]);
  const byId = new Map(rows.map((r) => [r.question_id, r]));
  const date = (await db.query<{ test_date: Date | string }>('select test_date from courses where id = $1', [courseId])).rows[0]?.test_date;
  return {
    answers,
    states: items.map((it, i) => stateFor(byId.get(it.id), it, answers[i])),
    day: ladderDay(now),
    euros: await balance(db, profileId),
    testDays: date ? daysUntil(date instanceof Date ? date.toISOString() : String(date), now) : null,
  };
}

/** One whole-answer attempt made during a lesson. Numbers only. */
export interface LessonRecall {
  itemId: string;
  /** Whole percent of the answer's words that were understood, or 100 for a clean self-marked go. */
  accuracy: number;
  /** How much help was on screen, 0 (the whole script) to 4 (English only or nothing). */
  level: number;
  missedWords?: number[];
}

export interface LessonSave {
  profileId: string;
  courseId: string;
  answers: { itemId: string; stage: number; top: number; wipeDay: number; recalls: number[] }[];
  recalls: LessonRecall[];
  /** Euros earned since the last save. */
  earned: number;
}

/** Most a single save can pay, and most a student can earn from the ladder in a UK day, so replaying cannot farm euros. */
export const LADDER_PAY = { perSave: 80, perDay: 200 } as const;

export type LessonSaveResult = { ok: true; paid: number; euros: number; memorised: string[] } | { ok: false; error: string };

/**
 * One session for each UK day. Mastery counts separate sessions, and the ladder counts separate days, so using the day
 * as the session makes the two agree: an answer is memorised in the database exactly when the ladder says it is.
 */
export function ladderSessionId(profileId: string, day: number): string {
  const h = createHash('sha1').update(`memorise-ladder:${profileId}:${day}`).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

const clamp = (n: unknown, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.trunc(Number(n) || 0)));

export async function saveLesson(db: Db, s: LessonSave, now: Date = new Date()): Promise<LessonSaveResult> {
  const items = await loadMemoriseItems(db, s.profileId, s.courseId);
  const ids = new Set(items.map((i) => i.id));
  const today = ladderDay(now);
  for (const a of s.answers) if (!ids.has(a.itemId)) return { ok: false, error: 'Confirm this answer first.' };
  for (const r of s.recalls) if (!ids.has(r.itemId)) return { ok: false, error: 'Confirm this answer first.' };

  for (const a of s.answers) {
    const recalls = a.recalls.slice(-20).map((d) => clamp(d, 1, today));
    await db.query(
      `insert into memorise_ladder (profile_id, question_id, stage, top, wipe_day, recalls) values ($1, $2, $3, $4, $5, $6)
       on conflict (profile_id, question_id) do update set stage = $3, top = $4, wipe_day = $5, recalls = $6, updated_at = now()`,
      [s.profileId, a.itemId, clamp(a.stage, 0, 12), clamp(a.top, 0, 5), clamp(a.wipeDay, 0, today), recalls],
    );
  }
  for (const r of s.recalls) {
    const res = await recordRecall(db, {
      profileId: s.profileId, courseId: s.courseId, itemId: r.itemId, sessionId: ladderSessionId(s.profileId, today),
      accuracy: clamp(r.accuracy, 0, 100), level: clamp(r.level, 0, 4), missedWords: r.missedWords,
    });
    if (!res.ok) return { ok: false, error: res.error };
  }

  // Effort is paid whatever the result. A save pays at most a lesson's worth, and a day at most a day's worth.
  const dayStart = await db.query<{ n: string }>(
    `select coalesce(sum(amount), 0) as n from coin_ledger where profile_id = $1 and reason = 'memorise' and created_at >= date_trunc('day', now() at time zone 'Europe/London') at time zone 'Europe/London'`,
    [s.profileId],
  );
  const room = Math.max(0, LADDER_PAY.perDay - Number(dayStart.rows[0].n));
  const paid = Math.min(clamp(s.earned, 0, LADDER_PAY.perSave), room);
  if (paid > 0) await awardCoins(db, s.profileId, paid, 'memorise');

  const fresh = await loadMemoriseItems(db, s.profileId, s.courseId);
  return { ok: true, paid, euros: await balance(db, s.profileId), memorised: fresh.filter((i) => i.mastered).map((i) => i.id) };
}
