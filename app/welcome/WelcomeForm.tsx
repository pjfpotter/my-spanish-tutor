'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

const MAX_INTERESTS = 5;

/**
 * Anonymous sign-up: pick a nickname from a list and interests from a fixed list. There is no text
 * field on purpose: no name, no email, nothing typed (student-identity-privacy).
 */
export function WelcomeForm({ nicknames, interests }: { nicknames: string[]; interests: string[] }) {
  const router = useRouter();
  const [nickname, setNickname] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState<string | null>(null);

  const toggle = (tag: string) =>
    setPicked((cur) => (cur.includes(tag) ? cur.filter((t) => t !== tag) : cur.length < MAX_INTERESTS ? [...cur, tag] : cur));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!nickname) return setError('Pick a nickname first.');
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/profile', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ nickname, interests: picked }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong.');
      setCode(data.recoveryCode);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (code) {
    return (
      <div className="stack">
        <p>
          <strong>Your recovery code</strong>
        </p>
        <p className="recovery-code" data-testid="recovery-code">
          {code}
        </p>
        <p>
          Write this down or take a photo. It is the only way to get your progress back on another phone or
          computer, and we cannot look it up for you. We never ask for your name or email.
        </p>
        <button type="button" className="btn btn-primary" onClick={() => router.push('/')}>
          I have saved it. Let&apos;s go
        </button>
      </div>
    );
  }

  return (
    <form className="stack" onSubmit={submit}>
      <fieldset className="group">
        <legend>Pick a nickname</legend>
        <div className="choice-list">
          {nicknames.map((n) => (
            <label key={n} className="choice">
              <input type="radio" name="nickname" value={n} checked={nickname === n} onChange={() => setNickname(n)} />
              {n}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="group">
        <legend>What are you into? Pick up to {MAX_INTERESTS}</legend>
        <div className="choice-list">
          {interests.map((t) => (
            <label key={t} className="choice">
              <input type="checkbox" name="interest" value={t} checked={picked.includes(t)} onChange={() => toggle(t)} />
              {t}
            </label>
          ))}
        </div>
      </fieldset>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="controls">
        <button type="submit" className="btn btn-primary" disabled={busy}>
          Create my profile
        </button>
        <a className="btn" href="/restore">
          I already have a code
        </a>
      </div>
    </form>
  );
}
