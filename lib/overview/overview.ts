import { createHash } from 'node:crypto';
import type { Db } from '../db/types';
import { CAUSE_TAGS, type CauseTag } from '../events/attempts';
import { QUESTION_COUNT, type PhaseId } from '../phases/gate';
import { loadReadinessInput } from '../planner/load';
import { readinessPercent, type ReadinessInput } from '../planner/readiness';
import { loadQuestions } from '../progress/progress';
import { courseSummary, type CourseStatus } from '../course/status';

/** Where a student is working now: the first step of the path they have not finished, or ready for the test. */
export type Stage = PhaseId | 'ready';
export const STAGES: Stage[] = ['write', 'understand', 'memorise', 'automate', 'ready'];

export function stageOf(p: ReadinessInput): Stage {
  const total = p.total ?? QUESTION_COUNT;
  if (p.answersConfirmed < total) return 'write';
  if (p.questionsMastered < total) return 'understand';
  if (p.answersMemorised < total) return 'memorise';
  return p.testReady || p.questionsAutomated >= total ? 'ready' : 'automate';
}

export interface Hotspot { label: string; misses: number }
export interface OverviewData {
  title: string;
  testDate: string;
  joined: number;
  started: number;
  /** Students working at each stage, including those who have not started. */
  stages: Record<Stage, number>;
  /** Mean readiness over everyone who joined, 0 to 100; null with no students. */
  averageReadiness: number | null;
  /** Nickname and progress only. */
  students: { nickname: string; stage: Stage; readiness: number }[];
  questionHotspots: Hotspot[];
  chunkHotspots: Hotspot[];
  causes: { tag: CauseTag; count: number }[];
  /** Where the course is on the way to a class (draft, set up, reviewed, published, shared). Left out for sample data. */
  courseStatus?: { status: CourseStatus; missing: string[] };
}

/** Owner links carry a random token; only its hash is stored. */
export const hashOwnerToken = (token: string) => createHash('sha256').update(token).digest('hex');

export async function findCourseByOwnerToken(db: Db, token: string): Promise<{ id: string } | null> {
  if (!/^[A-Za-z0-9_-]{16,80}$/.test(token)) return null;
  const { rows } = await db.query<{ id: string }>('select id from courses where owner_token_hash = $1', [hashOwnerToken(token)]);
  return rows[0] ?? null;
}

const TOP = 5;

export async function loadOverview(db: Db, courseId: string): Promise<OverviewData> {
  const course = (await db.query<{ title: string; test_date: Date | string }>('select title, test_date from courses where id = $1', [courseId])).rows[0];
  const questions = await loadQuestions(db, courseId);
  // Readiness counts the core questions only; extension questions are optional extras.
  const qids = questions.filter((q) => !q.extension).map((q) => q.id);
  const profiles = (await db.query<{ id: string; nickname: string }>('select id, nickname from profiles where course_id = $1 order by created_at, id', [courseId])).rows;
  const startedIds = new Set((await db.query<{ profile_id: string }>(
    `select profile_id from attempts where profile_id in (select id from profiles where course_id = $1)
     union select profile_id from answers where profile_id in (select id from profiles where course_id = $1)`, [courseId])).rows.map((r) => r.profile_id));

  const students: OverviewData['students'] = [];
  const stages = Object.fromEntries(STAGES.map((s) => [s, 0])) as Record<Stage, number>;
  for (const p of profiles) {
    const input = await loadReadinessInput(db, p.id, courseId, qids);
    const stage = stageOf(input);
    stages[stage]++;
    students.push({ nickname: p.nickname, stage, readiness: readinessPercent(input) });
  }

  const qText = new Map(questions.map((q) => [q.id, q.spanish]));
  const qMiss = await db.query<{ item_id: string; n: string }>(
    `select a.item_id, count(*) as n from attempts a join profiles p on p.id = a.profile_id
      where p.course_id = $1 and a.item_kind = 'question' and a.outcome in ('wrong', 'blank') and not a.assisted
      group by a.item_id order by n desc, a.item_id limit $2`, [courseId, TOP]);
  const cMiss = await db.query<{ spanish: string; n: string }>(
    `select c.spanish, count(*) as n from chunk_events e join chunks c on c.id = e.chunk_id join profiles p on p.id = e.profile_id
      where p.course_id = $1 and e.missed group by c.spanish order by n desc, c.spanish limit $2`, [courseId, TOP]);
  const causes = await db.query<{ tag: string; n: string }>(
    `select t.tag, count(*) as n from attempts a join profiles p on p.id = a.profile_id, unnest(a.cause_tags) as t(tag)
      where p.course_id = $1 group by t.tag order by n desc, t.tag limit $2`, [courseId, TOP]);

  return {
    title: course.title,
    testDate: course.test_date instanceof Date ? course.test_date.toISOString().slice(0, 10) : String(course.test_date).slice(0, 10),
    joined: profiles.length,
    started: startedIds.size,
    stages,
    averageReadiness: students.length ? Math.round(students.reduce((s, x) => s + x.readiness, 0) / students.length) : null,
    students,
    questionHotspots: qMiss.rows.map((r) => ({ label: qText.get(r.item_id) ?? 'A question', misses: Number(r.n) })),
    chunkHotspots: cMiss.rows.map((r) => ({ label: r.spanish, misses: Number(r.n) })),
    courseStatus: await courseSummary(db, courseId).then(({ status, missing }) => ({ status, missing })),
    causes: causes.rows.filter((r) => (CAUSE_TAGS as readonly string[]).includes(r.tag)).map((r) => ({ tag: r.tag as CauseTag, count: Number(r.n) })),
  };
}
