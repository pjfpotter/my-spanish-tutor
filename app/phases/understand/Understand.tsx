'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SPEEDS, type SpeedName } from '../../../lib/audio/speeds';
import type { Support } from '../../../lib/diagnostics/plan';
import { afterAttempt, newQueue, nextInQueue, type SessionQueue } from '../../../lib/mastery/mastery';
import { currentSessionId } from '../../../lib/session/session-id';
import type { ClipFile } from '../../../lib/tele/clip';
import { clipUrls, loadClip, type BuiltClip } from '../../../lib/tele/clips';
import type { Feelings } from '../../../lib/tele/feelings';
import type { TutorLine } from '../../../lib/tele/lines';
import { selectLine } from '../../../lib/tele/select';
import { buildOptions, nextSpeed, type LastPresentation, type Option } from '../../../lib/understand/speed';
import { Status } from '../../../lib/ui/Status';
import { Caption, useSubtitles } from '../../components/Caption';
import { Tele } from '../../components/Tele';
import { useLinePlayback } from '../../components/useLinePlayback';
import { Win } from '../../components/Win';
import { canPlayWord, Probe } from './Probe';
import '../../components/screens.css';

export interface QuestionItem {
  id: string;
  position: number;
  spanish: string;
  english: string;
  mastered: boolean;
  laterSession: boolean;
  successes: number;
  keyWord: { spanish: string; english: string } | null;
}

type Stage = 'ready' | 'choosing' | 'answered';

interface Presentation {
  id: string;
  speed: SpeedName;
  options: Option[];
  replays: number;
  usedSlow: boolean;
  revealed: boolean;
  /** The clip would not load, so the question is shown as text. */
  textFallback: boolean;
  played: boolean;
  choosingSince: number | null;
}

const slotFor = (index: readonly BuiltClip[], text: string, speed: number) => index.find((c) => c.text === text && c.speed === speed)?.slot ?? null;

/**
 * The hear-then-choose screen (task 6.1). The student hears a question in Tele's voice, with the
 * Spanish text hidden, and picks what it means. They can replay it, hear it slower, or reveal the
 * words; revealing marks the attempt as assisted so it never counts toward mastery. A miss brings
 * the question back soon, a success pushes it further away, and speed rises as they succeed.
 */
