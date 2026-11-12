'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Chunk } from '../../../lib/course/schema';
import { DEFAULT_MEMORISE, LEVEL_NAMES, promptWords } from '../../../lib/memorise/fade';
import { feedbackFor } from '../../../lib/memorise/feedback';
import { drillStep, sentenceResults, splitSentences, stuckSentence, type DrillState } from '../../../lib/memorise/sentences';
import type { MemoriseItem } from '../../../lib/memorise/store';
import { prioritise } from '../../../lib/diagnostics/plan';
import { afterAttempt, newQueue, nextInQueue, type SessionQueue } from '../../../lib/mastery/mastery';
import { NO_COMBO, stepCombo, type ComboState } from '../../../lib/practice/combo';
import { planMix } from '../../../lib/practice/mixer';
import { pickPraise } from '../../../lib/practice/praise';
import { answerCurrent, currentEntry, MISTAKE_LABEL, newPracticeQueue, type PracticeQueue } from '../../../lib/practice/requeue';
import { canSkipEarlierTasks } from '../../../lib/practice/recall-first';
import { buildUpFor, capLevel, SCAFFOLDS, viewFor } from '../../../lib/practice/scaffold';
import { saidChunks } from '../../../lib/practice/chunk-said';
import type { CauseTag } from '../../../lib/events/attempts';
import { answerPieces, availableTypes, buildTask, type ChoiceTask, type Task } from '../../../lib/practice/tasks';
import { tokenise } from '../../../lib/speech/score';
import { currentSessionId } from '../../../lib/session/session-id';
import { judgeCapture, UNCLEAR_MESSAGE } from '../../../lib/speech/capture-judgement';
import { scoreAttempt, type Score } from '../../../lib/speech/score';
import { syllabify } from '../../../lib/spanish/syllables';
import type { Feelings } from '../../../lib/tele/feelings';
import type { TutorLine } from '../../../lib/tele/lines';
import { selectLine } from '../../../lib/tele/select';
import { Status } from '../../../lib/ui/Status';
import { Caption, useSubtitles } from '../../components/Caption';
import { LittleAndOften } from '../../components/LittleAndOften';
import { ListeningProblem } from '../../components/ListeningProblem';
import { Tele } from '../../components/Tele';
import { FeedbackPanel } from '../../components/practice/FeedbackPanel';
import { PracticeShell } from '../../components/practice/PracticeShell';
import { Reward } from '../../components/practice/Reward';
import { ChoiceTaskView, MatchPairsView, ScrambleView } from '../../components/practice/TaskViews';
import { useLinePlayback } from '../../components/useLinePlayback';
import { useSfx } from '../../components/useSfx';
import { useSpeechCapture, type CaptureResult } from '../../components/useSpeechCapture';
import { useWordAudio } from '../../components/useWordAudio';
import '../../components/screens.css';

const CFG = DEFAULT_MEMORISE;
/** How many warm-up tasks come before saying an answer aloud. The spoken task is the fourth. */
const WARMUPS = 3;
/** The combo moment shows this long, then moves on by itself. */
const COMBO_MS = 1800;

interface Attempt {
  score: Score;
  /** Text the student was scored against: the whole answer, or one sentence in a drill. */
  script: string;
  drill: boolean;
  best: number | null;
  newBest: boolean;
  mastered: boolean;
}

/** The warm-up tasks for one answer, run before the student says it. */
interface Warm {
  itemId: string;
  tasks: Record<string, Task>;
  queue: PracticeQueue;
  total: number;
  /** How many tasks have been shown, so each showing is a fresh component even when a missed task returns. */
  shown: number;
  /** The answer to the current task, once given. */
  answered: { correct: boolean; chosen: number | null } | null;
  praise: string;
}

type Reaction = 'idle' | 'correct' | 'wrong' | 'skipped';
const REACTION_FEELINGS: Record<Reaction, Feelings> = {
  idle: {},
  correct: { joy: 0.8 },
  wrong: { sadness: 0.45 },
  skipped: { surprise: 0.3 },
};

