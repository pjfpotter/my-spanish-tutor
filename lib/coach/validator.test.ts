import { describe, expect, it } from 'vitest';
import { SEED_COURSE } from '../course/seed';
import { ALLOWED_COMMON_WORDS } from './allowed-words';
import { tokens } from './rubric';
import { buildWordBank, checkAgainstBank, validateDraft } from './validator';

const bank = buildWordBank(SEED_COURSE.chunks);
const out = (text: string) => checkAgainstBank(text, bank).outOfBank.map((o) => o.word);

describe('word-bank validator (task 7.2)', () => {
  it('accepts words from the sentence builder', () => {
    expect(checkAgainstBank('Me encantan las películas de miedo porque son muy divertidas.', bank)).toEqual({ ok: true, outOfBank: [] });
  });

  it('catches words that are not in the builder', () => {
    expect(out('Me gustan las películas de superhéroes.')).toEqual(['superheroes']);
    expect(out('Me gusta mucho el baloncesto.')).toEqual(['mucho', 'baloncesto']);
  });

  it('catches English words and numbers', () => {
    expect(out('Me gustan las películas de acción and horror.')).toEqual(['and', 'horror']);
    expect(out('Tengo 13 años.')).toEqual(expect.arrayContaining(['13']));
  });

  it('reports each word\'s position, so it can be replaced in place', () => {
    const { outOfBank } = checkAgainstBank('Me gustan las películas de superhéroes.', bank);
    expect(outOfBank).toEqual([{ word: 'superheroes', index: 5, suggestion: null }]);
  });

  it('ignores capitals, accents and punctuation', () => {
    expect(out('¡ME GUSTAN LAS PELICULAS DE ACCION!')).toEqual([]);
    expect(out('Me gustan las películas de acción...')).toEqual([]);
    expect(out('año')).toEqual([]); // año is in the builder; "ano" would not be
    expect(out('ano')).toEqual(['ano']);
  });

  it('allows the common function words on top of the builder', () => {
    expect(out('Yo y mis amigos, pero no el cine.')).toEqual([]);
  });

  it('does not let content words in through the common list', () => {
    for (const w of ['jugar', 'casa', 'bonito', 'pelicula', 'comer']) expect(ALLOWED_COMMON_WORDS).not.toContain(w);
  });

  it('suggests the nearest builder word when one is close, and nothing when none is', () => {
    const miss = checkAgainstBank('Me gustan las películas de acciones.', bank).outOfBank[0];
    expect(miss).toMatchObject({ word: 'acciones', suggestion: 'accion' });
    expect(checkAgainstBank('Llevo unos vaqueros azules.', bank).outOfBank).toEqual([{ word: 'azules', index: 3, suggestion: 'azul' }]);
    expect(checkAgainstBank('Me gustan las películas de superhéroes.', bank).outOfBank[0].suggestion).toBeNull();
    // Very short words never get a suggestion: "mi" is not "me".
    expect(checkAgainstBank('mu', bank).outOfBank[0].suggestion).toBeNull();
  });

  it('keeps the allowed list small and tidy', () => {
    expect(ALLOWED_COMMON_WORDS.length).toBeLessThan(70);
    for (const w of ALLOWED_COMMON_WORDS) expect(tokens(w)).toEqual([w]); // lowercase, no accents, one word
    expect(new Set(ALLOWED_COMMON_WORDS).size).toBe(ALLOWED_COMMON_WORDS.length);
  });
});

describe('offering a draft', () => {
  it('offers a draft with no out-of-bank words', () => {
    expect(validateDraft('Me gustan las películas de acción.', bank)).toMatchObject({ offer: true, reason: null });
  });

  it('does not offer a draft with any out-of-bank word, and says which', () => {
    const r = validateDraft('Me gustan las películas de superhéroes porque son geniales.', bank);
    expect(r.offer).toBe(false);
    expect(r.reason).toMatch(/superheroes/);
    expect(r.reason).toMatch(/geniales/);
  });

  it('does not offer an empty draft', () => {
    expect(validateDraft('   ', bank).offer).toBe(false);
  });

  it('offers every one of the course\'s model answers', () => {
    for (const a of SEED_COURSE.modelAnswers) {
      const r = validateDraft(a.text, bank);
      expect(r.offer, `${a.text} → ${r.reason}`).toBe(true);
    }
  });
});