export function Understand({ questions, quickId = null, plans = {} }: { questions: QuestionItem[]; quickId?: string | null; plans?: Record<string, Support> }) {
  const byId = useMemo(() => new Map(questions.map((q) => [q.id, q])), [questions]);
  const [showEnglish, toggleEnglish] = useSubtitles();
  const playback = useLinePlayback();
  const sessionId = useRef('');
  const index = useRef<readonly BuiltClip[]>([]);
  const clips = useRef(new Map<string, ClipFile>());
  const last = useRef(new Map<string, LastPresentation>());
  const lastLine = useRef<string | null>(null);

  const [queue, setQueue] = useState<SessionQueue>(() => newQueue(quickId ? [quickId] : questions.filter((q) => !q.mastered && !q.laterSession).map((q) => q.id)));
  const [cur, setCur] = useState<Presentation | null>(null);
  const [stage, setStage] = useState<Stage>('ready');
  const [picked, setPicked] = useState<string | null>(null);
  const [coins, setCoins] = useState(0);
  const [masteredIds, setMasteredIds] = useState(() => new Set(questions.filter((q) => q.mastered).map((q) => q.id)));
  const [message, setMessage] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  /** After a miss, the id of the question being probed; null when no check is running. */
  const [probing, setProbing] = useState<string | null>(null);

  const tele = (situation: Parameters<typeof selectLine>[0]): TutorLine => {
    const line = selectLine(situation, { lastId: lastLine.current });
    lastLine.current = line.id;
    return line;
  };

  // Learn which clips exist. A seam (an API route) so a test can stand in stub clips.
  useEffect(() => {
    sessionId.current = currentSessionId();
    fetch('/api/clips')
      .then((r) => (r.ok ? r.json() : []))
      .catch(() => [])
      .then((list: BuiltClip[]) => {
        index.current = list;
        setReady(true);
      });
  }, []);

  const present = useCallback(
    (q: SessionQueue) => {
      const id = nextInQueue(q);
      if (!id) {
        setCur(null);
        return;
      }
      const item = byId.get(id)!;
      const speed = nextSpeed(last.current.get(id) ?? null, plans[id]?.startSpeed ?? 'slow');
      setCur({
        id, speed, options: buildOptions(questions, id), replays: 0, usedSlow: false, revealed: false, textFallback: false, played: false, choosingSince: null,
      });
      setStage('ready');
      setPicked(null);
      setMessage(null);
      setProbing(null);
      // Load this question's three clips ahead of the tap, so audio can start inside it (iPhone blocks audio that starts later).
      for (const s of Object.values(SPEEDS)) {
        const slot = slotFor(index.current, item.spanish, s);
        if (slot && !clips.current.has(slot)) loadClip(slot).then((c) => clips.current.set(slot, c), () => {});
      }
    },
    [byId, questions, plans],
  );

  useEffect(() => {
    if (ready) present(queue);
    // Present the first question once clip index is known; later ones come from `next`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  function failure(slot: string | null) {
    if (slot) void fetch('/api/clip-failure', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ slot }) }).catch(() => {});
  }

  /** Plays the question at a speed. If the clip is missing or broken, shows the question as text instead. */
  async function listen(speedName: SpeedName, kind: 'first' | 'replay' | 'slow') {
    if (!cur || playback.playing) return;
    const item = byId.get(cur.id)!;
    const slot = slotFor(index.current, item.spanish, SPEEDS[speedName]);
    let clip = slot ? clips.current.get(slot) : undefined;
    if (slot && !clip) {
      try {
        clip = await loadClip(slot);
        clips.current.set(slot, clip);
      } catch {
        failure(slot);
      }
    }
    const line: TutorLine = { id: `q-${item.position}`, es: item.spanish, en: item.english, feelings: {} as Feelings };
    if (!clip || !slot) {
      // Missing clip: show the question as text with its subtitle and let the student carry on.
      setCur((c) => c && { ...c, textFallback: true, revealed: true, played: true, choosingSince: c.choosingSince ?? Date.now() });
      setStage('choosing');
      return;
    }
    playback.play(line, { clip, audioUrl: clipUrls(slot).audio });
    setCur((c) => c && {
      ...c,
      played: true,
      replays: c.replays + (kind === 'replay' ? 1 : 0),
      usedSlow: c.usedSlow || kind === 'slow',
      choosingSince: c.choosingSince ?? Date.now(),
    });
    setStage('choosing');
  }

  function reveal() {
    setCur((c) => c && { ...c, revealed: true });
  }

  async function choose(optionId: string) {
    if (!cur || stage !== 'choosing') return;
    const correct = optionId === cur.id;
    const outcome = cur.revealed ? 'assisted' : correct ? 'correct' : 'wrong';
    setPicked(optionId);
    setStage('answered');
    try {
      const res = await fetch('/api/attempts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          itemId: cur.id, outcome: cur.revealed && correct ? 'assisted' : correct ? 'correct' : 'wrong',
          sessionId: sessionId.current, voice: 'tele', speed: SPEEDS[cur.speed], replays: cur.replays, usedSlow: cur.usedSlow, revealed: cur.revealed,
          responseTimeMs: cur.choosingSince ? Date.now() - cur.choosingSince : null,
        }),
      });
      if (!res.ok) throw new Error('save failed');
      const result = (await res.json()) as { mastered: boolean; mastery: { qualifyingSuccesses: number; distinctSessions: number }; coinsAwarded: number };
      setCoins((c) => c + result.coinsAwarded);
      const doneForToday = result.mastered || (result.mastery.qualifyingSuccesses >= 3 && result.mastery.distinctSessions < 2);
      if (result.mastered) setMasteredIds((s) => new Set(s).add(cur.id));
      last.current.set(cur.id, { speed: cur.speed, outcome });
      // A quick win is one question, whatever the result: the effort counts and it ends on a good note.
      setQueue((q) => afterAttempt(q, cur.id, outcome, doneForToday || !!quickId));
      const kw = byId.get(cur.id)?.keyWord;
      if (!correct && !cur.revealed && kw && canPlayWord(kw.spanish, index.current)) setProbing(cur.id);
      playback.play(tele(result.mastered ? 'mastered' : correct && !cur.revealed ? 'correct' : cur.revealed ? 'hint' : 'wrong'));
    } catch {
      setMessage('That did not save. Check your connection and try again.');
      setStage('choosing');
      setPicked(null);
    }
  }

  const item = cur ? byId.get(cur.id) : null;
  const probeWords = useMemo(() => questions.filter((q) => q.keyWord).map((q) => ({ id: q.id, ...q.keyWord! })), [questions]);
  const finished = ready && !cur;
  const allMastered = masteredIds.size >= questions.length;
  const showText = !!cur && (cur.revealed || stage === 'answered');
  // The question's words stay hidden in the caption while it plays, unless the student asked to see them.
  const hideWords = !!cur && !cur.revealed && !!playback.line?.id.startsWith('q-');

  return (
    <main className="screen">
      <h1>Entender</h1>
      <Tele feelings={playback.feelings ?? undefined} loudness={playback.loudness} speaking={playback.playing} question={stage === 'choosing'} />

      <Win title="entender.exe" label="Understand the questions">
        <div className="stack">
          <ul className="dots" aria-label={`${masteredIds.size} of ${questions.length} questions mastered`}>
            {questions.map((q) => (
              <li key={q.id} className="dot" data-mastered={masteredIds.has(q.id)} />
            ))}
          </ul>
          <p className="muted" data-testid="mastered-count">
            {masteredIds.size} of {questions.length} questions mastered
          </p>

          {finished && (
            <div className="stack" data-testid="finished">
              <Status kind="done" label={quickId ? 'One done' : allMastered ? 'All five mastered' : 'Done for today'} />
              <p>
                {quickId
                  ? 'That is one done, and it counts. Come back whenever you want more.'
                  : allMastered
                  ? 'You can understand all five questions. The next step is open.'
                  : 'That is enough for today. Questions are only mastered once you get them right on more than one day, so come back tomorrow.'}
              </p>
              <Link className="btn btn-primary" href="/">
                Back to the desktop
              </Link>
            </div>
          )}

          {cur && item && (
            <>
              <p>
                <strong>What does the question mean?</strong>
              </p>
              <div className="controls">
                <button type="button" className="btn btn-primary" onClick={() => listen(cur.speed, cur.played ? 'replay' : 'first')} disabled={playback.playing}>
                  {cur.played ? 'Play again' : 'Listen'}
                </button>
                <button type="button" className="btn" onClick={() => listen('slow', 'slow')} disabled={playback.playing || !cur.played}>
                  Slower
                </button>
                <button type="button" className="btn" onClick={reveal} disabled={cur.revealed || stage === 'answered'}>
                  Show the words
                </button>
              </div>

              {cur.textFallback && (
                <p className="error" role="status" data-testid="text-fallback">
                  The sound did not load, so here is the question as text. You can carry on.
                </p>
              )}
              {showText && (
                <div data-testid="question-text">
                  <p className="heard-text" lang="es">
                    {item.spanish}
                  </p>
                  {showEnglish && <p className="heard-en">{item.english}</p>}
                </div>
              )}
              {cur.revealed && stage !== 'answered' && <p className="muted">You showed the words, so this one will not count toward mastery.</p>}

              <ul className="options">
                {cur.options.map((o) => {
                  const result = stage === 'answered' ? (o.id === cur.id ? 'right' : o.id === picked ? 'wrong' : undefined) : undefined;
                  return (
                    <li key={o.id}>
                      <button type="button" className="option" data-result={result} disabled={stage !== 'choosing'} onClick={() => choose(o.id)}>
                        {result === 'right' && <Status kind="done" label="Right answer" />}
                        {result === 'wrong' && <Status kind="retry" label="Not this one" />}
                        <span>{o.text}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              {stage === 'ready' && plans[cur.id]?.preview && item.keyWord && (
                <p data-testid="key-word-preview">
                  A word to look out for: <strong lang="es">{item.keyWord.spanish}</strong> means <strong>{item.keyWord.english}</strong>.
                </p>
              )}
              {stage === 'ready' && <p className="muted">Press Listen first. Then pick what it means.</p>}
              {message && (
                <p className="error" role="alert">
                  {message}
                </p>
              )}

              {stage === 'answered' && probing === cur.id && item.keyWord && (
                <Probe
                  word={{ id: cur.id, ...item.keyWord }}
                  words={probeWords}
                  index={index.current}
                  onSkip={() => setProbing(null)}
                  onFinish={(r) => {
                    void fetch('/api/probe', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ itemId: cur.id, sessionId: sessionId.current, ...r }) }).catch(() => {});
                    setProbing(null);
                  }}
                />
              )}

              {stage === 'answered' && (
                <div className="stack">
                  <p className="coins" data-testid="coins">
                    +{coins} coins today
                  </p>
                  <button type="button" className="btn btn-primary" onClick={() => present(queue)} disabled={playback.playing}>
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </Win>

      <Caption
        words={hideWords ? [] : playback.words}
        activeIndex={hideWords ? null : playback.activeIndex}
        english={hideWords ? '' : playback.line?.en ?? ''}
        showEnglish={showEnglish}
        onToggleEnglish={toggleEnglish}
      />
    </main>
  );
}
