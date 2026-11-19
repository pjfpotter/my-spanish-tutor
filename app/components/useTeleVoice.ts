'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { clipUrls, findBitClip, findClip } from '../../lib/tele/clips';
import { SOUND_KEY, soundOn } from '../../lib/practice/sound';

export const readSound = () => { try { return soundOn(localStorage.getItem(SOUND_KEY)); } catch { return true; } };

/**
 * Tele's voice: a built clip when there is one (the answer's bits are course chunks, built ahead of time), otherwise the
 * device's Spanish voice, otherwise a short wait. Given several bits it says them one after the other, so a whole
 * answer is its bits in order and needs no clip of its own.
 */
export function useVoice() {
  const [speaking, setSpeaking] = useState(false);
  const token = useRef(0);
  const audio = useRef<HTMLAudioElement | null>(null);
  const stop = useCallback(() => {
    token.current++;
    audio.current?.pause();
    audio.current = null;
    try { window.speechSynthesis?.cancel(); } catch { /* no voice on this device */ }
    setSpeaking(false);
  }, []);
  const speak = useCallback(async (text: string | readonly string[], slow = false) => {
    stop();
    const mine = token.current;
    if (!readSound()) return;
    setSpeaking(true);
    const one = async (t: string) => {
      const slot = findClip(t, slow ? 0.7 : 1) ?? findBitClip(t, slow ? 0.7 : 1) ?? (slow ? findClip(t, 1) ?? findBitClip(t, 1) : null);
      if (slot) {
        await new Promise<void>((res) => {
          const a = new Audio(clipUrls(slot).audio);
          audio.current = a;
          a.onended = a.onerror = a.onpause = () => res();
          void a.play().catch(() => res());
        });
        return;
      }
      const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined;
      if (synth && typeof SpeechSynthesisUtterance !== 'undefined') {
        await new Promise<void>((res) => {
          const u = new SpeechSynthesisUtterance(t);
          u.lang = 'es-ES';
          const v = synth.getVoices().find((x) => /^es[-_]ES/i.test(x.lang)) ?? synth.getVoices().find((x) => /^es/i.test(x.lang));
          if (v) u.voice = v;
          u.rate = slow ? 0.6 : 0.9;
          u.onend = u.onerror = () => res();
          synth.speak(u);
          setTimeout(res, 2500 + t.length * 130);
        });
        return;
      }
      await new Promise((res) => setTimeout(res, 400 + t.length * 40));
    };
    try {
      for (const t of typeof text === 'string' ? [text] : text) {
        if (mine !== token.current) return;
        await one(t);
      }
    } finally {
      if (mine === token.current) setSpeaking(false);
    }
  }, [stop]);
  useEffect(() => stop, [stop]);
  return { speak, stop, speaking, current: () => token.current };
}
