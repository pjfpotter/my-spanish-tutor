'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { planRound, type RoundItem } from '../../../lib/automate/round';
import { firstWords, isRepeatRequest, REPEAT_PHRASE } from '../../../lib/automate/repeat';
import { RANKS } from '../../../lib/automate/rank';
import type { AutomateState } from '../../../lib/automate/store';
import { DEFAULT_AUTOMATE } from '../../../lib/automate/window';
import { feedbackFor } from '../../../lib/memorise/feedback';
import { currentSessionId } from '../../../lib/session/session-id';
import { judgeCapture, UNCLEAR_MESSAGE } from '../../../lib/speech/capture-judgement';
import { scoreAttempt } from '../../../lib/speech/score';
import type { ClipFile } from '../../../lib/tele/clip';
import { clipUrls, loadClip, type BuiltClip } from '../../../lib/tele/clips';
import type { Feelings } from '../../../lib/tele/feelings';
import type { TutorLine } from '../../../lib/tele/lines';
import { selectLine } from '../../../lib/tele/select';
import { Status } from '../../../lib/ui/Status';
import { Caption, useSubtitles } from '../../components/Caption';
import { Tele } from '../../components/Tele';
import { useLinePlayback } from '../../components/useLinePlayback';
import { LittleAndOften } from '../../components/LittleAndOften';
import { ListeningProblem } from '../../components/ListeningProblem';
import { useSpeechCapture, type CaptureResult } from '../../components/useSpeechCapture';
import { SectionNav } from '../../components/SectionNav';
import { Win } from '../../components/Win';
import '../../components/screens.css';

export interface AutomateItem {
  id: string;
  position: number;
  question: string;
  english: string;
  answer: string;
}

type Stage = 'intro' | 'asking' | 'listening' | 'speaking' | 'checking' | 'feedback' | 'summary';

interface Feedback {
  kind: 'answered' | 'blank' | 'unclear';
  accuracy?: number;
  responseMs?: number | null;
  fix?: string | null;
  hint?: string;
  textShown: boolean;
}

interface RoundResult {
  id: string;
  accuracy: number | null;
  responseMs: number | null;
  blank: boolean;
  assisted: boolean;
}

const seconds = (ms: number) => (ms / 1000).toFixed(1);
const ORDER_KEY = 'automate-last-order';
const slotFor = (index: readonly BuiltClip[], text: string, speed: number) => index.find((c) => c.text === text && c.speed === speed)?.slot ?? null;

const readLastOrder = (): string[] | null => {
  try {
    return JSON.parse(sessionStorage.getItem(ORDER_KEY) ?? 'null');
  } catch {
    return null;
  }
};
const saveOrder = (ids: string[]) => {
  try {
    sessionStorage.setItem(ORDER_KEY, JSON.stringify(ids));
  } catch {
    /* private mode: the next round is still shuffled, it just cannot promise to differ */
  }
};

/**
 * Hear and answer, against the clock (tasks 9.1 to 9.5). Tele asks a question with no text shown, and the
 * student says their memorised answer within a window. The time from the end of the question to the first
 * sound is stored with the attempt. The window shortens as they get quicker and lengthens when they struggle.
 * Saying nothing is a blank, never a wrong answer, and asking Tele to repeat in Spanish is rewarded.
 * Nothing here calls a language model.
 */
