import { describe, expect, it } from 'vitest';
import type { Interpretation } from './interpretation';
import { FREE_TIME, FREE_TIME_SHEET } from './samples/free-time';
import { editDistance, smallSpanishEdit, validateInterpretation } from './validate';

const clone = (): Interpretation => structuredClone(FREE_TIME);
const problems = (i: Interpretation) => validateInterpretation(FREE_TIME_SHEET, i);
const idx = (list: string, es: string) => {
  const c = FREE_TIME_SHEET.tables[0].cells.find((x) => x.items.some((i) => i.es === es))!;
  return `${list}:${c.items.findIndex((i) => i.es === es)}`;
};

describe('interpretation validator (task 2.2)', () => {
  it('accepts a good draft', () => expect(problems(clone())).toEqual([]));

  it('rejects a column that points at a cell the sheet does not have', () => {
    const i = clone(); i.columns[0].cell = 't9r9c9';
    expect(problems(i).map((p) => p.message)).toContain('The sheet has no cell “t9r9c9”.');
  });

  it('rejects two columns sharing a cell', () => {
    const i = clone(); i.columns[1].cell = i.columns[0].cell;
    expect(problems(i).some((p) => p.message.includes('used by two columns'))).toBe(true);
  });

  it('rejects a property on a chunk that is not on the sheet: a draft cannot add chunks', () => {
    const i = clone(); i.props['starter:99'] = { pol: '+' };
    expect(problems(i).some((p) => p.message.includes('cannot add chunks'))).toBe(true);
  });

  it('rejects references to slots and columns that do not exist', () => {
    const i = clone();
    i.slots[1].after = 'nowhere'; i.frames[0].parts.push({ slot: 'ghost' }); i.auto.push('phantom'); i.slots[0].cols = ['nothing'];
    const msgs = problems(i).map((p) => p.message);
    expect(msgs).toEqual(expect.arrayContaining(['No slot “nowhere”.', 'No slot “ghost”.', 'No slot “phantom”.', 'No column “nothing”.']));
  });

  it('rejects a core part that is not in its frame, and a slot in two frames', () => {
    const i = clone(); i.frames[0].core = ['starter', 'closing']; i.frames[1].slots.push('starter');
    const msgs = problems(i).map((p) => p.message);
    expect(msgs).toContain('“closing” is not in the frame.');
    expect(msgs).toContain('Slot “starter” is in two frames.');
  });

  it('allows small corrections and rejects ones that change meaning', () => {
    const ok = clone(); ok.corrections = [{ chunk: idx('activity', 'bailar'), field: 'es', to: 'bailár', type: 'spelling' }];
    expect(problems(ok)).toEqual([]);
    const meaning = clone(); meaning.corrections = [{ chunk: idx('activity', 'bailar'), field: 'es', to: 'cocinar', type: 'spelling' }];
    expect(problems(meaning)[0].message).toContain('changes more than spelling or agreement');
  });

  it('rejects an edit that changes the number of words, an unknown type and an emptied chunk', () => {
    const i = clone();
    i.corrections = [
      { chunk: idx('activity', 'bailar'), field: 'es', to: 'bailar mucho', type: 'spelling' },
      { chunk: idx('activity', 'cocinar'), field: 'es', to: 'cocinar', type: 'rewrite' as never },
      { chunk: idx('activity', 'leer libros'), field: 'es', to: '  ', type: 'spelling' },
    ];
    const msgs = problems(i).map((p) => p.message);
    expect(msgs.some((m) => m.includes('changes more than spelling'))).toBe(true);
    expect(msgs).toContain('“rewrite” is not an allowed kind of correction.');
    expect(msgs).toContain('A correction cannot empty a chunk.');
  });

  it('keeps English corrections to plain English', () => {
    const i = clone();
    i.corrections = [{ chunk: idx('activity', 'bailar'), field: 'en', to: 'to dançe ¡', type: 'missing-english' }];
    expect(problems(i)[0].message).toContain('plain English');
  });

  it('refuses a Spanish edit labelled as an English fix, and the other way round', () => {
    const i = clone();
    i.corrections = [{ chunk: idx('activity', 'bailar'), field: 'es', to: 'bailar', type: 'missing-english' }, { chunk: idx('activity', 'cocinar'), field: 'en', to: 'to cook', type: 'spelling' }];
    expect(problems(i).map((p) => p.message)).toEqual(['That kind of correction is for English.', 'That kind of correction is for Spanish.']);
  });
});

describe('small edits', () => {
  it('counts letters, ignoring accents', () => {
    expect(editDistance('marrónes', 'marrones')).toBe(0);
    expect(editDistance('perdida', 'pérdida')).toBe(0);
    expect(editDistance('gato', 'perro')).toBeGreaterThan(2);
  });

  it('accepts spelling and agreement fixes, and rejects a different word', () => {
    expect(smallSpanishEdit('marrónes', 'marrones')).toBe(true);
    expect(smallSpanishEdit('el pared', 'la pared')).toBe(true);
    expect(smallSpanishEdit('un pared', 'una pared')).toBe(true);
    expect(smallSpanishEdit('el gato', 'el perro')).toBe(false);
  });
});
