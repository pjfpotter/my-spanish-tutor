/**
 * The guided camera's maths (task 5.1). The sheet is drawn at a fixed width and zoomed to the column the
 * student needs, so a printed A4 page stays readable on a phone. Pure functions, no DOM.
 */
export interface Cam { s: number; x: number; y: number }
export interface Rect { x: number; y: number; w: number; h: number }
/** The smallest and largest zoom used when following the guide: Spanish text never drops under 14 px. */
export const SMIN = 0.86;
export const SMAX = 1.15;
const PAD = 8;

export const overviewScale = (vw: number, vh: number, pw: number, ph: number) => Math.min((vw - 2 * PAD) / pw, (vh - 2 * PAD) / ph);

export function clampCam(c: Cam, vw: number, vh: number, pw: number, ph: number): Cam {
  const cw = pw * c.s, ch = ph * c.s;
  return {
    s: c.s,
    x: cw <= vw - 2 * PAD ? (vw - cw) / 2 : Math.min(PAD, Math.max(vw - cw - PAD, c.x)),
    y: ch <= vh - 2 * PAD ? (vh - ch) / 2 : Math.min(PAD, Math.max(vh - ch - PAD, c.y)),
  };
}

export function overviewCam(vw: number, vh: number, pw: number, ph: number): Cam {
  const s = overviewScale(vw, vh, pw, ph);
  return { s, x: (vw - pw * s) / 2, y: (vh - ph * s) / 2 };
}

/** Frames a rectangle of the sheet: wide enough to read, with the next column peeking in, below the prompt. */
export function focusCam(r: Rect, vw: number, vh: number, pw: number, ph: number): Cam {
  const s = Math.max(overviewScale(vw, vh, pw, ph), Math.min(SMAX, Math.max(SMIN, (vw - 24) / r.w)));
  return clampCam({ s, x: 12 - r.x * s, y: 48 - r.y * s }, vw, vh, pw, ph);
}

export function zoomAbout(c: Cam, px: number, py: number, s2: number, vw: number, vh: number, pw: number, ph: number): Cam {
  const k = s2 / c.s;
  return clampCam({ s: s2, x: px - (px - c.x) * k, y: py - (py - c.y) * k }, vw, vh, pw, ph);
}

export const union = (rs: Rect[]): Rect => {
  const x0 = Math.min(...rs.map((r) => r.x)), y0 = Math.min(...rs.map((r) => r.y)), x1 = Math.max(...rs.map((r) => r.x + r.w)), y1 = Math.max(...rs.map((r) => r.y + r.h));
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
};
/** Whether a framed rectangle runs past the bottom of the view, so a "more below" hint is needed. */
export const runsBelow = (r: Rect, c: Cam, vh: number) => (r.y + r.h) * c.s + c.y > vh - 10;
