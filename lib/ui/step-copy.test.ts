import { describe, expect, it } from 'vitest';
import { PHASES } from '../phases/gate';
import { PASILLO_COPY, STAGE_TRY, STEP_COPY, WELCOME_COPY } from './step-copy';

describe('step copy', () => {
  const all = [...PHASES.flatMap((p) => Object.values(STEP_COPY[p])), ...Object.values(WELCOME_COPY), ...Object.values(PASILLO_COPY), ...Object.values(STAGE_TRY)];
  it('has what, why and next for every step', () => {
    for (const p of PHASES) for (const k of ['what', 'why', 'next'] as const) expect(STEP_COPY[p][k].length).toBeGreaterThan(5);
  });
  it('has one suggestion for each stage of El Pasillo', () => {
    expect(Object.keys(STAGE_TRY)).toEqual(['1', '2', '3', '4', '5']);
    for (const t of Object.values(STAGE_TRY)) expect(t.length).toBeGreaterThan(20);
  });
  it('stays short enough to read on a phone and never shows a hyphen-dash or abbreviation soup', () => {
    for (const t of all) {
      expect(t.length).toBeLessThanOrEqual(120);
      expect(t).not.toMatch(/ — | – /);
    }
  });
});
