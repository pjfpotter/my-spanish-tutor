'use client';

import { useEffect, useState } from 'react';

/** The greeting word for the device's own clock. The first render says "Hello", so server and browser agree. */
function helloFor(hour: number): string {
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 18) return 'Good afternoon';
  if (hour >= 18) return 'Good evening';
  return 'Hello';
}

/**
 * The nickname as a nameplate on a dusk sky, at the top of Tele's area. The sky and cloud are decoration; the
 * nickname is real text. The cloud stops under reduced motion and the calm switch.
 */
export function Greeting({ nickname }: { nickname: string }) {
  const [hello, setHello] = useState('Hello');
  useEffect(() => setHello(helloFor(new Date().getHours())), []);
  return (
    <div className="greeting" data-testid="greeting">
      <span className="greeting-sky" aria-hidden="true">
        <span className="greeting-cloud" />
      </span>
      <p className="greeting-plate">
        <span className="greeting-hello" data-testid="greeting-hello">{hello},</span>
        <strong className="greeting-name" data-testid="nickname">{nickname}</strong>
      </p>
    </div>
  );
}
