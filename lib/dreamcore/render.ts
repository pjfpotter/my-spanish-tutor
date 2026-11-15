import type { Scene, Zone } from './doors';

/**
 * A tiny software renderer for the dreamcore corridor. It draws a 200 by 300 (portrait, for a phone) picture a pixel at a time into one
 * buffer, then reduces it to a dithered six-levels-per-channel palette, so it looks like a 2003 cover-disc game.
 * No libraries, no textures to download: every surface is a formula. The corridor is the same at every depth, so
 * which surface each pixel sees is worked out once and only the texture lookup runs per frame.
 */
export const W = 200;
export const H = 300;
const F = 120; // focal length in pixels: a narrow lens so a door fits on screen
const HALF_W = 2; // corridor half width
const HALF_H = 1.5; // camera is 1.5 above the floor and 1.5 below the ceiling
export const DOOR_STOP = 2; // the camera stops this far from a door
const DOOR_HALF = 0.7;
const DOOR_TOP = -0.6;

export interface Frame {
  t: number;
  camZ: number;
  /** 1 looking ahead, -1 looking behind. */
  dir: 1 | -1;
  /** World depth of the door ahead, or null for none. */
  doorZ: number | null;
  /** 0 shut, 1 wide open. */
  open: number;
  scene: Scene;
  zone: Zone;
  /** How far away the thing is, 0 to 1. */
  gap: number;
  /** Light flicker 0 to 1. */
  flick: number;
  /** Glitch strength 0 to 1. */
  glitch: number;
  /** Zoom of the face in the catch, or -1 for none. */
  scare: number;
  /** Seconds the thing is allowed to show while the student looks behind, 0 to 1. */
  seen: number;
  calm: boolean;
}

type RGB = readonly [number, number, number];
interface Theme { w1: RGB; w2: RGB; dado: RGB; fa: RGB; fb: RGB; ceil: RGB; fog: RGB; floor: 0 | 1 | 2; grid: boolean }
const THEMES: Record<Zone, Theme> = {
  pink: { w1: [233, 163, 201], w2: [221, 140, 186], dado: [184, 98, 143], fa: [190, 98, 146], fb: [168, 80, 128], ceil: [240, 225, 232], fog: [58, 22, 70], floor: 0, grid: false },
  yellow: { w1: [226, 206, 120], w2: [212, 190, 100], dado: [160, 140, 70], fa: [150, 120, 60], fb: [134, 106, 48], ceil: [236, 232, 200], fog: [60, 50, 20], floor: 0, grid: false },
  pool: { w1: [150, 215, 225], w2: [132, 200, 214], dado: [92, 160, 180], fa: [112, 192, 206], fb: [92, 170, 190], ceil: [235, 245, 250], fog: [16, 58, 84], floor: 1, grid: true },
  sky: { w1: [196, 218, 255], w2: [176, 204, 250], dado: [140, 176, 238], fa: [246, 249, 255], fb: [226, 236, 252], ceil: [120, 178, 255], fog: [205, 228, 255], floor: 2, grid: false },
};

