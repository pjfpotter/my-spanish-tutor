import { createHash } from 'node:crypto';
import type { Db } from '../db/types';
import built from '../audio/built.ts';
import { slotFor, SPEEDS } from '../audio/manifest.ts';
import type { BuiltClip } from '../tele/clips.ts';

/** The clips that exist, as listed by the audio build. */
const BUILT_CLIPS: readonly BuiltClip[] = built;

/**
 * Where a course is on the way to a class (task 23.3, design D21): draft, set up, reviewed, published, shared.
 *
 * Status is worked out from the course's own content, never typed in. A hash of everything the paid steps read
 * (question text, chunks, model answers, calibration) is stored when a step is signed off. If the text changes, the
 * hash no longer matches, so review and publish lapse by themselves and the paid steps run again; if nothing changed,
 * nothing runs, so publishing an unchanged course makes no new calls.
 */
export const COURSE_STATUSES = ['draft', 'set_up', 'reviewed', 'published', 'shared'] as const;
export type CourseStatus = (typeof COURSE_STATUSES)[number];

export interface CourseSummary {
  status: CourseStatus;
  /** What is stopping the next step, in plain words. Empty when nothing is. */
  missing: string[];
  publishedAt: string | null;
  sharedAt: string | null;
}

interface CourseRow {
  title: string;
  test_date: Date | string;
  calibration: unknown;
  model_answers: { questionPosition: number }[] | null;
  has_sheet: boolean;
  reviewed_hash: string | null;
  published_hash: string | null;
  published_at: Date | string | null;
  shared_at: Date | string | null;
}
interface QuestionRow { position: number; spanish: string; english_subtitle: string; extension: boolean; topics: string[]; template: string[]; key_word: string | null }
interface ChunkRow { spanish: string; english_gloss: string; category: string; feature_tags: string[]; builder: string | null }

const iso = (d: Date | string | null) => (d === null ? null : new Date(d).toISOString());

async function load(db: Db, courseId: string) {
  const course = (await db.query<CourseRow>(
    'select title, test_date, calibration, model_answers, (sheet is not null and interpretation is not null) as has_sheet, reviewed_hash, published_hash, published_at, shared_at from courses where id = $1', [courseId])).rows[0];
  if (!course) throw new Error('No such course.');
  const questions = (await db.query<QuestionRow>(
    'select position, spanish, english_subtitle, extension, topics, template, key_word from questions where course_id = $1 order by position', [courseId])).rows;
  const chunks = (await db.query<ChunkRow>(
    'select spanish, english_gloss, category, feature_tags, builder from chunks where course_id = $1 order by spanish', [courseId])).rows;
  return { course, questions, chunks };
}

/** A fingerprint of what the paid steps read. Changing any of it changes the hash. */
export async function contentHash(db: Db, courseId: string): Promise<string> {
  const { course, questions, chunks } = await load(db, courseId);
  const body = JSON.stringify({ t: course.title, d: iso(course.test_date)?.slice(0, 10), c: course.calibration, m: course.model_answers ?? [], q: questions, k: chunks });
  return createHash('sha256').update(body).digest('hex');
}

/** What would stop this course being published: the things that must exist before students see it. */
export async function missingForPublish(db: Db, courseId: string, clips: readonly BuiltClip[] = BUILT_CLIPS): Promise<string[]> {
  const { course, questions, chunks } = await load(db, courseId);
  const missing: string[] = [];
  const core = questions.filter((q) => !q.extension);
  if (![4, 5].includes(core.length)) missing.push(`4 or 5 core questions (it has ${core.length})`);
  if (!chunks.length) missing.push('a sentence builder with chunks');
  if (!course.has_sheet) missing.push("the teacher's uploaded sentence builder sheet");
  const answered = new Set((course.model_answers ?? []).map((a) => a.questionPosition));
  const noAnswers = core.filter((q) => !answered.has(q.position)).map((q) => q.position);
  if (noAnswers.length) missing.push(`model answers for question${noAnswers.length > 1 ? 's' : ''} ${noAnswers.join(', ')} (run the course set-up)`);
  const have = new Set(clips.map((c) => `${c.slot}`));
  const noAudio = questions.filter((q) => Object.values(SPEEDS).some((speed) => !have.has(slotFor(q.spanish, speed)))).map((q) => q.position);
  if (noAudio.length) missing.push(`audio for question${noAudio.length > 1 ? 's' : ''} ${noAudio.join(', ')} (run the audio build)`);
  const current = await contentHash(db, courseId);
  if (course.reviewed_hash === null) missing.push('a review sign-off');
  else if (course.reviewed_hash !== current) missing.push('a new review sign-off (the course changed since the last one)');
  return missing;
}

