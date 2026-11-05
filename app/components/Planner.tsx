'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { PhaseId } from '../../lib/phases/gate';
import { buildPlan } from '../../lib/planner/plan';
import { DEFAULT_REMINDER, isValidTime, localDate, parsePrefs, reminderDue, type Permission, type ReminderPrefs } from '../../lib/planner/reminders';
import { readiness, type ReadinessInput } from '../../lib/planner/readiness';
import { Win } from './Win';

const MINUTES = [10, 15, 20, 30] as const;
const PREFS_KEY = 'planner:prefs';
const MINUTES_KEY = 'planner:minutes';
const SHOWN_KEY = 'planner:reminder-shown';
const PHASE_NAME: Record<PhaseId, { es: string; en: string }> = {
  write: { es: 'Escribir', en: 'Write' },
  understand: { es: 'Entender', en: 'Understand' },
  memorise: { es: 'Memorizar', en: 'Memorise' },
  automate: { es: 'Automatizar', en: 'Automate' },
};

const read = (key: string) => { try { return localStorage.getItem(key); } catch { return null; } };
const write = (key: string, value: string) => { try { localStorage.setItem(key, value); } catch { /* kept for this visit only */ } };
const permission = (): Permission => (typeof Notification === 'undefined' ? 'unsupported' : Notification.permission);

/** The test countdown and readiness meter, which says what moves it next. After the test date it becomes a short reflection. */
export function ExamWindow({ daysToTest, progress }: { daysToTest: number; progress: ReadinessInput }) {
  const [reflection, setReflection] = useState<'open' | 'done'>('open');
  const r = readiness(progress);
  if (daysToTest < 0) {
    return (
      <Win title="examen.exe" label="Your speaking test">
        <p><strong>¿Qué tal fue?</strong> <span className="muted">How did it go?</span></p>
        {reflection === 'open' ? (
          <>
            <p>Think of one thing you did well in the test. Nothing is saved or marked.</p>
            <button type="button" className="btn" onClick={() => setReflection('done')}>I thought of one</button>
          </>
        ) : (
          <p data-testid="reflection-done">Good. Hold on to that one.</p>
        )}
        <Link className="btn" href="/phases/understand" data-testid="light-review">Light review</Link>
      </Win>
    );
  }
  return (
    <Win title="examen.exe" label="Your speaking test">
      {daysToTest === 0 ? (
        <>
          <p className="days" data-testid="days-to-test"><strong>Hoy</strong></p>
          <p className="days-en">Your speaking test is today</p>
        </>
      ) : (
        <>
          <p className="days" data-testid="days-to-test"><strong>{daysToTest}</strong> días</p>
          <p className="days-en">{daysToTest === 1 ? '1 day' : `${daysToTest} days`} until your speaking test</p>
        </>
      )}
      <p data-testid="readiness">Readiness: <strong>{r.percent}%</strong></p>
      <div className="meter" role="progressbar" aria-label="Readiness" aria-valuemin={0} aria-valuemax={100} aria-valuenow={r.percent}>
        <span style={{ width: `${r.percent}%` }} />
      </div>
      <p className="muted" data-testid="readiness-next">
        Next: <span lang="es">{r.nextAction.es}</span>. {r.nextAction.en}
      </p>
    </Win>
  );
}

/** A short plan for the days left, and one optional daily reminder. Everything stays on this device. */
export function PlanWindow({ daysToTest, progress }: { daysToTest: number; progress: ReadinessInput }) {
  const [minutes, setMinutes] = useState<number>(15);
  const [prefs, setPrefs] = useState<ReminderPrefs>(DEFAULT_REMINDER);
  const [perm, setPerm] = useState<Permission>('unsupported');

  useEffect(() => {
    const saved = Number(read(MINUTES_KEY));
    if ((MINUTES as readonly number[]).includes(saved)) setMinutes(saved);
    const p = parsePrefs(read(PREFS_KEY));
    setPrefs(p);
    setPerm(permission());
    // Shown at most once a day, only if the student turned it on and the device allows it.
    if (reminderDue({ prefs: p, permission: permission(), now: new Date(), lastShownDate: read(SHOWN_KEY), daysToTest })) {
      write(SHOWN_KEY, localDate(new Date()));
      try { new Notification('Tele te espera', { body: 'A few minutes of Spanish today?' }); } catch { /* some phones only allow this from a service worker */ }
    }
  }, [daysToTest]);

  if (daysToTest < 1) return null;
  const plan = buildPlan({ progress, minutesPerDay: minutes, daysLeft: daysToTest });

  function save(next: ReminderPrefs) { setPrefs(next); write(PREFS_KEY, JSON.stringify(next)); }
  async function toggleReminder() {
    if (prefs.enabled) return save({ ...prefs, enabled: false });
    const result = typeof Notification === 'undefined' ? 'unsupported' : await Notification.requestPermission();
    setPerm(result);
    if (result === 'granted') save({ ...prefs, enabled: true });
  }

  return (
    <Win title="plan.exe" label="Your plan">
      <p id="minutes-label"><strong>How long can you do each day?</strong></p>
      <ul className="options minutes" aria-labelledby="minutes-label">
        {MINUTES.map((m) => (
          <li key={m}>
            <button type="button" className="option" aria-pressed={minutes === m} data-minutes={m} onClick={() => { setMinutes(m); write(MINUTES_KEY, String(m)); }}>
              {m} min
            </button>
          </li>
        ))}
      </ul>
      {plan.mode === 'late' && <p className="muted" data-testid="late-note">Not much time left, so the plan is short: write simple answers, then practise saying them fast.</p>}
      {plan.days.length > 0 ? (
        <>
          <p data-testid="plan-message">{plan.message}</p>
          <ol className="plan-days">
            {plan.days.map((d) => (
              <li key={d.day} data-testid="plan-day">
                <strong>{d.day === 0 ? 'Today' : d.day === 1 ? 'Tomorrow' : `In ${d.day} days`}</strong>
                {': '}
                {d.sessions.map((s, i) => (
                  <span key={i}>{i > 0 && ', '}<span lang="es">{PHASE_NAME[s.phase].es}</span> {s.minutes} min</span>
                ))}
              </li>
            ))}
          </ol>
        </>
      ) : (
        <p data-testid="plan-message">{plan.message}</p>
      )}
      <div className="reminder">
        <button type="button" className="btn" aria-pressed={prefs.enabled} onClick={toggleReminder} data-testid="reminder-toggle" disabled={perm === 'unsupported' || perm === 'denied'}>
          {prefs.enabled ? 'Turn reminder off' : 'Remind me each day'}
        </button>
        {prefs.enabled && (
          <label>
            {' '}at{' '}
            <input type="time" value={prefs.time} onChange={(e) => isValidTime(e.target.value) && save({ ...prefs, time: e.target.value })} />
          </label>
        )}
        {perm === 'unsupported' && <p className="muted">This device can’t show reminders.</p>}
        {perm === 'denied' && <p className="muted">Reminders are blocked in this browser’s settings.</p>}
        <p className="muted">Off unless you turn it on. It shows only while the app is open.</p>
      </div>
    </Win>
  );
}
