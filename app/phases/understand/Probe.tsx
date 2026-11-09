'use client';

import { useMemo, useRef, useState } from 'react';
import { nextProbeStep, type ComprehensionProbe } from '../../../lib/diagnostics/comprehension';
import { SPEEDS } from '../../../lib/audio/speeds';
import { clipUrls, type BuiltClip } from '../../../lib/tele/clips';
import { buildOptions } from '../../../lib/understand/speed';

export interface ProbeWord {
  id: string;
  spanish: string;
  english: string;
}

/** How a word can be played: a built clip, the device's Spanish voice, or not at all (then no probe is run). */
export function canPlayWord(word: string, index: readonly BuiltClip[]): boolean {
  if (index.some((c) => c.text === word && (c.speed === SPEEDS.slow || c.speed === SPEEDS.normal))) return true;
  return typeof window !== 'undefined' && !!window.speechSynthesis && typeof SpeechSynthesisUtterance !== 'undefined';
}

function playWord(word: string, rate: number, index: readonly BuiltClip[]) {
  const slot = index.find((c) => c.text === word && c.speed === rate)?.slot;
  if (slot) {
    void new Audio(clipUrls(slot).audio).play().catch(() => {});
    return;
  }
  try {
    const u = new SpeechSynthesisUtterance(word);
    u.lang = 'es-ES';
    u.rate = rate;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  } catch {
    // A voice that will not start just means the student presses Listen again.
  }
}

/**
 * A short, skippable check after a missed question (learning-diagnostics: Comprehension cause tags).
 * It plays the key word alone slowly, then at normal speed, and shows it written if they missed it
 * slowly, so a rule can say why the question was missed. It never scores or penalises the student.
 */
export function Probe({
  word, words, index, onFinish, onSkip,
}: {
  word: ProbeWord;
  words: ProbeWord[];
  index: readonly BuiltClip[];
  onFinish: (result: ComprehensionProbe) => void;
  onSkip: () => void;
}) {
  const [done, setDone] = useState<Partial<ComprehensionProbe>>({});
  const [listened, setListened] = useState(false);
  const step = nextProbeStep(done);
  const options = useMemo(() => buildOptions(words, word.id), [words, word.id, step]);
  const finished = useRef(false);

  if (step === null && !finished.current) {
    finished.current = true;
    queueMicrotask(() => onFinish({ heardSlow: done.heardSlow ?? false, heardNormal: done.heardNormal ?? null, written: done.written ?? null }));
  }
  if (step === null) return null;

  const heard = step !== 'written';
  const rate = step === 'heardSlow' ? SPEEDS.slow : SPEEDS.normal;
  const pick = (id: string) => {
    setDone((d) => ({ ...d, [step]: id === word.id }));
    setListened(false);
  };

  return (
    <section className="stack" aria-label="Quick check" data-testid="probe">
      <p>
        <strong>{heard ? 'One word on its own. What does it mean?' : 'The word, written. What does it mean?'}</strong>
      </p>
      <div className="controls">
        {heard ? (
          <button type="button" className="btn btn-primary" onClick={() => { playWord(word.spanish, rate, index); setListened(true); }}>
            {listened ? 'Play again' : step === 'heardSlow' ? 'Listen (slowly)' : 'Listen'}
          </button>
        ) : (
          <p className="heard-text" lang="es">{word.spanish}</p>
        )}
        <button type="button" className="btn" onClick={onSkip}>Skip the check</button>
      </div>
      <ul className="options">
        {options.map((o) => (
          <li key={o.id}>
            <button type="button" className="option" disabled={heard && !listened} onClick={() => pick(o.id)}>
              <span>{o.text}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
