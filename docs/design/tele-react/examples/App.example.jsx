import { useRef, useState } from 'react';
import { Tele } from '../src';
import clip from './example-clip.json';

export default function Lesson() {
  const tele = useRef(null);
  const [mood, setMood] = useState({ joy: 0.2, sadness: 0.2 });
  const [word, setWord] = useState(null);

  return (
    <div style={{ maxWidth: 420 }}>
      <Tele ref={tele} mood={mood} onWord={(i, w) => setWord(w)} />
      <p>{word?.text ?? '…'}</p>
      <button onClick={() => tele.current.playClip(clip)}>Play line</button>
      <button onClick={() => tele.current.react({ surprise: 1 })}>Surprise!</button>
      <button onClick={() => { setMood({ fear: 0.6 }); tele.current.channelChange(); }}>Scare</button>
    </div>
  );
}
