'use client';

import { DEMO_CHUNKS, DEMO_ITEMS } from '../../../lib/demo/content';
import { rankFor } from '../../../lib/automate/rank';
import { startWindow } from '../../../lib/automate/window';
import { Automate } from '../../phases/automate/Automate';

/** Stop 3: a timed round on the sample answers. Nothing is saved, the microphone is never opened and Pretend answers. */
export default function DemoRound() {
  return <Automate demo items={DEMO_ITEMS} chunks={DEMO_CHUNKS} initial={{ windowMs: startWindow().windowMs, rank: rankFor([]), history: [], sessionsMet: {}, ready: false }} />;
}
