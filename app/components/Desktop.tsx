'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { ClipFile } from '../../lib/tele/clip';
import { clipUrls, findClip, loadClip } from '../../lib/tele/clips';
import { linesFor, type PhraseLine } from '../../lib/tele/phrase-bank';
import { selectLine } from '../../lib/tele/select';
import { FIRST_SCREEN } from '../../lib/ui/first-screen';
import { Status } from '../../lib/ui/Status';
import { PHASES, type PhaseId, type PhaseState } from '../../lib/phases/gate';
import type { CanDo as CanDoData } from '../../lib/progress/can-do';
import { Caption, useSubtitles } from './Caption';
import { Tele } from './Tele';
import { useLinePlayback } from './useLinePlayback';
import { ExamWindow } from './Planner';
import { WhatsNext } from './WhatsNext';
import type { NextStep } from '../../lib/planner/next-step';
import type { ReadinessInput } from '../../lib/planner/readiness';
import { WINDOW_TITLES } from '../../lib/ui/window-titles';
import { CanDo } from './CanDo';
import { Greeting } from './Greeting';
import { Win } from './Win';
import './desktop.css';
import './screens.css';

const PHASE_TEXT: Record<PhaseId, { title: string; en: string }> = {
  write: { title: 'Write', en: 'Write your answers' },
  understand: { title: 'Understand', en: 'Understand the questions' },
  memorise: { title: 'Memorise', en: 'Say your answers from memory' },
  automate: { title: 'Answer fast', en: 'Answer without thinking' },
};

export interface DesktopProps {
  states: Record<PhaseId, PhaseState>;
  /** A testing course (course-unlock-testing): every phase is open, and the desktop says so in words. */
  unlockAll?: boolean;
  daysToTest: number;
  /** One can-do row per question for the "What I can do" window. Left out for a signed-out visitor. */
  canDo?: CanDoData | null;
  /** What the readiness meter and plan are computed from. */
  progress?: ReadinessInput;
  /** The step the "What's next?" window points at. Left out for a signed-out visitor. */
  next?: NextStep;
  signedIn?: boolean;
  nickname?: string | null;
  coins?: number;
  streak?: number;
  freezes?: number;
  wallpaper?: string | null;
  objects?: { id: string; es: string; en: string }[];
  /** Extra lines for poking Tele. Empty unless the course has the cheeky pool on and the student bought it. */
  cheekyLines?: PhraseLine[];
}

/** A stable empty list, so a missing prop does not re-run the effect that depends on it. */
const NO_LINES: PhraseLine[] = [];
const NO_READINESS: ReadinessInput = { answersConfirmed: 0, questionsMastered: 0, answersMemorised: 0, questionsAutomated: 0 };

/**
 * The home screen: Tele on a desktop with a greeting, what to do next, what the student can already do, the
 * countdown and the four steps in their fixed order. Locked steps cannot be opened. The sandbox is the space
 * around the path; it never replaces it.
 */
