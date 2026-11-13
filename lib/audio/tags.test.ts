import { describe, expect, it } from 'vitest';
import { wordsFromAlignment, type CharAlignment } from '../tele/alignment';
import { sourceHash } from './manifest';
import { tagSentences, withoutAdded } from './tags';

const align = (text: string): CharAlignment => ({
  characters: [...text], character_start_times_seconds: [...text].map((_, i) => i / 10), character_end_times_seconds: [...text].map((_, i) => (i + 1) / 10),
});

describe('tagging every sentence', () => {
  it('puts the tag at the start of each sentence and nowhere else', () => {
    expect(tagSentences('Me gusta el cine. Voy los sábados.', '[very slowly]').text).toBe('[very slowly] Me gusta el cine. [very slowly] Voy los sábados.');
    expect(tagSentences('¿Qué haces?', '[very slowly]').text).toBe('[very slowly] ¿Qué haces?');
  });
  it('does nothing without a tag', () => {
    expect(tagSentences('Hola.', '')).toEqual({ text: 'Hola.', added: [false, false, false, false, false] });
  });
  it('takes the tags back out of the timings, so the words and their times are those of the original text', () => {
    const t = tagSentences('Hola amigo. Adiós.', '[very slowly]');
    const clean = wordsFromAlignment(withoutAdded(align(t.text), t)).words.map((w) => w.text);
    expect(clean).toEqual(['Hola', 'amigo.', 'Adiós.']);
  });
  it('refuses timings that are not for the text that was sent', () => {
    const t = tagSentences('Hola.', '[very slowly]');
    expect(() => withoutAdded(align('Hola.'), t)).toThrow();
  });
  it('changes the clip\'s source hash only when a tag is used, so untagged clips stay as they are', () => {
    expect(sourceHash('Hola.', 'v', 'm', 1)).toBe(sourceHash('Hola.', 'v', 'm', 1, undefined));
    expect(sourceHash('Hola.', 'v', 'm', 1, '[very slowly]')).not.toBe(sourceHash('Hola.', 'v', 'm', 1));
  });
});
