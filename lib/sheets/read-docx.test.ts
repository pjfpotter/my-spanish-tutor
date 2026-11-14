import { describe, expect, it } from 'vitest';
import { FIXTURES } from './fixture-docx';
import { expandAlternatives, looksEnglish, readDocx } from './read-docx';
import type { Chunk } from './types';

const read = (name: string) => readDocx(FIXTURES[name]());
const pairs = (items: Chunk[]) => items.map((i) => [i.es, i.en]);

describe('reading a sentence builder (tasks 1.1, 1.3 to 1.6)', () => {
  it('reads bold Spanish with bracketed English, and the title', () => {
    const s = read('boldBrackets');
    expect(s.titles[0]).toMatchObject({ es: '¿Qué haces en tu tiempo libre?', en: 'What do you do in your free time?' });
    expect(pairs(s.tables[0].cells[0].items)).toEqual([['Me gusta', 'I like to'], ['Odio', 'I hate to']]);
    expect(s.stats).toMatchObject({ items: 4, glossed: 4 });
  });

  it('reads a sheet with no bold, where English is italic in brackets', () => {
    const s = read('italicNoBold');
    expect(s.flags).toEqual({ hasBold: false, hasItalic: true });
    expect(pairs(s.tables[0].cells[0].items)).toEqual([['jugué al tenis', 'I played tennis'], ['nadé en la piscina', 'I swam in the pool']]);
    expect(pairs(s.tables[0].cells[1].items)).toEqual([['con mis amigos', 'with my friends'], ['en casa', 'at home']]);
  });

  it('reads square-bracket glosses', () => {
    expect(pairs(read('squareBrackets').tables[0].cells[0].items)).toEqual([['castaño', 'brown'], ['rubio', 'blonde']]);
  });

  it('keeps spans: a cell across two columns and a cell down two rows', () => {
    const cells = read('merged').tables[0].cells;
    const by = Object.fromEntries(cells.map((c) => [c.id, c]));
    expect(by.t0r0c0).toMatchObject({ rs: 2, cs: 1 });
    expect(by.t0r0c1).toMatchObject({ rs: 1, cs: 2 });
    expect(by.t0r1c1.items[0].es).toBe('tres');
    expect(by.t0r1c2.items[0].es).toBe('cuatro');
  });

  it('keeps row alignment so a garment can be matched to its own colours (task 1.6)', () => {
    const t = read('alignedLists').tables[0];
    const rowOf = (es: string) => t.cells.find((c) => c.items.some((i) => i.es === es))!.r;
    expect(rowOf('un jersey')).toBe(rowOf('negro'));
    expect(rowOf('una falda')).toBe(rowOf('negra'));
    expect(rowOf('un jersey')).not.toBe(rowOf('una falda'));
  });

  it('reads a floating text box, merging pairs split over two lines (task 1.5)', () => {
    const s = read('floatBox');
    expect(s.floats).toEqual([{ host: 't0r0c0', items: [{ es: 'fuimos', en: 'we went' }, { es: 'jugamos', en: 'we played' }] }]);
    expect(s.warnings.join(' ')).toContain('floating text box');
  });

  it('expands "(no)" and "[no]" into two chunks each', () => {
    const items = read('optionalNo').tables[0].cells[0].items;
    expect(items.map((i) => i.es)).toEqual(['soy', 'no soy', 'llevo', 'no llevo']);
    expect(items[0].en).toBe('I am');
    expect(items[1]).toMatchObject({ en: null, negOf: 'I am' });
  });

  it('expands alternatives but keeps "alto/a" and "Skype/Zoom" whole', () => {
    const items = read('alternatives').tables[0].cells[0].items;
    expect(items.map((i) => i.es)).toEqual(['dos personas', 'tres personas', 'cuatro personas', 'me gustaria ser más', 'me gustaria ser menos', 'alto/a', 'hablo por Skype/Zoom']);
    expect(pairs(items.slice(3, 5))).toEqual([['me gustaria ser más', 'I would like to be more'], ['me gustaria ser menos', 'I would like to be less']]);
  });

  it('copes with an unclosed bracket and two chunks in one paragraph', () => {
    const items = read('unclosedAndMany').tables[0].cells[0].items;
    expect(pairs(items)).toEqual([['me ayuda a relajarme', 'he/she helps me relax'], ['guapo/a', 'good-looking'], ['feo/a', 'ugly']]);
  });

  it('notes images and shading without relying on them', () => {
    const s = read('imageAndShading');
    expect(s.images).toBe(1);
    expect(s.warnings.join(' ')).toContain('1 image');
    expect(s.tables[0].cells[0].fill).toBe('FBE4D5');
  });

  it('does not count a text box as an image', () => {
    expect(read('floatBox').images).toBe(0);
  });

  it('says plainly when a file is not a Word document', () => {
    expect(() => readDocx(new TextEncoder().encode('hello'))).toThrow('not a Word file');
  });
});

describe('language check and expansion helpers', () => {
  it('tells English from Spanish when formatting gives no clue', () => {
    expect(looksEnglish('because')).toBe(true);
    expect(looksEnglish('it was a disaster')).toBe(true);
    expect(looksEnglish('fue un desastre')).toBe(false);
    expect(looksEnglish('nadé en la piscina')).toBe(false);
  });

  it('leaves chunks with no slash or "(no)" alone', () => {
    const c: Chunk = { es: 'me gusta', en: 'I like', hard: false };
    expect(expandAlternatives(c)).toEqual([c]);
  });
});
