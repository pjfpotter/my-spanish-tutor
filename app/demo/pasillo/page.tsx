'use client';

import { DreamcoreGame } from '../../components/dreamcore/DreamcoreGame';
import { DEMO_ANSWERS } from '../../../lib/demo/content';

/** Stop 3: El Pasillo on the sample answers. The real game with the real microphone; nothing is recorded or saved. */
export default function DemoPasillo() {
  return <DreamcoreGame answers={DEMO_ANSWERS} source="sample" exit={{ href: '/demo', label: 'Back to the tour' }} />;
}
