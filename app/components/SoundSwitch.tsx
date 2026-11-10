'use client';

import { useEffect, useState } from 'react';
import { soundOn, SOUND_KEY } from '../../lib/practice/sound';

/** The student's sound switch: interface sounds on or off. A device-only preference, like the calm switch. */
export function SoundSwitch() {
  const [on, setOn] = useState(true);

  useEffect(() => {
    try {
      setOn(soundOn(localStorage.getItem(SOUND_KEY)));
    } catch {
      /* storage blocked: sound stays on for this visit */
    }
  }, []);

  function toggle() {
    const next = !on;
    setOn(next);
    try {
      localStorage.setItem(SOUND_KEY, next ? 'on' : 'off');
    } catch {
      /* the switch still works for this visit */
    }
  }

  return (
    <button type="button" role="switch" aria-checked={on} className="calm-switch sound-switch" onClick={toggle}>
      <span>Sound</span>
      <span>{on ? 'On' : 'Off'}</span>
    </button>
  );
}
