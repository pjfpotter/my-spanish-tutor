import { describe, expect, it } from 'vitest';
import { SEED_COURSE } from '../course/seed';
import { assessAnswer } from './rubric';
import { canStandIn, isStalled, simplerVersion, STALL } from './simplify';
import { viewAnswer } from './writing';

const course = SEED_COURSE;
const cal = course.calibration;

describe('when an answer counts as stalled', () => {
  it('needs enough attempts, all the recent ones short of the bar, and no mastery', () => {
    const bad = Array(STALL.minAttempts).fill(40);
    expect(isStalled(bad, false)).toBe(true);
    expect(isStalled(bad.slice(1), false)).toBe(false); // too few attempts to say
    expect(isStalled(bad, true)).toBe(false); // mastered
    expect(isStalled([...bad, 95], false)).toBe(false); // a recent good go means it is moving
  });

  it('is not stalled by early misses followed by a run of good attempts', () => {
    expect(isStalled([10, 10, 10, 90, 90, 90, 90, 90], false)).toBe(false);
  });
});

describe('a simpler version of an answer', () => {
  const long = course.modelAnswers.filter((a) => a.questionPosition === 5).map((a) => a.text).sort((a, b) => b.length - a.length)[0];

  it('takes out the hardest extras first and keeps the justified opinion', () => {
    const s = simplerVersion(course, long);
    expect(s).not.toBeNull();
    expect(s!.removed.length + s!.swapped.length).toBeGreaterThan(0);
    expect(assessAnswer(cal, s!.text).justifiedOpinions).toBeGreaterThanOrEqual(1);
    expect(assessAnswer(cal, s!.text).value).toBeLessThan(assessAnswer(cal, long).value);
  });

  it('only offers words from the sentence builder, so it can be confirmed at once', () => {
    const s = simplerVersion(course, long)!;
    expect(viewAnswer(course, s.text).canConfirm).toBe(true);
  });

  it('prefers easier chunks of the same kind: cognates and recurring chunks first', () => {
    const hard = 'Me encantan las películas de dibujos animados porque son divertidas.';
    const s = simplerVersion(course, hard);
    if (s) for (const w of s.swapped) expect(w.from).not.toBe(w.to);
  });

  it('never swaps in a chunk that breaks the grammar, such as a plural adjective after "porque es"', () => {
    const s = simplerVersion(course, 'Me gusta montar en bici porque es divertido.');
    expect(s?.text ?? '').not.toMatch(/es divertidas|gusta escucho|gusta juego/);
    const chunk = (spanish: string) => course.chunks.find((c) => c.spanish === spanish)!;
    expect(canStandIn(chunk('divertido'), chunk('divertidas'))).toBe(false);
    expect(canStandIn(chunk('montar en bici'), chunk('escucho música'))).toBe(false);
    expect(canStandIn(chunk('montar en bici'), chunk('escuchar música'))).toBe(true);
  });

  it('says nothing for an empty answer, and settles after a few simplifications', () => {
    expect(simplerVersion(course, '')).toBeNull();
    let text = long;
    for (let i = 0; i < 6 && text; i++) text = simplerVersion(course, text)?.text ?? '';
    expect(text).toBe('');
  });
});
