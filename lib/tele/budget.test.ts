import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { TELE_MAX_DPR, TELE_MAX_FPS } from './draw';

const doc = readFileSync(path.join(import.meta.dirname, '../../docs/performance-budget.md'), 'utf8');

describe('Tele performance budget', () => {
  it('draws at most 30 frames a second at a pixel ratio of at most 1.5', () => {
    expect(TELE_MAX_FPS).toBeLessThanOrEqual(30);
    expect(TELE_MAX_DPR).toBeLessThanOrEqual(1.5);
  });

  it('matches what docs/performance-budget.md says', () => {
    expect(doc).toContain(`at most ${TELE_MAX_FPS} frames a second`);
    expect(doc).toContain(`| Tele canvas pixel ratio | at most ${TELE_MAX_DPR} |`);
  });
});
