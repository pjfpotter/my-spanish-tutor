import { describe, expect, it } from 'vitest';
import { FREE_TIME } from './calibration';
import { BASIC_TENSES, FANCY_TAGS, FEATURE_TAGS, validateCourse, type Course, type ModelAnswer } from './schema';

const good = (): Course => ({
  title: 'Free time',
  classCode: 'TEST42',
  testDate: '2026-11-20',
  chunks: [
    { spanish: 'me gusta', english: 'I like', category: 'opinion', featureTags: ['opinion', 'verb_phrase', 'present'], recycled: true },
  ],
  questions: [1, 2, 3, 4, 5].map((n) => ({
    position: n, spanish: `Pregunta ${n}`, english: `Question ${n}`, recycled: n === 5, topics: ['opinion'],
  })),
  calibration: structuredClone(FREE_TIME),
  modelAnswers: [1, 2, 3, 4, 5].flatMap((n): ModelAnswer[] => [
    { questionPosition: n, text: 'Me gusta.' },
    { questionPosition: n, text: 'Me gusta porque es.' },
  ]),
});

const problems = (c: unknown) => {
  const r = validateCourse(c);
  return r.ok ? [] : r.problems;
};

describe('validateCourse', () => {
  it('accepts a complete course', () => {
    expect(validateCourse(good()).ok).toBe(true);
  });

  it('rejects fewer than four or more than five core questions and lists them', () => {
    const few = good();
    few.questions.pop();
    few.questions.pop();
    const many = good();
    many.questions.push({ position: 6, spanish: 'x', english: 'y', recycled: false, topics: ['opinion'] });
    for (const c of [few, many]) expect(problems(c).join()).toMatch(/4 or 5 core questions/);
  });

  it('accepts four core questions', () => {
    const four = good();
    four.questions.pop();
    four.modelAnswers = four.modelAnswers.filter((a) => a.questionPosition <= 4);
    four.questions[3].recycled = true;
    expect(validateCourse(four).ok).toBe(true);
  });

  it('rejects a question without an English subtitle', () => {
    const c = good();
    c.questions[2].english = ' ';
    expect(problems(c)).toContain('question 3 is missing its English subtitle');
  });

  it('rejects a missing test date and an empty builder', () => {
    expect(problems({ ...good(), testDate: '', chunks: [] }).length).toBeGreaterThanOrEqual(2);
  });

  it('allows at most one recycled question', () => {
    const c = good();
    c.questions[0].recycled = true;
    expect(validateCourse(c).ok).toBe(false);
  });

  it('needs each question to say which chunk categories answer it, and those must exist', () => {
    const none = good();
    none.questions[0].topics = [];
    expect(problems(none).join()).toMatch(/question 1 lists no topics/);
    const unknown = good();
    unknown.questions[1].topics = ['nothing like this'];
    expect(problems(unknown).join()).toMatch(/no chunk has/);
  });

  it('rejects an unknown feature tag', () => {
    const c = good();
    c.chunks[0].featureTags = ['past' as never];
    expect(problems(c).join()).toMatch(/unknown feature tag "past"/);
  });
});

describe('model answers', () => {
  it('does not need a model answer for every question: the starter is optional', () => {
    const none = good();
    none.modelAnswers = none.modelAnswers.filter((a) => a.questionPosition !== 2);
    expect(validateCourse(none).ok).toBe(true);
    const empty = good();
    empty.modelAnswers = [];
    expect(validateCourse(empty).ok).toBe(true);
  });

  it('rejects an answer for a missing question, or with no text', () => {
    const c = good();
    c.modelAnswers.push({ questionPosition: 9, text: 'x' });
    c.modelAnswers.push({ questionPosition: 1, text: '  ' });
    const p = problems(c).join();
    expect(p).toMatch(/question 9, which does not exist/);
    expect(p).toMatch(/no text/);
  });
});

describe('calibration data', () => {
  const withCal = (edit: (c: Course['calibration']) => void) => {
    const c = good();
    edit(c.calibration);
    return problems(c).join();
  };

  it('has the four basic tenses, and any other tense is fancy', () => {
    expect([...BASIC_TENSES]).toEqual(['present', 'preterite', 'near_future', 'conditional']);
    expect(FANCY_TAGS).toContain('other_tense');
    for (const t of [...BASIC_TENSES, ...FANCY_TAGS]) expect(FEATURE_TAGS).toContain(t);
  });

  it('needs a frame value, a load-note value and a weight of 0, 1 or 2 on every feature', () => {
    expect(withCal((c) => (c.frame.value = 0))).toMatch(/frame needs a value/);
    expect(withCal((c) => (c.loadNoteValue = 0))).toMatch(/loadNoteValue/);
    expect(withCal((c) => (c.features[0].weight = 5 as never))).toMatch(/needs a weight of 0, 1 or 2/);
  });

  it('cannot demand more tenses than exist', () => {
    expect(withCal((c) => (c.wholeTest.tenses = 5))).toMatch(/from 1 to 4/);
  });

  it('rejects a feature with no phrases, duplicate ids, and a missing calibration', () => {
    expect(withCal((c) => (c.features[0].phrases = []))).toMatch(/needs an id, a label and phrases/);
    expect(withCal((c) => (c.features[1].id = c.features[0].id))).toMatch(/ids must be unique/);
    expect(problems({ ...good(), calibration: undefined }).join()).toMatch(/calibration/);
  });

  it('refuses grades or marks anywhere', () => {
    for (const word of ['grade', 'WTG', 'mark', 'score']) {
      expect(withCal((c) => (c.features[0].label = `Worth a ${word}`)), word).toMatch(/must not contain grades or marks/);
    }
  });

  it('rejects unknown input without throwing', () => {
    expect(validateCourse(null).ok).toBe(false);
  });
});
