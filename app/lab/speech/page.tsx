'use client';

import { useState } from 'react';
import { useSpeechCapture, type CaptureResult } from '../../components/useSpeechCapture';
import { Win } from '../../components/Win';
import '../../components/screens.css';

/** Where speech capture can be tried on a device (task 5.1). The memorise and automate phases use the same hook. */
export default function SpeechLab() {
  const [last, setLast] = useState<CaptureResult | null>(null);
  const cap = useSpeechCapture(setLast);

  return (
    <main className="screen">
      <h1>Hablar</h1>
      <Win title="hablar.exe" label="Speech capture">
        <div className="stack">
          {cap.state === 'idle' && (
            <p data-testid="explain">
              Tele needs to hear you to check what you said. Your voice is only used for that, and it is not saved. Your
              device will ask to use the microphone the first time.
            </p>
          )}
          {cap.state === 'denied' && (
            <p className="error" role="status" data-testid="denied">
              The microphone is blocked. Tele cannot hear you without it. Allow the microphone for this site in your browser, then try again.
            </p>
          )}
          {cap.state === 'unsupported' && (
            <p className="error" role="status" data-testid="unsupported">
              This browser cannot use a microphone here. Try Chrome on a phone or a Chromebook, or a different device.
            </p>
          )}
          {cap.state === 'unavailable' && (
            <p className="error" role="status" data-testid="unavailable">
              Tele could not listen just now. That is not your fault and it does not count against you. Try again in a moment.
            </p>
          )}
          {cap.state === 'listening' && <p data-testid="listening">Listening… say your answer, then press Done.</p>}
          {cap.state === 'processing' && <p data-testid="processing">Checking what you said…</p>}

          <div className="controls">
            {(cap.state === 'idle' || cap.state === 'checking') && (
              <button type="button" className="btn btn-primary" onClick={cap.start} disabled={cap.state === 'checking'}>
                Start speaking
              </button>
            )}
            {cap.state === 'listening' && (
              <button type="button" className="btn btn-primary" onClick={cap.stop}>
                Done
              </button>
            )}
            {(cap.state === 'denied' || cap.state === 'unavailable') && (
              <button type="button" className="btn btn-primary" onClick={cap.retry}>
                Try again
              </button>
            )}
          </div>

          <p className="muted" data-testid="path">
            Recognition: {cap.path}
          </p>
          {last?.status === 'ok' && (
            <p data-testid="transcript" lang="es">
              {last.transcript}
            </p>
          )}
          {last?.status === 'unclear' && <p data-testid="unclear">I could not hear that clearly. Try again.</p>}
        </div>
      </Win>
    </main>
  );
}
