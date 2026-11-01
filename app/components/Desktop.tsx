'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import type { ClipFile } from '../../lib/tele/clip';
import { CLIP_IDS, clipUrls, loadClip } from '../../lib/tele/clips';
import { PLACEHOLDER_LINES, pickLine } from '../../lib/tele/lines';
import { Status } from '../../lib/ui/Status';
import { PHASES, QUESTION_COUNT, type PhaseId, type PhaseState } from '../../lib/phases/gate';
import { Caption, useSubtitles } from './Caption';
import { Tele } from './Tele';
import { useLinePlayback } from './useLinePlayback';
import { Win } from './Win';
import './desktop.css';

const PHASE_TEXT: Record<PhaseId, { es: string; en: string }> = {
  write: { es: 'Escribir', en: 'Write your answers' },
  understand: { es: 'Entender', en: 'Understand the questions' },
  memorise: { es: 'Memorizar', en: 'Say your answers from memory' },
  automate: { es: 'Automatizar', en: 'Answer without thinking' },
};

export interface DesktopProps {
  states: Record<PhaseId, PhaseState>;
  daysToTest: number;
}

/**
 * The home screen: Tele on a desktop with the countdown, the four phases in their fixed order and
 * the five question files. Locked phases show as static and cannot be opened. The sandbox is the
 * space around the path; it never replaces it.
 */
export function Desktop({ states, daysToTest }: DesktopProps) {
  const [showEnglish, toggleEnglish] = useSubtitles();
  const playback = useLinePlayback();
  const lastLine = useRef<string | null>(null);
  const clips = useRef(new Map<string, ClipFile>());

  // Load clip timelines up front so audio can start inside the tap: iPhone blocks audio that
  // starts after an await. A line with no clip, or whose clip fails to load, plays silently.
  useEffect(() => {
    for (const id of CLIP_IDS) {
      loadClip(id).then((clip) => clips.current.set(id, clip), () => {});
    }
  }, []);

  // Poking Tele plays a stock line. It earns nothing: no coins, no progress, no request to the API.
  function poke() {
    if (playback.playing) return;
    const line = pickLine(PLACEHOLDER_LINES, lastLine.current);
    lastLine.current = line.id;
    const clip = clips.current.get(line.id);
    playback.play(line, clip ? { clip, audioUrl: clipUrls(line.id).audio } : undefined);
  }

  return (
    <main className="desktop">
      <h1 className="desktop-title">My Spanish Tutor</h1>

      <div className="desktop-tele">
        <button type="button" className="tele-poke" onClick={poke} aria-label="Poke Tele to hear a line">
          <Tele feelings={playback.feelings ?? undefined} loudness={playback.loudness} speaking={playback.playing} />
        </button>
        <Caption
          words={playback.words}
          activeIndex={playback.activeIndex}
          english={playback.line?.en ?? ''}
          showEnglish={showEnglish}
          onToggleEnglish={toggleEnglish}
        />
      </div>

      <div className="desktop-windows">
        <Win title="examen.exe" label="Your speaking test">
          <p className="days" data-testid="days-to-test">
            <strong>{daysToTest}</strong> días
          </p>
          <p className="days-en">days until your speaking test</p>
          <p className="muted" data-testid="readiness">
            Readiness: not measured yet
          </p>
        </Win>

        <Win title="fases.exe" label="Your four steps">
          <ol className="phases">
            {PHASES.map((id) => {
              const state = states[id];
              const text = PHASE_TEXT[id];
              if (state.status === 'open') {
                return (
                  <li key={id}>
                    <Link href={`/phases/${id}`} className="phase phase-open" data-phase={id} data-state="open">
                      <span className="phase-es">{text.es}</span>
                      <span className="phase-en">{text.en}</span>
                      {state.done && <Status kind="done" label="Done" />}
                    </Link>
                  </li>
                );
              }
              const reasonId = `reason-${id}`;
              return (
                <li key={id}>
                  <button
                    type="button"
                    className="phase phase-locked"
                    data-phase={id}
                    data-state="locked"
                    aria-disabled="true"
                    aria-describedby={reasonId}
                    onClick={(e) => e.preventDefault()}
                  >
                    <span className="phase-static" aria-hidden="true" />
                    <span className="phase-chip">
                      <Status kind="locked" label="Locked" />
                      <span className="phase-es">{text.es}</span>
                      <span className="phase-en">{text.en}</span>
                      <span id={reasonId} className="phase-reason">
                        {state.reason}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </Win>

        <Win title="preguntas" label="The five test questions">
          <ul className="files">
            {Array.from({ length: QUESTION_COUNT }, (_, i) => (
              <li key={i} className="file" data-testid="question-file">
                <svg viewBox="0 0 20 23" width="28" height="32" aria-hidden="true" shapeRendering="crispEdges">
                  <path d="M1 1h12l6 6v15H1z" fill="#fff" stroke="#0b2a4a" />
                  <path d="M13 1v6h6" fill="none" stroke="#0b2a4a" />
                </svg>
                <span>Pregunta{i + 1}.txt</span>
              </li>
            ))}
          </ul>
        </Win>
      </div>
    </main>
  );
}
