'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

/** Two taps to delete: ask, then confirm. On success the device goes back to how it was on day one. */
export function DeleteEverything() {
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/profile', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ confirm: true }) });
      if (!res.ok) throw new Error('That did not work. Try again in a moment.');
      // First-use state: nothing from this profile is left on the device either.
      try { localStorage.clear(); sessionStorage.clear(); } catch { /* blocked storage has nothing to clear */ }
      router.replace('/welcome');
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  if (!asking) {
    return <button type="button" className="btn" onClick={() => setAsking(true)}>Delete everything</button>;
  }
  return (
    <div className="stack" role="alertdialog" aria-labelledby="delete-q">
      <p id="delete-q"><strong>Delete everything?</strong> Your progress, answers and euros will be gone for good. Your recovery code will stop working.</p>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="controls">
        <button type="button" className="btn btn-primary" disabled={busy} onClick={confirm}>Yes, delete everything</button>
        <button type="button" className="btn" disabled={busy} onClick={() => setAsking(false)}>Keep my progress</button>
      </div>
    </div>
  );
}
