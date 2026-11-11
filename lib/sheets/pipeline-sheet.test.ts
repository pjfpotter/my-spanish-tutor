import { describe, expect, it } from 'vitest';
import { buildBuilder } from './builder';
import { buildDocx, type FxPara } from './fixture-docx';
import { clash, compose, fragment, mkAns, parseText, prepare, slotFits, slotItems } from './engine';
import type { Interpretation } from './interpretation';
import { readDocx } from './read-docx';
import { validateInterpretation } from './validate';

/**
 * A synthetic clothes-and-bedroom sheet goes through the whole route: a Word file, the reader, an
 * interpretation, the validator, the builder and the engine. It covers what the owner's real sheets
 * needed: colour lists aligned with their garments, a list of items, agreement and corrections.
 */
const B_ = (es: string, en?: string): FxPara[] => [[{ t: es, b: true }], ...(en ? [[{ t: `(${en})`, i: true }]] : [])];
const doc = () => buildDocx([{
  table: {
    grid: [2500, 3000, 3000, 2500],
    rows: [
      [{ paras: [...B_('Normalmente llevo', 'I normally wear'), ...B_('Voy a llevar', 'I am going to wear')] }, { paras: [...B_('un jersey', 'a jumper'), ...B_('un vestido', 'a dress')] }, { paras: [...B_('negro', 'black'), ...B_('rojo', 'red')] }, { paras: [...B_('una mesa', 'a desk'), ...B_('una cama', 'a bed')] }],
      [{ paras: [] }, { paras: [...B_('una falda', 'a skirt')] }, { paras: [...B_('negra', 'black'), ...B_('roja', 'red')] }, { paras: [...B_('bonito/a', 'pretty'), ...B_('marrónes', 'brown')] }],
    ],
  },
}]);

const interp = (): Interpretation => ({
  version: 1, name: 'Clothes', title: '¿Qué llevas?', subtitle: 'What do you wear?',
  columns: [
    { key: 'starter', cell: 't0r0c0', title: 'Starter', kind: 'opinion' },
    { key: 'g0', cell: 't0r0c1', title: 'Clothes', kind: 'detail' }, { key: 'c0', cell: 't0r0c2', title: 'Colour', kind: 'time', repeat: true },
    { key: 'g1', cell: 't0r1c1', title: 'Clothes', kind: 'detail' }, { key: 'c1', cell: 't0r1c2', title: 'Colour', kind: 'time', repeat: true },
    { key: 'furn', cell: 't0r0c3', title: 'Furniture', kind: 'detail' }, { key: 'adj', cell: 't0r1c3', title: 'Adjectives', kind: 'time', repeat: true },
  ],
  props: {
    'starter:0': { qtag: 'habit' }, 'starter:1': { qtag: 'plan' },
    'g0:0': { row: 0 }, 'g0:1': { row: 0 }, 'c0:0': { row: 0 }, 'c0:1': { row: 0 }, 'g1:0': { row: 1 }, 'c1:0': { row: 1 }, 'c1:1': { row: 1 },
    'furn:0': { gen: 'f', num: 's' }, 'furn:1': { gen: 'f', num: 's' }, 'adj:0': { adj: true, base: 'bonito' }, 'adj:1': { adj: true, base: 'marrón' },
  },
  slots: [
    { key: 'verb', cols: ['starter'], label: 'I wear…', noun: 'a verb', prompt: 'Start' },
    ...[1, 2, 3].flatMap((n) => [
      { key: 'g' + n, cols: ['g0', 'g1'], label: 'clothes', noun: 'some clothes', prompt: 'Pick', ...(n > 1 ? { after: 'g' + (n - 1) } : {}) },
      { key: 'c' + n, cols: ['c0', 'c1'], label: 'colour', noun: 'a colour', prompt: 'Colour', alignWith: 'g' + n, after: 'g' + n, enMerge: 'g' + n },
    ]),
    { key: 'furn', cols: ['furn'], label: 'furniture', noun: 'furniture', prompt: 'Furniture' },
    { key: 'adj', cols: ['adj'], label: 'adjective', noun: 'an adjective', prompt: 'Describe it', agree: 'furn', enMerge: 'furn', after: 'furn' },
  ],
  frames: [
    { core: ['verb', 'g1'], slots: ['verb', 'g1', 'c1', 'g2', 'c2', 'g3', 'c3'], parts: [{ slot: 'verb' }, { list: [['g1', 'c1'], ['g2', 'c2'], ['g3', 'c3']] }] },
    { core: ['furn'], slots: ['furn', 'adj'], parts: [{ fixed: { es: 'En mi dormitorio hay', en: 'In my bedroom there is' } }, { slot: 'furn' }, { slot: 'adj' }] },
  ],
  questions: [{ es: '¿Qué vas a llevar?', en: 'What are you going to wear?', req: { verb: 'plan' } }],
  required: ['verb', 'g1'], together: [], auto: ['verb', 'g1', 'c1'], ignore: ['y'], rules: { polarity: [] }, corrections: [],
});

