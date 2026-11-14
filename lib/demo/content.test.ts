import { describe, expect, it } from 'vitest';
import { answerPieces } from '../practice/tasks';
import { DEMO_ANSWERS, DEMO_CHUNKS, DEMO_ITEMS } from './content';
import { DEMO_ITEM_PREFIX, resetDemo } from './session';
import { nextStop, prevStop, stopAt, STOPS } from './stops';

describe('demo sample course', () => {
  it('has five answers whose ids are all prefixed, so reset can find their device stores', () => {
    expect(DEMO_ITEMS).toHaveLength(5);
    expect(DEMO_ITEMS.every((i) => i.id.startsWith(DEMO_ITEM_PREFIX))).toBe(true);
  });
  it('splits each answer back into the bits the memorise stop teaches', () => {
    for (const [i, a] of DEMO_ANSWERS.entries()) {
      const pieces = answerPieces(DEMO_ITEMS[i].answer, DEMO_CHUNKS);
      expect(pieces.length).toBeGreaterThanOrEqual(a.chunks.length - 1);
    }
  });
});

describe('demo tour', () => {
  it('has six stops in order, each reachable directly', () => {
    expect(STOPS.map((s) => s.id)).toEqual(['hear', 'memorise', 'round', 'tutor', 'rewards', 'teacher']);
    expect(stopAt('/demo/round')?.index).toBe(2);
    expect(stopAt('/demo')).toBeNull();
  });
  it('moves to the next and previous stop and ends at the last', () => {
    expect(nextStop('/demo/hear')?.id).toBe('memorise');
    expect(prevStop('/demo/memorise')?.id).toBe('hear');
    expect(prevStop('/demo/hear')).toBeNull();
    expect(nextStop('/demo/teacher')).toBeNull();
  });
});

describe('demo reset', () => {
  const fake = (entries: Record<string, string>) => {
    const m = new Map(Object.entries(entries));
    return { get length() { return m.size; }, key: (i: number) => [...m.keys()][i] ?? null, removeItem: (k: string) => void m.delete(k), has: (k: string) => m.has(k) } as unknown as Storage & { has(k: string): boolean };
  };
  it('clears the demo keys and leaves everything else, including the recording switch', () => {
    const s = fake({ 'memorise-demo-v1': '{}', 'ladder:demo-1': '{}', 'best-ms:demo-2': '1', 'automate-last-order': '[]', 'demo-recording': 'on', 'ladder:real-id': '{}', sound: 'off' });
    resetDemo([s]);
    for (const gone of ['memorise-demo-v1', 'ladder:demo-1', 'best-ms:demo-2', 'automate-last-order']) expect(s.has(gone)).toBe(false);
    for (const kept of ['demo-recording', 'ladder:real-id', 'sound']) expect(s.has(kept)).toBe(true);
  });
});