// Pixel geometry, worked out once. plane: 0 floor, 1 ceiling, 2 left wall, 3 right wall.
const N = W * H;
const plane = new Uint8Array(N);
const tAt = new Float32Array(N);
const uAt = new Float32Array(N);
const dxAt = new Float32Array(N);
const dyAt = new Float32Array(N);
(() => {
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const dx = (x + 0.5 - W / 2) / F;
      const dy = (y + 0.5 - H / 2) / F;
      dxAt[i] = dx;
      dyAt[i] = dy;
      let t = 1e9;
      let p = 0;
      if (dy > 1e-4) { t = HALF_H / dy; p = 0; }
      else if (dy < -1e-4) { t = -HALF_H / dy; p = 1; }
      if (dx > 1e-4 && HALF_W / dx < t) { t = HALF_W / dx; p = 3; }
      else if (dx < -1e-4 && -HALF_W / dx < t) { t = -HALF_W / dx; p = 2; }
      if (t > 70) t = 70;
      plane[i] = p;
      tAt[i] = t;
      uAt[i] = p < 2 ? dx * t : dy * t;
    }
  }
})();

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const bayerAt = (x: number, y: number) => BAYER[(y & 3) * 4 + (x & 3)] / 16;
const frac = (v: number) => v - Math.floor(v);
function hash(x: number, y: number): number {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function noise(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = frac(x);
  const fy = frac(y);
  const a = hash(ix, iy);
  const b = hash(ix + 1, iy);
  const c = hash(ix, iy + 1);
  const d = hash(ix + 1, iy + 1);
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}
const cloud = (x: number, y: number) => noise(x, y) * 0.65 + noise(x * 2.1 + 9, y * 2.1) * 0.35;

// Scratch colour so the texture functions allocate nothing.
let R = 0;
let G = 0;
let B = 0;
const set = (c: RGB, k = 1) => { R = c[0] * k; G = c[1] * k; B = c[2] * k; };
const mix = (c: RGB, k: number) => { R += (c[0] - R) * k; G += (c[1] - G) * k; B += (c[2] - B) * k; };

/** Wallpaper and dado, shared by the side walls and the wall a door sits in. a runs along the wall, y is height. */
function wallpaper(th: Theme, a: number, y: number) {
  if (y > 0.55) {
    // Wainscot panels
    set(th.dado, frac(a * 1.4) < 0.04 || y > 1.46 ? 0.7 : 1);
    return;
  }
  if (y > 0.46) { set(th.dado, 1.25); return; } // rail
  const band = frac(a * 2.5) < 0.5;
  set(band ? th.w1 : th.w2);
  // A small repeated diamond so the paper looks printed
  const mx = frac(a * 2.5) * 2 % 1;
  const my = frac(y * 3.3);
  if (Math.abs(mx - 0.5) + Math.abs(my - 0.5) < 0.16) mix(th.dado, 0.35);
  if (th.grid && (frac(a * 4) < 0.06 || frac(y * 4) < 0.06)) mix([255, 255, 255], 0.5);
}

function sky(sx: number, sy: number, t: number) {
  const g = (sy + 1) / 2;
  R = 80 + g * 130; G = 160 + g * 80; B = 255 - g * 20;
  const c = cloud(sx * 2.4 + t * 0.12, sy * 2.4 + 3);
  if (c > 0.52 - (sy > 0.1 ? 0.2 : 0)) mix([255, 255, 255], Math.min(1, (c - 0.45) * 5));
}

/** What is behind a door, seen through its opening. sx and sy run -1 to 1 across it. */
function scene(kind: Scene, sx: number, sy: number, t: number) {
  switch (kind) {
    case 'clouds': {
      sky(sx, sy, t);
      if (sy > 0.25) { set([250, 250, 255]); const c = cloud(sx * 4 / (sy + 0.2) + t * 0.3, 3 / (sy + 0.2)); mix([180, 200, 240], c * 0.6); }
      return;
    }
    case 'pool': {
      const p = sy + 1.4;
      const u = sx / p;
      const v = 1 / p;
      const tile = (Math.floor(u * 5) + Math.floor(v * 5)) & 1;
      set(tile ? [120, 214, 222] : [150, 230, 235]);
      if (frac(u * 5) < 0.07 || frac(v * 5) < 0.07) mix([255, 255, 255], 0.6);
      mix([40, 120, 170], Math.max(0, Math.sin(u * 9 + v * 6 + t * 1.5) * 0.12 + 0.12));
      return;
    }
    case 'bedroom': {
      set([34, 20, 52]);
      const lamp = Math.max(0, 1 - Math.hypot(sx - 0.55, sy + 0.2) * 1.5);
      mix([255, 214, 130], lamp * lamp);
      if (sy > 0.35) mix(sx < 0.3 ? [90, 60, 140] : [60, 40, 90], 0.8); // a bed
      if (Math.abs(sx + 0.5) < 0.28 && Math.abs(sy + 0.25) < 0.28) { set([20, 30, 70]); if (Math.hypot(sx + 0.42, sy + 0.3) < 0.1) set([255, 250, 220]); }
      return;
    }
    case 'grass': {
      sky(sx, sy * 0.8 - 0.2, t * 0.5);
      const hill = 0.25 + Math.sin(sx * 2.2 + 1) * 0.18;
      if (sy > hill) { set([91, 187, 46]); mix([143, 219, 74], noise(sx * 12, sy * 12) * 0.5); }
      return;
    }
    case 'sunset': {
      const g = (sy + 1) / 2;
      R = 255; G = 70 + g * 120; B = 120 + g * 60;
      const sun = Math.hypot(sx, sy - 0.1);
      if (sun < 0.34) set([255, 235, 150]);
      if (sy > 0.3) { set([40, 20, 90]); if (frac((sy - 0.3) * 9 + t * 0.4) < 0.35) mix([255, 120, 160], 0.4); }
      return;
    }
    case 'static': {
      const n = hash(Math.floor(sx * 40), Math.floor(sy * 40) + Math.floor(t * 24));
      const v = 60 + n * 190;
      R = v; G = v; B = v;
      if (frac(sy * 6 - t * 2) < 0.1) mix([255, 255, 255], 0.5);
    }
  }
}

function ceiling(th: Theme, x: number, z: number) {
  set(th.ceil, 0.9);
  if (frac(x * 0.5) < 0.04 || frac(z * 0.5) < 0.04) mix([120, 100, 110], 0.5);
  if (Math.abs(x) < 0.7 && frac(z / 6) < 0.27) { set([255, 244, 214]); }
  if (th.floor === 2 && Math.abs(x) >= 0.7) { R = 130; G = 185; B = 255; mix([255, 255, 255], cloud(x * 2, z * 0.4) * 0.5); }
}
function floorTex(th: Theme, x: number, z: number) {
  if (th.floor === 1) {
    const tile = (Math.floor(x * 2) + Math.floor(z * 2)) & 1;
    set(tile ? th.fa : th.fb);
    if (frac(x * 2) < 0.06 || frac(z * 2) < 0.06) mix([255, 255, 255], 0.6);
    return;
  }
  if (th.floor === 2) { set(th.fa); mix(th.fb, cloud(x * 1.3, z * 0.7) * 1.1); return; }
  const k = (Math.floor(x * 5) + Math.floor(z * 5)) & 1;
  set(k ? th.fa : th.fb);
  mix(th.dado, (hash(Math.floor(x * 14), Math.floor(z * 14)) - 0.5) * 0.35 + 0.05);
  if (Math.abs(x) > 1.55 && Math.abs(x) < 1.62) mix([255, 224, 240], 0.35); // a runner edge
}
function sideWall(th: Theme, left: boolean, z: number, y: number, t: number) {
  const nearWin = left && frac(z / 12) > 0.33 && frac(z / 12) < 0.6 && y > -0.85 && y < 0.15;
  if (nearWin) {
    const wx = (frac(z / 12) - 0.465) / 0.135;
    const wy = (y + 0.35) / 0.5;
    if (Math.abs(wx) > 0.88 || Math.abs(wy) > 0.9 || Math.abs(wx) < 0.04) { set([248, 240, 232]); return; }
    sky(wx, wy, t);
    return;
  }
  const nearDoor = !left && frac(z / 9) > 0.2 && frac(z / 9) < 0.34 && y > -0.6;
  if (nearDoor) {
    const dxl = (frac(z / 9) - 0.27) / 0.07;
    if (Math.abs(dxl) < 1) {
      if (y > 1.45 || Math.abs(dxl) > 0.9) { set([70, 40, 56]); return; }
      set([232, 196, 170]);
      if (Math.abs(dxl) < 0.62 && ((y > -0.4 && y < 0.2) || (y > 0.45 && y < 1.2))) mix([180, 140, 120], 0.6);
      if (Math.abs(dxl - 0.6) < 0.1 && Math.abs(y - 0.5) < 0.07) set([255, 220, 120]);
      return;
    }
  }
  wallpaper(th, z, y);
}

const px = new Uint8ClampedArray(N * 4);
let img: ImageData | null = null;
/** The picture to put on the canvas. Made on first use because the server has no ImageData. */
export const image = (): ImageData => (img ??= new ImageData(px, W, H));

function plot(x: number, y: number, r: number, g: number, b: number) {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const o = (y * W + x) * 4;
  px[o] = r; px[o + 1] = g; px[o + 2] = b; px[o + 3] = 255;
}
/** Draws an ellipse. `alpha` below 1 uses the dither pattern instead of blending, like a 256-colour game would. */
function ellipse(cx: number, cy: number, rx: number, ry: number, c: RGB, alpha = 1) {
  const x0 = Math.max(0, Math.floor(cx - rx));
  const x1 = Math.min(W - 1, Math.ceil(cx + rx));
  const y0 = Math.max(0, Math.floor(cy - ry));
  const y1 = Math.min(H - 1, Math.ceil(cy + ry));
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const nx = (x - cx) / rx;
      const ny = (y - cy) / ry;
      if (nx * nx + ny * ny <= 1 && bayerAt(x, y) < alpha) plot(x, y, c[0], c[1], c[2]);
    }
  }
}
function rect(x: number, y: number, w: number, h: number, c: RGB) {
  for (let j = Math.max(0, Math.floor(y)); j < Math.min(H, Math.ceil(y + h)); j++) for (let i = Math.max(0, Math.floor(x)); i < Math.min(W, Math.ceil(x + w)); i++) plot(i, j, c[0], c[1], c[2]);
}

