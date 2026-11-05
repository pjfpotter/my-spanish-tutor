import { describe, expect, it } from 'vitest';
import { feelingsAt } from './timeline';
import { buildFeelingTrack, cueFor } from './feeling-track';

const words = (...ws: string[]) => ws.map((text, i) => ({ text, t0: i * 0.4 }));

describe('feeling track', () => {
  it('uses the baked feeling for the whole line', () => {
    const track = buildFeelingTrack(words('Ay', 'qué', 'asco'), { disgust: 0.8 });
    expect(track).toEqual([{ t0: 0, feelings: { disgust: 0.8 } }]);
  });

  it('clamps a baked feeling into 0 to 1', () => {
    expect(buildFeelingTrack(words('hola'), { joy: 3 })[0].feelings).toEqual({ joy: 1 });
  });

  it('falls back to cue words when nothing is baked, then settles', () => {
    const w = words('es', 'que', 'Vaya', 'es', 'muy', 'raro', 'hoy');
    const track = buildFeelingTrack(w);
    expect(feelingsAt({ feelings: track }, 0)).toEqual({}); // calm before the cue
    expect(feelingsAt({ feelings: track }, w[2].t0)).toEqual({ surprise: 0.7 });
    expect(feelingsAt({ feelings: track }, w[4].t0)).toEqual({ surprise: 0.7 }); // still holding
    expect(feelingsAt({ feelings: track }, w[5].t0)).toEqual({}); // settled after three words
  });

  it('is calm all the way through a line with no cues or baked feeling', () => {
    expect(buildFeelingTrack(words('me', 'llamo', 'Tele'))).toEqual([{ t0: 0, feelings: {} }]);
  });

  it('finds cue words ignoring accents case and punctuation', () => {
    expect(cueFor('¡Qué')).toBeNull();
    expect(cueFor('ASCO!')).toBe('disgust');
    expect(cueFor('Lástima.')).toBe('sadness');
  });

  it('always starts at time 0 so there is a feeling in force from the first moment', () => {
    expect(buildFeelingTrack(words('x'), null)[0].t0).toBe(0);
  });
});
