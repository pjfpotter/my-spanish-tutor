'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { nextStop, prevStop, stopAt, STOPS } from '../../lib/demo/stops';
import { recordingOn, resetDemo, setRecording } from '../../lib/demo/session';
import './demo.css';

/**
 * The "Demo" label that sits over every demo screen (it floats, so the screens keep their own layout), and the way
 * around the tour: previous and next stop, the stop list, Reset and the recording switch.
 */
export function DemoBar() {
  const pathname = usePathname();
  const [recording, setRec] = useState(false);
  const at = stopAt(pathname);
  const next = nextStop(pathname);
  const prev = prevStop(pathname);

  useEffect(() => {
    setRec(recordingOn());
    document.documentElement.dataset.demoRecording = recordingOn() ? 'on' : 'off';
  }, []);

  function toggleRecording() {
    const on = !recording;
    setRecording(on);
    setRec(on);
    document.documentElement.dataset.demoRecording = on ? 'on' : 'off';
    // Each stop reads the switch when it opens, so open it again.
    window.location.reload();
  }

  function reset() {
    resetDemo();
    window.location.assign('/demo');
  }

  return (
    <div className="demo-bar" data-testid="demo-bar" data-recording={recording || undefined}>
      <details>
        <summary>
          <strong>Demo</strong>
          {at && <span> stop {at.index + 1} of {STOPS.length}</span>}
          <span className="sr-only"> (open the demo menu)</span>
        </summary>
        <div className="demo-menu">
          <p>Sample course and made-up students. Nothing here is saved.</p>
          <ol>
            {STOPS.map((s) => (
              <li key={s.id}><Link href={s.path} aria-current={at?.stop.id === s.id ? 'page' : undefined}>{s.title}</Link></li>
            ))}
          </ol>
          <div className="demo-menu-row">
            {prev && <Link className="btn" href={prev.path} data-testid="demo-prev">Previous stop</Link>}
            {next && <Link className="btn btn-primary" href={next.path} data-testid="demo-next">Next stop</Link>}
            {!next && at && <Link className="btn btn-primary" href="/demo" data-testid="demo-done">Back to the start</Link>}
          </div>
          <label className="demo-switch">
            <input type="checkbox" checked={recording} onChange={toggleRecording} data-testid="demo-recording" />
            <span>Recording mode: no timers or prompts</span>
          </label>
          <div className="demo-menu-row">
            <button type="button" className="btn" onClick={reset} data-testid="demo-reset">Reset the demo</button>
            <Link className="btn" href="/">Leave the demo</Link>
          </div>
        </div>
      </details>
    </div>
  );
}
