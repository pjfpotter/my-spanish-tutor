'use client';

import { useEffect, useState } from 'react';

/**
 * Keeps the screen awake while `on` is true (task 27.11), so a phone does not lock in the middle of a spoken
 * lesson. The browser drops the lock whenever the page is hidden, so it is taken again when the page comes back.
 * Where the browser has no screen wake lock nothing happens, and `supported` says so.
 */
export function useWakeLock(on: boolean) {
  const [held, setHeld] = useState(false);
  const [supported, setSupported] = useState(false);

  useEffect(() => setSupported(typeof navigator !== 'undefined' && 'wakeLock' in navigator), []);

  useEffect(() => {
    if (!on || typeof navigator === 'undefined' || !('wakeLock' in navigator)) return;
    let gone = false;
    let sentinel: WakeLockSentinel | null = null;

    const take = async () => {
      if (gone || document.visibilityState !== 'visible' || (sentinel && !sentinel.released)) return;
      try {
        const s = await navigator.wakeLock.request('screen');
        if (gone) return void s.release().catch(() => {});
        sentinel = s;
        s.addEventListener('release', () => setHeld(false));
        setHeld(true);
      } catch {
        // Refused (low battery, power saver): the lesson carries on, and listening still resumes after a lock.
        setHeld(false);
      }
    };
    void take();
    const back = () => { if (document.visibilityState === 'visible') void take(); };
    document.addEventListener('visibilitychange', back);
    return () => {
      gone = true;
      document.removeEventListener('visibilitychange', back);
      void sentinel?.release().catch(() => {});
      setHeld(false);
    };
  }, [on]);

  return { held, supported };
}
