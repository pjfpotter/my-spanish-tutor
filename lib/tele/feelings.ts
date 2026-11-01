/**
 * Tele's feelings: each is a recipe of small changes spread over the eye, antennae, picture and
 * world, and recipes add together so any two blend into a third. Ported from the validated
 * sketch in docs/design/tele-sketch.html. Tele has no mouth; nothing here drives one.
 */
export const EMOTIONS = ['joy', 'sadness', 'anger', 'fear', 'surprise', 'disgust'] as const;
export type Emotion = (typeof EMOTIONS)[number];

/** Intensity 0 to 1 for each feeling. Missing feelings count as 0. */
export type Feelings = Partial<Record<Emotion, number>>;

export const FACE_KEYS = [
  'browInner', 'browOuter', 'squeeze', 'lidUp', 'lidLow', 'pupil', 'gazeY', 'antenna', 'tilt', 'drop',
  'tear', 'glitch', 'jitter', 'static', 'roll', 'bounce', 'bloodshot',
] as const;
export type FaceKey = (typeof FACE_KEYS)[number];
export type Face = Record<FaceKey, number>;

const RECIPES: Record<Emotion, Partial<Face>> = {
  joy: { lidLow: 0.6, browOuter: 0.25, pupil: 0.3, antenna: 0.5, tilt: 0.5, bounce: 0.6 },
  sadness: { browInner: 1, browOuter: -0.5, lidUp: -0.5, gazeY: 0.9, antenna: -1, drop: 1, tear: 1 },
  anger: { browInner: -1, squeeze: 1, lidUp: 0.1, lidLow: 0.55, pupil: -0.7, antenna: -0.3, glitch: 0.8, drop: 0.3, bloodshot: 0.6 },
  fear: { browInner: 1, browOuter: 0.6, squeeze: 0.6, lidUp: 1, pupil: -0.85, antenna: -0.6, jitter: 1, static: 0.6 },
  surprise: { browInner: 1, browOuter: 1, lidUp: 1, pupil: 0.45, antenna: 1, drop: -0.4 },
  disgust: { lidLow: 0.75, browInner: -0.5, squeeze: 0.5, lidUp: -0.2, tilt: -0.8, roll: 1, pupil: -0.3, bloodshot: 0.3 },
};

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

export const neutral = (): Record<Emotion, number> =>
  Object.fromEntries(EMOTIONS.map((e) => [e, 0])) as Record<Emotion, number>;

/** Clamp a loose object (for example parsed JSON) into valid feelings. */
export function normaliseFeelings(input: unknown): Record<Emotion, number> {
  const src = (input ?? {}) as Record<string, unknown>;
  const out = neutral();
  for (const e of EMOTIONS) out[e] = clamp(Number(src[e]) || 0, 0, 1);
  return out;
}

/** The face parameters for a set of feelings. Feelings add; each parameter is capped. */
export function faceFromFeelings(feelings: Feelings): Face {
  const face = Object.fromEntries(FACE_KEYS.map((k) => [k, 0])) as Face;
  for (const e of EMOTIONS) {
    const weight = feelings[e] ?? 0;
    if (!weight) continue;
    for (const [key, value] of Object.entries(RECIPES[e]) as [FaceKey, number][]) face[key] += weight * value;
  }
  for (const k of FACE_KEYS) face[k] = clamp(face[k], -1.3, 1.3);
  return face;
}

/** The strongest feeling, or null when everything is 0. */
export function dominantFeeling(feelings: Feelings): Emotion | null {
  let best: Emotion | null = null;
  let bestValue = 0;
  for (const e of EMOTIONS) {
    const v = feelings[e] ?? 0;
    if (v > bestValue) {
      best = e;
      bestValue = v;
    }
  }
  return best;
}
