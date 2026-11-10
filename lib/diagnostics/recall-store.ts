import type { Db } from '../db/types';
import type { CauseTag } from '../events/attempts';
import { locateChunks, missedChunks, isHotspot, type ChunkRef } from './chunks';
import { activeTags, loadHistory } from './plan';
import { tagRecall } from './recall';

async function courseChunks(db: Db, courseId: string): Promise<ChunkRef[]> {
  const { rows } = await db.query<ChunkRef>('select id, spanish from chunks where course_id = $1', [courseId]);
  return rows;
}

/** The chunks this student is currently stuck on (missed three times and not yet recovered). */
export async function hotspotChunkIds(db: Db, profileId: string): Promise<Set<string>> {
  const { rows } = await db.query<{ chunk_id: string; missed: boolean }>(
    'select chunk_id, missed from chunk_events where profile_id = $1 order by created_at, id',
    [profileId],
  );
  const byChunk = new Map<string, boolean[]>();
  for (const r of rows) byChunk.set(r.chunk_id, [...(byChunk.get(r.chunk_id) ?? []), r.missed]);
  return new Set([...byChunk].filter(([, h]) => isHotspot(h)).map(([id]) => id));
}


/**
 * Notes which chunks of the student's own answer were missed in an untimed attempt. `missedWords` are
 * positions in the script that the recogniser did not match; no transcript is sent or kept. A
 * read-aloud attempt (whole script showing) is not recall, so it records nothing.
 */
export async function recordChunkEvents(
  db: Db,
  i: { profileId: string; courseId: string; answer: string; missedWords: number[]; sessionId: string; readingAloud: boolean },
): Promise<{ missedChunkIds: string[] }> {
  if (i.readingAloud) return { missedChunkIds: [] };
  const located = locateChunks(i.answer, await courseChunks(db, i.courseId));
  const results = missedChunks(located, new Set(i.missedWords));
  // A chunk used twice in one answer is one event: missed if either use was.
  const perChunk = new Map<string, boolean>();
  for (const r of results) perChunk.set(r.chunkId, (perChunk.get(r.chunkId) ?? false) || r.missed);
  for (const [chunkId, missed] of perChunk) {
    await db.query('insert into chunk_events (profile_id, chunk_id, session_id, missed) values ($1,$2,$3,$4)', [i.profileId, chunkId, i.sessionId, missed]);
  }
  return { missedChunkIds: [...perChunk].filter(([, m]) => m).map(([id]) => id) };
}

/**
 * The cause tag for a failed recall attempt, or none. Must be called before this attempt is logged,
 * so "has passed untimed before" does not include the attempt being judged.
 */
export async function causeTagsForRecallFailure(
  db: Db,
  i: { profileId: string; courseId: string; itemId: string; answer: string; timed: boolean; missedChunkIds?: string[] },
): Promise<CauseTag[]> {
  const passed = await db.query(
    `select 1 from attempts where profile_id = $1 and item_id = $2 and phase = 'memorise' and outcome = 'correct' limit 1`,
    [i.profileId, i.itemId],
  );
  const hotspots = await hotspotChunkIds(db, i.profileId);
  const inAnswer = i.timed || !i.missedChunkIds
    ? locateChunks(i.answer, await courseChunks(db, i.courseId)).map((l) => l.chunkId)
    : i.missedChunkIds;
  const tag = tagRecall({
    timed: i.timed, untimedPassed: passed.rows.length > 0,
    hotspot: inAnswer.some((id) => hotspots.has(id)),
  });
  return tag ? [tag] : [];
}

/**
 * The answers to practise first: those with a hotspot chunk in them, or whose latest failure still
 * carries a recall cause tag. A fixed problem (a later success) drops off the list.
 */
export async function focusedAnswerIds(db: Db, profileId: string, courseId: string, items: { id: string; answer: string }[]): Promise<string[]> {
  const hotspots = await hotspotChunkIds(db, profileId);
  const chunks = hotspots.size ? await courseChunks(db, courseId) : [];
  const history = await loadHistory(db, profileId, 'memorise');
  return items
    .filter((it) => {
      const hasHotspot = hotspots.size > 0 && locateChunks(it.answer, chunks).some((l) => hotspots.has(l.chunkId));
      return hasHotspot || activeTags(history.get(it.id) ?? []).length > 0;
    })
    .map((it) => it.id);
}

/**
 * The cause tags that still apply to each answer: its live recall tags, plus a hotspot tag when one of its chunks is a
 * hotspot. The memorise screen uses them so support never falls below what the problem needs (task 21.5).
 */
export async function liveRecallCauses(db: Db, profileId: string, courseId: string, items: { id: string; answer: string }[]): Promise<Record<string, CauseTag[]>> {
  const hotspots = await hotspotChunkIds(db, profileId);
  const chunks = hotspots.size ? await courseChunks(db, courseId) : [];
  const history = await loadHistory(db, profileId, 'memorise');
  const out: Record<string, CauseTag[]> = {};
  for (const it of items) {
    const tags = new Set<CauseTag>(activeTags(history.get(it.id) ?? []));
    if (hotspots.size > 0 && locateChunks(it.answer, chunks).some((l) => hotspots.has(l.chunkId))) tags.add('chunk_hotspot');
    if (tags.size) out[it.id] = [...tags];
  }
  return out;
}