export function Desktop({ states, unlockAll = false, daysToTest, canDo = null, progress = NO_READINESS, next, signedIn = true, nickname = null, coins = 0, streak = 0, freezes = 0, wallpaper = null, objects = [], cheekyLines = NO_LINES }: DesktopProps) {
  const [showEnglish, toggleEnglish] = useSubtitles();
  const playback = useLinePlayback();
  const lastLine = useRef<string | null>(null);
  const clips = useRef(new Map<string, ClipFile>());

  // Load clip timelines up front so audio can start inside the tap: iPhone blocks audio that
  // starts after an await. A line with no clip, or whose clip fails to load, plays silently.
  useEffect(() => {
    for (const line of [...linesFor('poke'), ...cheekyLines]) {
      const slot = findClip(line.es);
      if (slot) loadClip(slot).then((clip) => clips.current.set(line.id, clip), () => {});
    }
  }, [cheekyLines]);

  // The daily reminder was removed. Clear the settings it left on this device.
  useEffect(() => {
    try { localStorage.removeItem('planner:prefs'); localStorage.removeItem('planner:reminder-shown'); } catch { /* storage blocked */ }
  }, []);

  // Poking Tele plays a stock line. It earns nothing: no coins, no progress, no request to the API.
  function poke() {
    if (playback.playing) return;
    const line = selectLine('poke', { lastId: lastLine.current, ...(cheekyLines.length ? { bank: [...linesFor('poke'), ...cheekyLines] } : {}) });
    lastLine.current = line.id;
    const clip = clips.current.get(line.id);
    const slot = findClip(line.es);
    playback.play(line, clip && slot ? { clip, audioUrl: clipUrls(slot).audio } : undefined);
  }

  return (
    <main className="desktop" data-wallpaper={wallpaper ? 'custom' : 'none'} style={wallpaper ? { background: wallpaper } : undefined}>
      <h1 className="desktop-title">My Spanish Tutor</h1>

      <div className="desktop-tele">
        {signedIn && nickname && <Greeting nickname={nickname} />}
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
          <Win title={WINDOW_TITLES.getStarted}>
            <div className="stack">
              <div className="stack">
                <Link className="btn btn-primary" href="/welcome" data-testid="sign-up">
                  {FIRST_SCREEN.signUp.label}
                </Link>
                <p className="muted">{FIRST_SCREEN.signUp.hint}</p>
              </div>
              <div className="stack">
                <Link className="btn" href="/restore" data-testid="lost-account">
                  {FIRST_SCREEN.lost.label}
                </Link>
                <p className="muted">{FIRST_SCREEN.lost.hint}</p>
              </div>
            </div>
          </Win>
        )}
        {signedIn && next && <WhatsNext next={next} />}
        {signedIn && canDo && <CanDo canDo={canDo} />}
        <ExamWindow daysToTest={daysToTest} progress={progress} />

        <Win title={WINDOW_TITLES.steps}>
          {unlockAll && (
            <p className="testing-note" data-testid="testing-label">
              <strong>Testing course:</strong> every step is open so you can try them all.
            </p>
          )}
          <ol className="phases">
            {PHASES.map((id) => {
              const state = states[id];
              const text = PHASE_TEXT[id];
              if (state.status === 'open') {
                return (
                  <li key={id}>
                    <Link href={`/phases/${id}`} className="phase phase-open" data-phase={id} data-state="open">
                      <span className="phase-title">{text.title}</span>
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
                      <span className="phase-title">{text.title}</span>
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

        {signedIn && (
          <Win title={WINDOW_TITLES.streak}>
            <p data-testid="streak">
              Streak: <strong>{streak}</strong> {streak === 1 ? 'day' : 'days'}
              {freezes > 0 && <span className="muted"> ({freezes} {freezes === 1 ? 'freeze' : 'freezes'} ready)</span>}
            </p>
            <p className="coins" data-testid="desktop-coins">€{coins}</p>
            {objects.length > 0 && (
              <ul className="desk-things" aria-label="Things on your desktop">
                {objects.map((o) => (
                  <li key={o.id} data-testid={`thing-${o.id}`}>
                    <ObjectIcon id={o.id} />
                    <span lang="es">{o.es}</span> <span className="muted">{o.en}</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="controls">
              <Link className="btn" href="/shop">Shop</Link>
            </div>
          </Win>
        )}

        {/* Inside the windows column, never below the pinned Tele. */}
        <p className="muted desktop-footer">
          <Link href="/privacy" data-testid="privacy-link">Privacy and your data</Link>
        </p>
      </div>
    </main>
  );
}

/** Small drawings for the things a student can buy. Decorative: the name is always written beside them. */
function ObjectIcon({ id }: { id: string }) {
  return (
    <svg viewBox="0 0 24 24" width="32" height="32" aria-hidden="true" shapeRendering="crispEdges">
      {id === 'obj-lampara' && (
        <>
          <path d="M12 2a6 6 0 0 0-3 11v3h6v-3a6 6 0 0 0-3-11z" fill="#ffeb00" stroke="#0b2a4a" strokeWidth="1.5" />
          <path d="M9 19h6v3H9z" fill="#c0c0c0" stroke="#0b2a4a" strokeWidth="1.5" />
        </>
      )}
      {id === 'obj-reloj' && (
        <>
          <circle cx="12" cy="12" r="9" fill="#fff" stroke="#0b2a4a" strokeWidth="1.5" />
          <path d="M12 6v6l4 3" fill="none" stroke="#0b2a4a" strokeWidth="1.5" />
        </>
      )}
      {id === 'obj-planta' && (
        <>
          <path d="M12 20V9M12 12c-5 0-6-4-6-6 5 0 6 3 6 6zm0 2c5 0 6-3 6-5-5 0-6 2-6 5z" fill="#5bbb2e" stroke="#0b2a4a" strokeWidth="1.2" />
          <path d="M8 20h8l-1 3H9z" fill="#ff5fa8" stroke="#0b2a4a" strokeWidth="1.2" />
        </>
      )}
    </svg>
  );
}