const SKIN: RGB = [236, 178, 158];
const SKIN_DARK: RGB = [200, 130, 128];
const BLACK: RGB = [14, 8, 20];
const CREAM: RGB = [255, 244, 222];

/**
 * The thing. A lopsided peach plush with floppy ears, one button eye, one stitched eye and a wide stitched grin.
 * Original design. `s` is the head radius in pixels.
 */
function face(cx: number, cy: number, s: number, t: number) {
  const sway = Math.sin(t * 3) * s * 0.03;
  ellipse(cx - s * 1.0 + sway, cy - s * 0.2, s * 0.4, s * 0.95, SKIN_DARK); // ears
  ellipse(cx + s * 1.05 + sway, cy - s * 0.35, s * 0.36, s * 0.85, SKIN_DARK);
  ellipse(cx, cy, s * 1.05, s, SKIN);
  ellipse(cx - s * 0.62, cy + s * 0.35, s * 0.22, s * 0.14, [250, 140, 170]); // cheeks
  ellipse(cx + s * 0.62, cy + s * 0.35, s * 0.22, s * 0.14, [250, 140, 170]);
  // button eye, left
  ellipse(cx - s * 0.38, cy - s * 0.22, s * 0.28, s * 0.3, CREAM);
  ellipse(cx - s * 0.36 + Math.sin(t * 2) * s * 0.03, cy - s * 0.2, s * 0.15, s * 0.17, BLACK);
  ellipse(cx - s * 0.41, cy - s * 0.27, s * 0.05, s * 0.05, [255, 255, 255]);
  // stitched eye, right: an X
  const ex = cx + s * 0.4;
  const ey = cy - s * 0.2;
  for (let k = -s * 0.2; k <= s * 0.2; k += Math.max(0.5, s * 0.02)) { rect(ex + k, ey + k, Math.max(1, s * 0.05), Math.max(1, s * 0.05), BLACK); rect(ex + k, ey - k, Math.max(1, s * 0.05), Math.max(1, s * 0.05), BLACK); }
  // grin: a dark crescent with a row of small teeth and stitches
  ellipse(cx, cy + s * 0.42, s * 0.78, s * 0.3, BLACK);
  ellipse(cx, cy + s * 0.3, s * 0.82, s * 0.22, SKIN);
  const teeth = 9;
  for (let k = 0; k < teeth; k++) {
    const a = (k + 0.5) / teeth;
    rect(cx - s * 0.7 + a * s * 1.4 - s * 0.05, cy + s * 0.34 + Math.sin(a * Math.PI) * s * 0.12, Math.max(1, s * 0.09), Math.max(1, s * 0.13), CREAM);
  }
  // party hat, crooked
  for (let k = 0; k < 14; k++) rect(cx - s * 0.24 + k * s * 0.012 + sway, cy - s * 1.0 - k * s * 0.07, s * (0.5 - k * 0.032), Math.max(1, s * 0.075), k % 4 < 2 ? [250, 90, 160] : [255, 235, 0]);
}

