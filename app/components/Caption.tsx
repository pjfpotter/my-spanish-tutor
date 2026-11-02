'use client';

import { useEffect, useState } from 'react';
import './caption.css';

const KEY = 'subtitles';

/** The student's subtitle choice. Device-only display preference, on by default. */
export function useSubtitles(): [boolean, () => void] {
  const [show, setShow] = useState(true);
  useEffect(() => {
    try {
      if (localStorage.getItem(KEY) === 'off') setShow(false);
    } catch {
      // Blocked storage: keep the default.
    }
  }, []);
  const toggle = () =>
    setShow((cur) => {
      try {
        localStorage.setItem(KEY, cur ? 'off' : 'on');
      } catch {
        // The switch still works for this visit.
      }
      return !cur;
    });
  return [show, toggle];
}

export interface CaptionProps {
  /** The Spanish line, split into words. Empty shows the idle message. */
  words: string[];
  /** Index of the word being spoken, or null. */
  activeIndex: number | null;
  /** English subtitle for the whole line. Tutor audio is Spanish only; English is text only. */
  english: string;
  showEnglish: boolean;
  onToggleEnglish: () => void;
}

const IDLE_ES = '· · · señal débil · · ·';
const IDLE_EN = 'weak signal';

export function Caption({ words, activeIndex, english, showEnglish, onToggleEnglish }: CaptionProps) {
  const idle = words.length === 0;
  return (
    <section className="win" aria-label="Tele's caption">
      <div className="win-bar">
        <span>tele.exe</span>
        <span className="win-buttons" aria-hidden="true">
          <i />
          <i />
        </span>
      </div>
      <div className="win-body">
        <p className={idle ? 'cap cap-idle' : 'cap'} lang="es" data-testid="caption-es">
          {idle
            ? IDLE_ES
            : words.map((w, i) => (
                <span key={i}>
                  <span className="cw" data-active={i === activeIndex}>
                    {w}
                  </span>
                  {i < words.length - 1 ? ' ' : ''}
                </span>
              ))}
        </p>
        {showEnglish && (
          <p className="cap-en" lang="en" data-testid="caption-en">
            {idle ? IDLE_EN : english}
          </p>
        )}
      </div>
      <div className="win-foot">
        <button type="button" role="switch" aria-checked={showEnglish} onClick={onToggleEnglish}>
          English subtitle: {showEnglish ? 'On' : 'Off'}
        </button>
      </div>
    </section>
  );
}
