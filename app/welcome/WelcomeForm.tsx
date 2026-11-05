'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { PrivacyNotice } from '../components/PrivacyNotice';

const MAX_INTERESTS = 5;

/**
 * Joining in three steps: the class code, the privacy notice (which must be acknowledged), then a nickname
 * from a list and interests from a fixed list. The class code and the recovery code are the only things
 * typed, and both are codes, not words. No name, no email (student-identity-privacy).
 */
export function WelcomeForm({ nicknames, interests }: { nicknames: string[]; interests: string[] }) {
  const router = useRouter();
  const [step, setStep] = useState<'code' | 'notice' | 'pick'>('code');
  const [classCode, setClassCode] = useState('');
  const [course, setCourse] = useState<{ title: string; testDate: string } | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [nickname, setNickname] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState<string | null>(null);

  const toggle = (tag: string) =>
    setPicked((cur) => (cur.includes(tag) ? cur.filter((t) => t !== tag) : cur.length < MAX_INTERESTS ? [...cur, tag] : cur));

  async function checkCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/join', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code: classCode }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong.');
      setCourse(data.course);
      setStep('notice');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!nickname) return setError('Pick a nickname first.');
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/profile', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ classCode, privacyAcknowledged: acknowledged, nickname, interests: picked }),
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

  const errorLine = error && (
    <p className="error" role="alert">
      {error}
    </p>
  );

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

  if (step === 'code') {
    return (
      <form className="stack" onSubmit={checkCode}>
        <label className="stack">
          <span>Your class code <span className="muted">(from your teacher)</span></span>
          <input
            className="text-input" name="classCode" value={classCode} onChange={(e) => setClassCode(e.target.value)}
            autoComplete="off" autoCapitalize="characters" spellCheck={false} maxLength={12} placeholder="ABCD1"
          />
        </label>
        {errorLine}
        <div className="controls">
          <button type="submit" className="btn btn-primary" disabled={busy || !classCode.trim()}>
            Find my class
          </button>
          <a className="btn" href="/restore">
            I already have a recovery code
          </a>
        </div>
      </form>
    );
  }

  if (step === 'notice') {
    return (
      <div className="stack">
        <p data-testid="course-found">
          <strong>{course?.title}</strong>
          <br />
          Speaking test: <span data-testid="course-date">{course && new Date(course.testDate + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })}</span>
          <br />
          <span className="muted">You will start by writing your answers.</span>
        </p>
        <PrivacyNotice />
        <label className="choice">
          <input type="checkbox" name="acknowledge" checked={acknowledged} onChange={(e) => setAcknowledged(e.target.checked)} />
          I have read this
        </label>
        <div className="controls">
          <button type="button" className="btn btn-primary" disabled={!acknowledged} onClick={() => setStep('pick')}>
            Carry on
          </button>
          <button type="button" className="btn" onClick={() => { setStep('code'); setAcknowledged(false); }}>
            Use a different code
          </button>
        </div>
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
      {errorLine}
      <div className="controls">
        <button type="submit" className="btn btn-primary" disabled={busy}>
          Create my profile
        </button>
      </div>
    </form>
  );
}
