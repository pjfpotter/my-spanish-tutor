'use client';

import { useCallback, useRef } from 'react';
import { nextTake, SFX_BASE, soundAllowed, soundOn, SOUND_KEY, type SfxName } from '../../lib/practice/sound';

const readSound = () => {
  try {
    return soundOn(localStorage.getItem(SOUND_KEY));
  } catch {
    return true;
  }
};

/** Plays an interface sound if the student has sound on and calm mode off. Never throws and never blocks. */
export function useSfx() {
  const last = useRef(new Map<SfxName, string>());
  return useCallback((name: SfxName) => {
    if (typeof window === 'undefined' || !soundAllowed({ soundOn: readSound(), calm: document.documentElement.dataset.calm === 'on' })) return;
    const file = nextTake(name, last.current.get(name) ?? null);
    last.current.set(name, file);
    try {
      const audio = new Audio(SFX_BASE + file);
      audio.volume = 0.6;
      void audio.play().catch(() => {});
    } catch {
      // No audio on this device: the screen still works.
    }
  }, []);
}
