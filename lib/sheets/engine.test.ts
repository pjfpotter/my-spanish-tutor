import { describe, expect, it } from 'vitest';
import { buildBuilder } from './builder';
import { clash, compose, derive, fragment, isReady, mkAns, parseText, prepare, sentences, slotFits, slotItems, type Answer } from './engine';
import { FREE_TIME, FREE_TIME_SHEET } from './samples/free-time';
import { validateInterpretation } from './validate';

const B = prepare(buildBuilder('free', FREE_TIME_SHEET, FREE_TIME));
const item = (slot: string, es: string) => slotItems(B, B.slotMap[slot]).find((i) => i.es === es)!;
const ans = (spec: Record<string, string>): Answer => mkAns(B, spec);
const why = (a: Answer, slot: string, es: string) => clash(B, a, slot, item(slot, es))?.msg ?? null;

describe('the sample interpretation is valid', () => {
  it('passes the validator', () => {
    expect(validateInterpretation(FREE_TIME_SHEET, FREE_TIME)).toEqual([]);
  });
});

describe('what fits where (task 2.3)', () => {
  it('does not let a negative opinion open an answer, and opens it up after "sin embargo"', () => {
    expect(why({}, 'starter2', 'Odio')).toBe('A negative opinion works as a contrast. Pick “sin embargo” first.');
    const a = ans({ starter: 'Me gusta', activity: 'bailar', contrast: 'sin embargo' });
    expect(why(a, 'starter2', 'Odio')).toBeNull();
    expect(slotItems(B, B.slotMap.starter).map((i) => i.es)).not.toContain('Odio');
  });

  it('keeps "sin embargo" out of the connector slot and the other connectives out of the contrast slot', () => {
    expect(slotItems(B, B.slotMap.connector).map((i) => i.es)).toEqual(['porque', 'dado que', 'ya que', 'aunque']);
    expect(slotItems(B, B.slotMap.contrast).map((i) => i.es)).toEqual(['sin embargo']);
  });

  it('blocks a reason that cannot support the opinion, and flips polarity after "aunque"', () => {
    const base = ans({ starter: 'Me gusta', activity: 'cocinar', connector: 'porque' });
    expect(why(base, 'reason', 'es aburrido')).toContain('doesn\'t go with');
    expect(why(base, 'reason', 'es divertido')).toBeNull();
    const although = ans({ starter: 'Me gusta', activity: 'cocinar', connector: 'aunque' });
    expect(why(although, 'reason', 'es aburrido')).toBeNull();
    expect(why(although, 'reason', 'es divertido')).not.toBeNull();
  });

  it('needs the right kind of activity for a reason that depends on it', () => {
    const a = ans({ starter: 'Me gusta', activity: 'leer libros', connector: 'porque' });
    expect(why(a, 'reason', 'es bueno para la salud')).not.toBeNull();
    expect(why(ans({ starter: 'Me gusta', activity: 'bailar', connector: 'porque' }), 'reason', 'es bueno para la salud')).toBeNull();
  });

  it('refuses "pero" unless there is something to contrast with', () => {
    expect(why(ans({ starter: 'Me gusta', activity: 'bailar', connector: 'porque', reason: 'es divertido' }), 'glue', 'pero')).toBe('“pero” needs something to contrast with.');
    expect(why(ans({ starter: 'Me gusta', activity: 'bailar', connector: 'aunque', reason: 'es aburrido' }), 'glue', 'pero')).toBeNull();
  });

  it('keeps "when" and "who" closed until "lo hago" is chosen', () => {
    const a = ans({ starter: 'Me gusta', activity: 'bailar' });
    expect(why(a, 'when', 'a veces')).toBe('Pick “lo hago” first.');
    expect(why({ ...a, ...ans({ lohago: 'Lo hago' }) }, 'when', 'a veces')).toBeNull();
  });

  it('does not offer a chunk already on the card', () => {
    expect(why(ans({ starter: 'Me gusta', activity: 'bailar' }), 'activity2', 'bailar') ?? '').toContain('Pick');
  });

  it('never leaves a required slot with nothing to pick, in 200 random builds', () => {
    let seed = 3;
    const rnd = (n: number) => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n; };
    for (let w = 0; w < 200; w++) {
      const a: Answer = {};
      for (let step = 0; step < 20; step++) {
        const open = B.slots.filter((s) => !a[s.key]).map((s) => [s, slotFits(B, a, s.key)] as const).filter(([, f]) => f.length);
        for (const k of B.required) if (!a[k]) expect(slotFits(B, a, k).length).toBeGreaterThan(0);
        if (!open.length) break;
        const [s, fit] = open[rnd(open.length)];
        let it = fit[rnd(fit.length)];
        if (it.choice) it = derive(it, rnd(it.choice.length));
        a[s.key] = it;
      }
    }
  });
});

