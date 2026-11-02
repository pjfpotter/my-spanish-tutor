import { describe, expect, it } from 'vitest';
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
  markScheme: {
    survival: { verbPhrases: 1 },
    opinion: { justifiedOpinions: 1 },
    detail: { verbPhrases: 3, sequencers: 1, rangePoints: 3 },
    range: { basicTensesAcrossTest: 3 },
    showing_off: { fancyFeatures: 1 },
    rangeWeights: { adjective: 1, adjective_phrase: 2, adverb: 1, adverb_phrase: 2 },
    justifiedOpinionsTarget: 5,
  },
  modelAnswers: [1, 2, 3, 4, 5].flatMap((n): ModelAnswer[] => [
    { questionPosition: n, rung: 'survival', text: 'Me gusta.' },
    { questionPosition: n, rung: 'opinion', text: 'Me gusta porque es.' },
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
  it('needs at least two per question, one of them survival', () => {
    const few = good();
    few.modelAnswers = few.modelAnswers.filter((a) => !(a.questionPosition === 3 && a.rung === 'opinion'));
    expect(problems(few).join()).toMatch(/question 3 needs at least two model answers/);
    const noStart = good();
    noStart.modelAnswers = noStart.modelAnswers.map((a) => (a.questionPosition === 2 ? { ...a, rung: 'detail' as const } : a));
    expect(problems(noStart).join()).toMatch(/question 2 needs a survival model answer/);
  });

  it('rejects an answer for a missing question, an unknown rung, or no text', () => {
    const c = good();
    c.modelAnswers.push({ questionPosition: 9, rung: 'survival', text: 'x' });
    c.modelAnswers.push({ questionPosition: 1, rung: 'grade 3' as never, text: 'x' });
    c.modelAnswers.push({ questionPosition: 1, rung: 'detail', text: '  ' });
    const p = problems(c).join();
    expect(p).toMatch(/question 9, which does not exist/);
    expect(p).toMatch(/unknown rung "grade 3"/);
    expect(p).toMatch(/no text/);
  });
});

describe('mark scheme rules', () => {
  it('has the four basic tenses, and any other tense is fancy', () => {
    expect([...BASIC_TENSES]).toEqual(['present', 'preterite', 'near_future', 'conditional']);
    expect(FANCY_TAGS).toContain('other_tense');
    expect(FANCY_TAGS).toContain('tricky_syntax');
    for (const t of [...BASIC_TENSES, ...FANCY_TAGS]) expect(FEATURE_TAGS).toContain(t);
  });

  it('values a phrase above a single word', () => {
    const adj = good();
    adj.markScheme.rangeWeights.adjective_phrase = 1;
    expect(problems(adj).join()).toMatch(/adjective phrase must be worth more/);
    const adv = good();
    adv.markScheme.rangeWeights.adverb_phrase = 1;
    expect(problems(adv).join()).toMatch(/adverb phrase must be worth more/);
  });

  it('cannot demand more different basic tenses than exist', () => {
    const c = good();
    c.markScheme.range.basicTensesAcrossTest = 5;
    expect(problems(c).join()).toMatch(/basic tenses from 1 to 4/);
  });

  it('rejects an incomplete scheme and a missing one', () => {
    const c = good() as unknown as { markScheme: Record<string, unknown> };
    delete c.markScheme.detail;
    expect(validateCourse(c).ok).toBe(false);
    expect(problems({ ...good(), markScheme: undefined }).join()).toMatch(/mark scheme is missing/);
  });

  it('refuses grades or marks anywhere in a mark scheme', () => {
    for (const key of ['grade', 'wtg', 'mark', 'score']) {
      const c = good() as unknown as { markScheme: Record<string, unknown> };
      c.markScheme[key] = 3;
      expect(problems(c).join(), key).toMatch(/must not contain grades or marks/);
    }
  });

  it('rejects unknown input without throwing', () => {
    expect(validateCourse(null).ok).toBe(false);
  });
});
