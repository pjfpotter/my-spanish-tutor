import { describe, expect, it } from 'vitest';
import { dominantFeeling, EMOTIONS, FACE_KEYS, faceFromFeelings, neutral, normaliseFeelings } from './feelings';

describe('Tele feelings', () => {
  it('has a flat face when nothing is felt', () => {
    expect(Object.values(faceFromFeelings({})).every((v) => v === 0)).toBe(true);
    expect(Object.values(faceFromFeelings(neutral())).every((v) => v === 0)).toBe(true);
  });

  it('gives each of the six feelings its own face', () => {
    const faces = EMOTIONS.map((e) => JSON.stringify(faceFromFeelings({ [e]: 1 })));
    expect(new Set(faces).size).toBe(6);
  });

  it('shows sadness in the eye, antennae and tears, and anger in the brow and glitch', () => {
    const sad = faceFromFeelings({ sadness: 1 });
    expect(sad).toMatchObject({ browInner: 1, antenna: -1, tear: 1 });
    const angry = faceFromFeelings({ anger: 1 });
    expect(angry.browInner).toBe(-1);
    expect(angry.glitch).toBeGreaterThan(0);
  });

  it('blends two feelings by adding their recipes', () => {
    const joy = faceFromFeelings({ joy: 0.5 });
    const sad = faceFromFeelings({ sadness: 0.5 });
    const both = faceFromFeelings({ joy: 0.5, sadness: 0.5 });
    for (const k of FACE_KEYS) expect(both[k]).toBeCloseTo(joy[k] + sad[k]);
  });

  it('scales a feeling with its intensity', () => {
    expect(faceFromFeelings({ surprise: 0.5 }).lidUp).toBeCloseTo(0.5);
  });

  it('caps every parameter so stacked feelings cannot break the drawing', () => {
    const face = faceFromFeelings({ joy: 1, sadness: 1, anger: 1, fear: 1, surprise: 1, disgust: 1 });
    for (const k of FACE_KEYS) {
      expect(face[k]).toBeLessThanOrEqual(1.3);
      expect(face[k]).toBeGreaterThanOrEqual(-1.3);
    }
  });

  it('finds the dominant feeling', () => {
    expect(dominantFeeling({})).toBeNull();
    expect(dominantFeeling({ joy: 0.2, fear: 0.7 })).toBe('fear');
  });

  it('normalises loose input into 0 to 1 feelings', () => {
    expect(normaliseFeelings({ joy: 4, sadness: -2, anger: 'x', extra: 1 })).toEqual({
      joy: 1, sadness: 0, anger: 0, fear: 0, surprise: 0, disgust: 0,
    });
    expect(normaliseFeelings(null)).toEqual(neutral());
  });
});
