'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

/** Restores progress on this device from a recovery code. The only typed field in the app, and it holds a code, not words. */
export function RestoreForm() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/profile/restore', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong.');
      router.push('/');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="stack" onSubmit={submit}>
      <label className="stack">
        <span>Your recovery code</span>
        <input
          className="text-input"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          inputMode="text"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={14}
          placeholder="XXXXX-XXXXX"
        />
      </label>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <p className="muted">
        Lost your code? Progress cannot be recovered without it, but you can <a href="/welcome">start fresh</a>.
      </p>
      <div className="controls">
        <button type="submit" className="btn btn-primary" disabled={busy || !code.trim()}>
          Get my progress
        </button>
      </div>
    </form>
  );
}
