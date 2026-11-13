'use client';

import { useCallback } from 'react';
import type { LadderAnswer } from '../../../lib/memorise/ladder';
import type { LadderStart } from '../../../lib/memorise/ladder-store';
import { MemoriseLadder, type SaveBody, type SaveReply } from '../../components/memorise/MemoriseLadder';

/** The memorise phase: the ladder with live listening on the student's own confirmed answers, saved to the server (task 27.4). */
export function MemorisePhase({ answers, start }: { answers: LadderAnswer[]; start: Pick<LadderStart, 'day' | 'euros' | 'states' | 'testDays'> }) {
  const save = useCallback(async (body: SaveBody): Promise<SaveReply | null> => {
    const res = await fetch('/api/memorise', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), keepalive: true });
    return res.ok ? ((await res.json()) as SaveReply) : null;
  }, []);
  return <MemoriseLadder answers={answers} variant="real" start={start} save={save} />;
}
