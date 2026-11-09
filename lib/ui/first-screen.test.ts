import { describe, expect, it } from 'vitest';
import { fleschKincaidGrade } from '../privacy/readability';
import { FIRST_SCREEN } from './first-screen';

describe('first screen copy (19.6)', () => {
  it('offers the two choices in plain words, each with a one-line explanation', () => {
    expect(FIRST_SCREEN.signUp.label).toBe('Sign up for a new account');
    expect(FIRST_SCREEN.lost.label).toBe('I lost my account');
    for (const { hint } of Object.values(FIRST_SCREEN)) {
      expect(hint.split(/[.!?]+\s/).length).toBeLessThanOrEqual(2); // one line to read, not a paragraph
      expect(hint.length).toBeLessThanOrEqual(90);
    }
  });

  it('reads at or below a 12 to 13 year old\'s level (reading level 7 or lower)', () => {
    for (const { label, hint } of Object.values(FIRST_SCREEN)) {
      expect(fleschKincaidGrade(`${label}. ${hint}`)).toBeLessThanOrEqual(7);
    }
  });
});
