'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { moodPlan, MOODS, type Mood } from '../../lib/diagnostics/mood';
import { currentSessionId } from '../../lib/session/session-id';
import type { ClipFile } from '../../lib/tele/clip';
import { clipUrls, findClip, loadClip } from '../../lib/tele/clips';
import { linesFor, type PhraseLine } from '../../lib/tele/phrase-bank';
import { selectLine } from '../../lib/tele/select';
import { Status } from '../../lib/ui/Status';
import { PHASES, QUESTION_COUNT, type PhaseId, type PhaseState } from '../../lib/phases/gate';
import { Caption, useSubtitles } from './Caption';
import { Tele } from './Tele';
import { useLinePlayback } from './useLinePlayback';
import { ExamWindow, PlanWindow } from './Planner';
import type { ReadinessInput } from '../../lib/planner/readiness';
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
  /** What the readiness meter and plan are computed from. */
  progress?: ReadinessInput;
  signedIn?: boolean;
  nickname?: string | null;
  coins?: number;
  streak?: number;
  freezes?: number;
  wallpaper?: string | null;
  objects?: { id: string; es: string; en: string }[];
  /** The starting-point check has been done (or does not apply), so it is not offered. */
  baselineDone?: boolean;
  /** Extra lines for poking Tele. Empty unless the course has the cheeky pool on and the student bought it. */
  cheekyLines?: PhraseLine[];
}

/** A stable empty list, so a missing prop does not re-run the effect that depends on it. */
const NO_LINES: PhraseLine[] = [];
const NO_READINESS: ReadinessInput = { answersConfirmed: 0, questionsMastered: 0, answersMemorised: 0, questionsAutomated: 0 };

const MOOD_TEXT: Record<Mood, { es: string; en: string }> = {
  good: { es: 'Bien', en: 'Good' },
  ok: { es: 'Normal', en: 'Okay' },
  nervous: { es: 'Nervioso', en: 'Nervous' },
  tired: { es: 'Cansado', en: 'Tired' },
  not_a_fan: { es: 'No me gusta', en: 'Spanish is not my favourite' },
};
const moodKey = (sessionId: string) => `mood:${sessionId}`;

/** A question's picture in words as well as in the picture, so it is never shown by clarity alone. */
const clarityWord = (c: number) => (c >= 1 ? 'clear' : c > 0 ? 'clearing' : 'static');

/**
 * The home screen: Tele on a desktop with the countdown, the four phases in their fixed order and
 * the five question files. Locked phases show as static and cannot be opened. The sandbox is the
 * space around the path; it never replaces it.
 */