/** Draws the thing far down the corridor behind the camera, as a dithered shape that is never quite whole. */
function chaser(depth: number, t: number, show: number) {
  const s = F / depth;
  const alpha = Math.max(0, Math.min(1, (1 - depth / 36) * show));
  if (alpha <= 0.02) return;
  const cx = W / 2 + Math.sin(t * 1.3) * s * 0.15;
  const feet = H / 2 + (F * HALF_H) / depth;
  const head = feet - s * 2.3;
  const bodyC: RGB = [60, 30, 70];
  ellipse(cx, feet - s * 0.9, s * 0.45, s * 1.0, bodyC, alpha); // body
  ellipse(cx - s * 0.62, feet - s * 0.9 + Math.sin(t * 2) * s * 0.1, s * 0.12, s * 0.85, bodyC, alpha); // long arms
  ellipse(cx + s * 0.62, feet - s * 0.9 - Math.sin(t * 2) * s * 0.1, s * 0.12, s * 0.85, bodyC, alpha);
  ellipse(cx, head + s * 0.4, s * 0.42, s * 0.46, bodyC, alpha); // head
  ellipse(cx - s * 0.46, head - s * 0.05, s * 0.14, s * 0.4, bodyC, alpha); // ears
  ellipse(cx + s * 0.5, head - s * 0.12, s * 0.13, s * 0.36, bodyC, alpha);
  const blink = Math.sin(t * 0.9) > 0.92 ? 0.1 : 1;
  ellipse(cx - s * 0.16, head + s * 0.32, Math.max(0.8, s * 0.1), Math.max(0.5, s * 0.12 * blink), [255, 250, 230], Math.min(1, alpha * 1.6)); // eyes
  ellipse(cx + s * 0.16, head + s * 0.32, Math.max(0.8, s * 0.1), Math.max(0.5, s * 0.12 * blink), [255, 250, 230], Math.min(1, alpha * 1.6));
}

