'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import type { ClipFile } from '../../lib/tele/clip';
import { clipUrls, findClip, loadClip } from '../../lib/tele/clips';
import { linesFor } from '../../lib/tele/phrase-bank';
import { selectLine } from '../../lib/tele/select';
import { Status } from '../../lib/ui/Status';
import { PHASES, QUESTION_COUNT, type PhaseId, type PhaseState } from '../../lib/phases/gate';
import { Caption, useSubtitles } from './Caption';
import { Tele } from './Tele';
import { useLinePlayback } from './useLinePlayback';
import { Win } from './Win';
import './desktop.css';
import './screens.css';

const PHASE_TEXT: Record<PhaseId, { es: string; en: string }> = {
  write: { es: 'Escribir', en: 'Write your answers' },
  understand: { es: 'Entender', en: 'Understand the questions' },
  memorise: { es: 'Memorizar', en: 'Say your answers from memory' },
  automate: { es: 'Automatizar', en: 'Answer without thinking' },
};

export interface DesktopProps {
  states: Record<PhaseId, PhaseState>;
  daysToTest: number;
  /** One number per question, 0 (static) to 1 (clear). Missing means no progress yet. */
  channels?: number[];
  signedIn?: boolean;
  nickname?: string | null;
}

/** A question's picture in words as well as in the picture, so it is never shown by clarity alone. */
const clarityWord = (c: number) => (c >= 1 ? 'clear' : c > 0 ? 'clearing' : 'static');

/**
 * The home screen: Tele on a desktop with the countdown, the four phases in their fixed order and
 * the five question files. Locked phases show as static and cannot be opened. The sandbox is the
 * space around the path; it never replaces it.
 */
export function Desktop({ states, daysToTest, channels = [], signedIn = true, nickname = null }: DesktopProps) {
  const [showEnglish, toggleEnglish] = useSubtitles();
  const playback = useLinePlayback();
  const lastLine = useRef<string | null>(null);
  const clips = useRef(new Map<string, ClipFile>());

  // Load clip timelines up front so audio can start inside the tap: iPhone blocks audio that
  // starts after an await. A line with no clip, or whose clip fails to load, plays silently.
  useEffect(() => {
    for (const line of linesFor('poke')) {
      const slot = findClip(line.es);
      if (slot) loadClip(slot).then((clip) => clips.current.set(line.id, clip), () => {});
    }
  }, []);

  // Poking Tele plays a stock line. It earns nothing: no coins, no progress, no request to the API.
  function poke() {
    if (playback.playing) return;
    const line = selectLine('poke', { lastId: lastLine.current });
    lastLine.current = line.id;
    const clip = clips.current.get(line.id);
    const slot = findClip(line.es);
    playback.play(line, clip && slot ? { clip, audioUrl: clipUrls(slot).audio } : undefined);
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
        {!signedIn && (
          <Win title="empezar.exe" label="Get started">
            <p>Make a profile to save your progress. No name or email needed.</p>
            <div className="controls">
              <Link className="btn btn-primary" href="/welcome">
                Make my profile
              </Link>
              <Link className="btn" href="/restore">
                I have a code
              </Link>
            </div>
          </Win>
        )}
        {signedIn && nickname && (
          <p className="muted" data-testid="nickname">
            Hola, {nickname}
          </p>
        )}
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
            {Array.from({ length: QUESTION_COUNT }, (_, i) => {
              const clarity = channels[i] ?? 0;
              return (
                <li key={i} className="file" data-testid="question-file" data-clarity={clarityWord(clarity)}>
                  <span className="file-pic" style={{ ['--static' as string]: 1 - clarity }}>
                    <svg viewBox="0 0 20 23" width="28" height="32" aria-hidden="true" shapeRendering="crispEdges">
                      <path d="M1 1h12l6 6v15H1z" fill="#fff" stroke="#0b2a4a" />
                      <path d="M13 1v6h6" fill="none" stroke="#0b2a4a" />
                    </svg>
                    <span className="file-static" aria-hidden="true" />
                  </span>
                  <span>Pregunta{i + 1}.txt</span>
                  <span className="file-state">{clarityWord(clarity)}</span>
                </li>
              );
            })}
          </ul>
        </Win>
      </div>
    </main>
  );
}
