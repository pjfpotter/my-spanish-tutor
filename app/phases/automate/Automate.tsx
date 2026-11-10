'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { planRound, type RoundItem } from '../../../lib/automate/round';
import { isRepeatRequest, REPEAT_PHRASE } from '../../../lib/automate/repeat';
import { RANKS } from '../../../lib/automate/rank';
import type { AutomateState } from '../../../lib/automate/store';
import { DEFAULT_AUTOMATE } from '../../../lib/automate/window';
import type { Chunk } from '../../../lib/course/schema';
import { feedbackFor } from '../../../lib/memorise/feedback';
import { saidChunks, type SaidChunk } from '../../../lib/practice/chunk-said';
import { isNewBestMs, readBestMs, readLadder, writeBestMs, writeLadder } from '../../../lib/practice/device-store';
import { DEFAULT_HINT_DELAY_MS, hintText, startHintTimer, type HintTimer } from '../../../lib/practice/hint';
import { chunksAsked, levelsFor, LADDER_LEVELS, stepLadder, type LadderLevel, type LadderState } from '../../../lib/practice/ladder';
import { NO_COMBO, stepCombo, type ComboState } from '../../../lib/practice/combo';
import { pickPraise } from '../../../lib/practice/praise';
import { answerPieces, type Piece } from '../../../lib/practice/tasks';
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
import { FeedbackPanel } from '../../components/practice/FeedbackPanel';
import { PracticeShell } from '../../components/practice/PracticeShell';
import { Reward } from '../../components/practice/Reward';
import { Tile } from '../../components/practice/TaskViews';
import { useLinePlayback } from '../../components/useLinePlayback';
import { useSfx } from '../../components/useSfx';
import { LittleAndOften } from '../../components/LittleAndOften';
import { ListeningProblem } from '../../components/ListeningProblem';
import { useSpeechCapture, type CaptureResult } from '../../components/useSpeechCapture';
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
  /** The chunks that were asked for, with the ones said marked. Shown in the results, never while answering. */
  chunks?: SaidChunk[];
  /** What was asked for, in words, for the panel after a miss. */
  script?: string;
  praise?: string;
  newBest?: boolean;
}

interface RoundResult {
  id: string;
  accuracy: number | null;
  responseMs: number | null;
  blank: boolean;
  assisted: boolean;
}

/** What the ladder knows about one answer: its chunks and the levels that make sense for that many chunks. */
interface Plan {
  pieces: Piece[];
  levels: LadderLevel[];
}

const seconds = (ms: number) => (ms / 1000).toFixed(1);
const ORDER_KEY = 'automate-last-order';
const slotFor = (index: readonly BuiltClip[], text: string, speed: number) => index.find((c) => c.text === text && c.speed === speed)?.slot ?? null;
const levelName = (l: LadderLevel) => (l === 'all' ? 'The whole answer' : l === 1 ? 'The first chunk' : l === 2 ? 'The first two chunks' : 'The first three chunks');

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
 * Hear and answer, against the clock (tasks 9.1 to 9.5, 22.x). Tele asks a question with no text shown, and the
 * student says their memorised answer within a window. A chunk ladder asks first for one chunk, then two, then three,
 * then the whole answer, and each chunk appears in its colour as it is said. If the student has not started after
 * 2.5 seconds the first words of the next chunk appear as a hint, which makes the attempt assisted but never wrong.
 * Expert mode shows no text at all while answering. The time from the end of the question to the first sound is stored
 * with the attempt. Saying nothing is a blank, never a wrong answer, and asking Tele to repeat in Spanish is rewarded.
 * Nothing here calls a language model.
 */
