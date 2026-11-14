import Link from 'next/link';
import type { CanDo as CanDoData, CanDoRow, TickState } from '../../lib/progress/can-do';
import { PHASES, type PhaseId } from '../../lib/phases/gate';
import { WINDOW_TITLES } from '../../lib/ui/window-titles';
import { Win } from './Win';

const STEP_NAME: Record<PhaseId, string> = { understand: 'Understand', write: 'Write', memorise: 'Memorise', automate: 'Fast' };
const STATE_WORD: Record<TickState, string> = { 'not-yet': 'Not yet', 'getting-there': 'Getting there', 'got-it': 'Got it' };

/** The state as a shape as well as a word, so it never depends on colour: empty, half, or filled with a tick. */
function TickIcon({ state }: { state: TickState }) {
  return (
    <svg className="tick-icon" viewBox="0 0 16 16" width="18" height="18" aria-hidden="true" shapeRendering="crispEdges">
      <circle cx="8" cy="8" r="6.5" fill="#fff" stroke="#0b2a4a" strokeWidth="1.5" />
      {state === 'getting-there' && <path d="M8 1.5a6.5 6.5 0 0 0 0 13z" fill="#0b2a4a" />}
      {state === 'got-it' && (
        <>
          <circle cx="8" cy="8" r="6.5" fill="#0b2a4a" />
          <path d="M4.5 8.2l2.4 2.4 4.6-5" fill="none" stroke="#fff" strokeWidth="1.8" />
        </>
      )}
    </svg>
  );
}

function Ticks({ row }: { row: CanDoRow }) {
  return (
    <ul className="cando-ticks" aria-label="Steps">
      {PHASES.map((p) => (
        <li key={p} className="cando-tick" data-step={p} data-state={row.ticks[p]}>
          <TickIcon state={row.ticks[p]} />
          <span className="tick-step">{STEP_NAME[p]}</span>
          <span className="tick-word">{STATE_WORD[row.ticks[p]]}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Progress at a glance, as can-do statements: one row per test question with a tick for each of the four steps. A
 * row that is not finished opens its next step. Whole numbers only: no percentages, no ranking, nothing about other students.
 */
export function CanDo({ canDo }: { canDo: CanDoData }) {
  return (
    <Win title={WINDOW_TITLES.canDo}>
      <div className="stack">
        <p className="cando-count" data-testid="cando-count">
          <strong>{canDo.ready}</strong> of {canDo.total} ready
        </p>
        <ul className="cando">
          {canDo.rows.map((row) => {
            const statement = <span className="cando-statement">I can answer “{row.english}”</span>;
            return (
              <li key={row.id} className="cando-row" data-testid="can-do-row" data-complete={row.complete ? 'true' : 'false'}>
                {row.complete || !row.nextStep ? (
                  <div className="cando-body">
                    {statement}
                    <span className="cando-sticker" data-testid="can-do-sticker">Got it all</span>
                    <Ticks row={row} />
                  </div>
                ) : (
                  <Link className="cando-body cando-link" href={`/phases/${row.nextStep}`} data-testid="can-do-link" data-next={row.nextStep}>
                    {statement}
                    <Ticks row={row} />
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </Win>
  );
}
