'use client';

import { useCallback, useState } from 'react';
import type { TutorLine } from '../../lib/tele/lines';
import { clipUrls, findBitClip, findClip, loadClip } from '../../lib/tele/clips';
import { useLinePlayback } from '../components/useLinePlayback';

/**
 * Plays one of Tele's lines from a built clip (a question, an answer bit or a phrase). With no clip, or if it will not load,
 * the line still shows and walks the caption on a timer, so the demo never goes silent in a way that looks broken.
 */
export function useDemoLine() {
  const playback = useLinePlayback();
  const [source, setSource] = useState<'clip' | 'none' | null>(null);
  const say = useCallback(async (line: TutorLine, speed = 1, onEnd?: () => void) => {
    const slot = findClip(line.es, speed) ?? findBitClip(line.es, speed) ?? (speed !== 1 ? findClip(line.es, 1) ?? findBitClip(line.es, 1) : null);
    try {
      if (!slot) throw new Error('no clip');
      const clip = await loadClip(slot);
      setSource('clip');
      playback.play(line, { clip, audioUrl: clipUrls(slot).audio, onEnd: onEnd ? () => onEnd() : undefined });
    } catch {
      setSource('none');
      playback.play(line, { onEnd: onEnd ? () => onEnd() : undefined });
    }
  }, [playback]);
  return { playback, say, source };
}
