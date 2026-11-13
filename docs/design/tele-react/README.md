# Tele for React

One-eyed TV tutor, drawn on a canvas. No dependencies beyond React 17+ (JSX runtime). Works in Vite, CRA and Next (client components).

## Install
1. Copy `src/` into your app, for example `src/tele/`.
2. Copy `public/tele/` (12 image files) into your app's `public/` folder, so they are served at `/tele/`.
   Elsewhere? Pass `spriteBase="/your/path/"`.

## Use
```jsx
import { useRef, useState } from 'react';
import { Tele } from './tele';
import clip from './clips/hola.json';

function Lesson() {
  const tele = useRef(null);
  const [word, setWord] = useState(null);
  return (
    <>
      <Tele ref={tele} mood={{ joy: 0.2, sadness: 0.2 }} jacket onWord={(i, w) => setWord(w)} />
      <p>{word?.text}</p>
      <button onClick={() => tele.current.playClip(clip)}>Play</button>
    </>
  );
}
```

### Props
| prop | meaning |
|---|---|
| `mood` | resting feelings, 0 to 1: `joy, sadness, anger, fear, surprise, disgust`. Blends freely. |
| `jacket` | wear the corduroy jacket (default true) |
| `spriteBase` | where the images are served (default `/tele/`) |
| `onWord(index, word)` | called as each word starts; `index` is -1 between words. Use it for captions. |
| `onEnd(completed)` | clip finished (true) or stopped (false) |

### Ref methods
`playClip(clip)` returns a promise (true when finished), `stop()`, `react(mood, seconds)` for a quick reaction to the learner,
`channelChange()` (dial turns, static burst), `look(x, y, seconds)`.

## A scripted clip
```json
{
  "audio": "/clips/hola.mp3",
  "words":     [{ "text": "bonito", "start": 0.35, "end": 0.95, "stress": true }],
  "feelings":  [{ "t": 0.0, "joy": 0.8, "surprise": 0.4 }, { "t": 1.25, "joy": 0.9 }],
  "questions": [{ "start": 2.4, "end": 3.0 }]
}
```
- `words` are in seconds. `stress` bounces the antennae and lifts the brows; `ex` makes it stronger.
- `feelings` are keyframes held until the next one. Tele blends to them smoothly.
- `questions` lift the brows and tilt the head.
- Loudness (the screen, antenna and speaker glow) is measured from the audio itself.
  To skip that, pass `loudness: number[]` (0 to 1, 100 values per second).
- Omit `audio` and give `duration` for a silent clip.
- `offset` (ms) nudges timing if the glow feels early or late.

## Getting word times from ElevenLabs
Use the "with timestamps" endpoint and convert its alignment:
```js
import { wordsFromAlignment } from './tele';
const words = wordsFromAlignment(response.alignment); // [{ text, start, end, stress }]
```
Spanish stress is worked out from written accents and the usual rules; fix any by hand.
Save the resulting clip JSON next to the audio file, so nothing is computed at runtime.

## Notes
- The audio is analysed with Web Audio, so audio from another domain needs CORS headers.
  Browsers also need a tap or click before the first sound plays.
- Honours `prefers-reduced-motion`.
