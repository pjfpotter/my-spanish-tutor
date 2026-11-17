import type { Interpretation } from '../interpretation';
import type { Sheet } from '../types';

/** A tiny invented sentence builder (not a teacher's): food, with one question. For tests of courses that hold several builders. */
export const FOOD_SHEET: Sheet = {
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

export const FOOD: Interpretation = {
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
