'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { DEFAULT_REMINDER, isValidTime, localDate, parsePrefs, reminderDue, type Permission, type ReminderPrefs } from '../../lib/planner/reminders';
import { readiness, type ReadinessInput } from '../../lib/planner/readiness';
import { Win } from './Win';

const PREFS_KEY = 'planner:prefs';
const SHOWN_KEY = 'planner:reminder-shown';

const read = (key: string) => { try { return localStorage.getItem(key); } catch { return null; } };
const write = (key: string, value: string) => { try { localStorage.setItem(key, value); } catch { /* kept for this visit only */ } };
const permission = (): Permission => (typeof Notification === 'undefined' ? 'unsupported' : Notification.permission);

/** The test countdown and readiness meter, which says what moves it next. After the test date it becomes a short reflection. */
export function ExamWindow({ daysToTest, progress }: { daysToTest: number; progress: ReadinessInput }) {
  const [reflection, setReflection] = useState<'open' | 'done'>('open');
  const r = readiness(progress);
  if (daysToTest < 0) {
    return (
      <Win title="test.exe" label="Your speaking test">
        <p><strong>How did it go?</strong></p>
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
    <Win title="test.exe" label="Your speaking test">
      {daysToTest === 0 ? (
        <>
          <p className="days" data-testid="days-to-test"><strong>Today</strong></p>
          <p className="days-en">Your speaking test is today</p>
        </>
      ) : (
        <>
          <p className="days" data-testid="days-to-test"><strong>{daysToTest}</strong> {daysToTest === 1 ? 'day' : 'days'}</p>
          <p className="days-en">{daysToTest === 1 ? '1 day' : `${daysToTest} days`} until your speaking test</p>
        </>
      )}
      <p data-testid="readiness">Readiness: <strong>{r.percent}%</strong></p>
      <div className="meter" role="progressbar" aria-label="Readiness" aria-valuemin={0} aria-valuemax={100} aria-valuenow={r.percent}>
        <span style={{ width: `${r.percent}%` }} />
      </div>
      <p className="muted" data-testid="readiness-next">
        Next: {r.nextAction.en}
      </p>
    </Win>
  );
}

/** One optional daily reminder. There is no session plan and no session lengths (revision-planner: No session plan or timings). Everything stays on this device. */
export function ReminderWindow({ daysToTest }: { daysToTest: number }) {
  const [prefs, setPrefs] = useState<ReminderPrefs>(DEFAULT_REMINDER);
  const [perm, setPerm] = useState<Permission>('unsupported');

  useEffect(() => {
    const p = parsePrefs(read(PREFS_KEY));
    setPrefs(p);
    setPerm(permission());
    // Shown at most once a day, only if the student turned it on and the device allows it.
    if (reminderDue({ prefs: p, permission: permission(), now: new Date(), lastShownDate: read(SHOWN_KEY), daysToTest })) {
      write(SHOWN_KEY, localDate(new Date()));
      try { new Notification('Tele te espera', { body: 'Time for a little Spanish today?' }); } catch { /* some phones only allow this from a service worker */ }
    }
  }, [daysToTest]);

  if (daysToTest < 1) return null;

  function save(next: ReminderPrefs) { setPrefs(next); write(PREFS_KEY, JSON.stringify(next)); }
  async function toggleReminder() {
    if (prefs.enabled) return save({ ...prefs, enabled: false });
    const result = typeof Notification === 'undefined' ? 'unsupported' : await Notification.requestPermission();
    setPerm(result);
    if (result === 'granted') save({ ...prefs, enabled: true });
  }

  return (
    <Win title="reminder.exe" label="Daily reminder">
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