export function Automate({ items, initial }: { items: AutomateItem[]; initial: AutomateState }) {
  const [state, setState] = useState(initial);
  const [stage, setStage] = useState<Stage>('intro');
  const [round, setRound] = useState<RoundItem[]>([]);
  const [idx, setIdx] = useState(0);
  const [results, setResults] = useState<RoundResult[]>([]);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [coins, setCoins] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [textFallback, setTextFallback] = useState(false);
  /** The student has asked Tele to repeat this question, which is good test technique. */
  const [asked, setAsked] = useState(false);

  const sessionId = useRef('');
  const index = useRef<readonly BuiltClip[]>([]);
  const clips = useRef(new Map<string, ClipFile>());
  const lastLine = useRef<string | null>(null);
  const endedAt = useRef(0);
  const onsetSeen = useRef(false);
  const windowTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const repeats = useRef(0);
  const current = useRef<{ item: AutomateItem; speed: number; assisted: boolean; windowMs: number }>({ item: items[0], speed: 1, assisted: false, windowMs: initial.windowMs });
  const stageRef = useRef<Stage>('intro');
  stageRef.current = stage;

  const [showEnglish, toggleEnglish] = useSubtitles();
  const playback = useLinePlayback();
  const byId = new Map(items.map((i) => [i.id, i]));
  const item = round[idx] ? byId.get(round[idx].id) ?? null : null;

  const tele = (situation: Parameters<typeof selectLine>[0]): TutorLine => {
    const line = selectLine(situation, { lastId: lastLine.current });
    lastLine.current = line.id;
    return line;
  };

  useEffect(() => {
    sessionId.current = currentSessionId();
    fetch('/api/clips').then((r) => (r.ok ? r.json() : [])).catch(() => []).then((list: BuiltClip[]) => (index.current = list));
    return () => clearTimeout(windowTimer.current);
  }, []);

  const capture = useSpeechCapture((r: CaptureResult) => void onCapture(r), {
    round: true,
    onOnset: () => {
      if (stageRef.current !== 'listening') return;
      onsetSeen.current = true;
      clearTimeout(windowTimer.current); // started in time: the window clock stops
      setStage('speaking');
    },
  });

  async function post(body: Record<string, unknown>) {
    try {
      const res = await fetch('/api/respond', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sessionId: sessionId.current, ...body }) });
      if (!res.ok) throw new Error('save failed');
      const out = (await res.json()) as { coinsAwarded: number; bonusCoins: number; state: AutomateState };
      setCoins((c) => c + out.coinsAwarded + out.bonusCoins);
      setState(out.state);
      return out;
    } catch {
      setMessage('That did not save. Check your connection. Your answer still counted for this round.');
      return null;
    }
  }

  /** Plays the question, then opens the window the moment it ends. */
  const ask = useCallback(
    async (it: AutomateItem, speed: number, windowMs: number) => {
      clearTimeout(windowTimer.current);
      onsetSeen.current = false;
      setStage('asking');
      setFeedback(null);
      setMessage(null);
      const slot = slotFor(index.current, it.question, speed) ?? slotFor(index.current, it.question, 1);
      let clip = slot ? clips.current.get(slot) : undefined;
      if (slot && !clip) {
        try {
          clip = await loadClip(slot);
          clips.current.set(slot, clip);
        } catch {
          fetch('/api/clip-failure', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ slot }) }).catch(() => {});
        }
      }
      const open = (at: number) => {
        endedAt.current = at;
        setStage('listening');
        capture.start();
        windowTimer.current = setTimeout(() => void onBlank(), windowMs);
      };
      if (!clip || !slot) {
        // No audio for this question: show it as text. That is practice, so the attempt will not count.
        current.current.assisted = true;
        setTextFallback(true);
        return open(performance.now());
      }
      current.current.assisted = false;
      setTextFallback(false);
      const line: TutorLine = { id: `q-${it.position}`, es: it.question, en: it.english, feelings: {} as Feelings };
      playback.play(line, { clip, audioUrl: clipUrls(slot).audio, onEnd: open });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [capture, playback],
  );

  function begin(i: number, r: RoundItem[], windowMs = state.windowMs) {
    const it = byId.get(r[i].id)!;
    repeats.current = 0;
    setAsked(false);
    current.current = { item: it, speed: r[i].speed, assisted: false, windowMs };
    setIdx(i);
    void ask(it, r[i].speed, windowMs);
  }

  async function start() {
    setMessage(null);
    if (!(await capture.prepare())) return;
    sessionId.current = currentSessionId();
    const planned = planRound(items.map((i) => i.id), readLastOrder());
    saveOrder(planned.map((p) => p.id));
    setRound(planned);
    setResults([]);
    begin(0, planned);
  }

  /** The window ended in silence. A hint is offered and the attempt is a blank, not a wrong answer. */
  async function onBlank() {
    if (onsetSeen.current || stageRef.current !== 'listening') return;
    capture.cancel();
    const { item: it, speed, assisted } = current.current;
    setStage('feedback');
    setFeedback({ kind: 'blank', hint: firstWords(it.answer), textShown: assisted });
    setResults((r) => [...r, { id: it.id, accuracy: null, responseMs: null, blank: true, assisted }]);
    playback.play(tele('hint'));
    await post({ itemId: it.id, blank: true, accuracy: null, responseTimeMs: null, speed, repeats: repeats.current, assisted });
  }

  async function onCapture(r: CaptureResult) {
    const { item: it, speed, assisted, windowMs } = current.current;
    const judged = judgeCapture(r.status === 'ok' ? { status: 'ok', transcript: r.transcript, confidence: r.confidence } : { status: 'unclear' });
    if (!judged.scorable) {
      // Noise is not the student's mistake: not scored, not saved. They hear the question again.
      setStage('feedback');
      setFeedback({ kind: 'unclear', textShown: assisted });
      playback.play(tele('heard_badly'));
      return;
    }
    if (isRepeatRequest(judged.transcript)) {
      repeats.current += 1;
      setAsked(true);
      setStage('asking');
      // Tele answers, and when that line ends it asks the question again with a fresh window.
      playback.play(tele('repeat_request'), { onEnd: () => void ask(it, speed, windowMs) });
      return;
    }
    const score = scoreAttempt(it.answer, judged.transcript);
    const responseMs = r.onsetAt === null ? null : Math.max(0, Math.round(r.onsetAt - endedAt.current));
    setStage('checking');
    setResults((all) => [...all, { id: it.id, accuracy: score.accuracy, responseMs, blank: false, assisted }]);
    const fb = feedbackFor(score, DEFAULT_AUTOMATE.threshold);
    setFeedback({ kind: 'answered', accuracy: score.accuracy, responseMs, fix: fb.fix?.text ?? null, textShown: assisted });
    setStage('feedback');
    playback.play(tele(score.accuracy >= DEFAULT_AUTOMATE.threshold ? 'correct' : 'wrong'));
    await post({ itemId: it.id, blank: false, accuracy: score.accuracy, responseTimeMs: responseMs, speed, repeats: repeats.current, assisted });
  }

  /** Same question again after unclear audio. It is not counted, and the window starts afresh. */
  function retry() {
    const { item: it, speed, windowMs } = current.current;
    void ask(it, speed, windowMs);
  }

  function next() {
    if (idx + 1 < round.length) return begin(idx + 1, round, state.windowMs);
    capture.release();
    setStage('summary');
    playback.play(tele('session_end'));
  }

  const busy = playback.playing || capture.state === 'processing';
  const counted = results.filter((r) => !r.assisted);
  const answered = counted.filter((r) => !r.blank && r.responseMs !== null);
  const roundAverage = answered.length ? Math.round(answered.reduce((t, r) => t + (r.responseMs as number), 0) / answered.length) : null;

  return (
    <main className="screen">
      <SectionNav />
      <h1>Answer fast</h1>
      <Tele feelings={playback.feelings ?? undefined} loudness={playback.loudness} speaking={playback.playing} question={stage === 'listening' || stage === 'speaking'} />

      <Win title="answer-fast.exe" label="Hear a question and answer it fast">
        <div className="stack">
          {stage === 'intro' && (
            <div className="stack" data-testid="intro">
              <p>
                Tele asks a question out loud, with no words on the screen. Say your answer as soon as it finishes. The microphone stays on during the round so Tele
                can tell how quickly you start, and it is not saved.
              </p>
              <p className="muted">
                If you need it again, say <span lang="es">{REPEAT_PHRASE}</span> That is what to do in the real test, and it earns a bonus coin.
              </p>
              <RankLadder state={state} />
              {state.ready && <ReadyNote />}
              <LittleAndOften />
              <div className="controls">
                <button type="button" className="btn btn-primary" onClick={start} disabled={capture.state === 'checking'}>
                  Start a round
                </button>
                <Link className="btn" href="/">Back to the desktop</Link>
              </div>
            </div>
          )}

          <ListeningProblem state={capture.state} onRetry={() => { capture.retry(); retry(); }} onSkip={stage === 'intro' || stage === 'summary' ? undefined : () => { capture.retry(); next(); }} />

          {stage !== 'intro' && stage !== 'summary' && item && (
            <>
              <p className="muted" data-testid="progress">Question {idx + 1} of {round.length}</p>
              {textFallback && (
                <div data-testid="text-fallback">
                  <p className="error" role="status">The sound did not load, so here is the question as text. This one will not count.</p>
                  <p className="heard-text" lang="es">{item.question}</p>
                  {showEnglish && <p className="heard-en">{item.english}</p>}
                </div>
              )}
              {stage === 'asking' && !textFallback && <p data-testid="asking">Listen…</p>}
              {stage === 'listening' && (
                <p data-testid="listening" role="status">
                  Say your answer now. You have {seconds(current.current.windowMs)} seconds to start.
                  <span className="window-bar" style={{ animationDuration: `${current.current.windowMs}ms` }} aria-hidden="true" />
                </p>
              )}
              {stage === 'speaking' && <p data-testid="speaking" role="status">Listening…</p>}
              {stage === 'checking' && <p data-testid="checking">Checking what you said…</p>}
            </>
          )}

          {stage === 'feedback' && feedback && item && (
            <div className="stack" data-testid="feedback" data-kind={feedback.kind}>
              {feedback.kind === 'answered' && (
                <>
                  <p className="accuracy" data-testid="accuracy" aria-label={`${feedback.accuracy} percent`}>{feedback.accuracy}%</p>
                  {feedback.responseMs !== null && feedback.responseMs !== undefined && (
                    <p data-testid="response-time">You started after {seconds(feedback.responseMs)} seconds.</p>
                  )}
                  {feedback.fix && <p data-testid="fix"><strong>One thing to fix:</strong> {feedback.fix}</p>}
                  <p className="muted">Your answer was: <span lang="es">{item.answer}</span></p>
                </>
              )}
              {feedback.kind === 'blank' && (
                <div data-testid="blank">
                  <p><Status kind="retry" label="Blank" /> Nothing yet. That happens, and it does not count against you.</p>
                  <p>Your answer starts: <strong lang="es" data-testid="hint">{feedback.hint}…</strong></p>
                </div>
              )}
              {feedback.kind === 'unclear' && (
                <p role="status" data-testid="unclear"><Status kind="retry" label="Not scored" /> {UNCLEAR_MESSAGE}</p>
              )}
              <p className="coins" data-testid="coins">+{coins} coins today</p>
              {message && <p className="error" role="alert">{message}</p>}
              <div className="controls">
                {feedback.kind === 'unclear' ? (
                  <button type="button" className="btn btn-primary" onClick={retry} disabled={busy}>Ask it again</button>
                ) : (
                  <button type="button" className="btn btn-primary" onClick={next} disabled={busy}>
                    {idx + 1 < round.length ? 'Next question' : 'See how I did'}
                  </button>
                )}
              </div>
            </div>
          )}

          {asked && (stage === 'asking' || stage === 'listening' || stage === 'speaking') && <p data-testid="repeat-note"><Status kind="done" label="Good test technique" /> Asking again is what you do in the real test.</p>}

          {stage === 'summary' && (
            <div className="stack" data-testid="summary">
              <p><strong>Round done.</strong></p>
              {roundAverage !== null ? (
                <p data-testid="round-average">Your average start this round: {seconds(roundAverage)} seconds.</p>
              ) : (
                <p>No timed answers counted this round. Come back and try another.</p>
              )}
              <p className="coins" data-testid="coins">+{coins} coins today</p>
              <RankLadder state={state} />
              {state.ready && <ReadyNote />}
              <div className="controls">
                <button type="button" className="btn btn-primary" onClick={() => { setStage('intro'); setFeedback(null); }} disabled={busy}>Another round</button>
                <Link className="btn" href="/">Back to the desktop</Link>
              </div>
            </div>
          )}
        </div>
      </Win>

      <Caption
        words={stage === 'asking' && !textFallback ? [] : playback.words}
        activeIndex={stage === 'asking' && !textFallback ? null : playback.activeIndex}
        english={stage === 'asking' && !textFallback ? '' : playback.line?.en ?? ''}
        showEnglish={showEnglish}
        onToggleEnglish={toggleEnglish}
      />
    </main>
  );
}

