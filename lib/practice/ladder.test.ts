import { describe, expect, it, vi } from 'vitest';
import { chunksAsked, levelsFor, startLadder, stepLadder } from './ladder';
import { startHintTimer, hintText, type Clock } from './hint';
import { newMatch, tapTile, unlockMatch, toggleTile, newScramble, checkScramble, moveTile } from './safe-input';
import { kindOf, CHUNK_KINDS, KIND_LABEL } from './chunk-kind';

const good = { accuracy: 90, responseMs: 2000, blank: false };

describe('chunk ladder', () => {
  it('asks for 1, 2, 3 chunks then the whole answer, never more than exist', () => {
    expect(chunksAsked(1, 4)).toBe(1);
    expect(chunksAsked(3, 4)).toBe(3);
    expect(chunksAsked('all', 4)).toBe(4);
    expect(chunksAsked(3, 2)).toBe(2);
    expect(levelsFor(4)).toEqual([1, 2, 3, 'all']);
    expect(levelsFor(2)).toEqual([1, 'all']);
    expect(levelsFor(1)).toEqual(['all']);
  });
  it('moves up after the target is met twice, and can start higher', () => {
    let s = startLadder();
    s = stepLadder(s, good, false, 4);
    expect(s.at).toBe(0);
    s = stepLadder(s, good, false, 4);
    expect(s.at).toBe(1);
    expect(startLadder(2).at).toBe(2);
    expect(startLadder(9).at).toBe(3);
  });
  it('a slow or wrong answer resets the run but never moves down; blanks and assisted ones do nothing', () => {
    let s = { at: 1, met: 1 };
    expect(stepLadder(s, { accuracy: 90, responseMs: 9000, blank: false }, false, 4)).toEqual({ at: 1, met: 0 });
    expect(stepLadder(s, { accuracy: null, responseMs: null, blank: true }, false, 4)).toEqual({ at: 1, met: 1 });
    expect(stepLadder(s, good, true, 4)).toEqual({ at: 1, met: 1 });
  });
  it('stops at the top', () => {
    expect(stepLadder({ at: 3, met: 1 }, good, false, 4).at).toBe(3);
  });
});

describe('hint delay', () => {
  function fake(): Clock & { advance: (ms: number) => void } {
    let now = 0;
    const timers = new Map<number, { at: number; fn: () => void }>();
    let n = 0;
    return {
      setTimeout: (fn, ms) => { timers.set(++n, { at: now + ms, fn }); return n; },
      clearTimeout: (id) => void timers.delete(id as number),
      advance: (ms) => {
        now += ms;
        for (const [id, t] of [...timers]) if (t.at <= now) { timers.delete(id); t.fn(); }
      },
    };
  }
  it('shows the hint after 2.5 seconds of silence and not before', () => {
    const clock = fake();
    const onHint = vi.fn();
    startHintTimer(onHint, undefined, clock);
    clock.advance(2499);
    expect(onHint).not.toHaveBeenCalled();
    clock.advance(1);
    expect(onHint).toHaveBeenCalledTimes(1);
  });
  it('no hint if the student starts speaking in time', () => {
    const clock = fake();
    const onHint = vi.fn();
    startHintTimer(onHint, undefined, clock).cancel();
    clock.advance(10000);
    expect(onHint).not.toHaveBeenCalled();
  });
  it('the hint is the first words of the next chunk', () => {
    expect(hintText(['Me gusta', 'jugar al fútbol'], 1)).toBe('jugar al');
    expect(hintText(['Me gusta'], 1)).toBeNull();
  });
});

describe('rapid input', () => {
  it('ignores presses while a pair result is showing, so no unintended pair is registered', () => {
    let s = newMatch();
    s = tapTile(s, 'spanish', 'a').state;
    const r = tapTile(s, 'english', 'a');
    expect(r.result).toBe('match');
    s = r.state;
    const during = tapTile(s, 'spanish', 'b');
    expect(during.state).toBe(s);
    expect(during.result).toBeNull();
    s = unlockMatch(s);
    expect(s.matched).toEqual(['a']);
    expect(tapTile(s, 'spanish', 'a').state).toBe(s);
  });
  it('a mismatch counts a try but takes nothing away', () => {
    let s = tapTile(newMatch(), 'spanish', 'a').state;
    const r = tapTile(s, 'english', 'b');
    expect(r.result).toBe('mismatch');
    expect(r.state.matched).toEqual([]);
    expect(unlockMatch(r.state).wrongTries).toBe(1);
  });
  it('scramble: a tile places once, taps toggle it out, and checking waits for every tile', () => {
    let s = toggleTile(toggleTile(newScramble(), 'a'), 'b');
    expect(checkScramble(s, ['a', 'b', 'c'])).toBe('incomplete');
    s = toggleTile(s, 'c');
    expect(checkScramble(s, ['a', 'b', 'c'])).toBe('correct');
    s = moveTile(s, 'c', 0);
    expect(s.placed).toEqual(['c', 'a', 'b']);
    expect(checkScramble(s, ['a', 'b', 'c'])).toBe('wrong');
    expect(toggleTile({ ...s, locked: true }, 'a').placed).toEqual(s.placed);
  });
});

describe('chunk kinds', () => {
  it('maps feature tags to a kind, each with a word and a symbol as well as colour', () => {
    expect(kindOf({ featureTags: ['opinion', 'verb_phrase'] })).toBe('opinion');
    expect(kindOf({ featureTags: ['justification'] })).toBe('reason');
    expect(kindOf({ featureTags: ['connective'] })).toBe('link');
    expect(kindOf({ featureTags: ['adverb_phrase'] })).toBe('time');
    expect(kindOf({ featureTags: ['adjective'] })).toBe('detail');
    expect(kindOf({ featureTags: [] })).toBe('other');
    for (const k of CHUNK_KINDS) expect(KIND_LABEL[k].word && KIND_LABEL[k].symbol).toBeTruthy();
  });
});