export function Automate({ items, initial, chunks = [] }: { items: AutomateItem[]; initial: AutomateState; chunks?: Chunk[] }) {
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
  const [ladder, setLadder] = useState<Record<string, LadderState>>({});
  const [startAt, setStartAt] = useState(0);
  const [expert, setExpert] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [burst, setBurst] = useState({ n: 0, big: false });
  const [reaction, setReaction] = useState<'idle' | 'correct' | 'wrong' | 'skipped'>('idle');
  const [levelNote, setLevelNote] = useState<string | null>(null);
  const [comboShow, setComboShow] = useState(false);
  const comboTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const sessionId = useRef('');
  const index = useRef<readonly BuiltClip[]>([]);
  const clips = useRef(new Map<string, ClipFile>());
  const lastLine = useRef<string | null>(null);
  const lastPraise = useRef<string | null>(null);
  const endedAt = useRef(0);
  const onsetSeen = useRef(false);
  const windowTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const hintTimer = useRef<HintTimer | null>(null);
  const repeats = useRef(0);
  const combo = useRef<ComboState>(NO_COMBO);
  const current = useRef<{ item: AutomateItem; speed: number; assisted: boolean; windowMs: number; level: LadderLevel; script: string; asked: Piece[] }>({
    item: items[0], speed: 1, assisted: false, windowMs: initial.windowMs, level: 'all', script: items[0]?.answer ?? '', asked: [],
  });
  const stageRef = useRef<Stage>('intro');
  stageRef.current = stage;
  const expertRef = useRef(false);
  expertRef.current = expert;

  const [showEnglish, toggleEnglish] = useSubtitles();
  const playback = useLinePlayback();
  const sfx = useSfx();
  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const plans = useMemo(() => {
    const m = new Map<string, Plan>();
    for (const it of items) {
      const found = answerPieces(it.answer, chunks);
      const pieces = found.length ? found : [{ id: '0', text: it.answer, english: '', kind: 'other' as const }];
      m.set(it.id, { pieces, levels: levelsFor(pieces.length) });
    }
    return m;
  }, [items, chunks]);
  const item = round[idx] ? byId.get(round[idx].id) ?? null : null;

  const tele = (situation: Parameters<typeof selectLine>[0]): TutorLine => {
    const line = selectLine(situation, { lastId: lastLine.current });
    lastLine.current = line.id;
    return line;
  };

  useEffect(() => {
    sessionId.current = currentSessionId();
    fetch('/api/clips').then((r) => (r.ok ? r.json() : [])).catch(() => []).then((list: BuiltClip[]) => (index.current = list));
    // The ladder lives on this device only.
    setLadder(Object.fromEntries(items.map((i) => [i.id, readLadder(i.id, plans.get(i.id)!.levels.length)])));
    return () => {
      clearTimeout(windowTimer.current);
      clearTimeout(comboTimer.current);
      hintTimer.current?.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const capture = useSpeechCapture((r: CaptureResult) => void onCapture(r), {
    round: true,
    onOnset: () => {
      if (stageRef.current !== 'listening') return;
      onsetSeen.current = true;
      clearTimeout(windowTimer.current); // started in time: the window clock stops
      hintTimer.current?.cancel();
      setStage('speaking');
    },
  });

  async function post(body: Record<string, unknown>) {
    try {
      const res = await fetch('/api/respond', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sessionId: sessionId.current, ...body }) });
      if (!res.ok) throw new Error('save failed');
      const out = (await res.json()) as { coinsAwarded: number; bonusCoins: number; answerValue?: number; state: AutomateState };
      setCoins((c) => c + out.coinsAwarded + out.bonusCoins + (out.answerValue ?? 0));
      setState(out.state);
      return out;
    } catch {
      setMessage('That did not save. Check your connection. Your answer still counted for this round.');
      return null;
    }
  }

  /** The level this answer is asked at now, the chunks it asks for, and the words that are scored. */
  function levelFor(id: string, from = ladder) {
    const plan = plans.get(id)!;
    const at = Math.max(from[id]?.at ?? 0, Math.min(startAt, plan.levels.length - 1));
    const level = plan.levels[Math.min(at, plan.levels.length - 1)];
    const askedPieces = plan.pieces.slice(0, chunksAsked(level, plan.pieces.length));
    return { level, asked: askedPieces, script: askedPieces.map((p) => p.text).join(' ') };
  }

  /** Plays the question, then opens the window the moment it ends. */
  const ask = useCallback(
    async (it: AutomateItem, speed: number, windowMs: number) => {
      clearTimeout(windowTimer.current);
      hintTimer.current?.cancel();
      onsetSeen.current = false;
      setStage('asking');
      setFeedback(null);
      setMessage(null);
      setHint(null);
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
        // Still silent after the hint delay: the first words of the next chunk appear. Not in expert mode, and it makes the attempt assisted.
        if (!expertRef.current) {
          hintTimer.current = startHintTimer(() => {
            if (onsetSeen.current || stageRef.current !== 'listening') return;
            const asked = current.current.asked.map((p) => p.text);
            const text = hintText(asked, 0);
            if (!text) return;
            current.current.assisted = true;
            setHint(text);
          }, DEFAULT_HINT_DELAY_MS);
        }
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

  function begin(i: number, r: RoundItem[], windowMs = state.windowMs, from = ladder) {
    const it = byId.get(r[i].id)!;
    repeats.current = 0;
    setAsked(false);
    setReaction('idle');
    setLevelNote(null);
    const lv = levelFor(it.id, from);
    current.current = { item: it, speed: r[i].speed, assisted: false, windowMs, level: lv.level, script: lv.script, asked: lv.asked };
    setIdx(i);
    void ask(it, r[i].speed, windowMs);
  }

  async function start() {
    setMessage(null);
    if (!(await capture.prepare())) return;
    sessionId.current = currentSessionId();
    // Starting higher lifts every answer to at least that level, and keeps it there.
    const lifted = { ...ladder };
    for (const it of items) {
      const levels = plans.get(it.id)!.levels.length;
      const at = Math.max(lifted[it.id]?.at ?? 0, Math.min(startAt, levels - 1));
      lifted[it.id] = { at, met: lifted[it.id]?.at === at ? lifted[it.id].met : 0 };
      writeLadder(it.id, lifted[it.id]);
    }
    setLadder(lifted);
    combo.current = NO_COMBO;
    const planned = planRound(items.map((i) => i.id), readLastOrder());
    saveOrder(planned.map((p) => p.id));
    setRound(planned);
    setResults([]);
    begin(0, planned, state.windowMs, lifted);
  }

  /** The window ended in silence. A hint is offered and the attempt is a blank, not a wrong answer. */
  async function onBlank() {
    if (onsetSeen.current || stageRef.current !== 'listening') return;
    capture.cancel();
    hintTimer.current?.cancel();
    const { item: it, speed, assisted, asked: askedPieces, level } = current.current;
    const counts = level === 'all' && !assisted;
    setStage('feedback');
    setReaction('skipped');
    sfx('tele-skipped');
    // In expert mode there is no hint either: the answer shows only in the results, so the first words come then.
    setFeedback({ kind: 'blank', hint: hintText(askedPieces.map((p) => p.text), 0) ?? '', textShown: assisted, script: current.current.script });
    setResults((r) => [...r, { id: it.id, accuracy: null, responseMs: null, blank: true, assisted }]);
    // A blank never changes the ladder or breaks a combo.
    playback.play(tele('hint'));
    await post({ itemId: it.id, blank: true, accuracy: null, responseTimeMs: null, speed, repeats: repeats.current, assisted: !counts });
  }

  async function onCapture(r: CaptureResult) {
    const { item: it, speed, assisted, windowMs, level, script, asked: askedPieces } = current.current;
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
    const score = scoreAttempt(script, judged.transcript);
    const responseMs = r.onsetAt === null ? null : Math.max(0, Math.round(r.onsetAt - endedAt.current));
    setStage('checking');
    const good = score.accuracy >= DEFAULT_AUTOMATE.threshold;
    const wasAssisted = assisted;
    setResults((all) => [...all, { id: it.id, accuracy: score.accuracy, responseMs, blank: false, assisted: wasAssisted }]);
    const fb = feedbackFor(score, DEFAULT_AUTOMATE.threshold);

    // The ladder: meeting the accuracy and time target moves the student up. Hints and slips never push them down.
    const levels = plans.get(it.id)!.levels.length;
    const before = ladder[it.id] ?? { at: 0, met: 0 };
    const after = stepLadder(before, { accuracy: score.accuracy, responseMs, blank: false }, wasAssisted, levels);
    if (after.at !== before.at || after.met !== before.met) {
      setLadder((l) => ({ ...l, [it.id]: after }));
      writeLadder(it.id, after);
    }
    if (after.at > before.at) setLevelNote(levelName(plans.get(it.id)!.levels[after.at]).toLowerCase());

    // A response-time personal best, on an unassisted whole-answer attempt that was accurate.
    const previousBest = readBestMs(it.id);
    const newBest = good && !wasAssisted && level === 'all' && responseMs !== null && isNewBestMs(previousBest, responseMs);
    if (good && !wasAssisted && level === 'all' && responseMs !== null && (previousBest === null || responseMs < previousBest)) writeBestMs(it.id, responseMs);

    const line = good ? pickPraise(lastPraise.current) : '';
    if (good) lastPraise.current = line;
    const step = stepCombo(combo.current, wasAssisted ? 'assisted' : good ? 'correct' : 'wrong');
    combo.current = step.state;

    setFeedback({
      kind: 'answered', accuracy: score.accuracy, responseMs, fix: fb.fix?.text ?? null, textShown: wasAssisted,
      chunks: saidChunks(askedPieces, score), script, praise: line, newBest,
    });
    setStage('feedback');
    // The panel, sound and Tele's reaction arrive at once. Tele speaks only at a personal best or a combo.
    setReaction(good ? 'correct' : 'wrong');
    sfx(good ? 'correct' : 'miss');
    sfx(good ? 'tele-correct' : 'tele-wrong');
    if (good) setBurst((b) => ({ n: b.n + 1, big: false }));
    if (newBest) {
      sfx('personal-best');
      setBurst((b) => ({ n: b.n + 1, big: true }));
      playback.play(tele('improvement'));
    } else if (step.combo) {
      sfx('combo');
      setBurst((b) => ({ n: b.n + 1, big: true }));
      playback.play(tele('streak'));
    }
    if (step.combo) {
      // A short combo moment that moves on by itself.
      setComboShow(true);
      clearTimeout(comboTimer.current);
      comboTimer.current = setTimeout(() => setComboShow(false), 1800);
    }
    // Only a whole-answer attempt with no help is a full test of hearing and answering. The chunk steps are practice.
    await post({ itemId: it.id, blank: false, accuracy: score.accuracy, responseTimeMs: responseMs, speed, repeats: repeats.current, assisted: wasAssisted || level !== 'all' });
  }

  /** Same question again after unclear audio. It is not counted, and the window starts afresh. */
  function retry() {
    const { item: it, speed, windowMs } = current.current;
    void ask(it, speed, windowMs);
  }

  function next() {
    setComboShow(false);
    if (idx + 1 < round.length) return begin(idx + 1, round, state.windowMs);
    capture.release();
    setStage('summary');
    setReaction('idle');
    playback.play(tele('session_end'));
  }

  const busy = capture.state === 'processing';
  const counted = results.filter((r) => !r.assisted);
  const answered = counted.filter((r) => !r.blank && r.responseMs !== null);
  const roundAverage = answered.length ? Math.round(answered.reduce((t, r) => t + (r.responseMs as number), 0) / answered.length) : null;
  const allAtTop = items.every((i) => (ladder[i.id]?.at ?? 0) >= plans.get(i.id)!.levels.length - 1);

  // ---- Panel at the foot of the screen -----------------------------------------------------------------

  let footer: React.ReactNode = null;
  if (stage === 'feedback' && feedback && item) {
    const last = idx + 1 >= round.length;
    const continueLabel = last ? 'See how I did' : 'Next question';
    if (feedback.kind === 'answered') {
      const good = (feedback.accuracy ?? 0) >= DEFAULT_AUTOMATE.threshold;
      footer = <FeedbackPanel state={good ? 'correct' : 'wrong'} praise={feedback.praise} answer={good ? undefined : feedback.script} continueLabel={continueLabel} onContinue={next} />;
    } else if (feedback.kind === 'blank') {
      footer = <FeedbackPanel state="wrong" headline="No answer in time" continueLabel={continueLabel} onContinue={next}><p>That happens, and it does not count against you.</p></FeedbackPanel>;
    } else {
      footer = (
        <div className="fb" data-state="wrong" role="status" data-testid="feedback-panel">
          <p className="fb-head"><span className="fb-symbol" aria-hidden="true">…</span><span>Not scored</span></p>
          <div className="fb-row">
            <button type="button" className="btn btn-primary" onClick={retry} disabled={busy}>Ask it again</button>
          </div>
        </div>
      );
    }
  }

  const listening = stage === 'listening' || stage === 'speaking';
  const meta = (
    <>
      <span data-testid="progress">{stage === 'intro' || stage === 'summary' || !round.length ? 'Answer fast' : `Question ${idx + 1} of ${round.length}`}</span>
      <span data-testid="coins">+€{coins} today</span>
    </>
  );

  return (
    <PracticeShell
      tele={
        <div data-testid="tele-reaction" data-reaction={reaction}>
          <Tele
            feelings={playback.feelings ?? (reaction === 'correct' ? { joy: 0.8 } : reaction === 'wrong' ? { sadness: 0.45 } : reaction === 'skipped' ? { surprise: 0.3 } : undefined)}
            loudness={playback.loudness}
            speaking={playback.playing}
            question={listening}
          />
        </div>
      }
      caption={
        <Caption
          compact
          words={stage === 'asking' && !textFallback ? [] : playback.words}
          activeIndex={stage === 'asking' && !textFallback ? null : playback.activeIndex}
          english={stage === 'asking' && !textFallback ? '' : playback.line?.en ?? ''}
          showEnglish={showEnglish}
          onToggleEnglish={toggleEnglish}
        />
      }
      meta={meta}
      footer={footer}
    >
      <h1 className="sr-only">Answer fast</h1>
      <Reward burstKey={burst.n} big={burst.big} />

      {stage === 'intro' && (
        <div className="stack" data-testid="intro">
          <p>Answer as soon as Tele finishes. Build up from one chunk to the whole answer.</p>
          <RankLadder state={state} compact />
          {state.ready && <ReadyNote />}
          <label className="start-with">
            <span>Start with</span>
            <select value={startAt} onChange={(e) => setStartAt(Number(e.target.value))} data-testid="start-with">
              {LADDER_LEVELS.map((l, i) => (
                <option key={String(l)} value={i}>{l === 'all' ? 'Whole answer' : l === 1 ? 'First chunk' : l === 2 ? 'First two chunks' : 'First three chunks'}</option>
              ))}
            </select>
          </label>
          <label className="choice" data-testid="expert-choice">
            <input type="checkbox" checked={expert} disabled={!allAtTop} onChange={(e) => setExpert(e.target.checked)} />
            <span>Expert mode: no text at all</span>
          </label>
          {!allAtTop && <p className="muted" data-testid="expert-locked">Opens when you can answer every question in full.</p>}
          <div className="controls">
            <button type="button" className="btn btn-primary" onClick={start} disabled={capture.state === 'checking'}>
              Start a round
            </button>
          </div>
        </div>
      )}

      <ListeningProblem state={capture.state} onRetry={() => { capture.retry(); retry(); }} onSkip={stage === 'intro' || stage === 'summary' ? undefined : () => { capture.retry(); next(); }} />

      {stage !== 'intro' && stage !== 'summary' && item && (
        <>
          {textFallback && (
            <div data-testid="text-fallback">
              <p className="error" role="status">The sound did not load, so here is the question as text. This one will not count.</p>
              <p className="heard-text" lang="es">{item.question}</p>
              {showEnglish && <p className="heard-en">{item.english}</p>}
            </div>
          )}
          {stage !== 'feedback' && !expert && (
            <p className="muted" data-testid="level" data-level={String(current.current.level)}>
              {levelName(current.current.level)}
            </p>
          )}
          {stage === 'asking' && !textFallback && <p data-testid="asking">Listen…</p>}
          {stage === 'listening' && (
            <>
              <p data-testid="listening" role="status">
                Say your answer now. You have {seconds(current.current.windowMs)} seconds to start.
                <span className="window-bar" style={{ animationDuration: `${current.current.windowMs}ms` }} aria-hidden="true" />
              </p>
              {!hint && (
                <p className="muted" data-testid="repeat-tip">
                  Need it again? Say <span lang="es">{REPEAT_PHRASE}</span>
                </p>
              )}
            </>
          )}
          {stage === 'speaking' && <p data-testid="speaking" role="status">Listening…</p>}
          {stage === 'checking' && <p data-testid="checking">Checking what you said…</p>}
          {hint && listening && (
            <p data-testid="hint-live">
              Your answer starts: <strong lang="es">{hint}…</strong>
            </p>
          )}
          {asked && (stage === 'asking' || stage === 'listening' || stage === 'speaking') && (
            <p data-testid="repeat-note"><Status kind="done" label="Good test technique" /> Asking again is what you do in the real test.</p>
          )}
        </>
      )}

      {stage === 'feedback' && comboShow && (
        <div className="combo" role="status" data-testid="combo">
          <strong>Combo!</strong>
          <span>Five in a row.</span>
        </div>
      )}

      {stage === 'feedback' && feedback && item && !comboShow && (
        <div className="stack" data-testid="feedback" data-kind={feedback.kind}>
          {feedback.kind === 'answered' && (
            <>
              <div className="result-head">
                <p className="accuracy" data-testid="accuracy" aria-label={`${feedback.accuracy} percent`}>{feedback.accuracy}%</p>
                {feedback.responseMs !== null && feedback.responseMs !== undefined && (
                  <p data-testid="response-time">You started after {seconds(feedback.responseMs)} seconds.</p>
                )}
              </div>
              {feedback.newBest && <p data-testid="new-best"><Status kind="done" label="New personal best" /> Quicker than ever.</p>}
              {levelNote && <p data-testid="level-up"><Status kind="done" label="Level up" /> Next time: {levelNote}.</p>}
              {feedback.chunks && (
                <ul className="tiles" lang="es" aria-label="The chunks you said" data-testid="chunks">
                  {feedback.chunks.map((c, i) =>
                    c.said ? (
                      <li key={i} className="reveal" style={{ animationDelay: `${i * 160}ms` }}>
                        <Tile piece={c} plain={false} disabled data-testid={`chunk-${i}`} data-said="true" />
                      </li>
                    ) : (
                      <li key={i}>
                        <span className="tile tile-missed" data-testid={`chunk-${i}`} data-said="false">
                          <span aria-hidden="true">…</span>
                          <span className="sr-only">a chunk you did not say</span>
                        </span>
                      </li>
                    ),
                  )}
                </ul>
              )}
              {feedback.fix && <p data-testid="fix"><strong>One thing to fix:</strong> {feedback.fix}</p>}
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
          {message && <p className="error" role="alert">{message}</p>}
        </div>
      )}

      {stage === 'summary' && (
        <div className="stack" data-testid="summary">
          <p><strong>Round done.</strong></p>
          {roundAverage !== null ? (
            <p data-testid="round-average">Your average start this round: {seconds(roundAverage)} seconds.</p>
          ) : (
            <p>No timed answers counted this round. Come back and try another.</p>
          )}
          <RankLadder state={state} />
          {state.ready && <ReadyNote />}
          <LittleAndOften />
          <div className="controls">
            <button type="button" className="btn btn-primary" onClick={() => { setStage('intro'); setFeedback(null); }} disabled={busy}>Another round</button>
            <Link className="btn" href="/">Back to the desktop</Link>
          </div>
        </div>
      )}
    </PracticeShell>
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
function RankLadder({ state, compact = false }: { state: AutomateState; compact?: boolean }) {
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
      {!compact && rank.nextStepMs !== null && rank.nextStepMs > 0 && <p className="muted">About {seconds(rank.nextStepMs)} seconds quicker on average reaches the next step.</p>}
      {history.length > 0 && (
        <p className="muted" data-testid="history">
          Your recent sessions: {history.map((h) => `${seconds(h.averageMs)} s`).join(' → ')}
        </p>
      )}
    </div>
  );
}
