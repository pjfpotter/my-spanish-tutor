import { deflateRawSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { buildDocx } from './fixture-docx';
import { inflateRaw, unzip } from './zip';

const enc = (s: string) => new TextEncoder().encode(s);
const dec = (u: Uint8Array) => new TextDecoder().decode(u);
const sample = Array.from({ length: 400 }, (_, i) => `línea ${i}: me gusta jugar al fútbol porque es divertido ${i % 7}`).join('\n');

describe('inflate', () => {
  it.each([0, 1, 6, 9])('matches zlib at level %i (stored, fixed and dynamic blocks)', (level) => {
    expect(dec(inflateRaw(deflateRawSync(enc(sample), { level })))).toBe(sample);
  });

  it('handles short and empty input', () => {
    expect(dec(inflateRaw(deflateRawSync(enc('a'))))).toBe('a');
    expect(dec(inflateRaw(deflateRawSync(enc(''))))).toBe('');
  });

  it('refuses damaged data', () => {
    expect(() => inflateRaw(Uint8Array.from([0xff, 0xff, 0xff, 0xff]))).toThrow();
  });
});

describe('unzip', () => {
  it('reads stored and deflated entries by name', () => {
    const files = unzip(buildDocx([{ p: [{ t: 'hola' }] }]));
    expect(Object.keys(files).sort()).toEqual(['[Content_Types].xml', 'word/document.xml']);
    expect(dec(files['word/document.xml'])).toContain('hola');
  });

  it('says plainly when the file is not a zip', () => {
    expect(() => unzip(enc('not a zip file at all, just text'))).toThrow('not a Word file');
  });
});
