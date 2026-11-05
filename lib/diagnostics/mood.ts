import type { Db } from '../db/types';

/** The fixed answers to the mood check-in. The last one is the honest "Spanish is not my favourite". */
export const MOODS = ['good', 'ok', 'nervous', 'tired', 'not_a_fan'] as const;
export type Mood = (typeof MOODS)[number];

export const isMood = (v: unknown): v is Mood => (MOODS as readonly unknown[]).includes(v);

/** The student's most recent mood, or null if they have never answered. */
export async function latestMood(db: Db, profileId: string): Promise<Mood | null> {
  const { rows } = await db.query<{ mood: Mood }>(
    'select mood from mood_checkins where profile_id = $1 order by created_at desc, id desc limit 1',
    [profileId],
  );
  return rows[0]?.mood ?? null;
}

/** Saves a mood. Asking again in the same session replaces the earlier answer instead of piling up. */
export async function recordMood(db: Db, profileId: string, sessionId: string, mood: Mood): Promise<void> {
  await db.query('delete from mood_checkins where profile_id = $1 and session_id = $2', [profileId, sessionId]);
  await db.query('insert into mood_checkins (profile_id, session_id, mood) values ($1,$2,$3)', [profileId, sessionId, mood]);
}

/**
 * What the app does with a mood (learning-diagnostics: Mood check-in). Tone is Tele's reply; difficulty
 * is where practice starts. "Not a fan" gets a light acknowledgement and an easy quick win.
 */
export function moodPlan(mood: Mood): { situations: ('nervous' | 'dislike' | 'quick_win')[]; quickWin: boolean; gentle: boolean } {
  switch (mood) {
    case 'not_a_fan': return { situations: ['dislike', 'quick_win'], quickWin: true, gentle: true };
    case 'nervous': return { situations: ['nervous'], quickWin: false, gentle: true };
    case 'tired': return { situations: ['quick_win'], quickWin: true, gentle: true };
    default: return { situations: [], quickWin: false, gentle: false };
  }
}
