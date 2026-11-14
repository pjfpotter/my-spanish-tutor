'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { EMOTIONS, type Emotion } from '../../../lib/tele/feelings';
import { PLACEHOLDER_LINES } from '../../../lib/tele/lines';
import { Caption, useSubtitles } from '../../components/Caption';
import { Tele } from '../../components/Tele';
import { useDemoLine } from '../useDemoLine';
import '../../components/screens.css';

const NAMES: Record<Emotion, string> = { joy: 'Joy', sadness: 'Sadness', anger: 'Anger', fear: 'Fear', surprise: 'Surprise', disgust: 'Disgust' };

/**
 * Stop 4: the tutor. Tele has no mouth, speaks only Spanish (English is a subtitle) and shows feelings in its eye,
 * antennae and the world behind it. The visitor can blend any two feelings or poke it for a line.
 */
export function TutorStop() {
  const { playback, say } = useDemoLine();
  const [showEnglish, toggleEnglish] = useSubtitles();
  const [on, setOn] = useState<Emotion[]>([]);
  const manual = useMemo(() => Object.fromEntries(on.map((e) => [e, 0.9])), [on]);
  const toggle = (e: Emotion) => setOn((cur) => (cur.includes(e) ? cur.filter((x) => x !== e) : [...cur.slice(-1), e]));
  const lines = PLACEHOLDER_LINES.slice(0, 5);

  return (
    <main className="screen" data-testid="tutor-stop">
      <h1>Meet Tele</h1>
      <div className="stack">
        <Tele feelings={playback.playing ? playback.feelings ?? manual : manual} loudness={playback.loudness} speaking={playback.playing} />
        <Caption words={playback.words} activeIndex={playback.activeIndex} english={playback.line?.en ?? ''} showEnglish={showEnglish} onToggleEnglish={toggleEnglish} />
        <p>Tele has one eye and no mouth. It only speaks Spanish; English shows as a subtitle. Pick up to two feelings and watch them blend.</p>
        <div role="group" aria-label="Feelings" className="controls">
          {EMOTIONS.map((e) => (
            <button key={e} type="button" className="btn" aria-pressed={on.includes(e)} onClick={() => toggle(e)} data-testid={`feeling-${e}`}>{NAMES[e]}</button>
          ))}
        </div>
        <div role="group" aria-label="Make Tele speak" className="controls">
          {lines.map((l) => (
            <button key={l.id} type="button" className="btn" onClick={() => void say(l)} disabled={playback.playing} data-testid={`line-${l.id}`}><span lang="es">{l.es}</span></button>
          ))}
        </div>
        <Link className="btn btn-primary" href="/demo/rewards" data-testid="tutor-next">Next stop: rewards</Link>
      </div>
    </main>
  );
}
