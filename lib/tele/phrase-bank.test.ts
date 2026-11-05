import { describe, expect, it } from 'vitest';
import { EMOTIONS } from './feelings';
import { PHRASE_BANK, SITUATIONS, linesFor } from './phrase-bank';
import { PLACEHOLDER_LINES } from './lines';

describe('phrase bank', () => {
  it('has at least one line for every situation key, and two or more for the repeating ones', () => {
    for (const s of SITUATIONS) expect(linesFor(s).length, s).toBeGreaterThan(0);
    for (const s of ['correct', 'wrong', 'welcome_back', 'poke', 'nervous', 'session_end'] as const) {
      expect(linesFor(s).length, s).toBeGreaterThanOrEqual(2); // so a line can avoid an immediate repeat
    }
  });

  it('has unique ids and unique Spanish text', () => {
    expect(new Set(PHRASE_BANK.map((l) => l.id)).size).toBe(PHRASE_BANK.length);
    expect(new Set(PHRASE_BANK.map((l) => l.es)).size).toBe(PHRASE_BANK.length);
  });

  it('gives every line an English subtitle that is different text, and a valid feeling', () => {
    for (const l of PHRASE_BANK) {
      expect(l.en.trim(), l.id).not.toBe('');
      expect(l.en, l.id).not.toBe(l.es);
      expect(Object.keys(l.feelings).length, l.id).toBeGreaterThan(0);
      for (const [k, v] of Object.entries(l.feelings)) {
        expect((EMOTIONS as readonly string[]).includes(k), `${l.id}: ${k}`).toBe(true);
        expect(v!).toBeGreaterThanOrEqual(0);
        expect(v!).toBeLessThanOrEqual(1);
      }
    }
  });

  it('keeps lines short enough to read in a caption window and to voice cheaply', () => {
    for (const l of PHRASE_BANK) expect(l.es.length, l.id).toBeLessThanOrEqual(60);
  });

  it('keeps no student data: no digits, no names, no addresses to the student by name', () => {
    for (const l of PHRASE_BANK) expect(l.es, l.id).not.toMatch(/\d|@|\{|\}/);
  });

  it('keeps the exact text of the clip already built, so it is not paid for again', () => {
    const hola = PHRASE_BANK.find((l) => l.id === 'hola')!;
    expect(hola.es).toBe(PLACEHOLDER_LINES.find((l) => l.id === 'hola')!.es);
  });
});
