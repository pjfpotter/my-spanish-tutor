import { describe, expect, it } from 'vitest';
import { FREE_TIME, FREE_TIME_CHUNKS } from '../course/calibration';
import { assessAnswer, assessTest, levelFromCounts, matchChunks, survivesOneSwap, tokens } from './rubric';
import { buildWordBank, validateDraft } from './validator';

const cal = FREE_TIME;
const ids = (text: string) => assessAnswer(cal, text).features.map((f) => f.id);

describe('rubric engine: the teacher\'s calibration (tasks 7.1 and 7.7)', () => {
  it('has the teacher\'s examples to check', () => {
    expect(cal.examples.filter((e) => e.source === 'teacher')).toHaveLength(3);
    expect(cal.examples.length).toBe(12);
  });

  it.each(cal.examples.map((e, i) => [`${e.source} ${e.level} #${i + 1}`, e]))('%s lands on the level it was written for', (_n, e) => {
    expect(assessAnswer(cal, e.text).level).toBe(e.level);
  });

  it('matches the counts in the teacher\'s rubric table', () => {
    const [a, b, c] = cal.examples.slice(0, 3).map((e) => assessAnswer(cal, e.text));
    expect([a.extras, a.hardExtras]).toEqual([0, 0]);
    expect([b.extras, b.hardExtras]).toEqual([4, 1]);
    expect(b.features.map((f) => f.id)).toEqual(['E1', 'E2', 'E3', 'E6']);
    expect([c.extras, c.hardExtras]).toEqual([7, 3]);
  });

  it('keeps every generated example inside the sentence builder, glue words and common words', () => {
    const bank = buildWordBank(FREE_TIME_CHUNKS, cal.glueWords);
    for (const e of cal.examples.filter((x) => x.source === 'generated')) {
      const v = validateDraft(e.text, bank);
      expect(v.reason, e.text).toBeNull();
    }
  });
});

describe('levels', () => {
  it('Rock solid is a justified opinion and nothing more', () => {
    const a = assessAnswer(cal, 'Me gusta jugar al fútbol porque es divertido.');
    expect(a.justifiedOpinions).toBe(1);
    expect(a.level).toBe('rock_solid');
  });

  it('gives no level, and lowers nothing, until there is a justified opinion', () => {
    expect(assessAnswer(cal, 'Me gusta jugar al fútbol.').level).toBeNull();
    expect(assessAnswer(cal, 'Sin embargo, lo hago los sábados.').level).toBeNull();
  });

  it('Stepping out is the frame plus one extra', () => {
    expect(assessAnswer(cal, 'Me gusta bailar porque es divertido, a veces.').level).toBe('stepping_out');
  });

  it('repeating the frame adds nothing, and each feature counts once', () => {
    const one = assessAnswer(cal, 'Me gusta bailar porque es divertido.');
    const three = assessAnswer(cal, 'Me gusta bailar porque es divertido. Me gusta cocinar porque es divertido. Me gusta leer libros porque es aburrido.');
    expect(three.level).toBe(one.level);
    expect(three.justifiedOpinions).toBe(3);
    expect(ids('Sin embargo, aunque, sin embargo')).toEqual(['E1']);
  });

  it('five extras with only one hard feature is Stepping out, not Showing off', () => {
    const a = assessAnswer(
      cal,
      'Me gusta bailar porque es divertido, lo hago los sábados. Sin embargo, no me gusta cocinar ya que me relaja, de vez en cuando.',
    );
    expect(a.hardExtras).toBe(1);
    expect(a.extras).toBeGreaterThanOrEqual(4);
    expect(a.level).toBe('stepping_out');
  });

  it('counts a second justifier only beside "porque"', () => {
    expect(ids('Me gusta bailar ya que es divertido.')).not.toContain('E7');
    expect(ids('Me gusta bailar porque es divertido ya que me relaja.')).toContain('E7');
  });

  it('ignores accents, capitals and punctuation, so recognition slips never lower the level', () => {
    expect(assessAnswer(cal, 'ME GUSTA bailar PORQUE es divertido').level).toBe('rock_solid');
    expect(ids('¡Que gUaY! tengo mucho tiempo libre')).toContain('E5');
    expect(tokens('¿Qué año? Mañana')).toEqual(['que', 'año', 'mañana']);
  });

  it('never mentions a grade', () => {
    expect(JSON.stringify(cal)).not.toMatch(/\bgrade\b|\bwtg\b/i);
  });
});

describe('one swap', () => {
  it('flags answers that sit exactly on a threshold', () => {
    const edge = assessAnswer(cal, 'Me gusta bailar porque es divertido, a veces.'); // one extra
    expect(edge.level).toBe('stepping_out');
    expect(survivesOneSwap(cal, edge)).toBe(false);
    const roomy = assessAnswer(cal, 'Me gusta bailar porque es divertido, a veces. Sin embargo, me relaja.');
    expect(survivesOneSwap(cal, roomy)).toBe(true);
  });
});

describe('editable calibration', () => {
  it('a threshold edit changes results with no code change', () => {
    const answer = 'Me gusta bailar porque es divertido, a veces.';
    expect(assessAnswer(cal, answer).level).toBe('stepping_out');
    const stricter = structuredClone(cal);
    stricter.thresholds.steppingOut.extras = 2;
    expect(assessAnswer(stricter, answer).level).toBe('rock_solid');
    expect(levelFromCounts(stricter, 1, 2, 0)).toBe('stepping_out');
  });

  it('a new feature added to the data is counted at once', () => {
    const more = structuredClone(cal);
    more.features.push({ id: 'X1', label: 'a new touch', hard: false, phrases: ['muy a menudo'] });
    expect(assessAnswer(more, 'Me gusta bailar porque es divertido, muy a menudo.').features.map((f) => f.id)).toEqual(['X1']);
  });
});

describe('whole test', () => {
  const answers = (...texts: string[]) => texts.map((text, i) => ({ questionPosition: i + 1, text }));

  it('shows the targets as a checklist and gates nothing', () => {
    const t = assessTest(cal, answers('Me gusta bailar porque es divertido.', 'Me gusta cocinar porque es divertido.'));
    expect(t.checklist.tenses).toMatchObject({ have: 1, need: 3, met: false });
    expect(t.checklist.justifiedOpinions).toMatchObject({ have: 2, need: 2, met: true });
    expect(t.answers.every((a) => a.level === 'rock_solid')).toBe(true);
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
