import { describe, expect, it } from 'vitest';
import { buildBuilder } from './builder';
import { prepare } from './engine';
import { fallbackInterpretation, checkAnswerCodes } from './fallback';
import { FIXTURES } from './fixture-docx';
import type { Interpretation } from './interpretation';
import { readDocx } from './read-docx';
import { FREE_TIME, FREE_TIME_SHEET } from './samples/free-time';
import type { Sheet } from './types';
import { lintEnglish, lintSpanish, readingSize, verifyBuilder, type CheckName } from './verify';
import { validateInterpretation } from './validate';
import { mkAns } from './engine';

const build = (sheet: Sheet, interp: Interpretation) => prepare(buildBuilder('v', sheet, interp));
const sheetWith = (edit: (s: Sheet) => void): Sheet => { const s = structuredClone(FREE_TIME_SHEET); edit(s); return s; };
const item = (s: Sheet, col: number, es: string) => s.tables[0].cells[col].items.find((i) => i.es === es)!;
const checks = (sheet: Sheet, interp: Interpretation = FREE_TIME): CheckName[] => verifyBuilder(build(sheet, interp), { walks: 60, sheet }).failures.map((f) => f.check);

describe('verification gate (task 3.1)', () => {
  it('passes the free-time sample and does not flag its good sentences', () => {
    const v = verifyBuilder(build(FREE_TIME_SHEET, FREE_TIME), { walks: 100, sheet: FREE_TIME_SHEET });
    expect(v.failures).toEqual([]);
    expect(v.ok).toBe(true);
    expect(v.stats.pairs).toBeGreaterThan(1000);
    expect(v.stats.blocked).toBeGreaterThan(0);
    expect(v.stats.allowed + v.stats.blocked).toBe(v.stats.pairs);
  });

  it('catches a draft that lets an answer end half-built ("porque…")', () => {
    const i = structuredClone(FREE_TIME);
    i.together = []; i.frames[0].core = ['starter', 'activity'];
    i.slots = i.slots.map((s) => (s.key === 'reason' ? { ...s, accepts: ['never'] } : s));
    expect(checks(FREE_TIME_SHEET, i)).toContain('fragment');
  });

  it('catches Spanish left in English where the sheet has no gloss', () => {
    const s = sheetWith((x) => { item(x, 1, 'bailar').en = null; });
    expect(checks(s)).toContain('spanish-in-english');
  });

  it('catches a repeated word and a wrong article in English', () => {
    expect(checks(sheetWith((x) => { item(x, 1, 'bailar').en = 'to dance dance'; }))).toContain('repeated-word');
    expect(checks(sheetWith((x) => { item(x, 1, 'cocinar').en = 'to cook an dinner'; }))).toContain('article');
  });

  it('catches known teacher slips', () => {
    expect(checks(sheetWith((x) => { item(x, 3, 'es caro').es = 'es caro, el pared'; }))).toContain('known-typo');
  });

  it('catches a stray capital and bad punctuation inside a sentence', () => {
    expect(checks(sheetWith((x) => { item(x, 1, 'bailar').es = 'bailar Mucho'; }))).toContain('capital');
    expect(checks(sheetWith((x) => { item(x, 1, 'bailar').es = 'bailar..'; }))).toContain('punctuation');
  });

  it('catches typed text that does not read back', () => {
    const i = structuredClone(FREE_TIME); i.ignore = [];
    expect(checks(FREE_TIME_SHEET, i)).toContain('round-trip');
  });

  it('catches a required part with nothing to pick', () => {
    const i = structuredClone(FREE_TIME);
    i.slots = i.slots.map((s) => (s.key === 'activity' ? { ...s, accepts: ['nothing'] } : s));
    expect(checks(FREE_TIME_SHEET, i)).toContain('dead-end');
  });

  it('checks reading size from the table\'s own widths, and fires when the minimum zoom would be too small', () => {
    const sheet = readDocx(FIXTURES.merged());
    const B = build(sheet, fallbackInterpretation(sheet, 'merged'));
    expect(readingSize(B, sheet, 340)).toEqual([]);
    expect(readingSize(B, sheet, 340, 0.5).join(' ')).toContain('Spanish text is');
  });

  it('reports each failure with a count and examples', () => {
    const s = sheetWith((x) => { item(x, 1, 'bailar').en = 'to dance dance'; });
    const f = verifyBuilder(build(s, FREE_TIME), { walks: 20 }).failures.find((x) => x.check === 'repeated-word')!;
    expect(f.count).toBeGreaterThan(0);
    expect(f.examples.length).toBeGreaterThan(0);
    expect(f.examples[0]).toContain('dance dance');
  });
});

describe('lints', () => {
  it('flags dangling endings but not words that merely end in "a"', () => {
    expect(lintSpanish('Me gusta mi dormitorio porque es.')).toContain('fragment');
    expect(lintSpanish('El año pasado fui a España.')).toEqual([]);
    expect(lintSpanish('Fui a la playa.')).toEqual([]);
  });
  it('accepts clean English and flags leftover Spanish', () => {
    expect(lintEnglish('Last year I went to Spain with my friends.')).toEqual([]);
    expect(lintEnglish('Los domingos on my computer I download apps.')).toContain('spanish-in-english');
  });
});

describe('the safe fallback (task 3.2)', () => {
  const sheet = readDocx(FIXTURES.boldBrackets());
  const interp = fallbackInterpretation(sheet, 'Boring sheet');

  it('is a valid interpretation of any sheet the reader can read', () => {
    expect(validateInterpretation(sheet, interp)).toEqual([]);
    expect(interp.slots.length).toBe(2);
  });

  it('gives students a working sheet with no model: pick chunks in order and read the sentence', () => {
    const B = build(sheet, interp);
    const a = mkAns(B, { p0: 'Me gusta', p1: 'bailar' });
    expect(checkAnswerCodes(B, a)).toEqual({ code: 'unchecked' });
    expect(B.slots.map((s) => s.key)).toEqual(['p0', 'p1']);
  });

  it('says an answer is incomplete when nothing is chosen, and uses a model verdict when there is one', () => {
    const B = build(sheet, interp);
    expect(checkAnswerCodes(B, {}).code).toBe('incomplete');
    expect(checkAnswerCodes(B, mkAns(B, { p0: 'Me gusta' }), undefined, () => 'ok').code).toBe('ok');
  });
});
