import { describe, expect, it } from 'vitest';
import { isHotspot, locateChunks, missedChunks } from './chunks';
import { tagRecall } from './recall';

describe('tagRecall', () => {
  const base = { timed: false, untimedPassed: false, hotspot: false } as const;
  it('a timed failure after an untimed pass has no cause tag: nothing in the closed list fits, so none is guessed', () => {
    expect(tagRecall({ ...base, timed: true, untimedPassed: true })).toBeNull();
  });
  it('a timed failure before ever passing untimed is not known well enough yet', () => {
    expect(tagRecall({ ...base, timed: true })).toBe('not_known_well_enough');
  });
  it('an untimed failure is not known well enough', () => {
    expect(tagRecall(base)).toBe('not_known_well_enough');
  });
  it('a hotspot chunk in the answer wins over not known well enough', () => {
    expect(tagRecall({ ...base, hotspot: true })).toBe('chunk_hotspot');
  });
});

describe('locateChunks and missedChunks', () => {
  const chunks = [
    { id: 'a', spanish: 'Me gustaría ir' },
    { id: 'b', spanish: 'ir' },
    { id: 'c', spanish: 'al cine' },
  ];
  const answer = 'Me gustaría ir al cine. Prefiero ir solo.';
  it('finds chunks ignoring accents and capitals, and a word belongs to one chunk', () => {
    const found = locateChunks('me gustaria ir al cine', chunks);
    expect(found).toEqual([{ chunkId: 'a', start: 0, end: 3 }, { chunkId: 'c', start: 3, end: 5 }]);
  });
  it('finds a short chunk again where the longer one is absent', () => {
    expect(locateChunks(answer, chunks).map((l) => l.chunkId)).toEqual(['a', 'c', 'b']);
  });
  it('a chunk is missed if any of its words was missed', () => {
    const found = locateChunks('Me gustaría ir al cine', chunks);
    expect(missedChunks(found, new Set([4]))).toEqual([{ chunkId: 'a', missed: false }, { chunkId: 'c', missed: true }]);
  });
});

describe('isHotspot', () => {
  it('is a hotspot after three misses', () => expect(isHotspot([true, false, true, true])).toBe(true));
  it('is not a hotspot after two misses', () => expect(isHotspot([true, true, false])).toBe(false));
  it('clears after three hits in a row', () => expect(isHotspot([true, true, true, false, false, false])).toBe(false));
  it('stays a hotspot after only two hits', () => expect(isHotspot([true, true, true, false, false])).toBe(true));
});
