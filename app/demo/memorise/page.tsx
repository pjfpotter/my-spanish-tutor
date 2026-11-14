'use client';

import { MemoriseLadder } from '../../components/memorise/MemoriseLadder';
import { DEMO_ANSWERS } from '../../../lib/demo/content';

/** Stop 2: the memorise ladder on the sample answers. Progress stays in this browser and is cleared by Reset. */
export default function DemoMemorise() {
  return <MemoriseLadder answers={DEMO_ANSWERS} variant="demo" />;
}
