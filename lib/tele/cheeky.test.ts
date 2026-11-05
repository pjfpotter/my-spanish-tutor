import { describe, expect, it } from 'vitest';
import { CHEEKY_POOL } from './cheeky';
import { PHRASE_BANK } from './phrase-bank';

describe('cheeky pool content (task 13.5)', () => {
  it('has distinct ids and Spanish, none shared with the main bank', () => {
    expect(new Set(CHEEKY_POOL.map((l) => l.id)).size).toBe(CHEEKY_POOL.length);
    const main = new Set(PHRASE_BANK.flatMap((l) => [l.id, l.es]));
    for (const l of CHEEKY_POOL) { expect(main.has(l.id), l.id).toBe(false); expect(main.has(l.es), l.es).toBe(false); }
  });
  it('is short, has an English subtitle and a feeling, and carries no digits, names or placeholders', () => {
    for (const l of CHEEKY_POOL) {
      expect(l.es.length, l.id).toBeLessThanOrEqual(60);
      expect(l.en.length, l.id).toBeGreaterThan(0);
      expect(Object.keys(l.feelings).length, l.id).toBeGreaterThan(0);
      expect(l.es, l.id).not.toMatch(/\d|@|\{|\}/);
    }
  });
  it('never teases the student, their speaking or their mistakes, and stays off teachers and swearing', () => {
    const banned = /\b(tú|tu|tus|eres|hablas|acento|error|fallo|mal|tonto|tonta|idiota|profe|profesor|profesora|maestro|maldit|mierda|joder|co[ñn]o)\b/i;
    for (const l of CHEEKY_POOL) expect(l.es, l.id).not.toMatch(banned);
  });
});
