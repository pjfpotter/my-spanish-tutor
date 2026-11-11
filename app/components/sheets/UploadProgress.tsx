'use client';

import { useEffect, useState } from 'react';
import type { Stage } from '../../../lib/sheets/ingest';
import { messageAt, progressFor } from '../../../lib/sheets/progress';
import { Tele } from '../Tele';
import { Win } from '../Win';
import './sheets.css';

export interface UploadProgressProps {
  stage: Stage;
  /** Set when the upload ended in a problem the teacher can read. */
  problem?: string;
  canRetry?: boolean;
  /** Set when the sheet is ready but with basic help only. */
  note?: string;
  onRetry?: () => void;
  /** How often the message changes within a stage, in ms. */
  messageMs?: number;
}

/**
 * Tele reading the sheet (task 4.8): a progress bar tied to the real stages and short Spanish messages
 * with English subtitles. Motion stops under reduced motion and the calm switch; the messages still change.
 */
export function UploadProgress({ stage, problem, canRetry = true, note, onRetry, messageMs = 2400 }: UploadProgressProps) {
  const [tick, setTick] = useState(0);
  const [pct, setPct] = useState(0);
  useEffect(() => { setTick(0); }, [stage]);
  useEffect(() => { setPct((p) => progressFor(stage, p)); }, [stage]);
  useEffect(() => {
    if (stage === 'done' || problem) return;
    const id = setInterval(() => setTick((t) => t + 1), messageMs);
    return () => clearInterval(id);
  }, [stage, problem, messageMs]);

  const m = messageAt(stage, tick);
  const state = problem ? 'problem' : note ? 'fallback' : stage === 'done' ? 'ready' : 'working';
  const feelings = problem ? { sadness: 0.5 } : stage === 'done' ? { joy: 0.8 } : { surprise: 0.25 };
  return (
    <Win title="leyendo.exe" label="Reading your sheet">
      <div className="up" data-state={state} data-stage={stage}>
        <div className="up-tele"><Tele feelings={feelings} /></div>
        <div>
          {problem ? (
            <p className="up-es" lang="es">Mmm…</p>
          ) : (
            <>
              <p className="up-es" lang="es" aria-live="polite" data-testid="message-es">{m.es}</p>
              <p className="up-en" data-testid="message-en">{m.en}</p>
            </>
          )}
        </div>
        <div className="up-bar" role="progressbar" aria-label="Reading your sheet" aria-valuemin={0} aria-valuemax={100} aria-valuenow={problem ? pct : pct}>
          <div className="up-fill" style={{ width: `${pct}%` }} />
        </div>
        {note && <p className="up-note">{note}</p>}
        {problem && (
          <>
            <p className="up-problem" role="alert">{problem}</p>
            {canRetry && onRetry && <div className="up-actions"><button type="button" className="btn" onClick={onRetry}>Try again</button></div>}
          </>
        )}
      </div>
    </Win>
  );
}
