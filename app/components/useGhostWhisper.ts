'use client';

import { useEffect, useMemo } from 'react';
import ghostIndex from '../../lib/audio/built-ghost';
import { createGhostPlayer, type GhostAudioEl, type GhostContext } from '../../lib/audio/ghost-player';

export { findGhost, ghostUrl, type WhisperResult } from '../../lib/audio/ghost-player';

/** The player for a browser: real fetch, a real AudioContext when there is one, and a plain `Audio` element as the fallback. */
export function useGhostWhisper() {
  const player = useMemo(() => createGhostPlayer({
    index: ghostIndex,
    fetchImpl: (url) => fetch(url),
    makeContext: () => {
      const AC = typeof window !== 'undefined' ? (window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext) : undefined;
      return AC ? (new AC() as unknown as GhostContext) : null;
    },
    makeAudio: (url) => new Audio(url) as unknown as GhostAudioEl,
  }), []);
  useEffect(() => () => player.stop(), [player]);
  return player;
}
