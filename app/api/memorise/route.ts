import { getDb } from '../../../lib/db';
import { saveLesson } from '../../../lib/memorise/ladder-store';
import { currentProfile } from '../../../lib/server/session';

/**
 * Saves where a student is on the memorise ladder, records the whole-answer attempts made in a lesson, and pays the
 * euros earned. Numbers only: no audio and no transcript reach this route.
 */
export async function POST(req: Request) {
  const profile = await currentProfile();
  if (!profile) return Response.json({ error: 'Not signed in.' }, { status: 401 });
  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const num = (v: unknown) => typeof v === 'number' && Number.isFinite(v);
  const answers = Array.isArray(b?.answers) ? (b.answers as Record<string, unknown>[]) : null;
  const recalls = Array.isArray(b?.recalls) ? (b.recalls as Record<string, unknown>[]) : null;
  if (!b || !answers || !recalls || !num(b.earned) || answers.length > 20 || recalls.length > 100) return Response.json({ error: 'Bad lesson.' }, { status: 400 });
  const okAnswers = answers.every((a) => typeof a.itemId === 'string' && num(a.stage) && num(a.top) && num(a.wipeDay) && Array.isArray(a.recalls) && a.recalls.every(num));
  const okRecalls = recalls.every((r) => typeof r.itemId === 'string' && num(r.accuracy) && num(r.level));
  if (!okAnswers || !okRecalls) return Response.json({ error: 'Bad lesson.' }, { status: 400 });
  const result = await saveLesson(await getDb(), {
    profileId: profile.id, courseId: profile.courseId, earned: b.earned as number,
    answers: answers.map((a) => ({ itemId: a.itemId as string, stage: a.stage as number, top: a.top as number, wipeDay: a.wipeDay as number, recalls: (a.recalls as number[]).slice(-20) })),
    recalls: recalls.map((r) => ({
      itemId: r.itemId as string, accuracy: r.accuracy as number, level: r.level as number,
      missedWords: Array.isArray(r.missedWords) ? (r.missedWords as unknown[]).filter((n): n is number => typeof n === 'number').slice(0, 500) : [],
    })),
  });
  return result.ok ? Response.json(result, { headers: { 'Cache-Control': 'no-store' } }) : Response.json({ error: result.error }, { status: 400 });
}
