import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getDb } from '../../lib/db';
import { loadAutomateState } from '../../lib/automate/store';
import { loadClassGoal } from '../../lib/progress/class-goal';
import { loadOwnHistory } from '../../lib/progress/history';
import { loadQuestions } from '../../lib/progress/progress';
import { currentProfile } from '../../lib/server/session';
import { Win } from '../components/Win';
import '../components/screens.css';

export const dynamic = 'force-dynamic';

const PHASE_NAMES: Record<string, string> = { write: 'Writing', understand: 'Understanding', memorise: 'Saying from memory', automate: 'Answering fast' };

/** Own history, and the class's combined total. Competition is only ever against your own earlier results. */
export default async function ProgressPage() {
  const profile = await currentProfile();
  if (!profile) redirect('/welcome');
  const db = await getDb();
  const [history, goal, questions] = await Promise.all([loadOwnHistory(db, profile.id, profile.courseId), loadClassGoal(db, profile.courseId), loadQuestions(db, profile.courseId)]);
  const timed = await loadAutomateState(db, profile.id, questions.map((q) => q.id));
  const pct = goal.shown ? Math.min(100, Math.round((goal.attempts / goal.goal) * 100)) : 0;

  return (
    <main className="screen">
      <h1>My progress</h1>
      <Win title="history.exe" label="Your own history">
        <div className="stack">
          {history.attempts === 0 ? (
            <p data-testid="no-history">Nothing here yet. Your first practice starts your history, and it only ever compares you with you.</p>
          ) : (
            <>
              <p data-testid="own-totals">
                You have practised on <strong>{history.daysPractised}</strong> {history.daysPractised === 1 ? 'day' : 'days'} across <strong>{history.sessions}</strong>{' '}
                {history.sessions === 1 ? 'session' : 'sessions'}, with <strong>{history.attempts}</strong> attempts.
              </p>
              <ul className="shop-list" aria-label="Attempts by step">
                {Object.entries(history.byPhase).map(([phase, n]) => (
                  <li key={phase}><span>{PHASE_NAMES[phase] ?? phase}</span><span>{n}</span></li>
                ))}
              </ul>
            </>
          )}
          <h2 className="shop-h">Your best saying each answer</h2>
          <ul className="shop-list" data-testid="bests">
            {history.bests.map((b) => (
              <li key={b.position}><span>Answer {b.position}</span><span>{b.best === null ? 'not tried yet' : `${b.best}%`}</span></li>
            ))}
          </ul>
          {timed.history.length > 0 && (
            <p data-testid="speed-history">Your speed, session by session: {timed.history.map((h) => `${(h.averageMs / 1000).toFixed(1)} s`).join(' → ')}</p>
          )}
        </div>
      </Win>

      <Win title="class-goal.exe" label="The class goal">
        <div className="stack" data-testid="class-goal">
          {goal.shown ? (
            <>
              <p>
                This week the class has made <strong>{goal.attempts}</strong> practice attempts together, towards <strong>{goal.goal}</strong>.
              </p>
              <progress value={pct} max={100} aria-label={`Class goal, ${pct} percent`} />
              <p className="muted">Everyone's practice is added up together. Nobody is named, and nobody is ranked.</p>
            </>
          ) : (
            <p>The class goal appears once there are enough students for a shared total. Until then, it is just you against your own earlier results.</p>
          )}
        </div>
      </Win>

      <div className="controls"><Link className="btn" href="/">Back to the desktop</Link></div>
    </main>
  );
}
