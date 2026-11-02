'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Feelings } from '../../lib/tele/feelings';
import type { ClipFile } from '../../lib/tele/clip';
import { estimateTimeline, wordsOf, type TutorLine } from '../../lib/tele/lines';
import { playheadAt } from '../../lib/tele/playhead';
import type { ClipTimeline } from '../../lib/tele/timeline';

export interface LinePlayback {
  playing: boolean;
  line: TutorLine | null;
  words: string[];
  activeIndex: number | null;
  feelings: Feelings | null;
  /** 0 to 1. From the clip's loudness envelope, or a stand-in pulse when there is no audio. */
  loudness: number;
  /** 'audio' when the audio clock drives the caption, 'clock' when it runs silently on a timer. */
  source: 'audio' | 'clock' | null;
  play: (line: TutorLine, opts?: { clip?: ClipFile; audioUrl?: string }) => void;
}

/** How long to wait for audio to start before falling back to a silent timer. */
export const AUDIO_START_MS = 1500;
/** A line always finishes within this many seconds of its expected length, whatever the audio does. */
export const OVERRUN_S = 3;

type PlayState = Omit<LinePlayback, 'play'>;
const IDLE: PlayState = { playing: false, line: null, words: [], activeIndex: null, feelings: null, loudness: 0, source: null };

/**
 * Plays a tutor line. With a clip and audio, the audio clock drives the caption, feelings and
 * loudness, so everything stays aligned at any playback speed (task 18.8; 4.5 adds speed tests).
 * If the audio will not load or play, the same timeline runs on a timer so the line still shows
 * with its subtitle and the student can carry on. With no clip it estimates a timeline and is silent.
 */
export function useLinePlayback(): LinePlayback {
  const [state, setState] = useState<PlayState>(IDLE);
  const raf = useRef(0);
  const busy = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const play = useCallback((line: TutorLine, opts?: { clip?: ClipFile; audioUrl?: string }) => {
    if (busy.current) return;
    busy.current = true;
    const clip = opts?.clip;
    const timeline: ClipTimeline = clip ?? estimateTimeline(line);
    const words = clip ? clip.words.map((w) => w.text) : wordsOf(line.es);
    const shown = clip ? { ...line, en: clip.en } : line;

    let source: 'audio' | 'clock' = 'clock';
    let clock = () => 0;
    // Audio has to start within AUDIO_START_MS. If it stalls (slow connection, blocked playback,
    // a device with no audio), the line runs on a timer instead of freezing, and the student carries on.
    let settled: 'pending' | 'audio' | 'timer' = 'pending';
    const useTimer = () => {
      if (settled !== 'pending') return;
      settled = 'timer';
      audio?.pause();
      const t0 = performance.now();
      clock = () => (performance.now() - t0) / 1000;
      source = 'clock';
    };

    let audio: HTMLAudioElement | null = null;
    let stall: ReturnType<typeof setTimeout> | undefined;
    if (opts?.audioUrl) {
      audio = new Audio(opts.audioUrl);
      audioRef.current = audio;
      audio.addEventListener('error', useTimer);
      audio.play().then(
        () => {
          if (settled !== 'pending') return audio?.pause(); // too late: the timer already took over
          settled = 'audio';
          source = 'audio';
          clock = () => audio!.currentTime;
        },
        useTimer,
      );
      stall = setTimeout(useTimer, AUDIO_START_MS);
    } else {
      useTimer();
    }

    let done = false;
    let hardStop: ReturnType<typeof setTimeout> | undefined;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(stall);
      clearTimeout(hardStop);
      cancelAnimationFrame(raf.current);
      busy.current = false;
      audio?.pause();
      audioRef.current = null;
      setState(IDLE);
    };
    // Independent of animation frames, which pause in a hidden tab or on a starved device.
    hardStop = setTimeout(finish, (timeline.end + OVERRUN_S) * 1000 + 500);
    const startedAt = performance.now();
    const tick = () => {
      if (done) return;
      const t = clock();
      const overran = (performance.now() - startedAt) / 1000 > timeline.end + OVERRUN_S;
      if (t >= timeline.end || overran || (audio?.ended && source === 'audio')) return finish();
      const head = playheadAt(timeline, t);
      setState({
        playing: true, line: shown, words, activeIndex: head.activeIndex, feelings: head.feelings, source,
        loudness: clip ? head.loudness : head.activeIndex === null ? 0 : 0.55 + 0.35 * Math.sin(t * 13),
      });
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  }, []);

  useEffect(
    () => () => {
      cancelAnimationFrame(raf.current);
      audioRef.current?.pause();
    },
    [],
  );
  return { ...state, play };
}
