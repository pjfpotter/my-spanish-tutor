import { describe, expect, it } from 'vitest';
import { normaliseWord, scoreAttempt } from './score';

const status = (script: string, said: string) => scoreAttempt(script, said).words.map((w) => w.status);

describe('scoreAttempt', () => {
  it('scores a perfect attempt 100', () => {
    const s = scoreAttempt('Me gusta el fútbol', 'me gusta el fútbol');
    expect(s.accuracy).toBe(100);
    expect(s.extra).toEqual([]);
  });

  it('marks one missing word and lowers the percentage by one word', () => {
    const s = scoreAttempt('me gusta jugar al fútbol', 'me gusta jugar fútbol');
    expect(s.words.map((w) => w.status)).toEqual(['matched', 'matched', 'matched', 'missed', 'matched']);
    expect(s.accuracy).toBe(80);
  });

  it('marks a replaced word as different and keeps what was heard', () => {
    const s = scoreAttempt('me gusta el cine', 'mi gusta el cine');
    expect(s.words[0]).toEqual({ word: 'me', status: 'different', heard: 'mi' });
    expect(s.accuracy).toBe(75);
  });

  it('lists extra words but does not penalise them', () => {
    const s = scoreAttempt('me gusta el cine', 'eh me gusta mucho el cine');
    expect(s.accuracy).toBe(100);
    expect(s.extra).toEqual(['eh', 'mucho']);
  });

  it('handles swapped words as one matched and one missed, with the extra shown', () => {
    const s = scoreAttempt('rojo azul', 'azul rojo');
    expect(s.matched).toBe(1);
    expect(s.accuracy).toBe(50);
    expect(s.extra.length).toBe(1);
  });

  it('is accent tolerant and ignores capitals and punctuation', () => {
    expect(scoreAttempt('¿Qué tal? Está bien.', 'que tal esta bien').accuracy).toBe(100);
    expect(status('Está aquí', 'ESTA AQUI')).toEqual(['matched', 'matched']);
  });

  it('keeps ñ distinct, so año and ano differ', () => {
    expect(normaliseWord('año')).toBe('año');
    expect(status('año', 'ano')).toEqual(['different']);
  });

  it('marks everything missed when nothing was heard', () => {
    const s = scoreAttempt('hola amigo', '');
    expect(s.words.map((w) => w.status)).toEqual(['missed', 'missed']);
    expect(s.accuracy).toBe(0);
  });

  it('copes with an empty script', () => {
    expect(scoreAttempt('', 'hola').accuracy).toBe(0);
  });

  it('keeps the script words as written', () => {
    expect(scoreAttempt('¿Cómo estás?', 'como estas').words.map((w) => w.word)).toEqual(['¿Cómo', 'estás?']);
  });
});
