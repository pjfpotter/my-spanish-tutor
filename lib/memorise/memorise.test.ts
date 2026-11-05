import { describe, expect, it } from 'vitest';
import { scoreAttempt } from '../speech/score';
import { DEFAULT_MEMORISE, foldFade, MAX_LEVEL, nextFade, promptWords, START_FADE, wordsKept, countsTowardMastery } from './fade';
import { feedbackFor, strongestRun } from './feedback';
import { drillStep, sentenceResults, splitSentences, stuckSentence } from './sentences';

const SCRIPT = 'Me gustan las películas de acción porque son divertidas. Los fines de semana veo la tele con mi hermano.';

describe('scaffold fading (task 8.2)', () => {
  it('starts with the whole script', () => {
    expect(START_FADE.level).toBe(0);
    expect(promptWords(SCRIPT, 0).every((w) => w.shown)).toBe(true);
  });

  it('gives less after two good attempts in a row, and not after one', () => {
    const one = nextFade(START_FADE, 90);
    expect(one.level).toBe(0);
    expect(nextFade(one, 85).level).toBe(1);
  });

  it('a middling attempt ends the streak but loses nothing', () => {
    const s = nextFade(START_FADE, 90);
    const after = nextFade(s, 60);
    expect(after).toEqual({ level: 0, good: 0, hard: 0 });
    expect(nextFade(after, 90).level).toBe(0); // the streak has to be rebuilt
  });

  it('gives a little help back only after three hard attempts in a row', () => {
    let s = foldFade([90, 90, 90, 90]); // level 2
    expect(s.level).toBe(2);
    s = foldFade([90, 90, 90, 90, 10, 20]);
    expect(s.level).toBe(2);
    s = foldFade([90, 90, 90, 90, 10, 20, 30]);
    expect(s.level).toBe(1);
  });

  it('never goes below the whole script or above English only', () => {
    expect(foldFade([0, 0, 0, 0, 0, 0, 0]).level).toBe(0);
    expect(foldFade(Array(40).fill(100)).level).toBe(MAX_LEVEL);
  });

  it('follows a configured threshold', () => {
    const strict = { ...DEFAULT_MEMORISE, threshold: 95 };
    expect(foldFade([90, 90, 90], strict).level).toBe(0);
    expect(foldFade([96, 96], strict).level).toBe(1);
  });

  it('dims words from the end and only ever dims more at a higher level', () => {
    const n = SCRIPT.split(' ').length;
    let previous = n + 1;
    for (let level = 0; level <= MAX_LEVEL; level++) {
      const shown = promptWords(SCRIPT, level).filter((w) => w.shown).length;
      expect(shown).toBeLessThanOrEqual(previous);
      previous = shown;
    }
    expect(promptWords(SCRIPT, 3).filter((w) => w.shown).map((w) => w.word)).toEqual(['Me', 'gustan']);
    expect(promptWords(SCRIPT, 4).some((w) => w.shown)).toBe(false);
    // Shown words are always a prefix, so what the student sees is the start of the answer.
    const flags = promptWords(SCRIPT, 2).map((w) => w.shown);
    expect(flags).toEqual([...flags].sort((a, b) => Number(b) - Number(a)));
  });

  it('handles a one-word script', () => {
    expect(wordsKept(1, 3)).toBe(1);
    expect(wordsKept(1, 4)).toBe(0);
  });

  it('counts an attempt toward mastery only once the whole script is no longer shown', () => {
    expect(countsTowardMastery(0)).toBe(false);
    expect(countsTowardMastery(1)).toBe(true);
  });
});

