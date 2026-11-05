import { describe, expect, it } from 'vitest';
import { syllabify, syllableDisplay } from './syllables';

const split = (w: string) => syllabify(w).syllables.join('-');

describe('syllabify', () => {
  it('splits plain consonant-vowel words', () => {
    expect(split('casa')).toBe('ca-sa');
    expect(split('hablar')).toBe('ha-blar');
    expect(split('animal')).toBe('a-ni-mal');
  });

  it('keeps diphthongs together', () => {
    expect(split('bueno')).toBe('bue-no');
    expect(split('ciudad')).toBe('ciu-dad');
    expect(split('pausa')).toBe('pau-sa');
    expect(split('estudiar')).toBe('es-tu-diar');
    expect(split('Uruguay')).toBe('U-ru-guay');
  });

  it('splits hiatus: two strong vowels, or an accented weak vowel', () => {
    expect(split('leer')).toBe('le-er');
    expect(split('museo')).toBe('mu-se-o');
    expect(split('día')).toBe('dí-a');
    expect(split('baúl')).toBe('ba-úl');
    expect(split('oír')).toBe('o-ír');
  });

  it('treats h as silent for stress but a consonant for splitting', () => {
    expect(split('hola')).toBe('ho-la');
    expect(split('ahora')).toBe('a-ho-ra');
    expect(split('prohibir')).toBe('pro-hi-bir');
    expect(split('deshacer')).toBe('des-ha-cer');
  });

  it('keeps qu and gu with their consonant, and sounds the ü', () => {
    expect(split('queso')).toBe('que-so');
    expect(split('quiero')).toBe('quie-ro');
    expect(split('guitarra')).toBe('gui-ta-rra');
    expect(split('guerra')).toBe('gue-rra');
    expect(split('pingüino')).toBe('pin-güi-no');
    expect(split('agua')).toBe('a-gua');
  });

  it('never splits ll, ch or rr', () => {
    expect(split('calle')).toBe('ca-lle');
    expect(split('muchacho')).toBe('mu-cha-cho');
    expect(split('perro')).toBe('pe-rro');
  });

  it('keeps consonant clusters with the next syllable', () => {
    expect(split('libro')).toBe('li-bro');
    expect(split('padre')).toBe('pa-dre');
    expect(split('inglés')).toBe('in-glés');
    expect(split('abrir')).toBe('a-brir');
    expect(split('compra')).toBe('com-pra');
    expect(split('instrumento')).toBe('ins-tru-men-to');
  });

  it('splits other consonant pairs down the middle', () => {
    expect(split('puerta')).toBe('puer-ta');
    expect(split('escuela')).toBe('es-cue-la');
    expect(split('perfecto')).toBe('per-fec-to');
    expect(split('atlas')).toBe('at-las');
  });

  it('treats final y as a vowel in the syllable', () => {
    expect(split('muy')).toBe('muy');
    expect(split('hoy')).toBe('hoy');
    expect(split('estoy')).toBe('es-toy');
    expect(split('y')).toBe('y');
    expect(split('playa')).toBe('pla-ya');
  });

  it('handles one-syllable and empty input', () => {
    expect(syllabify('sol')).toEqual({ syllables: ['sol'], stress: 0 });
    expect(syllabify('')).toEqual({ syllables: [], stress: 0 });
    expect(syllabify('¡Hola!').syllables).toEqual(['Ho', 'la']);
  });

  it('keeps the original capitals and the ñ', () => {
    expect(split('España')).toBe('Es-pa-ña');
  });
});

describe('stress', () => {
  it('uses the written accent first', () => {
    expect(syllabify('inglés').stress).toBe(1);
    expect(syllabify('teléfono').stress).toBe(1);
    expect(syllabify('música').stress).toBe(0);
    expect(syllabify('día').stress).toBe(0);
  });

  it('stresses the second from last syllable after a vowel, n or s', () => {
    expect(syllabify('casa').stress).toBe(0);
    expect(syllabify('hablan').stress).toBe(0);
    expect(syllabify('lunes').stress).toBe(0);
  });

  it('stresses the last syllable after other consonants', () => {
    expect(syllabify('hablar').stress).toBe(1);
    expect(syllabify('ciudad').stress).toBe(1);
    expect(syllabify('animal').stress).toBe(2);
  });

  it('counts a final y as a consonant for stress', () => {
    expect(syllabify('estoy').stress).toBe(1);
  });

  it('shows the stressed syllable in capitals', () => {
    expect(syllableDisplay('hablar')).toBe('ha-BLAR');
    expect(syllableDisplay('casa')).toBe('CA-sa');
    expect(syllableDisplay('teléfono')).toBe('te-LÉ-fo-no');
  });
});
