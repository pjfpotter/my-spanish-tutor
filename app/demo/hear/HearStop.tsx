'use client';

import Link from 'next/link';
import { useState } from 'react';
import { DEMO_ANSWERS } from '../../../lib/demo/content';
import { feedbackFor } from '../../../lib/memorise/feedback';
import { DEFAULT_AUTOMATE } from '../../../lib/automate/window';
import { scoreAttempt } from '../../../lib/speech/score';
import { Caption, useSubtitles } from '../../components/Caption';
import { Tele } from '../../components/Tele';
import { PracticeShell } from '../../components/practice/PracticeShell';
import { Status } from '../../../lib/ui/Status';
import { useDemoLine } from '../useDemoLine';
import '../../components/screens.css';

/**
 * Stop 1: Tele asks a question in Spanish with no text, English only as a subtitle. The Pretend button plays a scripted
 * answer through the same rules-based scorer the practice screens use, so it works with no microphone.
 */
export function HearStop() {
  const a = DEMO_ANSWERS[1];
  const { playback, say } = useDemoLine();
  const [showEnglish, toggleEnglish] = useSubtitles();
  const [asked, setAsked] = useState(false);
  const [words, setWords] = useState(false);
  const [pretended, setPretended] = useState<string | null>(null);
  const question = { id: 'demo-q', es: a.q, en: a.qen, feelings: {} };
  const script = a.chunks.map((c) => c.t).join(' ');
  // A scripted answer that misses one word, so the one-thing-to-fix feedback is on show.
  const spoken = script.replace('tengo que', 'tengo');
  const score = pretended ? scoreAttempt(script, pretended) : null;
  const fb = score ? feedbackFor(score, DEFAULT_AUTOMATE.threshold) : null;

  return (
    <PracticeShell
      exitHref="/demo"
      tele={<Tele feelings={playback.feelings ?? undefined} loudness={playback.loudness} speaking={playback.playing} question={asked && !pretended} />}
      caption={<Caption compact words={words || pretended ? playback.words : []} activeIndex={playback.activeIndex} english={playback.line?.en ?? ''} showEnglish={showEnglish} onToggleEnglish={toggleEnglish} />}
      meta={<span>Hear a question</span>}
    >
      <h1 className="sr-only">Hear a question</h1>
      <div className="stack" data-testid="hear-stop">
        <p>Tele asks in Spanish. The words stay hidden so you listen first.</p>
        <div className="controls">
          <button type="button" className="btn btn-primary" onClick={() => { setAsked(true); void say(question); }} data-testid="hear-play">{asked ? 'Hear it again' : 'Hear the question'}</button>
          {asked && <button type="button" className="btn" onClick={() => void say(question, 0.7)} data-testid="hear-slow">Hear it slowly</button>}
          {asked && !words && <button type="button" className="btn" onClick={() => setWords(true)} data-testid="hear-words">Show the words</button>}
        </div>
        {words && <p className="heard-text" lang="es" data-testid="hear-text">{a.q}</p>}
        {asked && !pretended && (
          <div className="controls">
            <button type="button" className="btn" onClick={() => setPretended(spoken)} data-testid="pretend">Pretend I answered</button>
          </div>
        )}
        {score && fb && (
          <div className="stack" data-testid="hear-result">
            <div className="result-head">
              <p className="accuracy" data-testid="accuracy" aria-label={`${score.accuracy} percent`}>{score.accuracy}%</p>
              <p><strong>{fb.headline}</strong></p>
            </div>
            <p className="muted">Scripted answer: <span lang="es">{pretended}</span></p>
            {fb.fix && <p data-testid="fix"><strong>One thing to fix:</strong> {fb.fix.text}</p>}
            <p><Status kind="done" label="Rules, not a model" /> The score comes from matching words. A word the recogniser missed is never held against the student.</p>
            <Link className="btn btn-primary" href="/demo/memorise" data-testid="hear-next">Next stop: memorise an answer</Link>
          </div>
        )}
      </div>
    </PracticeShell>
  );
}
