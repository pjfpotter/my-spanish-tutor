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
    { questionPosition: n, level: 'rock_solid', text: 'Me gusta.' },
    { questionPosition: n, level: 'stepping_out', text: 'Me gusta porque es.' },
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

  it('rejects fewer or more than five questions and lists them', () => {
    const few = good();
    few.questions.pop();
    const many = good();
    many.questions.push({ position: 6, spanish: 'x', english: 'y', recycled: false, topics: ['opinion'] });
    for (const c of [few, many]) expect(problems(c).join()).toMatch(/exactly 5 questions/);
  });

  it('rejects a question without an English subtitle', () => {
    const c = good();
    c.questions[2].english = ' ';
    expect(problems(c)).toContain('question 3 is missing its English subtitle');
  });

  it('rejects a missing test date and an empty builder', () => {
    expect(problems({ ...good(), testDate: '', chunks: [] }).length).toBeGreaterThanOrEqual(2);
  });

  it('needs exactly one recycled question', () => {
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
  it('needs a Rock solid answer for every question, and lets other levels be missing', () => {
    const noStart = good();
    noStart.modelAnswers = noStart.modelAnswers.map((a) => (a.questionPosition === 2 ? { ...a, level: 'showing_off' as const } : a));
    expect(problems(noStart).join()).toMatch(/question 2 needs a Rock solid model answer/);
    const onlyRock = good();
    onlyRock.modelAnswers = onlyRock.modelAnswers.filter((a) => a.level === 'rock_solid');
    expect(validateCourse(onlyRock).ok).toBe(true);
  });

  it('rejects an answer for a missing question, an unknown level, or no text', () => {
    const c = good();
    c.modelAnswers.push({ questionPosition: 9, level: 'rock_solid', text: 'x' });
    c.modelAnswers.push({ questionPosition: 1, level: 'grade 3' as never, text: 'x' });
    c.modelAnswers.push({ questionPosition: 1, level: 'showing_off', text: '  ' });
    const p = problems(c).join();
    expect(p).toMatch(/question 9, which does not exist/);
    expect(p).toMatch(/unknown level "grade 3"/);
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

  it('needs showing off to ask for more than stepping out', () => {
    expect(withCal((c) => (c.thresholds.showingOff.extras = 1))).toMatch(/more extras than stepping out/);
  });

  it('cannot demand more hard features, or more tenses, than exist', () => {
    expect(withCal((c) => (c.thresholds.showingOff.hard = 9))).toMatch(/fewer hard features/);
    expect(withCal((c) => (c.wholeTest.tenses = 5))).toMatch(/from 1 to 4/);
  });

  it('rejects a feature with no phrases, duplicate ids, and a missing calibration', () => {
    expect(withCal((c) => (c.features[0].phrases = []))).toMatch(/needs an id, a label and phrases/);
    expect(withCal((c) => (c.features[1].id = c.features[0].id))).toMatch(/ids must be unique/);
    expect(problems({ ...good(), calibration: undefined }).join()).toMatch(/calibration/);
  });

  it('names the three levels and refuses grades or marks anywhere', () => {
    expect(withCal((c) => (c.levels.showing_off.name = ' '))).toMatch(/needs a name and a blurb/);
    for (const word of ['grade', 'WTG', 'mark', 'score']) {
      expect(withCal((c) => (c.levels.rock_solid.blurb = `Worth a ${word}`)), word).toMatch(/must not contain grades or marks/);
    }
  });

  it('rejects unknown input without throwing', () => {
    expect(validateCourse(null).ok).toBe(false);
  });
});
