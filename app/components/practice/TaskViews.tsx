'use client';

import { useEffect, useRef, useState } from 'react';
import { KIND_LABEL } from '../../../lib/practice/chunk-kind';
import { checkScramble, matchDone, moveTile, newMatch, newScramble, tapTile, toggleTile, unlockMatch, type MatchState, type ScrambleState } from '../../../lib/practice/safe-input';
import type { ChoiceTask, MatchTask, Piece, ScrambleTask } from '../../../lib/practice/tasks';
import './practice.css';

/** How long a pair result shows before input opens again. Presses in between are ignored. */
export const PAIR_RESULT_MS = 250;

export function Tile({ piece, plain = false, ...rest }: { piece: Pick<Piece, 'text' | 'kind'>; plain?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement> & { 'data-picked'?: boolean; 'data-matched'?: boolean; 'data-wrong'?: boolean }) {
  const k = KIND_LABEL[piece.kind];
  return (
    <button type="button" className="tile" data-kind={piece.kind} lang="es" {...rest}>
      {!plain && <span className="tile-kind" aria-hidden="true">{k.symbol}</span>}
      <span>{piece.text}</span>
      {!plain && <span className="sr-only"> ({k.word})</span>}
    </button>
  );
}

/** Hear and choose, tap what you hear, and fill the gap share one shape: a prompt and numbered options. */
export function ChoiceTaskView({ task, answered, chosen, onChoose, onHear }: { task: ChoiceTask; answered: boolean; chosen: number | null; onChoose: (i: number) => void; onHear: (text: string) => void }) {
  const locked = useRef(false);
  useEffect(() => {
    locked.current = false;
  }, [task]);
  const choose = (i: number) => {
    if (locked.current || answered) return;
    locked.current = true;
    onChoose(i);
  };
  useEffect(() => {
    if (task.audio) onHear(task.audio);
    // The sound plays once when the task appears.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (n >= 1 && n <= task.options.length) choose(n - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task, answered]);

  const heading = task.type === 'hear_choose' ? 'Listen. What does it mean?' : task.type === 'tap_hear' ? 'Listen. Tap what you hear.' : 'Fill the gap.';
  return (
    <div className="stack" data-testid="task" data-type={task.type}>
      <h2>{heading}</h2>
      {task.audio && (
        <button type="button" className="btn" onClick={() => onHear(task.audio!)} data-testid="hear-again">
          Hear it again
        </button>
      )}
      {task.type === 'fill_gap' && (
        <p className="heard-text" lang="es" data-testid="gap-sentence">
          {task.before} <span className="gap-blank" aria-label="gap">{answered ? task.options[task.correctIndex] : '    '}</span> {task.after}
        </p>
      )}
      <ul className="options" role="list">
        {task.options.map((o, i) => (
          <li key={i}>
            <button
              type="button"
              className="option"
              lang={task.type === 'hear_choose' ? 'en' : 'es'}
              disabled={answered}
              data-result={answered ? (i === task.correctIndex ? 'right' : i === chosen ? 'wrong' : undefined) : undefined}
              onClick={() => choose(i)}
              data-testid={`option-${i}`}
            >
              <span aria-hidden="true">{i + 1}.</span>
              <span>{o}</span>
              {answered && i === task.correctIndex && <span aria-hidden="true"> ✓</span>}
              {answered && i === chosen && i !== task.correctIndex && <span aria-hidden="true"> ✗</span>}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Match pairs: Spanish on the left, English on the right. Input is ignored while a result shows. */
export function MatchPairsView({ task, onDone }: { task: MatchTask; onDone: (correct: boolean) => void }) {
  const [state, setState] = useState<MatchState>(newMatch);
  const finished = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const byId = new Map(task.pairs.map((p) => [p.id, p]));

  function tap(side: 'spanish' | 'english', id: string) {
    const r = tapTile(state, side, id);
    setState(r.state);
    if (r.result) {
      timer.current = setTimeout(() => {
        const next = unlockMatch(r.state);
        setState(next);
        if (matchDone(next, task.pairs) && !finished.current) {
          finished.current = true;
          onDone(next.wrongTries <= 2);
        }
      }, PAIR_RESULT_MS);
    }
  }

  const tile = (side: 'spanish' | 'english', id: string) => {
    const p = byId.get(id)!;
    const matched = state.matched.includes(id);
    const picked = (side === 'spanish' ? state.pickedSpanish : state.pickedEnglish) === id;
    const wrong = picked && state.locked && !matched;
    return (
      <li key={`${side}-${id}`}>
        <Tile
          piece={{ text: side === 'spanish' ? p.spanish : p.english, kind: 'other' }}
          plain
          lang={side === 'spanish' ? 'es' : 'en'}
          onClick={() => tap(side, id)}
          aria-pressed={picked}
          data-picked={picked}
          data-matched={matched}
          data-wrong={wrong}
          disabled={matched}
          data-testid={`${side}-${id}`}
        />
      </li>
    );
  };

  return (
    <div className="stack" data-testid="task" data-type="match_pairs">
      <h2>Match each one.</h2>
      <div className="match-grid">
        <ul className="match-col" aria-label="Spanish">{task.spanishOrder.map((id) => tile('spanish', id))}</ul>
        <ul className="match-col" aria-label="English">{task.englishOrder.map((id) => tile('english', id))}</ul>
      </div>
      <p className="sr-only-live" role="status">{state.locked ? (state.matched.length && state.pickedSpanish === state.pickedEnglish ? 'Matched' : 'Not a pair') : ''}</p>
    </div>
  );
}

/** Sentence scramble: tap tiles into order (tap a placed tile to take it back), drag to reorder, or use the arrow keys. */
export function ScrambleView({ task, onDone }: { task: ScrambleTask; onDone: (correct: boolean) => void }) {
  const [state, setState] = useState<ScrambleState>(newScramble);
  const [result, setResult] = useState<'wrong' | null>(null);
  const dragging = useRef<string | null>(null);
  const byId = new Map(task.tiles.map((t) => [t.id, t]));
  const check = checkScramble(state, task.answer);

  function submit() {
    if (check === 'incomplete' || state.locked) return;
    setState((s) => ({ ...s, locked: true }));
    if (check === 'correct') onDone(true);
    else {
      setResult('wrong');
      onDone(false);
    }
  }
  function onKey(e: React.KeyboardEvent, id: string, at: number) {
    if (state.locked) return;
    if (e.key === 'ArrowLeft') setState((s) => moveTile(s, id, at - 1));
    else if (e.key === 'ArrowRight') setState((s) => moveTile(s, id, at + 1));
    else return;
    e.preventDefault();
  }

  return (
    <div className="stack" data-testid="task" data-type="scramble">
      <h2>Put it in order.</h2>
      <p className="muted" lang="en">{task.english}</p>
      <ol
        className="slots"
        aria-label="Your answer"
        onDragOver={(e) => e.preventDefault()}
        onDrop={() => dragging.current && setState((s) => moveTile(s, dragging.current!, s.placed.length))}
        data-testid="slots"
      >
        {state.placed.map((id, at) => (
          <li
            key={id}
            draggable={!state.locked}
            onDragStart={() => (dragging.current = id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.stopPropagation();
              if (dragging.current) setState((s) => moveTile(s, dragging.current!, at));
            }}
          >
            <Tile
              piece={byId.get(id)!}
              onClick={() => setState((s) => toggleTile(s, id))}
              onKeyDown={(e) => onKey(e, id, at)}
              aria-label={`${byId.get(id)!.text}. Place ${at + 1} of ${task.tiles.length}. Tap to take it back; left and right arrows move it.`}
              data-wrong={state.locked && result === 'wrong' && task.answer[at] !== id}
              disabled={state.locked}
              data-testid={`placed-${at}`}
            />
          </li>
        ))}
      </ol>
      <ul className="tiles" aria-label="Pieces to place">
        {task.tiles.filter((t) => !state.placed.includes(t.id)).map((t) => (
          <li key={t.id}>
            <Tile piece={t} onClick={() => setState((s) => toggleTile(s, t.id))} disabled={state.locked} data-testid={`tile-${t.id}`} />
          </li>
        ))}
      </ul>
      {!state.locked && (
        <button type="button" className="btn btn-primary" onClick={submit} disabled={check === 'incomplete'} data-testid="check">
          Check
        </button>
      )}
    </div>
  );
}
