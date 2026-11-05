import { describe, expect, it } from 'vitest';
import { nextProbeStep, tagComprehension } from './comprehension';

describe('tagComprehension', () => {
  it('too fast: right slowly, wrong at normal speed', () => {
    expect(tagComprehension({ heardSlow: true, heardNormal: false, written: null })).toBe('too_fast');
  });
  it('thrown by context: knows the word alone at both speeds but missed the sentence', () => {
    expect(tagComprehension({ heardSlow: true, heardNormal: true, written: null })).toBe('thrown_by_context');
  });
  it('sound-spelling gap: misses the heard word but knows it written', () => {
    expect(tagComprehension({ heardSlow: false, heardNormal: null, written: true })).toBe('sound_spelling_gap');
  });
  it('word not known: misses it heard and written', () => {
    expect(tagComprehension({ heardSlow: false, heardNormal: null, written: false })).toBe('word_not_known');
  });
  it('gives no tag when a step is missing', () => {
    expect(tagComprehension({ heardSlow: true, heardNormal: null, written: null })).toBeNull();
    expect(tagComprehension({ heardSlow: false, heardNormal: null, written: null })).toBeNull();
  });
});

describe('nextProbeStep', () => {
  it('starts with the slow word', () => expect(nextProbeStep({})).toBe('heardSlow'));
  it('goes to normal speed after a slow success, then stops', () => {
    expect(nextProbeStep({ heardSlow: true })).toBe('heardNormal');
    expect(nextProbeStep({ heardSlow: true, heardNormal: false })).toBeNull();
  });
  it('shows the written word after a slow miss, then stops', () => {
    expect(nextProbeStep({ heardSlow: false })).toBe('written');
    expect(nextProbeStep({ heardSlow: false, written: true })).toBeNull();
  });
});
