'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { syllabify } from '../../lib/spanish/syllables';
import { clipUrls, type BuiltClip } from '../../lib/tele/clips';

export const SLOW_RATE = 0.7;
/** How long each syllable stays lit when there is no sound to follow. */
const SYLLABLE_MS = 600;

export type WordAudioSource = 'clip' | 'voice' | 'silent';

/**
 * Plays one word slowly and lights its syllables in turn (task 5.4). It uses a built slow clip of the word
 * if there is one, then the device's Spanish voice at a slow rate, and otherwise steps through the
 * syllables in silence so the student still sees how the word is split. It never throws and never blocks.
 */
export function useWordAudio() {
  const clips = useRef<readonly BuiltClip[]>([]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [active, setActive] = useState<number | null>(null);
  const [source, setSource] = useState<WordAudioSource | null>(null);

  useEffect(() => {
    fetch('/api/clips').then((r) => (r.ok ? r.json() : [])).catch(() => []).then((list: BuiltClip[]) => (clips.current = list));
    return () => timers.current.forEach(clearTimeout);
  }, []);

  const play = useCallback((word: string) => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    const { syllables } = syllabify(word.replace(/[.,;:!?¡¿"“”]/g, ''));
    const slot = clips.current.find((c) => c.text === word && c.speed === SLOW_RATE)?.slot;

    let via: WordAudioSource = 'silent';
    if (slot) {
      via = 'clip';
      void new Audio(clipUrls(slot).audio).play().catch(() => {});
    } else if (typeof window !== 'undefined' && window.speechSynthesis && typeof SpeechSynthesisUtterance !== 'undefined') {
      try {
        const u = new SpeechSynthesisUtterance(word);
        u.lang = 'es-ES';
        u.rate = SLOW_RATE;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(u);
        via = 'voice';
      } catch {
        via = 'silent'; // a voice that will not start is not a problem: the syllables still show
      }
    }
    setSource(via);
    syllables.forEach((_, i) => timers.current.push(setTimeout(() => setActive(i), i * SYLLABLE_MS)));
    timers.current.push(setTimeout(() => setActive(null), syllables.length * SYLLABLE_MS));
  }, []);

  return { play, active, source };
}
