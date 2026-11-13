import { describe, expect, it } from 'vitest';
import { firstUnsaid, liveMatch } from './live-match';

/** The second sentence of the lab's fifth answer. "Me gusta" opens the first bit and the last. */
const bits = ['Me gusta montar en bici', 'porque es divertido,', 'aunque a veces', 'me gusta salir con mis amigos.'];
const litIn = (m: ReturnType<typeof liveMatch>, c: number) => m.hit[c].filter(Boolean).length;

describe('repeated words are lit in place (27.7)', () => {
  it('lights only the first "me gusta" when the first bit is begun', () => {
    const m = liveMatch(bits, 'me gusta');
    expect(litIn(m, 0)).toBe(2);
    expect(litIn(m, 3)).toBe(0);
  });

  it('lights only the first bit when the first bit is said', () => {
    const m = liveMatch(bits, 'me gusta montar en bici');
    expect(m.said).toEqual([true, false, false, false]);
    expect(litIn(m, 3)).toBe(0);
  });

  it('does not light the last bit when a recogniser repeats the words it already gave', () => {
    const m = liveMatch(bits, 'me gusta montar en bici me gusta montar en bici');
    expect(m.said).toEqual([true, false, false, false]);
    expect(litIn(m, 3)).toBe(0);
  });

  it('does not light the last bit for a lone "me gusta" said after the first bit', () => {
    const m = liveMatch(bits, 'me gusta montar en bici me gusta');
    expect(litIn(m, 3)).toBe(0);
  });

  it('lights the last bit, and not the first, when the student really says the last bit', () => {
    const m = liveMatch(bits, 'me gusta salir con mis amigos');
    expect(m.said).toEqual([false, false, false, true]);
    expect(litIn(m, 0)).toBe(0);
    expect(m.reachedEnd).toBe(true);
  });

  it('lights the next occurrence once the student is up to it', () => {
    const m = liveMatch(bits, 'me gusta montar en bici porque es divertido aunque a veces me gusta salir con mis amigos');
    expect(m.complete).toBe(true);
  });

  it('lights it one bit ahead of the student, since skipping a bit is allowed', () => {
    const m = liveMatch(bits, 'me gusta montar en bici aunque a veces');
    expect(litIn(m, 2)).toBe(3);
  });

  it('lights a word that appears only once wherever it is said', () => {
    const m = liveMatch(bits, 'amigos');
    expect(m.hit[3][5]).toBe(true);
  });

  it('keeps a lit word lit and picks up from the first word not yet lit after a fresh start', () => {
    const first = liveMatch(bits, 'me gusta montar en bici');
    // The recogniser starts a new session: only the new words arrive. "Me gusta" must not light the last bit.
    const second = liveMatch(bits, 'porque es me gusta', first);
    expect(litIn(second, 0)).toBe(5);
    expect(litIn(second, 1)).toBe(2);
    expect(litIn(second, 3)).toBe(0);
  });

  it('answers with a repeated word inside one bit still light word by word', () => {
    const m = liveMatch(['los fines de semana', 'juego a los videojuegos'], 'los fines de semana juego a los');
    expect(m.hit).toEqual([[true, true, true, true], [true, true, true, false]]);
  });
});

describe('returning to a missed bit (27.8)', () => {
  const three = ['Lo siento, no puedo', 'porque tengo que', 'hacer los deberes.'];

  it('finds the first bit not said', () => {
    expect(firstUnsaid(liveMatch(three, 'lo siento no puedo hacer los deberes'))).toBe(1);
    expect(firstUnsaid(liveMatch(three, 'lo siento no puedo porque tengo que hacer los deberes'))).toBeNull();
  });

  it('matches only the focused bit, against words heard after the point the student was sent back', () => {
    const said = 'lo siento no puedo hacer los deberes';
    const first = liveMatch(three, said);
    expect(first.said).toEqual([true, false, true]);
    const heardSoFar = said.split(' ').length;
    const again = liveMatch(three, `${said} porque tengo que`, first, { chunk: 1, after: heardSoFar });
    expect(again.said).toEqual([true, true, true]);
    expect(again.complete).toBe(true);
  });

  it('ignores words from before the focus, so the earlier bits cannot be re-lit by accident', () => {
    const first = liveMatch(three, 'lo siento no puedo hacer los deberes');
    const again = liveMatch(three, 'lo siento no puedo hacer los deberes que', first, { chunk: 1, after: 7 });
    expect(again.hit[1]).toEqual([false, false, true]);
    expect(again.said).toEqual([true, false, true]);
  });

  it('copes with a focus that is past the end of a shorter transcript', () => {
    const again = liveMatch(three, 'porque', null, { chunk: 1, after: 40 });
    expect(again.hit[1]).toEqual([false, false, false]);
  });
});
