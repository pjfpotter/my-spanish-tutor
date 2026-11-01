import { describe, expect, it } from 'vitest';
import { estimateTimeline, pickLine, PLACEHOLDER_LINES, wordsOf } from './lines';

describe('placeholder lines', () => {
  it('each has Spanish, an English subtitle and a feeling, and ids are unique', () => {
    const ids = new Set(PLACEHOLDER_LINES.map((l) => l.id));
    expect(ids.size).toBe(PLACEHOLDER_LINES.length);
    for (const l of PLACEHOLDER_LINES) {
      expect(l.es.trim()).not.toBe('');
      expect(l.en.trim()).not.toBe('');
      expect(Object.keys(l.feelings).length).toBeGreaterThan(0);
      expect(l.es).not.toBe(l.en); // the spoken line is Spanish, English is the subtitle
    }
  });
});

describe('pickLine', () => {
  it('never repeats the line just played', () => {
    for (const last of PLACEHOLDER_LINES.map((l) => l.id)) {
      for (let i = 0; i < 40; i++) expect(pickLine(PLACEHOLDER_LINES, last).id).not.toBe(last);
    }
  });

  it('can reach every other line', () => {
    const seen = new Set<string>();
    for (let i = 0; i < PLACEHOLDER_LINES.length - 1; i++) {
      seen.add(pickLine(PLACEHOLDER_LINES, 'hola', () => i / (PLACEHOLDER_LINES.length - 1)).id);
    }
    expect(seen.size).toBe(PLACEHOLDER_LINES.length - 1);
    expect(seen.has('hola')).toBe(false);
  });

  it('copes with a single line', () => {
    expect(pickLine([PLACEHOLDER_LINES[0]], PLACEHOLDER_LINES[0].id).id).toBe(PLACEHOLDER_LINES[0].id);
  });
});

describe('estimateTimeline', () => {
  it('times every word in order and ends after the last one', () => {
    const line = PLACEHOLDER_LINES[0];
    const tl = estimateTimeline(line);
    expect(tl.words.map((w) => w.text)).toEqual(wordsOf(line.es));
    for (let i = 1; i < tl.words.length; i++) expect(tl.words[i].t0).toBeGreaterThan(tl.words[i - 1].t0);
    expect(tl.end).toBeGreaterThan(tl.words.at(-1)!.t0);
    expect(tl.feelings?.[0].feelings).toEqual(line.feelings);
  });
});
