'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_MEMORISE, LEVEL_NAMES, promptWords } from '../../../lib/memorise/fade';
import { feedbackFor } from '../../../lib/memorise/feedback';
import { drillStep, sentenceResults, splitSentences, stuckSentence, type DrillState } from '../../../lib/memorise/sentences';
import type { MemoriseItem } from '../../../lib/memorise/store';
import { prioritise } from '../../../lib/diagnostics/plan';
import { afterAttempt, newQueue, nextInQueue, type SessionQueue } from '../../../lib/mastery/mastery';
import { currentSessionId } from '../../../lib/session/session-id';
import { judgeCapture, UNCLEAR_MESSAGE } from '../../../lib/speech/capture-judgement';
import { scoreAttempt, type Score } from '../../../lib/speech/score';
import { syllabify } from '../../../lib/spanish/syllables';
import type { Feelings } from '../../../lib/tele/feelings';
import type { TutorLine } from '../../../lib/tele/lines';
import { selectLine } from '../../../lib/tele/select';
import { Status } from '../../../lib/ui/Status';
import { Caption, useSubtitles } from '../../components/Caption';
import { Tele } from '../../components/Tele';
import { useLinePlayback } from '../../components/useLinePlayback';
import { useSpeechCapture, type CaptureResult } from '../../components/useSpeechCapture';
import { useWordAudio } from '../../components/useWordAudio';
import { Win } from '../../components/Win';
import '../../components/screens.css';

const CFG = DEFAULT_MEMORISE;

interface Attempt {
  score: Score;
  /** Text the student was scored against: the whole answer, or one sentence in a drill. */
  script: string;
  drill: boolean;
  best: number | null;
  newBest: boolean;
  mastered: boolean;
}

/**
 * Say your answer from memory (tasks 8.1 to 8.4, 5.3 to 5.5). The student sees the English meaning of a
 * question and says their own confirmed answer in Spanish. The prompt gives less of the script as they
 * improve. The score is a percentage from the words the recogniser understood, shown against their own best.
 * Unclear audio is never scored. Nothing here calls a language model.
 */
