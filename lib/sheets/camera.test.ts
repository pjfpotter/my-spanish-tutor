import { describe, expect, it } from 'vitest';
import { clampCam, focusCam, overviewCam, overviewScale, runsBelow, SMIN, union, zoomAbout } from './camera';

const [vw, vh, pw, ph] = [340, 330, 980, 1200];

describe('guided camera maths', () => {
  it('shows the whole page in the overview, far too small to read (the problem the camera solves)', () => {
    const c = overviewCam(vw, vh, pw, ph);
    expect(c.s).toBeCloseTo(overviewScale(vw, vh, pw, ph));
    expect(17 * c.s).toBeLessThan(8);
  });

  it('never zooms a column below the readable minimum, however wide it is', () => {
    const wide = focusCam({ x: 0, y: 0, w: 940, h: 80 }, vw, vh, pw, ph);
    expect(wide.s).toBeCloseTo(SMIN);
    expect(17 * wide.s).toBeGreaterThanOrEqual(14);
  });

  it('frames a narrow column with room beside it for the next one', () => {
    const c = focusCam({ x: 20, y: 100, w: 180, h: 300 }, vw, vh, pw, ph);
    expect(c.s).toBeCloseTo(1.15);
    expect(180 * c.s).toBeLessThan(vw - 24);
  });

  it('keeps the page within reach when panning', () => {
    const c = clampCam({ s: 1, x: 500, y: 500 }, vw, vh, pw, ph);
    expect(c.x).toBeLessThanOrEqual(8);
    expect(c.y).toBeLessThanOrEqual(8);
    const far = clampCam({ s: 1, x: -5000, y: -5000 }, vw, vh, pw, ph);
    expect(far.x).toBeGreaterThanOrEqual(vw - pw - 8);
  });

  it('zooms about a point and keeps that point still', () => {
    const c0 = { s: 1, x: -100, y: -100 }, c1 = zoomAbout(c0, 170, 160, 1.5, vw, vh, pw, ph);
    expect((170 - c0.x) / c0.s).toBeCloseTo((170 - c1.x) / c1.s);
  });

  it('knows when a column runs past the bottom, and takes the union of several', () => {
    const r = { x: 0, y: 0, w: 100, h: 900 };
    expect(runsBelow(r, { s: 1, x: 0, y: 0 }, 330)).toBe(true);
    expect(runsBelow({ x: 0, y: 0, w: 100, h: 100 }, { s: 1, x: 0, y: 0 }, 330)).toBe(false);
    expect(union([{ x: 0, y: 10, w: 50, h: 50 }, { x: 40, y: 0, w: 50, h: 20 }])).toEqual({ x: 0, y: 0, w: 90, h: 60 });
  });
});
