import { describe, expect, it } from 'vitest';
import { wordsFromAlignment } from './alignment';
import { parseClipFile, type ClipFile } from './clip';
import { envelopeFromSamples } from './envelope';

const chars = (s: string) => s.split('');
function align(text: string, step = 0.1) {
  const characters = chars(text);
  return {
    characters,
    character_start_times_seconds: characters.map((_, i) => i * step),
    character_end_times_seconds: characters.map((_, i) => (i + 1) * step),
  };
}

describe('wordsFromAlignment', () => {
  it('groups characters into words, keeping punctuation, with the first character time', () => {
    const { words, end } = wordsFromAlignment(align('¡Hola! Soy Tele.'));
    expect(words).toEqual([
      { text: '¡Hola!', t0: 0 },
      { text: 'Soy', t0: expect.closeTo(0.7) },
      { text: 'Tele.', t0: expect.closeTo(1.1) },
    ]);
    expect(end).toBeCloseTo(1.6);
  });

  it('copes with repeated and trailing spaces', () => {
    const { words } = wordsFromAlignment(align('  vivo   en la tele '));
    expect(words.map((w) => w.text)).toEqual(['vivo', 'en', 'la', 'tele']);
  });

  it('rejects mismatched arrays', () => {
    const a = align('hola');
    a.character_end_times_seconds.pop();
    expect(() => wordsFromAlignment(a)).toThrow('different lengths');
  });

  it('returns nothing for empty text', () => {
    expect(wordsFromAlignment({ characters: [], character_start_times_seconds: [], character_end_times_seconds: [] })).toEqual({
      words: [], end: 0,
    });
  });
});

describe('envelopeFromSamples', () => {
  const rate = 1000;
  const tone = (amp: number, ms: number) => Float32Array.from({ length: (ms * rate) / 1000 }, (_, i) => amp * Math.sin(i / 3));

  it('gives one value per hop, all between 0 and 1', () => {
    const e = envelopeFromSamples(tone(0.5, 600), rate, 0.1);
    expect(e).toHaveLength(6);
    expect(e.every((v) => v >= 0 && v <= 1)).toBe(true);
  });

  it('is high where it is loud and low where it is quiet, whatever the recording level', () => {
    const quietLevel = Float32Array.from([...tone(0.02, 400), ...tone(0.002, 400)]);
    const loudLevel = Float32Array.from([...tone(0.8, 400), ...tone(0.08, 400)]);
    for (const s of [quietLevel, loudLevel]) {
      const e = envelopeFromSamples(s, rate, 0.1);
      expect(e[1]).toBeGreaterThan(0.8);
      expect(e[6]).toBeLessThan(0.3);
    }
  });

  it('is all zeros for silence and empty for no samples', () => {
    expect(envelopeFromSamples(new Float32Array(500), rate, 0.1).every((v) => v === 0)).toBe(true);
    expect(envelopeFromSamples(new Float32Array(0), rate)).toEqual([]);
  });
});

const good: ClipFile = {
  id: 'hola', text: '¡Hola! Soy Tele.', en: "Hi! I'm Tele.", end: 1.6,
  words: [{ text: '¡Hola!', t0: 0.1 }, { text: 'Soy', t0: 0.7 }, { text: 'Tele.', t0: 1.1 }],
  envelope: [0, 0.5, 1], envelopeHop: 0.03,
  feelings: [{ t0: 0, feelings: { joy: 0.7 } }],
  source: { provider: 'elevenlabs', voiceId: 'v', model: 'm', speed: 1, hash: 'abc' },
};

describe('parseClipFile', () => {
  it('accepts a good clip file', () => {
    expect(parseClipFile(JSON.parse(JSON.stringify(good)))).toEqual(good);
  });

  it.each([
    ['not an object', null, 'not an object'],
    ['no English subtitle', { ...good, en: ' ' }, 'English subtitle'],
    ['no words', { ...good, words: [] }, 'no words'],
    ['words out of order', { ...good, words: [{ text: 'a', t0: 1 }, { text: 'b', t0: 0.5 }] }, 'out of order'],
    ['a word after the end', { ...good, words: [{ text: 'a', t0: 2 }] }, 'after the clip ends'],
    ['envelope out of range', { ...good, envelope: [0, 2] }, 'envelope'],
    ['no feeling track', { ...good, feelings: [] }, 'feeling track'],
    ['unknown feeling', { ...good, feelings: [{ t0: 0, feelings: { boredom: 1 } }] }, 'unknown feeling'],
    ['feeling too strong', { ...good, feelings: [{ t0: 0, feelings: { joy: 3 } }] }, '0 to 1'],
    ['no source', { ...good, source: undefined }, 'no source'],
  ])('rejects %s', (_name, input, message) => {
    expect(() => parseClipFile(input)).toThrow(message);
  });
});
