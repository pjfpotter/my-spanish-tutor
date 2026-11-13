import type { Metadata } from 'next';
import { MemoriseLadder } from '../../components/memorise/MemoriseLadder';
import { LAB_ANSWERS } from './content';

export const metadata: Metadata = { title: 'Memorise lab', robots: { index: false } };

/**
 * Where the memorise ladder with live listening can be tried on a real device. It uses sample answers and keeps
 * progress in the browser only, so it needs no profile and no database. The memorise phase itself is unchanged.
 */
export default function MemoriseLabPage() {
  return <MemoriseLadder answers={LAB_ANSWERS} variant="lab" />;
}