export function Desktop({ states, daysToTest, channels = [], progress = NO_READINESS, signedIn = true, nickname = null, coins = 0, streak = 0, freezes = 0, wallpaper = null, objects = [], baselineDone = true, cheekyLines = NO_LINES }: DesktopProps) {
  const [showEnglish, toggleEnglish] = useSubtitles();
  const playback = useLinePlayback();
  const lastLine = useRef<string | null>(null);
  const clips = useRef(new Map<string, ClipFile>());
  /** Null until we know whether this session has been asked; then the answer, or false if not yet answered. */
  const [mood, setMood] = useState<Mood | false | 'skipped' | null>(null);
  const [moodError, setMoodError] = useState(false);

  // Load clip timelines up front so audio can start inside the tap: iPhone blocks audio that
  // starts after an await. A line with no clip, or whose clip fails to load, plays silently.
  useEffect(() => {
    for (const line of [...linesFor('poke'), ...cheekyLines, ...linesFor('nervous'), ...linesFor('dislike'), ...linesFor('quick_win')]) {
      const slot = findClip(line.es);
      if (slot) loadClip(slot).then((clip) => clips.current.set(line.id, clip), () => {});
    }
    // One question per visit: a mood already given in this session is not asked for again.
    try {
      const saved = localStorage.getItem(moodKey(currentSessionId()));
      setMood(saved === 'skipped' ? 'skipped' : (MOODS as readonly string[]).includes(saved ?? '') ? (saved as Mood) : false);
    } catch {
      setMood(false);
    }
  }, [cheekyLines]);

  function skipMood() {
    try { localStorage.setItem(moodKey(currentSessionId()), 'skipped'); } catch { /* asked again next page load, which is fine */ }
    setMood('skipped');
  }

  async function answerMood(m: Mood) {
    setMoodError(false);
    const sessionId = currentSessionId();
    try {
      const res = await fetch('/api/mood', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ mood: m, sessionId }) });
      if (!res.ok) throw new Error('save failed');
    } catch {
      setMoodError(true);
      return;
    }
    try { localStorage.setItem(moodKey(sessionId), m); } catch { /* the answer is still saved on the server */ }
    setMood(m);
    // Tele answers in Spanish, lightly. Nothing here earns coins.
    const [situation] = moodPlan(m).situations;
    if (situation && !playback.playing) {
      const line = selectLine(situation, { lastId: lastLine.current });
      lastLine.current = line.id;
      const clip = clips.current.get(line.id);
      const slot = findClip(line.es);
      playback.play(line, clip && slot ? { clip, audioUrl: clipUrls(slot).audio } : undefined);
    }
  }

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
        {signedIn && mood !== null && mood !== 'skipped' && (
          <Win title="animo.exe" label="How are you feeling">
            {mood === false ? (
              <>
                <p>
                  <strong>¿Cómo estás hoy?</strong> <span className="muted">How are you today? You can skip this.</span>
                </p>
                <ul className="options" aria-label="Pick how you feel">
                  {MOODS.map((m) => (
                    <li key={m}>
                      <button type="button" className="option" data-mood={m} onClick={() => answerMood(m)}>
                        <span lang="es">{MOOD_TEXT[m].es}</span> <span className="muted">{MOOD_TEXT[m].en}</span>
                      </button>
                    </li>
                  ))}
                </ul>
                {moodError && <p className="error" role="alert">That did not save. You can carry on and try again later.</p>}
                <button type="button" className="btn" onClick={skipMood}>Skip</button>
              </>
            ) : (
              <>
                <p className="muted" data-testid="mood-done">Thanks. Mood today: {MOOD_TEXT[mood].en}.</p>
                {moodPlan(mood).quickWin && (
                  <Link className="btn btn-primary" href="/phases/understand?quick=1" data-testid="quick-win">
                    One easy one first
                  </Link>
                )}
              </>
            )}
          </Win>
        )}
        {signedIn && !baselineDone && (
          <Win title="inicio.exe" label="Starting point">
            <p>Want to see what you already know? Five quick questions, with the answers shown after each.</p>
            <Link className="btn" href="/baseline" data-testid="baseline-link">Find my starting point</Link>
          </Win>
        )}
        <ExamWindow daysToTest={daysToTest} progress={progress} />
        <PlanWindow daysToTest={daysToTest} progress={progress} />

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

        {signedIn && (
          <Win title="escritorio.exe" label="Your desktop">
            <p data-testid="streak">
              Streak: <strong>{streak}</strong> {streak === 1 ? 'day' : 'days'}
              {freezes > 0 && <span className="muted"> ({freezes} {freezes === 1 ? 'freeze' : 'freezes'} ready)</span>}
            </p>
            <p className="coins" data-testid="desktop-coins">{coins} coins</p>
            {objects.length > 0 && (
              <ul className="desk-things" aria-label="Things on your desktop">
                {objects.map((o) => (
                  <li key={o.id} data-testid={`thing-${o.id}`}>
                    <ObjectIcon id={o.id} />
                    <span lang="es">{o.es}</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="controls">
              <Link className="btn" href="/shop">Tienda</Link>
              <Link className="btn" href="/progress">My progress</Link>
            </div>
          </Win>
        )}

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
      <p className="muted desktop-footer">
        <Link href="/privacy" data-testid="privacy-link">Privacy and your data</Link>
      </p>
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
