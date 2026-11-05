/**
 * A "session" is one visit: a new one starts after a long gap. Mastery needs successes in separate
 * sessions (design D10), so this has to be stable across reloads within a visit and different next day.
 */
export const SESSION_GAP_MS = 30 * 60_000;

export interface StoredSession {
  id: string;
  lastSeen: number;
}

export function resolveSession(stored: StoredSession | null, now: number, newId: () => string): StoredSession {
  if (stored && now - stored.lastSeen < SESSION_GAP_MS && now >= stored.lastSeen) return { id: stored.id, lastSeen: now };
  return { id: newId(), lastSeen: now };
}

const KEY = 'session';

/** Reads and refreshes the session from device storage. Falls back to a fresh id for this page if storage is blocked. */
export function currentSessionId(now = Date.now(), storage: Pick<Storage, 'getItem' | 'setItem'> | null = safeStorage()): string {
  let stored: StoredSession | null = null;
  try {
    const raw = storage?.getItem(KEY);
    if (raw) stored = JSON.parse(raw);
  } catch {
    stored = null;
  }
  const next = resolveSession(stored, now, () => crypto.randomUUID());
  try {
    storage?.setItem(KEY, JSON.stringify(next));
  } catch {
    // Blocked storage: this page still has a consistent id.
  }
  return next.id;
}

function safeStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}