/** The course's status and what blocks the next step. */
export async function courseSummary(db: Db, courseId: string, clips: readonly BuiltClip[] = BUILT_CLIPS): Promise<CourseSummary> {
  const { course, questions } = await load(db, courseId);
  const hash = await contentHash(db, courseId);
  const core = questions.filter((q) => !q.extension);
  const answered = new Set((course.model_answers ?? []).map((a) => a.questionPosition));
  const setUp = [4, 5].includes(core.length) && core.every((q) => answered.has(q.position));
  const reviewed = setUp && course.reviewed_hash === hash;
  // A course published before this status existed has a publish date and no hash: it counts as published and stays so.
  const published = course.published_at !== null && (course.published_hash === null || course.published_hash === hash);
  const shared = published && course.shared_at !== null;
  const status: CourseStatus = shared ? 'shared' : published ? 'published' : reviewed ? 'reviewed' : setUp ? 'set_up' : 'draft';
  const missing = status === 'published' || status === 'shared' ? [] : await missingForPublish(db, courseId, clips);
  return { status, missing, publishedAt: published ? iso(course.published_at) : null, sharedAt: shared ? iso(course.shared_at) : null };
}

/** Signs off the course as it stands now. Needs the course set up first. Any later edit lapses it. */
export async function markReviewed(db: Db, courseId: string, clips: readonly BuiltClip[] = BUILT_CLIPS): Promise<{ ok: true } | { ok: false; missing: string[] }> {
  const { status, missing } = await courseSummary(db, courseId, clips);
  // Review comes after set-up and before audio, so only set-up can stop it.
  if (status === 'draft') return { ok: false, missing: missing.filter((m) => !m.includes('review') && !m.startsWith('audio')) };
  await db.query('update courses set reviewed_hash = $2 where id = $1', [courseId, await contentHash(db, courseId)]);
  return { ok: true };
}

/** The two paid steps, supplied by whoever runs the publish. Neither is ever called for an unchanged course. */
export interface PublishSteps {
  /** Writes model answers for the questions that have none (one call to a small model, through the cost router). */
  setUp?: () => Promise<void>;
  /** Builds the clips the course is missing (text-to-speech, through the cost router). */
  buildAudio?: () => Promise<void>;
}

export type PublishResult =
  | { ok: true; changed: boolean }
  | { ok: false; missing: string[] };

/**
 * Publishes the course. Blocks, naming each item, while anything is missing. If the content is unchanged since the
 * last publish it does nothing and calls nothing. Otherwise it runs a paid step only when what that step makes is missing.
 */
export async function publishCourse(db: Db, courseId: string, steps: PublishSteps = {}, clips: readonly BuiltClip[] = BUILT_CLIPS): Promise<PublishResult> {
  const before = await courseSummary(db, courseId, clips);
  if (before.status === 'published' || before.status === 'shared') return { ok: true, changed: false };

  let missing = await missingForPublish(db, courseId, clips);
  if (missing.some((m) => m.startsWith('model answers')) && steps.setUp) {
    await steps.setUp();
    missing = await missingForPublish(db, courseId, clips);
  }
  // The audio check reads the built-clip list; a runner that builds audio is expected to hand back a refreshed list in `clips`.
  if (missing.some((m) => m.startsWith('audio')) && steps.buildAudio) {
    await steps.buildAudio();
    missing = await missingForPublish(db, courseId, clips);
  }
  // A sign-off is a person's decision: publishing never gives it, so a missing or lapsed one blocks.
  if (missing.length) return { ok: false, missing };

  const hash = await contentHash(db, courseId);
  await db.query('update courses set published_hash = $2, published_at = now() where id = $1', [courseId, hash]);
  return { ok: true, changed: true };
}

/** Marks the class code as handed to the class. Only a published course can be shared. */
export async function shareCourse(db: Db, courseId: string, clips: readonly BuiltClip[] = BUILT_CLIPS): Promise<{ ok: true; classCode: string } | { ok: false; missing: string[] }> {
  const s = await courseSummary(db, courseId, clips);
  if (s.status !== 'published' && s.status !== 'shared') return { ok: false, missing: s.missing.length ? s.missing : ['publishing'] };
  await db.query('update courses set shared_at = coalesce(shared_at, now()) where id = $1', [courseId]);
  const { rows } = await db.query<{ class_code: string }>('select class_code from courses where id = $1', [courseId]);
  return { ok: true, classCode: rows[0].class_code };
}
