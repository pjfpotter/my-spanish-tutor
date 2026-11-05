'use client';

import { useState } from 'react';

/** Course-level switch for the cheeky phrase pool. Off means no student in the course sees any cheeky line. */
export function CheekySwitch({ token, initial }: { token: string; initial: boolean }) {
  const [on, setOn] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setBusy(true);
    setError(null);
    const res = await fetch('/api/owner/cheeky', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token, enabled: !on }) }).catch(() => null);
    setBusy(false);
    if (!res?.ok) return setError('That did not save. Try again.');
    setOn(!on);
  }

  return (
    <div className="stack">
      <p data-testid="cheeky-state">Cheeky phrases: <strong>{on ? 'on' : 'off'}</strong>. {on ? 'Students can buy them with coins, and Tele may say them when poked.' : 'No student sees any cheeky phrase, even one they already bought.'}</p>
      <button type="button" className="btn" aria-pressed={on} disabled={busy} onClick={toggle} data-testid="cheeky-toggle">
        {on ? 'Switch cheeky phrases off' : 'Switch cheeky phrases on'}
      </button>
      {error && <p className="error" role="alert">{error}</p>}
    </div>
  );
}
