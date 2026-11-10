import { describe, expect, it } from 'vitest';
import { saidChunks } from './chunk-said';
import { isNewBestMs, parseLadder } from './device-store';
import { scoreAttempt } from '../speech/score';

describe('chunks said', () => {
  const pieces = [
    { text: 'Me gustan las películas de', kind: 'opinion' as const },
    { text: 'acción', kind: 'other' as const },
    { text: 'porque son divertidas', kind: 'reason' as const },
  ];
  const script = pieces.map((p) => p.text).join(' ');

  it('marks every chunk said when every word was understood', () => {
    expect(saidChunks(pieces, scoreAttempt(script, script)).map((c) => c.said)).toEqual([true, true, true]);
  });
  it('a chunk counts only if all of its words were understood', () => {
    const heard = 'me gustan las películas de acción porque son';
    expect(saidChunks(pieces, scoreAttempt(script, heard)).map((c) => c.said)).toEqual([true, true, false]);
  });
  it('shows only the chunks said, in order, when the student stops partway', () => {
    expect(saidChunks(pieces, scoreAttempt(script, 'me gustan las películas de')).map((c) => c.said)).toEqual([true, false, false]);
  });
  it('says nothing was said for silence', () => {
    expect(saidChunks(pieces, scoreAttempt(script, '')).every((c) => !c.said)).toBe(true);
  });
  it('a stub recogniser that hears the whole answer reveals each chunk with its kind', () => {
    const out = saidChunks(pieces, scoreAttempt(script, script));
    expect(out.map((c) => c.kind)).toEqual(['opinion', 'other', 'reason']);
  });
});

describe('device store', () => {
  it('reads a saved ladder level safely, whatever is in storage', () => {
    expect(parseLadder('{"at":2,"met":1}', 4)).toEqual({ at: 2, met: 1 });
    expect(parseLadder('{"at":9,"met":1}', 4).at).toBe(3);
    expect(parseLadder('{"at":-3}', 4)).toEqual({ at: 0, met: 0 });
    expect(parseLadder('not json', 4)).toEqual({ at: 0, met: 0 });
    expect(parseLadder(null, 4)).toEqual({ at: 0, met: 0 });
  });
  it('a personal best needs an earlier time to beat', () => {
    expect(isNewBestMs(null, 1000)).toBe(false);
    expect(isNewBestMs(2000, 1500)).toBe(true);
    expect(isNewBestMs(2000, 2000)).toBe(false);
  });
});
