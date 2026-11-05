import { describe, expect, it } from 'vitest';
import { CONFUSIONS, confusionFor, tipFor } from './confusions';

describe('confusion table (task 5.3)', () => {
  // One row per entry: the script word, what the recogniser heard in its place, and the entry that must fire.
  const cases: [string, string, string][] = [
    ['me', 'mi', 'me_mi'],
    ['mi', 'me', 'me_mi'],
    ['gusto', 'gustow', 'final_o'],
    ['como', 'comou', 'final_o'],
    ['hola', 'ola', 'silent_h'],
    ['ahora', 'aora', 'silent_h'],
    ['jamón', 'hamón', 'j'],
    ['trabajo', 'trabayo', 'j'],
    ['llamo', 'lamo', 'll'],
    ['calle', 'cale', 'll'],
    ['vivo', 'bibo', 'v_b'],
    ['bien', 'vien', 'v_b'],
    ['zapato', 'sapato', 'z_c'],
    ['cine', 'sine', 'z_c'],
  ];

  it.each(cases)('maps %s heard as %s to %s', (script, heard, id) => {
    expect(confusionFor(script, heard)?.id).toBe(id);
    expect(tipFor(script, heard)).toBeTruthy();
  });

  it('covers every entry in the table', () => {
    expect(new Set(cases.map((c) => c[2]))).toEqual(new Set(CONFUSIONS.map((c) => c.id)));
  });

  it('gives each tip as one short line', () => {
    for (const c of CONFUSIONS) {
      expect(c.tip).not.toMatch(/\n/);
      expect(c.tip.length).toBeLessThan(100);
    }
  });

  it('ignores accents and capitals when matching', () => {
    expect(confusionFor('Jamón', 'HAMON')?.id).toBe('j');
  });

  it('shows no tip for a mismatch that fits no entry', () => {
    expect(confusionFor('perro', 'gato')).toBeNull();
    expect(tipFor('perro', 'gato')).toBeNull();
    expect(tipFor('casa', 'cosa')).toBeNull();
  });

  it('shows no tip when the word was matched or nothing was heard', () => {
    expect(tipFor('hola', 'hola')).toBeNull();
    expect(tipFor('hola', '')).toBeNull();
  });
});
