import { describe, expect, it } from 'vitest';
import { currentSessionId, resolveSession, SESSION_GAP_MS } from './session-id';

describe('resolveSession', () => {
  it('keeps the same session within the gap', () => {
    const s = resolveSession({ id: 'a', lastSeen: 1000 }, 1000 + SESSION_GAP_MS - 1, () => 'new');
    expect(s.id).toBe('a');
  });
  it('starts a new session after a long gap (a later day)', () => {
    expect(resolveSession({ id: 'a', lastSeen: 1000 }, 1000 + SESSION_GAP_MS, () => 'new').id).toBe('new');
  });
  it('starts one when nothing is stored, or the stored time is in the future', () => {
    expect(resolveSession(null, 5, () => 'new').id).toBe('new');
    expect(resolveSession({ id: 'a', lastSeen: 9999 }, 5, () => 'new').id).toBe('new');
  });
});

describe('currentSessionId', () => {
  const memory = () => {
    const m = new Map<string, string>();
    return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
  };
  it('is stable across calls in one visit', () => {
    const st = memory();
    expect(currentSessionId(1000, st)).toBe(currentSessionId(2000, st));
  });
  it('changes the next day', () => {
    const st = memory();
    expect(currentSessionId(1000, st)).not.toBe(currentSessionId(1000 + 24 * 3_600_000, st));
  });
  it('still returns an id when storage is blocked', () => {
    const blocked = { getItem: () => { throw new Error('no'); }, setItem: () => { throw new Error('no'); } };
    expect(currentSessionId(1, blocked)).toMatch(/^[0-9a-f-]{36}$/);
  });
});