const build = (i: Interpretation) => prepare(buildBuilder('t', readDocx(doc()), i));

describe('from a Word file to a working builder', () => {
  const sheet = readDocx(doc());

  it('validates', () => expect(validateInterpretation(sheet, interp())).toEqual([]));

  it('offers only the colours that line up with the chosen garment', () => {
    const B = build(interp());
    const a = mkAns(B, { verb: 'Voy a llevar', g1: 'una falda' });
    expect(slotFits(B, a, 'c1').map((i) => i.es)).toEqual(['negra', 'roja']);
    const jumper = mkAns(B, { verb: 'Voy a llevar', g1: 'un jersey' });
    expect(slotFits(B, jumper, 'c1').map((i) => i.es)).toEqual(['negro', 'rojo']);
    expect(clash(B, jumper, 'c1', slotItems(B, B.slotMap.c1).find((i) => i.es === 'negra')!)?.msg).toContain('different kind of clothes');
  });

  it('lists several items with commas and "y", in Spanish and English', () => {
    const B = build(interp());
    const a = mkAns(B, { verb: 'Voy a llevar', g1: 'un jersey', c1: 'rojo', g2: 'una falda', c2: 'negra', g3: 'un vestido' });
    expect(compose(B, a, 'es')).toBe('Voy a llevar un jersey rojo, una falda negra y un vestido.');
    expect(compose(B, a, 'en')).toBe('I am going to wear a red jumper, a black skirt and a dress.');
  });

  it('makes an adjective agree with the furniture and reads it back', () => {
    const B = build(interp());
    const a = mkAns(B, { furn: 'una mesa', adj: 'bonito/a' });
    expect(compose(B, a, 'es')).toBe('En mi dormitorio hay una mesa bonita.');
    expect(compose(B, a, 'en')).toBe('In my bedroom there is a pretty desk.');
    expect(compose(B, parseText(B, 'En mi dormitorio hay una mesa bonito').ans, 'es')).toBe('En mi dormitorio hay una mesa bonita.');
    expect(parseText(B, 'En mi dormitorio hay una mesa bonito').fixes).toEqual(['bonito → bonita']);
  });

  it('flags a frame with no core', () => {
    const B = build(interp());
    expect(fragment(B, mkAns(B, { verb: 'Voy a llevar' }))).toEqual({ missing: 'g1', have: 'verb' });
  });

  it('uses a correction on the student\'s sheet and keeps the printed text', () => {
    const i = interp();
    i.corrections = [{ chunk: 'adj:1', field: 'es', to: 'marrones', type: 'spelling' }];
    expect(validateInterpretation(sheet, i)).toEqual([]);
    const B = build(i);
    const it = B.cols.adj.items[1];
    expect(it.es).toBe('marrones');
    expect(it.original).toEqual({ es: 'marrónes' });
  });

  it('uses a corrected English gloss in the subtitle', () => {
    const i = interp();
    i.corrections = [{ chunk: 'g0:0', field: 'en', to: 'a sweater', type: 'wrong-english' }];
    const B = build(i);
    expect(compose(B, mkAns(B, { verb: 'Voy a llevar', g1: 'un jersey' }), 'en')).toBe('I am going to wear a sweater.');
    expect(B.cols.g0.items[0].original).toEqual({ en: 'a jumper' });
  });

  it('filters by question: the plan question blocks the habit starter', () => {
    const B = build(interp());
    const q = B.questions[0];
    expect(clash(B, {}, 'verb', B.cols.starter.items[0], q)?.msg).toBe('That one is for a different question.');
    expect(clash(B, {}, 'verb', B.cols.starter.items[1], q)).toBeNull();
  });
});
