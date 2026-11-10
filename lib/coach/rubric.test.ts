import { describe, expect, it } from 'vitest';
import { FREE_TIME, FREE_TIME_CHUNKS } from '../course/calibration';
import { assessAnswer, assessTest, featureValue, matchChunks, tokens } from './rubric';
import { buildWordBank, validateDraft } from './validator';

const cal = FREE_TIME;
const ids = (text: string) => assessAnswer(cal, text).features.map((f) => f.id);

describe('rubric engine: the teacher\'s calibration (tasks 7.1 and 7.7)', () => {
  it('has the teacher\'s examples to check', () => {
    expect(cal.examples.filter((e) => e.source === 'teacher')).toHaveLength(3);
    expect(cal.examples.length).toBe(12);
  });

  it.each(cal.examples.map((e, i) => [`${e.source} rank ${e.rank} #${i + 1}`, e]))('%s lights the features and has the value it was calibrated to', (_n, e) => {
    const a = assessAnswer(cal, e.text);
    expect(a.features.map((f) => f.id)).toEqual(e.features);
    expect(a.value).toBe(e.value);
  });

  it('keeps the teacher\'s order from simplest to richest', () => {
    const by = (rank: number) => cal.examples.filter((e) => e.rank === rank).map((e) => assessAnswer(cal, e.text).value);
    expect(Math.max(...by(1))).toBeLessThan(Math.min(...by(2)));
    expect(Math.max(...by(2))).toBeLessThan(Math.min(...by(3)));
  });

  it('matches the features in the teacher\'s rubric table', () => {
    const [a, b, c] = cal.examples.slice(0, 3).map((e) => assessAnswer(cal, e.text));
    expect(a.features).toEqual([]);
    expect(b.features.map((f) => f.id)).toEqual(['E1', 'E2', 'E3', 'E6']);
    expect(c.features).toHaveLength(7);
  });

  it('keeps every generated example inside the sentence builder, glue words and common words', () => {
    const bank = buildWordBank(FREE_TIME_CHUNKS, cal.glueWords);
    for (const e of cal.examples.filter((x) => x.source === 'generated')) {
      const v = validateDraft(e.text, bank);
      expect(v.reason, e.text).toBeNull();
    }
  });
});

describe('value', () => {
  it('a justified opinion is worth the frame value and nothing more', () => {
    const a = assessAnswer(cal, 'Me gusta jugar al fútbol porque es divertido.');
    expect(a.justifiedOpinions).toBe(1);
    expect(a.features).toEqual([]);
    expect(a.value).toBe(cal.frame.value);
  });

  it('is worth nothing, and lowers nothing, until there is a justified opinion', () => {
    expect(assessAnswer(cal, 'Me gusta jugar al fútbol.').value).toBe(0);
    expect(assessAnswer(cal, 'Me gusta jugar al fútbol.').justifiedOpinions).toBe(0);
  });

  it('adding a feature raises the value by one unit plus the feature\'s weight', () => {
    const base = assessAnswer(cal, 'Me gusta bailar porque es divertido.').value;
    const time = assessAnswer(cal, 'Me gusta bailar porque es divertido, a veces.');
    expect(time.value - base).toBe(featureValue(cal.features.find((f) => f.id === 'E2')!));
    const hard = assessAnswer(cal, 'Me gusta bailar porque es divertido, lo hago.');
    expect(hard.value - base).toBe(3);
    expect(hard.features.map((f) => f.value)).toEqual([3]);
  });

  it('repeating the frame adds nothing, and each feature counts once', () => {
    const one = assessAnswer(cal, 'Me gusta bailar porque es divertido.');
    const three = assessAnswer(cal, 'Me gusta bailar porque es divertido. Me gusta cocinar porque es divertido. Me gusta leer libros porque es aburrido.');
    expect(three.value).toBe(one.value);
    expect(three.justifiedOpinions).toBe(3);
    expect(ids('Sin embargo, aunque, sin embargo')).toEqual(['E1']);
    const twice = assessAnswer(cal, 'Me gusta bailar porque es divertido, a veces, de vez en cuando.');
    expect(twice.value).toBe(assessAnswer(cal, 'Me gusta bailar porque es divertido, a veces.').value);
  });

  it('glue words carry no value', () => {
    const a = assessAnswer(cal, 'Me gusta bailar porque es divertido.').value;
    expect(assessAnswer(cal, 'Me gusta bailar y cantar pero también leer porque es divertido.').value).toBe(a);
  });

  it('counts a second justifier only beside "porque"', () => {
    expect(ids('Me gusta bailar ya que es divertido.')).not.toContain('E7');
    expect(ids('Me gusta bailar porque es divertido ya que me relaja.')).toContain('E7');
  });

  it('ignores accents, capitals and punctuation, so recognition slips never lower the value', () => {
    const plain = assessAnswer(cal, 'Me gusta bailar porque es divertido. Tengo mucho tiempo libre.').value;
    expect(assessAnswer(cal, 'ME GUSTA bailar PORQUE es divertido. ¡Tengo mucho tiempo libre!').value).toBe(plain);
    expect(ids('¡Que gUaY! tengo mucho tiempo libre')).toContain('E5');
    expect(tokens('¿Qué año? Mañana')).toEqual(['que', 'año', 'mañana']);
  });

  it('never mentions a level or a grade', () => {
    expect(JSON.stringify(cal)).not.toMatch(/\bgrade\b|\bwtg\b|rock_solid|stepping_out|showing_off/i);
  });
});

describe('editable calibration', () => {
  it('a weight edit changes values with no code change', () => {
    const answer = 'Me gusta bailar porque es divertido, a veces.';
    const before = assessAnswer(cal, answer).value;
    const heavier = structuredClone(cal);
    heavier.features.find((f) => f.id === 'E2')!.weight = 2;
    expect(assessAnswer(heavier, answer).value).toBe(before + 2);
  });

  it('a new feature added to the data is counted at once', () => {
    const more = structuredClone(cal);
    more.features.push({ id: 'X1', label: 'a new touch', weight: 1, phrases: ['muy a menudo'] });
    const a = assessAnswer(more, 'Me gusta bailar porque es divertido, muy a menudo.');
    expect(a.features.map((f) => f.id)).toEqual(['X1']);
    expect(a.value).toBe(cal.frame.value + 2);
  });
});

describe('whole test', () => {
  const answers = (...texts: string[]) => texts.map((text, i) => ({ questionPosition: i + 1, text }));

  it('shows the targets as a checklist and gates nothing', () => {
    const t = assessTest(cal, answers('Me gusta bailar porque es divertido.', 'Me gusta cocinar porque es divertido.'));
    expect(t.checklist.tenses).toMatchObject({ have: 1, need: 3, met: false });
    expect(t.checklist.justifiedOpinions).toMatchObject({ have: 2, need: 2, met: true });
    expect(t.answers.every((a) => a.value === cal.frame.value)).toBe(true);
  });

  it('counts tenses across the answers, not within one', () => {
    const t = assessTest(cal, answers('Me gusta bailar porque es divertido.', 'Me gustaría tocar la guitarra porque me relaja.', 'Voy a cocinar mañana.'));
    expect(t.tenses).toEqual(['present', 'near_future', 'conditional']);
    expect(t.checklist.tenses.met).toBe(true);
  });
});

describe('matchChunks', () => {
  it('takes the longest chunk and uses each word once', () => {
    const m = matchChunks('Me gusta salir con mis amigos', FREE_TIME_CHUNKS);
    expect(m.map((x) => x.chunk.spanish)).toEqual(['Me gusta', 'salir con mis amigos']);
  });
});