describe('sentences and the stuck-sentence drill (task 8.2)', () => {
  it('splits an answer into sentences', () => {
    expect(splitSentences(SCRIPT)).toHaveLength(2);
    expect(splitSentences('¿Qué tal? Muy bien.')).toEqual(['¿Qué tal?', 'Muy bien.']);
  });

  it('scores each sentence from the word-level score', () => {
    const score = scoreAttempt(SCRIPT, 'Me gustan las películas de acción porque son divertidas. Los fines de semana veo la tele');
    const [a, b] = sentenceResults(SCRIPT, score);
    expect(a.accuracy).toBe(100);
    expect(b.accuracy).toBe(70); // 7 of 10 words
  });

  it('isolates a sentence missed three times in a row, and the worst one', () => {
    expect(stuckSentence([[100, 20], [90, 40], [100, 30]], 80)).toBe(1);
    expect(stuckSentence([[10, 20], [10, 40], [10, 30]], 80)).toBe(0);
  });

  it('does not isolate after two misses, after a good attempt, or in a one-sentence answer', () => {
    expect(stuckSentence([[100, 20], [100, 30]], 80)).toBeNull();
    expect(stuckSentence([[100, 20], [100, 90], [100, 30]], 80)).toBeNull();
    expect(stuckSentence([[20], [30], [10]], 80)).toBeNull();
  });

  it('ends a drill after two good attempts in a row', () => {
    let d = { sentence: 1, good: 0 };
    let r = drillStep(d, 90, 80);
    expect(r.done).toBe(false);
    r = drillStep(r.state, 40, 80);
    expect(r.state.good).toBe(0);
    r = drillStep(r.state, 85, 80);
    r = drillStep(r.state, 85, 80);
    expect(r.done).toBe(true);
  });
});

describe('encouraging feedback (task 8.3)', () => {
  it('leads with the strongest run and names one thing to fix', () => {
    const score = scoreAttempt('Me gusta el cine porque es divertido', 'me gusta el cine porque es diver');
    const f = feedbackFor(score, 80);
    expect(f.strongest).toBe('Me gusta el cine porque es');
    expect(f.fix?.word).toBe('divertido');
  });

  it('names exactly one fix even when several words were missed', () => {
    const score = scoreAttempt('uno dos tres cuatro cinco', 'uno xx tres yy cinco');
    const f = feedbackFor(score, 80);
    expect(f.fix?.word).toBe('dos');
    expect(Object.keys(f).filter((k) => k === 'fix')).toHaveLength(1);
  });

  it('shows a confusion tip when the mismatch fits, and a plain pointer when it does not', () => {
    const tip = feedbackFor(scoreAttempt('me llamo Ana', 'mi llamo Ana'), 80).fix!;
    expect(tip.tip).toMatch(/may/);
    expect(tip.text).toBe(tip.tip);
    const plain = feedbackFor(scoreAttempt('perro grande', 'gato grande'), 80).fix!;
    expect(plain.tip).toBeNull();
    expect(plain.text).toContain('Tap it to hear it slowly');
  });

  it('has nothing to fix when every word matched', () => {
    const f = feedbackFor(scoreAttempt('hola Ana', 'hola ana'), 80);
    expect(f.fix).toBeNull();
    expect(f.headline).toBe('Word perfect.');
  });

  it('finds something to praise from a low score and never calls the student a failure', () => {
    const low = feedbackFor(scoreAttempt('uno dos tres cuatro cinco seis', 'uno dos'), 80);
    expect(low.strongest).toBe('uno dos');
    expect(low.fix?.word).toBe('tres');
    for (const text of [low.headline, low.fix!.text]) expect(text).not.toMatch(/fail|wrong|bad|incorrect/i);
  });

  it('has no praise to offer, and still no blame, when nothing matched', () => {
    const none = feedbackFor(scoreAttempt('uno dos', 'xx yy'), 80);
    expect(none.strongest).toBeNull();
    expect(none.headline).toBe('A start. A start counts.');
  });

  it('finds the longest run, earliest on a tie', () => {
    expect(strongestRun(scoreAttempt('a b c d e f', 'a b x d e x'))).toBe('a b');
  });
});

describe('syllable breakdown of missed words (task 5.4)', () => {
  // Five words a student could miss from the seed answers, with the stressed syllable in capitals.
  const samples: [string, string][] = [
    ['divertidas', 'di-ver-TI-das'],
    ['películas', 'pe-LÍ-cu-las'],
    ['hermano', 'her-MA-no'],
    ['acción', 'ac-CIÓN'],
    ['semana', 'se-MA-na'],
  ];
  it.each(samples)('splits %s as %s', async (word, shown) => {
    const { syllableDisplay } = await import('../spanish/syllables');
    expect(syllableDisplay(word)).toBe(shown);
  });
});
