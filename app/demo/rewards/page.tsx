import type { Metadata } from 'next';
import { RewardsStop } from './RewardsStop';

export const metadata: Metadata = { title: 'Demo: rewards' };

export default function Page() {
  return <RewardsStop />;
}
