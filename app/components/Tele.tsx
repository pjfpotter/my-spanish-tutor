'use client';

import { useEffect, useRef } from 'react';
import { createTele, isCalmNow, type TeleRenderer } from '../../lib/tele/tele-renderer';
import type { Feelings } from '../../lib/tele/feelings';

export interface TeleProps {
  feelings?: Feelings;
  /** Voice loudness 0 to 1, shown as a glow while `speaking`. */
  loudness?: number;
  speaking?: boolean;
  /** Raised brows, for the end of a question. */
  question?: boolean;
  /** The patchwork corduroy jacket over the stripy turtleneck. On by default. */
  jacket?: boolean;
  className?: string;
}

/**
 * Tele: a 1970s television with one realistic eye and no mouth, in a stripy turtleneck. Feelings show in the eye, antennae,
 * picture and world. The canvas is decorative-with-a-name: callers show the feeling in words
 * beside it, so nothing is carried by the picture alone.
 */
export function Tele({ feelings, loudness = 0, speaking = false, question = false, jacket = true, className }: TeleProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tele = useRef<TeleRenderer | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const renderer = createTele(canvas, isCalmNow);
    tele.current = renderer;
    renderer.start();
    return () => {
      renderer.stop();
      tele.current = null;
    };
  }, []);

  useEffect(() => tele.current?.setFeelings(feelings ?? {}), [feelings]);
  useEffect(() => tele.current?.setLoudness(loudness), [loudness]);
  useEffect(() => tele.current?.setSpeaking(speaking), [speaking]);
  useEffect(() => tele.current?.setQuestion(question), [question]);
  useEffect(() => tele.current?.setJacket(jacket), [jacket]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ display: 'block', width: '100%', aspectRatio: '400 / 360', borderRadius: 18 }}
      role="img"
      aria-label={`Tele, a 1970s television with rabbit-ear antennae and one realistic eye on its screen, wearing a stripy turtleneck${jacket ? ' and a patchwork corduroy jacket' : ''}`}
    />
  );
}
