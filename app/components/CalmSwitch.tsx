'use client';

import { useEffect, useState } from 'react';

const KEY = 'calm';

/**
 * The learner's calm switch: stops idle motion, glitches and camcorder effects.
 * The choice is a device-only display preference, stored in localStorage and applied to
 * <html data-calm> before first paint by the inline script in the root layout.
 */
export function CalmSwitch() {
  const [on, setOn] = useState(false);

  useEffect(() => {
    setOn(document.documentElement.dataset.calm === 'on');
  }, []);

  function toggle() {
    const next = !on;
    setOn(next);
    if (next) document.documentElement.dataset.calm = 'on';
    else delete document.documentElement.dataset.calm;
    try {
      localStorage.setItem(KEY, next ? 'on' : 'off');
    } catch {
      // Private mode or blocked storage: the switch still works for this visit.
    }
  }

  return (
    <button type="button" role="switch" aria-checked={on} className="calm-switch" onClick={toggle}>
      <span>Calm mode</span>
      <span>{on ? 'On' : 'Off'}</span>
    </button>
  );
}
