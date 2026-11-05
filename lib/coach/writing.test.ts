import { describe, expect, it } from 'vitest';
import { SEED_COURSE } from '../course/seed';
import { levelsAvailable, modelAnswersFor, easeScore } from './model-answers';
import { assessAnswer, survivesOneSwap } from './rubric';
import { applySwap, insertGlue, slotsFor } from './swaps';
import { allConfirmed, levelFromStored, levelToStored, startingAnswer, suggestTouch, viewAnswer, viewWholeTest } from './writing';

const course = SEED_COURSE;
const cal = course.calibration;

describe('model answers are the main path (task 7.3)', () => {
  it('every seeded model answer lands on the level it is filed under and survives one swap', () => {
    for (const a of course.modelAnswers) {
      const r = assessAnswer(cal, a.text);
      expect(r.level, `Q${a.questionPosition} ${a.level}: ${a.text}`).toBe(a.level);
      if (a.level !== 'rock_solid') expect(survivesOneSwap(cal, r), `Q${a.questionPosition} ${a.level} needs a spare extra`).toBe(true);
    }
  });

  it('every question has a Rock solid answer, and missing levels are reported rather than invented', () => {
    for (const q of course.questions) expect(levelsAvailable(course.modelAnswers, q.position)).toContain('rock_solid');
    expect(levelsAvailable(course.modelAnswers, 2)).not.toContain('showing_off');
  });

  it('offers the nearest level to the target first, easier on a tie', () => {
    const order = modelAnswersFor(course.modelAnswers, 1, 'stepping_out').map((a) => a.level);
    expect(order[0]).toBe('stepping_out');
    expect(order[1]).toBe('rock_solid');
    expect(modelAnswersFor(course.modelAnswers, 2, 'showing_off')[0].level).toBe('stepping_out');
  });

  it('puts the easiest route first within a level: cognates, recycled chunks, short words', () => {
    const easy = 'Me gusta la música porque es divertido.';
    const hard = 'Prefiero jugar a los videojuegos porque es extraordinariamente complicado.';
    const chunks = [{ spanish: 'Me gusta', english: '', category: 'x', featureTags: [], recycled: true }];
    const c = { cognates: ['musica', 'divertido'] };
    expect(easeScore(easy, chunks, c)).toBeGreaterThan(easeScore(hard, chunks, c));
    const answers = [
      { questionPosition: 1, level: 'rock_solid' as const, text: hard },
      { questionPosition: 1, level: 'rock_solid' as const, text: easy },
    ];
    expect(modelAnswersFor(answers, 1, 'rock_solid', { chunks, cal: c })[0].text).toBe(easy);
  });

  it('starts from the target, and says plainly when its level is missing', () => {
    expect(startingAnswer(course, 1, 'showing_off')).toMatchObject({ exact: true });
    const miss = startingAnswer(course, 3, 'showing_off');
    expect(miss.exact).toBe(false);
    expect(miss.available).toEqual(['rock_solid', 'stepping_out']);
  });
});

describe('swaps and glue words (task 7.3)', () => {
  const start = 'Me gusta montar en bici porque es divertido.';

  it('lists the chunks in an answer with options of the same kind', () => {
    const slots = slotsFor(start, course.chunks);
    expect(slots.map((s) => s.current.spanish)).toEqual(['Me gusta', 'montar en bici', 'porque es', 'divertido']);
    expect(slots[1].options.every((o) => o.category === slots[1].current.category)).toBe(true);
  });

  it('swaps a chunk, keeps capitals where a sentence begins, and the rubric re-counts with no model', () => {
    const slots = slotsFor(start, course.chunks);
    const swapped = applySwap(start, slots[1], 'escuchar música');
    expect(swapped).toBe('Me gusta escuchar música porque es divertido.');
    expect(applySwap(start, slots[0], 'Prefiero las películas de')).toMatch(/^Prefiero/);
    expect(assessAnswer(cal, swapped).level).toBe('rock_solid');
  });

  it('accepts glue words and does not count them as features', () => {
    const slots = slotsFor(start, course.chunks);
    const glued = insertGlue(start, slots[3], 'pero');
    expect(glued).toBe('Me gusta montar en bici porque es divertido pero.');
    expect(assessAnswer(cal, glued).extras).toBe(assessAnswer(cal, start).extras);
    expect(viewAnswer(course, 'Me gusta montar en bici porque es divertido y escuchar música', 'rock_solid').outOfBank).toEqual([]);
  });

  it('flags a word outside the bank, blocks confirmation, and counts it for nothing', () => {
    const v = viewAnswer(course, 'Me gusta montar en bici porque es fantástico.', 'rock_solid');
    expect(v.outOfBank).toEqual(['fantastico']);
    expect(v.canConfirm).toBe(false);
  });
});

describe('the writing stage rules (task 7.4)', () => {
  it('suggests at most one optional touch, and none once the target is reached', () => {
    const a = assessAnswer(cal, 'Me gusta montar en bici porque es divertido.');
    const s = suggestTouch(course, a, 'stepping_out');
    expect(s?.text).toMatch(/if you like/);
    expect(suggestTouch(course, a, 'rock_solid')).toBeNull();
    expect(suggestTouch(course, assessAnswer(cal, 'Me gusta.'), 'rock_solid')?.featureId).toBe('frame');
  });

  it('prefers hard features when the target is Showing off', () => {
    const a = assessAnswer(cal, 'Me gusta montar en bici porque es divertido.');
    const f = cal.features.find((x) => x.id === suggestTouch(course, a, 'showing_off')!.featureId)!;
    expect(f.hard).toBe(true);
  });

  it('shows the Showing off load note and keeps confirmation open', () => {
    const v = viewAnswer(course, course.modelAnswers.find((a) => a.level === 'showing_off')!.text, 'showing_off');
    expect(v.loadNote).toBe(true);
    expect(v.canConfirm).toBe(true);
  });

  it('does not treat Rock solid as lesser: reaching the chosen target gives no suggestion', () => {
    const v = viewAnswer(course, 'Me gusta montar en bici porque es divertido.', 'rock_solid');
    expect(v.suggestion).toBeNull();
    expect(v.loadNote).toBe(false);
  });

  it('gives a whole-test checklist and points at the shortest answer for a missing tense, gating nothing', () => {
    const answers = course.questions.map((q) => ({ questionPosition: q.position, text: course.modelAnswers.find((a) => a.questionPosition === q.position && a.level === 'rock_solid')!.text }));
    const w = viewWholeTest(course, answers);
    expect(w.test.answers.every((a) => a.level === 'rock_solid')).toBe(true);
    if (!w.test.checklist.tenses.met) expect(w.tenseHint).not.toBeNull();
  });

  it('unlocks memorisation only when every answer is confirmed', () => {
    expect(allConfirmed([1, 2, 3, 4], course)).toBe(false);
    expect(allConfirmed([1, 2, 3, 4, 5], course)).toBe(true);
  });

  it('round-trips the stored level, with 0 meaning none yet', () => {
    expect(levelFromStored(levelToStored('stepping_out'))).toBe('stepping_out');
    expect(levelToStored(null)).toBe(0);
    expect(levelFromStored(0)).toBeNull();
  });
});