export function Memorise({ items: initial, focusIds = [] }: { items: MemoriseItem[]; focusIds?: string[] }) {
  const [items, setItems] = useState(initial);
  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const [queue, setQueue] = useState<SessionQueue>(() => newQueue(prioritise(initial.filter((i) => !i.mastered && !i.laterSession).map((i) => i.id), (id) => focusIds.includes(id))));
  const [curId, setCurId] = useState<string | null>(() => nextInQueue(newQueue(prioritise(initial.filter((i) => !i.mastered && !i.laterSession).map((i) => i.id), (id) => focusIds.includes(id)))));
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [unclear, setUnclear] = useState(false);
  const [drill, setDrill] = useState<DrillState | null>(null);
  const [drillNote, setDrillNote] = useState<string | null>(null);
  /** Stay on this answer for the next turn: a drill is on, or has just ended and the whole answer comes back. */
  const [stay, setStay] = useState(false);
  const [practice, setPractice] = useState<string | null>(null);
  const [practiceResult, setPracticeResult] = useState<'got' | 'again' | null>(null);
  const [coins, setCoins] = useState(0);
  const [message, setMessage] = useState<string | null>(null);

  const sessionId = useRef('');
  const history = useRef(new Map<string, number[][]>());
  const lastLine = useRef<string | null>(null);
  const target = useRef<{ kind: 'answer' } | { kind: 'word'; word: string }>({ kind: 'answer' });
  const current = useRef<{ id: string; drill: DrillState | null }>({ id: '', drill: null });

  const [showEnglish, toggleEnglish] = useSubtitles();
  const playback = useLinePlayback();
  const words = useWordAudio();
  useEffect(() => void (sessionId.current = currentSessionId()), []);

  const item = curId ? byId.get(curId) ?? null : null;
  const sentences = useMemo(() => (item ? splitSentences(item.answer) : []), [item]);
  const script = item ? (drill ? sentences[drill.sentence] ?? item.answer : item.answer) : '';
  const level = item ? (drill ? 0 : item.level) : 0;
  const prompt = useMemo(() => promptWords(script, level), [script, level]);
  current.current = { id: curId ?? '', drill };

  const tele = (situation: Parameters<typeof selectLine>[0]): TutorLine => {
    const line = selectLine(situation, { lastId: lastLine.current });
    lastLine.current = line.id;
    return line;
  };

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
    const { id, drill: d } = current.current;
    const it = byId.get(id);
    if (!it) return;
    const text = d ? splitSentences(it.answer)[d.sentence] ?? it.answer : it.answer;
    const score = scoreAttempt(text, judged.transcript);

    if (d) {
      // A drill attempt is short practice on one sentence. It is not logged and does not change mastery.
      const step = drillStep(d, score.accuracy, CFG.threshold);
      setAttempt({ score, script: text, drill: true, best: it.best, newBest: false, mastered: false });
      setDrill(step.done ? null : step.state);
      setStay(true);
      setDrillNote(step.done ? 'Good. Now the whole answer again.' : null);
      playback.play(tele(score.accuracy >= CFG.threshold ? 'correct' : 'wrong'));
      return;
    }

    try {
      const res = await fetch('/api/recall', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ itemId: it.id, sessionId: sessionId.current, accuracy: score.accuracy, level: it.level, missedWords: score.words.flatMap((w, n) => (w.status === 'matched' ? [] : [n])) }),
      });
      if (!res.ok) throw new Error('save failed');
      const out = (await res.json()) as { mastered: boolean; mastery: { qualifyingSuccesses: number; distinctSessions: number }; coinsAwarded: number; level: number; best: number; previousBest: number | null };
      const newBest = out.previousBest !== null && score.accuracy > out.previousBest;
      const doneForToday = out.mastered || (out.mastery.qualifyingSuccesses >= 3 && out.mastery.distinctSessions < 2);
      setCoins((c) => c + out.coinsAwarded);
      setItems((all) => all.map((x) => (x.id === it.id ? { ...x, level: out.level, best: out.best, mastered: out.mastered, successes: out.mastery.qualifyingSuccesses, laterSession: !out.mastered && out.mastery.qualifyingSuccesses >= 3 } : x)));
      setAttempt({ score, script: text, drill: false, best: out.best, newBest, mastered: out.mastered });
      setQueue((q) => afterAttempt(q, it.id, score.accuracy >= CFG.threshold ? 'correct' : 'wrong', doneForToday));
      playback.play(tele(out.mastered ? 'mastered' : newBest ? 'improvement' : score.accuracy >= CFG.threshold ? 'correct' : 'wrong'));

      // The same sentence missed three attempts running: isolate it next.
      const past = [...(history.current.get(it.id) ?? []), sentenceResults(it.answer, score).map((s) => s.accuracy)];
      history.current.set(it.id, past);
      const stuck = stuckSentence(past, CFG.threshold);
      if (stuck !== null && !out.mastered) {
        setDrillNote(`You keep tripping on one sentence, so next we will practise just that bit: “${splitSentences(it.answer)[stuck]}”`);
        setDrill({ sentence: stuck, good: 0 });
        setStay(true);
        history.current.set(it.id, []);
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
    setCurId(stay && curId ? curId : nextInQueue(queue));
    setStay(false);
    setAttempt(null);
    setPractice(null);
    setPracticeResult(null);
    setUnclear(false);
    setMessage(null);
  }

  const memorised = items.filter((i) => i.mastered).length;
  const finished = !curId && !attempt;
  const allDone = memorised >= items.length;
  const listening = capture.state === 'listening';
  const busy = capture.state === 'checking' || capture.state === 'processing' || playback.playing;

  return (
    <main className="screen">
      <h1>Memorizar</h1>
      <Tele feelings={playback.feelings ?? undefined} loudness={playback.loudness} speaking={playback.playing} question={listening} />

      <Win title="memorizar.exe" label="Say your answers from memory">
        <div className="stack">
          <ul className="dots" aria-label={`${memorised} of ${items.length} answers memorised`}>
            {items.map((i) => (
              <li key={i.id} className="dot" data-mastered={i.mastered} />
            ))}
          </ul>
          <p className="muted" data-testid="memorised-count">
            {memorised} of {items.length} answers memorised
          </p>

          {finished && (
            <div className="stack" data-testid="finished">
              <Status kind="done" label={allDone ? 'All memorised' : 'Done for today'} />
              <p>
                {allDone
                  ? 'You can say all your answers from memory. The next step is open.'
                  : 'That is enough for today. An answer counts as memorised once you have said it well on more than one day, so come back tomorrow.'}
              </p>
              <Link className="btn btn-primary" href="/">Back to the desktop</Link>
            </div>
          )}

          {item && (
            <>
              <div>
                <p className="muted">Say your answer to:</p>
                <p className="heard-text" data-testid="english-prompt">{item.english}</p>
              </div>

              {drill && <p data-testid="drill-banner"><strong>Just this bit, a few times.</strong></p>}
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
                Showing: {drill ? 'the whole sentence' : LEVEL_NAMES[level]}
              </p>
              <p data-testid="best">{item.best === null ? 'No personal best yet. Your first go sets it.' : `Your best: ${item.best}%`}</p>

              {capture.state === 'idle' && !attempt && !unclear && (
                <p data-testid="explain" className="muted">
                  Tele needs to hear you to check what you said. Your voice is only used for that, and it is not saved. Your device will ask to use the microphone the first time.
                </p>
              )}
              {capture.state === 'denied' && (
                <p className="error" role="status" data-testid="denied">
                  The microphone is blocked. Tele cannot hear you without it. Allow the microphone for this site in your browser, then try again.
                </p>
              )}
              {capture.state === 'unsupported' && (
                <p className="error" role="status" data-testid="unsupported">
                  This browser cannot use a microphone here. Try Chrome on a phone or a Chromebook, or a different device.
                </p>
              )}
              {capture.state === 'unavailable' && (
                <p className="error" role="status" data-testid="unavailable">
                  Tele could not listen just now. That is not your fault and it does not count against you. Try again in a moment.
                </p>
              )}
              {listening && <p data-testid="listening">Listening… say your answer, then press Done.</p>}
              {capture.state === 'processing' && <p data-testid="processing">Checking what you said…</p>}
              {unclear && (
                <p role="status" data-testid="unclear">
                  <Status kind="retry" label="Not scored" /> {UNCLEAR_MESSAGE}
                </p>
              )}
              {message && <p className="error" role="alert">{message}</p>}

              <div className="controls">
                {!attempt && (capture.state === 'idle' || capture.state === 'checking') && (
                  <button type="button" className="btn btn-primary" onClick={start} disabled={capture.state === 'checking'}>
                    {unclear ? 'Try again' : 'Start speaking'}
                  </button>
                )}
                {listening && <button type="button" className="btn btn-primary" onClick={capture.stop}>Done</button>}
                {(capture.state === 'denied' || capture.state === 'unavailable') && (
                  <button type="button" className="btn btn-primary" onClick={capture.retry}>Try again</button>
                )}
              </div>

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

              {attempt && (
                <div className="stack">
                  <p className="coins" data-testid="coins">+{coins} coins today</p>
                  <div className="controls">
                    <button type="button" className="btn" onClick={() => { setAttempt(null); setPractice(null); setPracticeResult(null); }} disabled={busy}>
                      Say it again
                    </button>
                    <button type="button" className="btn btn-primary" onClick={next} disabled={busy}>Next</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </Win>

      <Caption
        words={playback.words}
        activeIndex={playback.activeIndex}
        english={playback.line?.en ?? ''}
        showEnglish={showEnglish}
        onToggleEnglish={toggleEnglish}
      />
    </main>
  );
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
    <div className="stack" data-testid="result">
      <p className="accuracy" data-testid="accuracy" aria-label={`${attempt.score.accuracy} percent`}>{attempt.score.accuracy}%</p>
      {attempt.newBest && <p data-testid="new-best"><Status kind="done" label="New personal best" /></p>}
      {attempt.mastered && <p data-testid="memorised"><Status kind="done" label="Memorised" /></p>}
      <p><strong>{fb.headline}</strong></p>
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
