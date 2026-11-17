import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { assessAnswer } from '../coach/rubric';
import { FREE_TIME as FREE_TIME_CALIBRATION } from '../course/calibration';
import { ALL_MATCHED_COURSE } from '../course/seed';
import { seedCourse } from '../course/seed-db';
import type { Course } from '../course/schema';
import { newTestDb } from '../db/test-db';
import { practiceAnswerText } from '../memorise/practice-text';
import { createProfile, nicknameOptions } from '../profile/profile';
import { buildBuilder } from '../sheets/builder';
import { prepare } from '../sheets/engine';
import { FOOD, FOOD_SHEET } from '../sheets/samples/food';
import { toSelection } from '../sheets/selection';
import { builderFor, calibrationFor, loadWritingCourse, NO_SHEET_FOR_QUESTION, saveSheetAnswer, type WritingCourse } from './writing-store';

// A course with two builders (course-builder-per-question): questions 1 and 2 share the free-time builder, one linked by its
// text (to the builder's question 1) and one by an explicit link (to its question 0), question 3 uses the food builder, and questions 4 and 5 have none.
const food = { key: 'food', name: 'Food', sheet: FOOD_SHEET, interpretation: FOOD, calibration: {
  ...structuredClone(FREE_TIME_CALIBRATION),
  frame: { ...FREE_TIME_CALIBRATION.frame, starters: ['como', 'quiero'] },
  features: [{ id: 'F1', label: 'a time phrase', weight: 0 as const, phrases: ['por la mañana'] }],
} };
const [free] = ALL_MATCHED_COURSE.builders;
const course: Course = {
  ...ALL_MATCHED_COURSE, classCode: 'TWOB1', builders: [free, food], unlockAll: true,
  // Listed with the longer one first: only the food calibration knows the time phrase makes it worth more.
  modelAnswers: [...ALL_MATCHED_COURSE.modelAnswers.filter((a) => a.questionPosition !== 3), { questionPosition: 3, text: 'Como pan por la mañana' }, { questionPosition: 3, text: 'Como pan' }],
  questions: ALL_MATCHED_COURSE.questions.map((q) => {
    if (q.position === 1) return { ...q, builder: 'free-time' };
    if (q.position === 2) return { ...q, spanish: '¿Qué te gusta hacer?', english: 'What do you like to do?', builder: 'free-time', builderQuestion: 0 };
    if (q.position === 3) return { ...q, spanish: '¿Qué comes?', english: 'What do you eat?', builder: 'food' };
    return { ...q, builder: undefined };
  }),
};

let db: Awaited<ReturnType<typeof newTestDb>>;
let c: WritingCourse;
let profileId: string, courseId: string;
beforeAll(async () => {
  db = await newTestDb();
  ({ courseId } = await seedCourse(db, course));
  c = await loadWritingCourse(db, courseId);
  const p = await createProfile(db, { courseId, nickname: nicknameOptions(1)[0], interests: [] });
  if (!p.ok) throw new Error('profile');
  profileId = p.profile.id;
});
afterAll(() => db.close());

const q = (n: number) => c.questions.find((x) => x.position === n)!;
const foodB = prepare(buildBuilder('food', FOOD_SHEET, FOOD));
const foodAnswer = toSelection({ verb: foodB.cols.verb.items[0], food: foodB.cols.food.items[0], when: foodB.cols.when.items[0] });

describe('a course with several sentence builders', () => {
  it('holds both builders and gives each question its own, or none', () => {
    expect(c.builders.map((b) => b.name)).toEqual(['Free time', 'Food']);
    expect(c.questions.map((x) => c.builders.find((b) => b.id === x.builderId)?.name ?? null)).toEqual(['Free time', 'Free time', 'Food', null, null]);
  });

  it('lets two questions share one builder, each linked to its own part', () => {
    expect(q(1).builderId).toBe(q(2).builderId);
    // Question 1 is linked by its text to the builder's question 1; question 2 by an explicit link to question 0.
    expect(q(1).builderQuestion).toBe(1);
    expect(q(2).builderQuestion).toBe(0);
    expect(builderFor(c, q(1))).toBe(builderFor(c, q(2)));
    expect(builderFor(c, q(3))).not.toBe(builderFor(c, q(1)));
    expect(builderFor(c, q(4))).toBeNull();
  });

  it('answers a question on its own builder', async () => {
    expect(await saveSheetAnswer(db, c, profileId, q(3).id, foodAnswer, true)).toMatchObject({ ok: true, confirmed: true });
  });

  it('refuses a chunk of another builder, and a question with no builder', async () => {
    // The food answer sent for a free-time question names parts the free-time builder does not have.
    expect(await saveSheetAnswer(db, c, profileId, q(1).id, foodAnswer, false)).toEqual({ ok: false, error: 'That answer is not from your sentence builder.' });
    expect(await saveSheetAnswer(db, c, profileId, q(4).id, foodAnswer, false)).toEqual({ ok: false, error: NO_SHEET_FOR_QUESTION });
  });

  it('scores an answer with its builder\'s calibration, and a question with no builder with the course\'s', async () => {
    expect(calibrationFor(c, q(3))).toBe(c.builders[1].calibration);
    expect(calibrationFor(c, q(1))).toBe(c.builders[0].calibration);
    expect(calibrationFor(c, q(4))).toBe(c.calibration);
    const r = await saveSheetAnswer(db, c, profileId, q(3).id, foodAnswer, true);
    const text = 'Como pan por la mañana';
    expect(r.ok && r.value).toBeGreaterThan(0);
    // The same words are worth nothing against the course's own calibration, which lists other phrases.
    expect(assessAnswer(c.calibration, text).value).toBe(0);
    expect(assessAnswer(food.calibration, text).value).toBeGreaterThan(0);
  });

  it('practises the simplest model answer by the question\'s own builder\'s calibration', async () => {
    const p = await createProfile(db, { courseId, nickname: nicknameOptions(2)[1], interests: [] });
    if (!p.ok) throw new Error('profile');
    // Against the food calibration the time phrase is worth something, so the plain one is simplest. Against the course's it would be the first listed.
    expect(await practiceAnswerText(db, p.profile.id, courseId, q(3).id)).toBe('Como pan');
  });
});
