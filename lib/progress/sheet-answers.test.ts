import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { seedCourse } from '../course/seed-db';
import { ALL_MATCHED_COURSE as SEED_COURSE } from '../course/seed';
import { newTestDb } from '../db/test-db';
import { createProfile, nicknameOptions } from '../profile/profile';
import { buildBuilder } from '../sheets/builder';
import { prepare } from '../sheets/engine';
import { toSelection } from '../sheets/selection';
import { FREE_TIME, FREE_TIME_SHEET } from '../sheets/samples/free-time';
import { builderFor, loadSavedAnswers, loadWritingCourse, saveSheetAnswer } from './writing-store';

let db: Awaited<ReturnType<typeof newTestDb>>;
let courseId: string, profileId: string, qids: string[];
beforeAll(async () => {
  db = await newTestDb();
  ({ courseId } = await seedCourse(db, SEED_COURSE));
  qids = (await loadWritingCourse(db, courseId)).questions.map((q) => q.id);
  const p = await createProfile(db, { courseId, nickname: nicknameOptions(1)[0], interests: [] });
  if (!p.ok) throw new Error('profile');
  profileId = p.profile.id;
});
afterAll(() => db.close());

const B = prepare(buildBuilder('free', FREE_TIME_SHEET, FREE_TIME));
const item = (slot: string, es: string) => B.cols[B.slotMap[slot].cols.find((c) => B.cols[c].items.some((i) => i.es.includes(es)))!].items.find((i) => i.es.includes(es))!;

describe('sentence-builder answers', () => {
  it('a course always carries its sheet, so there is a builder to write on', async () => {
    const c = await loadWritingCourse(db, courseId);
    expect(c.sheet).not.toBeNull();
    expect(builderFor(c)).not.toBeNull();
    expect((await saveSheetAnswer(db, c, profileId, qids[0], {}, false)).ok).toBe(true);
  });

  it('saves a half-built answer without confirming it', async () => {
    const c = await loadWritingCourse(db, courseId);
    const sel = toSelection({ starter: item('starter', 'Me encanta') });
    expect(await saveSheetAnswer(db, c, profileId, qids[0], sel, false)).toMatchObject({ ok: true, confirmed: false });
    expect((await saveSheetAnswer(db, c, profileId, qids[0], sel, true)).ok).toBe(false);
    const saved = await loadSavedAnswers(db, profileId);
    expect(saved[0]).toMatchObject({ confirmed: false, selection: sel });
  });

  it('confirms a finished sentence, stores the Spanish text, and rebuilds from choices only', async () => {
    const c = await loadWritingCourse(db, courseId);
    const sel = toSelection({
      starter: item('starter', 'Me encanta'), activity: item('activity', 'baloncesto'), connector: item('connector', 'dado que'), reason: item('reason', 'es divertido'),
    });
    const r = await saveSheetAnswer(db, c, profileId, qids[0], sel, true);
    expect(r).toMatchObject({ ok: true, confirmed: true });
    const saved = (await loadSavedAnswers(db, profileId)).find((s) => s.questionId === qids[0])!;
    expect(saved.confirmed).toBe(true);
    expect(saved.text).toMatch(/^Me encanta jugar al baloncesto dado que es divertido/);
  });

  it('refuses choices that are not on the sheet', async () => {
    const c = await loadWritingCourse(db, courseId);
    expect((await saveSheetAnswer(db, c, profileId, qids[1], { starter: { col: 'zzz', i: 1 } }, false)).ok).toBe(false);
    expect((await saveSheetAnswer(db, c, profileId, 'not-a-question', {}, false)).ok).toBe(false);
  });

  it('changing a confirmed answer reopens it', async () => {
    const c = await loadWritingCourse(db, courseId);
    await saveSheetAnswer(db, c, profileId, qids[0], toSelection({ starter: item('starter', 'Me encanta') }), false);
    expect((await loadSavedAnswers(db, profileId)).find((s) => s.questionId === qids[0])!.confirmed).toBe(false);
  });
});