function ReadyNote() {
  return (
    <p data-testid="test-ready">
      <Status kind="done" label="Test-ready" /> You answered every question quickly and accurately on more than one session. You are ready.
    </p>
  );
}

/** The rank as a ladder of named steps, with where the student is now and their own recent sessions. Never a comparison with others. */
function RankLadder({ state }: { state: AutomateState }) {
  const { rank, history } = state;
  return (
    <div className="stack" data-testid="ladder">
      <p data-testid="rank">
        {rank.rank ? <>Your speed rank: <strong>{rank.rank}</strong>{rank.averageMs !== null && <> ({seconds(rank.averageMs)} s average)</>}</> : <>No speed rank yet. {rank.answersNeeded > 0 ? `${rank.answersNeeded} more timed ${rank.answersNeeded === 1 ? 'answer' : 'answers'} and it appears.` : 'Answer a few questions and it appears.'}</>}
      </p>
      <ol className="ladder" aria-label="Speed ranks, slowest to fastest">
        {RANKS.map((name, i) => (
          <li key={name} data-here={rank.step === i} aria-current={rank.step === i ? 'step' : undefined}>
            <span aria-hidden="true">{rank.step === i ? '▶ ' : rank.step > i ? '✓ ' : '○ '}</span>
            {name}
            <span className="sr-only">{rank.step === i ? ' (you are here)' : rank.step > i ? ' (reached)' : ' (not yet)'}</span>
          </li>
        ))}
      </ol>
      {rank.nextStepMs !== null && rank.nextStepMs > 0 && <p className="muted">About {seconds(rank.nextStepMs)} seconds quicker on average reaches the next step.</p>}
      {history.length > 0 && (
        <p className="muted" data-testid="history">
          Your recent sessions: {history.map((h) => `${seconds(h.averageMs)} s`).join(' → ')}
        </p>
      )}
    </div>
  );
}
