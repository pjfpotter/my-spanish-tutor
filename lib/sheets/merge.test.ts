import { describe, expect, it } from 'vitest';
import { buildBuilder } from './builder';
import { clash, parseText, prepare, slotItems } from './engine';
import type { Interpretation } from './interpretation';
import { mergeSheets, type MergePart } from './merge';
import { FREE_TIME, FREE_TIME_SHEET } from './samples/free-time';
import type { Sheet } from './types';
import { validateInterpretation } from './validate';
import { verifyBuilder } from './verify';

/** A tiny invented builder (not a teacher's): food, with one question. */
const FOOD_SHEET: Sheet = {
  titles: [{ es: '¿Qué comes?', en: 'What do you eat?', after: 0 }],
  tables: [{
    index: 0, grid: [100, 100, 100], rows: 1,
    cells: [
      { id: 't0r0c0', r: 0, c: 0, rs: 1, cs: 1, fill: null, items: [{ es: 'Como', en: 'I eat', hard: false }, { es: 'Quiero', en: 'I want', hard: false }] },
      { id: 't0r0c1', r: 0, c: 1, rs: 1, cs: 1, fill: null, items: [{ es: 'pan', en: 'bread', hard: false }, { es: 'queso', en: 'cheese', hard: false }] },
      { id: 't0r0c2', r: 0, c: 2, rs: 1, cs: 1, fill: null, items: [{ es: 'por la mañana', en: 'in the morning', hard: false }] },
    ],
  }],
  floats: [], warnings: [], stats: { items: 5, glossed: 5, hard: 0 }, flags: { hasBold: false, hasItalic: false }, images: 0,
};
const FOOD: Interpretation = {
  version: 1, name: 'Food', title: '¿Qué comes?', subtitle: 'What do you eat?',
  columns: [
    { key: 'verb', cell: 't0r0c0', title: 'Verb', kind: 'opinion' },
    { key: 'food', cell: 't0r0c1', title: 'Food', kind: 'detail' },
    { key: 'when', cell: 't0r0c2', title: 'When', kind: 'time' },
  ],
  props: { 'verb:0': { roles: ['v'] }, 'food:0': { tags: ['carb'] } },
  slots: [
    { key: 'verb', cols: ['verb'], label: 'verb', noun: 'a verb', prompt: 'Pick a verb' },
    { key: 'food', cols: ['food'], label: 'food', noun: 'a food', prompt: 'Pick a food' },
    { key: 'when', cols: ['when'], label: 'when', noun: 'a time', prompt: 'When?', after: 'food' },
  ],
  frames: [{ core: ['verb', 'food'], slots: ['verb', 'food', 'when'], parts: [{ slot: 'verb' }, { slot: 'food' }, { slot: 'when' }] }],
  questions: [{ es: '¿Qué comes?', en: 'What do you eat?' }],
  required: ['verb', 'food'], together: [], auto: ['verb', 'food', 'when'], ignore: [], rules: { polarity: [] }, corrections: [],
};

const parts: MergePart[] = [
  { prefix: 'free', sheet: FREE_TIME_SHEET, interpretation: FREE_TIME },
  { prefix: 'food', sheet: FOOD_SHEET, interpretation: FOOD },
];
const names = { name: 'Merged', title: 'Merged', subtitle: 'Merged' };

describe('mergeSheets', () => {
  const { sheet, interpretation } = mergeSheets(parts, names);

  it('keeps every cell id and column key unique and the result valid', () => {
    const ids = sheet.tables.flatMap((t) => t.cells.map((c) => c.id));
    expect(new Set(ids).size).toBe(ids.length);
    expect(sheet.tables.map((t) => t.index)).toEqual([0, 1, 2, 3]);
    expect(validateInterpretation(sheet, interpretation)).toEqual([]);
  });

  it('adds nothing and removes nothing: every chunk of every part is still on the sheet', () => {
    const count = (s: Sheet) => s.tables.reduce((n, t) => n + t.cells.reduce((m, c) => m + c.items.length, 0), 0);
    expect(count(sheet)).toBe(count(FREE_TIME_SHEET) + count(FOOD_SHEET));
  });

  it('ties each question to its own block and gives it its own required slots', () => {
    expect(interpretation.questions.map((q) => q.blocks)).toEqual([[0], [1]]);
    expect(interpretation.questions[0].required).toEqual(['free_starter', 'free_activity']);
    expect(interpretation.questions[1].required).toEqual(['food_verb', 'food_food']);
  });

  it('offers a question only its own block and refuses the other', () => {
    const B = prepare(buildBuilder('m', sheet, interpretation));
    const [free, food] = B.questions;
    const foodItem = slotItems(B, B.slotMap.food_food)[0];
    const freeItem = slotItems(B, B.slotMap.free_activity)[0];
    expect(clash(B, {}, 'food_verb', slotItems(B, B.slotMap.food_verb)[0], food)).toBeNull();
    expect(clash(B, {}, 'food_verb', slotItems(B, B.slotMap.food_verb)[0], free)?.msg).toBe('That part is for another question.');
    expect(clash(B, {}, 'free_starter', slotItems(B, B.slotMap.free_starter)[0], free)).toBeNull();
    expect(clash(B, {}, 'free_starter', slotItems(B, B.slotMap.free_starter)[0], food)?.msg).toBe('That part is for another question.');
    expect(foodItem.id).not.toBe(freeItem.id);
  });

  it('reads typed text against only the question\'s own block', () => {
    const B = prepare(buildBuilder('m', sheet, interpretation));
    const [free, food] = B.questions;
    const own = parseText(B, 'Como pan', food);
    expect(Object.keys(own.ans).sort()).toEqual(['food_food', 'food_verb']);
    expect(own.off).toEqual([]);
    const other = parseText(B, 'Como pan', free);
    expect(Object.keys(other.ans)).toEqual([]);
    expect(other.off).toEqual(['Como', 'pan']);
    // Without a question every part is open, as before.
    expect(Object.keys(parseText(B, 'Como pan').ans).sort()).toEqual(['food_food', 'food_verb']);
  });

  it('builds a builder that passes the verification gate', () => {
    const B = prepare(buildBuilder('m', sheet, interpretation));
    expect(verifyBuilder(B, { walks: 40, sheet }).failures).toEqual([]);
  });

  it('refuses a repeated prefix, requiredAny and two parts answering one question', () => {
    expect(() => mergeSheets([parts[0], { ...parts[0] }], names)).toThrow(/used twice/);
    expect(() => mergeSheets([{ ...parts[1], interpretation: { ...FOOD, requiredAny: [['verb']] } }], names)).toThrow(/requiredAny/);
    expect(() => mergeSheets([parts[0], { ...parts[0], prefix: 'again' }], names)).toThrow(/same question/);
  });
});
