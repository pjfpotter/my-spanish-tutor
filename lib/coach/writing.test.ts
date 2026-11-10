import { describe, expect, it } from 'vitest';
import { SEED_COURSE } from '../course/seed';
import { easeScore, modelAnswersFor, simplestModelAnswer } from './model-answers';
import { assessAnswer } from './rubric';
import { applySwap, insertGlue, slotsFor } from './swaps';
import { allConfirmed, startingAnswer, suggestTouch, viewAnswer, viewWholeTest } from './writing';

const course = SEED_COURSE;
const cal = course.calibration;

describe('model answers are the main path (task 7.3)', () => {
  it('every seeded model answer is valid and worth something', () => {
    for (const a of course.modelAnswers) {
      const r = assessAnswer(cal, a.text);
      expect(r.justifiedOpinions, `Q${a.questionPosition}: ${a.text}`).toBeGreaterThanOrEqual(1);
      expect(viewAnswer(course, a.text).canConfirm, `Q${a.questionPosition}: ${a.text}`).toBe(true);
    }
  });

  it('every question has a starter, and the simplest comes first', () => {
    for (const q of course.questions) {
      const ordered = modelAnswersFor(course.modelAnswers, q.position, { chunks: course.chunks, cal });
      expect(ordered.length).toBeGreaterThan(0);
      const values = ordered.map((a) => assessAnswer(cal, a.text).value);
      expect(values).toEqual([...values].sort((x, y) => x - y));
      expect(simplestModelAnswer(course.modelAnswers, q.position, cal)).toEqual(ordered.find((a) => assessAnswer(cal, a.text).value === values[0]));
    }
  });

  it('puts the easiest route first among answers of equal value: cognates, recycled chunks, short words', () => {
    const easy = 'Me gusta la música porque es divertido.';
    const hard = 'Me gusta jugar a los videojuegos porque es extraordinariamente complicado.';
    const chunks = [{ spanish: 'Me gusta', english: '', category: 'x', featureTags: [], recycled: true }];
    const c = { ...cal, cognates: ['musica', 'divertido'] };
    expect(easeScore(easy, chunks, c)).toBeGreaterThan(easeScore(hard, chunks, c));
    const answers = [
      { questionPosition: 1, text: hard },
      { questionPosition: 1, text: easy },
    ];
    expect(modelAnswersFor(answers, 1, { chunks, cal: c })[0].text).toBe(easy);
  });

  it('offers the simplest model answer as the optional starter, and says so plainly when there is none', () => {
    expect(startingAnswer(course, 1)).toEqual(simplestModelAnswer(course.modelAnswers, 1, cal));
    expect(startingAnswer({ ...course, modelAnswers: [] }, 1)).toBeNull();
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
    expect(assessAnswer(cal, swapped).value).toBe(cal.frame.value);
  });

  it('accepts glue words and does not count them as features', () => {
    const slots = slotsFor(start, course.chunks);
    const glued = insertGlue(start, slots[3], 'pero');
    expect(glued).toBe('Me gusta montar en bici porque es divertido pero.');
    expect(assessAnswer(cal, glued).value).toBe(assessAnswer(cal, start).value);
    expect(viewAnswer(course, 'Me gusta montar en bici porque es divertido y escuchar música').outOfBank).toEqual([]);
  });

  it('flags a word outside the bank, blocks confirmation, and counts it for nothing', () => {
    const v = viewAnswer(course, 'Me gusta montar en bici porque es fantástico.');
    expect(v.outOfBank).toEqual(['fantastico']);
    expect(v.canConfirm).toBe(false);
  });
});

describe('the writing stage rules (task 7.4)', () => {
  it('suggests at most one optional extra, only once an answer works', () => {
    const working = assessAnswer(cal, 'Me gusta montar en bici porque es divertido.');
    const s = suggestTouch(course, working);
    expect(s?.text).toMatch(/if you like/);
    expect(working.features.map((f) => f.id)).not.toContain(s!.featureId);
    expect(suggestTouch(course, assessAnswer(cal, 'Me gusta.'))).toBeNull();
    expect(suggestTouch(course, assessAnswer(cal, ''))).toBeNull();
  });

  it('chooses the cheapest unused feature, so the nudge sits just outside the comfort zone', () => {
    const working = assessAnswer(cal, 'Me gusta montar en bici porque es divertido.');
    const s = suggestTouch({ ...course, chunks: course.chunks.map((c) => ({ ...c, recycled: false })) }, working)!;
    const pick = cal.features.find((x) => x.id === s.featureId)!;
    const cheapest = Math.min(...cal.features.map((f) => 1 + f.weight));
    expect(1 + pick.weight).toBe(cheapest);
  });

  it('shows the load note once the value passes the course\'s load-note value, and keeps confirmation open', () => {
    const rich = course.modelAnswers.map((a) => a.text).join(' ');
    const v = viewAnswer(course, rich);
    expect(v.assessment.value).toBeGreaterThan(cal.loadNoteValue);
    expect(v.loadNote).toBe(true);
    const plain = viewAnswer(course, 'Me gusta montar en bici porque es divertido.');
    expect(plain.loadNote).toBe(false);
    expect(plain.canConfirm).toBe(true);
  });

  it('gives a whole-test checklist and points at the shortest answer for a missing tense, gating nothing', () => {
    const answers = course.questions.map((q) => ({ questionPosition: q.position, text: simplestModelAnswer(course.modelAnswers, q.position, cal)!.text }));
    const w = viewWholeTest(course, answers);
    expect(w.test.answers.every((a) => a.value > 0)).toBe(true);
    if (!w.test.checklist.tenses.met) expect(w.tenseHint).not.toBeNull();
  });

  it('unlocks memorisation only when every answer is confirmed', () => {
    expect(allConfirmed([1, 2, 3, 4], course)).toBe(false);
    expect(allConfirmed([1, 2, 3, 4, 5], course)).toBe(true);
  });
});
