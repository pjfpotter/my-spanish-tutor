'use client';

// Design lab for Tele and her caption (tasks 18.2 and 18.3): try every feeling, blends, loudness,
// the question face, and a stub line that walks the caption word by word. Not linked from the
// app. Used by the Playwright tests. The stub clock stands in for the audio clock until 4.5.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Caption, useSubtitles } from '../../components/Caption';
import { Tele } from '../../components/Tele';
import { useLinePlayback } from '../../components/useLinePlayback';
import { clipUrls, loadClip } from '../../../lib/tele/clips';
import { PLACEHOLDER_LINES } from '../../../lib/tele/lines';
import { EMOTIONS, type Emotion, type Feelings } from '../../../lib/tele/feelings';
import { activeWordAt, feelingsAt, type ClipTimeline } from '../../../lib/tele/timeline';

const NAMES: Record<Emotion, string> = {
  joy: 'Joy (alegría)', sadness: 'Sadness (tristeza)', anger: 'Anger (ira)',
  fear: 'Fear (miedo)', surprise: 'Surprise (sorpresa)', disgust: 'Disgust (asco)',
};

const STUB_ES = ['Me', 'llamo', 'Tele', 'y', 'vivo', 'en', 'la', 'tele'];
const STUB: ClipTimeline = {
  words: STUB_ES.map((text, i) => ({ text, t0: 0.2 + i * 0.45 })),
  end: 0.2 + STUB_ES.length * 0.45 + 0.3,
  feelings: [
    { t0: 0, feelings: { joy: 0.6 } },
    { t0: 1.6, feelings: { surprise: 0.7 } },
  ],
};
const STUB_EN = 'My name is Tele and I live in the TV.';

export default function TeleLab() {
  const [on, setOn] = useState<Emotion[]>([]);
  const [speaking, setSpeaking] = useState(false);
  const [question, setQuestion] = useState(false);
  const [loudness, setLoudness] = useState(0.6);
  const [showEnglish, toggleEnglish] = useSubtitles();

  const [playing, setPlaying] = useState(false);
  const [active, setActive] = useState<number | null>(null);
  const [stubFeelings, setStubFeelings] = useState<Feelings | null>(null);
  const raf = useRef(0);
  const clipPlay = useLinePlayback();
  const [clipError, setClipError] = useState<string | null>(null);

  const manual = useMemo(() => Object.fromEntries(on.map((e) => [e, 0.9])), [on]);
  const toggle = (e: Emotion) => setOn((cur) => (cur.includes(e) ? cur.filter((x) => x !== e) : [...cur, e]));

  function playStub() {
    if (playing) return;
    const start = performance.now();
    setPlaying(true);
    const tick = (now: number) => {
      const t = (now - start) / 1000;
      if (t >= STUB.end) {
        setPlaying(false);
        setActive(null);
        setStubFeelings(null);
        return;
      }
      setActive(activeWordAt(STUB, t));
      setStubFeelings(feelingsAt(STUB, t));
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  }
  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  async function playClip(id: string) {
    setClipError(null);
    const line = PLACEHOLDER_LINES.find((l) => l.id === id)!;
    try {
      const clip = await loadClip(id);
      clipPlay.play(line, { clip, audioUrl: clipUrls(id).audio });
    } catch (e) {
      setClipError((e as Error).message);
      clipPlay.play(line); // the line still shows, silently
    }
  }

  const fromClip = clipPlay.playing ? clipPlay.feelings : null;
  const fromStub = playing ? stubFeelings : null;
  const feelings = fromClip ?? fromStub ?? manual;
  const named = (fromClip ?? fromStub ? Object.keys((fromClip ?? fromStub)!) : on) as Emotion[];

  return (
    <main style={{ maxWidth: '28rem', margin: '0 auto', padding: '3.5rem 1rem 2rem' }}>
      <h1>Tele</h1>
      <Tele feelings={feelings} loudness={clipPlay.playing ? clipPlay.loudness : loudness} speaking={speaking || playing || clipPlay.playing} question={question} />
      <div style={{ marginTop: '0.75rem' }}>
        <Caption
          words={clipPlay.playing ? clipPlay.words : playing || active !== null ? STUB_ES : []}
          activeIndex={clipPlay.playing ? clipPlay.activeIndex : active}
          english={clipPlay.playing ? clipPlay.line?.en ?? '' : STUB_EN}
          showEnglish={showEnglish}
          onToggleEnglish={toggleEnglish}
        />
      </div>
      <p data-testid="clip-source">
        Source: {clipPlay.playing ? (clipPlay.source === 'audio' ? 'audio' : 'timer (no audio)') : 'idle'}
        {clipError ? ` (${clipError})` : ''}
      </p>
      <p data-testid="feeling-readout">
        Feeling: {named.length ? named.map((e) => NAMES[e]).join(' and ') : 'calm'}
      </p>
      <div role="group" aria-label="Feelings" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
        {EMOTIONS.map((e) => (
          <button key={e} type="button" aria-pressed={on.includes(e)} onClick={() => toggle(e)}>
            {NAMES[e]}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '1rem', alignItems: 'center' }}>
        <button type="button" onClick={playStub} disabled={playing}>
          Play stub line
        </button>
        <button type="button" onClick={() => playClip('hola')} disabled={clipPlay.playing}>
          Play ElevenLabs line
        </button>
        <button type="button" aria-pressed={speaking} onClick={() => setSpeaking((s) => !s)}>
          {speaking ? 'Speaking' : 'Quiet'}
        </button>
        <button type="button" aria-pressed={question} onClick={() => setQuestion((q) => !q)}>
          Question face
        </button>
        <label>
          Loudness{' '}
          <input type="range" min={0} max={1} step={0.05} value={loudness} onChange={(e) => setLoudness(Number(e.target.value))} />
        </label>
      </div>
    </main>
  );
}