/**
 * Say your answer from memory (tasks 8.1 to 8.4, 5.3 to 5.5, 20.x, 21.x). Each answer starts with a few short
 * warm-up tasks built from its own chunks (match pairs, scramble, fill the gap, tap what you hear), mixed so no
 * type repeats more than three times in a row, then the student says it aloud. A student who already knows an
 * answer can say it first and skip the warm-ups. Every answer shows an instant feedback panel, praise varies, a
 * miss comes back with a label, and the tutor speaks only at meaningful moments. The score is a percentage from
 * the words the recogniser understood. Unclear audio is never scored. Nothing here calls a language model.
 */
export function Memorise({ items: initial, chunks = [], causes = {}, focusIds = [] }: { items: MemoriseItem[]; chunks?: Chunk[]; causes?: Record<string, CauseTag[]>; focusIds?: string[] }) {
  const [items, setItems] = useState(initial);
  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const [queue, setQueue] = useState<SessionQueue>(() => newQueue(prioritise(initial.filter((i) => !i.mastered && !i.laterSession).map((i) => i.id), (id) => focusIds.includes(id))));
  const [curId, setCurId] = useState<string | null>(() => nextInQueue(newQueue(prioritise(initial.filter((i) => !i.mastered && !i.laterSession).map((i) => i.id), (id) => focusIds.includes(id)))));
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [unclear, setUnclear] = useState(false);
  const [drill, setDrill] = useState<DrillState | null>(null);
  const [drillNote, setDrillNote] = useState<string | null>(null);
  /** Chunk-by-chunk build-up of a chunk the student tripped on: the chunk alone, then with its neighbour, then the whole answer (task 21.5). */
  const [buildUp, setBuildUp] = useState<{ steps: number[][]; at: number } | null>(null);
  /** Stay on this answer for the next turn: a drill is on, or has just ended and the whole answer comes back. */
  const [stay, setStay] = useState(false);
  const [practice, setPractice] = useState<string | null>(null);
  const [practiceResult, setPracticeResult] = useState<'got' | 'again' | null>(null);
  const [coins, setCoins] = useState(0);
  const [message, setMessage] = useState<string | null>(null);

  // Task mix, feedback and rhythm (M9).
  const [stage, setStage] = useState<'init' | 'warm' | 'speak'>('init');
  const [warm, setWarm] = useState<Warm | null>(null);
  const [praise, setPraise] = useState('');
  const [reaction, setReaction] = useState<Reaction>('idle');
  const [burst, setBurst] = useState({ n: 0, big: false });
  const [comboShow, setComboShow] = useState(false);
  /** This answer is back because it was missed earlier in the session. */
  const [returning, setReturning] = useState(false);
  /** Answers that were missed this session, to label them when they return. */
  const [missed, setMissed] = useState<ReadonlySet<string>>(new Set());

  const sessionId = useRef('');
  const history = useRef(new Map<string, number[][]>());
  const lastLine = useRef<string | null>(null);
  const lastPraise = useRef<string | null>(null);
  const warmed = useRef(new Set<string>());
  const combo = useRef<ComboState>(NO_COMBO);
  const pendingCombo = useRef(false);
  const comboTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const target = useRef<{ kind: 'answer' } | { kind: 'word'; word: string }>({ kind: 'answer' });
  const current = useRef<{ id: string; drill: DrillState | null; buildUp: { steps: number[][]; at: number } | null; level: number; script: string }>({ id: '', drill: null, buildUp: null, level: 0, script: '' });
  const triedFirst = useRef(false);

  const [showEnglish, toggleEnglish] = useSubtitles();
  const playback = useLinePlayback();
  const words = useWordAudio();
  const sfx = useSfx();
  useEffect(() => {
    sessionId.current = currentSessionId();
    return () => clearTimeout(comboTimer.current);
  }, []);

  const item = curId ? byId.get(curId) ?? null : null;
  const sentences = useMemo(() => (item ? splitSentences(item.answer) : []), [item]);
  const pieces = useMemo(() => (item ? answerPieces(item.answer, chunks) : []), [item, chunks]);
  const stepScript = (steps: number[][], at: number) => (steps[at] ?? []).map((i) => pieces[i]?.text ?? '').join(' ');
  const script = item ? (drill ? sentences[drill.sentence] ?? item.answer : buildUp ? stepScript(buildUp.steps, buildUp.at) : item.answer) : '';
  // The support shown is what the student's results ask for, never weaker than a live cause tag allows.
  const supportLevel = item ? capLevel(item.level, causes[item.id] ?? []) : 0;
  const level = item ? (drill || buildUp ? 0 : supportLevel) : 0;
  const [revealed, setRevealed] = useState(0);
  // The prompt gives the kind of support that matches the level: listen then repeat, gaps, chunk by chunk, first words, or English only.
  const prompt = useMemo(() => {
    if (drill || buildUp || !item) return promptWords(script, level);
    const raw = tokenise(item.answer);
    const pieces = answerPieces(item.answer, chunks);
    let at = 0;
    const chunkWords = pieces.map((p) => {
      const n = tokenise(p.text).length;
      const w = raw.slice(at, at + n);
      at += n;
      return w;
    });
    const view = viewFor(SCAFFOLDS[Math.min(level, SCAFFOLDS.length - 1)], chunkWords, revealed);
    return raw.map((word, i) => ({ word, shown: view.shown[i] ?? false }));
  }, [script, level, drill, buildUp, item, chunks, revealed]);
  const chunkCount = pieces.length;
  current.current = { id: curId ?? '', drill, buildUp, level: supportLevel, script };

  const tele = (situation: Parameters<typeof selectLine>[0]): TutorLine => {
    const line = selectLine(situation, { lastId: lastLine.current });
    lastLine.current = line.id;
    return line;
  };

  /** Tele's wordless reaction: the feeling shows and the sound plays at once, then it settles. */
  function react(r: Reaction) {
    setReaction(r);
    if (r === 'correct') sfx('tele-correct');
    else if (r === 'wrong') sfx('tele-wrong');
    else if (r === 'skipped') sfx('tele-skipped');
  }

  /** The tutor speaks only at meaningful moments, and a line never delays anything: it plays beside the task. */
  function say(situation: Parameters<typeof selectLine>[0]) {
    playback.play(tele(situation));
  }

  // ---- Warm-ups -----------------------------------------------------------------------------------------

  function beginItem(id: string | null) {
    playback.stop(); // moving on cuts any line off
    if (id !== curId) setBuildUp(null);
    setCurId(id);
    setAttempt(null);
    setPractice(null);
    setPracticeResult(null);
    setUnclear(false);
    setMessage(null);
    setReaction('idle');
    triedFirst.current = false;
    setRevealed(0);
    setReturning(!!id && missed.has(id));
    if (id && missed.has(id)) playback.play(tele('wrong')); // the review of a mistake gets a few kind words
    const it = id ? byId.get(id) : null;
    if (!it || warmed.current.has(it.id)) return setStage('speak');
    warmed.current.add(it.id);
    const pieces = answerPieces(it.answer, chunks);
    const mix = planMix(WARMUPS + 1, availableTypes(pieces, chunks)).slice(0, WARMUPS);
    const tasks: Record<string, Task> = {};
    mix.forEach((type, i) => {
      if (type === 'say_aloud') return;
      const t = buildTask(type, pieces, chunks, it.english);
      if (t) tasks[String(i)] = t;
    });
    const ids = Object.keys(tasks);
    if (!ids.length) return setStage('speak');
    setWarm({ itemId: it.id, tasks, queue: newPracticeQueue(ids), total: ids.length, shown: 0, answered: null, praise: '' });
    setStage('warm');
  }

  useEffect(() => {
    beginItem(curId);
    if (curId) say('quick_win'); // Tele speaks at the start of the section
    // Runs once on mount so random choices happen in the browser, never during server rendering.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function answerWarm(correct: boolean, chosen: number | null) {
    if (!warm || warm.answered) return;
    const line = correct ? pickPraise(lastPraise.current) : '';
    lastPraise.current = correct ? line : lastPraise.current;
    setWarm({ ...warm, answered: { correct, chosen }, praise: line });
    sfx(correct ? 'correct' : 'miss');
    react(correct ? 'correct' : 'wrong');
    if (correct) setBurst((b) => ({ n: b.n + 1, big: false }));
    const step = stepCombo(combo.current, correct ? 'correct' : 'wrong');
    combo.current = step.state;
    pendingCombo.current = step.combo;
    if (!correct && curId) setMissed((m) => new Set(m).add(curId));
  }

  function continueWarm() {
    if (!warm?.answered) return;
    if (!pendingCombo.current) playback.stop();
    const queueNext = answerCurrent(warm.queue, warm.answered.correct);
    const advance = () => {
      setComboShow(false);
      setReaction('idle');
      if (!currentEntry(queueNext)) {
        setWarm(null);
        setStage('speak');
      } else setWarm({ ...warm, queue: queueNext, shown: warm.shown + 1, answered: null, praise: '' });
    };
    if (pendingCombo.current) {
      // A combo moment: a short celebration that moves on by itself, with a line from Tele beside it.
      pendingCombo.current = false;
      setComboShow(true);
      sfx('combo');
      setBurst((b) => ({ n: b.n + 1, big: true }));
      say('streak');
      comboTimer.current = setTimeout(advance, COMBO_MS);
    } else advance();
  }

  function knowIt() {
    // Recall first: say the answer now. If it goes well the warm-ups are not needed; if not, they run next time it comes round.
    triedFirst.current = true;
    react('skipped');
    setWarm(null);
    setStage('speak');
  }

  // ---- Saying it aloud ----------------------------------------------------------------------------------

  const capture = useSpeechCapture((r: CaptureResult) => void onCapture(r));

  async function onCapture(r: CaptureResult) {
    const judged = judgeCapture(r.status === 'ok' ? { status: 'ok', transcript: r.transcript, confidence: r.confidence } : { status: 'unclear' });
    if (!judged.scorable) {
      // Noise is not the student's mistake: nothing is scored, saved or counted.
      setUnclear(true);
      playback.play(tele('heard_badly'));
      return;
    }
    setUnclear(false);
    const t = target.current;
    if (t.kind === 'word') {
      setPracticeResult(scoreAttempt(t.word, judged.transcript).accuracy === 100 ? 'got' : 'again');
      return;
    }
    const { id, drill: d, buildUp: b, level: shownLevel, script: text } = current.current;
    const it = byId.get(id);
    if (!it) return;
    const score = scoreAttempt(text, judged.transcript);
    const good = score.accuracy >= CFG.threshold;
    const line = good ? pickPraise(lastPraise.current) : '';
    if (good) lastPraise.current = line;
    setPraise(line);
    sfx(good ? 'correct' : 'miss');
    react(good ? 'correct' : 'wrong');
    if (good) setBurst((b) => ({ n: b.n + 1, big: false }));

    if (d) {
      // A drill attempt is short practice on one sentence. It is not logged and does not change mastery.
      const step = drillStep(d, score.accuracy, CFG.threshold);
      setAttempt({ score, script: text, drill: true, best: it.best, newBest: false, mastered: false });
      setDrill(step.done ? null : step.state);
      setStay(true);
      setDrillNote(step.done ? 'Good. Now the whole answer again.' : null);
      return;
    }

    if (b) {
      // A build-up step is short practice on a chunk, or a pair. Like a drill it is not logged and does not change mastery.
      const at = good ? b.at + 1 : b.at;
      const done = at >= b.steps.length;
      setAttempt({ score, script: text, drill: true, best: it.best, newBest: false, mastered: false });
      setBuildUp(done ? null : { steps: b.steps, at });
      setStay(true);
      setDrillNote(done ? 'Good. Now the whole answer again.' : good ? 'Good. Now that chunk with the one next to it.' : null);
      return;
    }

    try {
      const res = await fetch('/api/recall', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ itemId: it.id, sessionId: sessionId.current, accuracy: score.accuracy, level: shownLevel, missedWords: score.words.flatMap((w, n) => (w.status === 'matched' ? [] : [n])) }),
      });
      if (!res.ok) throw new Error('save failed');
      const out = (await res.json()) as { mastered: boolean; mastery: { qualifyingSuccesses: number; distinctSessions: number }; coinsAwarded: number; answerValue?: number; level: number; best: number; previousBest: number | null };
      const newBest = out.previousBest !== null && score.accuracy > out.previousBest;
      const doneForToday = out.mastered || (out.mastery.qualifyingSuccesses >= 3 && out.mastery.distinctSessions < 2);
      setCoins((c) => c + out.coinsAwarded + (out.answerValue ?? 0));
      setItems((all) => all.map((x) => (x.id === it.id ? { ...x, level: out.level, best: out.best, mastered: out.mastered, successes: out.mastery.qualifyingSuccesses, laterSession: !out.mastered && out.mastery.qualifyingSuccesses >= 3, stalled: x.stalled && !out.mastered } : x)));
      setAttempt({ score, script: text, drill: false, best: out.best, newBest, mastered: out.mastered });
      setQueue((q) => afterAttempt(q, it.id, good ? 'correct' : 'wrong', doneForToday));
      if (!good) setMissed((m) => new Set(m).add(it.id));
      if (newBest) {
        sfx('personal-best');
        setBurst((b) => ({ n: b.n + 1, big: true }));
      }

      // Combo runs count the spoken task too. A recall that skipped the warm-ups counts like any other answer.
      const step = stepCombo(combo.current, good ? 'correct' : 'wrong');
      combo.current = step.state;
      if (step.combo) {
        setComboShow(true);
        clearTimeout(comboTimer.current);
        comboTimer.current = setTimeout(() => setComboShow(false), COMBO_MS);
      }
      // Tele speaks at meaningful moments only: a personal best, a mastered answer or a combo. Otherwise a wordless reaction.
      if (out.mastered) say('mastered');
      else if (newBest) say('improvement');
      else if (step.combo) {
        sfx('combo');
        say('streak');
      }
      // The first go at an answer that already works, without the whole script on screen, skips its warm-ups for good.
      if (triedFirst.current && canSkipEarlierTasks(score.accuracy, shownLevel === 0, CFG)) warmed.current.add(it.id);

      // The same sentence missed three attempts running: isolate it next.
      const past = [...(history.current.get(it.id) ?? []), sentenceResults(it.answer, score).map((s) => s.accuracy)];
      history.current.set(it.id, past);
      const stuck = stuckSentence(past, CFG.threshold);
      if (stuck !== null && !out.mastered) {
        setDrillNote(`You keep tripping on one sentence, so next we will practise just that bit: “${splitSentences(it.answer)[stuck]}”`);
        setDrill({ sentence: stuck, good: 0 });
        setStay(true);
        history.current.set(it.id, []);
      } else if (!good && !out.mastered && shownLevel >= 2) {
        // Support is already down to chunk by chunk or less and a chunk was missed: build that chunk back up.
        const mine = answerPieces(it.answer, chunks);
        const missedAt = saidChunks(mine, score).findIndex((c) => !c.said);
        const plan = buildUpFor(mine.length, missedAt);
        if (plan.length) {
          setBuildUp({ steps: plan, at: 0 });
          setStay(true);
          setDrillNote('You tripped on one chunk, so we will build it up: that chunk, then with the one next to it, then the whole answer.');
        } else setDrillNote(null);
      } else setDrillNote(null);
    } catch {
      setMessage('That did not save. Check your connection and try again.');
    }
  }

  function start() {
    target.current = { kind: 'answer' };
    setMessage(null);
    setUnclear(false);
    setAttempt(null);
    setPracticeResult(null);
    capture.start();
  }

  function sayWord(word: string) {
    target.current = { kind: 'word', word: word.replace(/[.,;:!?¡¿"“”]/g, '') };
    setPracticeResult(null);
    setUnclear(false);
    capture.start();
  }

  function next() {
    const upcoming = stay && curId ? curId : nextInQueue(queue);
    setStay(false);
    beginItem(upcoming);
    if (!upcoming) say('session_end');
  }

  const memorised = items.filter((i) => i.mastered).length;
  const finished = stage !== 'init' && !curId && !attempt;
  const allDone = memorised >= items.length;
  const listening = capture.state === 'listening';
  // A tutor line never holds anything back: only the microphone's own work does.
  const busy = capture.state === 'checking' || capture.state === 'processing';
  const label = returning && !attempt;

  const task = warm ? warm.tasks[currentEntry(warm.queue)?.id ?? ''] : null;
  const entry = warm ? currentEntry(warm.queue) : null;
  const doneCount = warm ? warm.total - warm.queue.upcoming.filter((e) => !e.mistake).length : 0;

  const captionNode = (
    <Caption
      compact
      words={playback.words}
      activeIndex={playback.activeIndex}
      english={playback.line?.en ?? ''}
      showEnglish={showEnglish}
      onToggleEnglish={toggleEnglish}
    />
  );
  const teleNode = (
    <div data-testid="tele-reaction" data-reaction={reaction}>
      <Tele feelings={playback.feelings ?? REACTION_FEELINGS[reaction]} loudness={playback.loudness} speaking={playback.playing} question={listening} />
    </div>
  );

  // ---- Panel at the foot of the screen -----------------------------------------------------------------

  let footer: React.ReactNode = null;
  if (stage === 'warm' && warm?.answered && task) {
    const ans = warm.answered;
    footer = (
      <FeedbackPanel
        state={ans.correct ? 'correct' : 'wrong'}
        praise={warm.praise}
        answer={ans.correct ? undefined : correctAnswerOf(task)}
        onContinue={continueWarm}
      />
    );
  } else if (stage === 'speak' && attempt) {
    const good = attempt.score.accuracy >= CFG.threshold;
    footer = (
      <FeedbackPanel
        state={good ? 'correct' : 'wrong'}
        praise={praise}
        continueLabel="Next"
        onContinue={next}
        extra={
          <button type="button" className="btn" onClick={() => { setAttempt(null); setPractice(null); setPracticeResult(null); }} disabled={busy}>
            Say it again
          </button>
        }
      />
    );
  }

  const meta = (
    <>
      <span data-testid="memorised-count">{memorised} of {items.length} answers memorised</span>
      <span data-testid="coins">+€{coins} today</span>
    </>
  );

  return (
    <PracticeShell tele={teleNode} caption={captionNode} meta={meta} footer={footer}>
      <h1 className="sr-only">Say it from memory</h1>
      {stage !== 'init' && <Reward burstKey={burst.n} big={burst.big} />}

      {finished && (
        <div className="stack" data-testid="finished">
          <Status kind="done" label={allDone ? 'All memorised' : 'Done for today'} />
          <p>
            {allDone
              ? 'You can say all your answers from memory. The next step is open.'
              : 'That is enough for today. An answer counts as memorised once you have said it well on more than one day, so come back tomorrow.'}
          </p>
          <LittleAndOften />
          <Link className="btn btn-primary" href="/">Back to the desktop</Link>
        </div>
      )}

      {comboShow && (
        <div className="combo" role="status" data-testid="combo">
          <strong>Combo!</strong>
          <span>Five in a row.</span>
        </div>
      )}

      {stage === 'warm' && warm && task && entry && !comboShow && (
        <>
          <div className="warm-row">
            <p className="muted" data-testid="warm-progress">
              Warm-up {Math.min(doneCount + 1, warm.total)} of {warm.total}
            </p>
            {entry.mistake && <span className="mistake-label" data-testid="mistake-label">{MISTAKE_LABEL}</span>}
          </div>
          {(task.type === 'hear_choose' || task.type === 'tap_hear' || task.type === 'fill_gap') && (
            <ChoiceTaskView
              key={warm.shown}
              task={task}
              answered={!!warm.answered}
              chosen={warm.answered?.chosen ?? null}
              onChoose={(i) => answerWarm(i === task.correctIndex, i)}
              onHear={(text) => words.play(text)}
            />
          )}
          {task.type === 'match_pairs' && <MatchPairsView key={warm.shown} task={task} onDone={(ok) => answerWarm(ok, null)} />}
          {task.type === 'scramble' && <ScrambleView key={warm.shown} task={task} onDone={(ok) => answerWarm(ok, null)} />}
          {!warm.answered && (
            <button type="button" className="btn" onClick={knowIt} data-testid="know-it">
              I know this one. Let me say it.
            </button>
          )}
        </>
      )}

      {stage === 'speak' && item && !comboShow && (
        <>
          <div className={attempt ? 'sr-only' : undefined}>
            <p className="muted">Say your answer to:</p>
            <p className="heard-text" data-testid="english-prompt">{item.english}</p>
          </div>
          {label && <span className="mistake-label" data-testid="mistake-label">{MISTAKE_LABEL}</span>}

          {!attempt && (
            <>
              {drill && <p data-testid="drill-banner"><strong>Just this bit, a few times.</strong></p>}
              {buildUp && <p data-testid="buildup-banner"><strong>Chunk by chunk: step {buildUp.at + 1} of {buildUp.steps.length}, then the whole answer.</strong></p>}
              <p className="prompt" lang="es" data-testid="prompt" data-level={level} aria-label={`Your script, showing ${LEVEL_NAMES[level]}`}>
                {level === 4 && !drill ? (
                  <span className="muted">No words this time. Say it from memory.</span>
                ) : (
                  prompt.map((w, i) =>
                    w.shown ? (
                      <span key={i}>{w.word} </span>
                    ) : (
                      <span key={i} className="gap" data-dim="true" style={{ width: `${Math.max(2, w.word.length)}ch` }}>
                        <span className="sr-only">hidden word </span>
                      </span>
                    ),
                  )
                )}
              </p>
              <p className="muted" data-testid="support">
                Showing: {drill ? 'the whole sentence' : buildUp ? 'just these chunks' : LEVEL_NAMES[level]}
              </p>
              {!drill && !buildUp && level === 0 && (
                <button type="button" className="btn" onClick={() => words.play(item.answer)} data-testid="hear-first">
                  Listen first
                </button>
              )}
              {!drill && !buildUp && level === 2 && revealed + 1 < chunkCount && (
                <button type="button" className="btn" onClick={() => setRevealed((r) => r + 1)} data-testid="reveal-next">
                  Show the next chunk
                </button>
              )}
            </>
          )}
          <p data-testid="best">{item.best === null ? 'No personal best yet. Your first go sets it.' : `Your best: ${item.best}%`}</p>
          {item.stalled && !attempt && (
            <p data-testid="stalled" className="muted">
              This one is hard to hold. <Link href={`/phases/write?question=${item.position}`}>Try a shorter version</Link>
            </p>
          )}

          {capture.state === 'idle' && !attempt && !unclear && (
            <p data-testid="explain" className="muted">
              Tele listens to check what you said. Your voice is not saved. Your device asks to use the microphone the first time.
            </p>
          )}
          <ListeningProblem state={capture.state} onRetry={capture.retry} onSkip={attempt ? undefined : () => { capture.retry(); next(); }} />
          {listening && <p data-testid="listening">Listening… say your answer, then press Done.</p>}
          {capture.state === 'processing' && <p data-testid="processing">Checking what you said…</p>}
          {unclear && (
            <p role="status" data-testid="unclear">
              <Status kind="retry" label="Not scored" /> {UNCLEAR_MESSAGE}
            </p>
          )}
          {message && <p className="error" role="alert">{message}</p>}

          {(!attempt || listening) && (
            <div className="controls">
              {!attempt && (capture.state === 'idle' || capture.state === 'checking') && (
                <button type="button" className="btn btn-primary" onClick={start} disabled={capture.state === 'checking'}>
                  {unclear ? 'Try again' : 'Start speaking'}
                </button>
              )}
              {listening && <button type="button" className="btn btn-primary" onClick={capture.stop}>Done</button>}
            </div>
          )}

          {attempt && (
            <Result
              attempt={attempt}
              drillNote={drillNote}
              practice={practice}
              practiceResult={practiceResult}
              onPractice={(w) => {
                setPractice(w);
                setPracticeResult(null);
                words.play(w);
              }}
              onHear={(w) => words.play(w)}
              onSay={sayWord}
              listening={listening}
              audio={words}
            />
          )}
        </>
      )}
    </PracticeShell>
  );
}

/** The right answer in words, for the panel after a miss. */
function correctAnswerOf(task: Task): string | undefined {
  if (task.type === 'scramble') return task.answer.map((id) => task.tiles.find((t) => t.id === id)?.text).join(' ');
  if (task.type === 'match_pairs') return undefined;
  return (task as ChoiceTask).answer;
}

const clean = (w: string) => w.replace(/[.,;:!?¡¿"“”]/g, '');

function Result({
  attempt, drillNote, practice, practiceResult, onPractice, onHear, onSay, listening, audio,
}: {
  attempt: Attempt;
  drillNote: string | null;
  practice: string | null;
  practiceResult: 'got' | 'again' | null;
  onPractice: (w: string) => void;
  onHear: (w: string) => void;
  onSay: (w: string) => void;
  listening: boolean;
  audio: ReturnType<typeof useWordAudio>;
}) {
  const fb = feedbackFor(attempt.score, DEFAULT_MEMORISE.threshold);
  const syl = practice ? syllabify(clean(practice)) : null;
  return (
    <div className="stack result-compact" data-testid="result">
      <div className="result-head">
        <p className="accuracy" data-testid="accuracy" aria-label={`${attempt.score.accuracy} percent`}>{attempt.score.accuracy}%</p>
        <p><strong>{fb.headline}</strong></p>
      </div>
      {attempt.newBest && <p data-testid="new-best"><Status kind="done" label="New personal best" /></p>}
      {attempt.mastered && <p data-testid="memorised"><Status kind="done" label="Memorised" /></p>}
      {fb.strongest && <p data-testid="strongest">Strongest part: <span lang="es">{fb.strongest}</span></p>}

      <ul className="word-chips" lang="es" aria-label="Your words">
        {attempt.score.words.map((w, i) =>
          w.status === 'matched' ? (
            <li key={i} data-status="matched">
              <span aria-hidden="true">✓ </span>{w.word}<span className="sr-only"> (matched)</span>
            </li>
          ) : (
            <li key={i} data-status={w.status}>
              <button type="button" className="chip" onClick={() => onPractice(clean(w.word))} aria-label={`${clean(w.word)}, ${w.status === 'missed' ? 'missed' : 'different'}. Tap to practise`}>
                <span aria-hidden="true">✗ </span>{w.word}
              </button>
            </li>
          ),
        )}
      </ul>

      {fb.fix && <p data-testid="fix"><strong>One thing to fix:</strong> {fb.fix.text}</p>}
      {drillNote && <p data-testid="drill-note">{drillNote}</p>}

      {practice && syl && (
        <div className="stack file" data-testid="word-practice" data-audio-source={audio.source ?? ''}>
          <p className="heard-text" lang="es" data-testid="syllables" aria-label={`${practice}, split into syllables`}>
            {syl.syllables.map((s, i) => (
              <span key={i} data-lit={audio.active === i} data-stress={syl.stress === i}>
                {s}{i < syl.syllables.length - 1 ? '-' : ''}
              </span>
            ))}
          </p>
          <p className="muted">The loud part is {syl.syllables[syl.stress]}.</p>
          <div className="controls">
            <button type="button" className="btn" onClick={() => onHear(practice)}>Hear it slowly</button>
            <button type="button" className="btn btn-primary" onClick={() => onSay(practice)} disabled={listening}>Say the word</button>
          </div>
          {practiceResult === 'got' && <p role="status" data-testid="word-got"><Status kind="done" label="Got it" /> That is clear.</p>}
          {practiceResult === 'again' && <p role="status" data-testid="word-again"><Status kind="retry" label="Again" /> Not quite yet. Hear it once more, then try again.</p>}
        </div>
      )}
    </div>
  );
}