export interface DoorRect { cx: number; cy: number; hw: number; hh: number }

export function render(f: Frame): DoorRect | null {
  const th = THEMES[f.zone];
  const camZ = f.camZ;
  const D = f.doorZ !== null && f.dir === 1 ? f.doorZ - camZ : -1;
  const dark = 1 - f.flick * 0.45;
  const back = f.dir === -1;
  for (let i = 0; i < N; i++) {
    const t = tAt[i];
    const o = i * 4;
    let p = plane[i];
    let onDoorWall = false;
    if (D > 0 && t > D) onDoorWall = true;
    let tt = t;
    let z = back ? camZ - t : camZ + t;
    if (onDoorWall) {
      tt = D;
      const xw = dxAt[i] * D;
      const yw = dyAt[i] * D;
      const inFrame = Math.abs(xw) < DOOR_HALF + 0.1 && yw > DOOR_TOP - 0.1;
      const inDoor = Math.abs(xw) < DOOR_HALF && yw > DOOR_TOP;
      if (inDoor) {
        const edge = -DOOR_HALF + 2 * DOOR_HALF * (1 - f.open);
        if (xw > edge || f.open > 0.98) {
          scene(f.scene, xw / DOOR_HALF, ((yw - DOOR_TOP) / (HALF_H - DOOR_TOP)) * 2 - 1, f.t);
        } else {
          set([226, 176, 156]);
          const lx = (xw + DOOR_HALF) / (2 * DOOR_HALF);
          if (lx > 0.12 && lx < 0.88 && ((yw > -0.4 && yw < 0.3) || (yw > 0.5 && yw < 1.35))) mix([170, 112, 104], 0.55);
          if (Math.abs(xw - (edge - 0.16)) < 0.045 && Math.abs(yw - 0.55) < 0.05) set([255, 214, 110]);
        }
      } else if (inFrame) {
        set([84, 46, 66]);
      } else {
        wallpaper(th, xw, yw);
      }
    } else if (p === 0) {
      floorTex(th, back ? -uAt[i] : uAt[i], z);
    } else if (p === 1) {
      ceiling(th, back ? -uAt[i] : uAt[i], z);
    } else {
      const left = back ? p === 3 : p === 2;
      sideWall(th, left, z, uAt[i], f.t);
    }
    // Distance fog toward the zone's dark, and light flicker.
    const fogK = 1 - Math.exp(-tt * (th.floor === 2 ? 0.035 : 0.06));
    mix(th.fog, fogK);
    R *= dark; G *= dark; B *= dark;
    px[o] = R; px[o + 1] = G; px[o + 2] = B; px[o + 3] = 255;
  }
  if (back) chaser(4 + f.gap * 30, f.t, f.seen);
  if (f.scare >= 0) {
    const e = f.scare * f.scare;
    for (let i = 0; i < N * 4; i += 4) { px[i] *= 1 - e * 0.85; px[i + 1] *= 1 - e * 0.85; px[i + 2] *= 1 - e * 0.85; }
    const size = 6 + e * 115;
    face(W / 2 + (f.calm ? 0 : Math.sin(f.t * 50) * e * 3), H / 2 + e * 8, size, f.t);
  }
  post(f);
  if (D > 0) return { cx: 0.5, cy: (H / 2 + (F * (DOOR_TOP + HALF_H)) / 2 / D) / H, hw: (F * DOOR_HALF) / D / W, hh: (F * (HALF_H - DOOR_TOP)) / 2 / D / H };
  return null;
}

