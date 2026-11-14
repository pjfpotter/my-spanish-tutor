import type { Metadata } from 'next';
import { HearStop } from './HearStop';

export const metadata: Metadata = { title: 'Demo: hear a question' };

export default function Page() {
  return <HearStop />;
}
