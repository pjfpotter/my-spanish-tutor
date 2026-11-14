'use client';

// Design lab for the writing screen (task 5.1). Not linked from the app; the Playwright tests drive it.
// It runs the free-time sentence builder (the project's own content) through the real engine.
// ?pickup=1 shows the pick-up view.
import { useEffect, useMemo, useState } from 'react';
import { WriteSheet } from '../../components/sheets/WriteSheet';
import { buildBuilder } from '../../../lib/sheets/builder';
import { prepare } from '../../../lib/sheets/engine';
import { FREE_TIME, FREE_TIME_SHEET } from '../../../lib/sheets/samples/free-time';

export default function WriteSheetLab() {
  const B = useMemo(() => prepare(buildBuilder('free', FREE_TIME_SHEET, FREE_TIME)), []);
  const [signed, setSigned] = useState<string | null>(null);
  const [pickup, setPickup] = useState(false);
  useEffect(() => setPickup(new URLSearchParams(window.location.search).get('pickup') === '1'), []);
  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, minHeight: 0 }}>
        <WriteSheet builder={B} sheet={FREE_TIME_SHEET} question={B.questions[0]} pickup={pickup} onSignedOff={(t) => setSigned(t)} />
      </div>
      {signed && <p data-testid="signed" style={{ position: 'absolute', top: 0, left: 0, margin: 0, padding: 4, background: '#fff', fontSize: 10 }}>{signed}</p>}
    </div>
  );
}