/** Glitches and the final reduction to a dithered palette. */
function post(f: Frame) {
  const g = f.calm ? f.glitch * 0.25 : f.glitch;
  if (g > 0.02) {
    const bands = Math.ceil(g * 4);
    for (let b = 0; b < bands; b++) {
      if (Math.random() > g * 1.2) continue;
      const y0 = Math.floor(Math.random() * H);
      const h = 2 + Math.floor(Math.random() * 12 * g + 1);
      const shift = Math.floor((Math.random() - 0.5) * 60 * g);
      for (let y = y0; y < Math.min(H, y0 + h); y++) {
        const row = new Uint8ClampedArray(px.subarray(y * W * 4, (y + 1) * W * 4));
        for (let x = 0; x < W; x++) {
          const sx = (x - shift + W) % W;
          const o = (y * W + x) * 4;
          px[o] = row[sx * 4]; px[o + 1] = row[sx * 4 + 1]; px[o + 2] = row[sx * 4 + 2];
        }
      }
    }
    // Blocks that were copied too many times: flat 8 by 8 squares, like a broken JPEG.
    const blocks = Math.floor(g * 18);
    for (let b = 0; b < blocks; b++) {
      const bx = Math.floor(Math.random() * (W / 8)) * 8;
      const by = Math.floor(Math.random() * (H / 8)) * 8;
      const o = (by * W + bx) * 4;
      const r = px[o], gg = px[o + 1], bb = px[o + 2];
      for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { const q = ((by + y) * W + bx + x) * 4; px[q] = r; px[q + 1] = gg; px[q + 2] = bb; }
    }
  }
  const step = 51; // six levels per channel, like a web-safe 216 colour palette
  for (let y = 0; y < H; y++) {
    const line = y & 1 ? 0.93 : 1; // scanlines
    for (let x = 0; x < W; x++) {
      const o = (y * W + x) * 4;
      const d = (bayerAt(x, y) - 0.5) * step;
      px[o] = Math.round((px[o] * line + d) / step) * step;
      px[o + 1] = Math.round((px[o + 1] * line + d) / step) * step;
      px[o + 2] = Math.round((px[o + 2] * line + d) / step) * step;
    }
  }
}

/** The souvenir mirror on the result screen: a figure in a bedroom whose reflection has changed. */
export function drawMirror(c: CanvasRenderingContext2D, mutation: string, w: number, h: number) {
  c.imageSmoothingEnabled = false;
  c.fillStyle = '#2a1a3a'; c.fillRect(0, 0, w, h);
  c.fillStyle = '#ffd9ec'; c.fillRect(w * 0.12, h * 0.08, w * 0.76, h * 0.84);
  c.fillStyle = '#9ad6ff'; c.fillRect(w * 0.16, h * 0.12, w * 0.68, h * 0.76);
  const cx = w / 2;
  c.fillStyle = '#f4f4d0'; c.fillRect(cx - w * 0.12, h * 0.4, w * 0.24, h * 0.42); // body
  c.fillRect(cx - w * 0.1, h * 0.2, w * 0.2, h * 0.2); // head
  c.fillStyle = '#0b2a4a'; c.fillRect(cx - w * 0.06, h * 0.27, w * 0.03, h * 0.04); c.fillRect(cx + w * 0.03, h * 0.27, w * 0.03, h * 0.04);
  if (mutation === 'ears') { c.fillStyle = '#f4f4d0'; c.fillRect(cx - w * 0.09, h * 0.04, w * 0.04, h * 0.17); c.fillRect(cx + w * 0.05, h * 0.04, w * 0.04, h * 0.17); }
  if (mutation === 'eye') { c.fillStyle = '#ff1fa9'; c.fillRect(cx - w * 0.02, h * 0.21, w * 0.04, h * 0.04); }
  if (mutation === 'door') { c.fillStyle = '#5a2e44'; c.fillRect(cx - w * 0.05, h * 0.5, w * 0.1, h * 0.2); c.fillStyle = '#ffd36e'; c.fillRect(cx + w * 0.02, h * 0.6, w * 0.015, h * 0.02); }
  if (mutation === 'static') { for (let i = 0; i < 160; i++) { c.fillStyle = i % 2 ? '#ffffff' : '#404040'; c.fillRect(cx - w * 0.2 + Math.random() * w * 0.4, h * 0.18 + Math.random() * h * 0.66, 2, 2); } }
  if (mutation === 'halo') { c.fillStyle = '#fff4d6'; c.fillRect(cx - w * 0.14, h * 0.1, w * 0.28, h * 0.035); }
  if (mutation === 'smile') { c.fillStyle = '#0b2a4a'; c.fillRect(cx - w * 0.07, h * 0.35, w * 0.14, h * 0.02); c.fillRect(cx - w * 0.09, h * 0.33, w * 0.02, h * 0.02); c.fillRect(cx + w * 0.07, h * 0.33, w * 0.02, h * 0.02); }
}