describe('the sentence on the card', () => {
  it('reads the owner\'s first walkthrough sentence, in Spanish and in English', () => {
    const a = ans({ starter: 'Me encanta', activity: 'jugar al baloncesto', connector: 'dado que', reason: 'es divertido', glue: 'y', lohago: 'Lo hacemos', when: 'una vez a la semana', who: 'mis primos' });
    expect(compose(B, a, 'es')).toBe('Me encanta jugar al baloncesto dado que es divertido y lo hacemos una vez a la semana con mis primos.');
    expect(compose(B, a, 'en')).toBe('I love play basketball given that it is fun and we do it once a week with my cousins.'.replace('love play', 'love to play'));
  });

  it('puts the fixed words in: a contrast sentence has its "porque"', () => {
    const a = ans({ starter: 'Me gusta', activity: 'bailar', contrast: 'sin embargo', starter2: 'No me gusta', activity2: 'cocinar', reason2: 'es aburrido' });
    expect(sentences(B, a, 'es')).toEqual(['Me gusta bailar.', 'Sin embargo, no me gusta cocinar porque es aburrido.']);
    expect(sentences(B, a, 'en')).toEqual(['I like to dance.', "However, I don't like to cook because it is boring."]);
  });

  it('attaches "lo hago" to the first sentence, not to a later contrast', () => {
    const a = ans({ starter: 'Me gusta', activity: 'bailar', lohago: 'Lo hago', when: 'a veces', contrast: 'sin embargo', starter2: 'No me gusta', activity2: 'cocinar' });
    expect(sentences(B, a, 'es')).toEqual(['Me gusta bailar.', 'Lo hago a veces.', 'Sin embargo, no me gusta cocinar.']);
    const joined = ans({ starter: 'Me gusta', activity: 'bailar', glue: 'y', lohago: 'Lo hago', when: 'a veces' });
    expect(sentences(B, joined, 'es')).toEqual(['Me gusta bailar y lo hago a veces.']);
  });

  it('marks a half-built frame with an ellipsis and reports the missing part', () => {
    const a = ans({ starter: 'Me gusta', activity: 'bailar', contrast: 'sin embargo' });
    expect(sentences(B, a, 'es').at(-1)).toBe('Sin embargo…');
    expect(fragment(B, a)).toEqual({ missing: 'starter2', have: 'contrast' });
    expect(fragment(B, ans({ starter: 'Me gusta', activity: 'bailar', connector: 'porque' }))).toEqual({ missing: 'reason', have: 'connector' });
    expect(fragment(B, ans({ starter: 'Me gusta', activity: 'bailar' }))).toBeNull();
  });

  it('is ready when the required slots are filled', () => {
    expect(isReady(B, ans({ starter: 'Me gusta' }))).toBe(false);
    expect(isReady(B, ans({ starter: 'Me gusta', activity: 'bailar' }))).toBe(true);
  });
});

describe('reading typed text onto the sheet', () => {
  it('finds each chunk, including a contrast sentence with its fixed word', () => {
    const r = parseText(B, 'Me gusta bailar porque es divertido. Sin embargo, odio cocinar porque es aburrido.');
    expect(Object.fromEntries(Object.entries(r.ans).map(([k, v]) => [k, v?.es]))).toEqual({ starter: 'Me gusta', activity: 'bailar', connector: 'porque', reason: 'es divertido', contrast: 'sin embargo', starter2: 'Odio', activity2: 'cocinar', reason2: 'es aburrido' });
    expect(r.off).toEqual([]);
  });

  it('reports words that are not on the sheet', () => {
    expect(parseText(B, 'Me gusta bailar mucho').off).toEqual(['mucho']);
  });

  it('round-trips every pair of its own sentences: compose, read back, compose', () => {
    const specs: Record<string, string>[] = [
      { starter: 'Me encanta', activity: 'ir al cine', connector: 'ya que', reason: 'es caro' },
      { starter: 'Suelo', activity: 'montar en bici', lohago: 'Lo hago', when: 'los sábados', who: 'mi familia' },
      { starter: 'Prefiero', activity: 'ver la tele', planStarter: 'Voy a', planActivity: 'jugar al fútbol' },
    ];
    for (const s of specs) {
      const a = ans(s), text = compose(B, a, 'es');
      expect(compose(B, parseText(B, text).ans, 'es')).toBe(text);
    }
  });

  it('keeps the variant the student chose', () => {
    const a = ans({ starter: 'Me gusta', activity: 'bailar', lohago: 'Lo hago', who: 'mi hermana' });
    expect(compose(B, a, 'es')).toContain('con mi hermana');
    expect(compose(B, a, 'en')).toContain('with my sister');
  });
});
